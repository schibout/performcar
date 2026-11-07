"use client";

import { Activity, ShieldCheck, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { PermissionNote } from "@/components/admin/shared/PermissionNote";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminStats } from "@/hooks/api/use-admin";
import { useCanReadActivities, useCanReadStats, useCanReadUsers } from "@/hooks/use-permissions";
import { ROUTES, getLocaleFromPath, getLocalizedPath } from "@/lib/config/routes";

const StatCard = ({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  loading?: boolean;
}) => (
  <Card className="border-border/50 bg-card/60">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
      )}
    </CardContent>
  </Card>
);

export function DashboardContent() {
  const { t } = useTranslation("admin");
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);

  const canReadStats = useCanReadStats();
  const canReadUsers = useCanReadUsers();
  const canReadActivities = useCanReadActivities();

  const { data: stats, isLoading } = useAdminStats(canReadStats);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {t("dashboard.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      {canReadStats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t("dashboard.stats.totalUsers")}
            value={stats?.users_total ?? 0}
            icon={Users}
            loading={isLoading}
          />
          <StatCard
            label={t("dashboard.stats.activeUsers")}
            value={stats?.users_active ?? 0}
            icon={UserCheck}
            loading={isLoading}
          />
          <StatCard
            label={t("dashboard.stats.admins")}
            value={stats?.users_admins ?? 0}
            icon={ShieldCheck}
            loading={isLoading}
          />
          <StatCard
            label={t("dashboard.stats.activitiesToday")}
            value={stats?.activities_today ?? 0}
            icon={Activity}
            loading={isLoading}
          />
        </div>
      ) : (
        <PermissionNote />
      )}

      <div className="flex flex-wrap gap-2">
        {canReadUsers ? (
          <Button asChild variant="outline">
            <Link href={getLocalizedPath(ROUTES.adminUsers, currentLocale)}>
              {t("dashboard.viewAllUsers")}
            </Link>
          </Button>
        ) : null}
        {canReadActivities ? (
          <Button asChild variant="outline">
            <Link href={getLocalizedPath(ROUTES.adminActivities, currentLocale)}>
              {t("dashboard.viewAllActivity")}
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
