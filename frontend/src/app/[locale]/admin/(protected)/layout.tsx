import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ROUTES, getLocalizedPath } from "@/lib/config/routes";

import { AdminShell } from "./AdminShell";

interface AdminProtectedLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

// Server-side the only thing we can cheaply assert is that an access_token
// cookie is present — that's enough to short-circuit unauthenticated visitors
// before shipping the admin bundle. Role enforcement lives in two other,
// load-bearing places:
//   1. AdminShell's client-side /users/me hydration redirects non-admins to
//      /dashboard before the admin UI is interactive.
//   2. The backend rejects every admin API call that isn't from an admin
//      role with a 403 — this is the only layer a real attacker can't bypass.
// An SSR /users/me round-trip would be pure defense-in-depth, at the cost of
// an extra server→backend hop on every admin navigation.
export default async function AdminProtectedLayout({
  children,
  params,
}: AdminProtectedLayoutProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    redirect(getLocalizedPath(ROUTES.adminLogin, locale));
  }

  return <AdminShell>{children}</AdminShell>;
}
