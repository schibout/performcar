"use client";

import { FileText, History, Tags, Wallet, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

import { SectionHeader } from "@/components/common/SectionHeader";
import { TiltCard } from "@/components/common/TiltCard";
import { fadeUp, staggerContainer } from "@/lib/motion/variants";
import { cn } from "@/lib/utils";

interface FeatureDef {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  /** Wide cards span two bento columns. */
  wide: boolean;
}

// Asymmetric bento layout: wide → narrow on the first row, narrow → wide on
// the second.
const FEATURES: FeatureDef[] = [
  { icon: FileText, titleKey: "features.item1", descKey: "features.item1Desc", wide: true },
  { icon: Tags, titleKey: "features.item2", descKey: "features.item2Desc", wide: false },
  { icon: Wallet, titleKey: "features.item3", descKey: "features.item3Desc", wide: false },
  { icon: History, titleKey: "features.item4", descKey: "features.item4Desc", wide: true },
];

// Bento cards stagger-reveal on scroll; each tilts in 3D under the pointer
// and its icon perks up on hover.
export function HomeFeatures() {
  const { t } = useTranslation("home");

  return (
    <section className="border-t border-border/60 bg-muted/40 py-24">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow={t("features.eyebrow")}
          title={t("features.title")}
          subtitle={t("features.subtitle")}
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          className="grid gap-6 text-left sm:grid-cols-3"
        >
          {FEATURES.map(({ icon: Icon, titleKey, descKey, wide }) => (
            <motion.div key={titleKey} variants={fadeUp} className={cn(wide && "sm:col-span-2")}>
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
  );
}
