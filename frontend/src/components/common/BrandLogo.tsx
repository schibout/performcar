"use client";

import Image from "next/image";

import { useBranding } from "@/hooks/use-branding";
import { cn } from "@/lib/utils";

// PERFORM'CAR "P" mark, used when the backend ``logo_url`` setting is empty.
export const DEFAULT_LOGO_URL = "/assets/brand/performcar-mark.png";

interface BrandLogoProps {
  // Sizing/radius/hover classes from the call site (e.g. "h-8 w-8 rounded-xl text-sm").
  className?: string;
}

/**
 * The brand mark: the backend ``logo_url`` rendered ``object-contain`` (never
 * cropped — it is a transparent, often rectangular image), falling back to the
 * PERFORM'CAR mark when no logo is set.
 */
export function BrandLogo({ className }: BrandLogoProps) {
  const { siteName, logoUrl } = useBranding();

  // ``fill`` needs a positioned, sized box; the caller's className provides the
  // dimensions. ``object-contain`` keeps the (often rectangular, transparent)
  // logo uncropped. ``sizes`` is small since the mark is only a header/sidebar icon.
  return (
    <span className={cn("relative shrink-0", className)}>
      <Image
        src={logoUrl || DEFAULT_LOGO_URL}
        alt={siteName}
        fill
        sizes="48px"
        className="object-contain"
      />
    </span>
  );
}
