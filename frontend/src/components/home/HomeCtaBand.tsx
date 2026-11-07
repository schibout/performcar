"use client";

import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { getLocaleFromPath, ROUTES, getLocalizedPath } from "@/lib/config/routes";
import { scaleIn } from "@/lib/motion/variants";
import { useAuthStore } from "@/stores/auth.store";

// Closing call-to-action panel; pops in with a spring when scrolled to.
export function HomeCtaBand() {
  const { t } = useTranslation("home");
  const { user } = useAuthStore();
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);
  const router = useRouter();

  const target = user ? ROUTES.dashboard : ROUTES.register;
  const label = user ? t("cta.dashboard") : t("ctaBand.button");

  return (
    <section className="py-24">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <motion.div
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          className="relative overflow-hidden rounded-3xl p-px shadow-xl shadow-primary/10"
        >
          {/* Orbiting conic highlight behind the 1px padding = animated border */}
          <div
            aria-hidden
            className="animate-border-spin absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0deg,var(--primary)_55deg,transparent_110deg)] opacity-70"
          />
          <div className="mesh-glow texture-grain relative overflow-hidden rounded-3xl border border-primary/15 bg-card px-6 py-16 text-center sm:px-16">
            <h2 className="text-balance text-3xl sm:text-4xl font-semibold">
              {t("ctaBand.title")}
            </h2>
            <p className="text-pretty mx-auto mt-4 max-w-xl text-muted-foreground">
              {t("ctaBand.desc")}
            </p>
            <Button
              size="lg"
              onClick={() => {
                router.push(getLocalizedPath(target, currentLocale));
              }}
              className="mt-8 shadow-lg shadow-primary/25"
            >
              {label}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
