"use client";

import * as React from "react";

import { Button as AntdButton, type ButtonProps as AntdButtonProps } from "antd";

import { cn } from "@/lib/utils";

const BUTTON_BASE =
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const VARIANT_CLASSES = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border border-input bg-background hover:bg-muted",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-muted",
  destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  link: "text-primary underline-offset-4 hover:underline",
} as const;

const SIZE_CLASSES = {
  default: "h-8 px-2.5",
  xs: "h-6 px-2 text-xs",
  sm: "h-7 px-2.5 text-[0.8rem]",
  lg: "h-9 px-3",
  icon: "size-8",
  "icon-xs": "size-6",
  "icon-sm": "size-7",
  "icon-lg": "size-9",
} as const;

type ButtonVariant = keyof typeof VARIANT_CLASSES;
type ButtonSize = keyof typeof SIZE_CLASSES;

const VARIANT_TO_ANTD: Record<ButtonVariant, { type?: AntdButtonProps["type"]; danger?: boolean }> =
  {
    default: { type: "primary" },
    outline: { type: "default" },
    secondary: { type: "default" },
    ghost: { type: "text" },
    destructive: { type: "primary", danger: true },
    link: { type: "link" },
  };

const SIZE_TO_ANTD: Record<ButtonSize, AntdButtonProps["size"]> = {
  default: "middle",
  xs: "small",
  sm: "small",
  lg: "large",
  icon: "middle",
  "icon-xs": "small",
  "icon-sm": "small",
  "icon-lg": "large",
};

type ButtonProps = Omit<React.ComponentProps<"button">, "type"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  type?: React.ComponentProps<"button">["type"];
  loading?: AntdButtonProps["loading"];
};

// Minimal Slot: clones the single child element and merges className / props
// onto it. Used for `asChild` so consumers like <Button asChild><Link/></Button>
// render the link with button styling without an extra wrapper element.
function Slot({ className, children, ...rest }: React.HTMLAttributes<HTMLElement>) {
  if (!React.isValidElement(children)) return null;
  const childProps = children.props as { className?: string };
  return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
    ...rest,
    className: cn(childProps.className, className),
  });
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  type,
  loading,
  disabled,
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot
        data-slot="button"
        className={cn(BUTTON_BASE, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className)}
        {...props}
      />
    );
  }

  const antdMapping = VARIANT_TO_ANTD[variant];
  const isIcon = size.startsWith("icon");
  // antd's loading state shows a spinner but does NOT set the underlying
  // disabled attribute. Force it so click handlers stay blocked at the DOM
  // level and assistive tech / tests see a disabled control.
  const isLoading = Boolean(loading);
  const isDisabled = disabled ?? isLoading;

  return (
    <AntdButton
      data-slot="button"
      type={antdMapping.type}
      danger={antdMapping.danger}
      size={SIZE_TO_ANTD[size]}
      shape={isIcon ? "circle" : "default"}
      htmlType={type}
      loading={isLoading}
      disabled={isDisabled || isLoading}
      className={className}
      {...(props as Omit<AntdButtonProps, "type" | "size" | "disabled" | "loading">)}
    />
  );
}

export { Button };
