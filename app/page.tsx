"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarCheck, Flame, Volume2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { lessons } from "@/data/lessons";
import { recommendNextLesson } from "@/lib/adaptive";
import { defaultProgress, loadProgress } from "@/lib/progress";
import { loadRemoteProgress } from "@/lib/remoteProgress";
import type { ProgressState } from "@/lib/types";

export default function DashboardPage() {
  const [progress, setProgress] = useState<ProgressState>(defaultProgress);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
    setMounted(true);
    loadRemoteProgress()
      .then(() => setProgress(loadProgress()))
      .catch(() => undefined);
  }, []);

  const weakSounds = useMemo(() => {
    const scoreMap = new Map(progress.soundScores.map((score) => [score.lessonId, score.bestScore]));
    return lessons
      .filter((lesson) => (scoreMap.get(lesson.id) ?? 0) < 75)
      .slice(0, 3);
  }, [progress.soundScores]);

  const recommendation = recommendNextLesson(progress);
  const todayLesson = recommendation.lesson;

  if (!mounted) {
    return (
      <AppShell>
        <div className="md:ml-52">
          <section className="rounded-md bg-white p-5 shadow-soft">
            <p className="font-bold uppercase tracking-wide text-leaf">Loading</p>
            <h1 className="mt-2 text-3xl font-bold text-ink">KoloSpeak Coach</h1>
            <p className="mt-3 max-w-2xl text-lg leading-8 text-ink/70">
              Loading your private progress from this device.
            </p>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="md:ml-52">
        <section className="rounded-md bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-bold uppercase tracking-wide text-leaf">
                {progress.baselineCompleted ? "Today" : "Required first step"}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-ink">
                {progress.baselineCompleted ? "Practice for 10 minutes" : "Take your baseline assessment"}
              </h1>
              <p className="mt-3 max-w-2xl text-lg leading-8 text-ink/70">
                {progress.baselineCompleted
                  ? `Work on ${todayLesson.name}. Listen, read, record, and get simple feedback.`
                  : "This creates your starting report, weak sounds list, and first 7-day practice plan."}
              </p>
              {progress.baselineCompleted ? (
                <div className="mt-4 rounded-md bg-[#eef5ef] p-3 text-sm leading-6 text-ink/75">
                  <strong className="text-leaf">Why this lesson:</strong> {recommendation.reason}
                </div>
              ) : null}
            </div>
            <Link
              href={progress.baselineCompleted ? "/practice" : "/assessment"}
              className="focus-ring inline-flex h-14 items-center justify-center gap-2 rounded-md bg-leaf px-5 text-lg font-bold text-white"
            >
              {progress.baselineCompleted ? "Start Today's Practice" : "Start Assessment"}
              <ArrowRight size={20} />
            </Link>
          </div>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          <StatCard label="Current streak" value={progress.streak} detail="days in a row" />
          <StatCard label="Sessions completed" value={progress.completedSessions} />
          <StatCard
            label="Baseline"
            value={progress.baselineCompleted ? "Done" : "Needed"}
            detail={progress.baselineReport?.date ?? "Required before lessons"}
          />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-md bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <Volume2 className="text-leaf" size={22} />
              <h2 className="text-xl font-bold">Weak sounds to review</h2>
            </div>
            <div className="mt-4 space-y-3">
              {progress.baselineReport?.mainWeakSounds.length
                ? progress.baselineReport.mainWeakSounds.slice(0, 4).map((sound) => (
                    <div key={sound} className="rounded-md border border-black/5 p-4">
                      <span className="font-semibold">{sound}</span>
                    </div>
                  ))
                : weakSounds.map((lesson) => (
                    <Link
                      key={lesson.id}
                      href="/lessons"
                      className="focus-ring block rounded-md border border-black/5 p-4 hover:bg-[#eef5ef]"
                    >
                      <span className="font-semibold">{lesson.name}</span>
                      <span className="mt-1 block text-sm text-ink/65">{lesson.instruction}</span>
                    </Link>
                  ))}
            </div>
          </div>

          <div className="rounded-md bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <CalendarCheck className="text-leaf" size={22} />
              <h2 className="text-xl font-bold">Practice plan</h2>
            </div>
            <div className="mt-4 space-y-3 text-ink/75">
              <p>Focus area: {recommendation.focusArea}</p>
              <p>{recommendation.practiceWarning}</p>
              <p>{recommendation.confidenceTip}</p>
              <p>Your audio is uploaded only when you submit a final recording.</p>
              <p className="flex items-center gap-2 font-semibold text-leaf">
                <Flame size={18} />
                Keep your streak with one saved session each day.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
