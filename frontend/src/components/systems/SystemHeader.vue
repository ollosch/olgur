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
import { useProofreadStore } from '@/stores/proofread'
import { useOnline } from '@/composables/useOnline'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Menu,
  Search,
  Table2,
  ListOrdered,
  TriangleAlert,
  Wrench,
  Bookmark,
  MoreHorizontal,
  Settings,
} from '@lucide/vue'
import LeftPanelContent from '@/components/systems/LeftPanelContent.vue'
import ManageMembersDialog from '@/components/systems/ManageMembersDialog.vue'
import BrokenLinksDialog from '@/components/systems/BrokenLinksDialog.vue'
import ProofreadDialog from '@/components/systems/ProofreadDialog.vue'
import PinSystemControl from '@/components/systems/PinSystemControl.vue'
import { useBrokenLinks } from '@/composables/useBrokenLinks'
import { useToolbarOverflow } from '@/composables/useToolbarOverflow'
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
const proofreadStore = useProofreadStore()
const { offline } = useOnline()

const manageMembersOpen = ref(false)
const brokenLinksOpen = ref(false)
const proofreadOpen = ref(false)

const { canLint } = useBrokenLinks()

const canManageMembers = computed(() =>
  Boolean(systemStore.currentSystem?.permissions?.['membership.manage']),
)

const canProofread = computed(
  () => proofreadStore.canProofread && contentStore.viewMode === 'draft',
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

const systemName = computed(() => {
  const system = systemStore.currentSystem
  if (!system) return ''
  return system.name.length <= 25 ? system.name : system.slug.toLocaleUpperCase()
})

const tools = computed(() =>
  gameDataTools(contentStore.allGameData, systemStore.currentSystem?.slug),
)

const tableBookmarks = computed(() =>
  bookmarkStore.availableBookmarks.filter((b) => b.entry.type === 'table'),
)

const bookmarkItems = computed(() => tableBookmarks.value.map((b) => ({ id: b.entry.id })))

const {
  containerRef,
  registerTool,
  registerBookmark,
  visibleToolIds,
  hiddenToolIds,
  visibleBookmarkIds,
  hiddenBookmarkIds,
} = useToolbarOverflow(tools, bookmarkItems)

const overflowToolList = computed(() =>
  tools.value.filter((t) => hiddenToolIds.value.includes(t.id)),
)

const overflowBookmarkList = computed(() =>
  tableBookmarks.value.filter((b) => hiddenBookmarkIds.value.includes(b.entry.id)),
)

function bookmarkSlug(tableId: string): string {
  return contentStore.gameDataById.get(tableId)?.slug ?? ''
}

function openTableBookmark(tableId: string): void {
  gameDataModalStore.selectTable(tableId)
}

function onViewModeChange(value: string | number): void {
  void contentStore.switchViewMode(String(value) as 'draft' | 'release')
}

function goToRootToc(): void {
  const systemId = systemStore.currentSystem?.id
  if (!systemId) return
  void router.push({ name: 'system', params: { systemId } })
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

      <button
        class="text-foreground font-semibold text-sm hover:text-primary transition-colors"
        title="Table of contents"
        @click="goToRootToc"
      >
        {{ systemName }}
      </button>
    </div>

    <!-- Center: toolbar button bar -->
    <div class="flex-1 min-w-0 flex items-center justify-center gap-1 overflow-hidden">
      <!-- Table Browser -->
      <Button
        variant="ghost"
        size="icon"
        class="w-8 h-8 shrink-0"
        title="Tables"
        @click="emit('openTableBrowser')"
      >
        <Table2 class="w-4 h-4" />
      </Button>

      <!-- Super-Search -->
      <Button
        variant="ghost"
        size="icon"
        class="w-8 h-8 shrink-0"
        title="Search (⌘K)"
        @click="shortcutStore.overlayOpen = true"
      >
        <Search class="w-4 h-4" />
      </Button>

      <!-- Sequence of Play -->
      <Button
        variant="ghost"
        size="icon"
        class="w-8 h-8 shrink-0"
        title="SOP"
        @click="emit('openSop')"
      >
        <ListOrdered class="w-4 h-4" />
      </Button>

      <!-- Overflowable region: inline tools + table bookmarks -->
      <div ref="containerRef" class="flex items-center gap-1 min-w-0 overflow-hidden">
        <template v-for="tool in tools" :key="tool.id">
          <Button
            :ref="registerTool(tool.id)"
            v-show="visibleToolIds.includes(tool.id)"
            variant="ghost"
            class="h-8 px-2 text-xs gap-1 shrink-0 text-muted-foreground"
            :title="tool.label"
            data-test="inline-tool"
            @click="emit('openTool', tool.id)"
          >
            <Wrench class="w-3.5 h-3.5" />
            {{ tool.shortLabel ?? tool.id }}
          </Button>
        </template>

        <DropdownMenu v-if="overflowToolList.length > 0">
          <DropdownMenuTrigger as-child>
            <Button
              variant="ghost"
              size="icon"
              class="w-8 h-8 shrink-0"
              title="More tools"
              data-test="tool-more"
            >
              <MoreHorizontal class="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-56">
            <DropdownMenuItem
              v-for="tool in overflowToolList"
              :key="tool.id"
              @click="emit('openTool', tool.id)"
            >
              {{ tool.label }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <template v-for="bookmark in tableBookmarks" :key="bookmark.entry.id">
          <Button
            :ref="registerBookmark(bookmark.entry.id)"
            v-show="visibleBookmarkIds.includes(bookmark.entry.id)"
            variant="ghost"
            class="h-8 px-2 text-xs gap-1 shrink-0 text-muted-foreground"
            :title="bookmark.label"
            data-test="inline-bookmark"
            @click="openTableBookmark(bookmark.entry.id)"
          >
            <Bookmark class="w-3.5 h-3.5" />
            {{ bookmarkSlug(bookmark.entry.id) }}
          </Button>
        </template>

        <DropdownMenu v-if="overflowBookmarkList.length > 0">
          <DropdownMenuTrigger as-child>
            <Button
              variant="ghost"
              size="icon"
              class="w-8 h-8 shrink-0"
              title="More bookmarks"
              data-test="bookmark-more"
            >
              <MoreHorizontal class="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-64">
            <DropdownMenuItem
              v-for="bookmark in overflowBookmarkList"
              :key="bookmark.entry.id"
              @click="openTableBookmark(bookmark.entry.id)"
            >
              {{ bookmark.label }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <!-- System ▾ -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="w-8 h-8 shrink-0"
            title="System"
            data-test="system-menu"
          >
            <Settings class="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <template v-if="selectableModules.length > 1">
            <DropdownMenuLabel>Active module: {{ currentModuleLabel }}</DropdownMenuLabel>
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
            <DropdownMenuSeparator />
          </template>
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
          <DropdownMenuItem v-if="canProofread" @click="proofreadOpen = true">
            Proofread
          </DropdownMenuItem>
          <DropdownMenuSeparator v-if="canManageMembers || canLint || canProofread" />
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

  <!-- Proofread Dialog -->
  <ProofreadDialog v-if="systemStore.currentSystem" v-model:open="proofreadOpen" />
</template>
