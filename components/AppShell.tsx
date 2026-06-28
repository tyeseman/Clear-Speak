"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, Home, Mic2, Settings } from "lucide-react";
import { checkDueReminders } from "@/lib/reminders";

const navItems = [
  { href: "/", label: "Today", icon: Home },
  { href: "/practice", label: "Practice", icon: Mic2 },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [reminderMessage, setReminderMessage] = useState("");

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setReminderMessage(customEvent.detail);
    };
    window.addEventListener("clearspeak-reminder", handler);
    checkDueReminders();
    const interval = window.setInterval(checkDueReminders, 60 * 1000);
    return () => {
      window.removeEventListener("clearspeak-reminder", handler);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f4ee]">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#f7f4ee]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="focus-ring rounded-md">
            <span className="block text-xl font-bold text-leaf">KoloSpeak Coach</span>
            <span className="block text-sm text-ink/70">Listen. Speak. Correct. Repeat.</span>
          </Link>
          <span className="rounded-md bg-[#eef5ef] px-3 py-1 text-xs font-semibold text-leaf">
            Voice-first
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:pb-10">{children}</main>

      {reminderMessage ? (
        <div className="fixed inset-x-4 bottom-20 z-40 rounded-md bg-ink p-4 text-sm font-semibold text-white shadow-soft md:left-auto md:right-6 md:w-96">
          <div>{reminderMessage}</div>
          <button
            type="button"
            onClick={() => setReminderMessage("")}
            className="mt-3 rounded-md bg-white px-3 py-1 text-ink"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white md:hidden">
        <div className="grid grid-cols-4">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`focus-ring flex h-16 flex-col items-center justify-center gap-1 text-[10px] ${
                  active ? "text-leaf" : "text-ink/60"
                }`}
                aria-label={item.label}
              >
                <Icon size={20} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <aside className="fixed left-6 top-28 hidden w-44 md:block">
        <div className="space-y-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                  active ? "bg-leaf text-white" : "text-ink/70 hover:bg-white"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
