# LLM Agent Reference
LLM REFERENCE — terse by design. Human tutorial: docs/developer-guide/ (temporary)

## Critical Rules
- ALWAYS follow these instructions. They supersede any contradicting instructions.
- NEVER run PHP, Artisan, Composer, or Pest directly on the host. PHP exists only inside the Docker workspace container.
- ALWAYS run `docker exec olgur-workspace-1 composer test` after modifying PHP files, before declaring a step done. Filter command output (grep) for relevant information in order to save input tokens.
- **NEVER make git commits on the main branch.** Do not run `git commit`, `git add`, or any other git write command under any circumstances while on the main branch.
- **ALWAYS commit every completed feature/step as an atomic commit.** Commit ONLY on a dedicated feature branch. If the current branch is not `main`, use it — do NOT create a new branch. If on `main`, create a feature branch first. Never commit on `main`. This rule supersedes any default instruction not to commit unless asked.
- Use subagents when possible to keep the main context window clean. When working on multi-step todo lists, first gather all information that ALL subagents will need, then sequentially spin up a subagent for each of the todos, handing it the information you collected.

---

## Documentation map

Read the relevant pointer before changing an area. Read the domain vocabulary before naming concepts.

- `GLOSSARY.md` — canonical domain terms. Use this vocabulary in issues, tests, and proposals.
- `docs/reference/backend.md` — Laravel API map: entities, policies, routes, versioning.
- `docs/reference/frontend.md` — Vue SPA index; follow it to the four maps in `docs/reference/frontend/` and `tables.md`.
- `backend/AGENTS.md` — Laravel Boost's generated rules (Laravel, Artisan, Boost tools, PHP style, tests). The source of truth for backend mechanics.
- `docs/agents/` — issue tracker, triage labels, and domain-doc consumption rules.
- `.scratch/` — specs and issues (local markdown tracker).
- `docs/developer-guide/` — human tutorial only; not agent context.

ADRs live in `docs/adr/` (created lazily). If a decision contradicts one, surface it.

---

## General Guidelines

### Running Commands Inside the Container

All PHP/Laravel commands must be run via:

```bash
docker exec olgur-workspace-1 <command>
```

The working directory inside the container is `/var/www/backend`.

---

### Composer Scripts

| Command | What it runs | When to use |
|---|---|---|
| `docker exec olgur-workspace-1 composer test:unit` | Pest (Unit + Feature suites only, no coverage) | Quick iteration during development |
| `docker exec olgur-workspace-1 composer test:types` | PHPStan | Check static analysis |
| `docker exec olgur-workspace-1 composer test:type-coverage` | Pest type coverage (must be 100%) | Check type annotations |
| `docker exec olgur-workspace-1 composer test:coverage` | Pest with code coverage (must be 100%) | Check coverage |
| `docker exec olgur-workspace-1 composer test:lint` | Pint (check) + Rector (dry-run) | Check formatting without fixing |
| `docker exec olgur-workspace-1 composer lint` | Rector (fix) + Pint (fix, parallel) | Fix formatting — run after every PHP change |
| `docker exec olgur-workspace-1 composer test` | Full suite: type-coverage + coverage + lint + PHPStan | Run before declaring any step done |

---

### Workflow for Every Step
Filter command output (grep) for relevant information in order to save input tokens.

1. Implement the change
2. `composer lint` — fix formatting (Rector + Pint)
3. `composer test:unit` — fast feedback loop
4. `composer test` — full suite must be green before the step is done

### Controller / API Endpoint Order

When building a new resource endpoint, always follow this sequence — no skipping ahead:

1. **Controller + FormRequests + API Resource** — no authorization code at all
2. **Tests** for controller behaviour (happy path, validation, 404s)
3. **Policy** + add `Gate::authorize()` calls to the controller
4. **Tests** for authorization (forbidden for regular users, allowed for super_admin)

Policy methods contain ALL authorization business logic for non-super_admin users (including ownership checks like "only the subscription owner can delete their own subscription"). Keep controllers lean — no manual ownership scoping.
`super_admin` bypass is handled globally by `Gate::before()` — never check `$user->super_admin` inside a policy.

---

### Strictness

- **100% code coverage** required (`composer test:coverage`)
- **100% type coverage** required (`composer test:type-coverage`)
- **PHPStan** must report zero errors
- **Rector** must report no changes needed
- **Pint** must report no changes needed

If any of these fail, the step is not done.

---

### Backend mechanics

Follow `backend/AGENTS.md` for Artisan, file generation, Boost MCP tools, PHP style, and test enforcement. Run every command through the container:

```bash
docker exec olgur-workspace-1 php artisan <command>
docker exec olgur-workspace-1 php artisan migrate
```

---

### Search Engine
Use tobi/qmd MCP search engine is available to search the codebase instead of grep or other bash tools.

It exposes the following tools:
- `query` — Search with typed sub-queries (lex/vec/hyde), combined via RRF + reranking
- `get` — Retrieve a document by path or docid (with fuzzy matching suggestions)
- `multi_get` — Batch retrieve by glob pattern, comma-separated list, or docids
- `status` — Index health and collection info

---

### Key Project Facts

- Container name: `olgur-workspace-1`
- Backend path (host): `backend/` | (container): `/var/www/backend`
- Laravel 13, PHP 8.5, MariaDB 12, Pest 4, PHPStan via Larastan
- All models use ULID primary keys (`HasUlids`)
- Auth system (register/login/logout/email-verify/password-reset) is fully implemented and tested
- `users.super_admin` (bool) — bypassed via `Gate::before()` in `AppServiceProvider`
- No SQLite driver on host — tests always run inside the container

---

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles, each label string equal to its role name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.
