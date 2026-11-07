"use client";

import { motion } from "motion/react";

import { EASE_OUT } from "@/lib/motion/variants";

interface PageTransitionProps {
  children: React.ReactNode;
}

// Mounted from src/app/[locale]/template.tsx, which remounts on every route
// change — giving each page a consistent entrance without AnimatePresence.
export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
      className="flex flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}
