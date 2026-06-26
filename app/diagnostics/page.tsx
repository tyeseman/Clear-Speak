"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getStoredPasscode, getStoredUserEmail, loadProgress } from "@/lib/progress";

type Health = {
  database: string;
  openai: string;
  allowedEmails: string;
  appSessionSecret: string;
};

export default function DiagnosticsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [browser, setBrowser] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Checking app health...");

  useEffect(() => {
    setBrowser({
      microphone: typeof navigator.mediaDevices?.getUserMedia === "function" ? "available" : "not available",
      speechRecognition: (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        ? "available"
        : "not available",
      speechSynthesis: "speechSynthesis" in window ? "available" : "not available",
      serviceWorker: "serviceWorker" in navigator ? "available" : "not available",
      localProgress: loadProgress().baselineCompleted ? "Smart Start complete" : "at beginning"
    });
    checkHealth();
  }, []);

  async function checkHealth() {
    setMessage("Checking app health...");
    try {
      const response = await fetch("/api/health", {
        method: "GET",
        headers: {
          "x-clearspeak-passcode": getStoredPasscode(),
          "x-clearspeak-email": getStoredUserEmail()
        },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Health check failed");
      const body = (await response.json()) as Health;
      setHealth(body);
      setMessage("Health check complete.");
    } catch {
      setMessage("Could not complete the server health check.");
    }
  }

  return (
    <AppShell>
      <div className="md:ml-52">
        <section className="rounded-md bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-leaf">
            <Activity size={24} />
            <p className="font-bold uppercase tracking-wide">Diagnostics</p>
          </div>
          <h1 className="mt-2 text-3xl font-bold">App health check</h1>
          <p className="mt-3 max-w-3xl leading-8 text-ink/70">
            Use this before testing a full session to confirm the database, OpenAI
            setup, browser audio, and saved progress state are ready.
          </p>
          <button
            type="button"
            onClick={checkHealth}
            className="focus-ring mt-4 h-11 rounded-md bg-leaf px-4 font-semibold text-white"
          >
            Run health check
          </button>
          <p className="mt-3 font-semibold text-leaf">{message}</p>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <StatusPanel
            title="Server"
            items={[
              ["Database", health?.database ?? "checking"],
              ["OpenAI key", health?.openai ?? "checking"],
              ["Allowed emails", health?.allowedEmails ?? "checking"],
              ["Session secret", health?.appSessionSecret ?? "checking"]
            ]}
          />
          <StatusPanel
            title="Browser"
            items={[
              ["Microphone API", browser.microphone ?? "checking"],
              ["Live speech detection", browser.speechRecognition ?? "checking"],
              ["Browser voice", browser.speechSynthesis ?? "checking"],
              ["Service worker", browser.serviceWorker ?? "checking"],
              ["Local progress", browser.localProgress ?? "checking"]
            ]}
          />
        </section>
      </div>
    </AppShell>
  );
}

function StatusPanel({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <section className="rounded-md bg-white p-5 shadow-soft">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map(([label, value]) => {
          const ok = ["connected", "configured", "available", "default", "Smart Start complete", "at beginning"].includes(value);
          return (
            <div key={label} className="flex items-center justify-between gap-3 rounded-md bg-[#f7f4ee] p-3">
              <div>
                <div className="font-semibold">{label}</div>
                <div className="mt-1 text-sm text-ink/60">{value}</div>
              </div>
              {ok ? <CheckCircle2 className="text-leaf" size={20} /> : <XCircle className="text-coral" size={20} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}
