"use client";

import { UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { IMAGE_HOSTS } from "@/lib/config";

function canOptimize(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    return IMAGE_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}

interface FoodImageProps {
  src: string;
  alt: string;
  size: number;
  className?: string;
}

/**
 * Menu photo with a branded fallback when the URL is empty or fails to load.
 * Hosts outside NEXT_PUBLIC_IMAGE_HOSTS render unoptimized instead of erroring.
 */
export function FoodImage({ src, alt, size, className = "" }: FoodImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={`bg-card-gradient grid shrink-0 place-items-center text-white/70 ${className}`}
        style={{ width: size, height: size }}
      >
        <UtensilsCrossed aria-hidden strokeWidth={1.5} className="size-1/3" />
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      sizes={`${size}px`}
      unoptimized={!canOptimize(src)}
      onError={() => setFailed(true)}
      className={`shrink-0 object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
