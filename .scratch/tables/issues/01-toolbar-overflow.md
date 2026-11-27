# Toolbar overflow behavior

Status: needs-triage
Type: task

## Context

The top-bar button bar in `frontend/src/components/systems/SystemHeader.vue` is not working as expected. Layout and current behavior are described in `docs/reference/frontend/tables.md` §6.

## What was done

- `useToolbarOverflow` measures `containerRef.clientWidth` and collapses the rightmost tools/bookmarks into "More" dropdowns. Pure `computeOverflow` is unit-tested.
- In jsdom there is no layout (`clientWidth === 0`), so component-level tests can only assert structure, not overflow behavior.

## To re-examine

- Whether the `ResizeObserver` + `v-show` measurement approach behaves in a real browser.
- Whether icon-only buttons are clear enough; bookmark labels are raw slugs (`to-hit`, `leader-creation`). Abbreviations (`TH`, `TK`, `CC`, `IFT`) would need a `short_name` field on the table data.
- Tool labels show `tool.id` (`vehicle`, `ordnance`).
