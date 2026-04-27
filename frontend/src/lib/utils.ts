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

/** Returns a sort rank (0=exact, 1=prefix, 2=contains, 3=no match) for `field` against query `q`. */
export function rankMatch(field: string, q: string): number {
  const f = field.toLowerCase()
  if (f === q) return 0
  if (f.startsWith(q)) return 1
  if (f.includes(q)) return 2
  return 3
}

/** Comparator for IndexEntry search results: root entries first, then by rankMatch, then alphabetical. */
export function compareIndexEntries(a: IndexEntry, b: IndexEntry, q: string): number {
  const aNested = a.parent_id !== null ? 1 : 0
  const bNested = b.parent_id !== null ? 1 : 0
  if (aNested !== bNested) return aNested - bNested
  const rankDiff = rankMatch(a.term, q) - rankMatch(b.term, q)
  if (rankDiff !== 0) return rankDiff
  return a.term.localeCompare(b.term)
}
