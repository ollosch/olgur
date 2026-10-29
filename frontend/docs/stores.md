# Frontend — Stores

> **LLM REFERENCE — terse by design.** Human tutorial: `docs/developer-guide/` (temporary). If the two disagree, the code wins; correct this file.

This file is the read-first map of every Pinia store in `frontend/src/stores/`. It complements `types.md`, `flows.md`, and `ui-shell.md`.

Pinia 4.0.3 setup stores hold almost all domain and UI state.

## `authStore`

File: `frontend/src/stores/auth.ts`

- Holds the authenticated `user` in memory.
- Calls `/login`, `/register`, `/logout`, `/me`, `/forgot-password`, `/reset-password`, and full verify-email URLs.
- Exposes `loading` and `errors` from its `useApi()` instance.

## `systemStore`

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

## `membershipStore`

File: `frontend/src/stores/membership.ts`

Owns:

- `membershipsBySystem` — the current user's membership per system (keyed by system id).
- `subscriptions` — flat map of the user's subscriptions keyed by module id.
- `membership` — computed shortcut for the current system's membership.

Key behaviors:

- `fetchMemberships()` / `fetchSubscriptions()` / `refreshMembership(systemId)` load the current user's memberships and subscriptions.
- `updateMembership(systemId, config)` — `PATCH /me/memberships/{system}` with the given config object, then stores the response.
- `selectModule(systemId, moduleId | null)` — persists the "currently played" module as `selected_module_id`; `null` clears the selection (all subscribed modules become active). Drives `contentStore`'s composition model.

## `contentStore`

File: `frontend/src/stores/content.ts`

Owns:

- `rulesByModule`
- `indexEntriesByModule`
- `gameDataByModule`
- `manifestByModule` — version manifest keyed by module ID, loaded on system entry; contains `version_id`, `version_string`, `released_at`, `revision`, and versioned content API URLs
- `viewMode` (`'draft' | 'release'`, default `'draft'`) — whether editable admins/editors read live draft content or the latest released snapshot

Derived state (composition model):

- `selectedModuleId` — the `selected_module_id` from the current membership config, or `null`.
- `coreModule` — the system's single core module (`is_core`), falling back to the first module.
- `activeModules` — the composed "active set": core first, then the selected module if `selected_module_id` is set (even if unavailable), else every viewable non-core module (`content.view_live` or `content.view_released`) sorted by `sort_order`. Core is always first.
- `singularModule` — the ONE module whose singular surfaces come from: the selected module if set, else core. Singular surfaces are never merged across modules.
- `globalRuleNumbers` — the system's `config.global_rule_numbers` flag; drives both link resolution and flat (header-less) tree rendering.
- `flatRootRules` — top-level rules across the active modules, ordered module-first (core, then non-core by `sort_order`) then by `sort_order`; used only by `global_rule_numbers` systems to render one flat tree.
- `allRules`, `allGameData` — flattened over `activeModules`.
- `allIndexEntries` — core plus the singular module (deduped), so the system index stays visible when an expansion module is selected. `singularGameData` — from `singularModule` only (SOP is a single-module surface).
- `allLoadedRules`, `rulesById`, `rulesByNumber`, `rulesByModuleNumber`, `moduleById`, `moduleBySlug`, `gameDataById`, `indexEntriesById`, `indexEntriesByTerm` power navigation, popup lookup, and search. Lookups cover every loaded module, not just the active reading set.
- `resolveRuleReference(number, { moduleSlug?, moduleId? })` resolves bare links in the owning module (or system-wide when `globalRuleNumbers`) and qualified `slug:number` / `{{L:slug:n}}` links in the named module. `hasRuleReference` checks both endpoints of a range.
- `usesLiveContent(moduleId)`, `hasReleasedContent(moduleId)`, `isRuleAvailable` / `isGameDatumAvailable` / `isBookmarkTargetAvailable` decide whether the current source is live draft or released and whether a bookmark target is resolvable.
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

## `cacheStore`

File: `frontend/src/stores/cacheStore.ts`

Backed by IndexedDB via `frontend/src/lib/idb.ts` (see "Content Tiers And Offline Caching" in `flows.md`).

- `cachedSystems` — registry of pinned systems (`CachedSystemMeta[]`), loaded on boot.
- `pinInProgress`, `bytesUsed`, `quota` — pin state and storage accounting.
- `isCached(systemId)`, `loadRegistry()`, `estimateStorage()`, `pinSystem(systemId)`, `unpinSystem(systemId)`.
- `getCachedSystem()`, `getCachedManifest()`, `getCachedContent()` — offline reads.
- `pinSystem()` returns a `PinOutcome` (`'pinned'`, `'skipped'`, `'request-failed'`, or `'no-content'`) instead of resolving silently. Content-download/storage/write failures throw and toast in `PinSystemControl`; write failures roll back records already written. It pre-checks storage quota and records a `meta` entry only after success.

## `proofreadStore`

File: `frontend/src/stores/proofread.ts`

- `statusMap` — per-entity `{ count, me }` proofread counts; `threshold` — the system's proofread threshold.
- `canProofread` — true when online and at least one module grants `content.proofread`.
- `fetchStatus(systemId)`, `record(entityType, entityId)`, `remove(entityType, entityId)`; `remove()` re-fetches status from the server after a successful delete (server-authoritative).
- `countFor()`, `isDone()`, `hasMarked()`, `needsProofreading` — derive the per-entity proofread state and the "needs proofreading" list.
- UI: `frontend/src/components/systems/ProofreadToggle.vue` (per-entity mark/remove button) and `frontend/src/components/systems/ProofreadDialog.vue` (needs-proofreading list opened from the System ▾ menu).

## `formationManagerStore`

File: `frontend/src/stores/formationManager.ts`

Local-first state for the BCS Formation Manager. Scenarios are persisted in IndexedDB (`scenarios` + the `scenarioMeta` last-opened key), so the tool works fully offline and supports JSON export/import. It holds the saved scenario library, the open scenario, the active side, and the selected formation shown in the detail panel.

- `createNewScenario(name, activeIds)` snapshots the bundled Arracourt formation charts; selected formations start `in_game`, all others start `reserve`.
- Mutations cover unit steps (0 minimum, no maximum), Prepared Defense, free-text support, artillery points, fatigue (Fresh/0–4), and formation status transitions between `reserve`, `in_game`, and `dead_pool`.
- Every mutation debounces an IndexedDB write; `flushSave()` forces it immediately. Dead Pool rebuilds keep current unit steps and state.
- `exportScenario(id)` and `importScenario(contents)` move scenarios as `.formation.json` files; an import whose id already exists receives a new id.

## Smaller Supporting Stores

- `bookmarks.ts`: persists polymorphic bookmarks (`rule` | `table` | `unit`) into membership config via `PATCH /me/memberships/{system}`. `resolvedBookmarks` labels each entry and flags `available` when the target resolves in the currently loaded source; `availableBookmarks` feeds the toolbar. New bookmarks are only allowed on released content (not live drafts). `isBookmarked` / `addBookmark` / `removeBookmark` are type-aware.
- `history.ts`: in-memory per-system recent rule history, capped at 20 and cleared on system exit.
- `appSettings.ts`: localStorage-backed acronym popup toggle, theme hue, and sidebar pin state.
- `leftPanel.ts`, `shortcut.ts`: UI shell state — left-panel tab, module/rule expansion, focus; `shortcut.ts` also owns the Super-Search overlay flag.
- `gameDataModal.ts`: full-screen game-data modal state — `sopOpen`, `tableBrowserOpen`, `selectedTableId`; `openSop`/`closeSop`, `openTableBrowser`/`closeTableBrowser`, `selectTable(id)`.
- `toolModal.ts`: full-screen tool modal state — `isOpen`, `activeToolId`; `open(toolId)`/`close()`.
- `gameDataPanel.ts`: per-record game-data UI state (active SOP/table id, SOP expand/collapse + search) so it survives a modal close/reopen.
- `unitBrowser.ts`: Unit Data browser search/filter/selection state, so it survives the tool modal closing.
- `unitSelection.ts`: temporary handoff when global search opens a vehicle or ordnance entry in the tool modal (`UnitDataTab` consumes the pending unit on mount).
- `interaction.ts`: shared popup state (rule/range/acronym) and navigation handlers; see "Rule Popup System" in `ui-shell.md`.
- `memberManagement.ts`: member management dialog state.

## Key Files

- Boot and auth state: `frontend/src/stores/auth.ts`
- System/module lifecycle: `frontend/src/stores/system.ts`
- Membership and reader state: `frontend/src/stores/membership.ts`
- Composition and content: `frontend/src/stores/content.ts`
- Offline cache: `frontend/src/stores/cacheStore.ts`, `frontend/src/lib/idb.ts`
- Proofread: `frontend/src/stores/proofread.ts`
- Bookmarks/history: `frontend/src/stores/bookmarks.ts`, `frontend/src/stores/history.ts`
- Modal/UI state: `frontend/src/stores/gameDataModal.ts`, `frontend/src/stores/toolModal.ts`, `frontend/src/stores/gameDataPanel.ts`, `frontend/src/stores/unitBrowser.ts`
- Popups and interaction: `frontend/src/stores/interaction.ts`
