import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import { MobileHeader, MobileNav, SideNav } from "@/components/Nav";
import { ToastProvider } from "@/components/Toast";
import { QuickLogFab } from "@/components/WorkoutForm";
import { computeStreak, getProfileContext, getRecentWorkouts } from "@/lib/data";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PulseFit — Fitness & Health Tracker",
    template: "%s · PulseFit",
  },
  description:
    "Track workouts, nutrition, sleep, steps and body metrics with a beautiful personal health dashboard.",
  applicationName: "PulseFit",
};

export const viewport: Viewport = {
  themeColor: "#05070c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  let userName = "Athlete";
  let streak = 0;
  try {
    const { profile } = await getProfileContext();
    userName = profile.name;
    streak = computeStreak(await getRecentWorkouts(profile.id, 60));
  } catch {
    userName = "Athlete";
  }

  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="font-sans text-white antialiased">
        <ToastProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-xl focus:bg-lime focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-ink-950"
          >
            Skip to content
          </a>

          <div className="relative z-10 flex min-h-screen">
            <SideNav userName={userName} streak={streak} />
            <div className="min-w-0 flex-1 pb-24 lg:pb-0">
              <MobileHeader userName={userName} />
              <div id="main">{children}</div>
            </div>
          </div>

          <QuickLogFab />
          <MobileNav />
        </ToastProvider>
      </body>
    </html>
  );
}
