"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, ClipboardCheck, MessageCircle, Radio, Repeat2, Rows3 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { lessons } from "@/data/lessons";
import { recommendNextLesson } from "@/lib/adaptive";
import { loadProgress } from "@/lib/progress";
import type { ProgressState, SoundLesson } from "@/lib/types";

export default function PracticePage() {
  const [lesson, setLesson] = useState<SoundLesson>(lessons[0]);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [coachNote, setCoachNote] = useState("Listen first. Speak next. Keep it short.");

  useEffect(() => {
    const current = loadProgress();
    const recommendation = recommendNextLesson(current);
    setProgress(current);
    setLesson(recommendation.lesson);
    setCoachNote(current.coachPlanUpdate?.progressSummary || recommendation.reason);
  }, []);

  const lessonHref = `/lessons?lesson=${encodeURIComponent(lesson.id)}`;
  const reviewCount = progress?.reviewLaterWords.length ?? 0;

  const cards = [
    {
      title: "Smart Start Assessment",
      purpose: progress?.baselineCompleted ? "Refresh placement." : "Find your starting level.",
      href: "/assessment",
      icon: ClipboardCheck,
      primary: !progress?.baselineCompleted
    },
    {
      title: "Word Drill",
      purpose: "One word at a time.",
      href: "/live-drill",
      icon: Radio,
      primary: progress?.baselineCompleted
    },
    {
      title: "Sentence Drill",
      purpose: "Move the sound into speech.",
      href: lessonHref,
      icon: Rows3
    },
    {
      title: "Reading Aloud",
      purpose: "Read, record, correct.",
      href: "/reading",
      icon: BookOpen
    },
    {
      title: "Real Conversation",
      purpose: "Practice everyday answers.",
      href: "/conversation",
      icon: MessageCircle
    },
    {
      title: "Review Words",
      purpose: reviewCount ? `${reviewCount} words waiting.` : "Repeat weak words.",
      href: "/live-drill",
      icon: Repeat2
    }
  ];

  return (
    <AppShell>
      <div className="md:ml-52">
        <section className="rounded-md bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-wide text-leaf">Practice</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">Choose one drill</h1>
          <p className="mt-3 max-w-2xl text-lg font-semibold leading-8 text-ink/75">{coachNote}</p>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className={`focus-ring rounded-md p-5 shadow-soft ${
                  card.primary ? "bg-leaf text-white" : "bg-white text-ink"
                }`}
              >
                <div className={`grid h-12 w-12 place-items-center rounded-full ${
                  card.primary ? "bg-white/20 text-white" : "bg-[#eef5ef] text-leaf"
                }`}>
                  <Icon size={23} />
                </div>
                <h2 className="mt-5 text-xl font-bold">{card.title}</h2>
                <p className={`mt-2 min-h-7 font-semibold ${card.primary ? "text-white/80" : "text-ink/65"}`}>
                  {card.purpose}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 font-bold">
                  Start
                  <ArrowRight size={18} />
                </span>
              </Link>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}
