<script setup lang="ts">
import { computed } from 'vue'
import { useAppSettingsStore, THEME_PRESETS } from '@/stores/appSettings'
import { useRouter } from 'vue-router'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Check } from 'lucide-vue-next'

const settings = useAppSettingsStore()
const router = useRouter()

const customHue = computed({
  get: () => settings.themeHue,
  set: (val: number) => {
    settings.themeHue = val
  },
})

function selectPreset(hue: number): void {
  settings.themeHue = hue
}

function goBack(): void {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push({ name: 'home' })
  }
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="border-b border-border px-6 py-3 flex items-center gap-3">
      <Button variant="ghost" size="icon" class="w-8 h-8" @click="goBack()">
        <ArrowLeft class="w-4 h-4" />
      </Button>
      <span class="text-foreground font-semibold text-sm">App Settings</span>
    </header>

    <main class="max-w-lg mx-auto px-6 py-10 space-y-6">
      <!-- Acronym Popups -->
      <Card>
        <CardHeader>
          <CardTitle>Acronym Popups</CardTitle>
          <CardDescription>
            Show a popup with the definition when hovering over an acronym in rule content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            role="switch"
            :aria-checked="settings.acronymPopups"
            :class="
              cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                settings.acronymPopups ? 'bg-primary' : 'bg-muted',
              )
            "
            @click="settings.acronymPopups = !settings.acronymPopups"
          >
            <span
              :class="
                cn(
                  'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform',
                  settings.acronymPopups ? 'translate-x-6' : 'translate-x-1',
                )
              "
            />
          </button>
          <p class="mt-2 text-sm text-muted-foreground">
            {{ settings.acronymPopups ? 'Enabled' : 'Disabled' }}
          </p>
        </CardContent>
      </Card>

      <!-- Color Scheme -->
      <Card>
        <CardHeader>
          <CardTitle>Color Scheme</CardTitle>
          <CardDescription>
            Choose a preset or pick any hue. The app uses a single-hue OKLCH palette.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-5">
          <!-- Presets -->
          <div class="flex flex-wrap gap-3">
            <button
              v-for="preset in THEME_PRESETS"
              :key="preset.hue"
              type="button"
              :title="preset.name"
              :class="
                cn(
                  'relative w-9 h-9 rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  settings.themeHue === preset.hue
                    ? 'border-foreground scale-110'
                    : 'border-transparent hover:scale-105',
                )
              "
              :style="{ background: `oklch(0.65 0.2 ${preset.hue})` }"
              @click="selectPreset(preset.hue)"
            >
              <Check
                v-if="settings.themeHue === preset.hue"
                class="w-4 h-4 absolute inset-0 m-auto text-white drop-shadow"
              />
            </button>
          </div>

          <!-- Preset names -->
          <div class="flex flex-wrap gap-x-4 gap-y-1">
            <span
              v-for="preset in THEME_PRESETS"
              :key="preset.hue"
              class="text-xs text-muted-foreground cursor-pointer hover:text-foreground"
              @click="selectPreset(preset.hue)"
            >
              {{ preset.name }}
            </span>
          </div>

          <!-- Custom hue slider -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-foreground">Custom hue</span>
              <span class="text-sm font-mono text-foreground">{{ customHue }}°</span>
            </div>
            <input
              v-model.number="customHue"
              type="range"
              min="0"
              max="360"
              step="1"
              class="w-full h-2 rounded-full appearance-none cursor-pointer"
              style="
                background: linear-gradient(
                  to right,
                  oklch(0.65 0.2 0),
                  oklch(0.65 0.2 60),
                  oklch(0.65 0.2 120),
                  oklch(0.65 0.2 180),
                  oklch(0.65 0.2 240),
                  oklch(0.65 0.2 300),
                  oklch(0.65 0.2 360)
                );
              "
            />
          </div>
        </CardContent>
      </Card>
    </main>
  </div>
</template>
