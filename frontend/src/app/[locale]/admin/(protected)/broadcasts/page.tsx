import { ROUTES } from "@/lib/config/routes";
import { buildMetadata, validateLocale } from "@/lib/seo/metadata";

import { BroadcastsContent } from "./BroadcastsContent";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale: validateLocale(locale),
    pageKey: "adminBroadcasts",
    pathname: ROUTES.adminBroadcasts,
  });
}

export default function AdminBroadcastsPage() {
  return <BroadcastsContent />;
}
