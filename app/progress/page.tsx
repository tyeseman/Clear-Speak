"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { lessons } from "@/data/lessons";
import { buildWeeklyReview, soundMastery } from "@/lib/coachInsights";
import { defaultProgress, loadProgress, saveProgress } from "@/lib/progress";
import { loadRemoteProgress, saveRemoteProgress, updateRemoteCoachPlan } from "@/lib/remoteProgress";
import type { ProgressState } from "@/lib/types";

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressState>(defaultProgress);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [planMessage, setPlanMessage] = useState("");

  useEffect(() => {
    setProgress(loadProgress());
    loadRemoteProgress()
      .then(() => setProgress(loadProgress()))
      .catch(() => undefined);
  }, []);

  async function updatePlan() {
    setUpdatingPlan(true);
    setPlanMessage("");
    const current = loadProgress();
    const response = await updateRemoteCoachPlan({ trigger: "manual", progress: current });
    if (response.ok && response.update) {
      const next = {
        ...current,
        coachPlanUpdate: response.update,
        learnerProfile: {
          ...current.learnerProfile,
          focusArea: response.update.nextFocusArea,
          recommendedNextLessons: response.update.recommendedLessons,
          nextLessonReason: response.update.reason,
          confidenceTip: response.update.progressSummary
        }
      };
      saveProgress(next);
      setProgress(next);
      saveRemoteProgress(next).catch(() => undefined);
      setPlanMessage(response.update.reason);
    } else {
      setPlanMessage("Could not update the plan right now.");
    }
    setUpdatingPlan(false);
  }

  const averageReading = progress.readingScores.length
    ? Math.round(
        progress.readingScores.reduce((total, score) => total + score, 0) /
          progress.readingScores.length
      )
    : 0;

  const averageSpeed = progress.speakingSpeeds.length
    ? Math.round(
        progress.speakingSpeeds.reduce((total, speed) => total + speed, 0) /
          progress.speakingSpeeds.length
      )
    : 0;

  const averageAccuracy = progress.readingAccuracies.length
    ? Math.round(
        progress.readingAccuracies.reduce((total, score) => total + score, 0) /
          progress.readingAccuracies.length
      )
    : 0;

  const weeklyImprovement = progress.readingScores.length >= 2
    ? progress.readingScores[progress.readingScores.length - 1] - progress.readingScores[0]
    : 0;

  const missedWords = useMemo(
    () =>
      Object.entries(progress.missedWords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12),
    [progress.missedWords]
  );
  const weeklyReview = buildWeeklyReview(progress);
  const masteryMap = soundMastery(progress);

  return (
    <AppShell>
      <div className="md:ml-52">
        <h1 className="text-3xl font-bold">Progress</h1>
        <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Adaptive coach direction</h2>
              <p className="mt-2 max-w-3xl leading-7 text-ink/70">
                {progress.coachPlanUpdate?.progressSummary ??
                  "Use saved assessment, lessons, reading, conversation, and live drill data to update the next focus."}
              </p>
              <p className="mt-2 font-semibold text-leaf">
                {progress.coachPlanUpdate
                  ? `Next: ${progress.coachPlanUpdate.nextFocusArea}`
                  : `Current focus: ${progress.learnerProfile.focusArea}`}
              </p>
            </div>
            <button
              type="button"
              onClick={updatePlan}
              disabled={updatingPlan}
              className="focus-ring h-11 rounded-md bg-leaf px-4 font-semibold text-white disabled:opacity-60"
            >
              {updatingPlan ? "Updating" : "Update My Plan"}
            </button>
          </div>
          {planMessage ? <p className="mt-3 font-semibold text-leaf">{planMessage}</p> : null}
        </section>
        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          <StatCard label="Completed sessions" value={progress.completedSessions} />
          <StatCard label="Current streak" value={progress.streak} detail="days" />
          <StatCard label="Average score" value={averageReading || "New"} />
        </section>

        <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Weekly review</h2>
              <p className="mt-2 leading-7 text-ink/70">{weeklyReview.summary}</p>
              <p className="mt-2 font-semibold text-leaf">{weeklyReview.levelNote}</p>
            </div>
            <div className="rounded-md bg-[#eef5ef] px-3 py-2 text-sm font-semibold text-leaf">
              Next: {weeklyReview.nextFocus}
            </div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-md bg-[#f7f4ee] p-4">
              <div className="font-semibold">Improved</div>
              <div className="mt-2 space-y-2">
                {weeklyReview.improved.map((item) => (
                  <p key={item} className="text-sm leading-6 text-ink/70">{item}</p>
                ))}
              </div>
            </div>
            <div className="rounded-md bg-[#f7f4ee] p-4">
              <div className="font-semibold">Still needs work</div>
              <div className="mt-2 space-y-2">
                {weeklyReview.stillNeedsWork.map((item) => (
                  <p key={item} className="text-sm leading-6 text-ink/70">{item}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {progress.baselineReport ? (
          <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">Baseline and before-after</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <StatCard label="Baseline clarity" value={progress.baselineReport.overallClarityScore} />
              <StatCard label="Baseline reading" value={progress.baselineReport.readingScore} />
              <StatCard label="Current accuracy" value={averageAccuracy || "New"} />
              <StatCard label="Current speed" value={averageSpeed || "New"} detail={averageSpeed ? "WPM" : ""} />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-md bg-[#f7f4ee] p-4">
                <div className="font-semibold">Before</div>
                <p className="mt-2 text-sm leading-7 text-ink/70">{progress.baselineReport.beforeText}</p>
              </div>
              <div className="rounded-md bg-[#f7f4ee] p-4">
                <div className="font-semibold">After</div>
                <p className="mt-2 text-sm leading-7 text-ink/70">
                  {progress.lessonAttempts.at(-1)?.whatImproved ?? "Complete a daily lesson to compare progress."}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">Sound scores</h2>
          <div className="mt-4 space-y-3">
            {lessons.map((lesson) => {
              const score = progress.soundScores.find((item) => item.lessonId === lesson.id);
              const width = score?.bestScore ?? 0;
              return (
                <div key={lesson.id}>
                  <div className="flex justify-between gap-3 text-sm font-semibold">
                    <span>{lesson.name}</span>
                    <span>{score ? `${score.bestScore}/100` : "Not practiced"}</span>
                  </div>
                  <div className="mt-2 h-3 rounded-full bg-[#edf0eb]">
                    <div
                      className="h-3 rounded-full bg-leaf"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">Sound mastery map</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {masteryMap.map(({ lesson, value, status }) => (
              <div key={lesson.id} className="rounded-md border border-black/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{lesson.name}</div>
                    <div className="mt-1 text-sm text-ink/60">{lesson.targetSound}</div>
                  </div>
                  <span className="rounded-md bg-[#eef5ef] px-2 py-1 text-xs font-bold text-leaf">
                    {status}
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-[#edf0eb]">
                  <div className="h-2 rounded-full bg-leaf" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-md bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">Words missed often</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {missedWords.length ? (
                missedWords.map(([word, count]) => (
                  <span key={word} className="rounded-md bg-warm/50 px-3 py-2 text-sm font-semibold">
                    {word} ({count})
                  </span>
                ))
              ) : (
                <p className="text-ink/65">No missed words saved yet.</p>
              )}
            </div>
          </div>
          <div className="rounded-md bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">Weekly improvement</h2>
            <p className="mt-3 text-4xl font-bold text-leaf">
              {weeklyImprovement > 0 ? "+" : ""}
              {weeklyImprovement}
            </p>
            <p className="mt-2 text-ink/65">
              Based on the first and latest saved scores on this device.
            </p>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="rounded-md bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">Skipped words</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(progress.skippedWords).slice(0, 10).map(([word, count]) => (
                <span key={word} className="rounded-md bg-warm/50 px-3 py-2 text-sm font-semibold">
                  {word} ({count})
                </span>
              ))}
              {!Object.keys(progress.skippedWords).length ? <p className="text-ink/65">None saved yet.</p> : null}
            </div>
          </div>
          <StatCard label="Final consonant issues" value={progress.finalConsonantIssues} />
          <StatCard label="Completed lessons" value={progress.completedLessons.length} />
        </section>

        <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">Conversation transfer</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatCard label="Conversation sessions" value={progress.conversationSessions.length} />
            <StatCard
              label="Latest conversation"
              value={progress.conversationSessions.at(-1)?.score ?? "New"}
            />
            <StatCard
              label="Latest speed"
              value={progress.conversationSessions.at(-1)?.feedback.speakingSpeedWpm ?? "New"}
              detail={progress.conversationSessions.at(-1)?.feedback.speakingSpeedWpm ? "WPM" : ""}
            />
          </div>
          <div className="mt-5 space-y-3">
            {progress.conversationSessions.slice(-5).reverse().map((session) => (
              <div key={session.id} className="rounded-md border border-black/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{session.date}</span>
                  <span className="text-sm text-ink/60">{session.score}/100</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink/70">{session.prompt}</p>
              </div>
            ))}
            {!progress.conversationSessions.length ? (
              <p className="text-ink/65">No conversation sessions saved yet.</p>
            ) : null}
          </div>
        </section>

        <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">Reading habit</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <StatCard label="Reading streak" value={progress.readingStreak} detail="days" />
            <StatCard label="Reading sessions" value={progress.readingSessions.length} />
            <StatCard
              label="Favorite topics"
              value={progress.readingPreferences.topics.length}
            />
            <StatCard
              label="Favorite passages"
              value={progress.readingPreferences.favoritePassages.length}
            />
          </div>
          <div className="mt-5 space-y-3">
            {progress.readingSessions.slice(-5).reverse().map((session) => (
              <div key={session.id} className="rounded-md border border-black/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{session.topic}</span>
                  <span className="text-sm text-ink/60">{session.date}</span>
                </div>
                <div className="mt-2 text-sm text-ink/70">
                  Clarity {session.score}% - Comprehension {session.comprehensionScore}%
                </div>
              </div>
            ))}
            {!progress.readingSessions.length ? (
              <p className="text-ink/65">No reading sessions saved yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
