# Graph Report - frontend  (2026-11-07)

## Corpus Check
- 500 files · ~153,199 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 6, .example 1, .css 1)

## Summary
- 2218 nodes · 8784 edges · 110 communities (97 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- ActivityTable.tsx
- HomeMarquee.tsx
- AdminUser
- TicketStatusBadge.tsx
- AuthButtons.tsx
- vitest
- PermissionSetFormModal.tsx
- ROUTES
- Playwright E2E Tests
- Localization Resources
- Admin Test Helpers
- UserAccessAssignModal.tsx
- BroadcastComposer.tsx
- Broadcast History and Dialogs
- UsersTable.tsx
- utils.ts
- Admin Permissions UI
- User and Settings Forms
- Runtime Dependencies
- types/user.ts
- PermissionSetsContent.tsx
- msw/server.ts
- CI Workflow
- file.ts
- Support API and Query Hooks
- quote.ts
- ActivitiesContent.tsx
- Development Tooling Dependencies
- MessageThread.tsx
- ROUTES
- QuotePages.tsx
- ESLint Configuration
- vitest
- AdminListItem
- types/rbac.ts
- Support Playwright Tests
- TypeScript Compiler Configuration
- types/notification.ts
- env.ts
- variants.ts
- AdminSupportContent.tsx
- Realtime Support Hooks
- RolesContent.test.tsx
- lucide-react
- @tanstack/react-query
- types/notification.ts
- metadata.ts
- next
- use-permissions.ts
- QuoteWizard.tsx
- Frontend Package Scripts
- support-socket.ts
- Notification Helpers and Tests
- Workspace and Package Overrides
- Local Storage Hook
- ClientSideProviders.tsx
- CustomersView.tsx
- types/admin.ts
- use-support.test.tsx
- quote-format.ts
- PageTransition.tsx
- use-admin.ts
- TypeScript ESLint Configuration
- lucide-react
- AppDrawer.test.tsx
- Vite and Vitest Setup
- announcement-banner.spec.ts
- useAuthStore
- use-account-events.ts
- Code Review Guidance
- PostCSS Configuration
- UI and API Architecture
- Hooks and i18n Architecture
- Realtime State Architecture
- Next.js Template Overview
- Utility and API Layer
- Zod Validation
- Playwright E2E Coverage
- package.json
- types/announcement.ts
- renderWithProviders
- AnnouncementBanner.tsx
- Button
- EditPermissionsModal.test.tsx
- AppHeader.tsx
- schemas/support.ts
- HomeFooter.tsx
- QuoteDetailView.tsx
- proxy.ts
- api.ts
- SecurityTab.tsx
- UsersFilters.tsx
- cn
- CreateAdminModal.tsx
- SystemRole
- ProfileContent
- announcement-render.ts
- Label
- formatDateTime
- admin/(protected)/quotes/[id]/edit/page.tsx
- endpoints/auth.ts
- AdminActionConfirm.tsx
- EditPermissionsModal.tsx
- admin/(protected)/quotes/[id]/page.tsx
- admin/(protected)/quotes/[id]/print/page.tsx
- DealershipsAdminView.tsx
- PermissionSetsContent.test.tsx
- dealership/page.tsx
- FakeWebSocket

## God Nodes (most connected - your core abstractions)
1. `Button()` - 149 edges
2. `react-i18next` - 141 edges
3. `Permission` - 130 edges
4. `getLocalizedPath()` - 113 edges
5. `next` - 104 edges
6. `ROUTES` - 101 edges
7. `react` - 101 edges
8. `Card()` - 98 edges
9. `cn()` - 98 edges
10. `CardContent()` - 96 edges

## Surprising Connections (you probably didn't know these)
- `NotificationMockState` --references--> `NotificationItem`  [EXTRACTED]
  tests-e2e/notifications/notification-helpers.ts → src/lib/types/notification.ts
- `MockUser` --references--> `SystemRole`  [EXTRACTED]
  tests-e2e/account/deactivate.spec.ts → src/lib/types/user.ts
- `ForgotPassword()` --calls--> `ForgotPasswordContent()`  [EXTRACTED]
  src/app/[locale]/(auth)/forgot-password/page.tsx → src/app/[locale]/(auth)/forgot-password/ForgotPasswordContent.tsx
- `Login()` --calls--> `LoginContent()`  [EXTRACTED]
  src/app/[locale]/(auth)/login/page.tsx → src/app/[locale]/(auth)/login/LoginContent.tsx
- `Register()` --calls--> `RegisterContent()`  [EXTRACTED]
  src/app/[locale]/(auth)/register/page.tsx → src/app/[locale]/(auth)/register/RegisterContent.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **RBAC & Permission System** — src_hooks_usepermissions, src_stores, src_lib_websocket, src_app_locale [EXTRACTED 1.00]
- **Automated Review Pipeline** — claude_commands_review, review_md, tests_e2e [INFERRED 0.90]

## Communities (110 total, 13 thin omitted)

### Community 0 - "ActivityTable.tsx"
Cohesion: 0.20
Nodes (12): ActivityDetails(), ActivityTable(), actorLabel(), formatScalar(), isScalar(), ScalarJson, statusCodeTone(), DATE_OPTIONS (+4 more)

### Community 1 - "HomeMarquee.tsx"
Cohesion: 0.50
Nodes (4): HomeMarquee(), MarqueeRow(), MarqueeRowProps, TAG_KEYS

### Community 2 - "AdminUser"
Cohesion: 0.26
Nodes (12): AdminTierCaps, canMutateTarget(), capsForTarget(), NO_ADMIN_TIER_CAPS, UserActionCaps, caps, UserDangerZoneProps, buildRowMenu() (+4 more)

### Community 3 - "TicketStatusBadge.tsx"
Cohesion: 0.18
Nodes (14): SupportTicketsTableProps, ControlsFormValues, TicketList(), TicketListProps, PRIORITY_TONE, STATUS_TONE, TicketPriorityBadge(), TicketPriorityBadgeProps (+6 more)

### Community 4 - "AuthButtons.tsx"
Cohesion: 0.13
Nodes (30): AdminSidebarFooter(), AdminSidebarFooterProps, AuthButtons(), AuthButtonsProps, MENU_ENTRIES, MenuEntry, drawerItem, drawerList (+22 more)

### Community 5 - "vitest"
Cohesion: 0.09
Nodes (15): @testing-library/react, vitest, mockSearchParams, mockPush, mockReplace, mockResendEmail, mockSearchParams, imageRow (+7 more)

### Community 6 - "PermissionSetFormModal.tsx"
Cohesion: 0.20
Nodes (13): BodyProps, PermissionSetFormBody(), PermissionSetFormModal(), PermissionSetFormModalProps, ApiErrorNote(), ApiErrorNoteProps, ELEMENT_KEY_PATTERN, invalidateElements() (+5 more)

### Community 7 - "ROUTES"
Cohesion: 0.08
Nodes (35): generateMetadata(), AdminLoginPage(), generateMetadata(), generateMetadata(), generateMetadata(), generateMetadata(), AdminDashboardPage(), generateMetadata() (+27 more)

### Community 8 - "Playwright E2E Tests"
Cohesion: 0.16
Nodes (13): @playwright/test, baseUser, adminFile, test, avatarFile, baseUser, PNG_BUFFER, mockUser (+5 more)

### Community 9 - "Localization Resources"
Cohesion: 0.08
Nodes (6): resources, LANGUAGES, Locale, Namespace, resources, bundles

### Community 10 - "Admin Test Helpers"
Cohesion: 0.10
Nodes (32): ActivityTableProps, AdminActivity, badLogin, baseActivity, ADMIN_PERMISSIONS, adminListItems, adminUser, ALL_PERMISSIONS (+24 more)

### Community 11 - "UserAccessAssignModal.tsx"
Cohesion: 0.20
Nodes (14): AssignBody(), AssignKind, AssignModalProps, buildRows(), EMPTY_ROW, pad(), Row, Rows (+6 more)

### Community 12 - "BroadcastComposer.tsx"
Cohesion: 0.12
Nodes (28): i18next, AnnouncementPreviewProps, BroadcastComposer(), buildVariables(), FormValues, CustomLanguageFields(), CustomLanguageFieldsProps, LANGUAGES (+20 more)

### Community 13 - "Broadcast History and Dialogs"
Cohesion: 0.12
Nodes (25): react-i18next, DeviceIcon(), DeviceIconProps, MOBILE_OS, SessionRow(), SessionRowProps, UserSessionsCard(), UserSessionsCardProps (+17 more)

### Community 14 - "UsersTable.tsx"
Cohesion: 0.23
Nodes (29): AdminsTable(), FilesTable(), fullName(), isImage(), AdminTable(), AdminTableStateRow(), AdminTableStateRowProps, AdminTbody() (+21 more)

### Community 15 - "utils.ts"
Cohesion: 0.11
Nodes (30): motion, AboutContent(), ValueDef, VALUES, About(), HomeContent(), Home(), SectionHeader() (+22 more)

### Community 16 - "Admin Permissions UI"
Cohesion: 0.03
Nodes (59): PermissionGateProps, PermissionsApi, Permission, ActivitiesRead, AdminsDelete, AdminsRead, AdminsWrite, BroadcastRead (+51 more)

### Community 17 - "User and Settings Forms"
Cohesion: 0.15
Nodes (42): AdminRow(), StatCard(), UserDetailContent(), AccountDeactivatedContent(), AccountDeactivatedPage(), AccountSuspendedContent(), CATEGORY_ORDER, SystemSettingsForm() (+34 more)

### Community 18 - "Runtime Dependencies"
Cohesion: 0.08
Nodes (26): dependencies, @ant-design/cssinjs@^2.1.2, @ant-design/icons@^6.2.5, antd@^6.4.3, axios@^1.17.0, clsx@^2.1.1, i18next@^25.10.10, i18next-browser-languagedetector@^8.2.1 (+18 more)

### Community 19 - "types/user.ts"
Cohesion: 0.14
Nodes (10): avatar, currentUser, UpdateUserParams, userKeys, useUsers(), usersApi, UpdateMePayload, User (+2 more)

### Community 20 - "PermissionSetsContent.tsx"
Cohesion: 0.17
Nodes (21): AdminForbidden(), AdminPermissionSetsPage(), PermissionSetsContent(), AdminRolesPage(), RoleFormModal(), RolesContent(), AudienceBadge(), RbacDeleteDialog() (+13 more)

### Community 21 - "msw/server.ts"
Cohesion: 0.12
Nodes (16): msw, mockPush, ticket, avatar, userWithAvatar, mockReplace, PageContent(), renderHydrator() (+8 more)

### Community 22 - "CI Workflow"
Cohesion: 0.08
Nodes (24): concurrency, cancel-in-progress, group, jobs, lint-and-typecheck, name, runs-on, steps (+16 more)

### Community 23 - "file.ts"
Cohesion: 0.12
Nodes (30): FilesTableProps, AvatarActions(), AvatarActionsProps, AvatarUpload(), AvatarUploadProps, DEFAULT_IMAGE_TYPES, DEFAULT_MAX_UPLOAD_SIZE, FileValidationError (+22 more)

### Community 24 - "Support API and Query Hooks"
Cohesion: 0.17
Nodes (19): ReplyBoxProps, invalidateAdminSurfaces(), QueryClient, useAdminReplyTicket(), adminSupportApi, userSupportApi, AdminTicketListParams, AdminTicketListResponse (+11 more)

### Community 25 - "quote.ts"
Cohesion: 0.07
Nodes (42): CustomerFormModal(), CustomerFormModalProps, FormValues, catalogKeys, customerKeys, dealershipKeys, quoteKeys, READ_KEYS (+34 more)

### Community 26 - "ActivitiesContent.tsx"
Cohesion: 0.13
Nodes (20): ActivitiesContent(), ACTIVITY_TYPES, isResourceFilter(), isStatusFilter(), isTypeFilter(), parseStatusCodeFilter(), RESOURCE_TYPES, ResourceFilter (+12 more)

### Community 27 - "Development Tooling Dependencies"
Cohesion: 0.11
Nodes (17): eslint-config-next@16.1.6, eslint-import-resolver-typescript@^4.4.5, jsdom@^29.1.1, prettier@^3.8.3, tailwindcss@^4.3.0, @testing-library/jest-dom@^6.9.1, @types/node@^20.19.42, name (+9 more)

### Community 28 - "MessageThread.tsx"
Cohesion: 0.43
Nodes (4): MessageThreadProps, file, SenderRole, SupportMessage

### Community 29 - "ROUTES"
Cohesion: 0.38
Nodes (6): AdminActivitiesPage(), AdminFilesPage(), PermissionGate(), AdminSupportPage(), AdminUsersPage(), ROUTES

### Community 30 - "QuotePages.tsx"
Cohesion: 0.10
Nodes (26): AdminCatalogPage(), generateMetadata(), AdminCustomersPage(), generateMetadata(), AdminDealershipsPage(), generateMetadata(), AdminQuotesPage(), generateMetadata() (+18 more)

### Community 31 - "ESLint Configuration"
Cohesion: 0.10
Nodes (20): eslint@^9.39.4, eslint-config-prettier@^10.1.8, @eslint/js@^10.0.1, eslint-plugin-import@^2.32.0, eslint-plugin-jsx-a11y@^6.10.2, eslint-plugin-react@^7.37.5, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.2 (+12 more)

### Community 32 - "vitest"
Cohesion: 0.18
Nodes (11): renderModal(), ticketResponse, setup(), mockAdminFile, mockFile, mockNotification, { sockets, authState, getMe }, event (+3 more)

### Community 33 - "AdminListItem"
Cohesion: 0.24
Nodes (10): buildRowMenu(), RowMenuActions, RowMenuArgs, AdminActionState, AdminRowProps, AdminsTableProps, EditPermissionsModalProps, menuKeys() (+2 more)

### Community 34 - "types/rbac.ts"
Cohesion: 0.16
Nodes (19): RoleFormBodyProps, RoleFormModalProps, rbacKeys, QueryClient, rbacApi, AssignmentsUpdatePayload, EffectivePermission, PermissionSetCreatePayload (+11 more)

### Community 35 - "Support Playwright Tests"
Cohesion: 0.18
Nodes (18): adminMessage, adminTicketDetail, adminTicketListItem, closedAdminTicketDetail, closedTicketDetail, listResponse(), mockAdminReply(), mockAdminTicketDetail() (+10 more)

### Community 36 - "TypeScript Compiler Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 37 - "types/notification.ts"
Cohesion: 0.19
Nodes (8): JsonValue, NotificationRealtimeEvent, createNotificationSocket(), NotificationSocket, FakeWebSocket, jsonValueSchema, notificationItemSchema, notificationRealtimeEventSchema

### Community 38 - "env.ts"
Cohesion: 0.09
Nodes (21): nextConfig, securityHeaders, @ant-design/nextjs-registry@^1.3.0, @t3-oss/env-nextjs@^0.13.11, @ant-design/nextjs-registry, @sentry/nextjs, @t3-oss/env-nextjs, generateMetadata() (+13 more)

### Community 39 - "variants.ts"
Cohesion: 0.11
Nodes (22): ProfileContentProps, ProfileTab, TabDef, TABS, BrandWordmark(), BrandWordmarkProps, HeroHeadline(), HeroHeadlineProps (+14 more)

### Community 40 - "AdminSupportContent.tsx"
Cohesion: 0.20
Nodes (15): AdminSupportContent(), isTicketPriorityFilter(), isTicketStatusFilter(), TicketPriorityFilter, TicketStatusFilter, SupportTicketsFilters(), SupportTicketsFiltersProps, customerName() (+7 more)

### Community 41 - "Realtime Support Hooks"
Cohesion: 0.17
Nodes (13): adminSupportKeys, supportKeys, { subscribeTicket, unsubscribeTicket }, useTicketRealtime(), SupportSocket, appendMessage(), ConnectArgs, SupportRealtimeState (+5 more)

### Community 42 - "RolesContent.test.tsx"
Cohesion: 0.22
Nodes (6): adminSet, customRole, stamp, systemRole, userSet, WRITER

### Community 43 - "lucide-react"
Cohesion: 0.11
Nodes (39): antd, lucide-react, zod, AdminLoginContent(), LoginContent(), RegisterContent(), FILE_CONTENT_TYPES, FilesFilters() (+31 more)

### Community 44 - "@tanstack/react-query"
Cohesion: 0.43
Nodes (4): @tanstack/react-query, getQueryClient(), queryDefaults, QueryProvider()

### Community 45 - "types/notification.ts"
Cohesion: 0.19
Nodes (16): AdminTopbar(), AdminTopbarProps, NotificationBell(), NotificationBellInner(), notificationKeys, useUnreadCount(), useNotificationRealtime(), useCanReadOwnNotifications() (+8 more)

### Community 46 - "metadata.ts"
Cohesion: 0.12
Nodes (14): geistMono, generateMetadata(), inter, THEME_STYLES, generateMetadata(), SupportTicketPage(), SupportTicketPageProps, resolvePageMeta() (+6 more)

### Community 47 - "next"
Cohesion: 0.11
Nodes (13): next, AdminIndexPage(), AdminIndexPageProps, AdminProtectedLayoutProps, AdminTicketPage(), AdminTicketPageProps, generateMetadata(), AdminUserDetailPage() (+5 more)

### Community 48 - "use-permissions.ts"
Cohesion: 0.06
Nodes (64): AdminNavCaps, AdminNavItem, buildAdminNav(), AdminsContent(), AdminAdminsPage(), AdminShell(), AdminShellProps, BroadcastsContent() (+56 more)

### Community 49 - "QuoteWizard.tsx"
Cohesion: 0.15
Nodes (28): category, services, validDraft(), compactPhone(), currentYear(), customerIssues(), draftFromQuote(), draftToPayload() (+20 more)

### Community 50 - "Frontend Package Scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, format, format:check, lint, prepare, start (+3 more)

### Community 51 - "support-socket.ts"
Cohesion: 0.22
Nodes (12): RealtimeEvent, AccountSocket, createAccountSocket(), connect(), connect(), buildWsUrl(), createReconnectingSocket(), connect() (+4 more)

### Community 52 - "Notification Helpers and Tests"
Cohesion: 0.36
Nodes (7): bellBadge(), fillTemplate(), mockNotifications(), permissionsNotification, repliedNotification, unreadCount(), WebSocketRoute

### Community 53 - "Workspace and Package Overrides"
Cohesion: 0.20
Nodes (9): allowBuilds, msw, @sentry/cli, sharp, unrs-resolver, overrides, postcss, vite (+1 more)

### Community 55 - "ClientSideProviders.tsx"
Cohesion: 0.06
Nodes (37): Logout(), RootLayout(), Loading(), adminRedirectTarget(), AuthHydrator(), ErrorBoundary(), ErrorBoundaryBase, ErrorBoundaryProps (+29 more)

### Community 56 - "CustomersView.tsx"
Cohesion: 0.15
Nodes (14): FilesContent(), Pending, ConfirmDialog(), ConfirmDialogProps, AdminPagination(), DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, PaginationProps (+6 more)

### Community 57 - "types/admin.ts"
Cohesion: 0.14
Nodes (22): user, UserAccessPanelProps, UserAvatarCardProps, UserEditFormProps, ActivityActor, ActivityDetails, AdminActivityListParams, AdminActivityListResponse (+14 more)

### Community 58 - "use-support.test.tsx"
Cohesion: 0.18
Nodes (9): TicketAdminControlsProps, listItem, mockAdminTicketDetail, mockMessage, mockTicketDetail, useMyTicket(), useMyTickets(), AdminTicketDetail (+1 more)

### Community 59 - "quote-format.ts"
Cohesion: 0.17
Nodes (18): estimateMonthlyPayment(), formatCalendarDate(), formatMoney(), isFinanced(), STATUS_COLORS, QuoteDocument(), quote, linePrice() (+10 more)

### Community 60 - "PageTransition.tsx"
Cohesion: 0.60
Nodes (3): Template(), PageTransition(), PageTransitionProps

### Community 61 - "use-admin.ts"
Cohesion: 0.19
Nodes (17): TransferRootModal(), mockActivity, mockAdmin, adminKeys, QueryClient, useAdminActivities(), useAdminUsers(), useChangeAdminUserPassword() (+9 more)

### Community 62 - "TypeScript ESLint Configuration"
Cohesion: 0.40
Nodes (4): ./tsconfig.json, exclude, extends, include

### Community 63 - "lucide-react"
Cohesion: 0.10
Nodes (35): react, RoleFormBody(), AdminTicketDetailContent(), AdminTicketDetailContentProps, TicketDetailContent(), TicketDetailContentProps, StatusFilter, SupportContent() (+27 more)

### Community 64 - "AppDrawer.test.tsx"
Cohesion: 0.40
Nodes (4): createMockUser(), defaultProps, mockAuthenticated(), mockPush

### Community 66 - "announcement-banner.spec.ts"
Cohesion: 0.40
Nodes (3): activeBanner, DISMISS, TITLE

### Community 67 - "useAuthStore"
Cohesion: 0.13
Nodes (11): DashboardContent(), Dashboard(), detail, quote, AuthState, initialFlag, StoredAuth, useAuthStore (+3 more)

### Community 68 - "use-account-events.ts"
Cohesion: 0.36
Nodes (6): sessionKeys, pruneParams(), sessionsApi, SessionListParams, SessionListResponse, SessionsRevokedResponse

### Community 79 - "package.json"
Cohesion: 0.09
Nodes (22): devDependencies, husky@^9.1.7, lint-staged@^16.4.0, msw@^2.14.6, @playwright/test@^1.60.0, prettier-plugin-tailwindcss@^0.7.4, @tailwindcss/postcss@^4.3.0, @testing-library/dom@^10.4.1 (+14 more)

### Community 80 - "types/announcement.ts"
Cohesion: 0.17
Nodes (17): BroadcastHistory(), creatorName(), LEVEL_TONE, broadcastKeys, useBroadcasts(), broadcastsApi, ActiveBannerResponse, AnnouncementContent (+9 more)

### Community 81 - "renderWithProviders"
Cohesion: 0.10
Nodes (16): @testing-library/user-event, mockChangePassword, mockDeactivate, mockReactivate, mockUpdateMe, mockUser, access, baseUser (+8 more)

### Community 82 - "AnnouncementBanner.tsx"
Cohesion: 0.21
Nodes (14): AnnouncementBanner(), BannerSheet(), BannerSheetProps, BannerStrip(), BannerStripProps, LEVEL_STYLE, STRIP_SPRING, useActiveAnnouncement() (+6 more)

### Community 83 - "Button"
Cohesion: 0.12
Nodes (37): axios, DashboardContent(), ForgotPasswordContent(), InvalidLinkState(), ResetPasswordContent(), SuccessState(), VerifyEmailNoticeContent(), VerifyEmailContent() (+29 more)

### Community 84 - "EditPermissionsModal.test.tsx"
Cohesion: 0.32
Nodes (7): EditPermissionsModal(), accessWith(), admin, adminRole, mockAccess(), renderModal(), Assignment

### Community 85 - "AppHeader.tsx"
Cohesion: 0.18
Nodes (18): AdminNavSection, AdminSidebar(), AdminSidebarProps, BrandLogo(), BrandLogoProps, DEFAULT_LOGO_URL, DrawerTitle(), AppHeader() (+10 more)

### Community 86 - "schemas/support.ts"
Cohesion: 0.22
Nodes (8): adminTicketListItemSchema, CreateTicketFormValues, fileCategorySchema, filePublicSchema, realtimeEventSchema, ReplyFormValues, supportMessageSchema, supportTicketUserSchema

### Community 87 - "HomeFooter.tsx"
Cohesion: 0.21
Nodes (11): next-themes@^0.4.6, next-themes, BackToTop(), FooterColumn(), FooterColumnProps, FooterLink, HomeFooter(), LOCALES (+3 more)

### Community 88 - "QuoteDetailView.tsx"
Cohesion: 0.16
Nodes (17): QuotePageShellProps, quotePaths(), QuoteDetailView(), QuoteDetailViewProps, WRITE_KEYS, QuoteHistoryViewProps, QuotePrintViewProps, QuoteStatsViewProps (+9 more)

### Community 89 - "proxy.ts"
Cohesion: 0.16
Nodes (16): Locale-based Routing, usePermissions Hook, adminRoutes, authRoutes, defaultLocale, Locale, locales, protectedRoutes (+8 more)

### Community 90 - "api.ts"
Cohesion: 0.16
Nodes (22): AdminNotificationsContent(), AdminNotificationsPage(), notificationTargetPath(), NotificationPanel(), NotificationPanelProps, NotificationsToolbar(), NotificationsToolbarProps, ReadFilter (+14 more)

### Community 91 - "SecurityTab.tsx"
Cohesion: 0.18
Nodes (12): DangerZone(), getPasswordStrength(), SecurityTab(), SecurityTabProps, STRENGTH_COLORS, STRENGTH_LABEL_KEYS, useDeactivateMe(), getConfirmPasswordSchema() (+4 more)

### Community 92 - "UsersFilters.tsx"
Cohesion: 0.31
Nodes (11): isUsersRoleFilter(), isUsersStatusFilter(), isUsersVerifiedFilter(), USERS_ROLE_FILTERS, USERS_STATUS_FILTERS, USERS_VERIFIED_FILTERS, UsersRoleFilter, UsersStatusFilter (+3 more)

### Community 93 - "cn"
Cohesion: 0.16
Nodes (13): MorphingSquareProps, PLACEMENT_CLASSES, AttachmentThumb(), AttachmentThumbProps, ALERT_VARIANTS, AlertAction(), AlertTitle(), AlertVariant (+5 more)

### Community 94 - "CreateAdminModal.tsx"
Cohesion: 0.23
Nodes (12): CreateAdminModal(), CreateAdminModalProps, groupByResource(), PermissionGroup, PermissionMatrix(), PermissionMatrixProps, AssignOption, Props (+4 more)

### Community 95 - "SystemRole"
Cohesion: 0.16
Nodes (11): allCaps, baseUser, renderZone(), SystemRole, ADMIN, SUPERADMIN, USER, SupportRealtimeBridge() (+3 more)

### Community 96 - "ProfileContent"
Cohesion: 0.38
Nodes (5): AdminProfile(), generateMetadata(), generateMetadata(), Profile(), ProfileContent()

### Community 97 - "announcement-render.ts"
Cohesion: 0.29
Nodes (9): AnnouncementPreview(), LEVEL_ACCENT, announcementBody(), AnnouncementFields, announcementTitle(), interpolation(), render(), TEMPLATE_TEXT (+1 more)

### Community 98 - "Label"
Cohesion: 0.27
Nodes (9): FinancingStep(), FinancingStepProps, QuoteDraft, VehicleStepProps, Label(), FINANCING_DURATIONS, FINANCING_TYPES, VehicleCatalog (+1 more)

### Community 99 - "formatDateTime"
Cohesion: 0.33
Nodes (9): InboxRow(), InboxRowProps, notificationText(), readNotificationString(), NotificationRow(), NotificationRowProps, formatDateTime(), NotificationItem (+1 more)

### Community 100 - "admin/(protected)/quotes/[id]/edit/page.tsx"
Cohesion: 0.24
Nodes (8): AdminQuotesDetailEditPage(), generateMetadata(), PageProps, generateMetadata(), PageProps, QuotesDetailEditPage(), EditLoader(), EditQuoteContent()

### Community 101 - "endpoints/auth.ts"
Cohesion: 0.38
Nodes (8): AuthResponse, ChangePasswordPayload, ForgotPasswordPayload, LoginPayload, MessageResponse, RegisterPayload, ResetPasswordPayload, VerifyEmailPayload

### Community 102 - "AdminActionConfirm.tsx"
Cohesion: 0.36
Nodes (8): ActionMeta, AdminActionConfirm(), AdminActionConfirmProps, AdminActionKind, invalidateUserSurfaces(), useDeleteAdmin(), useDemoteSuperadmin(), usePromoteSuperadmin()

### Community 103 - "EditPermissionsModal.tsx"
Cohesion: 0.36
Nodes (7): EditPermissionsBody(), EditPermissionsBodyProps, TierWarning(), TierWarningProps, useSetAdminPermissions(), useUserAccess(), hasActiveAdminAssignment()

### Community 104 - "admin/(protected)/quotes/[id]/page.tsx"
Cohesion: 0.28
Nodes (7): AdminQuotesDetailPage(), generateMetadata(), PageProps, generateMetadata(), PageProps, QuotesDetailPage(), QuoteDetailContent()

### Community 105 - "admin/(protected)/quotes/[id]/print/page.tsx"
Cohesion: 0.28
Nodes (7): AdminQuotesDetailPrintPage(), generateMetadata(), PageProps, generateMetadata(), PageProps, QuotesDetailPrintPage(), PrintQuoteContent()

### Community 106 - "DealershipsAdminView.tsx"
Cohesion: 0.44
Nodes (7): DealershipsAdminView(), DealershipFormValues, dealershipToValues(), valuesToPayload(), useDealerships(), useDeleteDealership(), useSaveDealership()

### Community 107 - "PermissionSetsContent.test.tsx"
Cohesion: 0.33
Nodes (4): ALL, catalog, stamp, systemSet

### Community 108 - "dealership/page.tsx"
Cohesion: 0.67
Nodes (3): DealershipPage(), generateMetadata(), DealershipContent()

## Knowledge Gaps
- **72 isolated node(s):** `UsersRead`, `UsersWrite`, `UsersDelete`, `UsersSuspend`, `UsersPasswordReset` (+67 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 580 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-i18next` connect `Broadcast History and Dialogs` to `ActivityTable.tsx`, `HomeMarquee.tsx`, `AdminUser`, `TicketStatusBadge.tsx`, `AuthButtons.tsx`, `PermissionSetFormModal.tsx`, `Localization Resources`, `UserAccessAssignModal.tsx`, `BroadcastComposer.tsx`, `UsersTable.tsx`, `utils.ts`, `User and Settings Forms`, `Runtime Dependencies`, `PermissionSetsContent.tsx`, `file.ts`, `quote.ts`, `ActivitiesContent.tsx`, `Development Tooling Dependencies`, `MessageThread.tsx`, `QuotePages.tsx`, `variants.ts`, `AdminSupportContent.tsx`, `lucide-react`, `types/notification.ts`, `use-permissions.ts`, `QuoteWizard.tsx`, `ClientSideProviders.tsx`, `CustomersView.tsx`, `quote-format.ts`, `use-admin.ts`, `lucide-react`, `useAuthStore`, `types/announcement.ts`, `AnnouncementBanner.tsx`, `Button`, `AppHeader.tsx`, `HomeFooter.tsx`, `QuoteDetailView.tsx`, `api.ts`, `SecurityTab.tsx`, `UsersFilters.tsx`, `CreateAdminModal.tsx`, `announcement-render.ts`, `Label`, `formatDateTime`, `AdminActionConfirm.tsx`, `EditPermissionsModal.tsx`, `DealershipsAdminView.tsx`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **What connects `UsersRead`, `UsersWrite`, `UsersDelete` to the rest of the system?**
  _72 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AuthButtons.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12955465587044535 - nodes in this community are weakly interconnected._
- **Why does `Permission` connect `Admin Permissions UI` to `AuthButtons.tsx`, `vitest`, `PermissionSetFormModal.tsx`, `Playwright E2E Tests`, `Admin Test Helpers`, `Broadcast History and Dialogs`, `UsersTable.tsx`, `User and Settings Forms`, `types/user.ts`, `msw/server.ts`, `quote.ts`, `ROUTES`, `QuotePages.tsx`, `vitest`, `AdminListItem`, `types/rbac.ts`, `Support Playwright Tests`, `RolesContent.test.tsx`, `use-permissions.ts`, `CustomersView.tsx`, `types/admin.ts`, `use-support.test.tsx`, `lucide-react`, `useAuthStore`, `renderWithProviders`, `EditPermissionsModal.test.tsx`, `QuoteDetailView.tsx`, `CreateAdminModal.tsx`, `SystemRole`, `EditPermissionsModal.tsx`, `DealershipsAdminView.tsx`, `PermissionSetsContent.test.tsx`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Should `vitest` be split into smaller, more focused modules?**
  _Cohesion score 0.09206349206349207 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `AdminUser`, `TicketStatusBadge.tsx`, `AuthButtons.tsx`, `ROUTES`, `Broadcast History and Dialogs`, `UsersTable.tsx`, `utils.ts`, `User and Settings Forms`, `Runtime Dependencies`, `Development Tooling Dependencies`, `ROUTES`, `QuotePages.tsx`, `env.ts`, `variants.ts`, `lucide-react`, `metadata.ts`, `use-permissions.ts`, `QuoteWizard.tsx`, `ClientSideProviders.tsx`, `lucide-react`, `AnnouncementBanner.tsx`, `Button`, `AppHeader.tsx`, `HomeFooter.tsx`, `QuoteDetailView.tsx`, `proxy.ts`, `api.ts`, `SecurityTab.tsx`, `cn`, `ProfileContent`, `admin/(protected)/quotes/[id]/edit/page.tsx`, `admin/(protected)/quotes/[id]/page.tsx`, `admin/(protected)/quotes/[id]/print/page.tsx`, `dealership/page.tsx`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Should `ROUTES` be split into smaller, more focused modules?**
  _Cohesion score 0.07896575821104122 - nodes in this community are weakly interconnected._