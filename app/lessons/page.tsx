"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PracticeCoach } from "@/components/PracticeCoach";
import { lessons } from "@/data/lessons";
import { getLessonProgress, loadProgress } from "@/lib/progress";
import type { ProgressState } from "@/lib/types";

export default function LessonsPage() {
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState(lessons[0].id);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const lesson = lessons.find((item) => item.id === selectedId) ?? lessons[0];
  const recommended = useMemo(
    () => new Set(progress?.learnerProfile.recommendedNextLessons ?? []),
    [progress]
  );

  useEffect(() => {
    const current = loadProgress();
    setProgress(current);
    const requestedLesson = searchParams.get("lesson");
    if (requestedLesson && lessons.some((item) => item.id === requestedLesson)) {
      setSelectedId(requestedLesson);
      return;
    }
    const firstRecommended = current.baselineReport?.recommendedFirstLesson;
    const match = lessons.find(
      (item) =>
        item.id === firstRecommended ||
        item.name.toLowerCase().includes((firstRecommended ?? "").toLowerCase())
    );
    if (match) setSelectedId(match.id);
  }, [searchParams]);

  function isUnlocked(id: string) {
    const item = lessons.find((lessonItem) => lessonItem.id === id);
    if (!item?.unlockAfter?.length || !progress) return true;
    return item.unlockAfter.every((requiredId) => progress.completedLessons.includes(requiredId));
  }

  return (
    <AppShell>
      <div className="md:ml-52">
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-md bg-white p-4 shadow-soft">
            <h1 className="text-xl font-bold">Sound lessons</h1>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              Lessons unlock by progress, but your baseline recommendations stay visible.
            </p>
            <div className="mt-4 space-y-2">
              {lessons.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => isUnlocked(item.id) || recommended.has(item.id) ? setSelectedId(item.id) : undefined}
                  className={`focus-ring w-full rounded-md p-3 text-left font-semibold ${
                    selectedId === item.id ? "bg-leaf text-white" : "bg-[#f7f4ee] text-ink"
                  }`}
                >
                  <span className="block">{item.name}</span>
                  <span className="mt-1 block text-xs opacity-75">
                    Level {item.level}
                    {progress && getLessonProgress(progress, item.id).completed ? " - complete" : ""}
                    {!isUnlocked(item.id) && !recommended.has(item.id) ? " - locked" : ""}
                    {recommended.has(item.id) ? " - recommended" : ""}
                  </span>
                </button>
              ))}
            </div>
          </aside>
          <PracticeCoach lesson={lesson} mode="lesson" />
        </div>
      </div>
    </AppShell>
  );
}
