# ⚛️ Next.js 16 + React 19 + TypeScript Enterprise Template

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-8%2B-blue)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-blue)](https://www.typescriptlang.org/)

A modern, production-ready Next.js template utilizing Next.js 16, React 19, TypeScript, and a clean project structure with built-in internationalization (i18n) support. This template is designed for building robust and scalable full-stack applications with clear separation of concerns, easy testing, comprehensive i18n capabilities, and high maintainability.

## 💡 Why This Template?

While standard Next.js starters or Create React App provide a blank canvas, they leave you spending hours (or days) configuring architectural foundations, linting rules, state management, and internationalization. This template targets **Enterprise-Grade Readiness** from minute zero.

- **Pre-Configured Tooling:** ESLint, Prettier, TypeScript, Vitest, and Playwright are interlinked instantly. No conflicting configurations.
- **Scalable Architecture vs. Flat Folders:** Replaces the typical flat `src/` directory with a structured, feature-based layered architecture meant to hold hundreds of components without becoming a "spaghetti" mess.
- **Built-In Internationalization:** `react-i18next` is pre-configured with English and Turkish support, including localized validation/error/success messages ready for backend integration.
- **Strict State Separation:** Enforces best practices out of the box—Zustand handles global UI state, while React Query exclusively manages asynchronous server state and caching.
- **Next.js Server Components Ready:** Leverages Next.js 16 App Router with locale-based routing and server-side rendering capabilities.
- **Immediate E2E Testing:** Playwright is pre-installed and configured. You don't have to bolt it on later when the project is already complex.

---

## 🏗 Architecture Philosophy

This template strictly follows a **Feature-Based / Layered UI Architecture with Next.js Server Components**:

- **API Abstraction Layer (`src/lib/api`):** All external data fetching is isolated here. UI components never call `fetch` or `axios` directly. Uses Axios for consistent HTTP client behavior.
- **Shared UI Primitives (`src/components/ui`):** Uses Radix UI + Tailwind for a highly customizable, accessible, and unstyled base. Includes shadcn integration.
- **Domain / Feature Modules:** Complex parts of the app are encapsulated by feature, not just by file type. Auth and protected routes follow convention-based routing.
- **Global vs Local State:** Global UI state is handled purely by `Zustand` (located in `src/stores`), while remote data is handled by `React Query`.
- **Locale-Based Routing:** Built-in support for multi-language routing using Next.js dynamic segments (`[locale]`).

---

## 🔗 Backend Compatibility

This frontend template is designed to seamlessly integrate with the companion **FastAPI Layered Architecture Template**.
You can find the backend template here: [kemalcalak/fastapi-template](https://github.com/kemalcalak/fastapi-template).

The API proxy is pre-configured in `next.config.ts` to forward requests from your app to the backend API.

---

## 🚀 Features

- **Latest React version:** [React 19](https://react.dev/) with concurrent rendering features.
- **Modern Meta Framework:** [Next.js 16](https://nextjs.org/) with App Router for file-based routing, server components, and built-in optimization.
- **Type Safety:** [TypeScript](https://www.typescriptlang.org/) for static typing and better developer experience.
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/) for global state and [React Query](https://tanstack.com/query) for server state/data fetching.
- **HTTP Client:** [Axios](https://axios-http.com/) with centralized API configuration and interceptors.
- **Styling & UI:** [Tailwind CSS 4](https://tailwindcss.com/) with [Radix UI](https://www.radix-ui.com/) primitives and [shadcn](https://ui.shadcn.com/) integration for pre-built accessible components.
- **Forms & Validation:** [React Hook Form](https://react-hook-form.com/) combined with [Zod](https://zod.dev/) for schema-based, type-safe validation.
- **File Uploads & Avatars (staged, confirm-to-upload):** Reusable `FileUpload` (multi-file) and `AvatarUpload` components (built on Ant Design's `Upload`) with client-side type/size validation mirroring the backend limits. **Selecting a file does not upload it** — it is held locally with an instant preview and only sent to Cloudinary/DB when the user confirms (Save / form submit), via an imperative flush handle exposed to the parent. A `useUploadFile` hook powers profile and admin avatar management, plus an admin file-management page (`/admin/files`) with uploader and content-type filters.
- **Code Quality:** ESLint 9 and Prettier pre-configured for consistent code style and formatting.
- **Pre-commit Hooks:** [Husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged) auto-run ESLint + Prettier on staged files before every commit.
- **Error Tracking:** [Sentry](https://sentry.io/) integration for client, server, and edge runtimes. Skipped automatically when no DSN is provided.
- **Internationalization:** `react-i18next` with multi-language support (English & Turkish included) featuring localized validation/error/success messages matching backend responses.
- **Dark Mode:** [next-themes](https://github.com/pacocoursey/next-themes) for effortless light/dark theme switching.
- **Icons & Animations:** [Lucide React](https://lucide.dev/) for beautiful icons and [Motion](https://motion.dev/) for smooth animations.
- **Toast Notifications:** [Sonner](https://sonner.emilkowal.ski/) for elegant success/error toast notifications.
- **Testing:** Comprehensive test suite setup utilizing **Vitest** for unit/component tests and **Playwright** for End-to-End (E2E) testing.
- **Mocking:** MSW (Mock Service Worker) for API mocking during testing and development.
- **Protected Routes:** Built-in auth flow with protected route segments using Next.js conventions.
- **RBAC / Permission-aware Admin Panel:** A sidebar-shell admin area (`/admin`) with `user` / `admin` / `superadmin` roles, isolated from the user-facing app. A central `usePermissions()` hook (plus per-permission helpers like `useCanDeleteUsers`) drives **nav, route, and action gating** from the `permissions` on `/users/me`; superadmins pass everything by role and get a searchable **permission-matrix** to **create/delete admin accounts** and assign grants — while the **root superadmin** additionally promotes/demotes superadmins and hands over root via **email OTP**. Permission changes apply **instantly** over a WebSocket — no re-login. See [Admin Panel & RBAC](#-admin-panel--rbac).
- **Support / Ticketing UI + Realtime:** User and admin ticketing screens (open, reply with attachments, status/priority, assignment) with live thread & queue updates over a self-healing WebSocket. See [Support UI](#-support-ticketing-ui).
- **Notification Center:** A header bell (unread badge + dropdown panel) on both the user header and the admin topbar, plus a full paginated inbox (`/notifications`, `/admin/notifications`) with an **All / Unread** filter and mark-(all-)read. Updates **live** over a self-healing WebSocket — a pushed event invalidates the React Query caches so the badge and lists refresh without a reload. Notification copy is rendered from a `type` + `data` payload via i18n (en/tr), and the inbox is reachable on mobile from the drawer / admin sidebar. See [Notification Center](#-notification-center).
- **Announcements / Broadcast:** An admin compose page (`/admin/broadcasts`) to send announcements — **template** or **custom** mode with per-language (tr/en) title/body, live character counters, a **live preview**, audience / importance selectors, and optional banner / email toggles — plus a sent-history list. Recipients see it in the notification center and, when flagged, as a **top banner** (desktop strip + detail modal, mobile bottom-sheet, springy enter/exit) rendered in their active locale, refreshed **live** over the notification WebSocket and dismissible (persisted in `localStorage`); animations respect `prefers-reduced-motion`. Gated by `broadcast:read` / `broadcast:write`.
- **System Settings:** An admin page (`/admin/system-settings`) to edit site-wide settings grouped by category, with a typed control per setting (switch / number / select) and a **logo upload** that persists immediately. Branding is consumed app-wide — the **site name & logo** in the header, sidebar and login come from the backend `site_name` / `logo_url` (no env var), and a **maintenance gate** shows non-admins a full-screen maintenance notice (with a first-load splash) while admins keep working; the register link/route is hidden & guarded when registration is off. Public settings are read once (cached) from `/settings/public`. Gated by `system_settings:read` / `system_settings:write`. See [System Settings](#-system-settings).
- **Active Sessions / Device Management:** A **Security** tab on the profile lists the devices signed in to the account (browser/OS + last active, current device flagged) and revokes any one — or **all other devices** in one click. Admins get the same list plus a **terminate-all** action on the user detail page, gated by the `users:sessions` permission. Revocation is **live**: an `account` WebSocket `sessions_revoked` event re-validates the device, dropping a kicked tab straight to login without a reload. See [Active Sessions](#-active-sessions).

---

## ✅ CI/CD Ready

The repository structure supports standard Continuous Integration pipelines out-of-the-box. Ensure you configure your CI (GitHub Actions, GitLab CI, etc.) to run:

1.  **Dependency Install:** `pnpm install --frozen-lockfile`
2.  **Linting:** `pnpm run lint`
3.  **Formatting Check:** `pnpm run format:check`
4.  **Unit & Component Tests:** `pnpm vitest run` (Vitest)
5.  **Type Checking & Build:** `pnpm run build`
6.  **E2E Tests:** `pnpm run test:e2e` (Playwright)

---

## 📦 Setup & Local Development

### Prerequisites

- Node.js (v18 or higher recommended)
- **`pnpm` package manager** (strictly recommended for this project)
  - `pnpm` offers faster dependency resolution, better disk space efficiency, and strict dependency isolation compared to npm. It's configured in `pnpm-workspace.yaml` and `package.json` for optimal monorepo support and lockfile consistency.

### 1. Install Dependencies

Navigate to your project folder and install the required dependencies using `pnpm`:

```bash
pnpm install
```

### 2. Environment Variables

Create a `.env.local` file (or copy from `.env.example`) and configure your API endpoints:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_PREFIX=/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Sentry (leave empty to disable error tracking)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0
SENTRY_TRACES_SAMPLE_RATE=0
# Source map upload (CI only — leave empty locally)
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

**Environment Variables Explained:**

- `NEXT_PUBLIC_API_URL`: Base URL of your FastAPI backend server
- `NEXT_PUBLIC_API_PREFIX`: API version prefix (commonly `/api/v1`)
- `NEXT_PUBLIC_APP_URL`: Public origin of this app, used for `metadataBase` / absolute SEO URLs
- `NEXT_PUBLIC_WS_URL` _(optional)_: Explicit WebSocket origin; derived from `NEXT_PUBLIC_API_URL` when unset

> The application **name and logo** shown across the UI come from the admin **System Settings** (`site_name` / `logo_url`), served by the backend `/settings/public` endpoint — not from an env var. SSR/SEO surfaces (page title, OpenGraph image) read the same setting server-side.

**Optional — Sentry (leave empty to disable):**

- `NEXT_PUBLIC_SENTRY_DSN`: DSN used by the browser SDK (`src/instrumentation-client.ts`)
- `SENTRY_DSN`: DSN used by the server / edge SDK (`src/instrumentation.ts`)
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` / `SENTRY_TRACES_SAMPLE_RATE`: Performance sampling (0–1, default 0)
- `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN`: Required only in CI to upload source maps. Leave empty locally.

### 3. Start the Development Server

Start the Next.js development server with Hot Module Replacement (HMR):

```bash
pnpm run dev
```

The application will be available at `http://localhost:3000`.

---

## 🛠️ Available Scripts / Commands

This project uses `pnpm` to manage dependencies and run scripts. Below are the key commands available:

### 🏃‍♂️ Running the App

- **`pnpm run dev`**: Starts the local Next.js development server with hot reload.
- **`pnpm run build`**: Compiles TypeScript and builds the app for production into the `.next` directory.
- **`pnpm start`**: Starts the production server (requires `pnpm run build` first).

### 🧪 Testing

The project uses [Vitest](https://vitest.dev/) for unit and component testing, and [Playwright](https://playwright.dev/) for End-to-End (E2E) testing.

- **`pnpm vitest run`**: Runs unit and component tests once (CI-style).
- **`pnpm vitest`**: Runs Vitest in watch mode.
- **`pnpm vitest run path/to/file.test.tsx`**: Runs a single test file.
- **`pnpm run test:e2e`**: Runs Playwright E2E tests in the `tests-e2e` folder to simulate user interactions across the entire application.
- **`pnpm run test:e2e --project=chromium-desktop`**: Runs E2E in a single browser project.
- **`pnpm run test:e2e:report`**: Shows the Playwright test report from the latest test run.

### 🧹 Code Quality & Formatting

This project uses ESLint v9 for catching logical errors and Prettier for code formatting.

- **`pnpm run lint`**: Runs ESLint to find problems in your code.
- **`pnpm run format`**: Automatically formats all supported files using Prettier.
- **`pnpm run format:check`**: Checks if files are properly formatted (useful for CI/CD pipelines).
- **`pnpm tsc -b`**: TypeScript type check (CI runs this).

### 🪝 Git Hooks (Husky + lint-staged)

Husky installs the hooks on `pnpm install` (via the `prepare` script). Two hooks ship:

**`pre-commit`** (~5–10 s) — runs on every `git commit`:

- `pnpm lint-staged` — staged files only:
  - `*.{ts,tsx,js,mjs,cjs}` → `eslint --fix` then `prettier --write`
  - `*.{json,md,css,yml,yaml}` → `prettier --write`

If ESLint can't auto-fix an issue, the commit is aborted. Kept intentionally fast — typecheck and build run on push, not on every commit.

**`pre-push`** (~40–100 s) — runs on every `git push`:

1. `pnpm tsc -b` — full project TypeScript type check (incremental cache).
2. `pnpm build` — full production build. Catches what typecheck can't (RSC boundary violations, missing env vars validated by `src/env.ts`, route conflicts) before anything reaches the remote.

`&&` chains them — if typecheck fails, build is skipped to save time.

Configuration lives in `lint-staged.config.mjs`, `.husky/pre-commit`, and `.husky/pre-push`. Build / Vitest / Playwright run in CI on top of all this — see `.github/workflows/ci.yml`.

---

## 📂 Project Structure

```bash
├── src/
│   ├── app/              # Next.js App Router (Pages, Layouts, and Route Handlers)
│   │   ├── globals.css   # Global styles
│   │   ├── layout.tsx    # Root layout
│   │   ├── global-error.tsx  # Root-level error boundary (Sentry capture)
│   │   ├── [locale]/     # Locale-based routing segment
│   │   │   ├── page.tsx              # Home page
│   │   │   ├── layout.tsx            # Locale layout
│   │   │   ├── (auth)/               # Auth routes group
│   │   │   └── (protected)/          # Protected routes group
│   │   └── ...           # Additional routes, API handlers, etc.
│   ├── components/       # Reusable UI components organized by feature
│   │   ├── auth/         # Authentication-related components
│   │   ├── common/       # Shared components (Header, Footer, file-upload/, etc.)
│   │   ├── profile/      # Profile-related components
│   │   └── ui/           # Base UI primitives (Button, Input, Dialog, etc.)
│   ├── hooks/            # Custom React hooks (useAuth, useTheme, etc.)
│   │   ├── api/          # API-related hooks
│   │   └── __tests__/    # Hook tests
│   ├── lib/              # Utilities and library abstractions
│   │   ├── api/          # Centralized API client configuration
│   │   ├── config/       # App configuration constants
│   │   ├── seo/          # SEO utilities
│   │   ├── types/        # Global TypeScript types (incl. RBAC permissions)
│   │   ├── websocket/    # Self-healing realtime sockets (support, account, notifications)
│   │   └── utils.ts      # Utility functions
│   ├── i18n/             # Internationalization configuration
│   │   ├── config.ts     # i18next configuration
│   │   ├── server.ts     # Server-side i18n helpers
│   │   └── locales/      # Translation files (en/, tr/)
│   ├── providers/        # React Context Providers
│   │   ├── ClientSideProviders.tsx  # Client-side providers wrapper
│   │   ├── QueryProvider.tsx         # React Query provider
│   │   └── ThemeProvider.tsx         # Theme provider
│   ├── schemas/          # Zod validation schemas
│   │   ├── auth.ts       # Auth-related schemas
│   │   └── user.ts       # User-related schemas
│   ├── stores/           # Zustand global state stores
│   │   ├── auth.store.ts # Authentication store
│   │   └── __tests__/    # Store tests
│   ├── test/             # Test utilities and setup
│   │   ├── setup.ts      # Vitest setup
│   │   ├── test-utils.tsx # Testing utilities
│   │   └── msw/          # Mock Service Worker setup
│   ├── proxy.ts          # Locale routing + auth guard (Next.js 16 successor to middleware.ts)
│   ├── instrumentation.ts        # Sentry init for server / edge runtimes
│   └── instrumentation-client.ts # Sentry init for browser runtime
├── tests-e2e/            # Playwright E2E tests
│   ├── auth/             # Auth-related E2E tests
│   ├── admin/            # Admin panel + RBAC E2E tests
│   ├── support/          # Support / ticketing E2E tests
│   ├── common/           # Common feature E2E tests
│   ├── dashboard/        # Dashboard E2E tests
│   └── base-test.ts      # Base test config (blocks BE: HTTP + WebSocket mocked)
├── public/               # Static assets (images, favicon, etc.)
├── .husky/               # Git hooks managed by Husky
│   └── pre-commit        # Runs lint-staged before every commit
├── .env.example          # Example environment variables
├── .prettierrc           # Prettier configuration
├── .prettierignore       # Files Prettier should skip
├── components.json       # shadcn configuration
├── eslint.config.mjs     # ESLint unified configuration
├── lint-staged.config.mjs # lint-staged file-pattern → command map
├── next.config.ts        # Next.js configuration (proxy + Sentry wrapper)
├── package.json          # Dependencies and scripts
├── playwright.config.ts  # Playwright configuration
├── postcss.config.mjs    # PostCSS configuration
├── tailwind.config.ts    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── vitest.config.ts      # Vitest configuration
```

---

## 🌐 Internationalization (i18n)

This template comes with a fully configured `react-i18next` setup supporting **English (en)** and **Turkish (tr)**:

### Add a New Language

1. Create new language files in `src/i18n/locales/{lang}/`:

   ```
   src/i18n/locales/de/ (for German)
   ├── auth.json
   ├── common.json
   ├── validation.json
   ├── upload.json
   └── ...
   ```

2. Update `src/i18n/config.ts` to import and register the new language

3. Update `src/i18n/server.ts` if you need server-side language detection

### Using Translations in Components

```tsx
import { useTranslation } from "react-i18next";

export function MyComponent() {
  const { t } = useTranslation(["auth", "common"]);
  return <h1>{t("common:welcome")}</h1>;
}
```

---

## 🔐 Admin Panel & RBAC

The admin surface lives under `/[locale]/admin` behind a sidebar shell and is isolated from the user-facing app — admins/superadmins visiting a user page are redirected into `/admin`.

**Permission hooks (`src/hooks/usePermissions.ts`).** The auth store holds the current user (with `permissions` for admins, delivered by `/users/me`). `usePermissions()` returns `{ isSuperadmin, permissions, has(permission) }`, alongside ergonomic one-liners — `useCanReadUsers`, `useCanWriteUsers`, `useCanDeleteUsers`, `useCanDeleteFiles`, `useCanWriteSupport`, `useCanUpdateSupport`, … plus `useIsRootSuperadmin` for the root-only tier actions — each returning a boolean (superadmins always `true`).

**Three layers of gating:**

1. **Nav** — sidebar items render only for sections the admin can read; superadmins also see _Admins_.
2. **Route** — each admin page is wrapped so a direct URL without the matching `*:read` permission shows a forbidden state instead of the content.
3. **Action** — buttons (delete, suspend, reset password, reassign ticket, …) appear only with the matching permission; the superadmin-tier actions (make/demote superadmin, transfer root) show only for the **root** superadmin. Where one is hidden, a small hint makes clear it's intentional and **no request is sent**.

**Live updates.** A per-user account socket (`/users/me/events`) listens for `permissions_updated`; on receipt the client re-fetches `/users/me` so nav and gates reflect new grants immediately — without a re-login.

**Admin management (`/admin/admins`, superadmin-only).** List admin-tier accounts, **create an admin account** (email + name + password + initial grants), edit a permission matrix (grouped by resource, with section search), and **delete an account** — all modal-driven. The **root superadmin** additionally gets **Make superadmin** / **Demote to admin** row actions and a two-step **Transfer root** flow that emails a one-time code (entered via an OTP input) before handing over root.

---

## 🎫 Support (Ticketing) UI

End-to-end support screens for both sides:

- **Users** — open a ticket (with image attachments), browse their tickets, and reply in a live thread (`/support`).
- **Admins** — a filterable queue, full ticket view, reply, and status/priority/assignment controls gated by `support:write` / `support:update` (`/admin/support`).

Both surfaces subscribe to a multiplexed, self-healing WebSocket so new messages and status changes stream in without a refresh.

---

## 🔔 Notification Center

A persistent, in-app notification surface wired to the backend's `notifications` feed.

- **Bell + dropdown** — a header bell with an unread badge on both the user header (`AppHeader`) and the admin topbar; the dropdown lists the latest entries with mark-(all-)read and a **View all** link. On mobile it's reachable from the app drawer and the admin sidebar nav.
- **Full inbox** — a paginated page at `/notifications` (and `/admin/notifications`) with an **All / Unread** filter and bulk mark-as-read, both sharing one `NotificationsView`.
- **Live** — `useNotificationRealtime()` holds a self-healing socket (`/notifications/ws`); a pushed `notification_created` event invalidates the notification React Query caches so the badge and lists refetch without a reload.
- **Localized copy** — messages are produced from a stored `type` + `data` payload through i18n (`notifications` namespace, en/tr); the backend persists no human-readable text.

---

## ⚙️ System Settings

An admin surface for the backend's runtime settings, plus the app-wide consumption of the public ones.

- **Admin editor** — `/admin/system-settings` (`SystemSettingsContent` + `SystemSettingsForm`) lists every setting grouped by category in cards, rendering a typed control per `value_type` (antd `Switch` / `InputNumber` / `Input`, a `Select` for the locale). Non-logo settings stage into a draft and persist together via **Save changes** (PATCH per changed key); the **logo** uploads through the shared `AvatarUpload` (Cloudinary + files table) and persists **immediately**. Gated by `useCanReadSystemSettings()` / `useCanWriteSystemSettings()`.
- **Branding** — `useBranding()` reads `site_name` / `logo_url` from the cached `/settings/public`; the `BrandLogo` mark and site name in the header, sidebar, drawer and login come from there (no env var). SSR/SEO surfaces (root `<title>`, OpenGraph image) read the same setting server-side via `getServerSiteName()`.
- **Maintenance gate** — `MaintenanceGate` (mounted in the client providers) shows non-admins a full-screen `MaintenanceScreen` while `maintenance_mode` is on; admins pass through, auth routes stay reachable, and a first-load splash avoids a flash. The maintenance message is i18n (en/tr).
- **Registration toggle** — when `registration_enabled` is off, the register link is hidden (login page + header) and the `/register` route redirects to login.

---

## 🔒 Active Sessions

A device-management surface over the backend's `user_session` feed, so a user sees where they're signed in and can sign out remotely.

- **Profile security tab** — `SessionsSection` (under the profile **Security** tab) lists active sessions via `useSessions()`, each showing a parsed browser/OS label and last-active time, with the calling device flagged **This device**. A per-row **Revoke** (with confirm dialog) signs out one device; **Sign out all other devices** clears the rest while keeping the current one. The stored IP stays server-side — it's never sent to the client.
- **Admin user detail** — `UserSessionsCard` renders the same list plus a **Terminate all sessions** action on `/admin/users/[id]`, shown only when the admin holds the `users:sessions` permission (`useCanManageUserSessions()`).
- **Live logout** — `useAccountEvents()` (mounted app-wide via `AccountEventsBridge`) holds the self-healing `account` socket; a `sessions_revoked` frame re-validates the device by refetching `/users/me`. If this device was the one revoked the request 401s and the axios layer drops it to login at once; otherwise the sessions list cache is refreshed so the UI reflects the change live.
- **Localized** — all copy lives under the `profile` / `admin` i18n namespaces (en/tr); session toasts resolve from the backend `success.session.*` / `error.session.*` keys.

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

> This project follows [Conventional Commits](https://www.conventionalcommits.org/).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See the `LICENSE` file at the root of the workspace for more information.

---

## 🚀 Getting Started Checklist

- [ ] Clone the repository
- [ ] Run `pnpm install`
- [ ] Set up `.env.local` with your API endpoints
- [ ] Start the development server with `pnpm run dev`
- [ ] Open `http://localhost:3000` in your browser
- [ ] Review the project structure and familiarize yourself with the codebase
- [ ] Sign in as the seeded superadmin (`FIRST_SUPERUSER` from the backend) and open the admin panel at `/admin`
- [ ] Visit `/admin/admins` to create an admin account and assign permissions via the matrix
- [ ] Sign in as that permission-limited admin and confirm the nav, routes, and actions gate to their grants
- [ ] Try the support flow: open a ticket at `/support`, then reply/assign it from `/admin/support`
- [ ] Open the notification bell (header / admin topbar) or the full inbox at `/notifications` and watch the badge update live as the backend emits events
- [ ] Open the profile **Security** tab to view active sessions; sign in from a second browser and revoke it (or terminate it from `/admin/users/[id]` with the `users:sessions` grant) and watch that tab drop to login live
- [ ] Check the E2E tests in `tests-e2e/` (incl. `admin/` RBAC + `support/`) to understand the testing patterns
- [ ] Update the i18n translation files in `src/i18n/locales/` as needed

---

Created with ❤️ by [kemalcalak](https://github.com/kemalcalak)
