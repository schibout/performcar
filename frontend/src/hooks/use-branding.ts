import { usePublicSettings } from "@/hooks/api/use-system-settings";

interface Branding {
  siteName: string;
  logoUrl: string;
}

// Shown only while the public settings load (or if `site_name` is unset), so a
// `{{appName}}` interpolation never renders blank. The real name comes from the
// backend `site_name` setting.
const FALLBACK_SITE_NAME = "PerformCar EasyDevis";

/**
 * Resolve site branding from the public settings. The site name and logo come
 * from the backend ``site_name`` / ``logo_url`` settings; ``siteName`` falls
 * back to {@link FALLBACK_SITE_NAME} while loading, and an empty ``logoUrl``
 * means "no logo".
 */
export function useBranding(): Branding {
  const { data } = usePublicSettings();
  const siteName =
    (typeof data?.data.site_name === "string" && data.data.site_name) || FALLBACK_SITE_NAME;
  const logoUrl = typeof data?.data.logo_url === "string" ? data.data.logo_url : "";
  return { siteName, logoUrl };
}
