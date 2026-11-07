import { env } from "@/env";

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = env.NEXT_PUBLIC_APP_URL;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/*/admin", "/*/dashboard", "/*/profile", "/*/support"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
