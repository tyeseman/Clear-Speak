"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, RefreshCw, Settings, Square, Wand2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Recorder } from "@/components/Recorder";
import { fallbackWordBank } from "@/data/liveDrill";
import {
  addLiveMinutes,
  canUseApi,
  getStoredPasscode,
  getStoredUserEmail,
  loadProgress,
  noteApiUse,
  saveProgress,
  saveWordBankLocal,
  saveWordDrillAttemptLocal,
  todayKey
} from "@/lib/progress";
import {
  generateRemoteWordBank,
  loadRemoteWordBank,
  saveRemoteProgress,
  saveRemoteWordDrillAttempt,
  updateRemoteCoachPlan
} from "@/lib/remoteProgress";
import type { FeedbackResult, ProgressState, WordBank, WordBankItem, WordDrillAttempt } from "@/lib/types";

type MicStatus = "Tap to start" | "Listening" | "Checking" | "Try again" | "Good job" | "Paused" | "Stopped";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

export default function LiveDrillPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [bank, setBank] = useState<WordBank | null>(null);
  const [batchSize, setBatchSize] = useState<25 | 50 | 100>(50);
  const [limitMinutes, setLimitMinutes] = useState<5 | 10 | 15>(5);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [successes, setSuccesses] = useState(0);
  const [heardText, setHeardText] = useState("");
  const [message, setMessage] = useState("Generate or load a practice set, then start live drill.");
  const [mouthTip, setMouthTip] = useState("");
  const [micStatus, setMicStatus] = useState<MicStatus>("Tap to start");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [targetSound, setTargetSound] = useState("");
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [coachVoice, setCoachVoice] = useState(true);
  const [highQualityVoice, setHighQualityVoice] = useState(false);
  const [running, setRunning] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const startedAtRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    const current = loadProgress();
    setProgress(current);
    const localBank = current.wordBanks.at(-1);
    if (localBank) setBank(localBank);
  }, []);

  const activeItems = useMemo(() => bank?.items ?? [], [bank]);
  const currentWord = activeItems[currentIndex];
  const liveMinutesToday = progress?.liveMinutesUsed[todayKey()] ?? 0;
  const reviewLater = progress?.reviewLaterWords ?? [];
  const successScore = activeItems.length ? Math.round((successes / activeItems.length) * 100) : 0;

  async function loadOrGenerate(force = false) {
    const current = loadProgress();
    const focusArea =
      current.coachPlanUpdate?.recommendedWordBankFocus ||
      current.baselineReport?.recommendedFirstLesson ||
      targetSound ||
      current.learnerProfile.focusArea ||
      "pronunciation clarity";
    setMessage(force ? "Generating a new practice set..." : "Loading saved practice set...");
    const remote = !force ? await loadRemoteWordBank(focusArea) : { ok: false };
    if (remote.ok && remote.bank) {
      setBank(remote.bank);
      saveWordBankLocal(remote.bank);
      setProgress(loadProgress());
      setMessage("Saved word bank loaded. AI was not called.");
      return;
    }

    if (!canUseApi("word-bank", 8)) {
      const local = fallbackWordBank(focusArea, 25);
      setBank(local);
      saveWordBankLocal(local);
      setProgress(loadProgress());
      setMessage("AI word-bank limit reached. Local starter bank loaded.");
      return;
    }

    const generated = await generateRemoteWordBank({
      progress: current,
      focusArea,
      batchSize,
      force
    });
    if (generated.ok && generated.bank) {
      noteApiUse("word-bank", "Generated batched live drill word bank");
      setBank(generated.bank);
      saveWordBankLocal(generated.bank);
      setProgress(loadProgress());
      setMessage(generated.reused ? "Saved word bank reused." : "New AI word bank generated and saved.");
      return;
    }

    const local = fallbackWordBank(focusArea, 25);
    setBank(local);
    saveWordBankLocal(local);
    setProgress(loadProgress());
    setMessage("Could not generate a word bank. Local starter bank loaded.");
  }

  async function startLiveDrill() {
    if (!currentWord) {
      await loadOrGenerate(false);
      return;
    }
    setMessage("Starting microphone...");
    setFallbackMode(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startedAtRef.current = Date.now();
      setRunning(true);
      setMicStatus("Listening");
      if (coachVoice) playWord(currentWord.word);
      await tryRealtimeConnection(stream);
      startSpeechRecognition();
    } catch {
      setFallbackMode(true);
      setMicStatus("Stopped");
      setMessage("Live listening is unavailable. Use the fallback recorder below.");
    }
  }

  function startSpeechRecognition() {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setFallbackMode(true);
      setMessage("This browser does not support live speech detection. Use fallback record-submit mode.");
      return;
    }

    const recognition = new SpeechRecognitionCtor() as SpeechRecognitionLike;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript = result?.[0]?.transcript ?? "";
      if (transcript) void checkHeardWord(transcript);
    };
    recognition.onerror = () => {
      setFallbackMode(true);
      setMicStatus("Paused");
      setMessage("Live speech detection paused. Fallback recorder is available.");
    };
    recognition.onend = () => {
      if (running) {
        try {
          recognition.start();
        } catch {
          setMicStatus("Paused");
        }
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  async function tryRealtimeConnection(stream: MediaStream) {
    try {
      const sessionResponse = await fetch("/api/realtime/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-clearspeak-passcode": getStoredPasscode(),
          "x-clearspeak-email": getStoredUserEmail()
        },
        body: JSON.stringify({ focusArea: currentWord?.targetSound ?? "pronunciation clarity" })
      });
      if (!sessionResponse.ok) return;
      const data = await sessionResponse.json();
      const clientSecret = data.session?.client_secret?.value;
      if (!clientSecret) return;

      const pc = new RTCPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.createDataChannel("kolo-live-drill");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const model = data.session?.model ?? "gpt-4o-realtime-preview";
      const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp"
        },
        body: offer.sdp ?? ""
      });
      if (!sdpResponse.ok) return;
      await pc.setRemoteDescription({ type: "answer", sdp: await sdpResponse.text() });
      peerRef.current = pc;
    } catch {
      peerRef.current?.close();
      peerRef.current = null;
    }
  }

  async function checkHeardWord(transcript: string) {
    if (!currentWord || micStatus === "Checking") return;
    setMicStatus("Checking");
    const nextAttempt = attemptCount + 1;
    const passed = isWordMatch(currentWord.word, transcript);
    const score = passed ? 100 : scoreSimilarity(currentWord.word, transcript);
    setHeardText(transcript);

    if (passed) {
      setConfetti(true);
      window.setTimeout(() => setConfetti(false), 1200);
      setMessage("Good job.");
      setMicStatus("Good job");
      setSuccesses((value) => value + 1);
      await saveAttempt(currentWord, transcript, nextAttempt, score, true, false, "Good job.");
      if (autoAdvance) moveNext();
      return;
    }

    if (nextAttempt >= maxAttempts) {
      setMessage("Review later.");
      setMouthTip(currentWord.mouthTip);
      await saveAttempt(currentWord, transcript, nextAttempt, score, false, true, currentWord.mouthTip);
      moveNext();
      return;
    }

    setAttemptCount(nextAttempt);
    setMessage("Try again.");
    setMicStatus("Try again");
    setMouthTip(currentWord.mouthTip);
    await saveAttempt(currentWord, transcript, nextAttempt, score, false, false, currentWord.mouthTip);
    if (coachVoice) playWord(currentWord.word);
    setMicStatus("Listening");
  }

  async function saveAttempt(
    item: WordBankItem,
    transcript: string,
    attempts: number,
    bestScore: number,
    passed: boolean,
    reviewLaterFlag: boolean,
    feedback: string
  ) {
    const attempt: WordDrillAttempt = {
      id: `live-${Date.now()}-${item.word}`,
      date: new Date().toISOString(),
      word: item.word,
      targetSound: item.targetSound,
      heardText: transcript,
      attempts,
      bestScore,
      passed,
      reviewLater: reviewLaterFlag,
      feedback
    };
    saveWordDrillAttemptLocal(attempt);
    await saveRemoteWordDrillAttempt({ ...attempt, wordBankItemId: item.id }).catch(() => ({ ok: false }));
    const nextProgress = loadProgress();
    setProgress(nextProgress);
    saveRemoteProgress(nextProgress).catch(() => undefined);
  }

  function moveNext() {
    setAttemptCount(0);
    setMouthTip("");
    setCurrentIndex((index) => {
      const nextIndex = findNextIndex(activeItems, index + 1);
      const nextItem = activeItems[nextIndex];
      if (nextItem && coachVoice) window.setTimeout(() => playWord(nextItem.word), 500);
      return nextIndex;
    });
    setMicStatus("Listening");
    maybeStopByTimer();
    maybeUpdatePlan();
  }

  function maybeStopByTimer() {
    const elapsedMinutes = (Date.now() - startedAtRef.current) / 60000;
    if (elapsedMinutes >= limitMinutes) stopLiveDrill();
  }

  async function maybeUpdatePlan() {
    if (!bank) return;
    const completed = currentIndex + 1;
    if (completed / Math.max(1, bank.items.length) < 0.8) return;
    const current = loadProgress();
    const response = await updateRemoteCoachPlan({
      trigger: "word-bank-mostly-complete",
      progress: current
    });
    if (response.ok && response.update) {
      const next = {
        ...loadProgress(),
        coachPlanUpdate: response.update,
        learnerProfile: {
          ...loadProgress().learnerProfile,
          focusArea: response.update.nextFocusArea,
          recommendedNextLessons: response.update.recommendedLessons,
          nextLessonReason: response.update.reason
        }
      };
      saveProgress(next);
      setProgress(next);
      setMessage(`You mastered most of this word bank. ${response.update.reason}`);
    }
  }

  function stopLiveDrill() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRunning(false);
    setMicStatus("Stopped");
    if (startedAtRef.current) {
      addLiveMinutes((Date.now() - startedAtRef.current) / 60000);
      setProgress(loadProgress());
    }
  }

  async function fallbackSubmit(blob: Blob, durationSeconds: number) {
    if (!currentWord) return;
    const formData = new FormData();
    formData.set("audio", blob, "live-drill-fallback.webm");
    const response = await fetch("/api/transcribe", {
      method: "POST",
      headers: {
        "x-clearspeak-passcode": getStoredPasscode(),
        "x-clearspeak-email": getStoredUserEmail()
      },
      body: formData
    });
    if (!response.ok) return;
    noteApiUse("transcribe", "Live drill fallback transcription");
    const data = (await response.json()) as { text: string };
    await checkHeardWord(data.text);
  }

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-4 py-4">
      {confetti ? <Confetti /> : null}
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl flex-col">
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0 rounded-md bg-white px-4 py-3 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-wide text-leaf">Coach recommendation</p>
            <p className="mt-1 truncate font-semibold text-ink">{message}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen((value) => !value)}
              className="focus-ring grid h-11 w-11 place-items-center rounded-full bg-white text-ink shadow-soft"
              aria-label="Live drill settings"
            >
              <Settings size={20} />
            </button>
            <button
              type="button"
              onClick={() => {
                stopLiveDrill();
                router.push("/");
              }}
              className="focus-ring grid h-11 w-11 place-items-center rounded-full bg-white text-ink shadow-soft"
              aria-label="Exit live drill"
            >
              <X size={22} />
            </button>
          </div>
        </header>

        {settingsOpen ? (
          <section className="mt-4 rounded-md bg-white p-4 shadow-soft">
            <div className="grid gap-4 md:grid-cols-4">
              <Select label="Words" value={batchSize} onChange={(value) => setBatchSize(Number(value) as 25 | 50 | 100)} options={["25", "50", "100"]} />
              <Select label="Time" value={limitMinutes} onChange={(value) => setLimitMinutes(Number(value) as 5 | 10 | 15)} options={["5", "10", "15"]} />
              <Select label="Difficulty" value={difficulty} onChange={(value) => setDifficulty(value as "easy" | "medium" | "hard")} options={["easy", "medium", "hard"]} />
              <label>
                <span className="text-sm font-semibold text-ink/70">Target sound</span>
                <input
                  value={targetSound}
                  onChange={(event) => setTargetSound(event.target.value)}
                  placeholder="final consonants, TH, rhythm"
                  className="focus-ring mt-2 h-11 w-full rounded-md border border-black/10 px-3"
                />
              </label>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <Toggle label="Auto-advance" checked={autoAdvance} onChange={setAutoAdvance} />
              <Toggle label="Coach voice" checked={coachVoice} onChange={setCoachVoice} />
              <Toggle label="High-quality voice" checked={highQualityVoice} onChange={setHighQualityVoice} />
              <label>
                <span className="text-sm font-semibold text-ink/70">Attempts before review</span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={maxAttempts}
                  onChange={(event) => setMaxAttempts(Number(event.target.value))}
                  className="focus-ring mt-2 h-11 w-full rounded-md border border-black/10 px-3"
                />
              </label>
            </div>
          </section>
        ) : null}

        <section className="grid flex-1 place-items-center py-6">
          <div className="w-full max-w-2xl text-center">
            <div className="mx-auto grid h-44 w-44 place-items-center rounded-full border-[14px] border-leaf/25 bg-white shadow-soft">
              <div>
                <div className="text-sm font-bold text-ink/50">Score</div>
                <div className="text-5xl font-bold text-leaf">{successScore}%</div>
              </div>
            </div>
            <p className="mt-6 font-bold uppercase tracking-wide text-leaf">
              {currentWord?.targetSound ?? (targetSound || "Load a practice set")}
            </p>
            <h1 className="mt-2 text-6xl font-bold text-ink">{currentWord?.word ?? "Ready"}</h1>
            <p className="mt-3 text-lg font-semibold text-ink/65">
              {currentWord?.mouthTip ?? "Start once. The mic stays open during the drill."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => currentWord && playWord(currentWord.word)}
                disabled={!currentWord}
                className="focus-ring h-12 rounded-md bg-white px-4 font-semibold text-ink shadow-soft disabled:opacity-50"
              >
                Coach audio
              </button>
              <button
                type="button"
                className="h-12 rounded-md bg-white px-4 font-semibold text-ink/45 shadow-soft"
                disabled
              >
                User playback
              </button>
            </div>

            {heardText && micStatus !== "Listening" ? (
              <p className="mt-4 rounded-md bg-white p-3 text-sm font-semibold text-ink/70 shadow-soft">
                Heard: {heardText}
              </p>
            ) : null}

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => loadOrGenerate(false)}
                className="focus-ring inline-flex h-11 items-center gap-2 rounded-md bg-white px-4 font-semibold text-ink shadow-soft"
              >
                <RefreshCw size={17} />
                Load set
              </button>
              <button
                type="button"
                onClick={() => loadOrGenerate(true)}
                className="focus-ring inline-flex h-11 items-center gap-2 rounded-md bg-white px-4 font-semibold text-ink shadow-soft"
              >
                <Wand2 size={17} />
                New set
              </button>
            </div>
          </div>
        </section>

        <footer className="pb-3 text-center">
          {!running ? (
            <button
              type="button"
              onClick={startLiveDrill}
              className="focus-ring mx-auto grid h-24 w-24 place-items-center rounded-full bg-leaf text-white shadow-soft"
              aria-label="Start live drill"
            >
              <Mic size={32} />
            </button>
          ) : (
            <button
              type="button"
              onClick={stopLiveDrill}
              className="focus-ring mx-auto grid h-24 w-24 place-items-center rounded-full bg-coral text-white shadow-soft"
              aria-label="Stop live drill"
            >
              <Square size={32} />
            </button>
          )}
          <p className="mt-3 text-lg font-bold text-ink">{micStatus}</p>
          <p className="text-sm text-ink/60">
            Attempt {attemptCount}/{maxAttempts} - Word {Math.min(currentIndex + 1, activeItems.length)}/{activeItems.length || 0} - {Math.round(liveMinutesToday * 10) / 10} min today
          </p>
        </footer>

        {fallbackMode ? (
          <section className="mb-4 rounded-md bg-white p-4 shadow-soft">
            <h2 className="font-bold">Fallback record-submit mode</h2>
            <div className="mt-3">
              <Recorder onSubmit={fallbackSubmit} />
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function findNextIndex(items: WordBankItem[], start: number) {
  const next = items.findIndex((item, index) =>
    index >= start && item.status !== "mastered" && item.status !== "review-later"
  );
  if (next >= 0) return next;
  return Math.min(start, Math.max(0, items.length - 1));
}

function playWord(word: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.rate = 0.75;
  window.speechSynthesis.speak(utterance);
}

function isWordMatch(expected: string, heard: string) {
  const expectedClean = clean(expected);
  return clean(heard).split(/\s+/).some((word) => word === expectedClean);
}

function scoreSimilarity(expected: string, heard: string) {
  const expectedClean = clean(expected);
  const heardWords = clean(heard).split(/\s+/).filter(Boolean);
  if (!heardWords.length) return 0;
  return Math.max(...heardWords.map((word) => Math.round((sharedLetters(expectedClean, word) / expectedClean.length) * 100)));
}

function sharedLetters(a: string, b: string) {
  let count = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] === b[index]) count += 1;
  }
  return count;
}

function clean(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s']/g, " ").trim();
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f7f4ee] p-3">
      <div className="text-sm font-semibold text-ink/60">{label}</div>
      <div className="mt-1 truncate text-lg font-bold">{value}</div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label>
      <span className="text-sm font-semibold text-ink/70">{label}</span>
      <select
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring mt-2 h-11 w-full rounded-md border border-black/10 bg-white px-3"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex h-11 items-center justify-between rounded-md border border-black/10 px-3">
      <span className="text-sm font-semibold text-ink/70">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-leaf"
      />
    </label>
  );
}

function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: 24 }).map((_, index) => (
        <span
          key={index}
          className="absolute top-0 h-3 w-2 animate-[fall_1.2s_ease-out_forwards] rounded-sm"
          style={{
            left: `${(index * 37) % 100}%`,
            backgroundColor: ["#4d7c59", "#f3b95f", "#df6b57", "#8ecae6"][index % 4],
            animationDelay: `${(index % 6) * 0.05}s`
          }}
        />
      ))}
      <style jsx>{`
        @keyframes fall {
          from {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          to {
            transform: translateY(80vh) rotate(260deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
