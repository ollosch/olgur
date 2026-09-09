<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppSettingsStore } from '@/stores/appSettings'
import { useLeftPanelStore } from '@/stores/leftPanel'
import { useShortcutStore } from '@/stores/shortcut'
import { useSystemStore } from '@/stores/system'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menu, MoreVertical, Search, Table2, ListOrdered } from '@lucide/vue'
import LeftPanelContent from '@/components/systems/LeftPanelContent.vue'
import ManageMembersDialog from '@/components/systems/ManageMembersDialog.vue'
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
  openTables: []
  openSop: []
}>()

const router = useRouter()
const authStore = useAuthStore()
const appSettings = useAppSettingsStore()
const panelStore = useLeftPanelStore()
const shortcutStore = useShortcutStore()
const systemStore = useSystemStore()

const manageMembersOpen = ref(false)

const canManageMembers = computed(() =>
  Boolean(systemStore.currentSystem?.permissions?.['membership.manage']),
)

async function logout(): Promise<void> {
  await authStore.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <header class="border-b border-border px-3 py-2 flex items-center gap-2 shrink-0 h-[53px]">
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
        {{ systemStore.currentSystem?.name }}
      </span>
    </div>

    <!-- Center: search + nav buttons -->
    <div class="flex-1 flex items-center justify-center gap-1">
      <!-- Search -->
      <Button
        variant="ghost"
        size="icon"
        class="w-8 h-8"
        title="Search (⌘K)"
        @click="shortcutStore.overlayOpen = true"
      >
        <Search class="w-4 h-4" />
      </Button>

      <!-- Tables -->
      <Button
        variant="ghost"
        class="h-8 px-3 text-xs gap-1.5 text-muted-foreground"
        @click="emit('openTables')"
      >
        <Table2 class="w-3.5 h-3.5" />
        Tables
      </Button>

      <!-- SOP -->
      <Button
        variant="ghost"
        class="h-8 px-3 text-xs gap-1.5 text-muted-foreground"
        @click="emit('openSop')"
      >
        <ListOrdered class="w-3.5 h-3.5" />
        SOP
      </Button>
    </div>

    <!-- Right: dropdown menu -->
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="icon" class="w-8 h-8">
          <MoreVertical class="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-48">
        <DropdownMenuItem @click="router.push({ name: 'home' })"> Exit System </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          v-if="canManageMembers"
          @click="manageMembersOpen = true"
        >
          Manage Members
        </DropdownMenuItem>
        <DropdownMenuSeparator v-if="canManageMembers" />
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
  </header>

  <!-- Manage Members Dialog (lives here so manageMembersOpen state is local) -->
  <ManageMembersDialog
    v-if="systemStore.currentSystem"
    v-model:open="manageMembersOpen"
    :system-id="systemStore.currentSystem.id"
  />
</template>
