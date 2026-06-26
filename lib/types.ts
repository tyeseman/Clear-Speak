export type PracticeItemType = "word" | "sentence" | "passage";

export type LessonLevel = 1 | 2 | 3 | 4 | 5;

export type LessonStepKind =
  | "explain"
  | "video"
  | "mouth"
  | "listen"
  | "word-drill"
  | "sentence-drill"
  | "reading-drill"
  | "record"
  | "feedback"
  | "complete";

export type LessonStep = {
  id: string;
  title: string;
  kind: LessonStepKind;
  level: LessonLevel;
  instruction: string;
};

export type VideoLesson = {
  title: string;
  coachName: string;
  videoUrl: string;
  thumbnail: string;
  transcript: string;
  keyPoints: string[];
};

export type CoachCard = {
  tongue: string;
  lips: string;
  airflow: string;
  voice: string;
  mistakeToAvoid: string;
  practiceExample: string;
  diagram: "tongue-behind-teeth" | "lips-rounded" | "lips-relaxed" | "teeth-touch-lip" | "airflow-between-teeth" | "final-release";
};

export type SoundLesson = {
  id: string;
  name: string;
  targetSound: string;
  instruction: string;
  level: LessonLevel;
  unlockAfter?: string[];
  commonMistake: string;
  correctSoundExample: string;
  steps: LessonStep[];
  video: VideoLesson;
  coachCard: CoachCard;
  words: string[];
  sentences: string[];
  passage: string;
  conversationPrompt: string;
};

export type FeedbackResult = {
  score: number;
  whatImproved: string;
  mainIssue: string;
  detectedIssues?: string[];
  strongPoints?: string[];
  mainCorrection?: string;
  mouthTip: string;
  tongueTip?: string;
  speedTip?: string;
  retryText?: string;
  tryAgainSentence: string;
  nextRecommendedLesson?: string;
  practiceWords: string[];
  soundFeedback?: SoundFeedbackItem[];
  needsWork?: string;
  spokeTooFast?: boolean;
  skippedWords?: string[];
  skippedEndings?: string[];
  finalConsonantIssue?: boolean;
  readingAccuracy?: number;
  speakingSpeedWpm?: number;
};

export type SoundFeedbackItem = {
  targetSound: string;
  expectedWord: string;
  transcriptResult: string;
  issueDetected: string;
  correction: string;
};

export type LessonProgress = {
  lessonId: string;
  currentStep: number;
  completedSteps: string[];
  completed: boolean;
  unlocked: boolean;
  lastUpdated: string;
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
  overallLevel: string;
  speakingLevel: string;
  pronunciationLevel: string;
  readingLevel: string;
  grammarLevel: string;
  confidenceLevel: string;
  overallClarityScore: number;
  readingScore: number;
  pronunciationScore: number;
  speedScore: number;
  rhythmScore: number;
  mainStrengths: string[];
  mainWeakSounds: string[];
  mainWeakAreas: string[];
  repeatedIssues: string[];
  recommendedStartingPoint: string;
  recommendedFirstLessonId: string;
  recommendedLessonPath: string[];
  readingFocus: string;
  conversationFocus: string;
  wordDrillFocus: string;
  reason: string;
  encouragingSummary: string;
  fourteenDayPlan: string[];
  recommendedFirstLesson: string;
  firstSevenDayPlan: string[];
  beforeText: string;
  afterText?: string;
};

export type SmartStartProfile = {
  reasonForJoining: string;
  improvementGoal: string;
  difficultSituations: string;
  askedToRepeat: "often" | "sometimes" | "rarely" | "not sure";
  mainStruggle: "reading" | "speaking" | "pronunciation" | "confidence" | "grammar" | "mixed";
  englishFocus: "daily conversation" | "professional speech" | "public speaking" | "customer calls" | "reading" | "academic speech";
  confidenceRating: number;
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
  smartStartProfile: SmartStartProfile | null;
  learnerProfile: LearnerProfile;
  readingPreferences: ReadingPreferences;
  readingSessions: ReadingSession[];
  readingStreak: number;
  lastReadingDate: string | null;
  completedSessions: number;
  streak: number;
  lastPracticedDate: string | null;
  soundScores: SoundScore[];
  lessonProgress: LessonProgress[];
  lessonAttempts: LessonAttempt[];
  completedLessons: string[];
  conversationSessions: ConversationSession[];
  wordBanks: WordBank[];
  wordDrillAttempts: WordDrillAttempt[];
  reviewLaterWords: string[];
  masteredWords: string[];
  liveMinutesUsed: Record<string, number>;
  coachPlanUpdate: CoachPlanUpdate | null;
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

export type ConversationSession = {
  id: string;
  date: string;
  prompt: string;
  transcript: string;
  score: number;
  speedScore: number;
  clarityScore: number;
  feedback: FeedbackResult;
};

export type WordBankItemStatus = "new" | "in-progress" | "mastered" | "review-later";

export type WordBankItem = {
  id?: number;
  wordBankId?: number;
  word: string;
  targetSound: string;
  difficulty: "easy" | "medium" | "hard";
  mouthTip: string;
  exampleSentence: string;
  commonMistake: string;
  soundCategory: string;
  reasonSelected: string;
  status: WordBankItemStatus;
  attempts: number;
  bestScore: number;
};

export type WordBank = {
  id?: number;
  focusArea: string;
  soundCategory: string;
  batchSize: 25 | 50 | 100;
  sourceReason: string;
  createdAt?: string;
  completedAt?: string | null;
  items: WordBankItem[];
};

export type WordDrillAttempt = {
  id: string;
  date: string;
  word: string;
  targetSound: string;
  heardText: string;
  attempts: number;
  bestScore: number;
  passed: boolean;
  reviewLater: boolean;
  feedback: string;
};

export type CoachPlanUpdate = {
  currentLevel: string;
  progressSummary: string;
  mainWeakAreas: string[];
  improvedAreas: string[];
  nextFocusArea: string;
  recommendedLessons: string[];
  recommendedWordBankFocus: string;
  readingFocus: string;
  conversationFocus: string;
  reason: string;
};

export type PracticeSubmission = {
  lessonId: string;
  targetSound: string;
  expectedText: string;
  transcribedText: string;
  durationSeconds?: number;
};

export type AssessmentReport = {
  overallLevel: string;
  speakingLevel: string;
  pronunciationLevel: string;
  readingLevel: string;
  grammarLevel: string;
  confidenceLevel: string;
  overallClarityScore: number;
  readingScore: number;
  pronunciationScore: number;
  speedScore: number;
  rhythmScore: number;
  mainStrengths: string[];
  mainWeakSounds: string[];
  mainWeakAreas: string[];
  repeatedIssues: string[];
  recommendedStartingPoint: string;
  recommendedFirstLessonId: string;
  recommendedLessonPath: string[];
  readingFocus: string;
  conversationFocus: string;
  wordDrillFocus: string;
  reason: string;
  encouragingSummary: string;
  fourteenDayPlan: string[];
  recommendedFirstLesson: string;
  firstSevenDayPlan: string[];
};
