"use client";

import { useState } from "react";

import { Drawer, Modal } from "antd";
import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { useActiveAnnouncement } from "@/hooks/api/use-broadcasts";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { dismissAnnouncement, isAnnouncementDismissed } from "@/lib/announcement-dismissed";
import { announcementBody, announcementTitle } from "@/lib/announcement-render";
import { getPathWithoutLocale, isAdminPath, matchesRoute, ROUTES } from "@/lib/config/routes";
import type { AnnouncementLevel } from "@/lib/types/announcement";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";

import type { Transition } from "motion/react";

// Solid, high-contrast fills so every level reads clearly in light AND dark mode
// (a faint tint disappears on a light background). Text colour rides along so
// the inner spans can simply inherit it.
const LEVEL_STYLE: Record<AnnouncementLevel, string> = {
  info: "bg-primary text-primary-foreground",
  warning: "bg-yellow-400 text-yellow-950",
  critical: "bg-destructive text-destructive-foreground",
};

// Springy entrance/exit for the desktop strip — a gentle, unhurried overshoot
// in, sliding back up on dismiss. Lower stiffness = slower; mass adds weight.
const STRIP_SPRING: Transition = { type: "spring", stiffness: 170, damping: 20, mass: 1.1 };

interface BannerStripProps {
  level: AnnouncementLevel;
  title: string;
  body: string;
  onDismiss: () => void;
}

function BannerStrip({ level, title, body, onDismiss }: BannerStripProps) {
  const { t } = useTranslation("broadcasts");
  const reduce = useReducedMotion();
  const [detailOpen, setDetailOpen] = useState(false);
  return (
    <>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: -28 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -28 }}
        transition={reduce ? undefined : STRIP_SPRING}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-2.5 text-sm sm:px-6",
          LEVEL_STYLE[level],
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          <span className="font-semibold">{title}</span>
          {body ? <span className="opacity-90"> — {body}</span> : null}
        </span>
        {body ? (
          <button
            type="button"
            onClick={() => {
              setDetailOpen(true);
            }}
            className="shrink-0 text-xs font-medium underline underline-offset-2"
          >
            {t("banner.details")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t("banner.dismiss")}
          className="shrink-0 rounded-md p-1 transition-colors hover:bg-black/10"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
      <Modal
        open={detailOpen}
        title={title}
        footer={null}
        centered
        onCancel={() => {
          setDetailOpen(false);
        }}
      >
        <p className="text-sm whitespace-pre-line text-muted-foreground">{body}</p>
      </Modal>
    </>
  );
}

interface BannerSheetProps extends BannerStripProps {
  open: boolean;
  onClosed: () => void;
}

function BannerSheet({ open, level, title, body, onDismiss, onClosed }: BannerSheetProps) {
  const { t } = useTranslation("broadcasts");
  return (
    <Drawer
      open={open}
      placement="bottom"
      closable={false}
      onClose={onDismiss}
      afterOpenChange={(o) => {
        if (!o) onClosed();
      }}
    >
      <div className={cn("space-y-2 rounded-xl p-4", LEVEL_STYLE[level])}>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm whitespace-pre-line opacity-90">{body}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-4 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        {t("banner.dismiss")}
      </button>
    </Drawer>
  );
}

export function AnnouncementBanner() {
  const { t, i18n } = useTranslation("broadcasts");
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isMobile = useIsMobile();
  const { data } = useActiveAnnouncement(isAuthenticated);
  const [closedId, setClosedId] = useState<string | null>(null);

  const announcement = data?.announcement ?? null;
  const path = getPathWithoutLocale(pathname);
  const chromeFree = isAdminPath(path) || matchesRoute(path, ROUTES.accountSuspended);

  // Persisted dismissal is written only AFTER the exit animation (below), so a
  // still-eligible announcement keeps rendering long enough to animate out.
  const eligible = !!announcement && !chromeFree && !isAnnouncementDismissed(announcement.id);
  if (!eligible) return null;

  const open = closedId !== announcement.id;
  const lang = (i18n.language.split("-")[0] ?? "en") as "en" | "fr";
  const view = {
    level: announcement.level,
    title: announcementTitle(t, lang, announcement),
    body: announcementBody(t, lang, announcement),
    onDismiss: () => {
      setClosedId(announcement.id);
    },
  };
  const persist = () => {
    dismissAnnouncement(announcement.id);
  };

  if (isMobile) {
    return <BannerSheet open={open} onClosed={persist} {...view} />;
  }
  return (
    <AnimatePresence onExitComplete={persist}>
      {open ? <BannerStrip key={announcement.id} {...view} /> : null}
    </AnimatePresence>
  );
}
