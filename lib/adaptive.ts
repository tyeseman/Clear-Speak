import { lessons } from "@/data/lessons";
import type { ProgressState, SoundLesson } from "@/lib/types";

const weakSoundLessonMap: Record<string, string> = {
  th: "th-think",
  "r and l": "r-l-clarity",
  "r/l": "r-l-clarity",
  "v and b": "v-b",
  "v/b": "v-b",
  "short i": "short-i-long-e",
  "long e": "short-i-long-e",
  vowel: "short-i-long-e",
  final: "final-consonants",
  endings: "final-consonants",
  cluster: "consonant-clusters",
  blended: "consonant-clusters",
  stress: "word-stress",
  rhythm: "sentence-rhythm",
  speed: "sentence-rhythm",
  conversation: "conversation-transfer"
};

export type AdaptiveRecommendation = {
  lesson: SoundLesson;
  reason: string;
  focusArea: string;
  practiceWarning: string;
  confidenceTip: string;
};

export function recommendNextLesson(progress: ProgressState): AdaptiveRecommendation {
  const recent = progress.lessonAttempts.at(-1);
  const weakestScoredLesson = [...progress.soundScores]
    .sort((a, b) => a.bestScore - b.bestScore)
    .find((score) => score.bestScore < 80);

  if (recent?.finalConsonantIssue || progress.finalConsonantIssues >= 2) {
    return build("final-consonants", "Your recent practice shows skipped or soft word endings.", "final consonants");
  }

  if (recent && recent.speakingSpeedWpm > 155) {
    return build("sentence-rhythm", "Your pace is moving fast, so rhythm practice will help your words land.", "speaking speed");
  }

  if (weakestScoredLesson) {
    const lesson = findLesson(weakestScoredLesson.lessonId);
    return {
      lesson,
      reason: `${lesson.name} has the lowest saved score, so it is the best next review.`,
      focusArea: lesson.targetSound,
      practiceWarning: "Go slowly and repeat the practice sentence twice.",
      confidenceTip: "Reviewing a weak sound is how strong clarity gets built."
    };
  }

  const weakFromPlan = [
    progress.coachPlanUpdate?.nextFocusArea ?? "",
    progress.coachPlanUpdate?.recommendedWordBankFocus ?? "",
    ...(progress.coachPlanUpdate?.recommendedLessons ?? []),
    ...(progress.coachPlanUpdate?.mainWeakAreas ?? [])
  ]
    .map((sound) => mapWeakSound(sound))
    .find(Boolean);

  if (weakFromPlan) {
    return build(
      weakFromPlan,
      progress.coachPlanUpdate?.reason ?? "Your latest saved work updated this as the best next focus.",
      findLesson(weakFromPlan).targetSound
    );
  }

  const weakFromBaseline = [
    progress.baselineReport?.recommendedFirstLesson ?? "",
    ...(progress.baselineReport?.mainWeakSounds ?? []),
    ...(progress.baselineReport?.repeatedIssues ?? [])
  ]
    .map((sound) => mapWeakSound(sound))
    .find(Boolean);

  if (weakFromBaseline) {
    return build(
      weakFromBaseline,
      "Your baseline report marked this as an early focus area.",
      findLesson(weakFromBaseline).targetSound
    );
  }

  const nextByProgress = lessons[progress.completedSessions % lessons.length];
  return {
    lesson: nextByProgress,
    reason: "This keeps your practice moving through the starter curriculum.",
    focusArea: nextByProgress.targetSound,
    practiceWarning: "Keep the recording short and clear.",
    confidenceTip: "One short session today is enough to keep momentum."
  };
}

function build(lessonId: string, reason: string, focusArea: string): AdaptiveRecommendation {
  const lesson = findLesson(lessonId);
  return {
    lesson,
    reason,
    focusArea,
    practiceWarning: lessonId === "final-consonants"
      ? "Finish the last sound gently without adding an extra syllable."
      : "Practice slowly before recording.",
    confidenceTip: "You can sound natural and clear at the same time."
  };
}

function findLesson(lessonId: string) {
  return lessons.find((lesson) => lesson.id === lessonId) ?? lessons[0];
}

function mapWeakSound(sound: string) {
  const lower = sound.toLowerCase();
  const match = Object.entries(weakSoundLessonMap).find(([key]) => lower.includes(key));
  return match?.[1] ?? "";
}
