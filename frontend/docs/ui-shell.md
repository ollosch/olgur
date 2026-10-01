# Frontend — Routing, Shell, And UI Surfaces

This file is the read-first map of routes, the root shell, navigation surfaces, modals, search, and rendering. It complements `stores.md`, `types.md`, and `flows.md`.

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
- Table or SOP result -> navigate to `system-game-datum`
- Vehicle or ordnance result -> set `unitSelectionStore` pending unit and open the tool modal (`toolModalStore.open(item.type)`)

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

## Key Files

- Routing: `frontend/src/router/index.ts`, `frontend/src/router/auth.ts`
- Root shell: `frontend/src/App.vue`
- UI shell and guards: `frontend/src/components/systems/SystemHeader.vue`, `frontend/src/components/systems/PinSystemControl.vue`, `frontend/src/composables/useModalShortcutGuard.ts`
- Left panel: `frontend/src/components/systems/LeftPanelContent.vue`
- Search and popup behavior: `frontend/src/components/GlobalSearchOverlay.vue`, `frontend/src/composables/useRuleDelegation.ts`, `frontend/src/composables/useRulePopup.ts`, `frontend/src/stores/interaction.ts`, `frontend/src/lib/renderContent.ts`
- Game data surfaces and modals: `frontend/src/views/GameDataView.vue`, `frontend/src/components/game-data/SopModal.vue`, `frontend/src/components/game-data/TableBrowserModal.vue`, `frontend/src/components/ToolModal.vue`, `frontend/src/stores/gameDataModal.ts`, `frontend/src/stores/toolModal.ts`
- Tools: `frontend/src/lib/gameDataTools.ts`
- Rule editing and lint: `frontend/src/components/systems/DeleteRuleDialog.vue`, `frontend/src/components/systems/BrokenLinksDialog.vue`, `frontend/src/composables/useBrokenLinks.ts`
- Settings and theming: `frontend/src/stores/appSettings.ts`, `frontend/src/views/AppSettingsView.vue`
