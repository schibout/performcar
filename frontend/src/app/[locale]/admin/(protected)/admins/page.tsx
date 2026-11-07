import { ROUTES } from "@/lib/config/routes";
import { buildMetadata, validateLocale } from "@/lib/seo/metadata";

import { AdminsContent } from "./AdminsContent";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale: validateLocale(locale),
    pageKey: "adminAdmins",
    pathname: ROUTES.adminAdmins,
  });
}

export default function AdminAdminsPage() {
  return <AdminsContent />;
}
