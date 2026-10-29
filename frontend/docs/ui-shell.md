# Frontend — Routing, Shell, And UI Surfaces

> **LLM REFERENCE — terse by design.** Human tutorial: `docs/developer-guide/` (temporary). If the two disagree, the code wins; correct this file.

This file is the read-first map of routes, the root shell, navigation surfaces, modals, search, and rendering. It complements `stores.md`, `types.md`, and `flows.md`.

## Route Map

Router files: `frontend/src/router/index.ts`, `frontend/src/router/auth.ts`

### Guest Routes

- `/login`
- `/register` — only when `REGISTRATION_ENABLED === 'true'`
- `/reset-password-request`
- `/reset-password`

### Auth Routes

- `/verify-email` -> `VerifyEmailView`
- `/` -> `HomeView`
- `/profile` -> `UserProfileView`
- `/settings` -> `AppSettingsView`
- `/systems/:systemId` -> `SystemView`
- `/systems/:systemId/rule/:ruleId` -> `RuleDetailView`
- `/systems/:systemId/game-data/:gameDatumId` -> `GameDataView`

### Guard Behavior

- `requiresAuth` without `authStore.user` redirects to `login?redirect=<fullPath>` (online only).
- `requiresGuest` with `authStore.user` redirects to `home` (online only).
- When offline, an offline-first whitelist runs regardless of `authStore.user`: only `home` and a route with `meta.requiresSystemAccess === true` whose `systemId` is pinned (`cacheStore.isCached(systemId)`) are admitted. Every other route — guest auth screens, account screens, and uncached systems — redirects to `home`, the cached-systems landing page.
- Child routes (`system-rule`, `system-game-datum`) inherit `requiresSystemAccess` from the `system` route and read `to.params.systemId`, so cached systems remain browsable offline.
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

## Navigation And Reading UX

### Left Panel

Primary component: `frontend/src/components/systems/LeftPanelContent.vue`

- Tabs: rules tree, index, bookmarks, history. Unavailable bookmarks (target not in the current source) are disabled but can still be removed.
- Module expansion state lives in store state and local interaction.
- Width is resizable and persisted in localStorage.
- For `global_rule_numbers` systems (e.g. ASL), the rules tree renders as one flat list (`flatRootRules`) with no per-module headers; otherwise rules are nested under per-module headers.

### Center Content

- No child route: top-level TOC. Grouped by module, except for `global_rule_numbers` systems (e.g. ASL) where it renders one flat list. Release-status badges appear on flat (`global_rule_numbers`) TOC rows and left-panel module headers; per-module TOC rows have no badge.
- `/rule/:ruleId`: `RuleDetailView`.
- `/game-data/:gameDatumId`: `GameDataView` for tables and SOP content.

### Top Toolbar

Component: `frontend/src/components/systems/SystemHeader.vue`

- Module selector ("currently played") lives in the System ▾ menu, shown only when more than one non-core module exists; persists via `membershipStore.selectModule()`.
- Table Browser — opens `TableBrowserModal`.
- Super-Search — opens the global search overlay (`shortcutStore.overlayOpen`).
- Sequence of Play — opens `SopModal`.
- Inline tools (icon + `tool.id`) with a More-tools overflow, derived from `gameDataTools()`.
- Inline pinned-table bookmarks with a More-bookmarks overflow.
- System ▾ — active module (when >1 non-core), "Make available offline" toggle (`PinSystemControl`), exit system, manage members, broken links, proofread, profile, settings, logout.
- Right side: Draft/Release tabs, only when `canSwitchView && !offline`.

### Full-Screen Modals

The former right game-data drawer and bottom panel are replaced by full-screen modals (open/close state in the `gameDataModal` / `toolModal` stores):

- `SopModal.vue` (Sequence of Play) and `TableBrowserModal.vue` (tables) — backed by `gameDataModalStore`. The table browser lists all visible tables in the active set; each row can pin/unpin a `table` bookmark, and the toolbar "Table bookmarks ▾" lists pinned tables. While `VITE_FEATURE_ASL_TABLES` is off, ASL-kind tables are omitted from the list, stale selections render no table, pinned ASL bookmarks stay hidden, and ASL deep links report not found; the stored bookmarks are retained.
- `ToolModal.vue` — hosts unit data (`UnitDataTab`), Ordnance vs Armor (`OrdnanceVersusArmorTool`), and bespoke system tools in a full-screen dialog. Active tool + its internal store-backed state survive open → close → open. For the `bcs` system the bespoke tool is the Formation Manager.

## Search, Popups, And Content Rendering

### Content Tokens And Markdown

Renderer: `frontend/src/lib/renderContent.ts`

Text is strict Markdown (`markdown-it` with `html: false`). Raw HTML tags are escaped and shown as literal text; markdown-it validates link schemes, and the result is still sanitized by DOMPurify as defence-in-depth. `renderContent` defaults to inline mode (titles, labels, table cells); pass `{ block: true }` for rule content, index definitions/notes, and other block text.

Supported inline content tokens:

- `{{L:1.2}}` -> rule link by number
- `{{L:1.2#Custom label}}` -> labeled rule link
- `{{L:1.2-1.4}}` -> rule range link
- `{{L:core:3.4}}` -> rule link to a rule number in the module with slug `core`
- `{{A:TERM}}` -> acronym popup term
- `{{I:image-key}}` -> rule image from `/api/rules/images/{filename}`
- `<ex>...</ex>` -> example block markup
- `[color:red]...</color]` -> whitelisted color span (invalid names stay plain text)

### Rule Popup System

Files:

- `frontend/src/composables/useRuleDelegation.ts`
- `frontend/src/stores/interaction.ts`
- `frontend/src/components/RulePopupOverlay.vue`

Current behavior:

- Uses document-level event delegation rather than per-link listeners.
- Hovering rule-number links shows rule popup content (only on devices with hover support, per `matchMedia('(hover: hover)')`).
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
- SOP result -> navigate to `system-game-datum`
- Table result -> `gameDataModalStore.selectTable(id)` (opens the Table Browser); ASL-kind table results are hidden while `VITE_FEATURE_ASL_TABLES` is off
- Vehicle or ordnance result -> set `unitSelectionStore` pending unit and open the tool modal. While `VITE_FEATURE_AFV_VS_AFV` is off, ordnance opens Unit Data (`vehicle`) instead of the hidden Ordnance vs Armor tool; Unit Data still lists ordnance.

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
- `AppSettingsView` currently exposes two user settings:
  - acronym popups on or off
  - theme hue or preset

## Key Files

- Routing: `frontend/src/router/index.ts`, `frontend/src/router/auth.ts`
- Root shell: `frontend/src/App.vue`
- UI shell and guards: `frontend/src/components/systems/SystemHeader.vue`, `frontend/src/components/systems/PinSystemControl.vue`, `frontend/src/composables/useModalShortcutGuard.ts`
- Left panel: `frontend/src/components/systems/LeftPanelContent.vue`
- Search and popup behavior: `frontend/src/components/GlobalSearchOverlay.vue`, `frontend/src/composables/useRuleDelegation.ts`, `frontend/src/components/RulePopupOverlay.vue`, `frontend/src/stores/interaction.ts`, `frontend/src/lib/renderContent.ts`
- Game data surfaces and modals: `frontend/src/views/GameDataView.vue`, `frontend/src/components/game-data/SopModal.vue`, `frontend/src/components/game-data/TableBrowserModal.vue`, `frontend/src/components/ToolModal.vue`, `frontend/src/stores/gameDataModal.ts`, `frontend/src/stores/toolModal.ts`
- Tools: `frontend/src/lib/gameDataTools.ts`
- Rule editing and lint: `frontend/src/components/systems/DeleteRuleDialog.vue`, `frontend/src/components/systems/BrokenLinksDialog.vue`, `frontend/src/composables/useBrokenLinks.ts`
- Settings and theming: `frontend/src/stores/appSettings.ts`, `frontend/src/views/AppSettingsView.vue`
