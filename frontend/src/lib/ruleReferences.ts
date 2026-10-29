import type { Module, Rule } from '@/types/domain'

export interface ParsedRuleReference {
  moduleSlug?: string
  number: string
}

/**
 * Split an optional `slug:` prefix off a stored rule reference.
 *
 * Stored refs are bare (`1.2`) or module-qualified (`o:O.5.1`) on systems whose
 * rule numbers are not global. Rule numbers themselves never contain a colon.
 */
export function parseRuleReference(ref: string): ParsedRuleReference {
  const trimmed = ref.trim()
  const colon = trimmed.indexOf(':')
  if (colon <= 0) return { number: trimmed }
  return {
    moduleSlug: trimmed.slice(0, colon),
    number: trimmed.slice(colon + 1).trim(),
  }
}

export interface ParsedRuleRange {
  from: string
  to: string
}

/**
 * Split a range reference into its two endpoints, re-applying a prefix found on
 * the whole range to endpoints that do not carry one. Returns null for a single
 * (non-range) reference.
 */
export function parseRuleRange(range: string): ParsedRuleRange | null {
  const parsed = parseRuleReference(range)
  const separator = parsed.number.indexOf('-')
  if (separator === -1) return null

  let from = parsed.number.slice(0, separator).trim()
  let to = parsed.number.slice(separator + 1).trim()

  if (parsed.moduleSlug) {
    if (!from.includes(':')) from = `${parsed.moduleSlug}:${from}`
    if (!to.includes(':')) to = `${parsed.moduleSlug}:${to}`
  }

  return { from, to }
}

export function isRuleRangeReference(ref: string): boolean {
  return parseRuleRange(ref) !== null
}

/**
 * The reader-facing form of a stored reference: module prefixes are stripped
 * from each endpoint. Navigation keeps using the original stored value.
 */
export function displayRuleReference(ref: string): string {
  const range = parseRuleRange(ref)
  if (range) {
    return `${parseRuleReference(range.from).number}-${parseRuleReference(range.to).number}`
  }
  return parseRuleReference(ref).number
}

export interface FormatRuleReferenceOptions {
  globalRuleNumbers: boolean
  entryModuleId: string
  module?: Module
}

/**
 * The value stored in `relations.rule_refs`.
 *
 * Global rule-number systems resolve bare numbers system-wide, so they stay
 * bare. Otherwise a rule from another module is qualified with that module's
 * slug; same-module rules stay bare.
 */
export function formatRuleReference(rule: Rule, opts: FormatRuleReferenceOptions): string {
  if (opts.globalRuleNumbers) return rule.number
  if (rule.module_id !== opts.entryModuleId && opts.module) {
    return `${opts.module.slug}:${rule.number}`
  }
  return rule.number
}
