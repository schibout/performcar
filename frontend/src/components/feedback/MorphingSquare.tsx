"use client";

import { motion, type HTMLMotionProps } from "motion/react";

import { cn } from "@/lib/utils";

const PLACEMENT_CLASSES = {
  bottom: "flex-col",
  top: "flex-col-reverse",
  right: "flex-row",
  left: "flex-row-reverse",
} as const;

export interface MorphingSquareProps {
  message?: string;
  /**
   * Position of the message relative to the spinner.
   * @default bottom
   */
  messagePlacement?: keyof typeof PLACEMENT_CLASSES;
}

export function MorphingSquare({
  className,
  message,
  messagePlacement = "bottom",
  ...props
}: HTMLMotionProps<"div"> & MorphingSquareProps) {
  return (
    <div
      className={cn("flex gap-2 items-center justify-center", PLACEMENT_CLASSES[messagePlacement])}
    >
      <motion.div
        className={cn("w-10 h-10 bg-foreground", className)}
        animate={{
          borderRadius: ["6%", "50%", "6%"],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        {...props}
      />
      {message && <div className="text-sm font-medium">{message}</div>}
    </div>
  );
}
