"use client";

import { useState } from "react";

import { useTranslation } from "react-i18next";

import { ActivityTable } from "@/components/admin/activities/ActivityTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminUserActivities } from "@/hooks/api/use-admin";

const PAGE_SIZE = 20;

interface UserActivityCardProps {
  userId: string;
}

export function UserActivityCard({ userId }: UserActivityCardProps) {
  const { t } = useTranslation("admin");
  // "Show more" grows the window instead of paginating, mirroring the
  // sessions card — context stays on screen while older entries append.
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data: activities, isLoading } = useAdminUserActivities(userId, { limit });

  const rows = activities?.data ?? [];
  const total = activities?.total ?? 0;

  return (
    <Card className="border-border/50 bg-card/60">
      <CardHeader>
        <CardTitle className="text-base">{t("userDetail.activityTitle")}</CardTitle>
        <CardDescription>{t("userDetail.activityDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ActivityTable
          rows={rows}
          isLoading={isLoading}
          showUser={false}
          emptyLabel={t("userDetail.activityEmpty")}
        />
        {!isLoading && total > rows.length ? (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLimit((current) => current + PAGE_SIZE);
              }}
            >
              {t("userDetail.activityLoadMore")}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
