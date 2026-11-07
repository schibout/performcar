import { ROUTES } from "@/lib/config/routes";
import { buildMetadata, validateLocale } from "@/lib/seo/metadata";
import { Permission } from "@/lib/types/permissions";

import { PermissionGate } from "../PermissionGate";
import { UsersContent } from "./UsersContent";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale: validateLocale(locale),
    pageKey: "adminUsers",
    pathname: ROUTES.adminUsers,
  });
}

export default function AdminUsersPage() {
  return (
    <PermissionGate permission={Permission.UsersRead}>
      <UsersContent />
    </PermissionGate>
  );
}
