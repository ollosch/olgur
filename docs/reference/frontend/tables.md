# ASL Tables

> **LLM REFERENCE — terse by design.** Human tutorial: `docs/developer-guide/`. If the two disagree, the code wins; correct this file.

Everything about the ASL **tables** and the **top bar / toolbar**.

## 1. The model in one paragraph

Tables are **`game_data` rows of `type = 'table'`** in the ASL **core** module (slug `core`). The backend stores data only; the frontend dispatches on `content.kind` to a renderer. The source data lives in `backend/data/asl/asl_tables.json` and is imported into the DB with `php artisan import:game data/asl --fresh`. Rule references inside table text use the app's `{{L:…}}` token system so they become hover/click popups.

## 2. Data flow & files

| Concern | Path |
|---|---|
| Source data (staged) | `backend/data/asl/asl_tables.json` — **gitignored**, not committed |
| Manifest key | `backend/data/asl/index.json` → `"tables": "asl_tables.json"` |
| Importer | `backend/app/Services/ModuleDataImporter.php` → `importTables()` |
| Import command | `backend/app/Console/Commands/ImportGame.php` (tables branch) |
| Import test | `backend/tests/Feature/Commands/ImportGameTest.php` |
| Generic renderers | `frontend/src/components/game-data/` |
| ASL renderers | `frontend/src/components/game-data/asl/` |
| Top bar | `frontend/src/components/systems/SystemHeader.vue` |

**Import command** (run inside the container):
```bash
docker exec olgur-workspace-1 php artisan import:game data/asl --fresh
```

Each entry in `asl_tables.json` is `{ "slug": string, "name": string, "content": <object> }`.
`importTables()` stores slug/name/content verbatim; `slug` is unique per `(module_id, type)`.

## 3. The 7 tables

`kind` → renderer, one entry per screen:

| slug | `content.kind` | component | notes |
|---|---|---|---|
| `ift` | `ift` | `asl/IftTable.vue` | IFT matrix (staggered header, FP cols × DR rows) + embedded `modifiers` (FP/DR) + `footnotes` |
| `cct` | `cct` | `asl/CctTable.vue` | odds × black/red kill numbers + embedded `modifiers` (CC DRM) |
| `ambush` | `modifier_list` | `ModifierList.vue` | single drm list (title = ambush condition) |
| `leader-creation` | `leader_creation` | `asl/LeaderCreationTable.vue` | dr→leader rows + embedded `modifiers` (drm) |
| `to-hit` | `to_hit` | `asl/ToHitTable.vue` | C3 matrix (black/red side-by-side) + `gun_ammo` (C4) + `firer_drm` (C5) + `target_drm` (C6) + `footnotes` |
| `to-kill` | `to_kill` | `asl/ToKillTable.vue` | **tabbed**: 4 tabs (ap / apcr_apds / heat / he_flame) + shared `modifiers` (C7.2) + `armor_factor` (AF) |
| `destruction` | `destruction` | `asl/DestructionTable.vue` | **tabbed**: 3 tabs (unarmored_vehicle / afv / gun) |

Dispatch lives in `TableBrowserModal.vue` (`TableContent` union + `v-else-if` on `kind`).

### Shape hints

- **One screen = matrix + its modifiers.** The modifiers are folded INTO the matrix record's `content` (a `modifiers: ModifierEntry[]` array), not separate records. `ModifierEntry = { label, value, effect_type?, effect_value?, tags, markers }`.
- **`to_kill` tab shape**: `{ id, label, table: { title, guns: GunEntry[], case_d: CaseD|null, unarmored, notes? } }`, plus top-level `modifiers` + `armor_factor`.
- **`destruction` tab shape**: `{ id, label, table: { title, attack_types, outcome_rows, cells, notes } }`. Cells may be `string` or `{ value, hull?, turret? }`.
- **Gun-size strings must stay verbatim** (`76LL`, `D76LL`, `@MG`, `ATR`, …) — they are the join key for the future calculator against `ordnance.csize` / `vehicle.ma`. Duplicated sizes (`76LL` ×2 in AP, `76L` ×3 in APCR) are intentional (differ by national note).

## 4. Rule-number convention

Compressed ASL refs → canonical dotted DB numbers:

`L<SEC>.<SUB>` → `L.<SEC>.<d1>.<d2>…`

- `L` = chapter letter (A–G, J, …).
- `<SEC>` = section before the first dot, kept as a multi-digit int (`11`, `23`, `24`).
- `<SUB>` = subsection after the dot, **split into single digits**.
- `C.7` / `C.4` style (dot right after letter) stays as-is.

Verified examples: `A5.12`→`A.5.1.2`, `A7.21`→`A.7.2.1`, `A11.501`→`A.11.5.0.1`, `A23.71`→`A.23.7.1`, `C3.71`→`C.3.7.1`, `C7.34`→`C.7.3.4`, `G1.64`→`G.1.6.4`, `J2.31`→`J.2.3.1`.

Verify each with:
```bash
docker exec olgur-workspace-1 php artisan tinker --execute 'echo \App\Models\Rule::where("number","C.3.7.1")->exists();'
```

## 5. Shared frontend infrastructure

| File | Purpose |
|---|---|
| `composables/useTableHighlight.ts` | row/column highlight (`cellState`, `cellClasses`, `rowHeaderClasses`, `colHeaderClasses`; cell full `bg-primary/30`, row/col attenuated `bg-primary/10`, header `bg-primary/15`). Hover + tap-to-toggle via `onCellEnter/Leave/Click`. |
| `composables/useToolbarOverflow.ts` | responsive toolbar overflow. Exports pure `computeOverflow(toolIds, bookmarkIds, toolWidths, bookmarkWidths, available)` + the `useToolbarOverflow` composable. |
| `game-data/AnnotationMarker.vue` | footnote marker `<sup :data-annotation="text">` → reuses the existing rule/acronym popup. |
| `lib/toKill.ts` | pure, no-Vue lookups for the AFV-vs-AFV calculator: `basicTk`, `caseDModifier`, `armorFactorAerial`, `unarmoredTk` (+ types `GunEntry`, `CaseD`, `AfValue`, `UnarmoredBand`). |
| `lib/gameDataTools.ts` | maps `game_data` type → tool component/label (`vehicle`/`ordnance` for ASL). |

**Popup mechanism (reused, do NOT add a new tooltip lib):** `stores/interaction.ts` (`PopupContent` union incl. `{ type:'annotation'; text }`), `composables/useRuleDelegation.ts` (document-level delegation on `[data-rule-number]`, `[data-rule-range]`, `[data-acronym-term]`, `[data-annotation]`), `components/RulePopupOverlay.vue` (renders by `content.type`).

## 6. Top bar layout

`SystemHeader.vue` layout (left→right):
1. Mobile sheet toggle + system name (links to root TOC).
2. **Button bar**: icon-only Tables / Search / SOP / System; tools (icon + short slug `tool.id`) and table bookmarks (icon + short slug) with two responsive overflow dropdowns.
3. Right: Draft/Release tabs.

The **active-module selector lives in the System ▾ menu** (top of the dropdown, shown only when >1 non-core module).

## 7. Conventions & gotchas

- Rule refs inside table text must be `{{L:<canonical>}}` (verified against the DB) so popups work.
- Tables must render with `overflow-x-auto` + `max-w-full` so only the table scrolls, not the page.
- `TableBrowserModal.vue` has a search box (filters by table name) and lists `type === 'table'`.
- Super-search (`GlobalSearchOverlay.vue`) shows a **Tables group first**; clicking opens the Table Browser via `gameDataModalStore.selectTable(id)`.
- **jsdom has no layout** (`clientWidth === 0`), so component-level tests can only assert structure, not overflow behavior. The pure `computeOverflow` is tested separately.
