import { AdminDealershipsContent } from "@/components/quotes/pages/QuotePages";
import { ROUTES } from "@/lib/config/routes";
import { buildMetadata, validateLocale } from "@/lib/seo/metadata";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale: validateLocale(locale),
    pageKey: "adminDealerships",
    pathname: ROUTES.adminDealerships,
  });
}

export default function AdminDealershipsPage() {
  return <AdminDealershipsContent />;
}
