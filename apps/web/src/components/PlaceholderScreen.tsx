import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PlaceholderScreenProps {
  eyebrow: string;
  title: string;
  description: string;
}

/** Temporary screen for routes that are built in later tasks. */
export function PlaceholderScreen({ eyebrow, title, description }: PlaceholderScreenProps) {
  return (
    <div className="bg-screen-burgundy relative flex h-full flex-col px-4 pt-[calc(var(--safe-top)+12px)] pb-[calc(var(--safe-bottom)+16px)]">
      <header>
        <Link
          href="/home"
          aria-label="Back to home"
          className="grid size-12 place-items-center rounded-full border border-burgundy-bright/60 bg-ink/50 text-white shadow-glow backdrop-blur-xl transition-transform duration-200 outline-none hover:scale-105 focus-visible:ring-2 focus-visible:ring-blush active:scale-95"
        >
          <ArrowLeft aria-hidden strokeWidth={2.5} className="size-5" />
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center text-center motion-safe:animate-fade-up">
        <p className="text-[11px] font-bold tracking-[0.3em] text-blush uppercase">{eyebrow}</p>
        <h1 className="text-glow mt-3 -skew-x-8 font-display text-6xl leading-none text-white">{title}</h1>
        <p className="mt-4 max-w-64 text-sm text-blush">{description}</p>
      </main>
    </div>
  );
}
