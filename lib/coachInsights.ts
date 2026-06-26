import { lessons } from "@/data/lessons";
import type { ProgressState, SoundLesson } from "@/lib/types";

export type TodayPlanItem = {
  title: string;
  detail: string;
  href: string;
  minutes: number;
  state: "ready" | "done" | "review";
};

export type WeeklyReview = {
  summary: string;
  improved: string[];
  stillNeedsWork: string[];
  nextFocus: string;
  levelNote: string;
};

export function lessonById(id: string | undefined | null): SoundLesson {
  return lessons.find((lesson) => lesson.id === id) ?? lessons[0];
}

export function buildTodayPlan(progress: ProgressState, recommendedLesson: SoundLesson): TodayPlanItem[] {
  const latestReading = progress.readingSessions.at(-1);
  const latestConversation = progress.conversationSessions.at(-1);
  const latestWordBank = progress.wordBanks.at(-1);
  const reviewWords = progress.reviewLaterWords.slice(-5);
  const wordBankFocus =
    progress.coachPlanUpdate?.recommendedWordBankFocus ||
    latestWordBank?.focusArea ||
    recommendedLesson.targetSound;

  return [
    {
      title: recommendedLesson.name,
      detail: `Sound lesson for ${recommendedLesson.targetSound}`,
      href: `/lessons?lesson=${recommendedLesson.id}`,
      minutes: 5,
      state: progress.completedLessons.includes(recommendedLesson.id) ? "done" : "ready"
    },
    {
      title: "Live word drill",
      detail: reviewWords.length
        ? `Review ${reviewWords.slice(0, 3).join(", ")}`
        : `Practice ${wordBankFocus}`,
      href: "/live-drill",
      minutes: 5,
      state: reviewWords.length ? "review" : "ready"
    },
    {
      title: "Reading aloud",
      detail: progress.coachPlanUpdate?.readingFocus || latestReading?.topic || "Short practical passage",
      href: "/reading",
      minutes: progress.readingPreferences.lengthMinutes || 3,
      state: progress.lastReadingDate === todayKey() ? "done" : "ready"
    },
    {
      title: "Conversation transfer",
      detail: progress.coachPlanUpdate?.conversationFocus || latestConversation?.prompt || "30-second real-life prompt",
      href: "/conversation",
      minutes: 2,
      state: latestConversation?.date === todayKey() ? "done" : "ready"
    }
  ];
}

export function buildWeeklyReview(progress: ProgressState): WeeklyReview {
  const recentAttempts = progress.lessonAttempts.slice(-7);
  const olderAttempts = progress.lessonAttempts.slice(-14, -7);
  const recentAverage = average(recentAttempts.map((attempt) => attempt.score));
  const olderAverage = average(olderAttempts.map((attempt) => attempt.score));
  const improved: string[] = [];
  const stillNeedsWork: string[] = [];

  if (recentAverage && olderAverage && recentAverage > olderAverage) {
    improved.push(`Lesson score improved by ${recentAverage - olderAverage} points`);
  }
  if (progress.readingStreak >= 3) improved.push(`Reading streak reached ${progress.readingStreak} days`);
  if (progress.masteredWords.length) improved.push(`${progress.masteredWords.length} live drill words mastered`);
  if (progress.completedLessons.length) improved.push(`${progress.completedLessons.length} lessons completed`);

  const commonMisses = topEntries(progress.missedWords, 3).map(([word]) => word);
  const commonSkips = topEntries(progress.skippedWords, 3).map(([word]) => word);
  if (progress.finalConsonantIssues > 0) stillNeedsWork.push("Final consonant release");
  if (commonMisses.length) stillNeedsWork.push(`Missed words: ${commonMisses.join(", ")}`);
  if (commonSkips.length) stillNeedsWork.push(`Skipped words: ${commonSkips.join(", ")}`);
  if (progress.reviewLaterWords.length) stillNeedsWork.push(`Review-later words: ${progress.reviewLaterWords.slice(-4).join(", ")}`);

  const nextFocus =
    progress.coachPlanUpdate?.nextFocusArea ||
    progress.baselineReport?.recommendedStartingPoint ||
    progress.learnerProfile.focusArea ||
    "daily clarity";
  const level =
    progress.coachPlanUpdate?.currentLevel ||
    progress.baselineReport?.overallLevel ||
    (progress.baselineCompleted ? "developing" : "not placed yet");

  return {
    summary: progress.baselineCompleted
      ? "Your saved practice is now shaping the next plan."
      : "Complete Smart Start to create your first weekly review.",
    improved: improved.length ? improved : ["Complete a few saved sessions to reveal improvement patterns"],
    stillNeedsWork: stillNeedsWork.length ? stillNeedsWork : ["No repeated issue has enough saved data yet"],
    nextFocus,
    levelNote: `Current level: ${level}`
  };
}

export function soundMastery(progress: ProgressState) {
  return lessons.map((lesson) => {
    const score = progress.soundScores.find((item) => item.lessonId === lesson.id);
    const completed = progress.completedLessons.includes(lesson.id);
    const value = score?.bestScore ?? (completed ? 60 : 0);
    return {
      lesson,
      value,
      status: value >= 85 ? "Mastered" : value >= 65 ? "Building" : value > 0 ? "Review" : "New"
    };
  });
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function average(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return Math.round(clean.reduce((total, value) => total + value, 0) / clean.length);
}

function topEntries(record: Record<string, number>, count: number) {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count);
}
