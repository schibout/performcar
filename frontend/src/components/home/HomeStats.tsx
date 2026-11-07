"use client";

import { useEffect, useRef } from "react";

import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useTranslation } from "react-i18next";

import { SectionHeader } from "@/components/common/SectionHeader";
import { EASE_OUT, fadeUp, staggerContainer } from "@/lib/motion/variants";

interface StatDef {
  value: number;
  /** Unit shown after the number ("+", "%"); empty for none. */
  suffix: string;
  labelKey: string;
  /** Mini trend line drawn under the number when it scrolls into view. */
  sparkline: string;
}

// Key figures published by PERFORM'CAR on performcar.fr ("plus d'un millier
// de véhicules d'exception", "Garantie 10 ans", "100% de clients satisfaits").
const STATS: StatDef[] = [
  {
    value: 1000,
    suffix: "+",
    labelKey: "stats.vehicles",
    sparkline: "M2 24 C 24 22, 40 14, 58 12 S 86 6, 98 3",
  },
  {
    value: 10,
    suffix: "",
    labelKey: "stats.warranty",
    sparkline: "M2 22 C 20 23, 38 18, 54 15 S 84 8, 98 5",
  },
  {
    value: 100,
    suffix: "%",
    labelKey: "stats.satisfaction",
    sparkline: "M2 25 C 22 20, 36 19, 52 13 S 82 5, 98 2",
  },
];

// Counts up from 0 the first time it scrolls into view.
function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const motionValue = useMotionValue(0);
  const formatted = useTransform(motionValue, (v: number) => Math.round(v).toLocaleString());

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionValue, value, { duration: 1.6, ease: EASE_OUT });
    return () => {
      controls.stop();
    };
  }, [inView, motionValue, value]);

  return <motion.span ref={ref}>{formatted}</motion.span>;
}

export function HomeStats() {
  const { t } = useTranslation("home");

  return (
    <section className="py-24">
      <div className="mx-auto w-full max-w-480 px-4 sm:px-6 lg:px-8 xl:px-12">
        <SectionHeader eyebrow={t("stats.eyebrow")} title={t("stats.title")} />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          className="grid grid-cols-1 gap-10 sm:grid-cols-3"
        >
          {STATS.map(({ value, suffix, labelKey, sparkline }) => (
            <motion.div key={labelKey} variants={fadeUp} className="text-center">
              <p className="font-display text-5xl sm:text-6xl font-semibold text-primary">
                <AnimatedNumber value={value} />
                {suffix ? <span aria-hidden>{suffix}</span> : null}
              </p>
              <svg aria-hidden viewBox="0 0 100 28" className="mx-auto mt-3 h-7 w-24">
                <motion.path
                  d={sparkline}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 0.75 }}
                  viewport={{ once: true, amount: 1 }}
                  transition={{ duration: 1.4, ease: EASE_OUT, delay: 0.2 }}
                />
              </svg>
              <p className="mt-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {t(labelKey)}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
