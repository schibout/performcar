# Graph Report - frontend  (2026-11-08)

## Corpus Check
- 524 files · ~160,490 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 8, .example 1, .css 1)

## Summary
- 2329 nodes · 9217 edges · 105 communities (93 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7e3d0174`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- utils.ts
- AppDrawerNav.tsx
- motion
- types/announcement.ts
- cn
- vitest
- AppHeader.tsx
- next
- base-test.ts
- config.ts
- admin-helpers.ts
- EditPermissionsModal.tsx
- BroadcastComposer.tsx
- react-i18next
- UserAccessPanel.tsx
- HomeFooter.tsx
- Permission
- Card
- dependencies
- types/user.ts
- react
- msw/server.ts
- steps
- NewTicketModal.tsx
- types/support.ts
- quote.ts
- ActivitiesContent.tsx
- UserAccessAssignModal.tsx
- AnnouncementBanner.tsx
- buildMetadata
- QuotePages.tsx
- eslint.config.mjs
- SessionsSection.tsx
- EditPermissionsModal.tsx
- types/rbac.ts
- support-helpers.ts
- compilerOptions
- support-socket.ts
- env.ts
- Button
- AdminsContent.tsx
- i18next
- RolesContent.test.tsx
- lucide-react
- AssistantPages.tsx
- TicketDetailContent.tsx
- metadata.ts
- notification-socket.ts
- use-permissions.ts
- QuoteWizard.tsx
- scripts
- HomeHero.tsx
- support-realtime.store.ts
- allowBuilds
- MemoryStorage
- ClientSideProviders.tsx
- BroadcastHistory.tsx
- types/admin.ts
- use-support.test.tsx
- quote-format.ts
- sessions.ts
- use-admin.ts
- tsconfig.eslint.json
- CustomerStep.tsx
- AppDrawer.test.tsx
- @vitejs/plugin-react
- UsersFilters.tsx
- AntdProvider.tsx
- ApiErrorNote.tsx
- /review Command
- postcss.config.mjs
- UI Components
- Custom React Hooks
- Self-healing WebSockets
- NextJS-Template
- Utility & API Layer
- Zod Validation Schemas
- Playwright E2E Tests
- devDependencies
- notification-text.ts
- use-admin.test.tsx
- opengraph-image.tsx
- types/notification.ts
- api.ts
- MessageThread.tsx
- useTheme
- [locale]/(protected)/dashboard/page.tsx
- QuoteDetailView.tsx
- routes.ts
- NotificationPanel.tsx
- SecurityTab.tsx
- schemas/support.ts
- LoadingScreen
- PermissionSetFormModal.tsx
- auth-integration.test.tsx
- NotificationsContent.tsx
- admin/(protected)/quotes/page.tsx
- history/page.tsx
- [locale]/(protected)/layout.tsx
- announcement-banner.spec.ts
- endpoints/auth.ts
- new/page.tsx
- admin/(protected)/quotes/[id]/page.tsx
- admin/(protected)/quotes/[id]/print/page.tsx

## God Nodes (most connected - your core abstractions)
1. `Button()` - 165 edges
2. `react-i18next` - 149 edges
3. `Permission` - 135 edges
4. `getLocalizedPath()` - 117 edges
5. `next` - 111 edges
6. `react` - 109 edges
7. `ROUTES` - 107 edges
8. `cn()` - 102 edges
9. `Card()` - 100 edges
10. `buildMetadata()` - 100 edges

## Surprising Connections (you probably didn't know these)
- `NotificationMockState` --references--> `NotificationItem`  [EXTRACTED]
  tests-e2e/notifications/notification-helpers.ts → src/lib/types/notification.ts
- `MockUser` --references--> `SystemRole`  [EXTRACTED]
  tests-e2e/account/deactivate.spec.ts → src/lib/types/user.ts
- `UserAccessPanelProps` --references--> `AdminUser`  [EXTRACTED]
  src/components/admin/users/UserAccessPanel.tsx → src/lib/types/admin.ts
- `TicketPriorityBadgeProps` --references--> `TicketPriority`  [EXTRACTED]
  src/components/support/TicketStatusBadge.tsx → src/lib/types/support.ts
- `TicketStatusBadgeProps` --references--> `TicketStatus`  [EXTRACTED]
  src/components/support/TicketStatusBadge.tsx → src/lib/types/support.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **RBAC & Permission System** — src_hooks_usepermissions, src_stores, src_lib_websocket, src_app_locale [EXTRACTED 1.00]
- **Automated Review Pipeline** — claude_commands_review, review_md, tests_e2e [INFERRED 0.90]

## Communities (105 total, 12 thin omitted)

### Community 0 - "utils.ts"
Cohesion: 0.11
Nodes (19): SectionHeader(), SectionHeaderProps, MorphingSquareProps, PLACEMENT_CLASSES, FeatureDef, FEATURES, CARDS, HomeShowcase() (+11 more)

### Community 1 - "AppDrawerNav.tsx"
Cohesion: 0.15
Nodes (20): AdminNavSection, AdminSidebar(), AdminSidebarProps, AdminSidebarFooterProps, AuthButtonsProps, BrandLogo(), BrandLogoProps, DEFAULT_LOGO_URL (+12 more)

### Community 2 - "motion"
Cohesion: 0.15
Nodes (16): motion, ProfileContentProps, ProfileTab, TabDef, TABS, Template(), HeroHeadlineProps, drawerList (+8 more)

### Community 3 - "types/announcement.ts"
Cohesion: 0.17
Nodes (17): AnnouncementPreviewProps, FormValues, broadcastKeys, broadcastsApi, ActiveBannerResponse, AnnouncementAudience, AnnouncementContent, AnnouncementCreator (+9 more)

### Community 4 - "cn"
Cohesion: 0.14
Nodes (26): AdminSidebarFooter(), AdminProfile(), Profile(), ProfileContent(), AuthButtons(), MENU_ENTRIES, MenuEntry, UserProfile() (+18 more)

### Community 5 - "vitest"
Cohesion: 0.06
Nodes (39): @testing-library/react, @testing-library/user-event, vitest, mockSearchParams, mockPush, mockReplace, mockResendEmail, mockSearchParams (+31 more)

### Community 6 - "AppHeader.tsx"
Cohesion: 0.22
Nodes (17): adminRedirectTarget(), AuthHydrator(), AppDrawer(), AppHeader(), HeaderNav(), HeaderNavLink, HeaderNavProps, LANGUAGE_OPTIONS (+9 more)

### Community 7 - "next"
Cohesion: 0.07
Nodes (53): next, generateMetadata(), AdminLoginPage(), generateMetadata(), AdminIndexPage(), AdminIndexPageProps, generateMetadata(), generateMetadata() (+45 more)

### Community 8 - "base-test.ts"
Cohesion: 0.16
Nodes (12): @playwright/test, baseUser, test, avatarFile, baseUser, PNG_BUFFER, mockUser, getStrings() (+4 more)

### Community 9 - "config.ts"
Cohesion: 0.08
Nodes (6): resources, LANGUAGES, Locale, Namespace, resources, bundles

### Community 10 - "admin-helpers.ts"
Cohesion: 0.08
Nodes (38): badLogin, baseActivity, ADMIN_PERMISSIONS, adminFile, adminListItems, adminUser, ALL_PERMISSIONS, injectSession() (+30 more)

### Community 11 - "EditPermissionsModal.tsx"
Cohesion: 0.20
Nodes (13): EditPermissionsBody(), EditPermissionsModal(), groupByResource(), PermissionGroup, PermissionMatrix(), PermissionMatrixProps, TierWarning(), TierWarningProps (+5 more)

### Community 12 - "BroadcastComposer.tsx"
Cohesion: 0.15
Nodes (22): BroadcastComposer(), buildVariables(), CustomLanguageFields(), CustomLanguageFieldsProps, LANGUAGES, LANGUAGES, TemplateVariableFields(), TemplateVariableFieldsProps (+14 more)

### Community 13 - "react-i18next"
Cohesion: 0.12
Nodes (21): lucide-react, react-i18next, AdminTopbarProps, AppDrawerProps, SettingsSection(), SettingsSectionProps, NotificationsToolbarProps, ReadFilter (+13 more)

### Community 14 - "UserAccessPanel.tsx"
Cohesion: 0.06
Nodes (91): AdminForbidden(), AdminsTable(), AdminPermissionSetsPage(), PermissionSetsContent(), AdminRolesPage(), RoleFormModal(), RolesContent(), ActivityDetails() (+83 more)

### Community 15 - "HomeFooter.tsx"
Cohesion: 0.10
Nodes (25): AboutContent(), ValueDef, VALUES, About(), HomeContent(), Home(), TiltCard(), TiltCardProps (+17 more)

### Community 16 - "Permission"
Cohesion: 0.03
Nodes (62): CreateAdminModalProps, PermissionGateProps, QuotePageShellProps, PermissionsApi, Permission, ActivitiesRead, AdminsDelete, AdminsRead (+54 more)

### Community 17 - "Card"
Cohesion: 0.16
Nodes (36): AdminRow(), StatCard(), AccountDeactivatedContent(), AccountDeactivatedPage(), AccountSuspendedContent(), CATEGORY_ORDER, SystemSettingsForm(), UserAccessPanel() (+28 more)

### Community 18 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, @ant-design/cssinjs@^2.1.2, @ant-design/icons@^6.2.5, @ant-design/nextjs-registry@^1.3.0, antd@^6.4.3, axios@^1.17.0, clsx@^2.1.1, i18next@^25.10.10 (+22 more)

### Community 19 - "types/user.ts"
Cohesion: 0.08
Nodes (18): ticket, detail, avatar, currentUser, quote, UpdateUserParams, userKeys, usersApi (+10 more)

### Community 20 - "react"
Cohesion: 0.13
Nodes (24): react, RoleFormBody(), AdminTicketDetailContent(), AdminTicketDetailContentProps, PermissionNote(), PermissionNoteProps, ControlsFormValues, TicketAdminControls() (+16 more)

### Community 21 - "msw/server.ts"
Cohesion: 0.14
Nodes (16): msw, mockPush, avatar, userWithAvatar, mockReplace, PageContent(), renderHydrator(), mockLoginResponse() (+8 more)

### Community 22 - "steps"
Cohesion: 0.08
Nodes (24): concurrency, cancel-in-progress, group, jobs, lint-and-typecheck, name, runs-on, steps (+16 more)

### Community 23 - "NewTicketModal.tsx"
Cohesion: 0.10
Nodes (32): AvatarActions(), AvatarActionsProps, AvatarUpload(), AvatarUploadProps, DEFAULT_IMAGE_TYPES, DEFAULT_MAX_UPLOAD_SIZE, FileValidationError, formatBytes() (+24 more)

### Community 24 - "types/support.ts"
Cohesion: 0.18
Nodes (17): TicketAdminControlsProps, ReplyBoxProps, AdminTicketDetail, AdminTicketListParams, AdminTicketListResponse, AdminTicketResponse, AdminTicketUpdatePayload, MessageCreatePayload (+9 more)

### Community 25 - "quote.ts"
Cohesion: 0.07
Nodes (45): CustomerFormModal(), CustomerFormModalProps, FormValues, catalogKeys, customerKeys, dealershipKeys, quoteKeys, READ_KEYS (+37 more)

### Community 26 - "ActivitiesContent.tsx"
Cohesion: 0.12
Nodes (22): ActivitiesContent(), ACTIVITY_TYPES, isResourceFilter(), isStatusFilter(), isTypeFilter(), parseStatusCodeFilter(), RESOURCE_TYPES, ResourceFilter (+14 more)

### Community 27 - "UserAccessAssignModal.tsx"
Cohesion: 0.16
Nodes (17): AssignBody(), AssignKind, AssignModalProps, AssignOption, buildRows(), EMPTY_ROW, pad(), Row (+9 more)

### Community 28 - "AnnouncementBanner.tsx"
Cohesion: 0.22
Nodes (13): AnnouncementBanner(), BannerSheet(), BannerSheetProps, BannerStrip(), BannerStripProps, LEVEL_STYLE, STRIP_SPRING, useActiveAnnouncement() (+5 more)

### Community 29 - "buildMetadata"
Cohesion: 0.23
Nodes (9): AdminActivitiesPage(), generateMetadata(), AdminFilesPage(), generateMetadata(), PermissionGate(), AdminSupportPage(), generateMetadata(), AdminUsersPage() (+1 more)

### Community 30 - "QuotePages.tsx"
Cohesion: 0.10
Nodes (27): AdminCatalogPage(), generateMetadata(), AdminDealershipsPage(), generateMetadata(), AdminQuotesDetailEditPage(), generateMetadata(), PageProps, DealershipPage() (+19 more)

### Community 31 - "eslint.config.mjs"
Cohesion: 0.10
Nodes (20): eslint@^9.39.4, eslint-config-prettier@^10.1.8, @eslint/js@^10.0.1, eslint-plugin-import@^2.32.0, eslint-plugin-jsx-a11y@^6.10.2, eslint-plugin-react@^7.37.5, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.2 (+12 more)

### Community 32 - "SessionsSection.tsx"
Cohesion: 0.15
Nodes (19): DeviceIcon(), DeviceIconProps, MOBILE_OS, SessionRow(), SessionRowProps, UserSessionsCard(), UserSessionsCardProps, DeviceIcon() (+11 more)

### Community 33 - "EditPermissionsModal.tsx"
Cohesion: 0.18
Nodes (14): buildRowMenu(), RowMenuActions, RowMenuArgs, AdminActionState, AdminRowProps, AdminsTableProps, EditPermissionsBodyProps, EditPermissionsModalProps (+6 more)

### Community 34 - "types/rbac.ts"
Cohesion: 0.17
Nodes (19): RoleFormBodyProps, RoleFormModalProps, QueryClient, rbacApi, AssignmentsUpdatePayload, EffectivePermission, PermissionSetCreatePayload, PermissionSetListResponse (+11 more)

### Community 35 - "support-helpers.ts"
Cohesion: 0.14
Nodes (18): adminMessage, adminTicketDetail, adminTicketListItem, closedAdminTicketDetail, closedTicketDetail, listResponse(), mockAdminReply(), mockAdminTicketDetail() (+10 more)

### Community 36 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 37 - "support-socket.ts"
Cohesion: 0.16
Nodes (13): RealtimeEvent, AccountSocket, createAccountSocket(), connect(), connect(), buildWsUrl(), createReconnectingSocket(), connect() (+5 more)

### Community 38 - "env.ts"
Cohesion: 0.14
Nodes (10): nextConfig, securityHeaders, @sentry/nextjs, generateMetadata(), viewport, env, onRouterTransitionStart, onRequestError (+2 more)

### Community 39 - "Button"
Cohesion: 0.10
Nodes (43): DashboardContent(), ForgotPasswordContent(), RegisterContent(), InvalidLinkState(), ResetPasswordContent(), SuccessState(), VerifyEmailNoticeContent(), VerifyEmailContent() (+35 more)

### Community 40 - "AdminsContent.tsx"
Cohesion: 0.14
Nodes (24): FilesContent(), AdminSupportContent(), StatusFilter, SupportContent(), FilesFilters(), AdminPagination(), DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS (+16 more)

### Community 41 - "i18next"
Cohesion: 0.25
Nodes (11): i18next, AnnouncementPreview(), LEVEL_ACCENT, announcementBody(), AnnouncementFields, announcementTitle(), interpolation(), render() (+3 more)

### Community 42 - "RolesContent.test.tsx"
Cohesion: 0.10
Nodes (16): accessWith(), admin, adminRole, mockAccess(), renderModal(), ALL, catalog, stamp (+8 more)

### Community 43 - "lucide-react"
Cohesion: 0.12
Nodes (37): antd, zod, AdminLoginContent(), CreateAdminModal(), LoginContent(), FILE_CONTENT_TYPES, FilesFiltersProps, UserEditFormFields() (+29 more)

### Community 44 - "AssistantPages.tsx"
Cohesion: 0.06
Nodes (55): AdminAssistantCommunicationPage(), AdminAssistantPage(), AssistantCommunicationPage(), AssistantPage(), AssistantBubblePanel(), AssistantChat(), AssistantChatProps, AssistantFrame() (+47 more)

### Community 45 - "TicketDetailContent.tsx"
Cohesion: 0.21
Nodes (13): SupportTicketPage(), TicketDetailContent(), TicketDetailContentProps, MessageThread(), invalidateAdminSurfaces(), QueryClient, useAdminReplyTicket(), useCloseTicket() (+5 more)

### Community 46 - "metadata.ts"
Cohesion: 0.16
Nodes (12): AdminNotificationsContent(), AdminNotificationsPage(), generateMetadata(), generateMetadata(), QuotesPage(), resolvePageMeta(), seoTranslations, BuildMetadataOptions (+4 more)

### Community 47 - "notification-socket.ts"
Cohesion: 0.19
Nodes (8): JsonValue, NotificationRealtimeEvent, createNotificationSocket(), NotificationSocket, FakeWebSocket, jsonValueSchema, notificationItemSchema, notificationRealtimeEventSchema

### Community 48 - "use-permissions.ts"
Cohesion: 0.06
Nodes (67): AdminNavCaps, AdminNavItem, buildAdminNav(), AdminsContent(), AdminAdminsPage(), AdminShell(), AdminShellProps, AdminTopbar() (+59 more)

### Community 49 - "QuoteWizard.tsx"
Cohesion: 0.16
Nodes (27): category, services, validDraft(), CustomerStep(), compactPhone(), customerIssues(), draftFromQuote(), draftToPayload() (+19 more)

### Community 50 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, format, format:check, lint, prepare, start (+3 more)

### Community 51 - "HomeHero.tsx"
Cohesion: 0.26
Nodes (9): BrandWordmark(), BrandWordmarkProps, HeroHeadline(), isAccentWord(), HeroQuoteMock(), HeroQuoteMockProps, STEPS, HomeHero() (+1 more)

### Community 52 - "support-realtime.store.ts"
Cohesion: 0.17
Nodes (13): adminSupportKeys, supportKeys, { subscribeTicket, unsubscribeTicket }, useTicketRealtime(), SupportSocket, appendMessage(), ConnectArgs, SupportRealtimeState (+5 more)

### Community 53 - "allowBuilds"
Cohesion: 0.20
Nodes (9): allowBuilds, msw, @sentry/cli, sharp, unrs-resolver, overrides, postcss, vite (+1 more)

### Community 55 - "ClientSideProviders.tsx"
Cohesion: 0.11
Nodes (14): ErrorBoundary(), ErrorBoundaryBase, ErrorBoundaryProps, ErrorBoundaryState, AntdProvider(), ClientSideProviders(), ClientSideProvidersProps, loadingMessages (+6 more)

### Community 56 - "BroadcastHistory.tsx"
Cohesion: 0.29
Nodes (9): BroadcastsContent(), AdminBroadcastsPage(), BroadcastHistory(), creatorName(), LEVEL_TONE, useBroadcasts(), useCanReadBroadcasts(), useCanWriteBroadcasts() (+1 more)

### Community 57 - "types/admin.ts"
Cohesion: 0.17
Nodes (19): UserEditFormProps, adminApi, ActivityActor, ActivityDetails, AdminActivityListResponse, AdminCreatePayload, AdminListParams, AdminListResponse (+11 more)

### Community 58 - "use-support.test.tsx"
Cohesion: 0.18
Nodes (9): @tanstack/react-query, listItem, mockAdminTicketDetail, mockMessage, mockTicketDetail, SupportRealtimeBridge(), { authState }, { connect, disconnect } (+1 more)

### Community 59 - "quote-format.ts"
Cohesion: 0.22
Nodes (16): customerName(), estimateMonthlyPayment(), formatCalendarDate(), formatMoney(), isFinanced(), QuoteDocument(), quote, linePrice() (+8 more)

### Community 60 - "sessions.ts"
Cohesion: 0.46
Nodes (5): sessionKeys, sessionsApi, SessionListParams, SessionListResponse, SessionsRevokedResponse

### Community 61 - "use-admin.ts"
Cohesion: 0.20
Nodes (17): ActionMeta, AdminActionConfirm(), AdminActionConfirmProps, AdminActionKind, rbacKeys, invalidateUserSurfaces(), QueryClient, useChangeAdminUserPassword() (+9 more)

### Community 62 - "tsconfig.eslint.json"
Cohesion: 0.40
Nodes (4): ./tsconfig.json, exclude, extends, include

### Community 63 - "CustomerStep.tsx"
Cohesion: 0.20
Nodes (14): CustomerStepProps, FIELDS, FinancingStep(), FinancingStepProps, currentYear(), QuoteDraft, VehicleStep(), VehicleStepProps (+6 more)

### Community 64 - "AppDrawer.test.tsx"
Cohesion: 0.40
Nodes (4): createMockUser(), defaultProps, mockAuthenticated(), mockPush

### Community 66 - "UsersFilters.tsx"
Cohesion: 0.27
Nodes (11): isUsersRoleFilter(), isUsersStatusFilter(), isUsersVerifiedFilter(), USERS_ROLE_FILTERS, USERS_STATUS_FILTERS, USERS_VERIFIED_FILTERS, UsersRoleFilter, UsersStatusFilter (+3 more)

### Community 67 - "AntdProvider.tsx"
Cohesion: 0.12
Nodes (17): geistMono, inter, RootLayout(), THEME_STYLES, buildThemeStyleSheet(), camelToKebab(), colorsToCssDeclarations(), darkAntdTokens (+9 more)

### Community 68 - "ApiErrorNote.tsx"
Cohesion: 0.29
Nodes (6): axios, ApiErrorNote(), ApiErrorNoteProps, ErrorBody, getApiErrorKey(), getApiErrorStatus()

### Community 79 - "devDependencies"
Cohesion: 0.07
Nodes (39): devDependencies, eslint-config-next@16.1.6, eslint-import-resolver-typescript@^4.4.5, husky@^9.1.7, jsdom@^29.1.1, lint-staged@^16.4.0, msw@^2.14.6, @playwright/test@^1.60.0 (+31 more)

### Community 80 - "notification-text.ts"
Cohesion: 0.33
Nodes (8): InboxRow(), InboxRowProps, notificationTargetPath(), notificationText(), readNotificationString(), NotificationRowProps, NotificationItem, NotificationMockState

### Community 81 - "use-admin.test.tsx"
Cohesion: 0.11
Nodes (13): access, baseUser, FULL, memberRole, roleOptions, allCaps, baseUser, renderZone() (+5 more)

### Community 82 - "opengraph-image.tsx"
Cohesion: 0.33
Nodes (6): alt, contentType, Image(), runtime, size, getServerTranslations()

### Community 83 - "types/notification.ts"
Cohesion: 0.31
Nodes (8): notificationsApi, NotificationEventType, NotificationListParams, NotificationListResponse, NotificationReadResponse, NotificationsMarkAllReadResponse, NotificationType, UnreadCountResponse

### Community 84 - "api.ts"
Cohesion: 0.36
Nodes (8): api, attemptTokenRefresh(), ErrorResponse, handleNonAuthError(), handleUnauthorized(), performLogout(), REFRESHABLE_AUTH_PATHS, translateAndToast()

### Community 85 - "MessageThread.tsx"
Cohesion: 0.43
Nodes (5): AttachmentThumb(), AttachmentThumbProps, MessageThreadProps, SenderRole, SupportMessage

### Community 86 - "useTheme"
Cohesion: 0.47
Nodes (4): next-themes@^0.4.6, next-themes, Theme, useTheme()

### Community 87 - "[locale]/(protected)/dashboard/page.tsx"
Cohesion: 0.60
Nodes (3): DashboardContent(), Dashboard(), generateMetadata()

### Community 88 - "QuoteDetailView.tsx"
Cohesion: 0.13
Nodes (24): STATUS_COLORS, quotePaths(), QuoteDetailView(), QuoteDetailViewProps, WRITE_KEYS, QuoteHistoryViewProps, SortHeaderProps, StatusFilter (+16 more)

### Community 89 - "routes.ts"
Cohesion: 0.15
Nodes (16): Locale-based Routing, sitemap(), usePermissions Hook, adminRoutes, authRoutes, defaultLocale, Locale, locales (+8 more)

### Community 90 - "NotificationPanel.tsx"
Cohesion: 0.33
Nodes (12): NotificationBell(), NotificationBellInner(), NotificationPanel(), NotificationPanelProps, NotificationRow(), notificationKeys, useMarkAllNotificationsRead(), useMarkNotificationRead() (+4 more)

### Community 91 - "SecurityTab.tsx"
Cohesion: 0.20
Nodes (11): DangerZone(), getPasswordStrength(), SecurityTab(), SecurityTabProps, STRENGTH_COLORS, STRENGTH_LABEL_KEYS, useDeactivateMe(), ChangePasswordFormValues (+3 more)

### Community 92 - "schemas/support.ts"
Cohesion: 0.22
Nodes (8): adminTicketListItemSchema, CreateTicketFormValues, fileCategorySchema, filePublicSchema, realtimeEventSchema, ReplyFormValues, supportMessageSchema, supportTicketUserSchema

### Community 93 - "LoadingScreen"
Cohesion: 0.28
Nodes (8): Logout(), Loading(), LoadingScreen(), MaintenanceGate(), MaintenanceGateProps, MaintenanceScreen(), MorphingSquare(), isAdminTierRole()

### Community 94 - "PermissionSetFormModal.tsx"
Cohesion: 0.31
Nodes (9): BodyProps, PermissionSetFormBody(), PermissionSetFormModal(), PermissionSetFormModalProps, ELEMENT_KEY_PATTERN, invalidateElements(), useCreatePermissionSet(), useUpdatePermissionSet() (+1 more)

### Community 95 - "auth-integration.test.tsx"
Cohesion: 0.83
Nodes (3): MockApp(), MockDashboard(), MockHome()

### Community 96 - "NotificationsContent.tsx"
Cohesion: 0.60
Nodes (3): NotificationsContent(), generateMetadata(), NotificationsPage()

### Community 97 - "admin/(protected)/quotes/page.tsx"
Cohesion: 0.67
Nodes (3): AdminQuotesPage(), generateMetadata(), AdminQuotesContent()

### Community 98 - "history/page.tsx"
Cohesion: 0.67
Nodes (3): generateMetadata(), QuotesHistoryPage(), QuoteHistoryContent()

### Community 99 - "[locale]/(protected)/layout.tsx"
Cohesion: 0.53
Nodes (4): ProtectedLayout(), ProtectedLayoutProps, AssistantBubble(), AccountEventsBridge()

### Community 100 - "announcement-banner.spec.ts"
Cohesion: 0.40
Nodes (3): activeBanner, DISMISS, TITLE

### Community 101 - "endpoints/auth.ts"
Cohesion: 0.38
Nodes (8): AuthResponse, ChangePasswordPayload, ForgotPasswordPayload, LoginPayload, MessageResponse, RegisterPayload, ResetPasswordPayload, VerifyEmailPayload

### Community 102 - "new/page.tsx"
Cohesion: 0.67
Nodes (3): generateMetadata(), QuotesNewPage(), NewQuoteContent()

### Community 104 - "admin/(protected)/quotes/[id]/page.tsx"
Cohesion: 0.28
Nodes (7): AdminQuotesDetailPage(), generateMetadata(), PageProps, generateMetadata(), PageProps, QuotesDetailPage(), QuoteDetailContent()

### Community 105 - "admin/(protected)/quotes/[id]/print/page.tsx"
Cohesion: 0.28
Nodes (7): AdminQuotesDetailPrintPage(), generateMetadata(), PageProps, generateMetadata(), PageProps, QuotesDetailPrintPage(), PrintQuoteContent()

## Knowledge Gaps
- **73 isolated node(s):** `ActivitiesRead`, `AdminsDelete`, `AdminsRead`, `AdminsWrite`, `BroadcastRead` (+68 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 603 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-i18next` connect `react-i18next` to `utils.ts`, `AppDrawerNav.tsx`, `motion`, `cn`, `AppHeader.tsx`, `config.ts`, `EditPermissionsModal.tsx`, `BroadcastComposer.tsx`, `UserAccessPanel.tsx`, `HomeFooter.tsx`, `Card`, `dependencies`, `react`, `NewTicketModal.tsx`, `quote.ts`, `ActivitiesContent.tsx`, `UserAccessAssignModal.tsx`, `AnnouncementBanner.tsx`, `QuotePages.tsx`, `SessionsSection.tsx`, `EditPermissionsModal.tsx`, `Button`, `AdminsContent.tsx`, `i18next`, `lucide-react`, `AssistantPages.tsx`, `TicketDetailContent.tsx`, `use-permissions.ts`, `QuoteWizard.tsx`, `HomeHero.tsx`, `ClientSideProviders.tsx`, `BroadcastHistory.tsx`, `quote-format.ts`, `use-admin.ts`, `CustomerStep.tsx`, `UsersFilters.tsx`, `ApiErrorNote.tsx`, `devDependencies`, `notification-text.ts`, `MessageThread.tsx`, `[locale]/(protected)/dashboard/page.tsx`, `QuoteDetailView.tsx`, `NotificationPanel.tsx`, `SecurityTab.tsx`, `LoadingScreen`, `PermissionSetFormModal.tsx`, `NotificationsContent.tsx`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **What connects `ActivitiesRead`, `AdminsDelete`, `AdminsRead` to the rest of the system?**
  _73 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `utils.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10826210826210826 - nodes in this community are weakly interconnected._
- **Why does `Permission` connect `Permission` to `AppDrawerNav.tsx`, `vitest`, `base-test.ts`, `admin-helpers.ts`, `EditPermissionsModal.tsx`, `UserAccessPanel.tsx`, `Card`, `types/user.ts`, `msw/server.ts`, `quote.ts`, `buildMetadata`, `QuotePages.tsx`, `EditPermissionsModal.tsx`, `types/rbac.ts`, `support-helpers.ts`, `Button`, `AdminsContent.tsx`, `RolesContent.test.tsx`, `lucide-react`, `AssistantPages.tsx`, `TicketDetailContent.tsx`, `use-permissions.ts`, `types/admin.ts`, `use-support.test.tsx`, `use-admin.test.tsx`, `QuoteDetailView.tsx`, `PermissionSetFormModal.tsx`, `NotificationsContent.tsx`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Should `motion` be split into smaller, more focused modules?**
  _Cohesion score 0.14624505928853754 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `utils.ts`, `motion`, `cn`, `vitest`, `AppHeader.tsx`, `next`, `EditPermissionsModal.tsx`, `react-i18next`, `UserAccessPanel.tsx`, `HomeFooter.tsx`, `Card`, `dependencies`, `NewTicketModal.tsx`, `quote.ts`, `ActivitiesContent.tsx`, `UserAccessAssignModal.tsx`, `AnnouncementBanner.tsx`, `buildMetadata`, `QuotePages.tsx`, `SessionsSection.tsx`, `EditPermissionsModal.tsx`, `env.ts`, `Button`, `AdminsContent.tsx`, `lucide-react`, `AssistantPages.tsx`, `TicketDetailContent.tsx`, `use-permissions.ts`, `QuoteWizard.tsx`, `HomeHero.tsx`, `support-realtime.store.ts`, `MemoryStorage`, `ClientSideProviders.tsx`, `BroadcastHistory.tsx`, `use-support.test.tsx`, `CustomerStep.tsx`, `AntdProvider.tsx`, `devDependencies`, `MessageThread.tsx`, `QuoteDetailView.tsx`, `NotificationPanel.tsx`, `SecurityTab.tsx`, `LoadingScreen`, `PermissionSetFormModal.tsx`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.135632183908046 - nodes in this community are weakly interconnected._