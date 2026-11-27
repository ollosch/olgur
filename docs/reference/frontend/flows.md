# Frontend — Boot, Auth, Data Flow, And Offline

> **LLM REFERENCE — terse by design.** Human tutorial: `docs/developer-guide/` (temporary). If the two disagree, the code wins; correct this file.

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

- Opening a rule records it in `historyStore`, tagged with the content source (`draft` or `release`) it was read from.
- Live draft and released content are cached per system session, so toggling Draft/Release does not re-request them. Released entries are invalidated when the manifest version/revision changes; reconnect or leaving the system clears both caches.
- The selected rule drives left-panel highlighting and focus behavior.

## Content Tiers And Offline Caching

Content splits into two tiers:

- **Released content** — snapshot-based per module-version, served from versioned manifest URLs (`manifestByModule[moduleId].content.{rules,index,game-data}`). The latest snapshot can be back-edited; a back-edit bumps `revision` and changes the manifest `?rev` URL. IndexedDB caches are keyed by system/module/kind and validated by `version_id` only (not `revision`). This is what players read and what the offline cache pins.
- **Live / personalized / social data** — drafts, bookmarks, memberships, permissions, proofreads, and comments. Always online-only; never cached.

### Cache Layer

- Store: `frontend/src/stores/cacheStore.ts`
- IndexedDB helpers: `frontend/src/lib/idb.ts` — a single database `olgur-offline` with object stores `systems`, `manifests`, `content`, and `meta`. `idb.ts` handles `onblocked` (a version-bump collision with another open connection) and resets its cached connection promise on error so later calls retry a fresh open.

`pinSystem(systemId)` fetches the system, its modules, its manifest, and the versioned content for every viewable module, then writes them to IndexedDB and records a `meta` registry entry. It returns a `PinOutcome`: `'pinned'` on success, `'skipped'` when a pin is already running, `'request-failed'` when the initial metadata fetch fails, and `'no-content'` when no viewable module has released content. Background callers (`refreshIfStale`, `autoRefreshPin`) ignore the outcome. Content-download/storage/write failures throw and surface as a `vue-sonner` toast in `PinSystemControl.vue`; write failures roll back records already written. `unpinSystem(systemId)` removes everything under the `systemId:` key prefix.

Rule images (`/rules/images/`) are cached offline via a workbox `runtimeCaching` `CacheFirst` rule in `frontend/vite.config.ts`.

### Offline Boot And Data-Source Fallback

- `authStore.bootstrap()` detects a `network` failure during CSRF/session fetch and sets `useOnline().online = false` instead of redirecting to login.
- `systemStore.enterSystem()` and `contentStore.fetchManifest()` / `fetchRules()` / `fetchIndexEntries()` / `fetchGameData()` check `offline` first and read from the cache, falling back to the network only when online.
- In draft mode, `contentStore` serves live content to editors/admins for modules with `content.view_live`, and versioned released content to players (`content.view_released`); in release mode, everyone (including editors/admins) gets the latest snapshot. Offline, it serves whatever is pinned.

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

### Draft Review And Release

The Version action on a system card opens `ReleaseVersionDialog`, which loads pending draft changes from `GET .../draft-changes?pending=1`. It shows them grouped per entity, lets the editor reclassify each group as semantic or typo, requires one release note per semantic group, and publishes with the reviewed `draft_revision`. A 409 means the draft changed after review; the dialog reloads the review. A 422 means the submitted notes do not cover exactly the pending semantic groups.

### Content Loading Strategy

`contentStore` tracks a `viewMode` (`'draft' | 'release'`, default `'draft'`) and a `canSwitchView` flag (true when any active module has `content.view_live`):

- **Admins / editors** (`content.view_live`) can toggle Draft vs Release via the header (`SystemHeader.vue`); in Draft they read live draft content from the standard REST endpoints, in Release they read the latest released snapshot from the manifest's versioned content URLs.
- **Players** have no toggle (`canSwitchView` false) and always read the latest released snapshot from the manifest content URLs.
- `SystemView.vue` resets `viewMode` to `'draft'` on a genuine system switch (via `contentStore.clear()`) and re-fetches content whenever `viewMode` changes. The "Make available offline" toggle lives in the System ▾ menu (`PinSystemControl.vue`); it is disabled when offline or when no released version exists, and shows success/failure feedback. Pinning only caches viewable released content.

### RetrofixEditor

Component: `frontend/src/components/versions/RetrofixEditor.vue`
Composable: `frontend/src/composables/useRetrofix.ts`

Used when a designer applies a post-release editorial amendment to the latest released version without publishing a new version. The back-edit action is available from rule detail in both Draft and Release modes; full draft editing is restricted to Draft mode.

- Fetches both the released text (from the versioned API endpoint or `RuleVersion` row) and the current live draft text.
- If the relevant reader-facing fields in the released record and draft record are equal before the amendment, the editor is explicitly asked whether to port the correction to the draft. This prevents the correction being overwritten by the next publish.
- If they have diverged, both are shown side by side so the designer can decide whether to apply the same fix to the draft.
- The designer's choice is always explicit; no automatic back-propagation occurs.

## Key Files

- Boot and auth: `frontend/src/main.ts`, `frontend/src/stores/auth.ts`, `frontend/src/lib/http.ts`, `frontend/src/lib/globalErrorHandler.ts`, `frontend/src/composables/useApi.ts`
- System session flow: `frontend/src/views/SystemView.vue`, `frontend/src/stores/system.ts`, `frontend/src/stores/content.ts`, `frontend/src/stores/membership.ts`
- Offline cache and connectivity: `frontend/src/stores/cacheStore.ts`, `frontend/src/lib/idb.ts`, `frontend/src/composables/useOnline.ts`, `frontend/vite.config.ts`
- Versioning: `frontend/src/components/versions/RetrofixEditor.vue`, `frontend/src/composables/useRetrofix.ts`
