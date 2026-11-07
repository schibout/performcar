import { ROUTES } from "@/lib/config/routes";
import { buildMetadata, validateLocale } from "@/lib/seo/metadata";

import { ForgotPasswordContent } from "./ForgotPasswordContent";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale: validateLocale(locale),
    pageKey: "forgotPassword",
    pathname: ROUTES.forgotPassword,
  });
}

export default function ForgotPassword() {
  return <ForgotPasswordContent />;
}
