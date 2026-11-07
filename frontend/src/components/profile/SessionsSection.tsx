"use client";

import { useState, type ReactNode } from "react";

import { LogOut, MonitorSmartphone, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/admin/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevokeOtherSessions, useRevokeSession, useSessions } from "@/hooks/api/use-sessions";
import { formatDateTime } from "@/lib/format-date";
import type { SessionItem } from "@/lib/types/session";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const MOBILE_OS = new Set(["iOS", "iPadOS", "Android"]);

interface DeviceIconProps {
  os: string | null;
}

const DeviceIcon = ({ os }: DeviceIconProps) => {
  const Icon = os && MOBILE_OS.has(os) ? Smartphone : MonitorSmartphone;
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
      <Icon className="h-5 w-5" />
    </span>
  );
};

interface SessionRowProps {
  session: SessionItem;
  disabled: boolean;
  onRevoke: (session: SessionItem) => void;
}

const SessionRow = ({ session, disabled, onRevoke }: SessionRowProps) => {
  const { t } = useTranslation("profile");

  const deviceLabel =
    session.browser && session.os
      ? t("sessions.deviceLabel", { browser: session.browser, os: session.os })
      : (session.browser ?? session.os ?? t("sessions.unknownDevice"));

  return (
    <li
      className={cn(
        "flex items-center gap-4 rounded-2xl border border-border/60 p-4",
        session.is_current && "border-primary/40 bg-primary/5",
      )}
    >
      <DeviceIcon os={session.os} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {deviceLabel}
          {session.is_current ? (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
              {t("sessions.currentBadge")}
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("sessions.lastActive", { date: formatDateTime(session.last_used_at) })}
        </p>
      </div>
      {!session.is_current ? (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={disabled}
          onClick={() => {
            onRevoke(session);
          }}
        >
          <LogOut className="h-4 w-4" />
          {t("sessions.revoke")}
        </Button>
      ) : null}
    </li>
  );
};

export const SessionsSection = () => {
  const { t } = useTranslation("profile");
  // "Load more" grows the page instead of paginating — a person's device
  // list is short, and keeping every row visible avoids losing context.
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading } = useSessions({ limit });
  const { mutate: revokeSession, isPending: isRevoking } = useRevokeSession();
  const { mutate: revokeOthers, isPending: isRevokingOthers } = useRevokeOtherSessions();
  const [confirmTarget, setConfirmTarget] = useState<SessionItem | null>(null);
  const [confirmOthersOpen, setConfirmOthersOpen] = useState(false);

  const sessions = data?.data ?? [];
  const total = data?.total ?? 0;
  const hasOthers = sessions.some((s) => !s.is_current);
  const busy = isRevoking || isRevokingOthers;

  const handleRevoke = () => {
    if (!confirmTarget) return;
    revokeSession(confirmTarget.id, {
      onSettled: () => {
        setConfirmTarget(null);
      },
    });
  };

  const handleRevokeOthers = () => {
    revokeOthers(undefined, {
      onSettled: () => {
        setConfirmOthersOpen(false);
      },
    });
  };

  let content: ReactNode;
  if (isLoading) {
    content = (
      <div className="space-y-3">
        {[0, 1].map((row) => (
          <Skeleton key={row} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    );
  } else if (sessions.length === 0) {
    content = (
      <p className="py-4 text-center text-sm text-muted-foreground">{t("sessions.empty")}</p>
    );
  } else {
    content = (
      <ul className="space-y-3">
        {sessions.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            disabled={busy}
            onRevoke={setConfirmTarget}
          />
        ))}
      </ul>
    );
  }

  return (
    <Card className="rounded-3xl border-border/60 bg-card/70 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <MonitorSmartphone className="h-5 w-5" />
          </span>
          {t("sessions.title")}
        </CardTitle>
        <CardDescription>{t("sessions.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {content}

        {!isLoading && total > sessions.length ? (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLimit((current) => current + PAGE_SIZE);
              }}
            >
              {t("sessions.loadMore")}
            </Button>
          </div>
        ) : null}

        {hasOthers ? (
          <div className="flex justify-end border-t border-border/60 pt-4">
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={busy}
              onClick={() => {
                setConfirmOthersOpen(true);
              }}
            >
              <LogOut className="h-4 w-4" />
              {t("sessions.revokeOthers")}
            </Button>
          </div>
        ) : null}
      </CardContent>

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null);
        }}
        title={t("sessions.confirmRevoke.title")}
        description={t("sessions.confirmRevoke.description")}
        confirmLabel={t("sessions.confirmRevoke.confirm")}
        cancelLabel={t("sessions.confirmRevoke.cancel")}
        onConfirm={handleRevoke}
        isLoading={isRevoking}
        destructive
      />

      <ConfirmDialog
        open={confirmOthersOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmOthersOpen(false);
        }}
        title={t("sessions.confirmRevokeOthers.title")}
        description={t("sessions.confirmRevokeOthers.description")}
        confirmLabel={t("sessions.confirmRevokeOthers.confirm")}
        cancelLabel={t("sessions.confirmRevokeOthers.cancel")}
        onConfirm={handleRevokeOthers}
        isLoading={isRevokingOthers}
        destructive
      />
    </Card>
  );
};
