import { ROUTES } from "@/lib/config/routes";
import { buildMetadata, validateLocale } from "@/lib/seo/metadata";

import { RolesContent } from "./RolesContent";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale: validateLocale(locale),
    pageKey: "adminRoles",
    pathname: ROUTES.adminRoles,
  });
}

export default function AdminRolesPage() {
  return <RolesContent />;
}
