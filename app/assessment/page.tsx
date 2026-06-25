"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Recorder } from "@/components/Recorder";
import { baselineAssessment, baselineExpectedText } from "@/data/assessment";
import type { AssessmentReport, ProgressState } from "@/lib/types";
import {
  canUseApi,
  findMissedWords,
  getStoredPasscode,
  getStoredUserEmail,
  loadProgress,
  noteApiUse,
  saveBaselineReport,
  saveProgress
} from "@/lib/progress";

export default function AssessmentPage() {
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [transcription, setTranscription] = useState("");
  const [report, setReport] = useState<AssessmentReport | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  async function submitAssessment(blob: Blob, durationSeconds: number) {
    if (!canUseApi("assessment", 5) || !canUseApi("transcribe", 30)) {
      setError("Assessment limit reached for today.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const expectedText = baselineExpectedText();
      const formData = new FormData();
      formData.set("audio", blob, "baseline.webm");
      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "x-clearspeak-passcode": getStoredPasscode(),
          "x-clearspeak-email": getStoredUserEmail()
        },
        body: formData
      });
      if (!transcribeResponse.ok) throw new Error("Transcription failed");
      noteApiUse("transcribe");
      const transcribeData = (await transcribeResponse.json()) as { text: string };
      setTranscription(transcribeData.text);

      const missedWords = findMissedWords(expectedText, transcribeData.text);
      const assessmentResponse = await fetch("/api/assessment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-clearspeak-passcode": getStoredPasscode(),
          "x-clearspeak-email": getStoredUserEmail()
        },
        body: JSON.stringify({
          expectedText,
          transcribedText: transcribeData.text,
          durationSeconds,
          missedWords
        })
      });
      if (!assessmentResponse.ok) throw new Error("Assessment failed");
      noteApiUse("assessment");
      const assessmentReport = (await assessmentResponse.json()) as AssessmentReport;
      setReport(assessmentReport);
      const current = loadProgress();
      const next = saveBaselineReport(current, {
        date: new Date().toISOString().slice(0, 10),
        ...assessmentReport,
        beforeText: transcribeData.text
      });
      saveProgress(next);
      setProgress(next);
    } catch {
      setError("We could not complete the assessment. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="md:ml-52">
        <section className="rounded-md bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-leaf">
            <ClipboardCheck size={24} />
            <p className="font-bold uppercase tracking-wide">Required starting assessment</p>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-ink">Baseline clarity check</h1>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-ink/70">
            Record the full list one time. This creates your starting report and first
            7-day practice plan. Coach checks run only after you submit.
          </p>
          {progress?.baselineCompleted ? (
            <p className="mt-4 rounded-md bg-[#eef5ef] p-3 font-semibold text-leaf">
              Baseline completed. You can retake it later as a progress assessment.
            </p>
          ) : null}
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-md bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">20 common words</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {baselineAssessment.words.map((word) => (
                <span key={word} className="rounded-md bg-skysoft px-3 py-2 font-semibold">
                  {word}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-md bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">Checks included</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {baselineAssessment.checks.map((check) => (
                <span key={check} className="rounded-md bg-warm/50 px-3 py-2 font-semibold">
                  {check}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">10 sentences</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-6 leading-8">
            {baselineAssessment.sentences.map((sentence) => (
              <li key={sentence}>{sentence}</li>
            ))}
          </ol>
        </section>

        <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">Reading passage</h2>
          <p className="mt-3 text-lg leading-9">{baselineAssessment.passage}</p>
        </section>

        <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold">Record baseline</h2>
          <p className="mt-2 text-ink/70">
            Read the words, sentences, and passage at a steady pace. Submit only when
            you are ready for the report.
          </p>
          <div className="mt-4">
            <Recorder onSubmit={submitAssessment} />
          </div>
          {busy ? <p className="mt-3 text-ink/65">Creating your starting report...</p> : null}
          {error ? <p className="mt-3 font-semibold text-coral">{error}</p> : null}
        </section>

        {report ? (
          <section className="mt-5 rounded-md bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">Starting report</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <Score label="Overall" value={report.overallClarityScore} />
              <Score label="Reading" value={report.readingScore} />
              <Score label="Pronunciation" value={report.pronunciationScore} />
              <Score label="Speed" value={report.speedScore} />
            </div>
            <h3 className="mt-5 font-bold">Main weak sounds</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {report.mainWeakSounds.map((sound) => (
                <span key={sound} className="rounded-md bg-warm/50 px-3 py-2 font-semibold">
                  {sound}
                </span>
              ))}
            </div>
            <h3 className="mt-5 font-bold">First 7-day practice plan</h3>
            <ol className="mt-2 list-decimal space-y-2 pl-6">
              {report.firstSevenDayPlan.map((day) => (
                <li key={day}>{day}</li>
              ))}
            </ol>
            <h3 className="mt-5 font-bold">Before text</h3>
            <p className="mt-2 rounded-md bg-[#f7f4ee] p-4 text-ink/75">{transcription}</p>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-[#f7f4ee] p-4">
      <div className="text-sm font-semibold text-ink/60">{label}</div>
      <div className="mt-1 text-3xl font-bold text-leaf">{value}</div>
    </div>
  );
}
