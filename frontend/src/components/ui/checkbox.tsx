"use client";

import * as React from "react";

import { Checkbox as AntdCheckbox, type CheckboxProps } from "antd";

import { cn } from "@/lib/utils";

type Props = Omit<CheckboxProps, "onChange"> & {
  onCheckedChange?: (checked: boolean) => void;
  onChange?: CheckboxProps["onChange"];
};

function Checkbox({ className, onCheckedChange, onChange, ...props }: Props) {
  return (
    <AntdCheckbox
      data-slot="checkbox"
      className={cn(className)}
      onChange={(e) => {
        onCheckedChange?.(e.target.checked);
        onChange?.(e);
      }}
      {...props}
    />
  );
}

export { Checkbox };
