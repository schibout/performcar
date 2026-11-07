"use client";

import { User as UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/hooks/use-language";
import { useAuthStore } from "@/stores/auth.store";

// Identity band at the top of the profile page: ringed avatar, display name,
// email and small chips (title + member-since) over a soft glow.
export const ProfileIdentity = () => {
  const { t } = useTranslation("profile");
  const { user } = useAuthStore();
  const { language } = useLanguage();

  if (!user) return null;

  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  const joined = new Date(user.created_at).toLocaleDateString(
    language === "fr" ? "fr-FR" : "en-US",
    { year: "numeric", month: "long" },
  );

  return (
    <div className="mesh-glow texture-grain relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur-md sm:p-8">
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <span className="shrink-0 rounded-full bg-gradient-to-br from-primary to-primary/40 p-1">
          <Avatar className="h-20 w-20 border-4 border-background">
            {user.avatar_file?.url && <AvatarImage src={user.avatar_file.url} alt={user.email} />}
            <AvatarFallback className="bg-primary/10 text-2xl text-primary">
              {user.first_name?.charAt(0).toUpperCase() || <UserIcon className="h-8 w-8" />}
            </AvatarFallback>
          </Avatar>
        </span>

        <div className="min-w-0">
          <h1 className="truncate text-3xl font-semibold tracking-tight">
            {fullName || t("title")}
          </h1>
          <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>

          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            {user.title ? (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {user.title}
              </span>
            ) : null}
            <span className="rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              {t("memberSince", { date: joined })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
