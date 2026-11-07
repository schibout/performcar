"use client";

import { Mail } from "lucide-react";

import { Input } from "@/components/ui/input";

import type { InputProps } from "antd";

// Renders an antd Input prefixed with a mail icon. Designed to be placed
// directly inside an antd <Form.Item name="email">; value/onChange flow
// through the surrounding Form context.
export function AuthEmailField({
  placeholder = "kemalcalak@gmail.com",
  ...rest
}: Omit<InputProps, "prefix">) {
  return (
    <Input
      type="text"
      autoComplete="email"
      prefix={<Mail className="h-4 w-4 text-muted-foreground" />}
      placeholder={placeholder}
      {...rest}
    />
  );
}
