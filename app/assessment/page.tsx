"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardCheck, Mic, Square, UserRound } from "lucide-react";
import { baselineAssessment, baselineExpectedText } from "@/data/assessment";
import type { AssessmentReport, ProgressState, SmartStartProfile } from "@/lib/types";
import {
  canUseApi,
  findMissedWords,
  getStoredPasscode,
  getStoredUserEmail,
  loadProgress,
  noteApiUse,
  saveBaselineReport,
  saveProgress,
  saveWordBankLocal
} from "@/lib/progress";
import {
  generateRemoteWordBank,
  saveRemoteProgress,
  updateRemoteCoachPlan
} from "@/lib/remoteProgress";

const steps = ["Profile", "Reading", "Sounds", "Speaking", "Result"];

const defaultProfile: SmartStartProfile = {
  reasonForJoining: "",
  improvementGoal: "",
  difficultSituations: "",
  askedToRepeat: "sometimes",
  mainStruggle: "mixed",
  englishFocus: "professional speech",
  confidenceRating: 3
};

export default function AssessmentPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [profile, setProfile] = useState<SmartStartProfile>(defaultProfile);
  const [activeStep, setActiveStep] = useState(0);
  const [transcription, setTranscription] = useState("");
  const [report, setReport] = useState<AssessmentReport | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [placementMessage, setPlacementMessage] = useState("");
  const [started, setStarted] = useState(false);
  const [micStatus, setMicStatus] = useState<"Tap to start" | "Listening" | "Checking" | "Stopped">("Tap to start");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    const current = loadProgress();
    setProgress(current);
    if (current.smartStartProfile) setProfile(current.smartStartProfile);
  }, []);

  const firstTime = !progress?.baselineCompleted;
  const recommendedLessonHref = useMemo(() => {
    const id = report?.recommendedFirstLessonId || "";
    return id ? `/lessons?lesson=${encodeURIComponent(id)}` : "/practice";
  }, [report]);

  function updateProfile<K extends keyof SmartStartProfile>(key: K, value: SmartStartProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  async function startAssessment() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = MediaRecorder.isTypeSupported("audio/webm")
        ? new MediaRecorder(stream, { mimeType: "audio/webm" })
        : new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setStarted(true);
      setMicStatus("Listening");
      speak("Welcome to Smart Start. I will guide you through a short speaking assessment. Answer naturally in your own voice.");
    } catch {
      setError("Microphone permission is needed to start Smart Start.");
    }
  }

  async function finishAssessment() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setMicStatus("Checking");
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setMicStatus("Stopped");
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    await submitAssessment(blob, durationSeconds);
  }

  async function submitAssessment(blob: Blob, durationSeconds: number) {
    if (!canUseApi("assessment", 5) || !canUseApi("transcribe", 30)) {
      setError("Assessment limit reached for today.");
      return;
    }

    setBusy(true);
    setError("");
    setPlacementMessage("");
    try {
      const expectedText = baselineExpectedText();
      const formData = new FormData();
      formData.set("audio", blob, "smart-start.webm");
      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "x-clearspeak-passcode": getStoredPasscode(),
          "x-clearspeak-email": getStoredUserEmail()
        },
        body: formData
      });
      if (!transcribeResponse.ok) throw new Error("Transcription failed");
      noteApiUse("transcribe", "Smart Start assessment transcription");
      const transcribeData = (await transcribeResponse.json()) as { text: string };
      setTranscription(transcribeData.text);

      const missedWords = findMissedWords(expectedText, transcribeData.text);
      const assessmentResponse = await fetch("/api/assessment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-clearspeak-passcode": getStoredPasscode(),
          "x-clearspeak-email": getStoredUserEmail()
        },
        body: JSON.stringify({
          expectedText,
          transcribedText: transcribeData.text,
          durationSeconds,
          missedWords,
          profile
        })
      });
      if (!assessmentResponse.ok) throw new Error("Assessment failed");
      noteApiUse("assessment", "Smart Start placement");
      const assessmentReport = (await assessmentResponse.json()) as AssessmentReport;
      setReport(assessmentReport);

      const current = loadProgress();
      let next: ProgressState = saveBaselineReport(
        current,
        {
          date: new Date().toISOString().slice(0, 10),
          ...assessmentReport,
          beforeText: transcribeData.text
        },
        profile
      );
      saveProgress(next);
      setProgress(next);

      const planUpdate = await updateRemoteCoachPlan({
        trigger: "assessment-completion",
        progress: next
      });
      if (planUpdate.ok && planUpdate.update) {
        noteApiUse("coach-update-plan", "Smart Start plan update");
        next = {
          ...loadProgress(),
          coachPlanUpdate: planUpdate.update,
          learnerProfile: {
            ...loadProgress().learnerProfile,
            focusArea: planUpdate.update.nextFocusArea,
            recommendedNextLessons: planUpdate.update.recommendedLessons,
            nextLessonReason: planUpdate.update.reason,
            confidenceTip: planUpdate.update.progressSummary
          }
        };
        saveProgress(next);
        setProgress(next);
      }

      const wordBank = await generateRemoteWordBank({
        progress: next,
        focusArea: assessmentReport.wordDrillFocus || assessmentReport.recommendedStartingPoint,
        batchSize: 50
      });
      if (wordBank.ok && wordBank.bank) {
        noteApiUse("word-bank", "Smart Start first word bank");
        saveWordBankLocal(wordBank.bank);
        next = loadProgress();
      }

      setSaveStatus("saving");
      const saved = await saveRemoteProgress(next);
      setSaveStatus(saved.ok ? "saved" : "failed");
      setPlacementMessage(
        saved.ok
          ? "Smart Start saved. Your first lesson path is ready."
          : "Smart Start completed, but remote save failed. Local progress is still saved."
      );
      setActiveStep(4);

      if (firstTime && assessmentReport.recommendedFirstLessonId) {
        window.setTimeout(() => {
          router.push(`/lessons?lesson=${encodeURIComponent(assessmentReport.recommendedFirstLessonId)}`);
        }, 2200);
      }
    } catch {
      setError("We could not complete Smart Start. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-4 py-5">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-md bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-leaf">
            <ClipboardCheck size={24} />
            <p className="font-bold uppercase tracking-wide">Smart Start Assessment</p>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-ink">Find the right starting point</h1>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-ink/70">
            This guided assessment checks goals, reading, pronunciation, grammar,
            confidence, pace, and real speaking needs before choosing your first lesson.
          </p>
          {progress?.baselineCompleted ? (
            <p className="mt-4 rounded-md bg-[#eef5ef] p-3 font-semibold text-leaf">
              Smart Start is complete. Retaking it will refresh your placement.
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!started ? (
              <button
                type="button"
                onClick={startAssessment}
                className="focus-ring inline-flex h-12 items-center gap-2 rounded-md bg-leaf px-5 font-bold text-white"
              >
                <Mic size={18} />
                Start Assessment
              </button>
            ) : (
              <button
                type="button"
                onClick={finishAssessment}
                disabled={busy || micStatus === "Checking"}
                className="focus-ring inline-flex h-12 items-center gap-2 rounded-md bg-coral px-5 font-bold text-white disabled:opacity-60"
              >
                <Square size={18} />
                Finish and analyze
              </button>
            )}
            <span className="rounded-md bg-[#f7f4ee] px-4 py-3 font-semibold text-leaf">
              Mic: {micStatus}
            </span>
          </div>
        </section>

        <div className="mt-5 rounded-md bg-white p-4 shadow-soft">
          <div className="flex flex-wrap gap-2">
            {steps.map((step, index) => (
              <button
                key={step}
                type="button"
                  onClick={() => {
                    setActiveStep(index);
                    if (started) speak(stepPrompt(index));
                  }}
                className={`focus-ring h-9 rounded-md px-3 text-sm font-semibold ${
                  activeStep === index ? "bg-leaf text-white" : "bg-[#eef5ef] text-ink/70"
                }`}
              >
                {index + 1}. {step}
              </button>
            ))}
          </div>
        </div>

        {activeStep === 0 ? (
          <ProfileStep profile={profile} updateProfile={updateProfile} onNext={() => setActiveStep(1)} />
        ) : null}

        {activeStep === 1 ? (
          <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">Reading test</h2>
            <p className="mt-2 text-ink/70">
              Read this aloud during the final recording. The coach checks skipped words,
              speed, fluency, clarity, and comprehension clues.
            </p>
            <p className="mt-4 rounded-md bg-[#f7f4ee] p-4 text-lg leading-9">
              {baselineAssessment.passage}
            </p>
            <StepButtons onBack={() => setActiveStep(0)} onNext={() => {
              setActiveStep(2);
              if (started) speak(stepPrompt(2));
            }} />
          </section>
        ) : null}

        {activeStep === 2 ? (
          <section className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="rounded-md bg-white p-5 shadow-soft">
              <h2 className="text-xl font-bold">Word pronunciation test</h2>
              <p className="mt-2 text-ink/70">
                These words test TH, R/L, V/B, short I/long E, final sounds, and clusters.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {baselineAssessment.words.map((word) => (
                  <span key={word} className="rounded-md bg-skysoft px-3 py-2 font-semibold">
                    {word}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-md bg-white p-5 shadow-soft">
              <h2 className="text-xl font-bold">Sentence rhythm test</h2>
              <ol className="mt-4 list-decimal space-y-2 pl-6 leading-8">
                {baselineAssessment.sentences.map((sentence) => (
                  <li key={sentence}>{sentence}</li>
                ))}
              </ol>
            </div>
            <div className="lg:col-span-2">
              <StepButtons onBack={() => setActiveStep(1)} onNext={() => {
                setActiveStep(3);
                if (started) speak(stepPrompt(3));
              }} />
            </div>
          </section>
        ) : null}

        {activeStep === 3 ? (
          <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">Free speaking and recording</h2>
            <p className="mt-2 text-ink/70">
              Keep speaking while the mic stays open. Read the passage, words, sentences, and then answer the prompt.
            </p>
            <div className="mt-4 rounded-md bg-[#f7f4ee] p-4">
              <div className="font-semibold">Free speaking prompt</div>
              <p className="mt-2 text-lg leading-8">{baselineAssessment.freeSpeakingPrompt}</p>
            </div>
            <button
              type="button"
              onClick={finishAssessment}
              disabled={!started || busy || micStatus === "Checking"}
              className="focus-ring mt-4 inline-flex h-12 items-center gap-2 rounded-md bg-leaf px-5 font-bold text-white disabled:opacity-60"
            >
              <Square size={18} />
              Finish Smart Start
            </button>
            {busy ? <p className="mt-3 text-ink/65">Creating your placement report...</p> : null}
            {saveStatus !== "idle" ? (
              <p className="mt-3 font-semibold text-leaf">
                {saveStatus === "saving" ? "Saving" : saveStatus === "failed" ? "Save failed" : "Saved"}
              </p>
            ) : null}
            {error ? <p className="mt-3 font-semibold text-coral">{error}</p> : null}
            <StepButtons onBack={() => setActiveStep(2)} />
          </section>
        ) : null}

        {activeStep === 4 ? (
          <ResultStep
            report={report}
            transcription={transcription}
            message={placementMessage}
            recommendedLessonHref={recommendedLessonHref}
          />
        ) : null}
      </div>
    </main>
  );
}

function stepPrompt(index: number) {
  return [
    "First, tell me why you are here and what you want to improve.",
    "Now read the passage aloud at a natural pace.",
    "Now read the word list and sentences clearly.",
    "Now tell me about yourself and why you want to improve your speaking.",
    "Your Smart Start result is ready."
  ][index] ?? "Continue the assessment.";
}

function ProfileStep({
  profile,
  updateProfile,
  onNext
}: {
  profile: SmartStartProfile;
  updateProfile: <K extends keyof SmartStartProfile>(key: K, value: SmartStartProfile[K]) => void;
  onNext: () => void;
}) {
  return (
    <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 text-leaf">
        <UserRound size={22} />
        <h2 className="text-xl font-bold text-ink">Basic profile questions</h2>
      </div>
      <div className="mt-4 grid gap-4">
        {baselineAssessment.profileQuestions.map((question) => (
          <label key={question.id}>
            <span className="font-semibold text-ink/75">{question.label}</span>
            <textarea
              value={String(profile[question.id as keyof SmartStartProfile] ?? "")}
              onChange={(event) =>
                updateProfile(question.id as keyof SmartStartProfile, event.target.value as never)
              }
              className="focus-ring mt-2 min-h-20 w-full rounded-md border border-black/10 p-3"
              placeholder={question.placeholder}
            />
          </label>
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label>
          <span className="font-semibold text-ink/75">Do people ask you to repeat yourself?</span>
          <select
            value={profile.askedToRepeat}
            onChange={(event) => updateProfile("askedToRepeat", event.target.value as SmartStartProfile["askedToRepeat"])}
            className="focus-ring mt-2 h-12 w-full rounded-md border border-black/10 px-3"
          >
            {["often", "sometimes", "rarely", "not sure"].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="font-semibold text-ink/75">What do you struggle with most?</span>
          <select
            value={profile.mainStruggle}
            onChange={(event) => updateProfile("mainStruggle", event.target.value as SmartStartProfile["mainStruggle"])}
            className="focus-ring mt-2 h-12 w-full rounded-md border border-black/10 px-3"
          >
            {["reading", "speaking", "pronunciation", "confidence", "grammar", "mixed"].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="font-semibold text-ink/75">English focus</span>
          <select
            value={profile.englishFocus}
            onChange={(event) => updateProfile("englishFocus", event.target.value as SmartStartProfile["englishFocus"])}
            className="focus-ring mt-2 h-12 w-full rounded-md border border-black/10 px-3"
          >
            {["daily conversation", "professional speech", "public speaking", "customer calls", "reading", "academic speech"].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="font-semibold text-ink/75">Confidence level: {profile.confidenceRating}/5</span>
          <input
            type="range"
            min="1"
            max="5"
            value={profile.confidenceRating}
            onChange={(event) => updateProfile("confidenceRating", Number(event.target.value))}
            className="mt-4 w-full"
          />
        </label>
      </div>
      <StepButtons onNext={() => {
        onNext();
      }} />
    </section>
  );
}

function ResultStep({
  report,
  transcription,
  message,
  recommendedLessonHref
}: {
  report: AssessmentReport | null;
  transcription: string;
  message: string;
  recommendedLessonHref: string;
}) {
  if (!report) {
    return (
      <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
        <h2 className="text-xl font-bold">Result</h2>
        <p className="mt-3 text-ink/70">Complete the recording step to create your placement.</p>
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Smart Start result</h2>
          <p className="mt-2 max-w-3xl leading-7 text-ink/70">{report.encouragingSummary}</p>
        </div>
        <Link
          href={recommendedLessonHref}
          className="focus-ring inline-flex h-11 items-center gap-2 rounded-md bg-leaf px-4 font-semibold text-white"
        >
          Start first lesson
          <ArrowRight size={17} />
        </Link>
      </div>
      {message ? <p className="mt-4 rounded-md bg-[#eef5ef] p-3 font-semibold text-leaf">{message}</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Score label="Overall" value={report.overallLevel} />
        <Score label="Speaking" value={report.speakingLevel} />
        <Score label="Pronunciation" value={report.pronunciationLevel} />
        <Score label="Reading" value={report.readingLevel} />
        <Score label="Grammar" value={report.grammarLevel} />
        <Score label="Confidence" value={report.confidenceLevel} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <PillBox title="Main strengths" items={report.mainStrengths} />
        <PillBox title="Main weak areas" items={report.mainWeakAreas} />
        <InfoBox title="Recommended start" text={report.recommendedStartingPoint} />
        <InfoBox title="Why" text={report.reason} />
        <InfoBox title="Reading focus" text={report.readingFocus} />
        <InfoBox title="Conversation focus" text={report.conversationFocus} />
        <InfoBox title="Word drill focus" text={report.wordDrillFocus} />
        <InfoBox title="First lesson" text={`${report.recommendedFirstLessonId}: ${report.recommendedFirstLesson}`} />
      </div>
      <h3 className="mt-5 font-bold">Recommended lesson path</h3>
      <ol className="mt-2 list-decimal space-y-2 pl-6">
        {report.recommendedLessonPath.map((lesson) => (
          <li key={lesson}>{lesson}</li>
        ))}
      </ol>
      <h3 className="mt-5 font-bold">Personalized 14-day plan</h3>
      <ol className="mt-2 list-decimal space-y-2 pl-6">
        {report.fourteenDayPlan.map((day) => (
          <li key={day}>{day}</li>
        ))}
      </ol>
      {transcription ? (
        <>
          <h3 className="mt-5 font-bold">What the app heard</h3>
          <p className="mt-2 rounded-md bg-[#f7f4ee] p-4 text-ink/75">{transcription}</p>
        </>
      ) : null}
    </section>
  );
}

function StepButtons({ onBack, onNext }: { onBack?: () => void; onNext?: () => void }) {
  return (
    <div className="mt-5 flex justify-between gap-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="focus-ring h-11 rounded-md border border-black/10 bg-white px-4 font-semibold"
        >
          Back
        </button>
      ) : <span />}
      {onNext ? (
        <button
          type="button"
          onClick={onNext}
          className="focus-ring h-11 rounded-md bg-leaf px-4 font-semibold text-white"
        >
          Next
        </button>
      ) : null}
    </div>
  );
}

function Score({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f7f4ee] p-3">
      <div className="text-sm font-semibold text-ink/60">{label}</div>
      <div className="mt-1 text-base font-bold capitalize text-leaf">{value}</div>
    </div>
  );
}

function PillBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md bg-[#f7f4ee] p-4">
      <div className="font-semibold">{title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-md bg-white px-3 py-2 text-sm font-semibold">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function InfoBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md bg-[#f7f4ee] p-4">
      <div className="font-semibold">{title}</div>
      <p className="mt-2 leading-7 text-ink/75">{text}</p>
    </div>
  );
}
