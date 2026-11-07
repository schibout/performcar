"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { ROUTES, getLocalizedPath, getLocaleFromPath } from "@/lib/config/routes";

export function NotFound() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = getLocaleFromPath(pathname);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background px-4 text-center">
      <div className="relative flex flex-col items-center justify-center">
        <h1 className="text-8xl sm:text-9xl font-extrabold tracking-widest text-primary opacity-20 select-none">
          404
        </h1>
        <div
          className="absolute rotate-12 rounded bg-destructive px-2 py-0.5 text-xs sm:text-sm font-medium text-destructive-foreground"
          suppressHydrationWarning
        >
          {mounted ? t("common:page_not_found") : "404"}
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 max-w-lg w-full">
        <p className="text-xl sm:text-2xl font-semibold md:text-3xl" suppressHydrationWarning>
          {mounted ? t("common:lost_in_space") : "Lost in Space"}
        </p>
        <p
          className="text-sm sm:text-base text-muted-foreground w-full px-2"
          suppressHydrationWarning
        >
          {mounted
            ? t("common:not_found_description")
            : "The page you are looking for might have been removed or is temporarily unavailable."}
        </p>

        <div className="mt-6 flex flex-row items-center justify-center gap-3 w-full sm:w-auto px-4">
          <Button asChild variant="default" className="flex-1 sm:flex-none sm:w-32">
            <Link href={getLocalizedPath(ROUTES.home, currentLocale)} suppressHydrationWarning>
              {mounted ? t("common:go_home") : "Go Home"}
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              router.back();
            }}
            className="flex-1 sm:flex-none sm:w-32"
            suppressHydrationWarning
          >
            {mounted ? t("common:go_back") : "Go Back"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
