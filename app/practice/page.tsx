"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PracticeCoach } from "@/components/PracticeCoach";
import { lessons } from "@/data/lessons";
import { recommendNextLesson } from "@/lib/adaptive";
import { loadProgress } from "@/lib/progress";
import type { SoundLesson } from "@/lib/types";

export default function PracticePage() {
  const [lesson, setLesson] = useState<SoundLesson>(lessons[0]);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const recommendation = recommendNextLesson(loadProgress());
    setLesson(recommendation.lesson);
    setReason(recommendation.reason);
  }, []);

  return (
    <AppShell>
      <div className="md:ml-52">
        {reason ? (
          <div className="mb-5 rounded-md bg-white p-4 shadow-soft">
            <p className="font-semibold text-leaf">Adaptive next lesson</p>
            <p className="mt-1 text-ink/70">{reason}</p>
          </div>
        ) : null}
        <PracticeCoach lesson={lesson} />
      </div>
    </AppShell>
  );
}
