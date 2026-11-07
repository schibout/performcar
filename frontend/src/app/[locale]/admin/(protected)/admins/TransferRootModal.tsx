"use client";

import { useState } from "react";

import { Input, Modal, Select } from "antd";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useConfirmTransferRoot, useTransferRoot } from "@/hooks/api/use-admin";
import type { AdminListItem } from "@/lib/types/admin";

interface TransferRootModalProps {
  // Eligible recipients: non-root superadmins (root status can only move within
  // the superadmin tier).
  targets: AdminListItem[];
  open: boolean;
  onClose: () => void;
}

const OTP_LENGTH = 6;

export function TransferRootModal({ targets, open, onClose }: TransferRootModalProps) {
  const { t } = useTranslation("admin");
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const transfer = useTransferRoot();
  const confirm = useConfirmTransferRoot();

  const busy = transfer.isPending || confirm.isPending;

  const reset = () => {
    setStep("select");
    setTargetId(null);
    setCode("");
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const handleSend = () => {
    if (!targetId) return;
    transfer.mutate(
      { user_id: targetId },
      {
        onSuccess: () => {
          setStep("confirm");
        },
      },
    );
  };

  const handleConfirm = () => {
    if (code.trim().length < OTP_LENGTH) return;
    confirm.mutate(
      { code: code.trim() },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      title={t("admins.transferRoot.title")}
      centered
      width={520}
      destroyOnHidden
      onCancel={close}
      mask={{ closable: !busy }}
      footer={null}
    >
      {step === "select" ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("admins.transferRoot.description")}</p>
          <div className="space-y-2">
            <label htmlFor="root-target" className="text-sm font-medium">
              {t("admins.transferRoot.targetLabel")}
            </label>
            <Select
              id="root-target"
              className="w-full"
              placeholder={t("admins.transferRoot.targetPlaceholder")}
              value={targetId ?? undefined}
              onChange={(value: string) => {
                setTargetId(value);
              }}
              options={targets.map((admin) => ({ value: admin.id, label: admin.email }))}
              disabled={busy}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close} disabled={busy}>
              {t("admins.transferRoot.cancel")}
            </Button>
            <Button disabled={!targetId || busy} loading={transfer.isPending} onClick={handleSend}>
              {t("admins.transferRoot.send")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("admins.transferRoot.sentNote")}</p>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("admins.transferRoot.codeLabel")}</p>
            <Input.OTP
              length={OTP_LENGTH}
              value={code}
              onChange={(value) => {
                setCode(value);
              }}
              disabled={confirm.isPending}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close} disabled={confirm.isPending}>
              {t("admins.transferRoot.cancel")}
            </Button>
            <Button
              disabled={code.trim().length < OTP_LENGTH || confirm.isPending}
              loading={confirm.isPending}
              onClick={handleConfirm}
            >
              {t("admins.transferRoot.confirm")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
