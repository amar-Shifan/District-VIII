"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { type ReactNode, useId, useRef } from "react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Centered dialog with a spring entrance. */
export function Modal(props: OverlayProps) {
  return <AnimatePresence>{props.open && <Panel {...props} variant="modal" />}</AnimatePresence>;
}

/** Right-hand drawer for longer forms. */
export function Drawer(props: OverlayProps) {
  return <AnimatePresence>{props.open && <Panel {...props} variant="drawer" />}</AnimatePresence>;
}

function Panel({ onClose, title, description, children, footer, variant }: OverlayProps & { variant: "modal" | "drawer" }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useFocusTrap(panelRef, true, onClose);
  const drawer = variant === "drawer";

  return (
    <div className={`fixed inset-0 z-[60] flex ${drawer ? "justify-end" : "items-center justify-center p-4"}`}>
      <motion.button
        type="button"
        tabIndex={-1}
        aria-label="Close"
        className="absolute inset-0 bg-wine-ink/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`relative flex flex-col bg-white text-wine-ink shadow-admin-lift outline-none ${
          drawer ? "h-full w-full max-w-md rounded-l-card" : "max-h-[90dvh] w-full max-w-lg rounded-card"
        }`}
        initial={drawer ? { x: "100%" } : { opacity: 0, scale: 0.94, y: 12 }}
        animate={drawer ? { x: 0 } : { opacity: 1, scale: 1, y: 0 }}
        exit={drawer ? { x: "100%" } : { opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-burgundy/10 px-6 pt-6 pb-4">
          <div>
            <h2 id={titleId} className="-skew-x-8 font-display text-2xl leading-none">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1.5 text-sm text-wine-ink/60">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-full text-wine-ink/60 transition-colors outline-none hover:bg-burgundy/8 hover:text-wine-ink focus-visible:ring-2 focus-visible:ring-burgundy"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-burgundy/10 px-6 py-4">{footer}</div>}
      </motion.div>
    </div>
  );
}
