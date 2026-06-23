"use client";

import { useEffect, useState } from "react";
import { Lock, LogOut } from "lucide-react";
import { clearAuth, defaultUserEmail, isAuthenticated, saveAuth } from "@/lib/progress";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState(defaultUserEmail);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
    setReady(true);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, passcode })
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Private access required.");
      }
      const body = (await response.json()) as { email?: string };
      saveAuth(passcode, body.email ?? email);
      setAuthed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Private access required.");
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    clearAuth();
    setAuthed(false);
    setEmail(defaultUserEmail);
    setPasscode("");
  }

  if (!ready) {
    return <div className="min-h-screen bg-[#f7f4ee]" />;
  }

  if (!authed) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f4ee] px-4">
        <form onSubmit={submit} className="w-full max-w-sm rounded-md bg-white p-6 shadow-soft">
          <div className="grid h-12 w-12 place-items-center rounded-md bg-leaf text-white">
            <Lock size={22} />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Private access</h1>
          <p className="mt-2 text-ink/70">
            ClearSpeak Coach is private for hello@leonctyes.com.
          </p>
          <label className="mt-5 block">
            <span className="font-semibold text-ink/75">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="focus-ring mt-2 h-12 w-full rounded-md border border-black/10 px-3"
              autoComplete="email"
            />
          </label>
          <label className="mt-5 block">
            <span className="font-semibold text-ink/75">Passcode</span>
            <input
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              className="focus-ring mt-2 h-12 w-full rounded-md border border-black/10 px-3"
              autoComplete="current-password"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !passcode || !email}
            className="focus-ring mt-5 h-12 w-full rounded-md bg-leaf px-4 font-bold text-white disabled:opacity-60"
          >
            {loading ? "Checking..." : "Unlock"}
          </button>
          {error ? <p className="mt-3 text-sm font-semibold text-coral">{error}</p> : null}
        </form>
      </main>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={signOut}
        className="focus-ring fixed right-4 top-4 z-50 inline-flex h-9 items-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-ink shadow-soft"
      >
        <LogOut size={15} />
        Lock
      </button>
      {children}
    </>
  );
}
