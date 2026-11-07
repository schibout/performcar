import { AntdRegistry } from "@ant-design/nextjs-registry";

import { env } from "@/env";
import { getServerSiteName } from "@/lib/server/site-name";

import type { Metadata, Viewport } from "next";

// Global viewport settings applied to all pages
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// Fallback metadata — locale-specific layouts will override these. The site
// name is sourced from the backend settings so it stays the single source.
export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getServerSiteName();
  return {
    title: {
      default: siteName,
      template: `%s — ${siteName}`,
    },
    description: "PerformCar EasyDevis — devis PERFORM'CAR en quelques clics",
    metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <AntdRegistry>{children}</AntdRegistry>;
}
