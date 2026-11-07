"use client";

import { useRef } from "react";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useTranslation } from "react-i18next";

import { SectionHeader } from "@/components/common/SectionHeader";

interface StepDef {
  titleKey: string;
  descKey: string;
}

const STEPS: StepDef[] = [
  { titleKey: "steps.step1Title", descKey: "steps.step1Desc" },
  { titleKey: "steps.step2Title", descKey: "steps.step2Desc" },
  { titleKey: "steps.step3Title", descKey: "steps.step3Desc" },
];

// Each step owns a slice of the section's scroll progress. Slices overlap
// (stride < window) so one step is still settling while the next begins —
// the same continuous feel as the spine fill it rides alongside.
const STEP_WINDOW = 0.38;
const STEP_STRIDE = (1 - STEP_WINDOW) / (STEPS.length - 1);

interface StepRowProps {
  titleKey: string;
  descKey: string;
  index: number;
  progress: MotionValue<number>;
}

// A single step whose slide-in and badge pop are scrubbed by scroll progress
// (not one-shot reveals), so scrolling back up rewinds the animation in sync
// with the spine.
function StepRow({ titleKey, descKey, index, progress }: StepRowProps) {
  const { t } = useTranslation("home");
  const fromLeft = index % 2 === 0;
  const start = index * STEP_STRIDE;
  const end = start + STEP_WINDOW;

  const opacity = useTransform(progress, [start, end], [0, 1]);
  const x = useTransform(progress, [start, end], [fromLeft ? -40 : 40, 0]);
  // Overshoot near the end of the slice for the pop, then settle to 1.
  const badgeScale = useTransform(
    progress,
    [start, start + STEP_WINDOW * 0.7, end],
    [0.4, 1.18, 1],
  );

  return (
    <motion.div
      style={{ opacity, x }}
      className={`relative flex items-start gap-5 pl-14 sm:w-1/2 sm:pl-0 ${
        fromLeft ? "sm:mr-auto sm:flex-row-reverse sm:pr-10 sm:text-right" : "sm:ml-auto sm:pl-10"
      }`}
    >
      <motion.span
        style={{ scale: badgeScale }}
        className="absolute left-2.5 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground shadow-md shadow-primary/30 sm:static sm:shrink-0"
      >
        {index + 1}
      </motion.span>
      <div>
        <h3 className="text-xl font-semibold">{t(titleKey)}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(descKey)}</p>
      </div>
    </motion.div>
  );
}

// Steps alternate sliding in from the left and right along a center spine
// that fills with the accent color as you scroll past. The whole section is
// scroll-scrubbed: spine, slides, and badge pops all track scroll position
// and play in reverse on the way back up.
export function HomeSteps() {
  const { t } = useTranslation("home");

  const listRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 0.8", "end 0.55"],
  });
  const spineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section className="border-t border-border/60 bg-muted/40 py-24">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <SectionHeader eyebrow={t("steps.eyebrow")} title={t("steps.title")} className="mb-16" />

        <div ref={listRef} className="relative space-y-12">
          {/* Center spine: muted base + scroll-filled accent overlay */}
          <div aria-hidden className="absolute inset-y-0 left-6 w-px bg-border/70 sm:left-1/2" />
          <motion.div
            aria-hidden
            style={{ scaleY: spineScale }}
            className="absolute inset-y-0 left-6 w-px origin-top bg-gradient-to-b from-primary via-primary/70 to-primary/30 sm:left-1/2"
          />

          {STEPS.map(({ titleKey, descKey }, index) => (
            <StepRow
              key={titleKey}
              titleKey={titleKey}
              descKey={descKey}
              index={index}
              progress={scrollYProgress}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
