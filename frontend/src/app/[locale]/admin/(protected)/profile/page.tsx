import { ProfileContent } from "@/app/[locale]/(protected)/profile/ProfileContent";
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
    pageKey: "profile",
    pathname: ROUTES.adminProfile,
  });
}

// Admins/superadmins edit their own account here, inside the admin shell. Self
// deactivation (DangerZone) is hidden — admin lifecycle is managed by a
// superadmin, and a root self-deactivating would orphan the system.
export default function AdminProfile() {
  return <ProfileContent showDangerZone={false} />;
}
