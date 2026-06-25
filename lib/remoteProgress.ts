"use client";

import {
  getStoredPasscode,
  getStoredUserEmail,
  saveProgress
} from "@/lib/progress";
import type { FeedbackResult, ProgressState, ReadingSession } from "@/lib/types";

type RemoteResult = {
  ok: boolean;
  error?: string;
};

function privateHeaders(contentType = true) {
  return {
    ...(contentType ? { "Content-Type": "application/json" } : {}),
    "x-clearspeak-passcode": getStoredPasscode(),
    "x-clearspeak-email": getStoredUserEmail()
  };
}

async function postJson(path: string, body: unknown): Promise<RemoteResult> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify(body),
      cache: "no-store"
    });
    if (!response.ok) return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function initializeRemoteDatabase() {
  return postJson("/api/db/init", {});
}

export async function loadRemoteProgress(): Promise<RemoteResult> {
  try {
    const response = await fetch("/api/db/progress", {
      method: "GET",
      headers: privateHeaders(false),
      cache: "no-store"
    });
    if (!response.ok) return { ok: false };
    const body = (await response.json()) as { progress?: ProgressState | null };
    if (body.progress) saveProgress(body.progress);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function saveRemoteProgress(progress: ProgressState) {
  return postJson("/api/db/progress", { progress });
}

export async function saveRemoteSettings(progress: ProgressState) {
  return postJson("/api/db/settings", { settings: { progressState: progress } });
}

export async function saveRemoteLessonResult(input: {
  lessonId: string;
  lessonTitle: string;
  score: number;
  feedback: FeedbackResult;
}) {
  return postJson("/api/db/lesson-result", input);
}

export async function saveRemoteSoundScore(input: {
  soundKey: string;
  score: number;
  attempts?: number;
}) {
  return postJson("/api/db/sound-score", input);
}

export async function saveRemoteReadingResult(session: ReadingSession) {
  return postJson("/api/db/reading-result", {
    passageId: session.id,
    topic: session.topic,
    level: session.level,
    score: session.score,
    missedWords: session.missedWords,
    comprehensionScore: session.comprehensionScore
  });
}

export async function saveRemoteAiUsage(input: {
  feature: string;
  estimatedCost?: number;
  tokensUsed?: number;
  audioSeconds?: number | null;
}) {
  return postJson("/api/db/ai-usage-log", input);
}
