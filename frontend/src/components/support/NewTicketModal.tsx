"use client";

import { useRef, useState } from "react";

import { Form, Input, Modal } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { PermissionNote } from "@/components/admin/shared/PermissionNote";
import { FileUpload, type FileUploadHandle } from "@/components/common/file-upload";
import { Button } from "@/components/ui/button";
import { useCreateTicket } from "@/hooks/api/use-support";
import { useCanUploadOwnFiles } from "@/hooks/use-permissions";
import { getLocaleFromPath, getLocalizedPath, ROUTES } from "@/lib/config/routes";
import { FILE_CATEGORY } from "@/lib/types/file";
import { zodFieldRule } from "@/lib/validation/zodToAntdRule";
import { getCreateTicketSchema, type CreateTicketFormValues } from "@/schemas/support";

interface NewTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewTicketModal({ open, onOpenChange }: NewTicketModalProps) {
  const { t } = useTranslation(["support", "validation"]);
  const [form] = Form.useForm<CreateTicketFormValues>();
  const uploadRef = useRef<FileUploadHandle>(null);
  const canUpload = useCanUploadOwnFiles();
  const { t: tUpload } = useTranslation("upload");
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { mutate: createTicket, isPending } = useCreateTicket();
  const schema = getCreateTicketSchema(t);

  const busy = isUploading || isPending;

  const close = () => {
    if (busy) return;
    form.resetFields();
    uploadRef.current?.reset();
    onOpenChange(false);
  };

  const onFinish = async (values: CreateTicketFormValues) => {
    // Persist attachments first (Cloudinary + files table), then create the
    // ticket with the returned ids — deferred upload, REVIEW §3.12. A failed
    // upload (global toast) aborts before the ticket is created, keeping drafts.
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

    createTicket(
      {
        subject: values.subject,
        body: values.body,
        attachment_file_ids: attachmentFileIds,
      },
      {
        onSuccess: (response) => {
          form.resetFields();
          uploadRef.current?.reset();
          onOpenChange(false);
          router.push(
            getLocalizedPath(
              `${ROUTES.support}/${response.ticket.id}`,
              getLocaleFromPath(pathname),
            ),
          );
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      title={t("new.title")}
      centered
      width={520}
      destroyOnHidden
      onCancel={close}
      mask={{ closable: !busy }}
      footer={null}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} className="mt-4">
        <Form.Item
          name="subject"
          label={t("new.subjectLabel")}
          rules={[zodFieldRule(schema.shape.subject)]}
        >
          <Input placeholder={t("new.subjectPlaceholder")} maxLength={200} disabled={busy} />
        </Form.Item>

        <Form.Item name="body" label={t("new.bodyLabel")} rules={[zodFieldRule(schema.shape.body)]}>
          <Input.TextArea
            rows={5}
            placeholder={t("new.bodyPlaceholder")}
            maxLength={10000}
            disabled={busy}
          />
        </Form.Item>

        <Form.Item label={t("new.attachments")}>
          {canUpload ? (
            <FileUpload
              ref={uploadRef}
              category={FILE_CATEGORY.SUPPORT_ATTACHMENT}
              disabled={busy}
            />
          ) : (
            <PermissionNote text={tUpload("restricted")} />
          )}
        </Form.Item>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={close} disabled={busy}>
            {t("new.cancel")}
          </Button>
          <Button type="submit" loading={busy}>
            {t("new.submit")}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
