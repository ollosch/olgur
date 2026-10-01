<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppSettingsStore } from '@/stores/appSettings'
import { useLeftPanelStore } from '@/stores/leftPanel'
import { useShortcutStore } from '@/stores/shortcut'
import { useSystemStore } from '@/stores/system'
import { useContentStore } from '@/stores/content'
import { useMembershipStore } from '@/stores/membership'
import { useBookmarkStore } from '@/stores/bookmarks'
import { useGameDataModalStore } from '@/stores/gameDataModal'
import { useOnline } from '@/composables/useOnline'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menu, Search, Table2, ListOrdered, TriangleAlert, Wrench, Bookmark, ChevronDown, Layers } from '@lucide/vue'
import LeftPanelContent from '@/components/systems/LeftPanelContent.vue'
import ManageMembersDialog from '@/components/systems/ManageMembersDialog.vue'
import BrokenLinksDialog from '@/components/systems/BrokenLinksDialog.vue'
import PinSystemControl from '@/components/systems/PinSystemControl.vue'
import { useBrokenLinks } from '@/composables/useBrokenLinks'
import { gameDataTools } from '@/lib/gameDataTools'
import type { Rule, Module } from '@/types/domain'
import { ref, computed } from 'vue'

interface Props {
  selectedRule: Rule | null
  getModuleRules: (mod: Module) => Rule[]
  buildTopLevelRules: (rules: Rule[]) => Rule[]
}

defineProps<Props>()
const emit = defineEmits<{
  select: [rule: Rule]
  toggleModule: [id: string]
  togglePin: []
  openTableBrowser: []
  openSop: []
  openTool: [toolId: string]
}>()

const router = useRouter()
const authStore = useAuthStore()
const appSettings = useAppSettingsStore()
const panelStore = useLeftPanelStore()
const shortcutStore = useShortcutStore()
const systemStore = useSystemStore()
const contentStore = useContentStore()
const membershipStore = useMembershipStore()
const bookmarkStore = useBookmarkStore()
const gameDataModalStore = useGameDataModalStore()
const { offline } = useOnline()

const manageMembersOpen = ref(false)
const brokenLinksOpen = ref(false)

const { canLint } = useBrokenLinks()

const canManageMembers = computed(() =>
  Boolean(systemStore.currentSystem?.permissions?.['membership.manage']),
)

/**
 * The "currently played" module selector. Only the non-core modules are
 * selectable — the core module is always active. Rendering only makes sense
 * when more than one non-core module exists, otherwise there is no meaningful
 * choice between "all modules" and a single exclusive module.
 */
const selectableModules = computed(() => systemStore.modules.filter((m) => !m.is_core))

const currentModuleLabel = computed(() => {
  const selectedId = contentStore.selectedModuleId
  if (!selectedId) return 'All modules'
  return selectableModules.value.find((m) => m.id === selectedId)?.name ?? 'All modules'
})

function selectModule(moduleId: string | null): void {
  const systemId = systemStore.currentSystem?.id
  if (!systemId) return
  void membershipStore.selectModule(systemId, moduleId)
}

const tools = computed(() =>
  gameDataTools(contentStore.allGameData, systemStore.currentSystem?.slug),
)

const tableBookmarks = computed(() =>
  bookmarkStore.resolvedBookmarks.filter((b) => b.entry.type === 'table'),
)

function openTableBookmark(tableId: string): void {
  gameDataModalStore.selectTable(tableId)
}

function onViewModeChange(value: string | number): void {
  contentStore.setViewMode(String(value) as 'draft' | 'release')
}

async function logout(): Promise<void> {
  await authStore.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <header class="border-b border-border px-3 py-2 flex items-center gap-2 shrink-0 h-[40px]">
    <!-- Left: mobile toggle + system name -->
    <div class="flex items-center gap-2 shrink-0">
      <Sheet v-model:open="panelStore.mobileOpen">
        <SheetTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            :class="['w-8 h-8', appSettings.sidebarPinned ? 'hidden' : 'md:hidden']"
          >
            <Menu class="w-4 h-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" class="w-72 p-0 flex flex-col">
          <LeftPanelContent
            :expanded-modules="panelStore.expandedModuleIds"
            :selected-rule="selectedRule"
            :pinned="appSettings.sidebarPinned"
            :get-module-rules="getModuleRules"
            :build-top-level-rules="buildTopLevelRules"
            @toggle-module="emit('toggleModule', $event)"
            @select="emit('select', $event)"
            @toggle-pin="emit('togglePin')"
          />
        </SheetContent>
      </Sheet>

      <span class="text-foreground font-semibold text-sm">
        {{ systemStore.currentSystem?.slug.toLocaleUpperCase() }}
      </span>
    </div>

    <!-- Center: toolbar controls -->
    <div class="flex-1 flex items-center justify-center gap-1">
      <!-- Currently played module ▾ -->
      <DropdownMenu v-if="selectableModules.length > 1">
        <DropdownMenuTrigger as-child>
          <Button
            variant="ghost"
            class="h-8 px-3 text-xs gap-1.5 text-muted-foreground"
            data-test="module-selector"
          >
            <Layers class="w-3.5 h-3.5" />
            {{ currentModuleLabel }}
            <ChevronDown class="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-56">
          <DropdownMenuItem data-module-id="all" @click="selectModule(null)">
            All modules
          </DropdownMenuItem>
          <DropdownMenuItem
            v-for="mod in selectableModules"
            :key="mod.id"
            :data-module-id="mod.id"
            @click="selectModule(mod.id)"
          >
            {{ mod.name }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <!-- Table Browser -->
      <Button
        variant="ghost"
        class="h-8 px-3 text-xs gap-1.5 text-muted-foreground"
        @click="emit('openTableBrowser')"
      >
        <Table2 class="w-3.5 h-3.5" />
        Tables
      </Button>

      <!-- Super-Search -->
      <Button
        variant="ghost"
        class="h-8 px-3 text-xs gap-1.5 text-muted-foreground"
        title="Search (⌘K)"
        @click="shortcutStore.overlayOpen = true"
      >
        <Search class="w-3.5 h-3.5" />
        Search
      </Button>

      <!-- Sequence of Play -->
      <Button
        variant="ghost"
        class="h-8 px-3 text-xs gap-1.5 text-muted-foreground"
        @click="emit('openSop')"
      >
        <ListOrdered class="w-3.5 h-3.5" />
        SOP
      </Button>

      <!-- Tools ▾ -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" class="h-8 px-3 text-xs gap-1.5 text-muted-foreground">
            <Wrench class="w-3.5 h-3.5" />
            Tools
            <ChevronDown class="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-56">
          <DropdownMenuItem
            v-for="tool in tools"
            :key="tool.id"
            @click="emit('openTool', tool.id)"
          >
            {{ tool.label }}
          </DropdownMenuItem>
          <DropdownMenuItem v-if="tools.length === 0" disabled>
            No tools available
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <!-- Table bookmarks ▾ -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" class="h-8 px-3 text-xs gap-1.5 text-muted-foreground">
            <Bookmark class="w-3.5 h-3.5" />
            Table-marks
            <ChevronDown class="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-64">
          <DropdownMenuItem
            v-for="bookmark in tableBookmarks"
            :key="bookmark.entry.id"
            @click="openTableBookmark(bookmark.entry.id)"
          >
            {{ bookmark.label }}
          </DropdownMenuItem>
          <DropdownMenuItem v-if="tableBookmarks.length === 0" disabled>
            No table bookmarks yet
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <!-- System ▾ -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" class="h-8 px-3 text-xs gap-1.5 text-muted-foreground">
            System
            <ChevronDown class="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <PinSystemControl
            v-if="systemStore.currentSystem"
            :system-id="systemStore.currentSystem.id"
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="router.push({ name: 'home' })"> Exit System </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem v-if="canManageMembers" @click="manageMembersOpen = true">
            Manage Members
          </DropdownMenuItem>
          <DropdownMenuItem v-if="canLint" @click="brokenLinksOpen = true">
            <TriangleAlert class="w-4 h-4" />
            Broken Links
          </DropdownMenuItem>
          <DropdownMenuSeparator v-if="canManageMembers || canLint" />
          <DropdownMenuItem @click="router.push({ name: 'profile' })">
            User Profile
          </DropdownMenuItem>
          <DropdownMenuItem @click="router.push({ name: 'settings' })">
            App Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="text-destructive" @click="logout"> Logout </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!-- Right: draft/release tabs -->
    <Tabs
      v-if="contentStore.canSwitchView && !offline"
      :model-value="contentStore.viewMode"
      class="shrink-0"
      @update:model-value="onViewModeChange"
    >
      <TabsList class="h-7">
        <TabsTrigger value="draft" class="text-xs px-2 h-6">Draft</TabsTrigger>
        <TabsTrigger value="release" class="text-xs px-2 h-6">Release</TabsTrigger>
      </TabsList>
    </Tabs>
  </header>

  <!-- Manage Members Dialog (lives here so manageMembersOpen state is local) -->
  <ManageMembersDialog
    v-if="systemStore.currentSystem"
    v-model:open="manageMembersOpen"
    :system-id="systemStore.currentSystem.id"
  />

  <!-- Broken Links Dialog -->
  <BrokenLinksDialog v-if="systemStore.currentSystem" v-model:open="brokenLinksOpen" />
</template>
