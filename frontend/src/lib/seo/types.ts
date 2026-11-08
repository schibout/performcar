export type SeoLocale = "fr" | "en";

export type SeoPageKey =
  | "home"
  | "about"
  | "login"
  | "register"
  | "forgotPassword"
  | "resetPassword"
  | "verifyEmail"
  | "verifyEmailNotice"
  | "accountSuspended"
  | "dashboard"
  | "profile"
  | "support"
  | "notifications"
  | "adminLogin"
  | "adminDashboard"
  | "adminUsers"
  | "adminUserDetail"
  | "adminAdmins"
  | "adminRoles"
  | "adminPermissionSets"
  | "adminFiles"
  | "adminActivities"
  | "adminSupport"
  | "adminNotifications"
  | "adminBroadcasts"
  | "adminSystemSettings"
  | "adminTicketDetail"
  | "quotes"
  | "quotesHistory"
  | "quotesNew"
  | "quoteDetail"
  | "customers"
  | "dealership"
  | "assistant"
  | "assistantCommunication"
  | "adminQuotes"
  | "adminCustomers"
  | "adminCatalog"
  | "adminDealerships"
  | "notFound"
  | "error";

export interface SeoPageMeta {
  title: string;
  description: string;
}

export type SeoTranslations = Record<string, SeoPageMeta>;

export interface BuildMetadataOptions {
  locale: SeoLocale;
  pageKey: SeoPageKey;
  /** Page URL path, e.g., "/dashboard" */
  pathname?: string;
  /** Optional overrides for metadata */
  overrides?: Partial<SeoPageMeta>;
}
