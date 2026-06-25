"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { FeedbackResult, SoundLesson } from "@/lib/types";
import {
  canUseApi,
  completePractice,
  findMissedWords,
  findSkippedEndings,
  getStoredPasscode,
  getStoredUserEmail,
  loadProgress,
  noteApiUse,
  saveProgress
} from "@/lib/progress";
import { Recorder } from "@/components/Recorder";
import { TTSButton } from "@/components/TTSButton";

const steps = ["Warm-up", "Sound", "Listen", "Read", "Record", "Feedback"];

export function PracticeCoach({
  lesson,
  mode = "daily"
}: {
  lesson: SoundLesson;
  mode?: "daily" | "lesson" | "reading";
}) {
  const [step, setStep] = useState(0);
  const [selectedText, setSelectedText] = useState(lesson.sentences[0]);
  const [transcription, setTranscription] = useState("");
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [missedWords, setMissedWords] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [baselineReady, setBaselineReady] = useState(false);

  useEffect(() => {
    setBaselineReady(loadProgress().baselineCompleted);
  }, []);

  const allPracticeItems = useMemo(
    () => [
      ...lesson.words.map((text) => ({ label: "Word", text })),
      ...lesson.sentences.map((text) => ({ label: "Sentence", text })),
      { label: "Passage", text: lesson.passage }
    ],
    [lesson]
  );

  if (!baselineReady) {
    return (
      <section className="rounded-md bg-white p-5 shadow-soft">
        <p className="font-bold uppercase tracking-wide text-leaf">Start here</p>
        <h1 className="mt-2 text-3xl font-bold">Complete your baseline first</h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-ink/70">
          KoloSpeak Coach needs your starting assessment before daily lessons so
          progress, weak sounds, and before-after comparison have a real baseline.
        </p>
        <Link
          href="/assessment"
          className="focus-ring mt-5 inline-flex h-12 items-center rounded-md bg-leaf px-5 font-bold text-white"
        >
          Take baseline assessment
        </Link>
      </section>
    );
  }

  async function submitRecording(blob: Blob, durationSeconds: number) {
    if (!canUseApi("transcribe", 30) || !canUseApi("feedback", 30)) {
      setError("Daily feedback limit reached. Practice can continue without submitting.");
      return;
    }

    setBusy(true);
    setError("");
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.set("audio", blob, "recording.webm");
      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "x-clearspeak-passcode": getStoredPasscode(),
          "x-clearspeak-email": getStoredUserEmail()
        },
        body: formData
      });
      if (!transcribeResponse.ok) throw new Error("Transcription failed");
      noteApiUse("transcribe");
      const transcribeData = (await transcribeResponse.json()) as { text: string };
      setTranscription(transcribeData.text);
      const missed = findMissedWords(selectedText, transcribeData.text);

      const feedbackResponse = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-clearspeak-passcode": getStoredPasscode(),
          "x-clearspeak-email": getStoredUserEmail()
        },
        body: JSON.stringify({
          lessonId: lesson.id,
          targetSound: lesson.targetSound,
          expectedText: selectedText,
          transcribedText: transcribeData.text,
          durationSeconds
        })
      });
      if (!feedbackResponse.ok) throw new Error("Feedback failed");
      noteApiUse("feedback");
      const feedbackData = (await feedbackResponse.json()) as FeedbackResult;
      setFeedback(feedbackData);
      setMissedWords(missed);
      const nextProgress = completePractice(
        loadProgress(),
        lesson.id,
        feedbackData,
        missed,
        durationSeconds,
        selectedText
      );
      saveProgress(nextProgress);
      setStep(5);
    } catch {
      setError("We could not check that recording. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((item, index) => (
            <button
              key={item}
              type="button"
              onClick={() => setStep(index)}
              className={`focus-ring h-9 rounded-md px-3 text-sm font-semibold ${
                step === index ? "bg-leaf text-white" : "bg-[#eef5ef] text-ink/70"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-md bg-white p-5 shadow-soft">
        <div className="text-sm font-bold uppercase tracking-wide text-leaf">
          {mode === "daily" ? "Today's practice" : mode === "reading" ? "Reading practice" : "Sound lesson"}
        </div>
        <h1 className="mt-2 text-3xl font-bold text-ink">{lesson.name}</h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-ink/75">{lesson.instruction}</p>
      </section>

      {step === 0 ? (
        <section className="rounded-md bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">Warm-up</h2>
          <p className="mt-2 text-ink/75">
            Take three slow breaths. Read this line once in your normal voice, then once
            a little slower.
          </p>
          <div className="mt-4 rounded-md bg-skysoft/60 p-4 text-xl font-semibold">
            I can speak clearly and still sound like myself.
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="rounded-md bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">Sound of the day</h2>
          <p className="mt-2 text-ink/75">{lesson.instruction}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {lesson.words.map((word) => (
              <div key={word} className="rounded-md border border-black/5 p-4">
                <div className="text-2xl font-bold">{word}</div>
                <div className="mt-3">
                  <TTSButton text={word} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {step === 2 || step === 3 || step === 4 ? (
        <section className="rounded-md bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">
            {step === 2 ? "Listen and repeat" : step === 3 ? "Reading practice" : "Record yourself"}
          </h2>
          <div className="mt-4 grid gap-3">
            {allPracticeItems.map((item) => (
              <button
                key={`${item.label}-${item.text}`}
                type="button"
                onClick={() => setSelectedText(item.text)}
                className={`focus-ring rounded-md border p-4 text-left ${
                  selectedText === item.text
                    ? "border-leaf bg-[#eef5ef]"
                    : "border-black/10 bg-white"
                }`}
              >
                <span className="text-sm font-semibold text-leaf">{item.label}</span>
                <span className="mt-1 block text-lg leading-8">{item.text}</span>
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-md bg-[#f7f4ee] p-4">
            <div className="text-sm font-semibold text-ink/60">Selected text</div>
            <p className="mt-2 text-xl leading-9">{selectedText}</p>
            <div className="mt-4">
              <TTSButton text={selectedText} />
            </div>
          </div>
          {step === 4 ? (
            <div className="mt-5">
              <Recorder onSubmit={submitRecording} />
              {busy ? <p className="mt-3 text-sm text-ink/65">Checking your recording...</p> : null}
              {error ? <p className="mt-3 text-sm text-coral">{error}</p> : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 5 ? (
        <section className="rounded-md bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">Coach feedback</h2>
          {feedback ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-leaf text-2xl font-bold text-white">
                  {feedback.score}
                </div>
                <div>
                  <div className="font-semibold">Session saved</div>
                  <div className="text-sm text-ink/65">Your progress stays on this device.</div>
                </div>
              </div>
              <FeedbackLine title="What improved" text={feedback.whatImproved} />
              <FeedbackLine title="What needs work" text={feedback.needsWork ?? feedback.mainIssue} />
              <FeedbackLine title="Mouth tip" text={feedback.mouthTip} />
              <FeedbackLine title="Try again" text={feedback.tryAgainSentence} />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md bg-[#f7f4ee] p-3">
                  <div className="text-sm font-semibold text-ink/60">Speaking speed</div>
                  <div className="mt-1 text-lg font-bold">
                    {feedback.speakingSpeedWpm ?? 0} WPM
                  </div>
                  <div className="text-sm text-ink/65">
                    {feedback.spokeTooFast ? "Slow down a little" : "Good pace"}
                  </div>
                </div>
                <div className="rounded-md bg-[#f7f4ee] p-3">
                  <div className="text-sm font-semibold text-ink/60">Reading accuracy</div>
                  <div className="mt-1 text-lg font-bold">
                    {feedback.readingAccuracy ?? 0}%
                  </div>
                </div>
                <div className="rounded-md bg-[#f7f4ee] p-3">
                  <div className="text-sm font-semibold text-ink/60">Endings</div>
                  <div className="mt-1 text-lg font-bold">
                    {feedback.finalConsonantIssue ? "Review" : "Clear"}
                  </div>
                </div>
              </div>
              <div>
                <div className="font-semibold">Practice words</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {feedback.practiceWords.map((word) => (
                    <span key={word} className="rounded-md bg-skysoft px-3 py-2 text-sm font-semibold">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
              {missedWords.length ? (
                <div>
                  <div className="font-semibold">Words to review</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {missedWords.map((word) => (
                      <span key={word} className="rounded-md bg-warm/50 px-3 py-2 text-sm font-semibold">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {(feedback.skippedEndings?.length ?? 0) > 0 || findSkippedEndings(selectedText, missedWords).length > 0 ? (
                <div>
                  <div className="font-semibold">Skipped endings to repeat</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(feedback.skippedEndings?.length ? feedback.skippedEndings : findSkippedEndings(selectedText, missedWords)).map((word) => (
                      <span key={word} className="rounded-md bg-warm/50 px-3 py-2 text-sm font-semibold">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="rounded-md bg-[#f7f4ee] p-4">
                <div className="text-sm font-semibold text-ink/60">Transcription</div>
                <p className="mt-2">{transcription}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 text-ink/70">
              <CheckCircle2 className="text-leaf" size={20} />
              Submit a recording to receive feedback.
            </div>
          )}
        </section>
      ) : null}

      <div className="flex justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep(Math.max(0, step - 1))}
          className="focus-ring h-12 rounded-md border border-black/10 bg-white px-5 font-semibold text-ink"
        >
          Back
        </button>
        {step === 5 ? (
          <Link
            href="/progress"
            className="focus-ring inline-flex h-12 items-center rounded-md bg-leaf px-5 font-semibold text-white"
          >
            Done
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setStep(Math.min(5, step + 1))}
            className="focus-ring h-12 rounded-md bg-leaf px-5 font-semibold text-white"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

function FeedbackLine({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <div className="font-semibold">{title}</div>
      <p className="mt-1 leading-7 text-ink/75">{text}</p>
    </div>
  );
}
