import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AccountEventsBridge } from "@/components/common/AccountEventsBridge";
import { ROUTES, getLocalizedPath } from "@/lib/config/routes";

interface ProtectedLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Protected Layout
 * This layout is used for pages that require authentication.
 * It provides a server-side check for the access_token cookie.
 * Even though the proxy (middleware) handles redirections, this
 * provides an extra layer of security as recommended by Next.js.
 */
export default async function ProtectedLayout({ children, params }: ProtectedLayoutProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    redirect(getLocalizedPath(ROUTES.login, locale));
  }

  return (
    <>
      <AccountEventsBridge />
      {children}
    </>
  );
}
