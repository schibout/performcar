"use client";

import { motion, useScroll, useSpring } from "motion/react";

// Thin scroll-progress bar pinned above the sticky header; fills left-to-right
// as the page scrolls.
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-gradient-to-r from-primary to-primary/50"
    />
  );
}
