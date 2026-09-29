<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { System, Membership, Module } from '@/types/domain'
import { storeToRefs } from 'pinia'
import { useSystemStore } from '@/stores/system'
import { useMembershipStore } from '@/stores/membership'
import { useCacheStore } from '@/stores/cacheStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, ChevronDown } from '@lucide/vue'
import CreateModuleDialog from '@/components/systems/CreateModuleDialog.vue'
import DeleteConfirmDialog from '@/components/systems/DeleteConfirmDialog.vue'
import ReleaseVersionDialog from '@/components/systems/ReleaseVersionDialog.vue'

interface Props {
  system: System
  membership: Membership | null | undefined
  class?: string
}

const props = defineProps<Props>()

const router = useRouter()
const systemStore = useSystemStore()
const membershipStore = useMembershipStore()
const cacheStore = useCacheStore()
const { modulesBySystem, loading } = storeToRefs(systemStore)
const { subscriptions } = storeToRefs(membershipStore)
const { fetchModules, deleteSystem, deleteModule } = systemStore

const expanded = ref(false)
const showCreateModule = ref(false)
const showDeleteSystem = ref(false)
const deletingModuleId = ref<string | null>(null)
const versioningModuleId = ref<string | null>(null)

const modules = computed(() => modulesBySystem.value[props.system.id] ?? [])
const canManage = computed(() => props.system.permissions?.['system.manage'] ?? false)
const isMember = computed(() => !!props.membership)
const isCached = computed(() =>
  cacheStore.cachedSystems.some((e) => e.systemId === props.system.id),
)

function isUnavailable(mod: Module): boolean {
  return !mod.permissions['content.view_live'] && !mod.permissions['content.view_released']
}

const hasCoreModule = computed(() => modules.value.some((m) => m.is_core))

const versioningModule = computed(() =>
  modules.value.find((m) => m.id === versioningModuleId.value) ?? null,
)

async function toggle() {
  expanded.value = !expanded.value
  if (expanded.value && !modulesBySystem.value[props.system.id]) {
    await fetchModules(props.system.id)
  }
}

async function handleDeleteSystem() {
  await deleteSystem(props.system.id)
  showDeleteSystem.value = false
}

async function handleDeleteModule(moduleId: string) {
  await deleteModule(props.system.id, moduleId)
  deletingModuleId.value = null
}

function openSystem() {
  router.push({ name: 'system', params: { systemId: props.system.id } })
}
</script>

<template>
  <div :class="cn('bg-card border border-border rounded-lg overflow-hidden', props.class)">
    <!-- Header row -->
    <div
      class="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
      @click="toggle"
    >
      <component
        :is="expanded ? ChevronDown : ChevronRight"
        class="w-4 h-4 text-muted-foreground shrink-0"
      />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-foreground font-medium">{{ system.name }}</span>
          <Badge v-if="isCached" variant="secondary" class="text-xs">cached</Badge>
        </div>
        <div class="text-xs text-muted-foreground mt-0.5">{{ system.slug }}</div>
      </div>
      <Button
        v-if="canManage"
        variant="ghost"
        size="sm"
        class="text-destructive hover:text-destructive shrink-0"
        @click.stop="showDeleteSystem = true"
      >
        Delete
      </Button>
    </div>

    <!-- Expanded content -->
    <div v-if="expanded" class="border-t border-border px-4 py-3 space-y-3">
      <!-- Modules section -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-muted-foreground uppercase tracking-widest">Modules</span>
          <Button
            v-if="canManage"
            variant="ghost"
            size="sm"
            class="text-xs h-6"
            @click="showCreateModule = true"
          >
            + New Module
          </Button>
        </div>

        <div v-if="modules.length === 0" class="text-xs text-muted-foreground">No modules yet.</div>

        <ul v-else class="space-y-1">
          <li v-for="mod in modules" :key="mod.id" class="flex items-center gap-2 text-sm py-1">
            <span class="flex-1 text-foreground">{{ mod.name }}</span>
            <Badge v-if="mod.is_core" variant="secondary" class="text-xs">core</Badge>
            <Badge
              v-if="subscriptions[mod.id]?.editor"
              variant="outline"
              class="text-xs text-amber-600 border-amber-400/50"
              >editor</Badge
            >
            <Button
              v-if="canManage"
              variant="ghost"
              size="sm"
              class="text-xs h-6 text-destructive hover:text-destructive"
              @click="deletingModuleId = mod.id"
            >
              Delete
            </Button>
            <Badge v-if="isUnavailable(mod)" variant="outline" class="text-xs text-muted-foreground">
              Unavailable
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              class="text-xs h-6 text-muted-foreground"
              :disabled="loading"
              @click="versioningModuleId = mod.id"
            >
              Version
            </Button>
          </li>
        </ul>
      </div>

      <!-- Open System -->
      <div v-if="isMember" class="border-t border-border pt-3">
        <Button size="sm" @click="openSystem">Open System</Button>
      </div>
    </div>
  </div>

  <!-- Create Module Dialog -->
  <CreateModuleDialog
    v-if="showCreateModule"
    :system-id="system.id"
    :has-core-module="hasCoreModule"
    :open="showCreateModule"
    @update:open="showCreateModule = $event"
  />

  <!-- Delete System Confirm -->
  <DeleteConfirmDialog
    v-if="showDeleteSystem"
    :open="showDeleteSystem"
    title="Delete System"
    :description="`Are you sure you want to delete &quot;${system.name}&quot;? This action cannot be undone.`"
    @update:open="showDeleteSystem = $event"
    @confirm="handleDeleteSystem"
    @cancel="showDeleteSystem = false"
  />

  <!-- Delete Module Confirm -->
  <DeleteConfirmDialog
    v-if="deletingModuleId"
    :open="!!deletingModuleId"
    title="Delete Module"
    description="Are you sure you want to delete this module? This action cannot be undone."
    @update:open="!$event ? (deletingModuleId = null) : undefined"
    @confirm="handleDeleteModule(deletingModuleId!)"
    @cancel="deletingModuleId = null"
  />

  <!-- Release Version Dialog -->
  <ReleaseVersionDialog
    v-if="versioningModule"
    :system-id="system.id"
    :module-id="versioningModule.id"
    :module-name="versioningModule.name"
    :open="!!versioningModule"
    @update:open="versioningModuleId = null"
  />
</template>
