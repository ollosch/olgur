import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type ThemeHue = number

export interface ThemePreset {
  name: string
  hue: ThemeHue
}

export const THEME_PRESETS: ThemePreset[] = [
  { name: 'Forest', hue: 142 },
  { name: 'Ocean', hue: 210 },
  { name: 'Violet', hue: 270 },
  { name: 'Amber', hue: 50 },
  { name: 'Crimson', hue: 10 },
  { name: 'Teal', hue: 175 },
]

function loadBool(key: string, defaultValue: boolean): boolean {
  const stored = localStorage.getItem(key)
  if (stored === null) return defaultValue
  return stored === 'true'
}

function loadNumber(key: string, defaultValue: number): number {
  const stored = localStorage.getItem(key)
  if (stored === null) return defaultValue
  const parsed = parseFloat(stored)
  return isNaN(parsed) ? defaultValue : parsed
}

export const useAppSettingsStore = defineStore('appSettings', () => {
  const acronymPopups = ref(loadBool('settings.acronymPopups', true))
  const themeHue = ref(loadNumber('settings.themeHue', 142))

  watch(acronymPopups, (val) => localStorage.setItem('settings.acronymPopups', String(val)))
  watch(themeHue, (val) => {
    localStorage.setItem('settings.themeHue', String(val))
    applyTheme(val)
  })

  function applyTheme(hue: number): void {
    let styleEl = document.getElementById('olgur-theme') as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'olgur-theme'
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = `
      :root, .dark {
        --background: oklch(0.07 0.01 ${hue});
        --foreground: oklch(0.75 0.15 ${hue});
        --card: oklch(0.11 0.015 ${hue});
        --card-foreground: oklch(0.75 0.15 ${hue});
        --popover: oklch(0.11 0.015 ${hue});
        --popover-foreground: oklch(0.75 0.15 ${hue});
        --primary: oklch(0.65 0.2 ${hue});
        --primary-foreground: oklch(0.07 0.01 ${hue});
        --secondary: oklch(0.16 0.02 ${hue});
        --secondary-foreground: oklch(0.75 0.15 ${hue});
        --muted: oklch(0.16 0.02 ${hue});
        --muted-foreground: oklch(0.5 0.1 ${hue});
        --accent: oklch(0.16 0.02 ${hue});
        --accent-foreground: oklch(0.75 0.15 ${hue});
        --border: oklch(0.35 0.1 ${hue} / 35%);
        --input: oklch(0.35 0.1 ${hue} / 20%);
        --ring: oklch(0.65 0.2 ${hue});
        --sidebar: oklch(0.11 0.015 ${hue});
        --sidebar-foreground: oklch(0.75 0.15 ${hue});
        --sidebar-primary: oklch(0.65 0.2 ${hue});
        --sidebar-primary-foreground: oklch(0.07 0.01 ${hue});
        --sidebar-accent: oklch(0.16 0.02 ${hue});
        --sidebar-accent-foreground: oklch(0.75 0.15 ${hue});
        --sidebar-border: oklch(0.35 0.1 ${hue} / 35%);
        --sidebar-ring: oklch(0.65 0.2 ${hue});
      }
    `
  }

  function init(): void {
    applyTheme(themeHue.value)
  }

  return {
    acronymPopups,
    themeHue,
    init,
  }
})
