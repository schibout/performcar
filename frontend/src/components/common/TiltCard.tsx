"use client";

import { useRef } from "react";

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";

import { cn } from "@/lib/utils";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Maximum tilt in degrees at the card edges. */
  maxTilt?: number;
}

// Pointer-tracking 3D tilt with a glare highlight that follows the cursor.
// Touch input is ignored so mobile keeps flat, scrollable cards.
export function TiltCard({ children, className, maxTilt = 9 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Pointer position normalized to 0..1 inside the card; 0.5/0.5 = rest.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(py, [0, 1], [maxTilt, -maxTilt]), {
    stiffness: 280,
    damping: 26,
  });
  const rotateY = useSpring(useTransform(px, [0, 1], [-maxTilt, maxTilt]), {
    stiffness: 280,
    damping: 26,
  });
  const glareX = useTransform(px, (v: number) => `${v * 100}%`);
  const glareY = useTransform(py, (v: number) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(240px circle at ${glareX} ${glareY}, color-mix(in oklch, var(--primary) 12%, transparent), transparent 70%)`;

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((event.clientX - rect.left) / rect.width);
    py.set((event.clientY - rect.top) / rect.height);
  };

  const handlePointerLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={cn("relative will-change-transform", className)}
    >
      {children}
      <motion.div
        aria-hidden
        style={{ background: glare }}
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
      />
    </motion.div>
  );
}
