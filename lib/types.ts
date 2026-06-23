export type PracticeItemType = "word" | "sentence" | "passage";

export type SoundLesson = {
  id: string;
  name: string;
  targetSound: string;
  instruction: string;
  words: string[];
  sentences: string[];
  passage: string;
};

export type FeedbackResult = {
  score: number;
  whatImproved: string;
  mainIssue: string;
  mouthTip: string;
  tryAgainSentence: string;
  practiceWords: string[];
  needsWork?: string;
  spokeTooFast?: boolean;
  skippedWords?: string[];
  skippedEndings?: string[];
  finalConsonantIssue?: boolean;
  readingAccuracy?: number;
  speakingSpeedWpm?: number;
};

export type SoundScore = {
  lessonId: string;
  bestScore: number;
  attempts: number;
};

export type LessonAttempt = {
  id: string;
  date: string;
  lessonId: string;
  score: number;
  readingAccuracy: number;
  speakingSpeedWpm: number;
  skippedWords: string[];
  skippedEndings: string[];
  finalConsonantIssue: boolean;
  whatImproved: string;
  needsWork: string;
};

export type BaselineReport = {
  date: string;
  overallClarityScore: number;
  readingScore: number;
  pronunciationScore: number;
  speedScore: number;
  mainWeakSounds: string[];
  firstSevenDayPlan: string[];
  beforeText: string;
  afterText?: string;
};

export type ReadingPreferences = {
  topics: string[];
  customTopic: string;
  level: "very easy" | "easy" | "medium" | "challenging";
  lengthMinutes: 1 | 3 | 5 | 10;
  favoritePassages: string[];
  dailyGoalMinutes: number;
};

export type ReadingSession = {
  id: string;
  date: string;
  topic: string;
  level: string;
  lengthMinutes: number;
  passage: string;
  score: number;
  comprehensionScore: number;
  missedWords: string[];
  skippedWords: string[];
  finalSoundsDropped: string[];
  explanation: string;
};

export type LearnerProfile = {
  goal: string;
  confidenceRating: number;
  recommendedNextLessons: string[];
  nextLessonReason: string;
  focusArea: string;
  practiceWarning: string;
  confidenceTip: string;
};

export type ApiUsageEvent = {
  date: string;
  feature: string;
  reason: string;
  success: boolean;
};

export type PracticeReminder = {
  id: string;
  label: string;
  time: string;
  enabled: boolean;
  kind: "lesson" | "reading" | "review" | "follow-up";
  adaptive: boolean;
  followUpMinutes: number;
  lastFiredDateTime?: string;
};

export type ProgressState = {
  baselineCompleted: boolean;
  baselineReport: BaselineReport | null;
  learnerProfile: LearnerProfile;
  readingPreferences: ReadingPreferences;
  readingSessions: ReadingSession[];
  readingStreak: number;
  lastReadingDate: string | null;
  completedSessions: number;
  streak: number;
  lastPracticedDate: string | null;
  soundScores: SoundScore[];
  lessonAttempts: LessonAttempt[];
  completedLessons: string[];
  readingScores: number[];
  missedWords: Record<string, number>;
  skippedWords: Record<string, number>;
  finalConsonantIssues: number;
  speakingSpeeds: number[];
  readingAccuracies: number[];
  reminderTime: string;
  reminders: PracticeReminder[];
  notificationsEnabled: boolean;
  apiUsage: Record<string, number>;
  apiUsageEvents: ApiUsageEvent[];
  costSavingMode: boolean;
  highQualityVoice: boolean;
};

export type PracticeSubmission = {
  lessonId: string;
  targetSound: string;
  expectedText: string;
  transcribedText: string;
  durationSeconds?: number;
};

export type AssessmentReport = {
  overallClarityScore: number;
  readingScore: number;
  pronunciationScore: number;
  speedScore: number;
  mainWeakSounds: string[];
  firstSevenDayPlan: string[];
};
