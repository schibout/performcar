/* eslint-disable react-refresh/only-export-components */
import { ImageResponse } from "next/og";

import { getServerTranslations } from "@/i18n/server";
import { getServerSiteName } from "@/lib/server/site-name";

export const runtime = "edge";

export const alt = "PerformCar EasyDevis";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

/**
 * OG Image Generator
 */
export default async function Image({ params }: { params: { locale: string } }) {
  // Use server-side translation helper instead of manual JSON import
  const { t } = getServerTranslations(params.locale);
  const subtitle = t("app_subtitle", "Your PERFORM'CAR quotes in a few clicks");
  const appName = await getServerSiteName();

  return new ImageResponse(
    <div
      style={{
        background: "linear-gradient(to bottom right, #1e293b, #0f172a)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "120px",
          height: "120px",
          background: "#3b82f6",
          borderRadius: "60px",
          marginBottom: "40px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        <svg
          width="60"
          height="60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
        </svg>
      </div>
      <div
        style={{
          fontSize: "64px",
          fontWeight: "bold",
          color: "white",
          marginBottom: "16px",
          letterSpacing: "-0.05em",
        }}
      >
        {appName}
      </div>
      <div
        style={{
          fontSize: "24px",
          color: "rgba(255, 255, 255, 0.6)",
          maxWidth: "600px",
          textAlign: "center",
        }}
      >
        {subtitle}
      </div>
    </div>,
    {
      ...size,
    },
  );
}
