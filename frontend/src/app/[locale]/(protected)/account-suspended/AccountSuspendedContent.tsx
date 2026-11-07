"use client";

import { Ban, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";

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

// Landing page shown when login is refused with ``error.account.suspended`` or
// when a still-authenticated user's session is flagged as suspended. The only
// action offered is logout — suspended accounts cannot self-recover, so we
// deliberately omit any reactivate / retry affordance.
export const AccountSuspendedContent = () => {
  const { t } = useTranslation(["account"]);
  const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <Card
        data-testid="account-suspended-card"
        className="w-full max-w-xl border-destructive/40 bg-destructive/5"
      >
        <CardHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Ban className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-center text-2xl">{t("account:suspended.title")}</CardTitle>
          <CardDescription className="text-center">
            {t("account:suspended.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          {t("account:suspended.contactSupport")}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              logout();
            }}
            loading={isLoggingOut}
            data-testid="account-suspended-logout"
          >
            {!isLoggingOut && <LogOut className="mr-2 h-4 w-4" />}
            {t("account:suspended.logout")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
