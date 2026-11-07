"use client";

import { useEffect, useRef, useState } from "react";

import {
  Car,
  Droplets,
  Gauge,
  Layers,
  Palette,
  Shield,
  Sparkles,
  SunDim,
  type LucideIcon,
} from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { useTranslation } from "react-i18next";

import { SectionHeader } from "@/components/common/SectionHeader";

interface ShowcaseCardDef {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  tagKey: string;
}

const card = (icon: LucideIcon, index: number): ShowcaseCardDef => ({
  icon,
  titleKey: `showcase.card${index}Title`,
  descKey: `showcase.card${index}Desc`,
  tagKey: `showcase.card${index}Tag`,
});

// PERFORM'CAR service lines, as presented on performcar.fr. Prices are not
// shown here: the quote catalog is the single source of prices.
const CARDS: ShowcaseCardDef[] = [
  card(Shield, 1),
  card(Layers, 2),
  card(Palette, 3),
  card(Car, 4),
  card(Sparkles, 5),
  card(SunDim, 6),
  card(Droplets, 7),
  card(Gauge, 8),
];

// The section pins while vertical scroll drives the card track horizontally.
// The shift is measured in pixels (track width minus viewport width), so the
// ride always ends with the last card flush to the right edge — no dead space
// on wide screens, and the section simply doesn't slide when everything fits.
export function HomeShowcase() {
  const { t } = useTranslation("home");
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [maxShift, setMaxShift] = useState(0);

  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      const viewport = viewportRef.current;
      if (!track || !viewport) return;
      setMaxShift(Math.max(0, track.scrollWidth - viewport.clientWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: sectionRef });
  const x = useTransform(scrollYProgress, [0.08, 0.92], [0, -maxShift]);
  const trackProgress = useTransform(scrollYProgress, [0.08, 0.92], [0, 1]);

  return (
    <section ref={sectionRef} className="relative h-[240vh] border-t border-border/60">
      <div className="mesh-glow sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <SectionHeader
          eyebrow={t("showcase.eyebrow")}
          title={t("showcase.title")}
          subtitle={t("showcase.subtitle")}
          className="mb-10 px-4"
        />

        <div ref={viewportRef} className="relative">
          {/* Edge fades so cards dissolve instead of clipping hard */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent"
          />

          <motion.div ref={trackRef} style={{ x }} className="flex w-max gap-6 px-8 py-2">
            {CARDS.map(({ icon: Icon, titleKey, descKey, tagKey }) => (
              <div
                key={titleKey}
                className="flex w-[20rem] shrink-0 flex-col rounded-2xl border border-border bg-card/80 p-8 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 sm:w-[24rem]"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">{t(titleKey)}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {t(descKey)}
                </p>

                <p className="mt-8 text-xs font-medium uppercase tracking-wider text-primary">
                  {t(tagKey)}
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Ride progress */}
        <div className="mx-auto mt-10 h-1 w-44 overflow-hidden rounded-full bg-border">
          <motion.div
            style={{ scaleX: trackProgress }}
            className="h-full origin-left rounded-full bg-primary"
          />
        </div>
      </div>
    </section>
  );
}
