"use client";

import { useState } from "react";

import { User, Shield, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";
import { ProfileInfoTab } from "@/components/profile/ProfileInfoTab";
import { SecurityTab } from "@/components/profile/SecurityTab";
import { EASE_OUT, SPRING_SOFT } from "@/lib/motion/variants";
import { cn } from "@/lib/utils";

type ProfileTab = "info" | "security";

interface TabDef {
  key: ProfileTab;
  icon: LucideIcon;
  labelKey: string;
}

const TABS: TabDef[] = [
  { key: "info", icon: User, labelKey: "tabs.info" },
  { key: "security", icon: Shield, labelKey: "tabs.security" },
];

interface ProfileContentProps {
  // Hidden on the admin-panel profile so admins can't self-deactivate.
  showDangerZone?: boolean;
}

export function ProfileContent({ showDangerZone = true }: ProfileContentProps) {
  const { t } = useTranslation("profile");
  const [activeTab, setActiveTab] = useState<ProfileTab>("info");

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-12">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        >
          <ProfileIdentity />
        </motion.div>

        {/* Segmented control: the active pill slides between tabs */}
        <div
          role="tablist"
          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 p-1"
        >
          {TABS.map(({ key, icon: Icon, labelKey }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setActiveTab(key);
                }}
                className={cn(
                  "relative flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="profile-tab-pill"
                    transition={SPRING_SOFT}
                    className="absolute inset-0 -z-10 rounded-full border border-border/60 bg-card shadow-sm"
                  />
                )}
                <Icon className={cn("h-4 w-4", active && "text-primary")} />
                {t(labelKey)}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "info" && (
            <motion.div
              key="info-motion"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-6">
                <ProfileAvatar />
                <ProfileInfoTab />
              </div>
            </motion.div>
          )}

          {activeTab === "security" && (
            <motion.div
              key="security-motion"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <SecurityTab showDangerZone={showDangerZone} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
