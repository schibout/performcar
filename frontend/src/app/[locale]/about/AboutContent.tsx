"use client";

import { Eye, Gem, ShieldCheck, Sparkles, Zap, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

import { SectionHeader } from "@/components/common/SectionHeader";
import { TiltCard } from "@/components/common/TiltCard";
import { HomeCtaBand } from "@/components/home/HomeCtaBand";
import { HomeFooter } from "@/components/home/HomeFooter";
import {
  fadeUp,
  scaleIn,
  slideInLeft,
  slideInRight,
  staggerContainer,
} from "@/lib/motion/variants";

interface ValueDef {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
}

const VALUES: ValueDef[] = [
  { icon: Gem, titleKey: "values.item1", descKey: "values.item1Desc" },
  { icon: ShieldCheck, titleKey: "values.item2", descKey: "values.item2Desc" },
  { icon: Zap, titleKey: "values.item3", descKey: "values.item3Desc" },
  { icon: Eye, titleKey: "values.item4", descKey: "values.item4Desc" },
];

// Generic template About page: replace the placeholder copy in
// i18n/locales/{en,tr}/about.json with your project's real story.
export function AboutContent() {
  const { t } = useTranslation("about");

  return (
    <div className="flex flex-col flex-1">
      {/* Hero */}
      <section className="mesh-glow texture-grain relative overflow-hidden px-4 py-28 text-center">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-3xl space-y-6"
        >
          <motion.div variants={scaleIn} className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {t("badge")}
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-balance text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight"
          >
            {t("title")}
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-pretty mx-auto max-w-2xl text-lg text-muted-foreground"
          >
            {t("subtitle")}
          </motion.p>
        </motion.div>
      </section>

      {/* Story */}
      <section className="border-t border-border/60 bg-muted/40 py-24">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
          <SectionHeader eyebrow={t("story.eyebrow")} title={t("story.title")} />

          <div className="grid gap-8 sm:grid-cols-2">
            <motion.p
              variants={slideInLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              className="text-pretty leading-relaxed text-muted-foreground"
            >
              {t("story.p1")}
            </motion.p>
            <motion.p
              variants={slideInRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              className="text-pretty leading-relaxed text-muted-foreground"
            >
              {t("story.p2")}
            </motion.p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
          <SectionHeader eyebrow={t("values.eyebrow")} title={t("values.title")} />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            className="grid gap-6 text-left sm:grid-cols-2"
          >
            {VALUES.map(({ icon: Icon, titleKey, descKey }) => (
              <motion.div key={titleKey} variants={fadeUp}>
                <TiltCard className="group h-full rounded-2xl border border-border bg-card p-7 shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/10">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <Icon className="h-6 w-6 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
                  </div>
                  <h3 className="text-lg font-semibold">{t(titleKey)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(descKey)}</p>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <HomeCtaBand />
      <HomeFooter />
    </div>
  );
}
