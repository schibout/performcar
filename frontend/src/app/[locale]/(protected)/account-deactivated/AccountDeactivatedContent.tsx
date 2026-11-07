"use client";

import { useState } from "react";

import { AlertTriangle, LogOut, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLogoutMutation } from "@/hooks/api/use-auth";
import { useReactivateMe } from "@/hooks/api/use-users";
import { useLanguage } from "@/hooks/use-language";
import { getLocalizedPath, ROUTES } from "@/lib/config/routes";
import { formatLongDateTime } from "@/lib/format-date";
import { useAuthStore } from "@/stores/auth.store";

const MILLIS_IN_DAY = 1000 * 60 * 60 * 24;

export const AccountDeactivatedContent = () => {
  const { t } = useTranslation(["account"]);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { language } = useLanguage();
  const router = useRouter();
  const { mutate: reactivate, isPending: isReactivating } = useReactivateMe();
  const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation();

  // Freeze "now" at mount time via the lazy useState initializer so the
  // countdown is deterministic through the component's lifecycle.
  const [mountedAt] = useState<number>(() => Date.now());

  const scheduledAt = user?.deletion_scheduled_at;
  if (!user || !scheduledAt) {
    return <LoadingScreen />;
  }

  const deltaMs = new Date(scheduledAt).getTime() - mountedAt;
  const daysRemaining = Math.max(0, Math.ceil(deltaMs / MILLIS_IN_DAY));

  const onReactivate = () => {
    reactivate(undefined, {
      onSuccess: () => {
        // Optimistically clear the deletion fields so the redirect-guard
        // doesn't bounce the user back to this page while the /users/me
        // query is revalidating.
        setUser({
          ...user,
          is_active: true,
          deactivated_at: null,
          deletion_scheduled_at: null,
        });
        router.push(getLocalizedPath(ROUTES.dashboard, language));
      },
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-xl border-destructive/40 bg-destructive/5">
        <CardHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-center text-2xl">{t("account:deactivated.title")}</CardTitle>
          <CardDescription className="text-center">
            {t("account:deactivated.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-center">
          <p className="text-lg font-medium">
            {t("account:deactivated.daysRemaining", { count: daysRemaining })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("account:deactivated.scheduledAt", {
              date: formatLongDateTime(scheduledAt),
            })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("account:deactivated.reactivatePrompt")}
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            onClick={onReactivate}
            loading={isReactivating}
            disabled={isLoggingOut}
            className="w-full sm:w-auto"
          >
            {!isReactivating && <ShieldCheck className="mr-2 h-4 w-4" />}
            {isReactivating
              ? t("account:deactivated.reactivating")
              : t("account:deactivated.reactivate")}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              logout();
            }}
            loading={isLoggingOut}
            disabled={isReactivating}
            className="w-full sm:w-auto"
          >
            {!isLoggingOut && <LogOut className="mr-2 h-4 w-4" />}
            {t("account:deactivated.logout")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
