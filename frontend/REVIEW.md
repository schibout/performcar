# REVIEW.md — NextJS-Template Code Review Rehberi

`/review` slash komutunun PR audit'inde referans aldığı repo-spesifik konvansiyonlar. Her madde gerçek bir dosyaya `path:line` ile bağlıdır. Generic best-practice yoktur.

---

## 1. Stack

| Katman            | Seçim                                                                                                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework         | Next.js 16 App Router (`[locale]` segmentli, Turbopack default)                                                                                                                                      |
| Runtime           | React 19                                                                                                                                                                                             |
| Dil               | TypeScript strict + `strictTypeChecked`                                                                                                                                                              |
| UI / Styling      | Ant Design v6 + `src/components/ui/` local primitive layer (Button/Input/Checkbox antd wrap; Card/Label/Alert/Avatar/Separator/Skeleton sıfır-bağımlılıklı Tailwind) + Tailwind CSS 4 (utility-only) |
| Form              | antd `Form` + `Form.useForm` + Zod (köprü: `@/lib/validation/zodToAntdRule`)                                                                                                                         |
| Server state      | TanStack Query v5                                                                                                                                                                                    |
| Client state      | Zustand + `persist`                                                                                                                                                                                  |
| HTTP              | Axios + custom interceptor (`src/lib/api/api.ts`)                                                                                                                                                    |
| i18n              | i18next + react-i18next (en, tr)                                                                                                                                                                     |
| Env               | `@t3-oss/env-nextjs` (boot-time validation)                                                                                                                                                          |
| Routing guard     | `src/proxy.ts` (⚠️ NOT `middleware.ts`)                                                                                                                                                              |
| Toast             | antd `notification`                                                                                                                                                                                  |
| Error tracking    | `@sentry/nextjs`                                                                                                                                                                                     |
| Test              | Playwright (E2E) + Vitest + Testing Library + MSW (unit)                                                                                                                                             |
| Lint / Pre-commit | ESLint flat config (strict + a11y) + Husky + lint-staged                                                                                                                                             |

Kanıt: [package.json](package.json), [eslint.config.mjs](eslint.config.mjs), [tsconfig.json](tsconfig.json).

---

## 2. Klasör Yapısı

```
src/
├── app/[locale]/            # Tüm sayfalar locale segmenti altında
│   ├── (auth)/              # /login /register /forgot-password /reset-password /verify-email
│   ├── (protected)/         # /dashboard /profile /account-deactivated /account-suspended
│   ├── admin/(protected)/   # dashboard /users(/[id]) /admins /files /activities /support(/[id])
│   │                        #   AdminShell (sidebar+guard), PermissionGate, AdminForbidden
│   ├── admin/login/         # ayrı admin login
│   └── layout.tsx | page.tsx | error.tsx | loading.tsx | not-found.tsx
├── components/{ui,auth,common,profile,admin,support}/
├── hooks/                   # use-*, usePermissions, useAccountEvents + hooks/api/* (TanStack Query)
├── i18n/{config.ts, server.ts, locales/{en,tr}/*.json}
├── lib/
│   ├── api/{api.ts, endpoints/{auth,users,admin,support,files}.ts}
│   ├── config/routes.ts     # ROUTES + protectedRoutes/authRoutes/adminRoutes/... + getLocalizedPath
│   ├── seo/                 # metadata helpers
│   ├── websocket/           # self-healing socket'ler (support-socket, account-socket)
│   └── types/               # user, permissions (RBAC), admin, …
├── providers/{ClientSideProviders,QueryProvider,ThemeProvider}.tsx
├── schemas/                 # Zod (auth, user, admin) — factory pattern
├── stores/                  # Zustand (auth.store.ts)
├── test/                    # Vitest setup, MSW handlers, test-utils
├── env.ts                   # @t3-oss/env-nextjs
├── proxy.ts                 # ⚠️ middleware.ts değil — locale + auth guard
└── instrumentation{,-client}.ts  # Sentry init
tests-e2e/                   # Playwright
```

Yeni feature: page → `app/[locale]/{f}/page.tsx`, schema → `schemas/{f}.ts`, endpoint → `lib/api/endpoints/{f}.ts`, hook → `hooks/api/use-{f}.ts`, çeviri → `i18n/locales/{en,tr}/{ns}.json`. `(auth)` ve `(protected)` route group'ları parantezli — URL'e yansımaz.

---

## 3. Konvansiyonlar (kanıtlı)

### 3.1 Dosya/import/naming

- **Named export zorunlu**, default export yasak. **İstisna**: `page.tsx`/`layout.tsx`/`loading.tsx`/`error.tsx`/`not-found.tsx` Next.js zorunluluğu — [eslint.config.mjs:206-211](eslint.config.mjs).
- Component dosyası **PascalCase.tsx**; hook dosyası kebab-case `use-*.ts(x)` (örn. [hooks/api/use-auth.ts](src/hooks/api/use-auth.ts)). Eski `useLocalStorage.ts`/`useMediaQuery.ts` legacy.
- API endpoint: `lib/api/endpoints/{domain}.ts`, named export service object ([lib/api/endpoints/auth.ts:15-64](src/lib/api/endpoints/auth.ts)).
- Store: `stores/{f}.store.ts`. Schema: `schemas/{f}.ts`, factory `getXSchema(t)` + `z.infer<ReturnType<typeof getXSchema>>` ([schemas/auth.ts:20-43](src/schemas/auth.ts)).
- Props: `interface <ComponentName>Props`, **inline tanım**, ihraç edilmez ([AuthEmailField.tsx:7-16](src/components/auth/AuthEmailField.tsx)). `I`-prefix yasak ([eslint.config.mjs:96-104](eslint.config.mjs)).
- **`@/` alias zorunlu**, relative `../` import yasak.
- Import sırası (eslint-plugin-import): `builtin → external (react önce) → internal (@/**) → parent/sibling → index → type`, gruplar arası boş satır, alfabetik ([eslint.config.mjs:137-157](eslint.config.mjs)). `import type` kullanılır.
- Conventional Commits zorunlu (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`). Husky pre-commit lint+format, pre-push tsc+build koşar.

### 3.2 Server vs Client Component

- App Router: **server component default**. `"use client"` sadece hook/event/state gerektiğinde. `page.tsx` mümkün olduğunda server kalır; interaktif kısım `*Content.tsx`'e taşınır. Kanıt: [login/page.tsx](<src/app/[locale]/(auth)/login/page.tsx>) (server) → [LoginContent.tsx:1](<src/app/[locale]/(auth)/login/LoginContent.tsx>) (`"use client"`).

### 3.3 Routing & guard

- **`src/proxy.ts` kullanılır, `middleware.ts` yasak**. Kanıt: [src/proxy.ts:117-148](src/proxy.ts).
- URL `/{en|tr}/...`. Hardcode `/login` yasak — `getLocalizedPath(ROUTES.X, locale)` ile linklenir ([routes.ts:28-31](src/lib/config/routes.ts), [hooks/api/use-auth.ts:42-45](src/hooks/api/use-auth.ts)).
- `ROUTES`, `protectedRoutes`, `authRoutes`, `publicAuthRoutes`, `pendingDeletionRoutes`, `suspendedRoutes`, `adminRoutes` → tek noktada [lib/config/routes.ts](src/lib/config/routes.ts). Yeni route uygun listeye eklenmeli; aksi halde `proxy.ts` ve `AuthHydrator` koruma yapamaz.
- Locale algılama `getLocaleFromPath`/`getPathWithoutLocale` — manual regex yazılmaz.

### 3.4 API katmanı

- **Tek axios instance: [api.ts:35-46](src/lib/api/api.ts)**. `fetch()`/yeni `axios.create()` yasak.
- `withCredentials: true` + `X-Requested-With: XMLHttpRequest` — CSRF defense (HttpOnly cookie + SameSite + backend origin allow-list ile eşleşir). Bu header'lar kaldırılmamalı.
- Response interceptor `response.data` döner ([api.ts:180-182](src/lib/api/api.ts)).
- **Toast'lar interceptor'da çözülür** ([api.ts:48-58, 101-113, 174-179](src/lib/api/api.ts)) — backend i18n key'i `errors:`/`success:` namespace'inden çevrilir, hook'ta tekrar `toast.error` flag.
- 401 → tek seferlik **silent refresh** ([api.ts:115-147, 195-198](src/lib/api/api.ts)); başarısız ise `performLogout` + protected route üzerindeyse `/login`/`/admin/login`'e hard redirect ([api.ts:60-99](src/lib/api/api.ts)). `/auth/*` request'lerinde refresh atlanır, **istisna** `/auth/change-password` ([api.ts:32-33](src/lib/api/api.ts)). `_retry` flag ve `refreshPromise` deduplikasyonu silinmemeli — sonsuz refresh riski.

### 3.5 State management

- **Server → TanStack Query**. `QueryProvider` browser-side **singleton** ([QueryProvider.tsx:23-32](src/providers/QueryProvider.tsx)) — `useState(() => new QueryClient())` paterni kullanılmaz (App Router remount cache'i siler).
- Query key konvansiyonu: domain başına `XKeys` const + `all`/`detail(id)` factory ([use-users.ts:6-10](src/hooks/api/use-users.ts)).
- Mutation sonrası `queryClient.invalidateQueries({ queryKey })` zorunlu ([use-users.ts:36-60](src/hooks/api/use-users.ts)). Session-impacting mutation'larda `queryClient.clear()` (login [use-auth.ts:38](src/hooks/api/use-auth.ts), logout [use-auth.ts:99](src/hooks/api/use-auth.ts), deactivate [use-users.ts:91-96](src/hooks/api/use-users.ts)).
- Defaults [QueryProvider.tsx:5-16](src/providers/QueryProvider.tsx): `staleTime 5min`, `gcTime 10min`, `refetchOnWindowFocus: false`, `retry: 1`. Per-query sayısal override gerekçeli olmalı.
- **Client → Zustand** + `persist`. Tek store [auth.store.ts](src/stores/auth.store.ts); `partialize` ile **sadece `isAuthenticated` flag'i** persist edilir ([auth.store.ts:72-75](src/stores/auth.store.ts)). User objesi her zaman `/users/me`'den re-fetch edilir ([AuthHydrator.tsx:35-57](src/components/auth/AuthHydrator.tsx)). Profile alanlarını `localStorage`'tan okumak yasak.
- **Context API yasak** — yeni global state Zustand.

### 3.6 Auth hidrasyon

[AuthHydrator.tsx](src/components/auth/AuthHydrator.tsx) bütün protected/auth render'larını sarar. **Module-level `sessionRequestInFlight` guard'ı** React 19 Strict Mode double-invoke'unu absorbe eder ve `[locale]` layout remount'unda `/users/me`'nin tekrar atılmasını engeller ([AuthHydrator.tsx:23-27, 36-53](src/components/auth/AuthHydrator.tsx)) — kaldırılmamalı. Şu beş dosya birbirine bağlı, biri değişirse diğerleri kontrol edilmeli: `proxy.ts`, `api.ts`, `AuthHydrator.tsx`, `routes.ts`, `?session_expired=true` query parametresi ([api.ts:96](src/lib/api/api.ts), [proxy.ts:90](src/proxy.ts), [AuthHydrator.tsx:78](src/components/auth/AuthHydrator.tsx)).

### 3.7 Form & validation

- **Zod kaynak otoritedir.** Schema → `schemas/<f>.ts`, factory `getXSchema(t)` ile i18n mesajları enjekte edilir ([schemas/auth.ts:5-72](src/schemas/auth.ts)). TS tipleri schema'dan türetilir: `type LoginFormValues = z.infer<ReturnType<typeof getLoginSchema>>` ([schemas/auth.ts:36](src/schemas/auth.ts)).
- **Form altyapısı antd `Form`**: `const [form] = Form.useForm<T>()` + `<Form<T> form={form} onFinish={onSubmit} layout="vertical">` + `Form.Item name=".." rules={[...]}` ([LoginContent.tsx:48-78](<src/app/[locale]/(auth)/login/LoginContent.tsx>)). RHF, `useForm` (RHF), `zodResolver`, `Controller`, shadcn `FormField`/`FormItem`/`FormControl`/`FormMessage` **tamamen kaldırıldı**. Yeni form yazımında bunları geri getirmek **blocker**. Kodda görülen `useForm` antd'in `Form.useForm`'u olmalı.
- **Schema → rule köprüsü**: [`zodFieldRule(schema)`](src/lib/validation/zodToAntdRule.ts) zod schema'yı sync `safeParse` ile antd `Rule`'a çevirir; ilk issue'nun mesajı validation hatası olur. Kullanım: `<Form.Item rules={[zodFieldRule(getEmailSchema(tv))]}>` ([LoginContent.tsx:57](<src/app/[locale]/(auth)/login/LoginContent.tsx>)). Köprü sync — async refinement gerekiyorsa (uniqueness, server-side check) köprü genişletilmeli; `Form.Item`'a ayrı manuel async rule yazılıp `zodFieldRule` bypass'lanmaz.
- **Validation i18n**: `const { t: tv } = useTranslation("validation")` ve `tv` schema factory'ye geçirilir. Validation mesajı schema dışında hardcode edilmez (kural [3.8](#38-i18n--toast) ile aynı).
- **Submit**: antd `Form` `onFinish` parametresinde **validated** değerleri verir — manual `form.validateFields()` çağırılmaz. Hata `onFinishFailed` ile dinlenir (gerek varsa).
- **Auth field paylaşımları** (artık antd `Form.Item` içine sarılı, prop sözleşmesi korunuyor): [AuthEmailField](src/components/auth/AuthEmailField.tsx), [AuthPasswordField](src/components/auth/AuthPasswordField.tsx), [AuthNameFields](src/components/auth/AuthNameFields.tsx) — yeniden yazılmamalı.

### 3.8 i18n & toast

- Hardcoded user-facing string yasak. `useTranslation('ns')` → `t('key')`.
- Namespace'ler [i18n/config.ts:31-58](src/i18n/config.ts): `common, auth, validation, errors, success, home, dashboard, profile, seo, account, admin`. Yeni key **EN ve TR'de** eşleşik eklenmeli; yeni namespace `resources` + `ns` array'ine kaydedilmeli.
- Validation mesajları schema factory'lerinde `t` ile gelir — schema dışında string yazılmaz.
- Dil değiştirme `useLanguage().changeLanguage(lng)` ([hooks/use-language.ts](src/hooks/use-language.ts)) — `i18n.changeLanguage` doğrudan çağrılmaz.
- **Toast: antd `notification` + modül-seviye köprü [`@/lib/toast`](src/lib/toast.ts)** — sonner benzeri yüzey: `toast.success/error/info/warning(message, { id? })`. [`AntdProvider`](src/providers/AntdProvider.tsx) `App.useApp()`'ten gelen **theme-aware** instance'ı `bindNotification` ile bağlar; bind olmazsa static `notification` fallback ([toast.ts:19-21](src/lib/toast.ts)). `api.ts` gibi hook-dışı callers bu köprüden çağırır — antd'in `notification`'ını doğrudan import edip kullanmak **yasak** (dark mode / theme token kaybolur). `alert()` yasak ([eslint.config.mjs:171](eslint.config.mjs)). Duplicate önleme: `{ id }` antd `key`'ine çevrilir ([toast.ts:24-37](src/lib/toast.ts)). `sonner` paketi ve `components/ui/sonner.tsx` kaldırıldı — geri eklenmemeli.

### 3.9 Env

- `process.env.X` doğrudan kullanılmaz; `import { env } from "@/env"` ([src/env.ts](src/env.ts)) — `@t3-oss/env-nextjs` boot-time validate eder.
- Client erişimli env'ler `NEXT_PUBLIC_` prefixli; secret bu prefix ile expose edilirse **blocker** (bundle'a düşer).
- Yeni env: `env.ts` server/client schema + `runtimeEnv` mapping + `.env.example`.

### 3.10 ESLint kuralları (repo-spesifik)

- `max-lines: 300` error; per-folder override'lar: components 150, hooks 80, api 120 ([eslint.config.mjs:213-258](eslint.config.mjs)).
- `complexity: 15` (components 20, contexts 25).
- `@typescript-eslint/no-explicit-any: warn` (yeni `any` engellenir; mevcut'lar legacy).
- `@typescript-eslint/no-non-null-assertion: warn` (yeni `!` flag).
- `@typescript-eslint/restrict-template-expressions: error` — `allowAny: false`, `allowNullish: false` (string interpolation'da `any`/`null`/`undefined` kabul edilmez).
- `@typescript-eslint/naming-convention`: interface PascalCase, **`I`-prefix yasak**, typeAlias/enum PascalCase.
- `react/no-array-index-key: warn`, `react/no-danger: warn`, `react/jsx-boolean-value: never`.
- `no-console: warn` (sadece `console.warn`/`console.error` izinli), `no-debugger: error`, `eqeqeq: error always`.

### 3.11 Test

- **E2E**: [tests-e2e/](tests-e2e) `*.spec.ts`. API çağrıları **her zaman mock**; [base-test.ts](tests-e2e/base-test.ts) mock'lanmamış `**/api/v1/*` HTTP'yi 401 ile bloklar **ve** `page.routeWebSocket(/\/api\/v1\//, …)` ile realtime soketleri yerel yanıtlar — **hiçbir e2e backend'e HTTP veya WebSocket isteği atmaz**. RBAC senaryoları [tests-e2e/admin/rbac.spec.ts](tests-e2e/admin/rbac.spec.ts)'te; mock'lar [admin-helpers.ts](tests-e2e/admin/admin-helpers.ts) (`adminUser` tam izinli, `superadminUser` **root**, `nonRootSuperadminUser`, `makeAdmin([...])`).
- **Unit**: `*.test.tsx` kaynak ağacı içinde `__tests__/` veya `src/test/`. Vitest + Testing Library + MSW. Test wrapper [src/test/test-utils.tsx](src/test/test-utils.tsx) — `renderWithProviders`/`createWrapper`; her testte yeni `QueryClient` (`retry: false, gcTime: 0`).

### 3.12 Dosya yükleme (deferred / önizleme-önce)

- **Dosya seçimi anında yükleme yapılmaz.** Kullanıcı dosya seçtiğinde yalnızca **yerel önizleme** gösterilir (object URL); `POST /upload` çağrılmaz. Yükleme yalnızca kullanıcı **onayladığında** (Gönder / Tamam / Kaydet) tetiklenir.
- **Onay sırası kesin:** (1) dosyalar önce `files` tablosuna yazılır — Cloudinary + DB, [`filesApi.upload`](src/lib/api/endpoints/files.ts) → `POST /upload` → `FilePublic`; (2) dönen `FilePublic.id`'lerle **sonra** ilgili kaynak oluşturulur/güncellenir: ticket `attachment_file_ids` ([NewTicketModal.tsx](src/components/support/NewTicketModal.tsx)), mesaj `attachment_file_ids` ([ReplyBox.tsx](src/components/support/ReplyBox.tsx)), avatar `avatar_file_id` ([ProfileAvatar.tsx](src/components/profile/ProfileAvatar.tsx)).
- **Gerekçe — orphan kayıt yok:** iptal edilen veya gönderilmeyen seçim DB/Cloudinary'ye hiç yazılmaz. Pick anında upload, onaylanmadan yetim `files` satırı + Cloudinary asset bırakır.
- **Mekanizma:** çok-dosyalı [FileUpload](src/components/common/file-upload/FileUpload.tsx) submit anında imperatif `flush(): Promise<FilePublic[]>` ile yükler; tekil [AvatarUpload](src/components/common/file-upload/AvatarUpload.tsx) "Kaydet" ile. `flush` başarısız olursa ilgili mutation **çalıştırılmaz** (draft korunur).

### 3.13 RBAC & izin gating

- Roller `SystemRole` (`user`/`admin`/`superadmin`) [lib/types/user.ts](src/lib/types/user.ts); izinler `Permission` (`resource:action`, 12 adet — `users:role` **yok**) [lib/types/permissions.ts](src/lib/types/permissions.ts). İzinler `/users/me`'den gelir (yalnızca admin'e) — ayrıca her kullanıcıda `is_root_superadmin` — ve auth store'da tutulur.
- **Tek kaynak [`usePermissions()`](src/hooks/usePermissions.ts)** → `{ isSuperadmin, permissions, has(permission) }` + tekil hook'lar (`useCanReadUsers`, `useCanDeleteUsers`, `useCanUpdateSupport`, …) ve **`useIsRootSuperadmin`** (root-only katman aksiyonları için). Superadmin'de `has()` her zaman `true`. **Manuel `user.role === "admin"` / `permissions.includes(...)` karşılaştırması yazılmaz** — hook kullanılır.
- **Üç katman gating:** (1) **nav** — [AdminShell](<src/app/[locale]/admin/(protected)/AdminShell.tsx>) item'ları izne göre, superadmin ek olarak _Admins_; (2) **route** — admin sayfaları [`<PermissionGate permission={...}>`](<src/app/[locale]/admin/(protected)/PermissionGate.tsx>) ile sarılı, izinsiz `AdminForbidden`; (3) **action** — buton/alanlar `useCan*` ile koşullu. Aksiyon gizliyse [`PermissionNote`](src/components/admin/PermissionNote.tsx) ("istek gönderilmez") gösterilir.
- **Admin-yönetim sayfası** `/admin/admins` superadmin-only (`useIsSuperadmin`): admin **oluşturma** (zod-doğrulamalı [CreateAdminModal](<src/app/[locale]/admin/(protected)/admins/CreateAdminModal.tsx>)), izin matrisi modal'ı ([PermissionMatrix](<src/app/[locale]/admin/(protected)/admins/PermissionMatrix.tsx>)), root-duyarlı satır aksiyonları ([AdminRow](<src/app/[locale]/admin/(protected)/admins/AdminRow.tsx>) — hesap **sil**; root viewer'da **Superadmin yap** / **Admin'e düşür**) ve root-only **email-OTP root devri** ([TransferRootModal](<src/app/[locale]/admin/(protected)/admins/TransferRootModal.tsx>), `Input.OTP`). Root-tier aksiyonları `useIsRootSuperadmin` ile gate'lenir; mutation'lar [use-admin.ts](src/hooks/api/use-admin.ts) (`useCreateAdmin` / `useDeleteAdmin` / `usePromoteSuperadmin` / `useDemoteSuperadmin` / `useTransferRoot` / `useConfirmTransferRoot`).
- **Anlık güncelleme:** account WS ([lib/websocket/account-socket.ts](src/lib/websocket/account-socket.ts) + [hooks/useAccountEvents.ts](src/hooks/useAccountEvents.ts)) `permissions_updated`'da `/users/me` re-fetch eder.
- Admin/superadmin, user-alanı protected route'larından `/admin`'e yönlendirilir ([UserAreaGuard](<src/app/[locale]/(protected)/UserAreaGuard.tsx>)).

---

## 4. Anti-Pattern'ler (kaçınılır)

1. **`middleware.ts` ekleme** → `src/proxy.ts` kullan. **Blocker.**
2. **`fetch()` veya yeni `axios.create()`** — interceptor + refresh + global toast bypass'lanır.
3. **`Authorization: Bearer ...` header manuel ekleme** — auth HttpOnly cookie + `withCredentials: true` ile yapılır.
4. **Token'ı `localStorage`/`sessionStorage`'a yazma** — token HttpOnly cookie'de; `auth-storage` sadece `isAuthenticated` flag'i tutar.
5. **`process.env.X` doğrudan** — `@/env` zorunlu.
6. **Default export** (sayfa/layout/error/loading/not-found dışında).
7. **Relative `../` import** — `@/` zorunlu.
8. **Hardcoded user-facing string** — `t(key)` + EN/TR JSON.
9. **Hardcoded URL** — `getLocalizedPath(ROUTES.X, locale)`.
10. **`.css` dosyası ekleme** (`globals.css` haricinde) — Tailwind utility-only.
11. **Genel webpack config eklemek** — Turbopack default. Tek bilinçli istisna: [next.config.ts:75](next.config.ts) `webpack.treeshake.removeDebugLogging` (Sentry log strip).
12. **TanStack Query default'larını sayısal override** — gerekçesiz olmamalı.
13. **Mutation sonrası `invalidateQueries`/`clear()` unutma.**
14. **Cache key'inde dinamik parametre eksikliği** (id, dil, sayfa, filtre).
15. **`useEffect + fetch`** paterni — TanStack Query.
16. **Yeni Context API provider** — Zustand.
17. **`ROUTES`/`protectedRoutes`/`authRoutes` listelerini güncellemeden yeni route ekleme.**
18. **Toast duplicate** — interceptor zaten gösteriyorken hook'ta `toast.error` tekrar.
19. **RHF / `useForm` (RHF) / `zodResolver` / `Controller` / shadcn `Form*` (`FormField`/`FormItem`/`FormControl`/`FormMessage`) / `sonner` geri ekleme** — antd `Form` + `Form.useForm` + `zodFieldRule` + `@/lib/toast` köprüsü standardı. **Blocker.**
20. **antd'in statik imperative API'leri** (`notification.*` / `message.*` / `Modal.confirm` / `Modal.info`/`success`/`error`/`warning`) doğrudan import — React ağacının dışında çalışır, **ConfigProvider / theme token / dark mode kaybolur**. Toast için [`@/lib/toast`](src/lib/toast.ts) köprüsü zorunlu.
21. **Confirm/dialog için `Modal.confirm` kullanma** — bu projede **declarative JSX `<Modal open={...} onOk onCancel>`** standardı. Örnek paylaşımlı bileşen: [components/admin/ConfirmDialog.tsx](src/components/admin/ConfirmDialog.tsx). Yeni confirm akışlarında bunu kullan veya aynı pattern'i izle.
22. **Dosya seçilir seçilmez upload** (antd `customRequest` / `onChange` anında `POST /upload`) — kullanıcı onayı olmadan orphan `files`+Cloudinary kaydı. Upload submit/confirm'e ertelenmeli (kural [3.12](#312-dosya-yükleme-deferred--önizleme-önce)).

---

## 5. Review'da KESİNLİKLE Flag'lenecekler

### 5.1 Next.js 16 / App Router

- **`middleware.ts` eklenmesi** — blocker.
- **`page.tsx`/`layout.tsx`'te gereksiz `"use client"`** veya tam tersi (interaktif bölüm `*Content.tsx`'e ayrılmamış).
- **`next/router`'dan import** — App Router'da `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`).
- **Webpack config eklenmesi** ([next.config.ts](next.config.ts)).
- **`<Image>`/`<Link>` yerine `<img>`/`<a>`**.

### 5.2 React doğruluğu

- **Stale closure / eksik `useEffect` deps** — `react-hooks/exhaustive-deps` susturulmuşsa gerekçe yok.
- **State mutasyonu** (`arr.push(x); setArr(arr)` vb.).
- **`key={index}`** — stabil id varken.
- **Conditional/out-of-order hook**.
- **`useEffect` cleanup eksikliği** (interval, subscription, AbortController, WebSocket).
- **`useState(expensive())`** — lazy initializer eksik.
- **`useState(() => new QueryClient())`** [QueryProvider.tsx](src/providers/QueryProvider.tsx) dışında — App Router remount cache'i siler.
- **Inline obje/array prop** ile `React.memo`'yu kırma.
- **`useEffect` dep array'inde her render değişen obje** → sonsuz döngü.

### 5.3 Veri / state

- **`useEffect + fetch + useState`** — TanStack Query.
- **Cache key'inde dinamik parametre eksik** (id, dil, sayfa, filtre).
- **Mutation sonrası `invalidateQueries` eksik** ([use-users.ts:50-60](src/hooks/api/use-users.ts) paternine bak).
- **Session-impacting mutation'da `queryClient.clear()` eksik** (login/logout/deactivate).
- **Zustand store'da mutation** (`set` callback fonksiyonel olmalı).
- **Profile'ı `localStorage`'tan okuma** — sadece `isAuthenticated` persist edilir.

### 5.4 API & güvenlik (auth stack'i sıkı koordine)

- **`fetch()` veya yeni `axios.create()`.**
- **Manuel `Authorization: Bearer`** — cookie auth bozulur.
- **`X-Requested-With: XMLHttpRequest` veya `withCredentials: true` kaldırma** ([api.ts:43-46](src/lib/api/api.ts)) — CSRF defense kırılır.
- **Token'ı log'a/URL query'sine/console'a/error message'a sızdırma**, `auth-storage` dışında bir key'e yazma.
- **`dangerouslySetInnerHTML`** sanitize katmanı olmadan.
- **`NEXT_PUBLIC_*` ile secret expose** — bundle'da public.
- **`process.env.X` doğrudan** — `@/env` zorunlu.
- **Open redirect**: `router.push(userInput)`, `<Link href={userInput}>` allowlist'siz.
- **`_retry`/`refreshPromise` deduplikasyonunu değiştirme** ([api.ts:115-147, 184, 195-198](src/lib/api/api.ts)) — sonsuz refresh.
- **`AuthHydrator`'daki `sessionRequestInFlight` guard'ını kaldırma** ([AuthHydrator.tsx:23-27](src/components/auth/AuthHydrator.tsx)).
- **`/auth/*` refresh atlama mantığını değiştirme** ([api.ts:32-33](src/lib/api/api.ts)) — login/register 401 sonsuz refresh döngüsü.
- **Upload pick anında yapılıyor** (submit/confirm yerine) veya **ilgili kaynak file id'den önce / id olmadan güncelleniyor** — sıra: önce `files`'a yaz, sonra ilgili kaynağı güncelle (kural [3.12](#312-dosya-yükleme-deferred--önizleme-önce)).

### 5.5 Form

- **Zod schema'sız yeni form.** Schema `schemas/<f>.ts` factory pattern'inde olmalı.
- **antd `Form.Item` bypass'i**: form içinde `Form.Item`'a sarılmamış ham `<input>` + manual state.
- **`Form.Item` `rules` array'inde `zodFieldRule(getXSchema(tv))` eksik** — validation sessiz geçer, kullanıcı hatalı veri submit edebilir.
- **`Form.useForm()` yerine `useState` ile form değeri yönetimi** — antd `Form` kontrolünü kaybeder, `onFinish` validated değer döndüremez.
- **Manuel rule'la `zodFieldRule` bypass'ı** — async refinement gerekiyorsa köprü genişletilmeli, `Form.Item`'a ayrı `{ validator }` yazılıp zod kaynağı atlanmaz.
- **RHF / `zodResolver` / `Controller` / shadcn `FormField`/`FormItem`/`FormControl`/`FormMessage` geri getirme.** Migration sonrası **blocker**.
- **`i18n` schema factory dışında** validation mesajı hardcode. `useTranslation("validation")` `tv` schema'ya geçirilmeli.
- **Submit handler'da `catch {}`** ve loading state UI'a yansıtılmamış — submit `<Button type="submit" loading={mutation.isPending}>` pattern'i ([UserEditForm.tsx:87](src/components/admin/UserEditForm.tsx)).

### 5.6 Routing & auth

- **Yeni protected route `protectedRoutes`'a eklenmemiş** ([routes.ts:34-41](src/lib/config/routes.ts)) — guard atlar.
- **Yeni auth route `authRoutes`'a eklenmemiş** — login'li kullanıcı /login'e dönebilir.
- **Hardcoded `/login`/`/dashboard`** — `getLocalizedPath(ROUTES.X, locale)`.
- **Locale segmentini bypass eden `<Link href="/dashboard">`**.
- **Admin / izin kontrolünü atlama:** korumalı admin aksiyonu/sayfası `usePermissions`/`useCan*`/`PermissionGate` ile gate'lenmemiş; superadmin-özel UI `useIsSuperadmin` olmadan; **manuel `user.role` / `permissions.includes(...)` karşılaştırması** (hook kullanılmalı). Kural [3.13](#313-rbac--izin-gating).

### 5.7 i18n & UX

- **Hardcoded TR/EN string** JSX/JSX prop içinde.
- **`t(key)` çağrısı var ama EN veya TR JSON'da key yok** — runtime'da key string olarak görünür.
- **Yeni namespace [i18n/config.ts](src/i18n/config.ts) `resources`'a eklenmemiş.**
- **Backend ham mesajını toast'a doğrudan basma** — interceptor `errors:`/`success:` namespace çevirisini yapıp [`@/lib/toast`](src/lib/toast.ts) köprüsünden gösterir ([api.ts:54-56](src/lib/api/api.ts)). Component'te `error.response.data.detail`'i hardcoded toast'lamak duplicate + lokalizasyon kaybı.
- **Toast duplicate** — interceptor zaten gösteriyorken hook'ta `toast.error` tekrar. Mutation `onError` içinde toast atmak gereksiz (interceptor halletti) — sadece state/cleanup yap.
- **antd `notification` / `message`'ı doğrudan import edip `notification.error(...)`** — `@/lib/toast` köprüsü zorunlu, statik instance ConfigProvider/theme dışında kalır.

### 5.8 TypeScript

- **Yeni `any`** — generic veya `unknown` + narrowing.
- **Yeni `!` non-null assertion**.
- **`as` cast'i ile zorlama** (özellikle `as any`, `as unknown as X`).
- **`I`-prefix interface ismi.**
- **Inline `({a, b}: {a:string})` props** — `interface XProps` zorunlu.
- **Template literal'da `null`/`undefined`/`any`** (`restrict-template-expressions: error`).

### 5.9 Performans / a11y / stil

- **Büyük tablo/liste'de virtualization yok + agresif re-render** (inline obje prop, `useMemo`/`useCallback` eksik).
- **Interactive `<div onClick>`** — `<Button>` ya da `role` + `tabIndex` + `onKeyDown`.
- **`<img>` `alt` eksik** (`alt=""` decorative kabul).
- **Inline `style={{}}`** (motion `initial`/`animate` veya CSS variable hariç).
- **Hardcoded hex renk** (`bg-[#1677ff]`) — Tailwind theme token (`bg-primary`, `text-muted-foreground`).
- **`cn()` yerine string concatenation** (özellikle koşullu class).
- **Yeni `.css` dosyası** (`globals.css` hariç).

### 5.10 Test & dosya boyutu

- E2E'de **gerçek backend'e vuran test** — mock'lanmamış.
- Page Object dışında **selector hardcode**.
- Yeni dosya `max-lines: 300` üzerinde, fonksiyon limiti aşımı (components 150, hooks 80, api 120) — refactor talebi.
- `complexity` 15/20/25 üzerinde.

---

## 6. Görmezden Gelinecekler (false-positive)

Bu maddeleri **flag etme**:

1. **Linter/TS zaten yakalıyorsa** (unused import/var, missing return type) — CI'da fail olur.
2. **PR diff'inde olmayan satır** — pre-existing kabul.
3. **`eslint-disable-next-line` mevcut ve gerekçeli** (örn. [api.ts:180](src/lib/api/api.ts) `no-unsafe-return` interceptor'da bilinçli).
4. **Formatting nitpick** (boşluk, virgül, Tailwind class sırası) — Prettier + `prettier-plugin-tailwindcss` halleder.
5. **Eski dosyada `any` PR'da değişmediyse**. Yeni `any` flag.
6. **TODO** ticket/sahip referansı varsa kabul; tamamen sahipsizse minor.
7. **i18n key'i TR/EN'de küçük yazım farkı** — bug değil.
8. **Test eksikliği** yeni feature için — minor öneri, blocking değil. Auth/security/payment'ta major.
9. **antd component'lerinin ve `src/components/ui/` local primitive layer'ının kendi DOM'undaki a11y attribute'ları** — kütüphane / paylaşımlı bileşen sağlıyor; bu component'lerin dışındaki ham `<div>`'ler hâlâ flag.
10. **`React.memo` eksikliği** — sadece kanıtlanmış re-render maliyeti varsa flag.
11. **`console.log`** — sadece production-impacting dosyalarda flag (`api.ts`, `auth.store.ts`, `proxy.ts`, `instrumentation*.ts`); diğerlerinde ESLint warn yeterli.
12. **"Generic best practice"** önerileri (clean code, SOLID, DI) — review skopu dışı.
13. **Sayfa default export'u** (`page.tsx`/`layout.tsx`/...) — Next.js zorunluluğu, override var.
14. **`components/ui/*` local primitive layer pattern'leri** — Button/Input/Checkbox antd wrap, Card/Label/Alert/Avatar/Separator/Skeleton sıfır-bağımlılıklı Tailwind; bu dosyaların iç pattern'i (variant class map, `cn()` kullanımı, `data-slot` attribute'ları) bilinçli — flag etme.
15. **`useLocalStorage`/`useMediaQuery` kebab-case değil** — legacy isim; sadece **yeni hook'lar** kebab-case.

---

## 7. Review Yazma Stili

- Türkçe, kısa, doğrudan.
- "Bu değişiklik X kuralını ihlal ediyor: <REVIEW.md alıntısı>" — soyut kural değil somut kanıt.
- Her bulgu: **dosya + satır + kural + öneri** (tek satırda anlaşılır düzeltme).
- Confidence < 80 ise yorumlama (slash komutu zaten filtreliyor).
- "Görmezden gelinecekler" listesindeki şeyleri yorumlama.

---

Son güncelleme: 2026-06-09.
