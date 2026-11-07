"use client";

import { ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PermissionNote } from "@/components/admin/shared/PermissionNote";
import { AvatarUpload } from "@/components/common/file-upload";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUpdateMe } from "@/hooks/api/use-users";
import { useCanUpdateOwnProfile, useCanUploadOwnFiles } from "@/hooks/use-permissions";
import type { FilePublic } from "@/lib/types/file";
import { useAuthStore } from "@/stores/auth.store";

export const ProfileAvatar = () => {
  const { t } = useTranslation("profile");
  const { user, setUser } = useAuthStore();
  const { mutate: updateMe } = useUpdateMe();
  const canUpload = useCanUploadOwnFiles();
  const canUpdateProfile = useCanUpdateOwnProfile();
  // Picking a photo needs the upload key; attaching it needs the profile key.
  let restrictedText: string | null = null;
  if (!canUpload) restrictedText = t("avatar.uploadRestricted");
  else if (!canUpdateProfile) restrictedText = t("restricted");

  const handleChange = (file: FilePublic | null) => {
    updateMe(
      { avatar_file_id: file?.id ?? null },
      {
        onSuccess: (updatedUser) => {
          setUser(updatedUser);
        },
      },
    );
  };

  return (
    <Card className="rounded-3xl border-border/60 bg-card/70 backdrop-blur-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <ImageIcon className="h-5 w-5" />
          </span>
          {t("avatar.title")}
        </CardTitle>
        <CardDescription>{t("avatar.description")}</CardDescription>
      </CardHeader>
      <div className="flex justify-center px-6 pb-6">
        <AvatarUpload
          value={user?.avatar_file ?? null}
          onChange={handleChange}
          disabled={restrictedText !== null}
          removeDisabled={!canUpdateProfile}
        />
      </div>
      {restrictedText ? <PermissionNote text={restrictedText} className="px-6 pb-6" /> : null}
    </Card>
  );
};
