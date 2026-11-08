import { AssistantContent } from "@/components/assistant/AssistantPages";
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
    pageKey: "assistant",
    pathname: ROUTES.adminAssistant,
  });
}

export default function AdminAssistantPage() {
  return <AssistantContent />;
}
