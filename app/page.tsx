"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Flame, Mic2, Volume2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { lessons } from "@/data/lessons";
import { recommendNextLesson } from "@/lib/adaptive";
import { defaultProgress, loadProgress } from "@/lib/progress";
import { loadRemoteProgress } from "@/lib/remoteProgress";
import type { ProgressState } from "@/lib/types";

export default function TodayPage() {
  const [progress, setProgress] = useState<ProgressState>(defaultProgress);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
    setMounted(true);
    loadRemoteProgress()
      .then(() => setProgress(loadProgress()))
      .catch(() => undefined);
  }, []);

  const recommendation = recommendNextLesson(progress);
  const focusSound =
    progress.coachPlanUpdate?.nextFocusArea ||
    progress.baselineReport?.mainWeakSounds[0] ||
    recommendation.focusArea ||
    lessons[0].targetSound;
  const coachNote = progress.baselineCompleted
    ? shortCoachNote(progress, focusSound)
    : "Start with your real voice so your path fits you.";
  const startHref = progress.baselineCompleted ? "/live-drill" : "/assessment";
  const startLabel = progress.baselineCompleted ? "Start practice" : "Start Smart Start";

  return (
    <AppShell>
      <div className="md:ml-52">
        <section className="grid min-h-[68vh] place-items-center">
          <div className="w-full max-w-xl rounded-md bg-white p-5 text-center shadow-soft">
            <p className="text-sm font-bold uppercase tracking-wide text-leaf">
              {mounted && progress.baselineCompleted ? "Today" : "First step"}
            </p>
            <h1 className="mt-3 text-4xl font-bold text-ink">
              {progress.baselineCompleted ? "10 minutes of clear speech" : "Smart Start"}
            </h1>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <TodayStat icon={<Volume2 size={19} />} label="Focus" value={focusSound} />
              <TodayStat icon={<Flame size={19} />} label="Streak" value={`${progress.streak} days`} />
              <TodayStat icon={<Mic2 size={19} />} label="Mode" value={progress.baselineCompleted ? "Live drill" : "Voice test"} />
            </div>
            <p className="mx-auto mt-5 max-w-md text-lg font-semibold leading-8 text-ink/75">
              {coachNote}
            </p>
            <Link
              href={startHref}
              className="focus-ring mt-6 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-leaf px-7 text-lg font-bold text-white"
            >
              {startLabel}
              <ArrowRight size={20} />
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function shortCoachNote(progress: ProgressState, focusSound: string) {
  if (progress.coachPlanUpdate?.progressSummary) return progress.coachPlanUpdate.progressSummary;
  if (progress.reviewLaterWords.length) return "Start with review words. Say each one slowly.";
  if ((progress.baselineReport?.speedScore ?? 100) < 75) return `Slow down. Today, focus on ${focusSound}.`;
  return `Listen first. Then say ${focusSound} with control.`;
}

function TodayStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f7f4ee] p-3">
      <div className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-white text-leaf">
        {icon}
      </div>
      <div className="mt-2 text-xs font-bold uppercase tracking-wide text-ink/50">{label}</div>
      <div className="mt-1 truncate font-bold text-ink">{value}</div>
    </div>
  );
}
