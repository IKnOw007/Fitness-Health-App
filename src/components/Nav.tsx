"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard", icon: "◎", short: "Home" },
  { href: "/workouts", label: "Workouts", icon: "🏋️", short: "Train" },
  { href: "/nutrition", label: "Nutrition", icon: "🥗", short: "Fuel" },
  { href: "/progress", label: "Progress", icon: "📈", short: "Trends" },
  { href: "/settings", label: "Goals", icon: "🎯", short: "Goals" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-lime to-aqua text-base font-black text-ink-950"
        style={{ boxShadow: "0 6px 22px -8px rgba(201,246,88,0.9)" }}
        aria-hidden
      >
        ⚡
      </span>
      {!compact ? (
        <span className="font-display text-lg font-black tracking-[-0.02em] text-white">
          Pulse<span className="text-lime">Fit</span>
        </span>
      ) : null}
    </span>
  );
}

export function SideNav({ userName, streak }: { userName: string; streak: number }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col justify-between border-r border-white/[0.07] bg-white/[0.018] px-4 py-6 backdrop-blur-2xl lg:flex">
      <div className="min-h-0">
        <Link href="/" className="mb-7 flex px-1" aria-label="PulseFit home">
          <Wordmark />
        </Link>

        <nav aria-label="Primary">
          <ul className="flex flex-col gap-1">
            {LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition duration-200 ${
                      active
                        ? "bg-lime/[0.11] text-lime"
                        : "text-white/55 hover:bg-white/[0.055] hover:text-white"
                    }`}
                  >
                    {active ? (
                      <span
                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-lime"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className="text-base leading-none transition duration-200 group-hover:scale-110"
                      aria-hidden
                    >
                      {link.icon}
                    </span>
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-6 border-t border-white/[0.07] pt-4">
          <Link
            href="/docs"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition duration-200 ${
              pathname.startsWith("/docs")
                ? "bg-aqua/[0.11] text-aqua"
                : "text-white/45 hover:bg-white/[0.055] hover:text-white"
            }`}
          >
            <span className="text-base leading-none" aria-hidden>
              🧩
            </span>
            API &amp; docs
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {streak > 0 ? (
          <div className="rounded-2xl border border-flame/20 bg-flame/[0.07] p-3">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-flame">
              <span aria-hidden>🔥</span> Streak
            </p>
            <p className="mt-1 font-display text-2xl font-black tabular-nums text-white">
              {streak}
              <span className="ml-1 text-xs font-semibold text-white/40">
                day{streak === 1 ? "" : "s"}
              </span>
            </p>
          </div>
        ) : null}

        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-lime to-aqua text-sm font-black text-ink-950"
            aria-hidden
          >
            {userName.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{userName}</p>
            <p className="text-[11px] text-white/40">Premium member</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function MobileHeader({ userName }: { userName: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.07] bg-ink-950/80 px-4 py-3 backdrop-blur-xl lg:hidden">
      <Link href="/" aria-label="PulseFit home">
        <Wordmark />
      </Link>
      <Link
        href="/settings"
        className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-lime to-aqua text-xs font-black text-ink-950"
        aria-label="Profile and goals"
      >
        {userName.slice(0, 1)}
      </Link>
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.09] bg-ink-950/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="flex items-stretch justify-between px-1.5 py-1.5">
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href} className="flex-1">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-bold transition ${
                  active ? "text-lime" : "text-white/45"
                }`}
              >
                {active ? (
                  <span className="absolute -top-1.5 h-1 w-6 rounded-full bg-lime" aria-hidden />
                ) : null}
                <span className="text-[17px] leading-none" aria-hidden>
                  {link.icon}
                </span>
                {link.short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
