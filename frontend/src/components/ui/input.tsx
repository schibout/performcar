"use client";

import * as React from "react";

import { Input as AntdInput, type InputProps, type InputRef } from "antd";

import { cn } from "@/lib/utils";

type Props = InputProps & React.RefAttributes<InputRef>;

function Input({ className, type, ...props }: Props) {
  if (type === "password") {
    return <AntdInput.Password data-slot="input" className={cn(className)} {...props} />;
  }

  return <AntdInput data-slot="input" type={type} className={cn(className)} {...props} />;
}

export { Input };
