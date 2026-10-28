# Frontend — Domain Types And Permissions

> **LLM REFERENCE — terse by design.** Human tutorial: `docs/developer-guide/` (temporary). If the two disagree, the code wins; correct this file.

This file is the read-first map of the API-facing types and the frontend's authorization vocabulary. It complements `stores.md`, `flows.md`, and `ui-shell.md`.

Source of truth for types: `frontend/src/types/domain.ts`.

## Domain Types Exposed To The Frontend

Main API-facing types:

- `User` includes `super_admin`.
- `SystemConfig` includes `global_rule_numbers`, `sort_rules_by`, `toc_depth`, `proofread_threshold`, and `cover_image`. When `global_rule_numbers` is true, bare `{{L:n}}` links resolve system-wide; otherwise they resolve in the module that owns the content. `proofread_threshold` is the number of distinct proofreaders required before an entity counts as proofread. `sort_rules_by` and `cover_image` are stored but unused by the current UI; `toc_depth` gates TOC vs full rule view.
- `ProofreadEntityType` (`rule` | `index_entry` | `game_datum`) and `ProofreadStatus` (`{ threshold, proofreads: Record<entity_id, { count, me }> }`) describe the proofread counter state.
- `MembershipConfig` includes optional `bookmarks` (`BookmarkEntry[]`, type `rule` | `table` | `unit`), `ignored_tags`, `bold_tags`, `preferred_rule_format`, and `selected_module_id` (`string | null`). The server also stores `acronym_popups`; the frontend type omits it. `Membership` does not expose `proofreader`, and `Module` does not expose `draft_revision`, even though both exist in the API/model layer.
- `Rule` has no `depth` property; depth lives separately in `contentStore.ruleDepths` (id → number).
- `GameDatum.type` is one of `sop`, `table`, `ordnance`, `vehicle`. The type selects the tool component (`sop` → SOP viewer, `table` → table renderer, `vehicle` → unit browser, `ordnance` → ordnance tool).
- `Rule`, `IndexEntry`, and `GameDatum` carry an optional stable reference to their original live entity — `rule_id`, `index_entry_id`, `game_datum_id` respectively — populated on released (snapshot) records so released content can be re-keyed to the live ids.
- `RuleDeletionMode` (`re_parent` | `recursive`) and `BrokenReference` describe the rule deletion operation and lint results.
- `ModuleDraftChange` is stale: the API returns `classification`, `content_before`, `content_after`, and `change_type: create | update | delete`; the current frontend type says `correction | update` and `description`. Use the API shape.
- `ManifestEntry.version_id`, `version_string`, `released_at`, and `content` are nullable in practice: unreleased modules return null (and revision 0).

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
