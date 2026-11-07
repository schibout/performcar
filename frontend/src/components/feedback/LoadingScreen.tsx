"use client";

import { useTranslation } from "react-i18next";

import { MorphingSquare } from "@/components/feedback/MorphingSquare";
import { cn } from "@/lib/utils";

export function LoadingScreen({
  message,
  fullScreen = true,
}: {
  message?: string;
  fullScreen?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center bg-background text-foreground transition-colors",
        fullScreen ? "h-screen w-full" : "py-10 w-full",
      )}
    >
      <MorphingSquare message={message ?? t("common:loading")} messagePlacement="bottom" />
    </div>
  );
}
