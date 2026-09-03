"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastTone = "success" | "error" | "info";

export type ToastAction = { label: string; onClick: () => void | Promise<void> };

type Toast = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  action?: ToastAction;
};

type ToastInput = Omit<Toast, "id" | "tone"> & { tone?: ToastTone; duration?: number };

type ToastApi = {
  toast: (input: ToastInput) => number;
  success: (title: string, description?: string, action?: ToastAction) => number;
  error: (title: string, description?: string) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const TONE_STYLES: Record<ToastTone, { icon: string; ring: string; accent: string }> = {
  success: { icon: "✓", ring: "ring-lime/30", accent: "bg-lime text-ink-950" },
  error: { icon: "!", ring: "ring-flame/35", accent: "bg-flame text-ink-950" },
  info: { icon: "i", ring: "ring-aqua/30", accent: "bg-aqua text-ink-950" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    ({ duration = 4200, tone = "success", ...rest }: ToastInput) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev.slice(-2), { id, tone, ...rest }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach(clearTimeout);
      map.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      dismiss,
      success: (title, description, action) => toast({ title, description, action, tone: "success" }),
      error: (title, description) => toast({ title, description, tone: "error", duration: 6000 }),
    }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:items-end lg:px-0"
      >
        {toasts.map((t) => {
          const style = TONE_STYLES[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              style={{ animation: "toast-in 0.32s cubic-bezier(0.22,1,0.36,1) both" }}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-white/10 bg-ink-850/95 p-3.5 shadow-2xl ring-1 backdrop-blur-xl ${style.ring}`}
            >
              <span
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black ${style.accent}`}
                aria-hidden
              >
                {style.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-snug text-white">{t.title}</p>
                {t.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-white/55">{t.description}</p>
                ) : null}
                {t.action ? (
                  <button
                    onClick={() => {
                      void t.action?.onClick();
                      dismiss(t.id);
                    }}
                    className="mt-2 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-white/20"
                  >
                    {t.action.label}
                  </button>
                ) : null}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded-lg px-1.5 text-white/30 transition hover:text-white"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
