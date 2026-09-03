"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[pulsefit] render error", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-3xl bg-flame/10 text-3xl ring-1 ring-flame/25" aria-hidden>
        ⚠️
      </span>
      <h1 className="mt-6 font-display text-2xl font-bold text-white">Something went sideways</h1>
      <p className="mt-2 text-sm leading-relaxed text-white/50">
        We hit an unexpected error while loading your data. Retrying usually fixes it.
      </p>
      {error.digest ? (
        <code className="mt-3 rounded-lg bg-white/[0.05] px-2.5 py-1 text-[11px] text-white/40">
          ref: {error.digest}
        </code>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-ghost">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
