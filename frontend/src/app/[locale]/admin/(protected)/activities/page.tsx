import { ROUTES } from "@/lib/config/routes";
import { buildMetadata, validateLocale } from "@/lib/seo/metadata";
import { Permission } from "@/lib/types/permissions";

import { PermissionGate } from "../PermissionGate";
import { ActivitiesContent } from "./ActivitiesContent";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale: validateLocale(locale),
    pageKey: "adminActivities",
    pathname: ROUTES.adminActivities,
  });
}

export default function AdminActivitiesPage() {
  return (
    <PermissionGate permission={Permission.ActivitiesRead}>
      <ActivitiesContent />
    </PermissionGate>
  );
}
