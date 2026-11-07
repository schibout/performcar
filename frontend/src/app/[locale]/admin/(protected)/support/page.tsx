import { ROUTES } from "@/lib/config/routes";
import { buildMetadata, validateLocale } from "@/lib/seo/metadata";
import { Permission } from "@/lib/types/permissions";

import { PermissionGate } from "../PermissionGate";
import { AdminSupportContent } from "./AdminSupportContent";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale: validateLocale(locale),
    pageKey: "adminSupport",
    pathname: ROUTES.adminSupport,
  });
}

export default function AdminSupportPage() {
  return (
    <PermissionGate permission={Permission.SupportRead}>
      <AdminSupportContent />
    </PermissionGate>
  );
}
