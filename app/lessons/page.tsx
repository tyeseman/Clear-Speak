"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PracticeCoach } from "@/components/PracticeCoach";
import { lessons } from "@/data/lessons";

export default function LessonsPage() {
  const [selectedId, setSelectedId] = useState(lessons[0].id);
  const lesson = lessons.find((item) => item.id === selectedId) ?? lessons[0];

  return (
    <AppShell>
      <div className="md:ml-52">
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-md bg-white p-4 shadow-soft">
            <h1 className="text-xl font-bold">Sound lessons</h1>
            <div className="mt-4 space-y-2">
              {lessons.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`focus-ring w-full rounded-md p-3 text-left font-semibold ${
                    selectedId === item.id ? "bg-leaf text-white" : "bg-[#f7f4ee] text-ink"
                  }`}
                >
                  {item.name}
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
