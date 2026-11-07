"use client";

import { useRef, useState } from "react";

import { Form, Input } from "antd";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PermissionNote } from "@/components/admin/shared/PermissionNote";
import { FileUpload, type FileUploadHandle } from "@/components/common/file-upload";
import { Button } from "@/components/ui/button";
import { useCanUploadOwnFiles } from "@/hooks/use-permissions";
import { FILE_CATEGORY } from "@/lib/types/file";
import type { MessageCreatePayload } from "@/lib/types/support";
import { zodFieldRule } from "@/lib/validation/zodToAntdRule";
import { getReplySchema, type ReplyFormValues } from "@/schemas/support";

interface ReplyBoxProps {
  // The parent owns the mutation (user vs admin reply endpoint); ReplyBox just
  // collects the draft and resets once the submit resolves.
  onSubmit: (payload: MessageCreatePayload) => Promise<unknown>;
  isPending: boolean;
}

export function ReplyBox({ onSubmit, isPending }: ReplyBoxProps) {
  const { t } = useTranslation(["support", "validation"]);
  const { t: tUpload } = useTranslation("upload");
  const [form] = Form.useForm<ReplyFormValues>();
  const uploadRef = useRef<FileUploadHandle>(null);
  const canUpload = useCanUploadOwnFiles();
  const [isUploading, setIsUploading] = useState(false);
  const schema = getReplySchema(t);

  const busy = isPending || isUploading;

  const onFinish = async (values: ReplyFormValues) => {
    // Persist attachments first (Cloudinary + files table), then send the reply
    // with the returned ids — deferred upload, REVIEW §3.12. A failed upload
    // aborts before the reply is sent, keeping the draft for a retry.
    let attachmentFileIds: string[];
    try {
      setIsUploading(true);
      const uploaded = (await uploadRef.current?.flush()) ?? [];
      attachmentFileIds = uploaded.map((file) => file.id);
    } catch {
      return;
    } finally {
      setIsUploading(false);
    }

    try {
      await onSubmit({ body: values.body, attachment_file_ids: attachmentFileIds });
      form.resetFields();
      uploadRef.current?.reset();
    } catch {
      // The global toast surfaces the error; keep the draft for a retry.
    }
  };

  return (
    <Form form={form} onFinish={onFinish} className="space-y-3">
      <Form.Item name="body" rules={[zodFieldRule(schema.shape.body)]} className="mb-0">
        <Input.TextArea
          rows={2}
          placeholder={t("detail.replyPlaceholder")}
          maxLength={10000}
          disabled={busy}
        />
      </Form.Item>
      <div className="flex items-center justify-between gap-3">
        {canUpload ? (
          <FileUpload
            ref={uploadRef}
            category={FILE_CATEGORY.SUPPORT_ATTACHMENT}
            disabled={busy}
            variant="compact"
          />
        ) : (
          <PermissionNote text={tUpload("restricted")} />
        )}
        <Button type="submit" loading={busy}>
          <Send className="h-4 w-4" />
          {t("detail.send")}
        </Button>
      </div>
    </Form>
  );
}
