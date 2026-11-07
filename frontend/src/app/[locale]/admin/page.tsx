import { redirect } from "next/navigation";

import { ROUTES, getLocalizedPath } from "@/lib/config/routes";

interface AdminIndexPageProps {
  params: Promise<{ locale: string }>;
}

// /admin is not a real page — send visitors straight into the admin shell.
// The protected layout then redirects unauthenticated users to /admin/login.
export default async function AdminIndexPage({ params }: AdminIndexPageProps) {
  const { locale } = await params;
  redirect(getLocalizedPath(ROUTES.adminDashboard, locale));
}
