# NextJS-Template

Next.js 16 + React 19 enterprise template. Frontend application with internationalization (i18n) and TypeScript strict mode. API proxy configuration compatible with FastAPI backend.

## Architecture

- **`src/app/[locale]`**: App Router, locale-based routing
- **`src/components`**: UI components (ui/, auth/, common/, profile/)
- **`src/hooks`**: Custom React hooks
- **`src/lib`**: Utility functions and API abstraction layer
- **`src/i18n`**: i18next config (languages: en, tr)
- **`src/stores`**: Zustand global state management
- **`src/schemas`**: Zod validation schemas
- **`tests-e2e/`**: Playwright E2E tests
- **Tailwind CSS + shadcn/ui + Radix UI**: Styling and UI primitives

## Commands

```bash
pnpm dev              # Start frontend (localhost:3000)
pnpm build            # Production build
pnpm start            # Start production
pnpm lint             # ESLint check
pnpm format           # Prettier format
pnpm test:e2e         # Run Playwright tests
pnpm test:e2e:report  # Show test report
```

## Adding shadcn/ui Components

```bash
pnpm dlx shadcn@latest add <component>
```

Example: `pnpm dlx shadcn@latest add button`, `pnpm dlx shadcn@latest add dialog`

## Writing Tests

- **E2E Tests**: In `tests-e2e/` folder, using Playwright
- **Page Objects**: Write reusable helper classes for pages (see `base-test.ts` for reference)
- **Naming**: Use `*.spec.ts` extension, folder structure should reflect features

## Environment Variables

See `.env.example` for required variables

- `NEXT_PUBLIC_API_URL` — Backend API base URL (default: `http://localhost:8000`)
- `NEXT_PUBLIC_API_PREFIX` — API path prefix (default: `/api/v1`)
- `NEXT_PUBLIC_APP_URL` — Public origin of this app (default: `http://localhost:3000`), used for `metadataBase`
- `NEXT_PUBLIC_WS_URL` _(optional)_ — Explicit WebSocket origin; derived from `NEXT_PUBLIC_API_URL` if unset

> App name & logo come from the admin System Settings (`site_name` / `logo_url`) via `/settings/public`, not an env var — including SSR/SEO surfaces (title, OG image) which read it server-side.

## Code Style

- **TypeScript**: strict mode, type annotations required
- **Exports**: Use named exports (not default exports)
- **Styling**: Tailwind utility classes, no separate CSS files
- **API Calls**: Use `src/lib/api/`, never call fetch/axios directly. Example: `import { apiClient } from '@/lib/api/client'`
- **State**: Zustand for global state (`src/stores`), React Query for server state
- **i18n**: Access language with `useLanguage()` hook, translations in `i18n/locales/`. `escapeValue` is off (React escapes at render) — never render a `t()` result as raw HTML (`dangerouslySetInnerHTML` or other non-React DOM sink), or interpolated user input becomes XSS
- **Path Alias**: `@/` → `src/` (tsconfig.json), use when importing
- **Commits**: Conventional Commits standard — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- **New components**: If general-purpose, place in `common/`; if page-specific, place in relevant folder

## Important Notes

- **`.env` file**: Never commit, verify in `.gitignore`
- **Routing**: Uses `src/proxy.ts`, not `middleware.ts` (Next.js 16)
- **API Proxy**: Configured in `next.config.ts`, forwards requests via `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_API_PREFIX` env vars
- **i18n Locales**: `en.json` and `tr.json` files in `src/i18n/locales/`
- **Locale Routing**: URL uses `[locale]` segment (`/en/...`, `/tr/...`)
- **Bundler**: Turbopack is default (Next.js 16), don't add webpack config
- **Port 3000**: Default Next.js dev port, backend proxy forwards `/api/v1` requests
