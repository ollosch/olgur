/**
 * Safe localStorage helpers.
 *
 * All reads return `defaultValue` on any error (Safari private mode, quota
 * exceeded, security restrictions, etc.). All writes silently swallow errors.
 */

export function loadBool(key: string, defaultValue: boolean): boolean {
  try {
    const stored = localStorage.getItem(key)
    if (stored === null) return defaultValue
    return stored === 'true'
  } catch {
    return defaultValue
  }
}

export function loadString(key: string, defaultValue: string): string {
  try {
    return localStorage.getItem(key) ?? defaultValue
  } catch {
    return defaultValue
  }
}

export function loadNumber(key: string, defaultValue: number): number {
  try {
    const stored = localStorage.getItem(key)
    if (stored === null) return defaultValue
    const parsed = parseFloat(stored)
    return isNaN(parsed) ? defaultValue : parsed
  } catch {
    return defaultValue
  }
}

export function saveItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Silently swallow quota / security errors (e.g. Safari private mode).
  }
}
