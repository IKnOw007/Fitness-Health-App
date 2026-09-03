import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-3xl bg-white/[0.05] text-3xl ring-1 ring-white/10" aria-hidden>
        🧭
      </span>
      <p className="mt-6 font-display text-6xl font-black tracking-tight text-lime">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-white">This page took a rest day</h1>
      <p className="mt-2 text-sm leading-relaxed text-white/50">
        We couldn&apos;t find what you were looking for. Let&apos;s get you back to your training data.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/" className="btn-primary">
          Back to dashboard
        </Link>
        <Link href="/workouts" className="btn-ghost">
          View workouts
        </Link>
      </div>
    </main>
  );
}
