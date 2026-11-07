import { QuoteDetailContent } from "@/components/quotes/pages/QuotePages";
import { ROUTES } from "@/lib/config/routes";
import { buildMetadata, validateLocale } from "@/lib/seo/metadata";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale: validateLocale(locale),
    pageKey: "adminQuotes",
    pathname: ROUTES.adminQuotes,
  });
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminQuotesDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <QuoteDetailContent scope="admin" quoteId={id} />;
}
