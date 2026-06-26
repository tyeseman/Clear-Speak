import type {
  ApiUsageEvent,
  BaselineReport,
  ConversationSession,
  FeedbackResult,
  LessonProgress,
  ProgressState,
  ReadingPreferences,
  ReadingSession,
  SmartStartProfile,
  WordBank,
  WordDrillAttempt
} from "@/lib/types";

export const progressKey = "clearspeak-progress-v1";
export const authKey = "clearspeak-private-access-v1";
export const passcodeKey = "clearspeak-passcode-v1";
export const userEmailKey = "clearspeak-user-email-v1";
export const defaultUserEmail = "hello@leonctyes.com";

export const defaultProgress: ProgressState = {
  baselineCompleted: false,
  baselineReport: null,
  smartStartProfile: null,
  learnerProfile: {
    goal: "Speak slower and clearer in daily life",
    confidenceRating: 3,
    recommendedNextLessons: [],
    nextLessonReason: "Complete the baseline assessment to build your first plan.",
    focusArea: "baseline",
    practiceWarning: "Start with a short session and keep your voice natural.",
    confidenceTip: "Clarity grows through small daily practice."
  },
  readingPreferences: {
    topics: ["business", "practical U.S. life"],
    customTopic: "",
    level: "very easy",
    lengthMinutes: 1,
    favoritePassages: [],
    dailyGoalMinutes: 1
  },
  readingSessions: [],
  readingStreak: 0,
  lastReadingDate: null,
  completedSessions: 0,
  streak: 0,
  lastPracticedDate: null,
  soundScores: [],
  lessonProgress: [],
  lessonAttempts: [],
  completedLessons: [],
  conversationSessions: [],
  wordBanks: [],
  wordDrillAttempts: [],
  reviewLaterWords: [],
  masteredWords: [],
  liveMinutesUsed: {},
  coachPlanUpdate: null,
  readingScores: [],
  missedWords: {},
  skippedWords: {},
  finalConsonantIssues: 0,
  speakingSpeeds: [],
  readingAccuracies: [],
  reminderTime: "19:00",
  reminders: [
    {
      id: "morning-lesson",
      label: "Morning lesson",
      time: "08:00",
      enabled: true,
      kind: "lesson",
      adaptive: true,
      followUpMinutes: 120
    },
    {
      id: "evening-follow-up",
      label: "Evening follow-up",
      time: "19:00",
      enabled: true,
      kind: "follow-up",
      adaptive: true,
      followUpMinutes: 60
    },
    {
      id: "reading-habit",
      label: "Reading habit",
      time: "20:00",
      enabled: false,
      kind: "reading",
      adaptive: false,
      followUpMinutes: 90
    }
  ],
  notificationsEnabled: false,
  apiUsage: {},
  apiUsageEvents: [],
  costSavingMode: true,
  highQualityVoice: false
};

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function loadProgress(): ProgressState {
  if (typeof window === "undefined") return defaultProgress;
  const key = getProgressKey();
  const raw = window.localStorage.getItem(key) ?? window.localStorage.getItem(progressKey);
  if (!raw) return defaultProgress;
  try {
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      ...defaultProgress,
      ...parsed,
      learnerProfile: { ...defaultProgress.learnerProfile, ...parsed.learnerProfile },
      readingPreferences: { ...defaultProgress.readingPreferences, ...parsed.readingPreferences },
      reminders: parsed.reminders ?? defaultProgress.reminders,
      smartStartProfile: parsed.smartStartProfile ?? null,
      lessonProgress: parsed.lessonProgress ?? [],
      conversationSessions: parsed.conversationSessions ?? [],
      wordBanks: parsed.wordBanks ?? [],
      wordDrillAttempts: parsed.wordDrillAttempts ?? [],
      reviewLaterWords: parsed.reviewLaterWords ?? [],
      masteredWords: parsed.masteredWords ?? [],
      liveMinutesUsed: parsed.liveMinutesUsed ?? {},
      coachPlanUpdate: parsed.coachPlanUpdate ?? null
    };
  } catch {
    return defaultProgress;
  }
}

export function saveProgress(progress: ProgressState) {
  window.localStorage.setItem(getProgressKey(), JSON.stringify(progress));
}

export function completePractice(
  progress: ProgressState,
  lessonId: string,
  feedback: FeedbackResult,
  missedWords: string[],
  durationSeconds?: number,
  expectedText = ""
): ProgressState {
  const today = todayKey();
  const yesterday = todayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const alreadyPracticedToday = progress.lastPracticedDate === today;
  const existing = progress.soundScores.find((score) => score.lessonId === lessonId);
  const soundScores = existing
    ? progress.soundScores.map((score) =>
        score.lessonId === lessonId
          ? {
              ...score,
              bestScore: Math.max(score.bestScore, feedback.score),
              attempts: score.attempts + 1
            }
          : score
      )
    : [
        ...progress.soundScores,
        { lessonId, bestScore: feedback.score, attempts: 1 }
      ];

  const updatedMissedWords = { ...progress.missedWords };
  for (const word of missedWords) {
    const cleanWord = word.toLowerCase();
    updatedMissedWords[cleanWord] = (updatedMissedWords[cleanWord] ?? 0) + 1;
  }

  const skippedWords = feedback.skippedWords?.length ? feedback.skippedWords : missedWords;
  const updatedSkippedWords = { ...progress.skippedWords };
  for (const word of skippedWords) {
    const cleanWord = word.toLowerCase();
    updatedSkippedWords[cleanWord] = (updatedSkippedWords[cleanWord] ?? 0) + 1;
  }

  const skippedEndings =
    feedback.skippedEndings?.length ? feedback.skippedEndings : findSkippedEndings(expectedText, skippedWords);
  const speakingSpeedWpm =
    feedback.speakingSpeedWpm ?? estimateWordsPerMinute(expectedText, durationSeconds);
  const readingAccuracy =
    feedback.readingAccuracy ?? estimateReadingAccuracy(expectedText, missedWords);
  const finalConsonantIssue =
    feedback.finalConsonantIssue ?? skippedEndings.length > 0;
  const nextProfile = updateLearnerProfile(progress, lessonId, feedback, skippedWords, skippedEndings);

  return {
    ...progress,
    learnerProfile: nextProfile,
    completedSessions: alreadyPracticedToday
      ? progress.completedSessions
      : progress.completedSessions + 1,
    streak: alreadyPracticedToday
      ? progress.streak
      : progress.lastPracticedDate === yesterday
        ? progress.streak + 1
        : 1,
    lastPracticedDate: today,
    soundScores,
    lessonAttempts: [
      ...progress.lessonAttempts,
      {
        id: `${today}-${lessonId}-${Date.now()}`,
        date: today,
        lessonId,
        score: feedback.score,
        readingAccuracy,
        speakingSpeedWpm,
        skippedWords,
        skippedEndings,
        finalConsonantIssue,
        whatImproved: feedback.whatImproved,
        needsWork: feedback.needsWork ?? feedback.mainIssue
      }
    ].slice(-100),
    completedLessons: Array.from(new Set([...progress.completedLessons, lessonId])),
    lessonProgress: markLessonComplete(progress.lessonProgress, lessonId),
    readingScores: [...progress.readingScores, feedback.score].slice(-20),
    missedWords: updatedMissedWords,
    skippedWords: updatedSkippedWords,
    finalConsonantIssues:
      progress.finalConsonantIssues + (finalConsonantIssue ? 1 : 0),
    speakingSpeeds: [...progress.speakingSpeeds, speakingSpeedWpm].slice(-30),
    readingAccuracies: [...progress.readingAccuracies, readingAccuracy].slice(-30)
  };
}

export function findMissedWords(expectedText: string, transcribedText: string) {
  const expectedWords = normalizeWords(expectedText);
  const transcribedSet = new Set(normalizeWords(transcribedText));
  return expectedWords.filter((word) => !transcribedSet.has(word));
}

export function estimateReadingAccuracy(expectedText: string, missedWords: string[]) {
  const expectedCount = normalizeWords(expectedText).length;
  if (!expectedCount) return 0;
  return Math.max(0, Math.round(((expectedCount - missedWords.length) / expectedCount) * 100));
}

export function estimateWordsPerMinute(text: string, durationSeconds?: number) {
  if (!durationSeconds || durationSeconds <= 0) return 0;
  return Math.round((normalizeWords(text).length / durationSeconds) * 60);
}

export function findSkippedEndings(expectedText: string, missedWords: string[]) {
  const expectedWords = new Set(normalizeWords(expectedText));
  return missedWords.filter((word) => {
    const clean = word.toLowerCase();
    return (
      expectedWords.has(clean) &&
      /(?:ed|d|t|k|p|s|st|ld|nt|mp|ft|sk|lp)$/.test(clean)
    );
  });
}

export function saveBaselineReport(
  progress: ProgressState,
  report: BaselineReport,
  smartStartProfile?: SmartStartProfile
) {
  const recommendedLessons = report.recommendedLessonPath.length
    ? report.recommendedLessonPath
    : report.firstSevenDayPlan;
  return {
    ...progress,
    baselineCompleted: true,
    baselineReport: report,
    smartStartProfile: smartStartProfile ?? progress.smartStartProfile,
    learnerProfile: {
      ...progress.learnerProfile,
      goal: smartStartProfile?.improvementGoal || progress.learnerProfile.goal,
      confidenceRating: smartStartProfile?.confidenceRating ?? progress.learnerProfile.confidenceRating,
      recommendedNextLessons: recommendedLessons,
      nextLessonReason: report.reason || `Your Smart Start showed ${report.mainWeakAreas.slice(0, 2).join(" and ")} as good first focus areas.`,
      focusArea: report.recommendedStartingPoint || report.mainWeakAreas[0] || report.mainWeakSounds[0] || "daily clarity",
      practiceWarning: report.speedScore < 70 ? "Slow down and finish the final sounds." : "Keep a steady pace and finish each word.",
      confidenceTip: report.encouragingSummary || "You are not removing your accent. You are making your words easier to understand."
    }
  };
}

export function getLessonProgress(progress: ProgressState, lessonId: string): LessonProgress {
  return (
    progress.lessonProgress.find((item) => item.lessonId === lessonId) ?? {
      lessonId,
      currentStep: 0,
      completedSteps: [],
      completed: false,
      unlocked: true,
      lastUpdated: new Date().toISOString()
    }
  );
}

export function saveLessonStepProgress(
  progress: ProgressState,
  lessonId: string,
  currentStep: number,
  stepId?: string
): ProgressState {
  const existing = getLessonProgress(progress, lessonId);
  const next: LessonProgress = {
    ...existing,
    currentStep,
    completedSteps: stepId
      ? Array.from(new Set([...existing.completedSteps, stepId]))
      : existing.completedSteps,
    lastUpdated: new Date().toISOString()
  };
  return {
    ...progress,
    lessonProgress: [
      ...progress.lessonProgress.filter((item) => item.lessonId !== lessonId),
      next
    ]
  };
}

export function resetLessonProgress(progress: ProgressState, lessonId: string): ProgressState {
  return {
    ...progress,
    lessonProgress: [
      ...progress.lessonProgress.filter((item) => item.lessonId !== lessonId),
      {
        lessonId,
        currentStep: 0,
        completedSteps: [],
        completed: false,
        unlocked: true,
        lastUpdated: new Date().toISOString()
      }
    ]
  };
}

export function saveConversationSession(session: ConversationSession) {
  const progress = loadProgress();
  saveProgress({
    ...progress,
    conversationSessions: [...progress.conversationSessions, session].slice(-100),
    speakingSpeeds: [...progress.speakingSpeeds, session.feedback.speakingSpeedWpm ?? 0]
      .filter(Boolean)
      .slice(-30),
    readingScores: [...progress.readingScores, session.score].slice(-20)
  });
}

export function saveWordBankLocal(bank: WordBank) {
  const progress = loadProgress();
  const existingId = bank.id;
  const existingFocus = bank.focusArea.toLowerCase();
  saveProgress({
    ...progress,
    wordBanks: [
      ...progress.wordBanks.filter((item) =>
        existingId ? item.id !== existingId : item.focusArea.toLowerCase() !== existingFocus
      ),
      bank
    ].slice(-10)
  });
}

export function saveWordDrillAttemptLocal(attempt: WordDrillAttempt) {
  const progress = loadProgress();
  const masteredWords = attempt.passed
    ? Array.from(new Set([...progress.masteredWords, attempt.word.toLowerCase()]))
    : progress.masteredWords;
  const reviewLaterWords = attempt.reviewLater
    ? Array.from(new Set([...progress.reviewLaterWords, attempt.word.toLowerCase()]))
    : progress.reviewLaterWords.filter((word) => word !== attempt.word.toLowerCase());

  saveProgress({
    ...progress,
    wordDrillAttempts: [...progress.wordDrillAttempts, attempt].slice(-300),
    masteredWords,
    reviewLaterWords
  });
}

export function addLiveMinutes(minutes: number) {
  const progress = loadProgress();
  const today = todayKey();
  saveProgress({
    ...progress,
    liveMinutesUsed: {
      ...progress.liveMinutesUsed,
      [today]: Math.round(((progress.liveMinutesUsed[today] ?? 0) + minutes) * 10) / 10
    }
  });
}

function markLessonComplete(lessonProgress: LessonProgress[], lessonId: string) {
  const existing = lessonProgress.find((item) => item.lessonId === lessonId);
  const next: LessonProgress = {
    ...(existing ?? {
      lessonId,
      currentStep: 0,
      completedSteps: [],
      unlocked: true
    }),
    completed: true,
    lastUpdated: new Date().toISOString()
  };
  return [...lessonProgress.filter((item) => item.lessonId !== lessonId), next];
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

export function canUseApi(action: string, limit: number) {
  const key = `${todayKey()}:${action}`;
  const progress = loadProgress();
  return (progress.apiUsage[key] ?? 0) < limit;
}

export function noteApiUse(action: string, reason = "User requested coaching", success = true) {
  const key = `${todayKey()}:${action}`;
  const progress = loadProgress();
  const event: ApiUsageEvent = {
    date: new Date().toISOString(),
    feature: action,
    reason,
    success
  };
  saveProgress({
    ...progress,
    apiUsage: {
      ...progress.apiUsage,
      [key]: (progress.apiUsage[key] ?? 0) + 1
    },
    apiUsageEvents: [...progress.apiUsageEvents, event].slice(-100)
  });

  if (typeof window !== "undefined") {
    fetch("/api/db/ai-usage-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-clearspeak-passcode": getStoredPasscode(),
        "x-clearspeak-email": getStoredUserEmail()
      },
      body: JSON.stringify({
        feature: action,
        estimatedCost: 0,
        tokensUsed: 0,
        audioSeconds: null
      }),
      cache: "no-store"
    }).catch(() => undefined);
  }
}

export function saveReadingPreferences(preferences: ReadingPreferences) {
  const progress = loadProgress();
  saveProgress({ ...progress, readingPreferences: preferences });
}

export function saveReadingSession(session: ReadingSession) {
  const progress = loadProgress();
  const today = todayKey();
  const yesterday = todayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const alreadyReadToday = progress.lastReadingDate === today;
  const readingStreak = alreadyReadToday
    ? progress.readingStreak
    : progress.lastReadingDate === yesterday
      ? progress.readingStreak + 1
      : 1;

  saveProgress({
    ...progress,
    readingSessions: [...progress.readingSessions, session].slice(-100),
    readingStreak,
    lastReadingDate: today
  });
}

function updateLearnerProfile(
  progress: ProgressState,
  lessonId: string,
  feedback: FeedbackResult,
  skippedWords: string[],
  skippedEndings: string[]
) {
  const issue = skippedEndings.length
    ? "Final consonants"
    : feedback.spokeTooFast
      ? "Speaking speed"
      : feedback.readingAccuracy && feedback.readingAccuracy < 80
        ? "Reading accuracy"
        : feedback.mainIssue;

  return {
    ...progress.learnerProfile,
    recommendedNextLessons: [
      lessonId,
      ...progress.learnerProfile.recommendedNextLessons.filter((item) => item !== lessonId)
    ].slice(0, 7),
    nextLessonReason: feedback.needsWork ?? feedback.mainIssue,
    focusArea: issue,
    practiceWarning: feedback.spokeTooFast
      ? "Slow down slightly and let each important word land."
      : skippedWords.length
        ? "Watch for skipped words and word endings."
        : "Keep the same steady pace tomorrow.",
    confidenceTip: feedback.whatImproved || "Small clear repetitions build confidence."
  };
}

export function getStoredPasscode() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(passcodeKey) ?? "";
}

export function getStoredUserEmail() {
  if (typeof window === "undefined") return defaultUserEmail;
  return window.localStorage.getItem(userEmailKey) ?? defaultUserEmail;
}

export function getProgressKey(email = getStoredUserEmail()) {
  return `${progressKey}-${email.trim().toLowerCase()}`;
}

export function isAuthenticated() {
  if (typeof window === "undefined") return false;
  return (
    window.localStorage.getItem(authKey) === "yes" &&
    Boolean(getStoredPasscode()) &&
    Boolean(getStoredUserEmail())
  );
}

export function saveAuth(passcode: string, email = defaultUserEmail) {
  window.localStorage.setItem(authKey, "yes");
  window.localStorage.setItem(passcodeKey, passcode);
  window.localStorage.setItem(userEmailKey, email.trim().toLowerCase());
}

export function clearAuth() {
  window.localStorage.removeItem(authKey);
  window.localStorage.removeItem(passcodeKey);
  window.localStorage.removeItem(userEmailKey);
}

export function normalizeWords(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}
