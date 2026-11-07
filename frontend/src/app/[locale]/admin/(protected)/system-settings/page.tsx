import { ROUTES } from "@/lib/config/routes";
import { buildMetadata, validateLocale } from "@/lib/seo/metadata";

import { SystemSettingsContent } from "./SystemSettingsContent";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale: validateLocale(locale),
    pageKey: "adminSystemSettings",
    pathname: ROUTES.adminSystemSettings,
  });
}

export default function AdminSystemSettingsPage() {
  return <SystemSettingsContent />;
}
