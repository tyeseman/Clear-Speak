"use client";

import { useEffect, useState } from "react";
import { Loader2, Play, Sparkles, Turtle } from "lucide-react";
import {
  canUseApi,
  getStoredPasscode,
  getStoredUserEmail,
  loadProgress,
  noteApiUse
} from "@/lib/progress";

export function TTSButton({ text }: { text: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [highQualityEnabled, setHighQualityEnabled] = useState(false);

  useEffect(() => {
    setHighQualityEnabled(loadProgress().highQualityVoice);
  }, []);

  function playBrowser(speed: number) {
    setError("");
    if (!("speechSynthesis" in window)) {
      setError("Browser voice is not available here.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speed;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  async function playHighQuality(speed: number) {
    if (!canUseApi("tts", 25)) {
      setError("High quality voice limit reached for today.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-clearspeak-passcode": getStoredPasscode(),
          "x-clearspeak-email": getStoredUserEmail()
        },
        body: JSON.stringify({ text, speed })
      });
      if (!response.ok) throw new Error("Audio unavailable.");
      noteApiUse("tts");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      setError("Audio is not available right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => playBrowser(0.9)}
        className="focus-ring inline-flex h-10 items-center gap-2 rounded-md bg-leaf px-3 text-sm font-semibold text-white"
        title="Play with browser voice"
      >
        <Play size={16} />
        Play
      </button>
      <button
        type="button"
        onClick={() => playBrowser(0.65)}
        className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-leaf/25 bg-white px-3 text-sm font-semibold text-leaf disabled:opacity-60"
        title="Play slower with browser voice"
      >
        <Turtle size={16} />
        Slow
      </button>
      {highQualityEnabled ? (
        <button
          type="button"
          onClick={() => playHighQuality(0.9)}
          disabled={loading}
          className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm font-semibold text-ink disabled:opacity-60"
          title="Optional high quality OpenAI voice"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          HQ voice
        </button>
      ) : null}
      {error ? <span className="text-sm text-coral">{error}</span> : null}
    </span>
  );
}
