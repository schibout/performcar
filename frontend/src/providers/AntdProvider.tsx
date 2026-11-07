"use client";

import { useEffect } from "react";

import { App as AntdApp, ConfigProvider, theme } from "antd";
import enUS from "antd/locale/en_US";
import frFR from "antd/locale/fr_FR";
import { useTheme } from "next-themes";

import { darkAntdTokens, lightAntdTokens } from "@/lib/theme/colors";
import { bindNotification } from "@/lib/toast";

const ANTD_LOCALES: Record<string, typeof enUS> = {
  en: enUS,
  fr: frFR,
};

interface NotificationBridgeProps {
  children: React.ReactNode;
}

interface AntdProviderProps {
  children: React.ReactNode;
  locale: string;
}

// Exposes antd's theme-aware notification instance to module-level callers
// (e.g. lib/api/api.ts) that cannot use App.useApp() directly.
function NotificationBridge({ children }: NotificationBridgeProps) {
  const { notification } = AntdApp.useApp();

  useEffect(() => {
    bindNotification(notification);
    return () => {
      bindNotification(null);
    };
  }, [notification]);

  return children;
}

export function AntdProvider({ children, locale }: AntdProviderProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const tokens = isDark ? darkAntdTokens : lightAntdTokens;

  return (
    <ConfigProvider
      locale={ANTD_LOCALES[locale] ?? enUS}
      theme={{
        cssVar: { key: "antd" },
        hashed: false,
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: tokens.primary,
          // antd's reset paints every <a> with colorLink (default blue);
          // bind it to the theme primary so links follow light/dark.
          colorLink: tokens.primary,
          colorError: tokens.error,
          // Elevated overlays (dropdowns, modals, notifications, popovers) so
          // they match the app's surface color instead of antd's default.
          colorBgElevated: tokens.bgElevated,
          borderRadius: 14,
          fontFamily: "var(--font-sans)",
        },
      }}
    >
      <AntdApp>
        <NotificationBridge>{children}</NotificationBridge>
      </AntdApp>
    </ConfigProvider>
  );
}
