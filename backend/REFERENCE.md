# Olgur Backend / API Reference

This file is the read-first map for `backend/`. It is meant to save an LLM from scanning the whole Laravel app before it can reason about the current domain model, access rules, and API shape.

## Snapshot
- Olgur is a Laravel 13 JSON API for managing tabletop and wargame reference content.
w- Top-level structure: `system -> modules -> rules / index entries / game data / published versions`.
- Registration is disabled during the private launch. A small, manually provisioned group receives administrator-granted memberships and subscriptions. Invitation-based onboarding is a future capability; public registration can be re-enabled when the system launches publicly.
- Administrators provision reviewer accounts manually. Reviewers establish their own password through the existing password-reset flow; passwords are not distributed by email.
- The Vue frontend uses cookie/session auth against this API.
- All first-class domain models use ULID primary keys and are returned through API resources under a top-level `data` key.

## Core Entities

### User

- Model: `backend/app/Models/User.php`
- Authenticated via Laravel session auth with Sanctum CSRF protection.
- `super_admin` is a global authorization bypass via `Gate::before()` in `backend/app/Providers/AppServiceProvider.php`.
- Has many `memberships` and `subscriptions`.

### System

- Model: `backend/app/Models/System.php`
- Top-level game/ruleset container. Contains only modules.
- Fields: `slug`, `name`, `description`, `config`.
- `config` is cast to `App\Data\SystemConfig`, not a raw array.
- Has many `modules` ordered by `sort_order` and many `memberships`.
- Helper methods: `isMember(User)`, `isAdmin(User)`.

### Module

- Model: `backend/app/Models/Module.php`
- Child container inside a system. Contains all game data (rules, index, gameData).
- Fields: `slug`, `name`, `description`, `config`, `is_core`, `sort_order`.
- Has many `subscriptions`, `rules`, `indexEntries`, `gameData`, and `versions`.
- Helper methods: `isSubscriber(User)`, `isEditor(User)`.
- Every system has exactly one core module (`is_core`); core modules are created unconditionally with the system and are immutable.
- First-class game-data accessors: `sop(): ?GameDatum`, `tables(): Collection` (keyed by `slug`), and `resolveGameDatum(type, slug): ?GameDatum` (resolves in `[current module, core]` order — current module wins).

### Membership

- Model: `backend/app/Models/Membership.php`
- Join table between `users` and `systems`.
- Fields: `admin`, `proofreader`, `config`.
- `admin` means system-level admin rights including membership management. Can create, modify and delete modules and their contents. Can send invites.
- `proofreader` marks the member as a proofreader for the system; they may record proofreads against content they can view (see `content.proofread`).
- System administrators are co-owners: they may manage the system, its access, and its content. There is no separate non-delegable owner role; `super_admin` is the operational recovery authority.
- `config` stores per-user, per-system runtime state such as bookmarks and reading preferences.
- Membership grants access to a system and lets members browse its module metadata. Subscriptions control module content access; system admins also have access to all module content.

### Subscription

- Model: `backend/app/Models/Subscription.php`
- Join table between `users` and `modules`.
- Field: `editor`.
- `editor` means create, modify and delete access for module content but not for the module itself.
- A membership alone does not grant module content access; the user must also hold a subscription for that module unless they are a system admin.
- Core subscription is always automatic: creating a membership or subscribing to any expansion auto-subscribes the user to core. Core subscriptions are never individually revocable; they are removed only atomically with the membership. The core subscription's `editor` flag is the "core editor" marker.

### Rule

- Model: `backend/app/Models/Rule.php`
- Hierarchical rule tree inside a module.
- Fields: `number`, `title`, `content`, `sort_order`, `parent_id`.
- Parent and child rules stay inside the same module.
- DB uniqueness is module-local; cross-module uniqueness is enforced in request validation when required.

### IndexEntry

- Model: `backend/app/Models/IndexEntry.php`
- Hierarchical glossary or index tree inside a module.
- Fields: `term`, `definition`, `notes`, `relations`, `parent_id`.
- `relations` holds cross-references such as `rule_refs` and `see_also`.

### GameDatum

- Model: `backend/app/Models/GameDatum.php`
- Structured non-rule content attached to a module.
- Enum types: `sop`, `table`, `ordnance`, `vehicle`. The type drives which frontend component renders the data (`sop` → SOP viewer, `table` → table renderer, `vehicle` → unit browser, `ordnance` → ordnance tool); the backend stores data only and knows nothing about tools.
- Fields: `type`, `slug`, `name`, `content`.
- `slug` is unique per `module_id + type`.
- A module has at most one `sop` row (enforced in `StoreGameDatumRequest` / `UpdateGameDatumRequest`).

### Proofread

- Model: `backend/app/Models/Proofread.php`
- Records that a user has proofread a content entity in a system; drives the per-entity proofread counter.
- Fields: `user_id`, `system_id`, `entity_type`, `entity_id` (ULID `id` primary key, plus timestamps).
- `entity_type` is one of `rule`, `index_entry`, `game_datum` (`Proofread::ENTITY_TYPES`); `entity_id` is the ULID of the target entity. The pair is polymorphic — there is no foreign key on `entity_id`.
- Unique on `(user_id, entity_type, entity_id)`, so a user's proofread of an entity is idempotent (`firstOrCreate`).
- `resolveEntity(entityType, entityId)` resolves the target to a `Rule`, `IndexEntry`, or `GameDatum`.
- Rows cascade-delete with their user or system.

### ModuleVersion And Snapshot Tables

- Models: `backend/app/Models/ModuleVersion.php`, `RuleVersion.php`, `IndexEntryVersion.php`, `GameDatumVersion.php`
- `ModuleVersion` is a released snapshot of ONE module. System admins and that module's editors may publish it.
- Publishing copies respective live `rules`, `index_entries`, and `game_data` into version tables. It does not create static exports.
- Only a module's latest released snapshot may receive constrained back-edits for typo-level corrections; the backend enforces this invariant. System admins and that module's editors may amend it. Each request updates one snapshot record atomically and includes the expected snapshot `revision`; a conflict requires the editor to reload before retrying. Publishing immediately makes the new snapshot the sole back-edit target and all earlier snapshots non-editable. Back-edits may change reader-facing text or content data in existing snapshot records, but never their tree structure, identifiers, or references. They create no amendment history or public changelog for now; each increments the snapshot's opaque `revision` cache revision. The frontend's optional draft port is a separate explicit update.
- Snapshot records use fresh ULIDs and preserve tree structure through remapped parent IDs.
- Live editing creates an append-only, editor-only draft change log for rules, index entries, and game data. Each entry captures the affected record, before and after values, author, timestamp, and an editor-selected `semantic` or `typo` classification. Editors may reclassify changes before publishing. Publishing retains the entries as editor-only provenance linked to the resulting version; subsequent live changes form the next draft cycle. Module metadata is outside this workflow for now.
- Publishing creates the snapshot from all live changes since the prior release. Semantic draft changes are squashed into one group per affected rule, index entry, or game datum based on that record's final live state; the publisher retains the complete draft history as context and writes one public release note per group, stored with that `ModuleVersion`. Typo changes are released but excluded from player-facing notes.
- A publish containing only typo-classified changes may have no public release notes.
- Publishing uses optimistic concurrency: the publisher submits the draft revision they reviewed, and the backend rejects the publish when later live changes have advanced that revision.
- Content source is selected per module: system admins always load live content; a module editor loads live content only for modules they may edit; subscribers otherwise load the module's latest released snapshot. A module without a snapshot is unavailable to players.
- Released-content endpoints use Laravel caching keyed by module-version ID, its `revision`, and content kind. The manifest includes `?rev=<revision>` on released-content URLs, so a back-edit's revision increment bypasses stale browser and server cache entries without changing `version_string`.
- The versioned content endpoint paths remain `/versions/{version}/rules`, `/versions/{version}/index`, and `/versions/{version}/game-data`; their implementation reads snapshot tables rather than static files.

### Tools

The backend no longer knows about tools. There is no module tool registry, no tool-declaration validation, and no `tools` field on modules. Tools are pure frontend components, selected by the `type` of `game_data` present in a module: `sop` → SOP viewer, `table` → table renderer, `vehicle` → unit browser, `ordnance` → ordnance tool. The backend stores data only. A bespoke tool with no data type is wired frontend-side via a single `systemSlug → component` entry, not a registry.

## System Config

Source of truth: `backend/app/Data/SystemConfig.php`

Stored in `systems.config` and serialized to the API as a plain object.

| Key | Type | Meaning |
|---|---|---|
| `global_rule_numbers` | `boolean` | Whether rule numbers are unique system-wide (`true`, e.g. ASL) or module-local (`false`, e.g. BCS) |
| `sort_rules_by` | `number \| sort_order` | Display ordering hint |
| `toc_depth` | `int` | Table-of-contents depth hint |
| `proofread_threshold` | `int` | Number of distinct proofreaders required before an entity is considered proofread (default `3`) |
| `cover_image` | `string \| null` | Display-only cover image URL |

### Important Notes

- `SystemConfig::hasGlobalRuleNumbers()` is the only place that derives cross-module rule-number uniqueness. When `true`, bare `{{L:n}}` links resolve system-wide and all entitled modules merge into one rulespace; when `false`, numbers are module-local and bare links resolve in the module that owns the content.
- Every system creates exactly one core module with the system. A module's core status is immutable and its core module cannot be deleted.
- `StoreSystemRequest` validates the full config object on create. `global_rule_numbers` is immutable after creation.
- `UpdateSystemRequest` validates only editable fields; `SystemConfig::fromArray()` fills missing keys with defaults. Treat config updates as whole-object writes, not partial patches.

## Membership Config

Current shape in `memberships.config`:

| Key | Type | Meaning |
|---|---|---|
| `bookmarks` | `{ type: 'rule', id: string }[]` | Frontend bookmarks stored per system |
| `ignored_tags` | `string[]` | SOP topic tags the player has hidden |
| `preferred_rule_format` | `'content' \| 'markdown'` | The reader's preferred rule display format |

Important current behavior:

- `PATCH /api/me/memberships/{system}` replaces the stored config with the submitted object.
- There is no stored module activation or SOP selection: a subscriber reads every module they are subscribed to, and the SOP shown is the core's (or the currently navigated module's if it provides one).

## Current Business Rules

### System Creation

- Controller: `backend/app/Http/Controllers/SystemController.php`
- Any authenticated user can create a system.
- Creator gets an admin membership automatically.
- Every system auto-creates exactly one core module named `Core` with slug `core` and `sort_order = 0`.
- Creator is auto-subscribed to that auto-created core module as an editor.

### Module Creation

- Controller: `backend/app/Http/Controllers/ModuleController.php`
- Only system admins can create modules.
- Creator is ensured to be a system member.
- Creator is auto-subscribed to the new module as an editor.
- This bypasses `SubscribeToModule` so module creation is not blocked by structure prerequisites.

### Granting A Module Subscription

Action: `backend/app/Actions/SubscribeToModule.php`

- A system administrator grants subscriptions to members. Subscriptions are durable entitlements, later grantable by payment integration; users cannot self-subscribe or remove their own subscriptions.
- Removing a membership atomically revokes all of that user's subscriptions in the system and deletes its membership-scoped configuration, including bookmarks.
- Core is always automatic: subscribing to any expansion (or creating a membership) auto-subscribes the user to the core module if one exists.
- Uses `firstOrCreate`, so the action is effectively idempotent.

### Unsubscribing From A Module

Action: `backend/app/Actions/UnsubscribeFromModule.php`

- Deletes the `Subscription` record only when an administrator or future payment integration revokes the entitlement.
- Core subscriptions are never individually revocable; they are removed only atomically with the membership.

### Module Entitlement

There is no runtime module activation. "Entitled to read" is purely subscription (or admin/editor). A subscriber reads every module they are subscribed to; which module is on screen is navigation state (URL/route), not stored state.

### Rule Number Uniqueness

Source: `backend/app/Http/Requests/StoreRuleRequest.php`

- DB constraint: unique per module.
- Additional validation: unique across sibling modules in the same system only when `SystemConfig::hasGlobalRuleNumbers()` returns true. `global_rule_numbers` systems (e.g. ASL) require system-wide uniqueness; otherwise numbers are unique only within each module.

### Deleting A Rule

Endpoint: `DELETE /api/systems/{system}/modules/{module}/rules/{rule}` (optional body `{ mode?, classification? }`)

- Action: `backend/app/Actions/DeleteRule.php`. `mode` is `re_parent` (default) or `recursive`.
- `re_parent` moves direct children's `parent_id` to the deleted rule's parent; `recursive` deletes the whole subtree.
- Records each mutation via `RecordDraftChange`.

### Broken-Link Lint

- Service: `backend/app/Services/BrokenLinkLinter.php` (pure, deterministic, no DB access).
- Reports dangling references: bare `{{L:n}}`, qualified `{{L:slug:n}}`, ranges, and `index_entries.relations.rule_refs` that do not resolve.
- Exposed via `GET /api/systems/{system}/lint` (authorized for system admin or any module editor) and the `php artisan lint:broken-links {system}` command.
- Not yet wired as a non-blocking warning into publish.
  
### Published Versions

Action: `backend/app/Actions/PublishModuleVersion.php`

- Runs inside a DB transaction.
- Creates one `module_versions` row.
- Copies rules, index entries, and game data into their version tables.

### Importing External Data

Command: `backend/app/Console/Commands/ImportGame.php`

- Imports a system from a directory containing `index.json`.
- Can create or update the system and its modules.
- Imports rules per module.
- Imports the system-level index into the core module.
- Imports `vehicles`, `ordnance`, and `sop` into the core module when present. SOP source data must follow the standard SOP schema used by the frontend viewer.
- Can optionally grant an existing user system-admin status and editor subscriptions to all modules.
- JSON reader tolerates line comments, block comments, and trailing commas left behind by commented-out lines.

## Auth And Authorization

### Auth Shape

- Routes live in `backend/routes/auth.php`.
- Login, register, logout, forgot-password, reset-password use standard Laravel session auth.
- Verification routes use `auth:sanctum` plus signed and throttled middleware.
- The main API group in `backend/routes/web.php` uses `auth` middleware.
- The only API route outside auth is `GET /api/rules/images/{filename}`.

### Authorization Summary

`super_admin` bypasses all checks globally. Do not duplicate that logic inside policies.

| Resource | View | Mutate |
|---|---|---|
| System | authenticated player when it has a released version; system editor or admin when it has none | create: any authenticated user; update/delete: system admin |
| Module | authenticated player when its system has a released version; system editor or admin when it has none | create/delete: system admin; update: system admin or module editor |
| Rule | module subscriber or system admin | module editor or system admin |
| IndexEntry | module subscriber or system admin | module editor or system admin |
| GameDatum | module subscriber or system admin | module editor or system admin |
| Membership | list: system admin | create/update/delete: system admin |
| Subscription | list module subscriptions: system admin or module editor | create/update/delete: system admin; future payment integration may grant or revoke entitlements |
| ModuleVersion | module subscriber or system admin | publish: system admin or module editor |
| Proofread | list: system admin or proofreader | create: system admin or proofreader (who can view the target entity's module); delete: the proofread's owner only |

Important policy files:

- `backend/app/Policies/SystemPolicy.php`
- `backend/app/Policies/ModulePolicy.php`
- `backend/app/Policies/RulePolicy.php`
- `backend/app/Policies/IndexEntryPolicy.php`
- `backend/app/Policies/GameDatumPolicy.php`
- `backend/app/Policies/MembershipPolicy.php`
- `backend/app/Policies/SubscriptionPolicy.php`
- `backend/app/Policies/ModuleVersionPolicy.php`
- `backend/app/Policies/ProofreadPolicy.php`

The current-user permission map exposed to the frontend is computed by `backend/app/Services/PermissionMap.php`. `PermissionMap::module()` projects `content.proofread` as `isAdmin || isProofreader`; super_admins get all module permissions. Backend policies remain the authoritative enforcement.

## API Shape

Route file: `backend/routes/web.php`

All application routes live under `/api`. Nested resources use `Route::scopeBindings()`.

### Me Endpoints

- `GET /api/me`
- `PATCH /api/me`
- `GET /api/me/memberships`
- `GET /api/me/subscriptions`
- `PATCH /api/me/memberships/{system}`

### System And Module Endpoints

- `apiResource('systems', ...)`
- `apiResource('systems.memberships', ...)` except `show`
- `apiResource('systems.modules', ...)`
- `GET /api/systems/{system}/manifest`
- `GET /api/systems/{system}/lint`

### Content Endpoints

- `apiResource('systems.modules.rules', ...)`
- `apiResource('systems.modules.index-entries', ...)`
- `apiResource('systems.modules.game-data', ...)`
- `apiResource('systems.modules.subscriptions', ...)` except `show`

### Version Endpoints

- `GET /api/systems/{system}/modules/{module}/versions`
- `POST /api/systems/{system}/modules/{module}/versions`
- `PATCH /api/systems/{system}/modules/{module}/versions/{version}/amend`
- `GET /api/systems/{system}/modules/{module}/versions/{version}/rules`
- `GET /api/systems/{system}/modules/{module}/versions/{version}/index`
- `GET /api/systems/{system}/modules/{module}/versions/{version}/game-data`
- `GET /api/systems/{system}/modules/{module}/draft-changes`
- `PATCH /api/systems/{system}/modules/{module}/draft-changes/{draftChange}`

### Proofread Endpoints

- `GET /api/systems/{system}/proofreads` — returns `{ threshold, proofreads }`, the system's proofread status map (authorized for system admin or proofreader).
- `POST /api/systems/{system}/proofreads` — body `{ entity_type, entity_id }`; records the current user's proofread of an entity (idempotent). Returns the updated status map with `201`.
- `DELETE /api/systems/{system}/proofreads/{entity_type}/{entity_id}` — removes the current user's own proofread of an entity (`204`). `entity_type`/`entity_id` are carried in the route, not the body.

## Architectural Conventions

- Controllers are intentionally thin.
- Business rules live in actions, form requests, and policies.
- API serialization lives in `backend/app/Http/Resources`.
- All domain models are `final` and use `HasUlids`.
- `SystemConfig` is the typed source of truth for `systems.config`.
- Tree structures exist in both live and versioned forms for rules and index entries.
- There are no custom app jobs, events, or listeners defining core domain behavior right now.

## Current Non-Obvious Truths

- `SystemManifestController` returns the latest released snapshot metadata and cached versioned API URLs for rules, index entries, and game data. It no longer refers to static files.
- Version visibility is selected per module: system admins and a module's editors load its live records; subscribers load its latest released snapshot. Publishing, draft history, public release notes, and constrained latest-snapshot back-edits follow the versioning workflow above.
- Module-version routes expose only the version list and publish operations. There is no standalone version `show` route; versioned content uses the dedicated rules, index, and game-data endpoints.
- Content access is determined per module. System admins have all module permissions; module editors load and edit live content only for their editable module; other subscribers load its latest released snapshot. Content is denied without a subscription, and a module without a released snapshot is unavailable to non-editors. The API returns computed current-user permissions per module for frontend action gating; backend policies remain authoritative.

## Read These Files First

- Systems and config: `backend/app/Models/System.php`, `backend/app/Data/SystemConfig.php`, `backend/app/Http/Requests/StoreSystemRequest.php`, `backend/app/Http/Requests/UpdateSystemRequest.php`
- Modules and subscriptions: `backend/app/Models/Module.php`, `backend/app/Actions/SubscribeToModule.php`, `backend/app/Actions/UnsubscribeFromModule.php`, `backend/app/Http/Controllers/ModuleController.php`
- Rules and numbering: `backend/app/Models/Rule.php`, `backend/app/Http/Requests/StoreRuleRequest.php`, `backend/app/Http/Controllers/RuleController.php`, `backend/app/Actions/DeleteRule.php`, `backend/app/Services/RuleReferenceParser.php`
- Index and game data: `backend/app/Models/IndexEntry.php`, `backend/app/Models/GameDatum.php`, `backend/app/Http/Controllers/IndexEntryController.php`, `backend/app/Http/Controllers/GameDatumController.php`
- Broken-link lint: `backend/app/Services/BrokenLinkLinter.php`, `backend/app/Actions/ScanBrokenLinks.php`, `backend/app/Http/Controllers/SystemLintController.php`, `backend/app/Console/Commands/LintBrokenLinks.php`
- Versions and export: `backend/app/Actions/PublishModuleVersion.php`, `backend/app/Actions/ApplyModuleVersionBackEdit.php`, `backend/app/Services/ModuleVersionContent.php`, `backend/app/Http/Controllers/ModuleVersionController.php`, `backend/app/Http/Controllers/ModuleVersionContentController.php`, `backend/app/Http/Controllers/SystemManifestController.php`
- Auth and current user: `backend/routes/auth.php`, `backend/app/Http/Controllers/MeController.php`, `backend/app/Providers/AppServiceProvider.php`
- Proofreads: `backend/app/Models/Proofread.php`, `backend/app/Http/Controllers/ProofreadController.php`, `backend/app/Http/Requests/StoreProofreadRequest.php`, `backend/app/Http/Requests/DeleteProofreadRequest.php`, `backend/app/Policies/ProofreadPolicy.php`
- Import pipeline: `backend/app/Console/Commands/ImportGame.php`, `backend/app/Services/ModuleDataImporter.php`
