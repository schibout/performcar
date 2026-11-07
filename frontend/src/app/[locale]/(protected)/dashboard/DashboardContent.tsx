"use client";

import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth.store";

export function DashboardContent() {
  const { t } = useTranslation("dashboard");
  const { user } = useAuthStore();

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-12">
      <div className="mx-auto w-full max-w-480 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t("title", "Dashboard")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("welcome", "Welcome back!")}</p>
        </div>

        {user && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
              <h3 className="font-medium text-foreground mb-4">
                {t("userInfo", "User Information")}
              </h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <span className="font-medium text-foreground">ID:</span> {user.id}
                </p>
                <p>
                  <span className="font-medium text-foreground">Email:</span> {user.email}
                </p>
              </div>
            </div>
            {/* Example skeleton for loading items */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border space-y-3">
              <Skeleton className="h-4 w-50" />
              <Skeleton className="h-4 w-37.5" />
              <Skeleton className="h-4 w-45" />
            </div>
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border space-y-3">
              <Skeleton className="h-4 w-25" />
              <Skeleton className="h-4 w-62.5" />
              <Skeleton className="h-4 w-50" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
