import { CommunicationContent } from "@/components/assistant/AssistantPages";
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
    pageKey: "assistantCommunication",
    pathname: ROUTES.adminAssistantCommunication,
  });
}

export default function AdminAssistantCommunicationPage() {
  return <CommunicationContent />;
}
