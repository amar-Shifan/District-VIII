"use client";

import Image from "next/image";
import { useState } from "react";

/** Drop the real photo at public/images/landing-bg.jpg; until then the gradient + noise fallback shows. */
const LANDING_IMAGE_SRC = "/images/landing-bg.jpg";

export function LandingBackground() {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 will-change-transform motion-safe:animate-ken-burns">
        {/* Fallback always sits underneath, so a missing or slow image never shows a blank screen. */}
        <div className="bg-landing-fallback absolute inset-0" />
        {!imageFailed && (
          <Image
            src={LANDING_IMAGE_SRC}
            alt=""
            fill
            preload
            sizes="(max-width: 430px) 100vw, 430px"
            // Low-opacity grayscale photo blended into the burgundy base keeps the palette burgundy-only.
            className="object-cover opacity-55 mix-blend-luminosity grayscale"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
      <div className="bg-landing-overlay absolute inset-0" />
      <div className="bg-noise absolute inset-0 opacity-[0.07] mix-blend-overlay" />
    </div>
  );
}
