"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { type ReactNode, useId, useRef } from "react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Modal sheet that springs up from the bottom of the phone shell. Traps
 * focus, closes on Escape or backdrop tap, and restores focus on close.
 */
export function BottomSheet({ open, onClose, title, description, children }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <SheetBody onClose={onClose} title={title} description={description}>
          {children}
        </SheetBody>
      )}
    </AnimatePresence>
  );
}

function SheetBody({ onClose, title, description, children }: Omit<BottomSheetProps, "open">) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useFocusTrap(panelRef, true, onClose);

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <motion.button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="absolute inset-0 bg-ink/70 backdrop-blur-[2px]"
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
        className="relative max-h-[88%] overflow-y-auto rounded-t-card border-t border-burgundy-bright/50 bg-ink px-5 pt-3 pb-[calc(var(--safe-bottom)+20px)] shadow-card outline-none"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
      >
        <span aria-hidden className="mx-auto mb-4 block h-1 w-10 rounded-full bg-white/25" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="-skew-x-8 font-display text-3xl leading-none text-white">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1.5 text-sm text-blush">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/15 text-white transition-transform outline-none hover:scale-105 focus-visible:ring-2 focus-visible:ring-blush active:scale-95"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
