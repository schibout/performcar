"use client";

import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

interface PermissionNoteProps {
  /** Override the default "you lack permission" copy. */
  text?: string;
  className?: string;
}

// A small muted hint shown where an action/section is hidden because the admin
// lacks the permission — it makes the absence intentional ("no request is
// sent") rather than looking like a broken screen.
export function PermissionNote({ text, className }: PermissionNoteProps) {
  const { t } = useTranslation("admin");
  return (
    <p className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <Lock className="h-3.5 w-3.5 shrink-0" />
      {text ?? t("permissions.restricted")}
    </p>
  );
}
