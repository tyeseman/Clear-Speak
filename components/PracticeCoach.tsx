"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, Save, Video } from "lucide-react";
import type { CoachCard, FeedbackResult, LessonStep, SoundLesson } from "@/lib/types";
import {
  canUseApi,
  completePractice,
  findMissedWords,
  findSkippedEndings,
  getLessonProgress,
  getStoredPasscode,
  getStoredUserEmail,
  loadProgress,
  noteApiUse,
  resetLessonProgress,
  saveLessonStepProgress,
  saveProgress
} from "@/lib/progress";
import { Recorder } from "@/components/Recorder";
import { TTSButton } from "@/components/TTSButton";
import {
  saveRemoteLessonResult,
  saveRemoteProgress,
  saveRemoteSoundScore,
  updateRemoteCoachPlan
} from "@/lib/remoteProgress";

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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  useEffect(() => {
    const progress = loadProgress();
    setBaselineReady(progress.baselineCompleted);
    setStep(Math.min(getLessonProgress(progress, lesson.id).currentStep, lesson.steps.length - 1));
    setSelectedText(lesson.sentences[0]);
    setFeedback(null);
    setTranscription("");
    setMissedWords([]);
    setSaveStatus("idle");
  }, [lesson]);

  const currentStep = lesson.steps[step] ?? lesson.steps[0];
  const allPracticeItems = useMemo(
    () => [
      ...lesson.words.map((text) => ({ label: "Word", text })),
      ...lesson.sentences.map((text) => ({ label: "Sentence", text })),
      { label: "Passage", text: lesson.passage },
      { label: "Conversation", text: lesson.conversationPrompt }
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

  function goToStep(nextStep: number) {
    const bounded = Math.max(0, Math.min(lesson.steps.length - 1, nextStep));
    const nextProgress = saveLessonStepProgress(loadProgress(), lesson.id, bounded, currentStep?.id);
    saveProgress(nextProgress);
    saveRemoteProgress(nextProgress).catch(() => undefined);
    setStep(bounded);
  }

  function retryLesson() {
    const next = resetLessonProgress(loadProgress(), lesson.id);
    saveProgress(next);
    saveRemoteProgress(next).catch(() => undefined);
    setFeedback(null);
    setTranscription("");
    setMissedWords([]);
    setSaveStatus("idle");
    setStep(0);
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
        saveLessonStepProgress(loadProgress(), lesson.id, step + 1, currentStep.id),
        lesson.id,
        feedbackData,
        missed,
        durationSeconds,
        selectedText
      );
      saveProgress(nextProgress);
      setSaveStatus("saving");
      const [progressSave, lessonSave, soundSave] = await Promise.all([
        saveRemoteProgress(nextProgress),
        saveRemoteLessonResult({
          lessonId: lesson.id,
          lessonTitle: lesson.name,
          score: feedbackData.score,
          feedback: feedbackData
        }),
        saveRemoteSoundScore({
          soundKey: lesson.targetSound || lesson.id,
          score: feedbackData.score,
          attempts: 1
        })
      ]);
      const saved = progressSave.ok && lessonSave.ok && soundSave.ok;
      if (shouldUpdatePlan(nextProgress)) {
        updateRemoteCoachPlan({ trigger: "lesson-completion", progress: nextProgress })
          .then((response) => {
            if (!response.ok || !response.update) return;
            const current = loadProgress();
            const updated = {
              ...current,
              coachPlanUpdate: response.update,
              learnerProfile: {
                ...current.learnerProfile,
                focusArea: response.update.nextFocusArea,
                recommendedNextLessons: response.update.recommendedLessons,
                nextLessonReason: response.update.reason,
                confidenceTip: response.update.progressSummary
              }
            };
            saveProgress(updated);
            saveRemoteProgress(updated).catch(() => undefined);
          })
          .catch(() => undefined);
      }
      setSaveStatus(saved ? "saved" : "failed");
      if (!saved) {
        setError("Practice completed, but progress was not saved. Please try again.");
      }
      setStep(Math.min(lesson.steps.length - 1, step + 1));
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
          {lesson.steps.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goToStep(index)}
              className={`focus-ring min-h-9 rounded-md px-3 py-2 text-sm font-semibold ${
                step === index ? "bg-leaf text-white" : "bg-[#eef5ef] text-ink/70"
              }`}
            >
              {index + 1}. {item.title}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-md bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold uppercase tracking-wide text-leaf">
              {mode === "daily" ? "Daily lesson" : mode === "reading" ? "Reading practice" : "Sound lesson"} - Level {currentStep.level}
            </div>
            <h1 className="mt-2 text-3xl font-bold text-ink">{lesson.name}</h1>
            <p className="mt-3 max-w-2xl text-lg font-semibold leading-8 text-ink/75">
              Listen, speak, correct, repeat.
            </p>
          </div>
          <button
            type="button"
            onClick={retryLesson}
            className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-black/10 px-3 font-semibold"
          >
            <RotateCcw size={16} />
            Retry
          </button>
        </div>
      </section>

      <StepPanel
        step={currentStep}
        lesson={lesson}
        selectedText={selectedText}
        setSelectedText={setSelectedText}
        allPracticeItems={allPracticeItems}
        submitRecording={submitRecording}
        busy={busy}
        error={error}
        feedback={feedback}
        transcription={transcription}
        missedWords={missedWords}
        saveStatus={saveStatus}
      />

      <div className="flex justify-between gap-3">
        <button
          type="button"
          onClick={() => goToStep(step - 1)}
          className="focus-ring h-12 rounded-md border border-black/10 bg-white px-5 font-semibold text-ink"
        >
          Back
        </button>
        {currentStep.kind === "complete" ? (
          <Link
            href="/progress"
            className="focus-ring inline-flex h-12 items-center gap-2 rounded-md bg-leaf px-5 font-semibold text-white"
          >
            <Save size={18} />
            Done
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => goToStep(step + 1)}
            className="focus-ring h-12 rounded-md bg-leaf px-5 font-semibold text-white"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

function shouldUpdatePlan(progress: { completedSessions: number }) {
  return progress.completedSessions === 1 || progress.completedSessions % 3 === 0;
}

function toEmbedUrl(url: string) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }
    return url;
  } catch {
    return "";
  }
}

function StepPanel({
  step,
  lesson,
  selectedText,
  setSelectedText,
  allPracticeItems,
  submitRecording,
  busy,
  error,
  feedback,
  transcription,
  missedWords,
  saveStatus
}: {
  step: LessonStep;
  lesson: SoundLesson;
  selectedText: string;
  setSelectedText: (text: string) => void;
  allPracticeItems: Array<{ label: string; text: string }>;
  submitRecording: (blob: Blob, durationSeconds: number) => Promise<void>;
  busy: boolean;
  error: string;
  feedback: FeedbackResult | null;
  transcription: string;
  missedWords: string[];
  saveStatus: "idle" | "saving" | "saved" | "failed";
}) {
  if (step.kind === "explain") {
    return (
      <section className="rounded-md bg-white p-5 shadow-soft">
        <h2 className="text-xl font-bold">{step.title}</h2>
        <p className="mt-3 text-lg font-semibold text-ink/75">Watch the mouth. Hear the sound. Then say it.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <InfoBox label="Target" value={lesson.targetSound} />
          <InfoBox label="Common mistake" value={lesson.commonMistake} />
          <InfoBox label="Correct example" value={lesson.correctSoundExample} />
        </div>
      </section>
    );
  }

  if (step.kind === "video") {
    return (
      <section className="rounded-md bg-white p-5 shadow-soft">
        <div className="flex items-center gap-2 text-leaf">
          <Video size={22} />
          <h2 className="text-xl font-bold">{lesson.video.title}</h2>
        </div>
        <CoachMedia lesson={lesson} />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {lesson.video.keyPoints.map((point) => (
            <div key={point} className="rounded-md bg-skysoft/60 p-4 font-semibold">
              {point}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (step.kind === "mouth") {
    return <CoachCardPanel card={lesson.coachCard} />;
  }

  if (["listen", "word-drill", "sentence-drill", "reading-drill", "record"].includes(step.kind)) {
    const items = step.kind === "word-drill"
      ? lesson.words.map((text) => ({ label: "Word", text }))
      : step.kind === "sentence-drill"
        ? lesson.sentences.map((text) => ({ label: "Sentence", text }))
        : step.kind === "reading-drill"
          ? [{ label: "Passage", text: lesson.passage }]
          : allPracticeItems;

    return (
      <section className="rounded-md bg-white p-5 shadow-soft">
        <h2 className="text-xl font-bold">{step.title}</h2>
        <p className="mt-2 font-semibold text-ink/70">{step.instruction}</p>
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
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
        {step.kind === "record" ? (
          <div className="mt-5">
            <Recorder onSubmit={submitRecording} />
            {busy ? <p className="mt-3 text-sm text-ink/65">Checking your recording...</p> : null}
            {error ? <p className="mt-3 text-sm text-coral">{error}</p> : null}
          </div>
        ) : null}
      </section>
    );
  }

  if (step.kind === "feedback") {
    return (
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
                <div className="text-sm text-ink/65">
                  {saveStatus === "saving" ? "Saving" : saveStatus === "failed" ? "Save failed" : "Saved"}
                </div>
              </div>
            </div>
            <FeedbackLine title="Fix this" text={feedback.mainCorrection ?? feedback.mainIssue} />
            <FeedbackLine title="Mouth tip" text={feedback.mouthTip} />
            <FeedbackLine title="Try again" text={feedback.retryText ?? feedback.tryAgainSentence} />
            <PillGroup title="Practice words" items={feedback.practiceWords.slice(0, 5)} />
            <details className="rounded-md bg-[#f7f4ee] p-4">
              <summary className="cursor-pointer font-bold text-ink">View details</summary>
              <div className="mt-4 space-y-4">
            <FeedbackLine title="Tongue tip" text={feedback.tongueTip ?? "Keep the target position steady."} />
            <FeedbackLine title="Speed tip" text={feedback.speedTip ?? "Use a small pause before important words."} />
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label="Speed" value={`${feedback.speakingSpeedWpm ?? 0} WPM`} />
              <MiniStat label="Accuracy" value={`${feedback.readingAccuracy ?? 0}%`} />
              <MiniStat label="Endings" value={feedback.finalConsonantIssue ? "Review" : "Clear"} />
            </div>
            <PillGroup title="Detected issues" items={feedback.detectedIssues ?? [feedback.mainIssue]} />
            <PillGroup title="Strong points" items={feedback.strongPoints ?? [feedback.whatImproved]} />
            {feedback.soundFeedback?.length ? (
              <div>
                <div className="font-semibold">Sound-by-sound feedback</div>
                <div className="mt-2 space-y-2">
                  {feedback.soundFeedback.map((item) => (
                    <div key={`${item.expectedWord}-${item.issueDetected}`} className="rounded-md border border-black/10 p-3">
                      <div className="font-semibold">{item.targetSound}: {item.expectedWord}</div>
                      <p className="mt-1 text-sm text-ink/70">
                            Heard: {item.transcriptResult || "not clear"} - {item.issueDetected} - {item.correction}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <PillGroup title="Words to review" items={missedWords} />
            <PillGroup
              title="Skipped endings"
              items={feedback.skippedEndings?.length ? feedback.skippedEndings : findSkippedEndings(selectedText, missedWords)}
            />
            <div className="rounded-md bg-[#f7f4ee] p-4">
              <div className="text-sm font-semibold text-ink/60">Transcription</div>
              <p className="mt-2">{transcription}</p>
            </div>
              </div>
            </details>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 text-ink/70">
            <CheckCircle2 className="text-leaf" size={20} />
            Submit a recording to receive feedback.
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-md bg-white p-5 shadow-soft">
      <h2 className="text-xl font-bold">Lesson complete</h2>
      <p className="mt-3 leading-8 text-ink/75">
        This lesson is saved. Use Progress to review scores, or continue with the next recommended lesson.
      </p>
      {feedback?.nextRecommendedLesson ? (
        <p className="mt-3 rounded-md bg-[#eef5ef] p-4 font-semibold text-leaf">
          Next recommendation: {feedback.nextRecommendedLesson}
        </p>
      ) : null}
    </section>
  );
}

function CoachCardPanel({ card }: { card: CoachCard }) {
  return (
    <section className="rounded-md bg-white p-5 shadow-soft">
      <h2 className="text-xl font-bold">Mouth guide</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
        <MouthDiagram kind={card.diagram} />
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoBox label="Tongue" value={card.tongue} />
          <InfoBox label="Lips" value={card.lips} />
          <InfoBox label="Airflow" value={card.airflow} />
          <InfoBox label="Voice vibration" value={card.voice} />
          <InfoBox label="Mistake to avoid" value={card.mistakeToAvoid} />
          <InfoBox label="Practice example" value={card.practiceExample} />
        </div>
      </div>
    </section>
  );
}

function CoachMedia({ lesson }: { lesson: SoundLesson }) {
  const embedUrl = toEmbedUrl(lesson.video.videoUrl);

  if (embedUrl) {
    return (
      <div className="mt-4 overflow-hidden rounded-md bg-ink shadow-soft">
        <iframe
          title={lesson.video.title}
          src={embedUrl}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        <div className="bg-white p-3 text-sm font-semibold text-ink/70">
          {lesson.video.license && lesson.video.license !== "unknown"
            ? `Source: ${lesson.video.source || "permitted media"}`
            : "Use only owned, Creative Commons, public-domain, or permitted embed media."}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-md border border-dashed border-black/20 bg-[#f7f4ee] p-5">
      <p className="font-bold">Coach visual fallback</p>
      <p className="mt-2 font-semibold text-ink/70">{lesson.video.transcript}</p>
      <p className="mt-2 text-sm font-semibold text-coral">
        Add media only when the source and license are safe.
      </p>
    </div>
  );
}

function MouthDiagram({ kind }: { kind: CoachCard["diagram"] }) {
  const label = kind.replace(/-/g, " ");
  return (
    <div className="grid min-h-56 place-items-center rounded-md bg-[#f7f4ee] p-5">
      <div className="relative h-40 w-40 rounded-full border-4 border-ink/20 bg-white">
        <div className="absolute left-9 top-6 h-10 w-24 rounded-t-full border-4 border-ink/20 border-b-0" />
        <div className="absolute bottom-8 left-10 h-8 w-20 rounded-full bg-coral/40" />
        <div className="absolute bottom-14 left-14 h-10 w-16 rounded-full bg-leaf/60" />
        {kind === "teeth-touch-lip" ? <div className="absolute left-12 top-16 h-3 w-16 bg-white shadow" /> : null}
        {kind === "airflow-between-teeth" ? <div className="absolute left-16 top-16 h-12 w-8 rounded-full border-2 border-dashed border-leaf" /> : null}
        {kind === "final-release" ? <div className="absolute right-1 top-16 h-1 w-12 bg-leaf" /> : null}
      </div>
      <div className="mt-3 text-center text-sm font-semibold capitalize text-ink/70">{label}</div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f7f4ee] p-4">
      <div className="text-sm font-semibold text-ink/60">{label}</div>
      <p className="mt-1 leading-7">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f7f4ee] p-3">
      <div className="text-sm font-semibold text-ink/60">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function PillGroup({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="font-semibold">{title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-md bg-warm/50 px-3 py-2 text-sm font-semibold">
            {item}
          </span>
        ))}
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
