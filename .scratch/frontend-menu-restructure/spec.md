# Spec: Frontend Menu Restructure

> Status: draft. Synthesised from design discussion (hand sketches + clarifications). Lives in the local markdown tracker. Dive deeper before splitting into tickets.

## Problem Statement

The current frontend collapses discovery, module selection, and reading into one flow. The home page has no real "Other Systems" — the systems index is membership-scoped, so the section is always empty — meaning a person cannot discover games that are actually playable before joining. There is also no presentation surface for non-members, no module-level destination, and no edit surfaces for system/module metadata (editing and membership management are buried in dialogs). Finally, joining a system and subscribing to a module are admin-only operations, so the paywalled onboarding the design implies cannot happen at all today.

Underneath this, the domain has a latent ambiguity: the importer allows systems with no core module (or with several). Every invariant in the app — membership auto-subscription, reading composition, shared game data, the system index — already assumes exactly one core. This work makes that invariant explicit.

## Solution

Restructure the navigation into a clear hierarchy with explicit, stable destinations:

- **Home** — "My Systems" (systems you hold a membership in) and "Other Systems" (systems whose core module is released, i.e. publicly available).
- **System Presentation View** — what a non-member sees: system metadata plus its modules and their release status, with a Join action.
- **System Detail View** — what a member sees: "My Modules" and "Other Modules", active-module highlighting, and admin/editor gears.
- **Module Detail View** — module metadata plus subscribe/unsubscribe.
- **Edit Module View** and **Edit System View** — edit metadata (name, description, image).
- A **second, discoverable systems endpoint** backs "Other Systems" and the Presentation View, without widening the membership-gated read policies.
- **Stubbed payments**: self-service Join/Subscribe/Unsubscribe that simulate a successful payment and write real entitlements, behind a flag, so onboarding works end-to-end and can later swap in a real payment integration.

Plus a foundational invariant: **every system has exactly one core module**, and a system is only publicly available once that core has a release.

Membership/Subscription Management View is deliberately parked.

## User Stories

### Core module invariant

1. As an operator, I want every system to have exactly one core module, so membership, composition, and shared content all have a stable anchor.
2. As an operator, I want the importer to synthesize an empty core when a manifest does not declare one, so I never have to hand-craft one.
3. As an operator, I want an import that declares more than one core to fail loudly, so corruption never lands silently.
4. As an operator, I want an empty core to be valid, because a system's content may live entirely in expansion modules while the core holds shared tools, game data, and the system index.
5. As an operator, I want existing systems without a core to be backfilled with an empty core, so the invariant holds everywhere.

### Discovery and Home

6. As a player, I want "My Systems" to list only systems I hold a membership in, so I can get back to what I play.
7. As a player, I want "Other Systems" to list only systems whose core has a release, so everything I see there is publicly available.
8. As an authenticated non-member, I want to see "Other Systems" on Home, so I can discover games before joining.
9. As a user, I want a system with releases on expansions but an unreleased core to stay out of "Other Systems", so a half-launched system is not discoverable.
10. As a user, I want "My Systems" and "Other Systems" visually separated, so membership status is obvious.
11. As a user, I want clicking a My System card to open that system's active reading workspace directly, so the common path is one click.
12. As a user, I want a gear on My System cards that opens the System Detail View, so I can reach the module list and admin actions without entering the reader.
13. As a user, I want clicking an Other System card to open its Presentation View, so I can evaluate it before joining.
14. As a user, I want the existing app-wide options and "+ New System" entry retained on Home.

### System Presentation View

15. As a visitor, I want to see a system's name, description, cover image, and module list with release status, so I can decide whether it is worth joining.
16. As a visitor, I want a Join action that simulates a successful payment and grants me membership, so I can onboard without waiting for an admin.
17. As a visitor who joins, I want to be auto-subscribed to the core module, so I can start reading immediately.
18. As a visitor, I want no editing affordances and no module content in the Presentation View, so the surface stays safe and read-only.
19. As a member, I want the Presentation View to remain reachable, so shared links still resolve sensibly.

### System Detail View

20. As a member, I want a "My Modules" section, so I can see the modules I am entitled to.
21. As a member, I want an "Other Modules" section, so I can see modules I could subscribe to.
22. As a member, I want active modules highlighted with a distinct border, so I understand what is currently composed into my reading view.
23. As a member, I want clicking a module card to open its Module Detail View.
24. As a member, I want the active-module selection here to match the reader's composition (core plus one, or core plus all), so the two surfaces never disagree.
25. As an editor or system admin, I want a gear on every module card I can edit, leading to Edit Module.
26. As an editor, I want that gear only on my editable modules, so I am not offered actions that will be refused.
27. As a system admin, I want a screen-level gear leading to Edit System.
28. As a system admin, I want to reach Membership Management from the system area (placement parked).

### Module Detail View

29. As a member, I want to see a module's name, description, image, author-provided metadata, and my subscription state.
30. As a non-subscriber, I want a Subscribe action that simulates a successful payment and grants me a subscription, so I can unlock the module.
31. As a non-member, I want Subscribe to route me through Join first, because a subscription requires membership.
32. As a subscriber, I want an Unsubscribe action for non-core modules.
33. As a subscriber, I understand the core module cannot be individually unsubscribed.
34. As a subscriber, I want my subscription changes reflected immediately across the app (access, module lists, active composition).

### Edit Module View

35. As an editor or system admin, I want to edit a module's name, description, and image, and save, with server-driven validation.
36. As an editor, I want Edit Module unavailable for modules I do not edit.
37. As an editor, I want image input validated as a URL, with clear errors.

### Edit System View

38. As a system admin, I want to edit a system's name, description, and image, and save.
39. As an editor, I do not want Edit System offered, because it is admin-only.
40. As a system admin, I want editing the system to preserve unrelated config values (rule-number strategy, TOC depth, proofread threshold).

### Cross-cutting

41. As any user, I want gears and edit actions gated by the server-provided permission map, never by raw role flags.
42. As a user on a pinned system, I want offline browsing of the reading workspace to keep working as it does today.
43. As a user, I want existing reading deep links to keep resolving.

## Implementation Decisions

### Core module invariant

- **Every system has exactly one core module.** This is enforced as a domain invariant and at the database level (one `is_core` row per `system_id`; MariaDB lacks partial indexes, so a generated column plus unique index is the likely mechanism).
- API-created systems already auto-create the core; keep that.
- The importer sets `is_core` from the manifest (`type: "core"`).
  - If the manifest declares **no** core, the importer **synthesizes an empty core** (slug `core`, name `Core`, `sort_order 0`, `is_core` true) and imports the system-level index into it. An empty core is valid.
  - If the manifest declares **more than one** core, the import **fails hard** (no partial write).
- Existing zero-core systems are backfilled with an empty core. Existing multi-core systems (if any) must be reconciled during migration.
- The frontend drops the `coreModule = is_core ?? modules[0]` fallback; core is guaranteed.
- The core is the shared-data anchor: `resolveGameDatum` resolves `[current module, core]`, and `singularModule` (SOP, system index) is `selected ?? core`. An empty core is where shared tools/tables/vehicles live.

### Public availability and releases

- A system is **publicly available** once its **core module has a released version**. An empty core may be released; that empty release is the explicit "go public" gate.
- A system whose expansions have releases but whose core has no release is **not** publicly available and does not appear in "Other Systems".
- Module-level release status remains visible in the Presentation and System Detail views.

### Discovery endpoint

- Add a new authenticated endpoint, `GET /api/systems/discoverable`, separate from the existing member-scoped `GET /api/systems`.
- It returns every system whose **core has a released version**, plus a per-system release summary (released module count, and which modules have releases) so Home can badge playability.
- The existing member-scoped `GET /api/systems` is unchanged.
- Home classifies client-side: `otherSystems = discoverable − member ids`.

### Presentation read access

- Add `GET /api/systems/{system}/presentation` for any authenticated user, returning only public presentation fields: system name/slug/description/cover image, and modules (name, slug, description, cover image, `is_core`, release status).
- Do **not** widen `SystemPolicy::view` or `ModulePolicy::view`; they remain membership-gated. The presentation endpoint is a dedicated, redacted read path.
- No permissions map, draft data, or module content is exposed through presentation.
- Module content remains subscription-gated through the existing content endpoints.

### Stubbed entitlement (payments)

- Gate self-service entitlement behind a `payments.stubbed`-style flag (off in production).
- **Self-join already works at the controller level**: `MembershipController@store` accepts an absent `user_id` as "the current user" and strips `admin` when self-adding. Only `MembershipPolicy::create` (system admin) blocks it, so the Join stub is a policy/flag change, not new controller logic.
- Self-subscribe: `POST /api/systems/{system}/modules/{module}/subscriptions`, reusing `SubscribeToModule` so core auto-subscription and config behaviour hold. Subscriptions are currently fully admin-only including delete, so this needs a new self-service action.
- Self-unsubscribe: `DELETE /api/systems/{system}/modules/{module}/subscriptions` for the current user's own subscription, reusing `UnsubscribeFromModule` so `selected_module_id` pruning holds. Core is not individually revocable.
- With the flag off, these return forbidden/not-found and the existing admin-only routes are unchanged.
- Frontend shows a simulated payment confirmation, calls the stub, then toasts "payment simulated". The stub is the swap point for a future real payment integration.

### Active modules

- Keep the current per-user semantics: core plus the selected module when `selected_module_id` is set, else core plus all viewable non-core modules.
- No system-level single-vs-multi policy in this work (parked, may be revisited).
- "Active" highlighting in System Detail reflects the composed active set; the active-set selector remains the same control used in the reader.

### Routing (durable)

- `/` — Home (My Systems / Other Systems).
- `/systems/:systemId` — reading workspace (unchanged) for members.
- `/systems/:systemId/presentation` — Presentation View (any authenticated user).
- `/systems/:systemId/details` — System Detail View (members).
- `/systems/:systemId/modules/:moduleId` — Module Detail View.
- `/systems/:systemId/modules/:moduleId/edit` — Edit Module View.
- `/systems/:systemId/edit` — Edit System View.
- A membership-management route is reserved but not implemented.
- Rationale: keeping the reader at the existing path preserves deep links and the offline/pin guard; meta views are siblings.

### Metadata and images

- System image lives at `systems.config.cover_image` (already present and validated, currently unused by the UI); Edit System activates it.
- Module image lives at `modules.config.cover_image`; module config is pass-through, so this needs validation and form wiring rather than a migration.
- Module name/description updates are authorized by module-update permission (system admin or that module's editor).
- System updates are admin-only and must resubmit the full config object (the update request resets omitted config keys to defaults).

### Permission gating

- System-level gear: `system.manage`. Module-level gear: `module.update`. Edit submissions still rely on backend policies as the authority.
- No new role vocabulary; use the existing permission map.

## Testing Decisions

- **Good tests** assert externally observable behaviour: HTTP responses, importer outcomes, and UI-visible states, not internal helpers.
- **Backend (Pest feature tests)**:
  - Core invariant: a system cannot gain a second core; importer synthesizes an empty core when the manifest lacks one; importer fails on duplicate core; backfilled systems have exactly one core.
  - Discovery endpoint: auth required; only systems whose core is released are returned; a system with released expansions but an unreleased core is excluded; payload includes release summary.
  - Presentation endpoint: allowed for non-members; redacts permissions/content; lists modules with release status; member path works.
  - Entitlement stubs: flag off forbids; flag on creates membership and core subscription; subscribe is idempotent and auto-subscribes core; non-member subscribe is rejected; unsubscribe removes a non-core subscription and prunes `selected_module_id`; core cannot be unsubscribed.
  - Module config image validation (nullable URL) on store/update; system image validation unchanged.
- **Frontend (Vitest)**:
  - Home split renders correct members vs discoverable sets, excluding systems without a released core.
  - Gears appear only with the relevant permissions.
  - Active-module border reflects the composed active set.
  - Presentation and Module Detail render metadata and release/subscription state.
  - Stub purchase flow reaches the success state and refreshes entitlement state.
- **Prior art**: existing Pest controller/policy feature tests and existing Vitest component/store tests.

## Out of Scope

- Real payment/checkout integration.
- System-level single-vs-multi active policy.
- Membership/Subscription Management View design and the placement of its entry button.
- Reading module content as a non-member.
- Invitations and public registration.
- Redesigning the reading workspace, search, or content rendering.

## Further Notes

- `UpdateSystemRequest` treats config as a whole-object write and resets omitted keys; Edit System must send the complete config.
- `cover_image` exists but is unused by the current UI; this work is its first consumer.
- The empty-core release is also the launch gate: releasing core is what publishes a system, which is a useful operational lever.
- MariaDB has no partial unique indexes; the one-core invariant needs a generated-column + unique-index approach or equivalent.

---

## Phased Plan

Each phase is a vertical slice through schema/API (where needed), UI, and tests, and is independently demoable.

### Phase 1: Core module invariant and public-release gate

**User stories**: 1–5, 9

**What to build**: Enforce exactly one core per system at the database level. Make the importer synthesize an empty core when a manifest declares none, and fail hard on multiple cores. Backfill existing zero-core systems. Drop the frontend `is_core ?? modules[0]` fallback. Establish that a system is publicly available only when its core has a release (no UI yet beyond the removed fallback).

**Acceptance criteria**
- [ ] A system cannot hold two core modules.
- [ ] Importing a manifest with no core creates one empty core and imports the system index into it.
- [ ] Importing a manifest with duplicate cores fails without partial writes.
- [ ] Existing zero-core systems are backfilled with an empty core.
- [ ] Frontend composition no longer relies on a first-module fallback.
- [ ] Tests cover the invariant, synthesis, hard failure, and backfill.

### Phase 2: Discoverable systems + Home split

**User stories**: 6–8, 10, 14

**What to build**: Add `GET /api/systems/discoverable` (systems whose core is released, with release summary). Home shows My Systems vs Other Systems from memberships + discoverable, excluding member systems from "Other" and excluding systems without a released core.

**Acceptance criteria**
- [ ] Discoverable endpoint requires auth and returns only systems with a released core, with a release summary.
- [ ] Home renders member systems and non-member discoverable systems in separate sections.
- [ ] A system with released expansions but an unreleased core never appears in "Other Systems".
- [ ] Tests cover endpoint filtering (core-released gate) and the Home split.

### Phase 3: Presentation View

**User stories**: 13, 15, 18, 19

**What to build**: Add `GET /api/systems/{system}/presentation` (redacted, any authenticated user) and the Presentation View at `/systems/:systemId/presentation`, showing metadata and modules with release status. Other System cards navigate here. No editing or content is exposed.

**Acceptance criteria**
- [ ] Non-members can load a system's presentation without gaining content access.
- [ ] Presentation lists modules with release status and does not leak permissions or content.
- [ ] Other System cards route to the Presentation View.
- [ ] Tests cover non-member access, redaction, and routing.

### Phase 4: Stubbed Join / Subscribe / Unsubscribe

**User stories**: 16, 17, 30–34

**What to build**: Flag-gated self-service join/subscribe/unsubscribe endpoints that reuse the existing entitlement actions, plus the simulated-payment UI in Presentation and Module Detail. Join is a policy/flag change because the controller already supports self-join. Onboarding works end-to-end with real entitlements written.

**Acceptance criteria**
- [ ] With the flag off, self-service endpoints are refused; admin-only behaviour is unchanged.
- [ ] Join creates membership and auto-subscribes core (idempotent).
- [ ] Subscribe grants the module and auto-subscribes core; idempotent.
- [ ] Unsubscribe removes a non-core subscription and prunes `selected_module_id`; core is not revocable.
- [ ] Frontend simulates payment, then reflects the new entitlement state.
- [ ] Tests cover flag on/off, idempotency, core rules, and pruning.

### Phase 5: System Detail View

**User stories**: 11, 12, 20–28

**What to build**: Add `/systems/:systemId/details` with My Modules / Other Modules, active-module highlighting from the composed active set, and permission-gated gears (screen-level for admins, per-card for admins/editors). My System gear navigates here; card click still opens the reader.

**Acceptance criteria**
- [ ] My/Other module sections render from subscriptions.
- [ ] Active modules are visually highlighted consistently with the reader.
- [ ] System gear appears only with `system.manage`; module gears only with `module.update`.
- [ ] Gear targets route to the edit views (stubs acceptable until Phase 7).
- [ ] Tests cover section rendering, highlighting, and permission-gated gears.

### Phase 6: Module Detail View

**User stories**: 23, 29, 30, 32, 33

**What to build**: Add `/systems/:systemId/modules/:moduleId` showing module metadata and subscription state, with Subscribe/Unsubscribe backed by the Phase 4 stubs and correct non-member routing through Join.

**Acceptance criteria**
- [ ] Module metadata and current subscription state render.
- [ ] Subscribe/Unsubscribe call the stubs and update state.
- [ ] Non-members are routed through Join before subscribing.
- [ ] Core shows as non-unsubscribable.
- [ ] Tests cover state rendering and the subscribe/unsubscribe transitions.

### Phase 7: Edit Module and Edit System

**User stories**: 35–40

**What to build**: Add `/systems/:systemId/modules/:moduleId/edit` and `/systems/:systemId/edit`, editing name/description/image with server-driven validation. Activate `cover_image` for both system and module config. Enforce `module.update` and admin-only system edits.

**Acceptance criteria**
- [ ] Edit Module saves name/description/image for admins and that module's editors only.
- [ ] Edit System saves name/description/image for admins only and preserves unrelated config keys.
- [ ] Invalid image URLs surface validation errors.
- [ ] Tests cover authorization, validation, and config preservation.

### Phase 8 (parked): Membership Management View

**User stories**: 28

**What to build**: Promote the existing membership dialog into a dedicated view and decide where its entry point lives. Not scheduled.
