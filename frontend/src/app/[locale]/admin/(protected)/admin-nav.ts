import {
  Activity,
  Bell,
  Building2,
  CircleUser,
  Contact,
  FileText,
  Images,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  Package,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ROUTES } from "@/lib/config/routes";

// Grouped admin navigation. Labels are resolved in the components via i18n
// (`shell.nav.<key>` / `shell.section.<key>`); this module stays a pure,
// hook-free builder so it can be unit-tested and shared by the sidebar + topbar.
export interface AdminNavItem {
  key: string;
  href: string;
  icon: LucideIcon;
  show: boolean;
}

export interface AdminNavSection {
  key: string;
  items: AdminNavItem[];
}

export interface AdminNavCaps {
  canReadUsers: boolean;
  canReadFiles: boolean;
  canReadActivities: boolean;
  canReadSupport: boolean;
  canReadBroadcasts: boolean;
  canReadSystemSettings: boolean;
  canReadAdmins: boolean;
  canReadRoles: boolean;
  canReadPermissionSets: boolean;
  canReadQuotes: boolean;
  canReadCustomers: boolean;
  canReadCatalog: boolean;
  canReadDealerships: boolean;
  canUseAssistant: boolean;
}

export const buildAdminNav = (caps: AdminNavCaps): AdminNavSection[] => {
  const sections: AdminNavSection[] = [
    {
      key: "overview",
      items: [{ key: "dashboard", href: ROUTES.adminDashboard, icon: LayoutDashboard, show: true }],
    },
    {
      key: "management",
      items: [
        { key: "users", href: ROUTES.adminUsers, icon: Users, show: caps.canReadUsers },
        { key: "admins", href: ROUTES.adminAdmins, icon: UserCog, show: caps.canReadAdmins },
        { key: "files", href: ROUTES.adminFiles, icon: Images, show: caps.canReadFiles },
        {
          key: "broadcasts",
          href: ROUTES.adminBroadcasts,
          icon: Megaphone,
          show: caps.canReadBroadcasts,
        },
        {
          key: "system-settings",
          href: ROUTES.adminSystemSettings,
          icon: Settings,
          show: caps.canReadSystemSettings,
        },
      ],
    },
    {
      key: "dealerNetwork",
      items: [
        { key: "quotes", href: ROUTES.adminQuotes, icon: FileText, show: caps.canReadQuotes },
        {
          key: "customers",
          href: ROUTES.adminCustomers,
          icon: Contact,
          show: caps.canReadCustomers,
        },
        { key: "catalog", href: ROUTES.adminCatalog, icon: Package, show: caps.canReadCatalog },
        {
          key: "dealerships",
          href: ROUTES.adminDealerships,
          icon: Building2,
          show: caps.canReadDealerships,
        },
      ],
    },
    {
      key: "accessControl",
      items: [
        { key: "roles", href: ROUTES.adminRoles, icon: ShieldCheck, show: caps.canReadRoles },
        {
          key: "permission-sets",
          href: ROUTES.adminPermissionSets,
          icon: KeyRound,
          show: caps.canReadPermissionSets,
        },
      ],
    },
    {
      key: "monitoring",
      items: [
        {
          key: "activities",
          href: ROUTES.adminActivities,
          icon: Activity,
          show: caps.canReadActivities,
        },
        { key: "support", href: ROUTES.adminSupport, icon: Ticket, show: caps.canReadSupport },
      ],
    },
    {
      key: "ai",
      items: [
        {
          key: "assistant",
          href: ROUTES.adminAssistant,
          icon: Sparkles,
          show: caps.canUseAssistant,
        },
        {
          key: "assistant-communication",
          href: ROUTES.adminAssistantCommunication,
          icon: MessageSquareText,
          show: caps.canUseAssistant,
        },
      ],
    },
    {
      key: "account",
      items: [
        // Personal inbox — every admin sees their own, so no permission gate.
        {
          key: "notifications",
          href: ROUTES.adminNotifications,
          icon: Bell,
          show: true,
        },
        { key: "profile", href: ROUTES.adminProfile, icon: CircleUser, show: true },
      ],
    },
  ];

  // Drop hidden items and any section left empty so the sidebar never renders a
  // bare section header with no links under it.
  return sections
    .map((section) => ({ ...section, items: section.items.filter((item) => item.show) }))
    .filter((section) => section.items.length > 0);
};
