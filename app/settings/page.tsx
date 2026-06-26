"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Plus, Save, SlidersHorizontal, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { defaultProgress, getProgressKey, loadProgress, saveProgress, todayKey } from "@/lib/progress";
import { resetRemoteProgress, saveRemoteProgress, saveRemoteSettings } from "@/lib/remoteProgress";
import type { ProgressState } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressState>(defaultProgress);
  const [message, setMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setMessage("This browser does not support notifications. We will show in-app reminders.");
      return;
    }
    const permission = await Notification.requestPermission();
    const next = { ...progress, notificationsEnabled: permission === "granted" };
    setProgress(next);
    saveProgress(next);
    const saved = await saveRemoteSettings(next);
    setMessage(
      saved.ok
        ? permission === "granted"
          ? "Notifications are enabled for this browser."
          : "Notifications were not enabled. In-app reminder text will still show."
        : "Practice completed, but progress was not saved. Please try again."
    );
  }

  async function saveReminder() {
    saveProgress(progress);
    const saved = await saveRemoteSettings(progress);
    setMessage(saved.ok ? "Reminder settings saved." : "Practice completed, but progress was not saved. Please try again.");
  }

  function updateReminder(
    id: string,
    patch: Partial<ProgressState["reminders"][number]>
  ) {
    setProgress({
      ...progress,
      reminders: progress.reminders.map((reminder) =>
        reminder.id === id ? { ...reminder, ...patch } : reminder
      )
    });
  }

  function addReminder() {
    setProgress({
      ...progress,
      reminders: [
        ...progress.reminders,
        {
          id: `custom-${Date.now()}`,
          label: "Custom reminder",
          time: "18:00",
          enabled: true,
          kind: "lesson",
          adaptive: true,
          followUpMinutes: 60
        }
      ]
    });
  }

  async function updateProgress(next: ProgressState, successMessage = "Settings saved.") {
    setProgress(next);
    saveProgress(next);
    setMessage("Saving");
    const [progressSaved, settingsSaved] = await Promise.all([
      saveRemoteProgress(next),
      saveRemoteSettings(next)
    ]);
    setMessage(
      progressSaved.ok && settingsSaved.ok
        ? successMessage
        : "Practice completed, but progress was not saved. Please try again."
    );
  }

  async function clearAppCache() {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.update()));
    }

    setMessage("App cache cleared. Your saved progress was not deleted. Reload the page if needed.");
  }

  async function resetAllProgress() {
    setResetting(true);
    setMessage("Resetting progress");
    const freshProgress: ProgressState = {
      ...defaultProgress,
      reminders: defaultProgress.reminders.map((reminder) => ({ ...reminder })),
      apiUsage: {},
      apiUsageEvents: [],
      liveMinutesUsed: {}
    };

    try {
      window.localStorage.setItem(getProgressKey(), JSON.stringify(freshProgress));
      setProgress(freshProgress);
      const reset = await resetRemoteProgress(freshProgress);
      if (!reset.ok) {
        await saveRemoteProgress(freshProgress);
      }
      setMessage(
        reset.ok
          ? "Progress reset. Taking you back to the beginning."
          : "Local progress reset. Remote reset could not be confirmed, but the starting progress was saved."
      );
      setConfirmReset(false);
      window.setTimeout(() => router.push("/"), 900);
    } finally {
      setResetting(false);
    }
  }

  const todayPrefix = `${todayKey()}:`;
  const aiCallsToday = Object.entries(progress.apiUsage)
    .filter(([key]) => key.startsWith(todayPrefix))
    .reduce((total, [, count]) => total + count, 0);
  const lastAiEvent = progress.apiUsageEvents.at(-1);

  return (
    <AppShell>
      <div className="md:ml-52">
        <h1 className="text-3xl font-bold">Settings</h1>
        <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <Bell className="text-leaf" size={22} />
            <h2 className="text-xl font-bold">Daily reminder</h2>
          </div>
          <label className="mt-5 block max-w-xs">
            <span className="font-semibold text-ink/75">Practice time</span>
            <input
              type="time"
              value={progress.reminderTime}
              onChange={(event) =>
                setProgress({ ...progress, reminderTime: event.target.value })
              }
              className="focus-ring mt-2 h-12 w-full rounded-md border border-black/10 bg-white px-3"
            />
          </label>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={enableNotifications}
              className="focus-ring inline-flex h-12 items-center gap-2 rounded-md bg-leaf px-4 font-semibold text-white"
            >
              <Bell size={18} />
              Enable notifications
            </button>
            <button
              type="button"
              onClick={saveReminder}
              className="focus-ring inline-flex h-12 items-center gap-2 rounded-md border border-black/10 bg-white px-4 font-semibold text-ink"
            >
              <Save size={18} />
              Save
            </button>
          </div>
          <div className="mt-6 space-y-4">
            {progress.reminders.map((reminder) => (
              <div key={reminder.id} className="rounded-md border border-black/10 p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_130px_140px]">
                  <label>
                    <span className="font-semibold text-ink/75">Label</span>
                    <input
                      value={reminder.label}
                      onChange={(event) =>
                        updateReminder(reminder.id, { label: event.target.value })
                      }
                      className="focus-ring mt-2 h-11 w-full rounded-md border border-black/10 px-3"
                    />
                  </label>
                  <label>
                    <span className="font-semibold text-ink/75">Time</span>
                    <input
                      type="time"
                      value={reminder.time}
                      onChange={(event) =>
                        updateReminder(reminder.id, { time: event.target.value })
                      }
                      className="focus-ring mt-2 h-11 w-full rounded-md border border-black/10 px-3"
                    />
                  </label>
                  <label>
                    <span className="font-semibold text-ink/75">Follow-up</span>
                    <select
                      value={reminder.followUpMinutes}
                      onChange={(event) =>
                        updateReminder(reminder.id, {
                          followUpMinutes: Number(event.target.value)
                        })
                      }
                      className="focus-ring mt-2 h-11 w-full rounded-md border border-black/10 px-3"
                    >
                      <option value={30}>30 min</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                      <option value={240}>4 hours</option>
                    </select>
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={reminder.enabled}
                      onChange={(event) =>
                        updateReminder(reminder.id, { enabled: event.target.checked })
                      }
                      className="h-5 w-5"
                    />
                    Enabled
                  </label>
                  <label className="flex items-center gap-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={reminder.adaptive}
                      onChange={(event) =>
                        updateReminder(reminder.id, { adaptive: event.target.checked })
                      }
                      className="h-5 w-5"
                    />
                    Base message on my weak area
                  </label>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addReminder}
            className="focus-ring mt-4 inline-flex h-11 items-center gap-2 rounded-md border border-black/10 bg-white px-4 font-semibold text-ink"
          >
            <Plus size={18} />
            Add reminder
          </button>
          <p className="mt-4 text-ink/70">
            Reminder time is saved locally. Browser notifications depend on the phone
            and browser permission settings. Follow-ups repeat while a lesson or
            reading session is still incomplete for today.
          </p>
          <p className="mt-2 text-sm text-ink/60">
            Reminder sounds depend on your phone notification settings.
          </p>
          {message ? <p className="mt-3 font-semibold text-leaf">{message}</p> : null}
        </section>

        <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="text-leaf" size={22} />
            <h2 className="text-xl font-bold">Coaching preferences</h2>
          </div>
          <label className="mt-5 block">
            <span className="font-semibold text-ink/75">Personal goal</span>
            <input
              value={progress.learnerProfile.goal}
              onChange={(event) =>
                setProgress({
                  ...progress,
                  learnerProfile: {
                    ...progress.learnerProfile,
                    goal: event.target.value
                  }
                })
              }
              className="focus-ring mt-2 h-12 w-full rounded-md border border-black/10 px-3"
            />
          </label>
          <label className="mt-5 block max-w-sm">
            <span className="font-semibold text-ink/75">
              Confidence rating: {progress.learnerProfile.confidenceRating}/5
            </span>
            <input
              type="range"
              min="1"
              max="5"
              value={progress.learnerProfile.confidenceRating}
              onChange={(event) =>
                setProgress({
                  ...progress,
                  learnerProfile: {
                    ...progress.learnerProfile,
                    confidenceRating: Number(event.target.value)
                  }
                })
              }
              className="mt-3 w-full"
            />
          </label>
          <button
            type="button"
            onClick={() => updateProgress(progress, "Coaching preferences saved.")}
            className="focus-ring mt-5 inline-flex h-12 items-center gap-2 rounded-md bg-leaf px-4 font-semibold text-white"
          >
            <Save size={18} />
            Save coaching preferences
          </button>
        </section>

        <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">Usage Control</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-[#f7f4ee] p-4">
              <div className="text-sm font-semibold text-ink/60">Coach checks today</div>
              <div className="mt-1 text-3xl font-bold text-leaf">{aiCallsToday}</div>
            </div>
            <div className="rounded-md bg-[#f7f4ee] p-4">
              <div className="text-sm font-semibold text-ink/60">Last checked feature</div>
              <div className="mt-1 font-bold">{lastAiEvent?.feature ?? "None today"}</div>
              {lastAiEvent ? <div className="mt-1 text-sm text-ink/60">{lastAiEvent.reason}</div> : null}
            </div>
            <div className="rounded-md bg-[#f7f4ee] p-4">
              <div className="text-sm font-semibold text-ink/60">Cost-saving mode</div>
              <div className="mt-1 font-bold">{progress.costSavingMode ? "On" : "Off"}</div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-4 rounded-md border border-black/10 p-4">
              <span>
                <span className="block font-semibold">Cost-saving mode</span>
                <span className="block text-sm text-ink/60">Keep coach checks limited to submit actions.</span>
              </span>
              <input
                type="checkbox"
                checked={progress.costSavingMode}
                onChange={(event) =>
                  updateProgress({ ...progress, costSavingMode: event.target.checked })
                }
                className="h-5 w-5"
              />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-md border border-black/10 p-4">
              <span>
                <span className="block font-semibold">High-quality voice</span>
                <span className="block text-sm text-ink/60">Show the optional premium voice button.</span>
              </span>
              <input
                type="checkbox"
                checked={progress.highQualityVoice}
                onChange={(event) =>
                  updateProgress({ ...progress, highQualityVoice: event.target.checked })
                }
                className="h-5 w-5"
              />
            </label>
          </div>
          <div className="mt-5 rounded-md bg-[#f7f4ee] p-4">
            <div className="font-semibold">Recent coach checks</div>
            <div className="mt-3 space-y-2">
              {progress.apiUsageEvents.slice(-5).reverse().map((event) => (
                <div key={`${event.date}-${event.feature}`} className="text-sm text-ink/70">
                  {new Date(event.date).toLocaleString()} - {event.feature} - {event.success ? "success" : "failed"}
                </div>
              ))}
              {!progress.apiUsageEvents.length ? <p className="text-sm text-ink/60">No coach checks logged yet.</p> : null}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">Diagnostics</h2>
          <p className="mt-3 leading-7 text-ink/70">
            Check database, OpenAI setup, microphone support, live speech detection,
            browser voice, and local progress state before a full test.
          </p>
          <Link
            href="/diagnostics"
            className="focus-ring mt-5 inline-flex h-12 items-center rounded-md bg-leaf px-4 font-semibold text-white"
          >
            Open diagnostics
          </Link>
        </section>

        <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">App cache</h2>
          <p className="mt-3 leading-7 text-ink/70">
            Clear cached app files if the normal browser shows a blank screen after an update.
            This does not erase your saved progress.
          </p>
          <button
            type="button"
            onClick={clearAppCache}
            className="focus-ring mt-5 inline-flex h-12 items-center gap-2 rounded-md border border-black/10 bg-white px-4 font-semibold text-ink"
          >
            <Trash2 size={18} />
            Clear app cache
          </button>
        </section>

        <section className="mt-5 rounded-md border border-coral/30 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-coral">Restart app progress</h2>
          <p className="mt-3 leading-7 text-ink/70">
            This resets Smart Start, lessons, reading, live drills, word banks,
            conversation practice, streaks, scores, and saved progress for this user.
            You will return to the beginning after login.
          </p>
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="focus-ring mt-5 inline-flex h-12 items-center gap-2 rounded-md border border-coral/40 bg-white px-4 font-semibold text-coral"
            >
              <Trash2 size={18} />
              Reset all progress
            </button>
          ) : (
            <div className="mt-5 rounded-md bg-warm/50 p-4">
              <p className="font-semibold text-ink">
                Are you sure you want to reset? All of your progress will be erased,
                and the app will take you back to the beginning.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={resetAllProgress}
                  disabled={resetting}
                  className="focus-ring inline-flex h-11 items-center gap-2 rounded-md bg-coral px-4 font-semibold text-white disabled:opacity-60"
                >
                  <Trash2 size={17} />
                  {resetting ? "Resetting" : "Yes, erase my progress"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  disabled={resetting}
                  className="focus-ring h-11 rounded-md border border-black/10 bg-white px-4 font-semibold text-ink disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">Privacy</h2>
          <p className="mt-3 leading-7 text-ink/70">
            Lesson progress stays in this browser. Recordings are kept local until you
            submit one for transcription and feedback.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
