"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Heart, Save } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Recorder } from "@/components/Recorder";
import { TTSButton } from "@/components/TTSButton";
import {
  passageForTopic,
  readingLengths,
  readingLevels,
  readingTopicsList
} from "@/data/reading";
import {
  canUseApi,
  estimateReadingAccuracy,
  findMissedWords,
  findSkippedEndings,
  getStoredPasscode,
  getStoredUserEmail,
  loadProgress,
  noteApiUse,
  saveReadingPreferences,
  saveReadingSession
} from "@/lib/progress";
import {
  saveRemoteProgress,
  saveRemoteReadingResult,
  saveRemoteSettings
} from "@/lib/remoteProgress";
import type { FeedbackResult, ProgressState, ReadingPreferences } from "@/lib/types";

const steps = ["Choose", "Hear", "Read", "Speak", "Explain", "Save"];

export default function ReadingPage() {
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [preferences, setPreferences] = useState<ReadingPreferences | null>(null);
  const [step, setStep] = useState(0);
  const [selectedTopic, setSelectedTopic] = useState("business");
  const [explanation, setExplanation] = useState("");
  const [transcription, setTranscription] = useState("");
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [missedWords, setMissedWords] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  useEffect(() => {
    const current = loadProgress();
    setProgress(current);
    setPreferences(current.readingPreferences);
    setSelectedTopic(current.readingPreferences.topics[0] ?? "business");
  }, []);

  const passage = useMemo(() => {
    if (!preferences) return "";
    return passageForTopic(selectedTopic, preferences.customTopic);
  }, [preferences, selectedTopic]);

  if (!preferences || !progress) {
    return <AppShell><div className="md:ml-52" /></AppShell>;
  }

  function updatePreferences(next: ReadingPreferences) {
    setPreferences(next);
    saveReadingPreferences(next);
    const updated = loadProgress();
    setProgress(updated);
    saveRemoteSettings(updated).catch(() => undefined);
  }

  function toggleTopic(topic: string) {
    if (!preferences) return;
    const topics = preferences.topics.includes(topic)
      ? preferences.topics.filter((item) => item !== topic)
      : [...preferences.topics, topic];
    const nextTopics = topics.length ? topics : ["practical U.S. life"];
    updatePreferences({ ...preferences, topics: nextTopics });
    setSelectedTopic(nextTopics[0]);
  }

  async function submitReading(blob: Blob, durationSeconds: number) {
    if (!canUseApi("transcribe", 30) || !canUseApi("feedback", 30)) {
      setMessage("Daily feedback limit reached. You can still read and explain.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.set("audio", blob, "reading.webm");
      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "x-clearspeak-passcode": getStoredPasscode(),
          "x-clearspeak-email": getStoredUserEmail()
        },
        body: formData
      });
      if (!transcribeResponse.ok) throw new Error("Transcription failed");
      noteApiUse("transcribe", "Reading aloud transcription");
      const transcribeData = (await transcribeResponse.json()) as { text: string };
      setTranscription(transcribeData.text);
      const missed = findMissedWords(passage, transcribeData.text);
      setMissedWords(missed);

      const feedbackResponse = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-clearspeak-passcode": getStoredPasscode(),
          "x-clearspeak-email": getStoredUserEmail()
        },
        body: JSON.stringify({
          lessonId: `reading-${selectedTopic}`,
          targetSound: "reading clarity",
          expectedText: passage,
          transcribedText: transcribeData.text,
          durationSeconds
        })
      });
      if (!feedbackResponse.ok) throw new Error("Feedback failed");
      noteApiUse("feedback", "Reading clarity feedback");
      setFeedback((await feedbackResponse.json()) as FeedbackResult);
      setStep(4);
    } catch {
      setMessage("We could not check that reading. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSession() {
    if (!preferences) return;
    const comprehensionScore = scoreExplanation(passage, explanation);
    const session = {
      id: `reading-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      topic: selectedTopic,
      level: preferences.level,
      lengthMinutes: preferences.lengthMinutes,
      passage,
      score: feedback?.readingAccuracy ?? estimateReadingAccuracy(passage, missedWords),
      comprehensionScore,
      missedWords,
      skippedWords: feedback?.skippedWords ?? missedWords,
      finalSoundsDropped: feedback?.skippedEndings ?? findSkippedEndings(passage, missedWords),
      explanation
    };
    saveReadingSession(session);
    const nextProgress = loadProgress();
    setProgress(nextProgress);
    setSaveStatus("saving");
    setMessage("Saving");
    const [progressSave, readingSave] = await Promise.all([
      saveRemoteProgress(nextProgress),
      saveRemoteReadingResult(session)
    ]);
    const saved = progressSave.ok && readingSave.ok;
    setSaveStatus(saved ? "saved" : "failed");
    setMessage(saved ? "Reading session saved." : "Practice completed, but progress was not saved. Please try again.");
    setStep(5);
  }

  function saveFavorite() {
    if (!preferences) return;
    const favoritePassages = preferences.favoritePassages.includes(passage)
      ? preferences.favoritePassages
      : [...preferences.favoritePassages, passage].slice(-20);
    updatePreferences({ ...preferences, favoritePassages });
    setMessage("Passage saved as a favorite.");
  }

  return (
    <AppShell>
      <div className="md:ml-52">
        <section className="rounded-md bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-leaf">
            <BookOpen size={24} />
            <p className="font-bold uppercase tracking-wide">Read, Hear, Speak, Explain</p>
          </div>
          <h1 className="mt-2 text-3xl font-bold">Build a reading habit</h1>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-ink/70">
            Start short. Choose something you care about, hear it, read it, speak it,
            and explain the main idea in your own words.
          </p>
        </section>

        <div className="mt-5 rounded-md bg-white p-4 shadow-soft">
          <div className="flex flex-wrap gap-2">
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

        {step === 0 ? (
          <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Reading preferences</h2>
              <button
                type="button"
                onClick={() => {
                  updatePreferences({ ...preferences, lengthMinutes: 1, dailyGoalMinutes: 1 });
                  setStep(1);
                }}
                className="focus-ring h-10 rounded-md bg-leaf px-4 font-semibold text-white"
              >
                Just read for 1 minute
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {readingTopicsList.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  className={`focus-ring rounded-md px-3 py-2 text-sm font-semibold ${
                    preferences.topics.includes(topic) ? "bg-leaf text-white" : "bg-[#f7f4ee] text-ink"
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
            <label className="mt-4 block">
              <span className="font-semibold text-ink/75">Custom topic</span>
              <input
                value={preferences.customTopic}
                onChange={(event) =>
                  updatePreferences({ ...preferences, customTopic: event.target.value })
                }
                className="focus-ring mt-2 h-12 w-full rounded-md border border-black/10 px-3"
                placeholder="Example: real estate, work meetings, health appointments"
              />
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="font-semibold text-ink/75">Level</span>
                <select
                  value={preferences.level}
                  onChange={(event) =>
                    updatePreferences({
                      ...preferences,
                      level: event.target.value as ReadingPreferences["level"]
                    })
                  }
                  className="focus-ring mt-2 h-12 w-full rounded-md border border-black/10 px-3"
                >
                  {readingLevels.map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="font-semibold text-ink/75">Length</span>
                <select
                  value={preferences.lengthMinutes}
                  onChange={(event) =>
                    updatePreferences({
                      ...preferences,
                      lengthMinutes: Number(event.target.value) as ReadingPreferences["lengthMinutes"],
                      dailyGoalMinutes: Number(event.target.value)
                    })
                  }
                  className="focus-ring mt-2 h-12 w-full rounded-md border border-black/10 px-3"
                >
                  {readingLengths.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} minute{minutes > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-5">
              <h3 className="font-semibold">Choose today&apos;s topic</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {preferences.topics.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setSelectedTopic(topic)}
                    className={`focus-ring rounded-md px-3 py-2 text-sm font-semibold ${
                      selectedTopic === topic ? "bg-warm text-ink" : "bg-[#f7f4ee] text-ink"
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {step >= 1 ? (
          <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-leaf">{selectedTopic}</p>
                <h2 className="mt-1 text-xl font-bold">Today&apos;s passage</h2>
              </div>
              <button
                type="button"
                onClick={saveFavorite}
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-black/10 px-3 font-semibold"
              >
                <Heart size={16} />
                Favorite
              </button>
            </div>
            <p className="mt-4 text-xl leading-9">{passage}</p>
            <div className="mt-4">
              <TTSButton text={passage} />
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">Read silently</h2>
            <p className="mt-3 text-ink/70">
              Read once in your mind. Then press Next and read it aloud.
            </p>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">Read aloud and record</h2>
            <p className="mt-2 text-ink/70">
              Keep it short and steady. Submit only when you want feedback.
            </p>
            <div className="mt-4">
              <Recorder onSubmit={submitReading} />
            </div>
            {busy ? <p className="mt-3 text-ink/65">Checking reading clarity...</p> : null}
          </section>
        ) : null}

        {step === 4 ? (
          <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">Explain it in your own words</h2>
            <textarea
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
              className="focus-ring mt-4 min-h-32 w-full rounded-md border border-black/10 p-3"
              placeholder="Write the main idea in your own words."
            />
            {feedback ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniStat label="Reading clarity" value={`${feedback.readingAccuracy ?? 0}%`} />
                <MiniStat label="Speed" value={`${feedback.speakingSpeedWpm ?? 0} WPM`} />
                <MiniStat label="Endings" value={feedback.finalConsonantIssue ? "Review" : "Clear"} />
              </div>
            ) : null}
            {missedWords.length ? (
              <div className="mt-4">
                <div className="font-semibold">Missed or skipped words</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {missedWords.map((word) => (
                    <span key={word} className="rounded-md bg-warm/50 px-3 py-2 text-sm font-semibold">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {step === 5 ? (
          <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">Reading saved</h2>
            <p className="mt-3 text-ink/70">
              Reading streak: {loadProgress().readingStreak} day{loadProgress().readingStreak === 1 ? "" : "s"}.
            </p>
            {transcription ? (
              <div className="mt-4 rounded-md bg-[#f7f4ee] p-4">
                <div className="font-semibold">What the app heard</div>
                <p className="mt-2 text-ink/70">{transcription}</p>
              </div>
            ) : null}
            {saveStatus !== "idle" ? (
              <p className={`mt-4 font-semibold ${saveStatus === "failed" ? "text-coral" : "text-leaf"}`}>
                {saveStatus === "saving" ? "Saving" : saveStatus === "failed" ? "Save failed" : "Saved"}
              </p>
            ) : null}
          </section>
        ) : null}

        {message ? <p className="mt-4 font-semibold text-leaf">{message}</p> : null}

        <div className="mt-5 flex justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep(Math.max(0, step - 1))}
            className="focus-ring h-12 rounded-md border border-black/10 bg-white px-5 font-semibold"
          >
            Back
          </button>
          {step === 4 ? (
            <button
              type="button"
              onClick={saveSession}
              className="focus-ring inline-flex h-12 items-center gap-2 rounded-md bg-leaf px-5 font-semibold text-white"
            >
              <Save size={18} />
              Save progress
            </button>
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
    </AppShell>
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

function scoreExplanation(passage: string, explanation: string) {
  const importantWords = passage
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 5);
  const explanationWords = new Set(
    explanation
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
  );
  const matches = importantWords.filter((word) => explanationWords.has(word)).length;
  const lengthScore = Math.min(40, explanation.trim().split(/\s+/).filter(Boolean).length * 4);
  const keywordScore = importantWords.length
    ? Math.min(60, Math.round((matches / importantWords.length) * 60))
    : 40;
  return Math.min(100, lengthScore + keywordScore);
}
