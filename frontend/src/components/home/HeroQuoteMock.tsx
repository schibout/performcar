"use client";

import { useEffect, useState } from "react";

import { Car, ClipboardCheck, FileText, Sparkles, UserRound, Wallet } from "lucide-react";
import { motion, type MotionValue } from "motion/react";
import { useTranslation } from "react-i18next";

import { fadeUp } from "@/lib/motion/variants";
import { cn } from "@/lib/utils";

// The five real steps of the quote wizard, in order. The preview carries no
// sample data: it only walks through the journey a dealer follows.
const STEPS = [
  { key: "vehicle", icon: Car },
  { key: "services", icon: Sparkles },
  { key: "financing", icon: Wallet },
  { key: "customer", icon: UserRound },
  { key: "summary", icon: ClipboardCheck },
] as const;

const STEP_MS = 1800;

interface HeroQuoteMockProps {
  rotateX: MotionValue<number>;
  y: MotionValue<number>;
}

// Glassy "new quote" window that keeps cycling through the wizard steps.
// Scroll transforms (straightening 3D tilt + drift) are driven by the hero.
export function HeroQuoteMock({ rotateX, y }: HeroQuoteMockProps) {
  const { t } = useTranslation("home");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % STEPS.length);
    }, STEP_MS);
    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <motion.div
      variants={fadeUp}
      style={{ rotateX, y, transformPerspective: 1200 }}
      className="mx-auto mt-12 w-full max-w-2xl text-left"
    >
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/70 shadow-2xl shadow-primary/10 backdrop-blur-md">
        <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
          <span aria-hidden className="h-3 w-3 rounded-full bg-destructive/70" />
          <span aria-hidden className="h-3 w-3 rounded-full bg-primary/40" />
          <span aria-hidden className="h-3 w-3 rounded-full bg-primary/70" />
          <span className="ml-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            {t("mock.window")}
          </span>
        </div>

        <ol className="space-y-2 px-5 py-5">
          {STEPS.map(({ key, icon: Icon }, index) => {
            const isActive = index === active;
            const isDone = index < active;
            return (
              <li
                key={key}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-500",
                  isActive ? "border-primary/50 bg-primary/10" : "border-transparent",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-500",
                    isActive || isDone
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">{t(`mock.${key}`)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t(`mock.${key}Desc`)}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="h-1 bg-secondary">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${((active + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
