# Olgur Frontend Reference

> **LLM REFERENCE — terse by design.** Human tutorial: `docs/developer-guide/` (temporary). If the two disagree, the code wins; correct this file.

This file is the entry point into the read-first documentation for `frontend/`. It is designed for LLMs that need the current SPA structure, state flow, and non-obvious UI behavior without scanning every Vue component first.

The documentation is split across this index and four focused maps in `frontend/docs/`. Read the relevant map for the area you are about to change; do not read all of them at once.

## Snapshot

- Vue 3.5.42 SPA with TypeScript 5.9.3 and Vite 8.2.2.
- Cookie/session auth against the Laravel API. No bearer tokens.
- Main logged-in experience is a persistent reading workspace for one system at a time.
- Primary shell: left navigation panel, center content, and a top toolbar that opens full-screen modals (Sequence of Play, Table Browser, tools). The former right game-data drawer and bottom unit-data panel are gone.
- Pinia 4.0.3 setup stores hold almost all domain and UI state.

## Stack

- Framework: `vue@^3.5.42`
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
| `VITE_FEATURE_ASL_TABLES` | `'true'` / `'false'` override for the unfinished ASL table kinds (`ift`, `cct`, `leader_creation`, `to_hit`, `to_kill`, `destruction`); defaults on in dev/test, off in production builds |
| `VITE_FEATURE_AFV_VS_AFV` | `'true'` / `'false'` override for the Ordnance vs Armor tool; defaults on in dev/test, off in production builds |

## Document Map

| File | Covers |
|---|---|
| `docs/types.md` | Domain types exposed to the frontend, and the authorization/permission vocabulary. |
| `docs/stores.md` | Every Pinia store — auth, system, membership, content composition, cache, proofread, bookmarks, modal/UI state. |
| `docs/flows.md` | Boot and auth flow, HTTP and error handling, system session flow, content tiers and offline caching, connectivity, PWA, and the versioning workflow. |
| `docs/ui-shell.md` | Route map and guards, root shell, left panel, top toolbar, full-screen modals, search/popups/content rendering, forms, and theming. |

## Current Non-Obvious Truths

- `authStore.user` is not persisted anywhere; reloads always re-bootstrap from `/me`.
- The composed "active set" (`activeModules`) drives `allRules`, `allGameData`, rule/table/unit search, and rule popups; the singular module (`singularModule`) drives `allIndexEntries`, index/acronym search and popups, and `singularGameData`.
- Vehicles and ordnance are searchable game data, but they do not render in `GameDataView`; they open in the full-screen `ToolModal` (Unit Data / Ordnance vs Armor). Unit Data has a Details/Counter toggle; Counter is an alternate ASL-style counter preview and Details remains the canonical layout.
- Selecting a table in the Table Browser hides the list/search panel and gives the table the full width. Top-bar table bookmarks open the same full-width view; the table header carries a Back-to-list control and a pin toggle.
- Tools are derived from `game_data` type (see `frontend/src/lib/gameDataTools.ts`); there is no module tool registry. Bespoke system tools live in `SYSTEM_TOOL_COMPONENTS`; BCS ships the local-first Formation Manager there.
- Two frontend-only features are behind Vite build-time flags in `frontend/src/lib/features.ts` with production-safe defaults: ASL table kinds (`VITE_FEATURE_ASL_TABLES`) and the Ordnance vs Armor tool (`VITE_FEATURE_AFV_VS_AFV`). When AFV vs AFV is off, ordnance results/bookmarks open Unit Data, which still lists ordnance. The backend has no tool knowledge.
- All rendered text is strict Markdown (`markdown-it` with `html: false`) and sanitized with DOMPurify in `renderContent.ts`; raw HTML tags are escaped and displayed as literal text. Titles/labels use inline mode; rule content and index definitions use block mode.
- Bookmarks and history show one ordered list. Each entry records the source (`mode`) it was created from; Draft entries are badged so draft and released items are never confused. The toolbar only exposes bookmarks for the source currently displayed. Bookmarks are creatable from live drafts as well as released content. The content store exposes `usesLiveContent`, `contentModeFor`, `effectiveViewMode`, `hasReleasedContent`, and availability helpers for this.
- Both live draft and released content are cached for the lifetime of the system session. Toggling Draft/Release restores the target source instead of re-fetching it; released cache entries are invalidated automatically when the module's manifest version/revision changes. An explicit reconnect or system exit clears both caches. When released snapshots lack live rule ids, switching modes re-resolves the open rule by its stable rule number and updates the route.
- Offline routing is a whitelist: only `home` and pinned-system routes are reachable. Guest/auth/account screens are not reachable offline.
- The Release dialog reviews pending draft changes, requires a note per semantic group, and publishes with the reviewed `draft_revision`. Back-editing the latest released snapshot works in both Draft and Release modes via the wrench action.

## Read These Files First

- Boot and auth: `frontend/src/main.ts`, `frontend/src/stores/auth.ts`, `frontend/src/lib/http.ts`, `frontend/src/lib/globalErrorHandler.ts`, `frontend/src/composables/useApi.ts`
- Routing: `frontend/src/router/index.ts`, `frontend/src/router/auth.ts`
- System session flow: `frontend/src/views/SystemView.vue`, `frontend/src/stores/system.ts`, `frontend/src/stores/content.ts`, `frontend/src/stores/membership.ts`
- Domain types: `frontend/src/types/domain.ts`
- Search and popup behavior: `frontend/src/components/GlobalSearchOverlay.vue`, `frontend/src/composables/useRuleDelegation.ts`, `frontend/src/components/RulePopupOverlay.vue`, `frontend/src/stores/interaction.ts`, `frontend/src/lib/renderContent.ts`, `frontend/src/lib/ruleReferences.ts`
- Bookmarks and history: `frontend/src/stores/bookmarks.ts`, `frontend/src/stores/history.ts`
- Versioning and draft review: `frontend/src/components/systems/ReleaseVersionDialog.vue`, `frontend/src/composables/useDraftReview.ts`, `frontend/src/composables/useRetrofix.ts`, `frontend/src/components/versions/RetrofixDialog.vue`
- Settings and theming: `frontend/src/stores/appSettings.ts`, `frontend/src/views/AppSettingsView.vue`
- Offline cache and connectivity: `frontend/src/stores/cacheStore.ts`, `frontend/src/lib/idb.ts`, `frontend/src/composables/useOnline.ts`, `frontend/src/stores/proofread.ts`, `frontend/vite.config.ts`
- UI shell and guards: `frontend/src/components/systems/SystemHeader.vue`, `frontend/src/components/systems/PinSystemControl.vue`, `frontend/src/composables/useModalShortcutGuard.ts`
- Game data surfaces and modals: `frontend/src/views/GameDataView.vue`, `frontend/src/components/game-data/SopModal.vue`, `frontend/src/components/game-data/TableBrowserModal.vue`, `frontend/src/components/ToolModal.vue`, `frontend/src/stores/gameDataModal.ts`, `frontend/src/stores/toolModal.ts`
- BCS Formation Manager: `frontend/src/components/tools/FormationManagerTool.vue`, `frontend/src/stores/formationManager.ts`, `frontend/src/lib/formations.ts`, `frontend/src/types/formation.ts`
- Tools: `frontend/src/lib/gameDataTools.ts`
- Rule editing and lint: `frontend/src/components/systems/DeleteRuleDialog.vue`, `frontend/src/components/systems/BrokenLinksDialog.vue`, `frontend/src/composables/useBrokenLinks.ts`
