# Olgur Frontend Reference

This file is the read-first map for `frontend/`. It is designed for LLMs that need the current SPA structure, state flow, and non-obvious UI behavior without scanning every Vue component first.

## Snapshot

- Vue 3.5.40 SPA with TypeScript 5.9.3 and Vite 8.
- Cookie/session auth against the Laravel API. No bearer tokens.
- Main logged-in experience is a persistent reading workspace for one system at a time.
- Primary shell: left navigation panel, center content, and a top toolbar that opens full-screen modals (Sequence of Play, Table Browser, tools). The former right game-data drawer and bottom unit-data panel are gone.
- Pinia 4.0.2 setup stores hold almost all domain and UI state.

## Stack

- Framework: `vue@beta`
- Router: `vue-router@^5`
- State: `pinia@^4`
- HTTP: `axios@^1`
- Forms: `vee-validate@^4`
- Styling: Tailwind CSS 4
- Headless UI: `reka-ui`
- Toasts: `vue-sonner`
- Tests: Vitest 4

Important environment variables:

| Variable | Meaning |
|---|---|
| `VITE_API_BASE_URL` | Axios base URL, defaults to `http://localhost/api` in `src/lib/http.ts` |
| `VITE_COOKIE_URL` | CSRF cookie endpoint used before auth mutations |
| `VITE_APP_DEBUG` | Enables extra `console.error` output in the global error handler |

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

## Route Map

Router files: `frontend/src/router/index.ts`, `frontend/src/router/auth.ts`

### Guest Routes

- `/login`
- `/register`
- `/reset-password-request`
- `/reset-password`

### Auth Routes

- `/` -> `HomeView`
- `/profile` -> `UserProfileView`
- `/settings` -> `AppSettingsView`
- `/systems/:systemId` -> `SystemView`
- `/systems/:systemId/rule/:ruleId` -> `RuleDetailView`
- `/systems/:systemId/game-data/:gameDatumId` -> `GameDataView`

### Guard Behavior

- `requiresAuth` without `authStore.user` redirects to `login?redirect=<fullPath>`.
- `requiresGuest` with `authStore.user` redirects to `home`.
- `requiresSystemAccess` (meta on the `system` route): when unauthenticated AND offline, the guard still admits the route if the target `systemId` is pinned (`cacheStore.isCached(systemId)`), enabling read-only guest access to a cached system. Cached systems are admitted to logged-out users only while offline.
- When offline, `home` is admitted without auth (`useOnline().offline`), landing on the cached-systems screen.
- Both guards wait for `authStore.initialized` before executing, so deep links opened while the app is still bootstrapping are handled correctly.
- `LoginView` reads the `redirect` query after a successful login and navigates there; falls back to `home`.

## Root UI Shell

App root: `frontend/src/App.vue`

Mounted once for the whole SPA:

- `<router-view />`
- global toaster
- `RulePopupOverlay`
- `GlobalSearchOverlay`

There is no separate public landing shell. The authenticated app is the default shell.

## Domain Types Exposed To The Frontend

Source of truth: `frontend/src/types/domain.ts`

Main API-facing types:

- `User` includes `super_admin`.
- `SystemConfig` includes `global_rule_numbers`, `sort_rules_by`, `toc_depth`, `proofread_threshold`, and `cover_image`. When `global_rule_numbers` is true, bare `{{L:n}}` links resolve system-wide; otherwise they resolve in the module that owns the content. `proofread_threshold` is the number of distinct proofreaders required before an entity counts as proofread.
- `ProofreadEntityType` (`rule` | `index_entry` | `game_datum`) and `ProofreadStatus` (`{ threshold, proofreads: Record<entity_id, { count, me }> }`) describe the proofread counter state.
- `MembershipConfig` includes optional `bookmarks` (`BookmarkEntry[]`, type `rule` | `table` | `unit`), `ignored_tags`, `bold_tags`, `preferred_rule_format`, and `selected_module_id` (`string | null`).
- `Rule` has a client-calculated `depth` field.
- `GameDatum.type` is one of `sop`, `table`, `ordnance`, `vehicle`. The type selects the tool component (`sop` → SOP viewer, `table` → table renderer, `vehicle` → unit browser, `ordnance` → ordnance tool).
- `Rule`, `IndexEntry`, and `GameDatum` carry an optional stable reference to their original live entity — `rule_id`, `index_entry_id`, `game_datum_id` respectively — populated on released (snapshot) records so released content can be re-keyed to the live ids.
- `RuleDeletionMode` (`re_parent` | `recursive`) and `BrokenReference` describe the rule deletion operation and lint results.

## Main Stores

### `authStore`

File: `frontend/src/stores/auth.ts`

- Holds the authenticated `user` in memory.
- Calls `/login`, `/register`, `/logout`, `/me`, `/forgot-password`, `/reset-password`, and full verify-email URLs.
- Exposes `loading` and `errors` from its `useApi()` instance.

### `systemStore`

File: `frontend/src/stores/system.ts`

Owns:

- `systems`
- `modulesBySystem`
- `currentSystem`
- `modules` — computed shortcut for the current system's modules

Key behaviors:

- `init()` loads systems (memberships and subscriptions are loaded by `membershipStore`).
- `enterSystem(systemId)` loads the system record and its modules (from the cache when offline).
- `exitSystem()` clears the current system context.
- `createSystem` / `deleteSystem` / `updateSystem` / `createModule` / `deleteModule` / `createVersion` — system/module lifecycle actions.
- Holds raw systems/modules only; module composition (the "currently played" set) is derived in `contentStore` from `selected_module_id`, which is persisted by `membershipStore`.

### `membershipStore`

File: `frontend/src/stores/membership.ts`

Owns:

- `membershipsBySystem` — the current user's membership per system (keyed by system id).
- `subscriptions` — flat map of the user's subscriptions keyed by module id.
- `membership` — computed shortcut for the current system's membership.

Key behaviors:

- `fetchMemberships()` / `fetchSubscriptions()` / `refreshMembership(systemId)` load the current user's memberships and subscriptions.
- `updateMembership(systemId, config)` — `PATCH /me/memberships/{system}` with the given config object, then stores the response.
- `selectModule(systemId, moduleId | null)` — persists the "currently played" module as `selected_module_id`; `null` clears the selection (all subscribed modules become active). Drives `contentStore`'s composition model.

### `contentStore`

File: `frontend/src/stores/content.ts`

Owns:

- `rulesByModule`
- `indexEntriesByModule`
- `gameDataByModule`
- `manifestByModule` — version manifest keyed by module ID, loaded on system entry; contains `version_id`, `version_string`, `released_at`, and versioned content API URLs
- `viewMode` (`'draft' | 'release'`, default `'draft'`) — whether editable admins/editors read live draft content or the latest released snapshot

Derived state (composition model):

- `selectedModuleId` — the `selected_module_id` from the current membership config, or `null`.
- `coreModule` — the system's single core module (`is_core`), falling back to the first module.
- `activeModules` — the composed "active set": core first, then the selected module if `selected_module_id` is set (and isn't core), else every viewable non-core module (`content.view_live` or `content.view_released`) sorted by `sort_order`. Core is always first.
- `singularModule` — the ONE module whose singular surfaces come from: the selected module if set, else core. Singular surfaces are never merged across modules.
- `allRules`, `allGameData` — flattened over `activeModules`.
- `allIndexEntries`, `singularGameData` — from `singularModule` only (index and SOP are single-module surfaces).
- `rulesById`, `rulesByNumber`, `rulesByModuleNumber`, `moduleById`, `moduleBySlug`, `indexEntriesById`, `indexEntriesByTerm` power navigation, popup lookup, and search.
- `resolveRuleReference(number, { moduleSlug?, moduleId? })` resolves bare links in the owning module (or system-wide when `globalRuleNumbers`) and qualified `{{L:slug:n}}` links in the named module.
- `childrenMap` / `ruleDepths` compute `rule.depth` client-side; `flattenedRulesByModule` provides depth-first order per module.
- `visibleIndexEntryIds` hides empty index branches unless they or their descendants still have visible content after filtering rule refs to resolvable rules.
- `canSwitchView` — true when at least one active module has `content.view_live`; gates the Draft/Release toggle (players never see it). `releaseViewEmpty` — true on the Release view when no active module has manifest content.

Content source and mode switching:

- `setViewMode(mode)` flips between draft and release. In `draft` mode, modules the user can edit live (`content.view_live`) fetch from the standard REST endpoints; other modules fetch released content from the manifest's versioned content URLs.
- Released reads are cache-first and version-aware: the cached `version_id` is compared against the manifest's current `version_id`, serving IndexedDB on a match and the network otherwise. Released reads also null-guard `manifestEntry.content` before fetching.
- Released content is re-keyed by stable live ids via shared `normalizeRules` / `normalizeIndexEntries` / `normalizeGameData` helpers, which map each snapshot `id` to its `rule_id` / `index_entry_id` / `game_datum_id` and remap `parent_id` from snapshot ids to live ids — keeping bookmarks, history, proofreads, and the `*ById` lookups consistent across draft/release/offline.
- `refreshContent()` clears per-module content, bumps a monotonic `refreshSeq` token (discarding in-flight fetches from an earlier mode), then fans out re-fetches via `Promise.allSettled`.

Rule editor operations:

- `deleteRule()` — delete a rule with `re_parent` (default) or `recursive` mode.
- `fetchLint()` — load the system's broken-link lint results; `refreshContent()` re-fetches rules/index after a mutation.

### `cacheStore`

File: `frontend/src/stores/cacheStore.ts`

Backed by IndexedDB via `frontend/src/lib/idb.ts` (see "Content Tiers And Offline Caching").

- `cachedSystems` — registry of pinned systems (`CachedSystemMeta[]`), loaded on boot.
- `pinInProgress`, `bytesUsed`, `quota` — pin state and storage accounting.
- `isCached(systemId)`, `loadRegistry()`, `estimateStorage()`, `pinSystem(systemId)`, `unpinSystem(systemId)`.
- `getCachedSystem()`, `getCachedManifest()`, `getCachedContent()` — offline reads.
- `pinSystem()` fetches the system, its modules, its manifest, and versioned content for every viewable module, then writes them to IndexedDB atomically and records a `meta` entry. It pre-checks storage quota and rolls back partial writes on failure; a failed content download (`fetchCollection`, which throws) aborts the pin and surfaces an error toast in `PinSystemControl`.

### `proofreadStore`

File: `frontend/src/stores/proofread.ts`

- `statusMap` — per-entity `{ count, me }` proofread counts; `threshold` — the system's proofread threshold.
- `canProofread` — true when online and at least one module grants `content.proofread`.
- `fetchStatus(systemId)`, `record(entityType, entityId)`, `remove(entityType, entityId)`; `remove()` re-fetches status from the server after a successful delete (server-authoritative).
- `countFor()`, `isDone()`, `hasMarked()`, `needsProofreading` — derive the per-entity proofread state and the "needs proofreading" list.
- UI: `frontend/src/components/systems/ProofreadToggle.vue` (per-entity mark/remove button) and `frontend/src/components/systems/ProofreadTab.vue` (needs-proofreading list in the left panel).

### Smaller Supporting Stores

- `bookmarks.ts`: persists polymorphic bookmarks (`rule` | `table` | `unit`) into membership config via `PATCH /me/memberships/{system}`. `resolvedBookmarks` labels each entry (rule number/title, table name); `isBookmarked` / `addBookmark` / `removeBookmark` are type-aware.
- `history.ts`: in-memory per-system recent rule history, capped at 20 and cleared on system exit.
- `appSettings.ts`: localStorage-backed acronym popup toggle, theme hue, and sidebar pin state.
- `leftPanel.ts`, `shortcut.ts`: UI shell state — left-panel tab, module/rule expansion, focus; `shortcut.ts` also owns the Super-Search overlay flag.
- `gameDataModal.ts`: full-screen game-data modal state — `sopOpen`, `tableBrowserOpen`, `selectedTableId`; `openSop`/`closeSop`, `openTableBrowser`/`closeTableBrowser`, `selectTable(id)`.
- `toolModal.ts`: full-screen tool modal state — `isOpen`, `activeToolId`; `open(toolId)`/`close()`.
- `gameDataPanel.ts`: per-record game-data UI state (active SOP/table id, SOP expand/collapse + search) so it survives a modal close/reopen.
- `unitBrowser.ts`: Unit Data browser search/filter/selection state, so it survives the tool modal closing.
- `unitSelection.ts`: temporary handoff when global search opens a vehicle or ordnance entry in the tool modal (`UnitDataTab` consumes the pending unit on mount).
- `interaction.ts`: shared popup state (rule/range/acronym) and navigation handlers; see "Rule Popup System".
- `memberManagement.ts`: member management dialog state.

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

## Navigation And Reading UX

### Left Panel

Primary component: `frontend/src/components/systems/LeftPanelContent.vue`

- Tabs: rules tree, index, bookmarks, history, proofread.
- Module expansion state lives in store state and local interaction.
- Width is resizable and persisted in localStorage.

### Center Content

- No child route: top-level TOC grouped by active module.
- `/rule/:ruleId`: `RuleDetailView`.
- `/game-data/:gameDatumId`: `GameDataView` for tables and SOP content.

### Top Toolbar

Component: `frontend/src/components/systems/SystemHeader.vue`

- Module selector ("currently played") — a dropdown over non-core modules plus "All modules"; persists the choice via `membershipStore.selectModule()`. Only shown when more than one non-core module exists.
- Table Browser — opens `TableBrowserModal`.
- Super-Search — opens the global search overlay (`shortcutStore.overlayOpen`).
- Sequence of Play — opens `SopModal`.
- Tools ▾ — lists tools derived from `gameDataTools()`; opens each in `ToolModal`.
- Table bookmarks ▾ — lists pinned tables (bookmarks of type `table`); opens the table in `TableBrowserModal`.
- System ▾ — exit system, manage members, broken links, profile, settings, logout.
- Right side: Draft/Release tabs (only when `canSwitchView`) and the pin control.

### Full-Screen Modals

The former right game-data drawer and bottom panel are replaced by full-screen modals (open/close state in the `gameDataModal` / `toolModal` stores):

- `SopModal.vue` (Sequence of Play) and `TableBrowserModal.vue` (tables) — backed by `gameDataModalStore`. The table browser lists all tables in the active set; each row can pin/unpin a `table` bookmark, and the toolbar "Table bookmarks ▾" lists pinned tables.
- `ToolModal.vue` — hosts unit data (`UnitDataTab`) and Ordnance vs Armor (`OrdnanceVersusArmorTool`), plus any bespoke system tools, in a full-screen dialog. Active tool + its internal store-backed state survive open → close → open.

## Search, Popups, And Content Rendering

### Content Tokens

Renderer: `frontend/src/lib/renderContent.ts`

Supported inline content tokens:

- `{{L:1.2}}` -> rule link by number
- `{{L:1.2#Custom label}}` -> labeled rule link
- `{{L:1.2-1.4}}` -> rule range link
- `{{L:core:3.4}}` -> rule link to a rule number in the module with slug `core`
- `{{A:TERM}}` -> acronym popup term
- `{{I:image-key}}` -> rule image from `/api/rules/images/{filename}`
- `<ex>...</ex>` -> example block markup

### Rule Popup System

Files:

- `frontend/src/composables/useRuleDelegation.ts`
- `frontend/src/composables/useRulePopup.ts`
- `frontend/src/components/RulePopupOverlay.vue`

Current behavior:

- Uses document-level event delegation rather than per-link listeners.
- Hovering rule-number links shows rule popup content.
- Hovering acronym terms shows acronym popup content when enabled.
- Popup state is shared singleton state.

### Global Search

Component: `frontend/src/components/GlobalSearchOverlay.vue`

Searches active content only:

- rules
- visible index entries
- `table` and `sop` game data
- `vehicle` and `ordnance` game data as unit results

Selection behavior:

- Rule result -> navigate to `system-rule`
- Table or SOP result -> navigate to `system-game-datum`
- Vehicle or ordnance result -> set `unitSelectionStore` pending unit and open the tool modal (`toolModalStore.open(item.type)`)

## Authorization And UI Responsibilities

### Frontend Authorization Helper

File: `frontend/src/composables/useAuthorization.ts`

The API supplies a computed current-user permission map for each module. The frontend uses these named permissions only to gate actions and choose each module's content source; it must not derive permissions from `super_admin`, membership `admin`, or subscription `editor` flags.

- Backend policies resolve permissions from the existing role facts and remain authoritative for every request.
- No role or permission database tables are needed.
- Permission vocabulary: `system.manage`, `membership.manage`, `module.create`, `module.update`, `module.delete`, `content.view_live`, `content.view_released`, `content.edit`, `content.proofread`, `version.publish`, `version.amend_latest`, `subscription.manage`.
- Module permission maps may be absent/null (e.g. before a module's permissions load); consumers null-guard `module.permissions` (`module.permissions?.['content.view_released']`) rather than assuming the object exists.

The backend remains the source of truth for actual authorization. The frontend only mirrors or smooths some flows.

## Forms And Validation

- Forms use `vee-validate` without client-side schemas.
- Validation is server-driven.
- Pattern used throughout:
  - submit through a store action
  - if `store.errors` exists, feed it back into the form with `setErrors(...)`
  - let non-validation failures bubble to the global error handler

## Theme And Persistent UI Settings

- The app is dark-only.
- Theme color is a single-hue OKLCH palette generated from `appSettings.themeHue`.
- `AppSettingsView` currently exposes only two user settings:
  - acronym popups on or off
  - theme hue or preset

## Current Non-Obvious Truths

- `authStore.user` is not persisted anywhere; reloads always re-bootstrap from `/me`.
- The composed "active set" (`activeModules`) drives `allRules`, `allGameData`, search results, and popup lookups; the singular module (`singularModule`) drives `allIndexEntries` and `singularGameData`.
- Vehicles and ordnance are searchable game data, but they do not render in `GameDataView`; they open in the full-screen `ToolModal` (Unit Data / Ordnance vs Armor).
- Tools are derived from `game_data` type (see `frontend/src/lib/gameDataTools.ts`); there is no module tool registry.

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

## Read These Files First

- Boot and auth: `frontend/src/main.ts`, `frontend/src/stores/auth.ts`, `frontend/src/lib/http.ts`, `frontend/src/lib/globalErrorHandler.ts`, `frontend/src/composables/useApi.ts`
- Routing: `frontend/src/router/index.ts`, `frontend/src/router/auth.ts`
- System session flow: `frontend/src/views/SystemView.vue`, `frontend/src/stores/system.ts`, `frontend/src/stores/content.ts`, `frontend/src/stores/membership.ts`
- Domain types: `frontend/src/types/domain.ts`
- Search and popup behavior: `frontend/src/components/GlobalSearchOverlay.vue`, `frontend/src/composables/useRuleDelegation.ts`, `frontend/src/composables/useRulePopup.ts`, `frontend/src/stores/interaction.ts`, `frontend/src/lib/renderContent.ts`
- Bookmarks and history: `frontend/src/stores/bookmarks.ts`, `frontend/src/stores/history.ts`
- Settings and theming: `frontend/src/stores/appSettings.ts`, `frontend/src/views/AppSettingsView.vue`
- Offline cache and connectivity: `frontend/src/stores/cacheStore.ts`, `frontend/src/lib/idb.ts`, `frontend/src/composables/useOnline.ts`, `frontend/src/stores/proofread.ts`, `frontend/vite.config.ts`
- UI shell and guards: `frontend/src/components/systems/SystemHeader.vue`, `frontend/src/components/systems/PinSystemControl.vue`, `frontend/src/composables/useModalShortcutGuard.ts`
- Game data surfaces and modals: `frontend/src/views/GameDataView.vue`, `frontend/src/components/game-data/SopModal.vue`, `frontend/src/components/game-data/TableBrowserModal.vue`, `frontend/src/components/ToolModal.vue`, `frontend/src/stores/gameDataModal.ts`, `frontend/src/stores/toolModal.ts`
- Tools: `frontend/src/lib/gameDataTools.ts`
- Rule editing and lint: `frontend/src/components/systems/DeleteRuleDialog.vue`, `frontend/src/components/systems/BrokenLinksDialog.vue`, `frontend/src/composables/useBrokenLinks.ts`
