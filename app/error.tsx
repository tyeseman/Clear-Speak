"use client";

export default function Error({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  async function clearCacheAndRetry() {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    reset();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f4ee] px-4">
      <section className="w-full max-w-sm rounded-md bg-white p-5 shadow-soft">
        <h1 className="text-2xl font-bold text-ink">KoloSpeak needs a refresh</h1>
        <p className="mt-3 leading-7 text-ink/70">
          The app did not load correctly. Clear the app cache and try again.
        </p>
        <button
          type="button"
          onClick={clearCacheAndRetry}
          className="focus-ring mt-5 h-12 rounded-md bg-leaf px-5 font-semibold text-white"
        >
          Clear cache and retry
        </button>
      </section>
    </main>
  );
}
