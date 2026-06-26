"use client";

import {
  getStoredPasscode,
  getStoredUserEmail,
  saveProgress
} from "@/lib/progress";
import type { ConversationSession, FeedbackResult, ProgressState, ReadingSession } from "@/lib/types";
import type { CoachPlanUpdate, WordBank, WordDrillAttempt } from "@/lib/types";

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

export async function resetRemoteProgress(progress: ProgressState) {
  return postJson("/api/db/reset", { progress });
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

export async function saveRemoteConversationResult(session: ConversationSession) {
  return postJson("/api/db/conversation-result", {
    prompt: session.prompt,
    transcript: session.transcript,
    score: session.score,
    speedScore: session.speedScore,
    clarityScore: session.clarityScore,
    feedback: session.feedback
  });
}

export async function loadRemoteWordBank(focusArea?: string): Promise<RemoteResult & { bank?: WordBank | null }> {
  try {
    const query = focusArea ? `?focusArea=${encodeURIComponent(focusArea)}` : "";
    const response = await fetch(`/api/word-bank${query}`, {
      method: "GET",
      headers: privateHeaders(false),
      cache: "no-store"
    });
    if (!response.ok) return { ok: false };
    return (await response.json()) as RemoteResult & { bank?: WordBank | null };
  } catch {
    return { ok: false };
  }
}

export async function generateRemoteWordBank(input: {
  progress: ProgressState;
  focusArea: string;
  batchSize: 25 | 50 | 100;
  force?: boolean;
}): Promise<RemoteResult & { bank?: WordBank | null; reused?: boolean }> {
  try {
    const response = await fetch("/api/word-bank", {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify(input),
      cache: "no-store"
    });
    if (!response.ok) return { ok: false };
    return (await response.json()) as RemoteResult & { bank?: WordBank | null; reused?: boolean };
  } catch {
    return { ok: false };
  }
}

export async function saveRemoteWordDrillAttempt(
  attempt: WordDrillAttempt & { wordBankItemId?: number }
) {
  return postJson("/api/word-drill/attempt", attempt);
}

export async function updateRemoteCoachPlan(input: {
  trigger: "lesson-completion" | "assessment-completion" | "weekly-review" | "word-bank-mostly-complete" | "manual";
  progress: ProgressState;
}): Promise<RemoteResult & { update?: CoachPlanUpdate }> {
  try {
    const response = await fetch("/api/coach/update-plan", {
      method: "POST",
      headers: privateHeaders(),
      body: JSON.stringify(input),
      cache: "no-store"
    });
    if (!response.ok) return { ok: false };
    return (await response.json()) as RemoteResult & { update?: CoachPlanUpdate };
  } catch {
    return { ok: false };
  }
}

export async function saveRemoteAiUsage(input: {
  feature: string;
  estimatedCost?: number;
  tokensUsed?: number;
  audioSeconds?: number | null;
}) {
  return postJson("/api/db/ai-usage-log", input);
}
