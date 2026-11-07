import { ROUTES } from "@/lib/config/routes";
import { buildMetadata, validateLocale } from "@/lib/seo/metadata";

import { ProfileContent } from "./ProfileContent";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale: validateLocale(locale),
    pageKey: "profile",
    pathname: ROUTES.profile,
  });
}

export default function Profile() {
  return <ProfileContent />;
}
