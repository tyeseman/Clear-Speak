import { loadProgress, saveProgress, todayKey } from "@/lib/progress";
import type { PracticeReminder, ProgressState } from "@/lib/types";

export function checkDueReminders() {
  if (typeof window === "undefined") return;
  const progress = loadProgress();
  const now = new Date();
  const today = todayKey(now);
  let changed = false;

  const reminders = progress.reminders.map((reminder) => {
    if (!isReminderDue(reminder, progress, now, today)) return reminder;

    notify(reminderMessage(reminder));
    changed = true;
    return { ...reminder, lastFiredDateTime: now.toISOString() };
  });

  if (changed) {
    saveProgress({ ...progress, reminders });
  }
}

function isReminderDue(
  reminder: PracticeReminder,
  progress: ProgressState,
  now: Date,
  today: string
) {
  if (!reminder.enabled) return false;
  if (reminder.kind === "reading" && progress.lastReadingDate === today) return false;
  if (reminder.kind !== "reading" && progress.lastPracticedDate === today) return false;

  const [hour, minute] = reminder.time.split(":").map(Number);
  const scheduled = new Date(now);
  scheduled.setHours(hour, minute, 0, 0);
  if (now < scheduled) return false;

  if (!reminder.lastFiredDateTime) return true;
  const last = new Date(reminder.lastFiredDateTime);
  if (todayKey(last) !== today) return true;
  return now.getTime() - last.getTime() >= reminder.followUpMinutes * 60 * 1000;
}

function reminderMessage(reminder: PracticeReminder) {
  if (reminder.kind === "reading") {
    return "Take 5 minutes to read today.";
  }

  if (reminder.adaptive) {
    return "Time for your KoloSpeak practice.";
  }

  return "Time for your KoloSpeak practice.";
}

function notify(message: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("KoloSpeak Coach", { body: message });
    return;
  }
  window.dispatchEvent(new CustomEvent("clearspeak-reminder", { detail: message }));
}
