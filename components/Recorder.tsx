"use client";

import { useRef, useState } from "react";
import { Loader2, Mic, Send, Square, RotateCcw } from "lucide-react";

export function Recorder({
  onSubmit
}: {
  onSubmit: (blob: Blob, durationSeconds: number) => Promise<void>;
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function start() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setDurationSeconds(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)));
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setRecording(true);
    } catch {
      setError("Microphone permission is needed to record.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  function reset() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl("");
    setAudioBlob(null);
    setDurationSeconds(0);
    setError("");
  }

  async function submit() {
    if (!audioBlob) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(audioBlob, durationSeconds);
    } catch {
      setError("Could not submit the recording.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-md border border-black/5 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        {!recording ? (
          <button
            type="button"
            onClick={start}
            className="focus-ring inline-flex h-12 items-center gap-2 rounded-md bg-coral px-4 font-semibold text-white"
          >
            <Mic size={18} />
            Record
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="focus-ring inline-flex h-12 items-center gap-2 rounded-md bg-ink px-4 font-semibold text-white"
          >
            <Square size={18} />
            Stop
          </button>
        )}

        {audioUrl ? (
          <>
            <audio controls src={audioUrl} className="h-10 max-w-full" />
            <button
              type="button"
              onClick={reset}
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-black/10 bg-white px-3 font-semibold text-ink"
            >
              <RotateCcw size={16} />
              Again
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-md bg-leaf px-3 font-semibold text-white disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Submit
            </button>
          </>
        ) : null}
      </div>
      {recording ? <p className="mt-3 text-sm text-coral">Recording. Keep it short and clear.</p> : null}
      {audioBlob ? <p className="mt-3 text-sm text-ink/60">Length: {durationSeconds} seconds</p> : null}
      {error ? <p className="mt-3 text-sm text-coral">{error}</p> : null}
    </div>
  );
}
