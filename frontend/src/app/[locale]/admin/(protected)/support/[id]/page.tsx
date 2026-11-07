import { ROUTES } from "@/lib/config/routes";
import { buildMetadata, validateLocale } from "@/lib/seo/metadata";

import { AdminTicketDetailContent } from "./AdminTicketDetailContent";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale: validateLocale(locale),
    pageKey: "adminTicketDetail",
    pathname: ROUTES.adminSupport,
  });
}

interface AdminTicketPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminTicketPage({ params }: AdminTicketPageProps) {
  const { id } = await params;
  return <AdminTicketDetailContent ticketId={id} />;
}
