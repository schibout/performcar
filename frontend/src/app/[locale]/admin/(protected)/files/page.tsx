import { ROUTES } from "@/lib/config/routes";
import { buildMetadata, validateLocale } from "@/lib/seo/metadata";
import { Permission } from "@/lib/types/permissions";

import { PermissionGate } from "../PermissionGate";
import { FilesContent } from "./FilesContent";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale: validateLocale(locale),
    pageKey: "adminFiles",
    pathname: ROUTES.adminFiles,
  });
}

export default function AdminFilesPage() {
  return (
    <PermissionGate permission={Permission.FilesRead}>
      <FilesContent />
    </PermissionGate>
  );
}
