"use client";

import { useRef } from "react";

import { ArrowRight, Sparkles } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue, useScroll, useTransform } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { HeroQuoteMock } from "@/components/home/HeroQuoteMock";
import { BrandWordmark } from "@/components/common/BrandWordmark";
import { HeroHeadline } from "@/components/home/HeroHeadline";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/hooks/use-branding";
import { getLocaleFromPath, ROUTES, getLocalizedPath } from "@/lib/config/routes";
import { fadeUp, scaleIn, staggerContainer } from "@/lib/motion/variants";
import { useAuthStore } from "@/stores/auth.store";

// Full-viewport hero: word-by-word headline, aurora + parallax blobs + a
// cursor spotlight behind, CTA with a nudging arrow, and a living quote-wizard
// preview that straightens out of its 3D tilt as you scroll.
export function HomeHero() {
  const { t } = useTranslation("home");
  const { siteName } = useBranding();
  const { user } = useAuthStore();
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);
  const router = useRouter();

  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const blobSlowY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const blobFastY = useTransform(scrollYProgress, [0, 1], [0, -180]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const copyY = useTransform(scrollYProgress, [0, 0.8], [0, -60]);
  const mockRotateX = useTransform(scrollYProgress, [0, 0.35], [10, 0]);
  const mockY = useTransform(scrollYProgress, [0, 1], [0, -50]);

  // Cursor spotlight: a soft glow follows the pointer across the hero.
  // --spotlight-mix is theme-scoped on the section: stronger on light
  // surfaces where soft tints wash out, softer on dark.
  const spotX = useMotionValue(-1000);
  const spotY = useMotionValue(-1000);
  const spotlight = useMotionTemplate`radial-gradient(420px circle at ${spotX}px ${spotY}px, color-mix(in oklch, var(--primary) var(--spotlight-mix), transparent), transparent 70%)`;

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    spotX.set(event.clientX - rect.left);
    spotY.set(event.clientY - rect.top);
  };

  return (
    <section
      ref={sectionRef}
      onPointerMove={handlePointerMove}
      className="texture-grain relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-4 pb-12 pt-24 text-center [--spotlight-mix:14%] dark:[--spotlight-mix:8%]"
    >
      {/* Drifting aurora atmosphere + cursor spotlight */}
      <div aria-hidden className="aurora-veil -z-10" />
      <motion.div
        aria-hidden
        style={{ background: spotlight }}
        className="pointer-events-none absolute inset-0 -z-10"
      />

      {/* Parallax glow blobs */}
      <motion.div
        aria-hidden
        style={{ y: blobSlowY }}
        className="pointer-events-none absolute -top-32 -left-24 -z-10 h-[28rem] w-[28rem] rounded-full bg-primary/25 blur-3xl dark:bg-primary/15"
      />
      <motion.div
        aria-hidden
        style={{ y: blobFastY }}
        className="pointer-events-none absolute -right-32 top-1/3 -z-10 h-[24rem] w-[24rem] rounded-full bg-primary/20 blur-3xl dark:bg-primary/10"
      />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        style={{ opacity: copyOpacity, y: copyY }}
        className="w-full max-w-3xl space-y-6"
      >
        <motion.div variants={scaleIn} className="flex justify-center">
          <BrandWordmark className="h-24 sm:h-28" priority />
        </motion.div>

        <motion.div variants={scaleIn} className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t("badge")}
          </span>
        </motion.div>

        <HeroHeadline title={t("title", { appName: siteName })} appName={siteName} />

        <motion.p
          variants={fadeUp}
          className="text-pretty text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto"
        >
          {t("subtitle")}
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6"
        >
          {user ? (
            <Button
              size="lg"
              onClick={() => {
                router.push(getLocalizedPath(ROUTES.dashboard, currentLocale));
              }}
              className="group w-full sm:w-auto shadow-lg shadow-primary/25"
            >
              {t("cta.dashboard")}
              <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                onClick={() => {
                  router.push(getLocalizedPath(ROUTES.register, currentLocale));
                }}
                className="group w-full sm:w-auto shadow-lg shadow-primary/25"
              >
                {t("cta.register")}
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  router.push(getLocalizedPath(ROUTES.login, currentLocale));
                }}
                className="w-full sm:w-auto"
              >
                {t("cta.login")}
              </Button>
            </>
          )}
        </motion.div>

        <HeroQuoteMock rotateX={mockRotateX} y={mockY} />
      </motion.div>
    </section>
  );
}
