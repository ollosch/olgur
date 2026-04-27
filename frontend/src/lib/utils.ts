import type { ClassValue } from "clsx"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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
