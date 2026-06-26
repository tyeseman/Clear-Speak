"use client";

import { useEffect, useState } from "react";
import { Phone, Save } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Recorder } from "@/components/Recorder";
import type { FeedbackResult, ProgressState } from "@/lib/types";
import {
  canUseApi,
  getStoredPasscode,
  getStoredUserEmail,
  loadProgress,
  noteApiUse,
  saveConversationSession
} from "@/lib/progress";
import { saveRemoteConversationResult, saveRemoteProgress } from "@/lib/remoteProgress";

const prompts = [
  {
    id: "phone-call",
    label: "Phone call",
    text: "Call a customer and explain that the appointment time changed. Speak for 30 seconds with clear pauses."
  },
  {
    id: "client",
    label: "Client",
    text: "A client does not understand the invoice. Explain the total, the due date, and the next step."
  },
  {
    id: "vendor",
    label: "Vendor",
    text: "Ask a vendor to confirm the delivery address, invoice number, and pickup time."
  },
  {
    id: "church",
    label: "Church/community",
    text: "Invite someone to a community event and explain when, where, and why they should come."
  },
  {
    id: "business",
    label: "Business explanation",
    text: "Explain what your business does, who you help, and what the customer should do next."
  }
];

export default function ConversationPage() {
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState(prompts[0]);
  const [transcription, setTranscription] = useState("");
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  async function submitConversation(blob: Blob, durationSeconds: number) {
    if (!canUseApi("transcribe", 30) || !canUseApi("feedback", 30)) {
      setMessage("Daily feedback limit reached. You can still practice the prompt.");
      return;
    }

    setBusy(true);
    setMessage("");
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.set("audio", blob, "conversation.webm");
      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "x-clearspeak-passcode": getStoredPasscode(),
          "x-clearspeak-email": getStoredUserEmail()
        },
        body: formData
      });
      if (!transcribeResponse.ok) throw new Error("Transcription failed");
      noteApiUse("transcribe", "Conversation transfer transcription");
      const transcribeData = (await transcribeResponse.json()) as { text: string };
      setTranscription(transcribeData.text);

      const feedbackResponse = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-clearspeak-passcode": getStoredPasscode(),
          "x-clearspeak-email": getStoredUserEmail()
        },
        body: JSON.stringify({
          lessonId: `conversation-${selectedPrompt.id}`,
          targetSound: "real conversation clarity, speed control, pauses, dropped endings, blended words",
          expectedText: selectedPrompt.text,
          transcribedText: transcribeData.text,
          durationSeconds
        })
      });
      if (!feedbackResponse.ok) throw new Error("Feedback failed");
      noteApiUse("feedback", "Conversation transfer feedback");
      const feedbackData = (await feedbackResponse.json()) as FeedbackResult;
      setFeedback(feedbackData);

      const session = {
        id: `conversation-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        prompt: selectedPrompt.text,
        transcript: transcribeData.text,
        score: feedbackData.score,
        speedScore: feedbackData.spokeTooFast ? Math.max(40, feedbackData.score - 15) : feedbackData.score,
        clarityScore: feedbackData.readingAccuracy ?? feedbackData.score,
        feedback: feedbackData
      };
      saveConversationSession(session);
      const nextProgress = loadProgress();
      setProgress(nextProgress);
      setSaveStatus("saving");
      const [progressSave, conversationSave] = await Promise.all([
        saveRemoteProgress(nextProgress),
        saveRemoteConversationResult(session)
      ]);
      const saved = progressSave.ok && conversationSave.ok;
      setSaveStatus(saved ? "saved" : "failed");
      setMessage(saved ? "Conversation practice saved." : "Practice completed, but database save failed.");
    } catch {
      setMessage("We could not check that conversation. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="md:ml-52">
        <section className="rounded-md bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-leaf">
            <Phone size={24} />
            <p className="font-bold uppercase tracking-wide">Real conversation transfer</p>
          </div>
          <h1 className="mt-2 text-3xl font-bold">Train clear speech under pressure</h1>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-ink/70">
            Practice short real-life answers with pauses, speed control, complete endings,
            and clear business diction while keeping your natural voice.
          </p>
        </section>

        <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">Choose a prompt</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {prompts.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                onClick={() => setSelectedPrompt(prompt)}
                className={`focus-ring rounded-md border p-4 text-left ${
                  selectedPrompt.id === prompt.id ? "border-leaf bg-[#eef5ef]" : "border-black/10"
                }`}
              >
                <span className="font-semibold text-leaf">{prompt.label}</span>
                <span className="mt-2 block leading-7 text-ink/75">{prompt.text}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">30-second speaking challenge</h2>
          <p className="mt-3 rounded-md bg-[#f7f4ee] p-4 text-lg leading-8">
            {selectedPrompt.text}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <MiniStat label="Target" value="30 sec" />
            <MiniStat label="Pace" value="Steady" />
            <MiniStat label="Pauses" value="2+" />
            <MiniStat label="Endings" value="Finish" />
          </div>
          <div className="mt-5">
            <Recorder onSubmit={submitConversation} />
            {busy ? <p className="mt-3 text-ink/65">Checking conversation clarity...</p> : null}
          </div>
        </section>

        {feedback ? (
          <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">Conversation feedback</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <MiniStat label="Score" value={`${feedback.score}`} />
              <MiniStat label="Speed" value={`${feedback.speakingSpeedWpm ?? 0} WPM`} />
              <MiniStat label="Clarity" value={`${feedback.readingAccuracy ?? feedback.score}%`} />
              <MiniStat label="Saved" value={saveStatus === "saved" ? "Yes" : saveStatus === "failed" ? "No" : "Saving"} />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <FeedbackBlock title="Main correction" text={feedback.mainCorrection ?? feedback.mainIssue} />
              <FeedbackBlock title="Speed control" text={feedback.speedTip ?? "Pause before important words."} />
              <FeedbackBlock title="Mouth/tongue" text={`${feedback.mouthTip} ${feedback.tongueTip ?? ""}`} />
              <FeedbackBlock title="Retry" text={feedback.retryText ?? feedback.tryAgainSentence} />
            </div>
            <div className="mt-4 rounded-md bg-[#f7f4ee] p-4">
              <div className="font-semibold">Transcript</div>
              <p className="mt-2 leading-7 text-ink/70">{transcription}</p>
            </div>
          </section>
        ) : null}

        {message ? <p className="mt-4 font-semibold text-leaf">{message}</p> : null}

        {progress?.conversationSessions.length ? (
          <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <Save size={20} className="text-leaf" />
              <h2 className="text-xl font-bold">Recent conversation sessions</h2>
            </div>
            <div className="mt-4 space-y-3">
              {progress.conversationSessions.slice(-3).reverse().map((session) => (
                <div key={session.id} className="rounded-md border border-black/10 p-4">
                  <div className="flex flex-wrap justify-between gap-2 font-semibold">
                    <span>{session.date}</span>
                    <span>{session.score}/100</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink/70">{session.prompt}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f7f4ee] p-3">
      <div className="text-sm font-semibold text-ink/60">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function FeedbackBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md bg-[#f7f4ee] p-4">
      <div className="font-semibold">{title}</div>
      <p className="mt-2 leading-7 text-ink/75">{text}</p>
    </div>
  );
}
