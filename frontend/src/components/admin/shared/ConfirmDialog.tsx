"use client";

import { Button as AntdButton, Modal } from "antd";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  isLoading?: boolean;
  destructive?: boolean;
  // Extra content under the description, e.g. why the last attempt was refused.
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  isLoading = false,
  destructive = false,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      centered
      onCancel={() => {
        if (!isLoading) onOpenChange(false);
      }}
      mask={{ closable: !isLoading }}
      width={420}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <AntdButton
            type="default"
            disabled={isLoading}
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {cancelLabel}
          </AntdButton>
          <AntdButton
            type="primary"
            danger={destructive}
            loading={isLoading}
            disabled={isLoading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AntdButton>
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">{description}</p>
      {children}
    </Modal>
  );
}
