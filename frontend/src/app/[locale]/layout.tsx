import { Geist_Mono, Inter } from "next/font/google";
import { headers } from "next/headers";

import { AnnouncementBanner } from "@/components/common/AnnouncementBanner";
import { AppHeader } from "@/components/layout/AppHeader";
import { buildMetadata, validateLocale } from "@/lib/seo/metadata";
import { buildThemeStyleSheet } from "@/lib/theme/colors";
import { ClientSideProviders } from "@/providers/ClientSideProviders";

import type { Metadata } from "next";

import "../globals.css";

// Pre-rendered so both light and dark CSS variables are present in the initial
// HTML; next-themes' inline script flips the .dark class before hydration,
// avoiding a flash of unthemed content.
const THEME_STYLES = buildThemeStyleSheet();

// PERFORM'CAR typography: Inter for body and headings, as in the reference
// quote generator. latin-ext covers accented French glyphs.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Generate locale-aware metadata for the root layout of each locale
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return buildMetadata({
    locale: validateLocale(locale),
    pageKey: "home",
    pathname: "",
  });
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale || "en";

  // Nonce minted per-request in src/proxy.ts; next-themes stamps it on its
  // pre-hydration inline script so the nonce-based CSP allows it to run.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line react/no-danger -- internal theme CSS, no user input */}
        <style dangerouslySetInnerHTML={{ __html: THEME_STYLES }} />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased`}
      >
        <ClientSideProviders locale={locale} nonce={nonce}>
          <div className="relative flex min-h-screen flex-col bg-background">
            <AnnouncementBanner />
            <AppHeader />
            <main className="flex-1 flex flex-col">{children}</main>
          </div>
        </ClientSideProviders>
      </body>
    </html>
  );
}
