"use client";

import { useState } from "react";

import { Form } from "antd";
import { User, Edit2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PermissionNote } from "@/components/admin/shared/PermissionNote";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUpdateMe } from "@/hooks/api/use-users";
import { useCanUpdateOwnProfile } from "@/hooks/use-permissions";
import { type ProfileFormValues } from "@/schemas/user";
import { useAuthStore } from "@/stores/auth.store";

import { ProfileFormFields } from "./ProfileFormFields";

export const ProfileInfoTab = () => {
  const { t } = useTranslation(["profile", "validation", "common"]);
  const { user, setUser } = useAuthStore();
  const { mutate: updateMe, isPending: isLoading } = useUpdateMe();
  const [isEditing, setIsEditing] = useState(false);
  const canUpdate = useCanUpdateOwnProfile();

  const initialValues: ProfileFormValues = {
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    title: user?.title || "",
  };

  const [form] = Form.useForm<ProfileFormValues>();

  const onFinish = (values: ProfileFormValues) => {
    updateMe(values, {
      onSuccess: (updatedUser) => {
        setUser(updatedUser);
        setIsEditing(false);
      },
    });
  };

  const handleCancel = () => {
    form.setFieldsValue(initialValues);
    setIsEditing(false);
  };

  return (
    <Card className="rounded-3xl border-border/60 bg-card/70 backdrop-blur-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-xl flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <User className="h-5 w-5" />
            </span>
            {t("info.title")}
          </CardTitle>
          <CardDescription>{t("info.description")}</CardDescription>
        </div>
        {!isEditing && canUpdate && (
          <Button
            variant="outline"
            onClick={() => {
              setIsEditing(true);
            }}
            className="rounded-full px-4 h-9 gap-2 hover:bg-primary/5 hover:text-primary transition-colors flex shrink-0"
          >
            <Edit2 className="h-3.5 w-3.5" />
            {t("common:buttons.edit")}
          </Button>
        )}
      </CardHeader>
      <Form<ProfileFormValues>
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={initialValues}
        requiredMark={false}
      >
        <ProfileFormFields isEditing={isEditing} isLoading={isLoading} t={t} user={user} />

        {!canUpdate && <PermissionNote text={t("restricted")} className="px-6 pb-6" />}

        {isEditing && (
          <div className="flex flex-col gap-3 px-6 pb-6 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="gap-2"
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
              {t("common:buttons.cancel")}
            </Button>
            <Button type="submit" loading={isLoading} className="min-w-30">
              {isLoading ? t("info.submitting") : t("info.submit")}
            </Button>
          </div>
        )}
      </Form>
    </Card>
  );
};
