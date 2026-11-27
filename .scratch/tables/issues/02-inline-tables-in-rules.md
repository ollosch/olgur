# Inline tables inside rules

Status: needs-triage
Type: task

Inline tables such as A.11.4 Ambush are currently imported and rendered as inline `<table>` markup inside the rule.

## Proposed

Strip the inline table at import and store a `table_ref`, so the rule links to the canonical interactive table instead of duplicating it (single source of truth).

Not started.
