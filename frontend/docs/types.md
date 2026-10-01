# Frontend — Domain Types And Permissions

This file is the read-first map of the API-facing types and the frontend's authorization vocabulary. It complements `stores.md`, `flows.md`, and `ui-shell.md`.

Source of truth for types: `frontend/src/types/domain.ts`.

## Domain Types Exposed To The Frontend

Main API-facing types:

- `User` includes `super_admin`.
- `SystemConfig` includes `global_rule_numbers`, `sort_rules_by`, `toc_depth`, `proofread_threshold`, and `cover_image`. When `global_rule_numbers` is true, bare `{{L:n}}` links resolve system-wide; otherwise they resolve in the module that owns the content. `proofread_threshold` is the number of distinct proofreaders required before an entity counts as proofread.
- `ProofreadEntityType` (`rule` | `index_entry` | `game_datum`) and `ProofreadStatus` (`{ threshold, proofreads: Record<entity_id, { count, me }> }`) describe the proofread counter state.
- `MembershipConfig` includes optional `bookmarks` (`BookmarkEntry[]`, type `rule` | `table` | `unit`), `ignored_tags`, `bold_tags`, `preferred_rule_format`, and `selected_module_id` (`string | null`).
- `Rule` has a client-calculated `depth` field.
- `GameDatum.type` is one of `sop`, `table`, `ordnance`, `vehicle`. The type selects the tool component (`sop` → SOP viewer, `table` → table renderer, `vehicle` → unit browser, `ordnance` → ordnance tool).
- `Rule`, `IndexEntry`, and `GameDatum` carry an optional stable reference to their original live entity — `rule_id`, `index_entry_id`, `game_datum_id` respectively — populated on released (snapshot) records so released content can be re-keyed to the live ids.
- `RuleDeletionMode` (`re_parent` | `recursive`) and `BrokenReference` describe the rule deletion operation and lint results.

## Authorization And UI Responsibilities

### Frontend Authorization Helper

File: `frontend/src/composables/useAuthorization.ts`

The API supplies a computed current-user permission map for each module. The frontend uses these named permissions only to gate actions and choose each module's content source; it must not derive permissions from `super_admin`, membership `admin`, or subscription `editor` flags.

- Backend policies resolve permissions from the existing role facts and remain authoritative for every request.
- No role or permission database tables are needed.
- Permission vocabulary: `system.manage`, `membership.manage`, `module.create`, `module.update`, `module.delete`, `content.view_live`, `content.view_released`, `content.edit`, `content.proofread`, `version.publish`, `version.amend_latest`, `subscription.manage`.
- Module permission maps may be absent/null (e.g. before a module's permissions load); consumers null-guard `module.permissions` (`module.permissions?.['content.view_released']`) rather than assuming the object exists.

The backend remains the source of truth for actual authorization. The frontend only mirrors or smooths some flows.

## Key Files

- Types: `frontend/src/types/domain.ts`
- Authorization helper: `frontend/src/composables/useAuthorization.ts`
