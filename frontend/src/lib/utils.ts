/** Tailwind `md` breakpoint in pixels — keep in sync with tailwind.config if overridden */
export const BREAKPOINT_MD = 768

/** Debounce delay for search inputs in milliseconds */
export const SEARCH_DEBOUNCE_MS = 250

import type { ClassValue } from "clsx"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { IndexEntry } from "@/types/domain"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

/**
 * Returns a sort rank for `field` (already lowercased) against query `q` (already lowercased).
 * 0 = exact, 1 = prefix, 2 = contains, 3 = no match.
 * For single-character queries only exact matches score < 3.
 */
export function rankMatchLower(field: string, q: string): number {
  if (field === q) return 0
  if (q.length === 1) return 3
  if (field.startsWith(q)) return 1
  if (field.includes(q)) return 2
  return 3
}

/** Returns a sort rank (0=exact, 1=prefix, 2=contains, 3=no match) for `field` against query `q`. */
export function rankMatch(field: string, q: string): number {
  return rankMatchLower(field.toLowerCase(), q)
}

/**
 * Ranks a rule against a search query.
 * Number matches always beat title matches.
 * 0 = number exact, 1 = number prefix, 2 = number contains,
 * 3 = title exact, 4 = title prefix, 5 = title contains, 6 = no match.
 */
export function rankRule(rule: { number: string; title: string | null }, q: string): number {
  const numRank = rankMatchLower(rule.number.toLowerCase(), q)
  if (numRank < 3) return numRank
  if (!rule.title) return 6
  const titleRank = rankMatchLower(rule.title.toLowerCase(), q)
  if (titleRank < 3) return titleRank + 3
  return 6
}

/**
 * Comparator for IndexEntry search results.
 * Priority: root entries before nested, then match quality (exact → prefix → contains) within each group, then alphabetical.
 */
export function compareIndexEntries(a: IndexEntry, b: IndexEntry, q: string): number {
  const aNested = a.parent_id !== null ? 1 : 0
  const bNested = b.parent_id !== null ? 1 : 0
  if (aNested !== bNested) return aNested - bNested
  const rankDiff = rankMatchLower(a.term.toLowerCase(), q) - rankMatchLower(b.term.toLowerCase(), q)
  if (rankDiff !== 0) return rankDiff
  return a.term.localeCompare(b.term)
}
