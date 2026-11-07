import { type LucideIcon } from "lucide-react";
import { motion } from "motion/react";

import { BrandWordmark } from "@/components/common/BrandWordmark";
import { SPRING_SOFT } from "@/lib/motion/variants";

interface AuthHeaderProps {
  t: (key: string) => string;
  titleKey: string;
  subtitleKey: string;
  icon: LucideIcon;
}

export function AuthHeader({ t, titleKey, subtitleKey, icon: Icon }: AuthHeaderProps) {
  return (
    <div className="mb-8 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ delay: 0.15, ...SPRING_SOFT }}
        className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/75 text-primary-foreground shadow-lg shadow-primary/30"
      >
        <Icon className="h-7 w-7" />
      </motion.div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{t(titleKey)}</h1>
      <p className="text-muted-foreground mt-3">{t(subtitleKey)}</p>
    </div>
  );
}
