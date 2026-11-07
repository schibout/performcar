import { ROUTES } from "@/lib/config/routes";
import { buildMetadata, validateLocale } from "@/lib/seo/metadata";

import { PermissionSetsContent } from "./PermissionSetsContent";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale: validateLocale(locale),
    pageKey: "adminPermissionSets",
    pathname: ROUTES.adminPermissionSets,
  });
}

export default function AdminPermissionSetsPage() {
  return <PermissionSetsContent />;
}
