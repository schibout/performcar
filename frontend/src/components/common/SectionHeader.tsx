"use client";

import { motion } from "motion/react";

import { fadeUp, staggerContainer } from "@/lib/motion/variants";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  className?: string;
}

// Shared landing-section intro: eyebrow → title → subtitle, revealed with the
// same stagger on every section so the page reads with one voice.
export function SectionHeader({ eyebrow, title, subtitle, className }: SectionHeaderProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
      className={cn("mx-auto mb-14 max-w-2xl text-center", className)}
    >
      <motion.p
        variants={fadeUp}
        className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary"
      >
        {eyebrow}
      </motion.p>
      <motion.h2 variants={fadeUp} className="text-balance text-3xl font-semibold sm:text-4xl">
        {title}
      </motion.h2>
      {subtitle ? (
        <motion.p variants={fadeUp} className="text-pretty mt-4 text-muted-foreground">
          {subtitle}
        </motion.p>
      ) : null}
    </motion.div>
  );
}
