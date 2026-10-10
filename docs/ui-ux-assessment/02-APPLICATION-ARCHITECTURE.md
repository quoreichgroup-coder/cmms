# Application architecture and route map

## Entrypoints and verified stack

| Area | Verified implementation | Evidence |
|---|---|---|
| Web entry/routing | React Router route objects; root route sends to `/app/work-orders`; protected `/app` is wrapped by `Authenticated` and `ExtendedSidebarLayout`; public request portal, account, OAuth and payment/license pages are separately registered. | `frontend/src/router/index.tsx`, `app.tsx`, `analytics.tsx`, `account.tsx`, `oauth.tsx` |
| Web state/API | Redux Toolkit store and domain slices; Fetch API wrapper in `frontend/src/utils/api.ts`; refresh is shared and a failed request gets at most one refresh retry. | `frontend/src/store/index.ts`, `frontend/src/slices/`, `frontend/src/utils/api.ts` |
| Web UI | React 17, TS types, MUI 5, Emotion, Material icons, MUI X DataGrid 5; Formik/Yup; both an internal custom datagrid and TanStack Table; ApexCharts. | `frontend/package.json`, `frontend/src/content/own/components/` |
| Native entry/navigation | Expo application; NavigationContainer chooses authenticated/auth/superuser navigation and uses native stacks, bottom tabs, native modals, action sheets and deep links. | `mobile/App.tsx`, `mobile/navigation/index.tsx`, `LinkingConfiguration.ts` |
| Native state/API | Redux Toolkit persisted with redux-persist/AsyncStorage; transient loading and error fields are reset on persistence; API uses Fetch, 30-second timeout, token refresh and platform header. | `mobile/store/index.ts`, `mobile/utils/api.ts` |
| Native UI | React Native 0.79, React 19, React Native Paper, Expo 53, React Navigation 6. | `mobile/package.json`, `mobile/custom-theme.ts`, `mobile/constants/Colors.ts` |
| Backend boundary | Spring Boot/JPA/PostgreSQL/Liquibase provides REST services; browser and app call existing APIs. Assessment does not assert current health. | `api/src/main/java/com/grash/controller/`, `api/src/main/resources/db/`, clients above |

## Route/destination counts and method

- Web: raw `element:` occurrences: 110 across the five route files (one is commented); 3 active entries are redirects. Thus **106 active rendered destination entries**, excluding the 3 redirects; entries include page/layout shells and do not multiply IDs/query values. The JSON separates `web_redirects` and the single commented declaration from `web_destinations`. Nested parent paths and aliases remain identified by source file, line, component and declared path segment; verify resolved URL when browsing.
- Mobile: **76** JSX registrations (`Stack.Screen`, `AuthStack.Screen`, `SuperUserStack.Screen`, `BottomTab.Screen`) in `mobile/navigation/index.tsx`. **97** TS/TSX implementations are under `mobile/screens`; some are nested tabs or alternate states rather than independent registered navigation destinations.
- Shared UI source modules: **59 web** (`frontend/src/components` and `frontend/src/content/own/components`) + **37 native** (`mobile/components`) = **96**. Platform-specific directories are not cross-platform shared code.

The full per-destination inventory is `screen-inventory.json`; high-level groups are in `03-SCREEN-INVENTORY.md`.

## API/auth boundary and failure handling

Web `api.ts` attaches a bearer token from local storage and attempts one refresh on 401, then preserves status and response body on failure. Native `api.ts` attaches a bearer token from AsyncStorage, includes `X-Platform`, removes JSON content type for FormData, applies a 30-second request timeout, and shares one refresh promise. These are source-level facts; interceptor/security outcomes still require live tests.

Mobile persistence caches Redux application state, but the repository evidence does not establish a complete offline write queue, conflict resolver or background synchronization contract. NetInfo is used in selected screens; do not describe the whole application as offline-capable.

## Responsive behavior and accessibility

Responsive web behavior exists in selected components (MUI breakpoints, `useMediaQuery`, media rules in layouts, table/list components, request portal). A repository search shows it is not enough to certify every route at mobile widths. Native layout is separately implemented. Accessibility labels and keyboard/focus behavior require route-by-route review; static evidence is insufficient for WCAG conformance.

## Operational constraint carried into design work

Most recent user-provided logs show a backend startup/schema-validation mismatch and reverse-proxy 502 responses. Until the current API instance passes health/config checks, screenshots and UI reproduction should use a separate healthy test instance and must be labeled as such.
