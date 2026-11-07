import Image from "next/image";

import { cn } from "@/lib/utils";

// Full PERFORM'CAR logo (mark + wordmark). The original has white lettering
// for dark backgrounds; the light-theme copy swaps it for slate ink.
const LOGO_ON_DARK = "/assets/brand/performcar-logo-on-dark.png";
const LOGO_ON_LIGHT = "/assets/brand/performcar-logo-on-light.png";
// Intrinsic size of both files (same crop), so next/image keeps the ratio.
const WIDTH = 908;
const HEIGHT = 400;

interface BrandWordmarkProps {
  // Height classes from the call site (e.g. "h-20"); width follows the ratio.
  className?: string;
  priority?: boolean;
}

/** The full PERFORM'CAR logo, switching variant with the active theme. */
export function BrandWordmark({ className, priority = false }: BrandWordmarkProps) {
  const shared = "h-full w-auto object-contain";
  return (
    <span className={cn("inline-flex", className)}>
      <Image
        src={LOGO_ON_LIGHT}
        alt="PERFORM'CAR"
        width={WIDTH}
        height={HEIGHT}
        priority={priority}
        className={cn(shared, "dark:hidden")}
      />
      <Image
        src={LOGO_ON_DARK}
        alt="PERFORM'CAR"
        width={WIDTH}
        height={HEIGHT}
        priority={priority}
        className={cn(shared, "hidden dark:block")}
      />
    </span>
  );
}
