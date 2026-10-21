"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BellRing, CheckCircle2, X, XCircle } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastTone = "info" | "success" | "error";

interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (toast: Omit<Toast, "id" | "tone"> & { tone?: ToastTone }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const DURATION_MS = 6000;
const ICONS = { info: BellRing, success: CheckCircle2, error: XCircle } as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(
    ({ tone = "info", ...rest }) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current.slice(-3), { id, tone, ...rest }]);
      window.setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed top-4 right-4 z-[70] flex w-[min(360px,calc(100vw-110px))] flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((item) => {
            const Icon = ICONS[item.tone];
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                role={item.tone === "error" ? "alert" : "status"}
                className="pointer-events-auto flex items-start gap-3 rounded-[20px] border border-burgundy/15 bg-white p-4 text-wine-ink shadow-admin-lift"
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-full ${item.tone === "info" ? "bg-sidebar text-white" : "bg-burgundy/10 text-burgundy"}`}
                >
                  <Icon aria-hidden className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{item.title}</p>
                  {item.description && <p className="mt-0.5 text-xs text-wine-ink/60">{item.description}</p>}
                </div>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => dismiss(item.id)}
                  className="grid size-7 shrink-0 place-items-center rounded-full text-wine-ink/50 outline-none hover:bg-burgundy/8 focus-visible:ring-2 focus-visible:ring-burgundy"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
