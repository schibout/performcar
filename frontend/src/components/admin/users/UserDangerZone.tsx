"use client";

import { Ban, KeyRound, LockOpen, RotateCcw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserActionKind } from "@/hooks/api/use-user-actions";
import type { AdminUser } from "@/lib/types/admin";

import {
  NO_ADMIN_TIER_CAPS,
  capsForTarget,
  type AdminTierCaps,
  type UserActionCaps,
} from "./target-caps";

interface UserDangerZoneProps {
  user: AdminUser;
  isSelf: boolean;
  disabled: boolean;
  caps: UserActionCaps;
  // The viewer's admin-tier keys, needed when the target is an admin account.
  adminTier?: AdminTierCaps;
  onAction: (kind: UserActionKind) => void;
}

export function UserDangerZone({
  user,
  isSelf,
  disabled,
  caps: viewerCaps,
  adminTier = NO_ADMIN_TIER_CAPS,
  onAction,
}: UserDangerZoneProps) {
  const { t } = useTranslation("admin");
  const caps = capsForTarget(viewerCaps, user.role, adminTier);

  // Nothing destructive is permitted — omit the section entirely rather than
  // showing disabled buttons that would never fire a request.
  if (!caps.canResetPassword && !caps.canSuspend && !caps.canDelete && !caps.canUnlock) {
    return null;
  }

  return (
    <Card data-testid="admin-user-danger-zone" className="border-destructive/30 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-base text-destructive">{t("userDetail.dangerTitle")}</CardTitle>
        <CardDescription>{t("userDetail.dangerDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {caps.canResetPassword ? (
          <Button
            variant="outline"
            onClick={() => {
              onAction("change-password");
            }}
            disabled={disabled}
          >
            <KeyRound className="mr-2 h-4 w-4" />
            {t("userDetail.changePassword")}
          </Button>
        ) : null}
        {caps.canUnlock ? (
          <Button
            variant="outline"
            onClick={() => {
              onAction("unlock");
            }}
            disabled={disabled}
          >
            <LockOpen className="mr-2 h-4 w-4" />
            {t("userDetail.unlock")}
          </Button>
        ) : null}
        {caps.canSuspend &&
          (user.suspended_at ? (
            <Button
              variant="outline"
              onClick={() => {
                onAction("unsuspend");
              }}
              disabled={disabled}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {t("userDetail.unsuspend")}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                onAction("suspend");
              }}
              disabled={disabled || isSelf}
            >
              <Ban className="mr-2 h-4 w-4" />
              {t("userDetail.suspend")}
            </Button>
          ))}
        {caps.canDelete ? (
          <Button
            variant="destructive"
            onClick={() => {
              onAction("delete");
            }}
            disabled={disabled || isSelf}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("userDetail.delete")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
