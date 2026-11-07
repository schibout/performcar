import { ROUTES } from "@/lib/config/routes";
import { buildMetadata, validateLocale } from "@/lib/seo/metadata";

import { TicketDetailContent } from "./TicketDetailContent";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale: validateLocale(locale),
    pageKey: "support",
    pathname: ROUTES.support,
  });
}

interface SupportTicketPageProps {
  params: Promise<{ id: string }>;
}

export default async function SupportTicketPage({ params }: SupportTicketPageProps) {
  const { id } = await params;
  return <TicketDetailContent ticketId={id} />;
}
