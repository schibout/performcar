import { ROUTES } from "@/lib/config/routes";
import { buildMetadata, validateLocale } from "@/lib/seo/metadata";

import { DashboardContent } from "./DashboardContent";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale: validateLocale(locale),
    pageKey: "adminDashboard",
    pathname: ROUTES.adminDashboard,
  });
}

export default function AdminDashboardPage() {
  return <DashboardContent />;
}
