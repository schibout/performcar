import { ROUTES } from "@/lib/config/routes";
import { buildMetadata, validateLocale } from "@/lib/seo/metadata";

import { AdminNotificationsContent } from "./AdminNotificationsContent";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale: validateLocale(locale),
    pageKey: "adminNotifications",
    pathname: ROUTES.adminNotifications,
  });
}

// No PermissionGate: the inbox is personal — every admin sees only their own
// notifications, so there is no RBAC resource to gate.
export default function AdminNotificationsPage() {
  return <AdminNotificationsContent />;
}
