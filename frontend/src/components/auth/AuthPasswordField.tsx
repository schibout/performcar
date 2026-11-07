"use client";

import { Lock } from "lucide-react";

import { Input } from "@/components/ui/input";

import type { InputProps } from "antd";

// Renders antd Input.Password prefixed with a lock icon. The visibility
// toggle is provided by antd, so the parent no longer needs showPassword
// state. Place inside a <Form.Item name="password">.
export function AuthPasswordField(props: Omit<InputProps, "prefix" | "type">) {
  return (
    <Input
      type="password"
      autoComplete="current-password"
      prefix={<Lock className="h-4 w-4 text-muted-foreground" />}
      {...props}
    />
  );
}
