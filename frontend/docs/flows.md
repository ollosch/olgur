# Frontend — Boot, Auth, Data Flow, And Offline

This file is the read-first map of how the app boots, how auth and errors flow, how content is loaded and versioned, and how offline caching works. It complements `stores.md`, `types.md`, and `ui-shell.md`.

## Boot And Auth Flow

Main entrypoint: `frontend/src/main.ts`

Current boot order:

- Create app.
- Install Pinia.
- Install router.
- Register `globalErrorHandler` (`app.config.errorHandler`) and wire `setupUnhandledRejectionHandler()`.
- Initialize app settings.
- Mount app.
- `authStore.bootstrap()` (async, fire-and-forget; escaped failures forward to `globalErrorHandler`).
- `registerSW({ immediate: true })` registers the PWA service worker with `onNeedRefresh` / `onOfflineReady` toast prompts.

`authStore.bootstrap()` (in `frontend/src/stores/auth.ts`) runs:

- `fetchCsrfCookie()` — a `network` failure flips the app into offline mode.
- `fetchUser()` — a `network` failure also flips into offline mode; an `auth` failure just leaves the user logged out; any other (server) error shows an error toast and retries `fetchUser()` once before giving up.
- On offline, `useOnline().online.value = false`.
- `cacheStore.loadRegistry()` — loads the cached-system registry so the router guard can admit pinned systems while offline.
- If authenticated and online, `useSystemStore().init()`.
- `authStore.initialized = true` (always, even if an earlier step threw).

Important implications:

- Auth state lives only in memory in `authStore.user`.
- Router guards depend on `authStore.user`.
- The `beforeEach` guard waits for `authStore.initialized` before applying any `requiresAuth` / `requiresGuest` logic, so the initial navigation always sees the real auth state.
- A network failure during bootstrap leaves `user` null but does NOT redirect to login; the app boots offline and may serve cached content.

## HTTP And Error Handling

### Axios Client

File: `frontend/src/lib/http.ts`

- `withCredentials: true`
- `withXSRFToken: true`
- JSON API requests only
- Normalizes failures into `ApiError` variants such as `auth`, `forbidden`, `conflict`, `validation`, and `network`

### `useApi()`

File: `frontend/src/composables/useApi.ts`

- Tracks `loading` with a concurrent request counter so it only flips false once the last in-flight request settles.
- Returns `null` on validation errors and stores flattened field errors.
- Re-throws non-validation errors for global handling.

### Global Error Handler

File: `frontend/src/lib/globalErrorHandler.ts`

- `auth`: clears user and redirects to `login`, except `Already authenticated.` which redirects to `home`
- `forbidden`: toast only
- `conflict`: toast only
- `network`: flips the app offline (`useOnline().online = false`) and shows a toast
- `validation`: first-message toast if it ever bubbles up

`setupUnhandledRejectionHandler()` (wired in `main.ts`) routes unhandled promise rejections that are `ApiError`s into `globalErrorHandler`.

## System Session Flow

Main shell: `frontend/src/views/SystemView.vue`

When a system is opened:

- `systemStore.enterSystem(systemId)` loads the system and its modules.
- `contentStore` loads rules, index entries, and game data for every active module.
- Active modules are expanded in the left panel.
- The shell stays mounted while child routes change between rule detail and game-data detail.

While inside a system:

- Opening a rule records it in `historyStore`.
- The selected rule drives left-panel highlighting and focus behavior.

## Content Tiers And Offline Caching

Content splits into two tiers:

- **Released content** — immutable per module-version, served from versioned manifest URLs (`manifestByModule[moduleId].content.{rules,index,game-data}`), keyed by `version_id` and `revision`. This is what players read and what the offline cache pins.
- **Live / personalized / social data** — drafts, bookmarks, memberships, permissions, proofreads, and comments. Always online-only; never cached.

### Cache Layer

- Store: `frontend/src/stores/cacheStore.ts`
- IndexedDB helpers: `frontend/src/lib/idb.ts` — a single database `olgur-offline` with object stores `systems`, `manifests`, `content`, and `meta`. `idb.ts` handles `onblocked` (a version-bump collision with another open connection) and resets its cached connection promise on error so later calls retry a fresh open.

`pinSystem(systemId)` fetches the system, its modules, its manifest, and the versioned content for every viewable module, then writes them to IndexedDB and records a `meta` registry entry. The pin is atomic: it pre-checks storage quota, throws (via `fetchCollection`) if a content kind cannot be downloaded, and rolls back partial writes on failure — the error surfaces as a `vue-sonner` toast in `PinSystemControl.vue`. `unpinSystem(systemId)` removes everything under the `systemId:` key prefix.

Rule images (`/rules/images/`) are cached offline via a workbox `runtimeCaching` `CacheFirst` rule in `frontend/vite.config.ts`.

### Offline Boot And Data-Source Fallback

- `authStore.bootstrap()` detects a `network` failure during CSRF/session fetch and sets `useOnline().online = false` instead of redirecting to login.
- `systemStore.enterSystem()` and `contentStore.fetchManifest()` / `fetchRules()` / `fetchIndexEntries()` / `fetchGameData()` check `offline` first and read from the cache, falling back to the network only when online.
- Online, `contentStore` serves live draft content to editors/admins (`content.view_live`) and versioned released content to players (`content.view_released`); offline, it serves whatever is pinned.

### Connectivity Signal

Composable: `frontend/src/composables/useOnline.ts`

- Module-level reactive `online` ref (seeded from `navigator.onLine`, updated by `online`/`offline` window events) and a derived `offline` computed.
- `probe()` performs a HEAD request (to `VITE_COOKIE_URL`) to re-check connectivity and is run on the window `online` event before flipping online.
- `setOnline(value)` sets the flag and notifies reconnect callbacks when transitioning offline → online.
- `onOnline(cb)` registers a reconnect callback and returns an unregister function; `SystemView` uses it to re-run the system load on reconnect.
- `OfflineBanner.vue` shows a read-only cached-content banner when `offline`.

### PWA Shell

Configured via `vite-plugin-pwa` in `frontend/vite.config.ts` and registered in `main.ts` via `registerSW({ immediate: true })` (`virtual:pwa-register`).

- `registerType: 'autoUpdate'`, standalone display mode, app manifest name "Olgur", and workbox glob precaching of static assets.

## Versioning Workflow

### Content Loading Strategy

`contentStore` tracks a `viewMode` (`'draft' | 'release'`, default `'draft'`) and a `canSwitchView` flag (true when any active module has `content.view_live`):

- **Admins / editors** (`content.view_live`) can toggle Draft vs Release via the header (`SystemHeader.vue`); in Draft they read live draft content from the standard REST endpoints, in Release they read the latest released snapshot from the manifest's versioned content URLs.
- **Players** have no toggle (`canSwitchView` false) and always read the latest released snapshot from the manifest content URLs.
- `SystemView.vue` resets `viewMode` to `'draft'` on a genuine system switch (via `contentStore.clear()`) and re-fetches content whenever `viewMode` changes. The pin control (`PinSystemControl`, "make available offline") is shown only when `!canSwitchView || viewMode === 'release'` — always for players, and for admins only on the Release view.

### RetrofixEditor

Component: `frontend/src/components/RetrofixEditor.vue`
Composable: `frontend/src/composables/useRetrofix.ts`

Used when a designer applies a post-release editorial amendment to the latest released version without publishing a new version.

- Fetches both the released text (from the versioned API endpoint or `RuleVersion` row) and the current draft text.
- If the relevant reader-facing fields in the released record and draft record are equal before the amendment, the editor is explicitly asked whether to port the correction to the draft. This prevents the correction being overwritten by the next publish.
- If they have diverged, both are shown side by side so the designer can decide whether to apply the same fix to the draft.
- The designer's choice is always explicit; no automatic back-propagation occurs.

## Key Files

- Boot and auth: `frontend/src/main.ts`, `frontend/src/stores/auth.ts`, `frontend/src/lib/http.ts`, `frontend/src/lib/globalErrorHandler.ts`, `frontend/src/composables/useApi.ts`
- System session flow: `frontend/src/views/SystemView.vue`, `frontend/src/stores/system.ts`, `frontend/src/stores/content.ts`, `frontend/src/stores/membership.ts`
- Offline cache and connectivity: `frontend/src/stores/cacheStore.ts`, `frontend/src/lib/idb.ts`, `frontend/src/composables/useOnline.ts`, `frontend/vite.config.ts`
- Versioning: `frontend/src/components/RetrofixEditor.vue`, `frontend/src/composables/useRetrofix.ts`
