<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { System, Membership } from '@/types/domain'
import { storeToRefs } from 'pinia'
import { useSystemStore } from '@/stores/system'
import { useMembershipStore } from '@/stores/membership'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, ChevronDown, Circle, CircleDot } from '@lucide/vue'
import CreateModuleDialog from '@/components/systems/CreateModuleDialog.vue'
import DeleteConfirmDialog from '@/components/systems/DeleteConfirmDialog.vue'

interface Props {
  system: System
  membership: Membership | null | undefined
  class?: string
}

const props = defineProps<Props>()

const router = useRouter()
const systemStore = useSystemStore()
const membershipStore = useMembershipStore()
const { modulesBySystem, loading } = storeToRefs(systemStore)
const { subscriptions } = storeToRefs(membershipStore)
const { fetchModules, deleteSystem, deleteModule, createVersion } = systemStore
const { activateModule, deactivateModule } = membershipStore

const expanded = ref(false)
const showCreateModule = ref(false)
const showDeleteSystem = ref(false)
const deletingModuleId = ref<string | null>(null)

const modules = computed(() => modulesBySystem.value[props.system.id] ?? [])
const canManage = computed(() => props.system.permissions?.['system.manage'] ?? false)
const isMember = computed(() => !!props.membership)

const activeModuleIds = computed(() => props.membership?.config?.active_module_ids ?? [])

const hasCoreModule = computed(() => modules.value.some((m) => m.is_core))
const systemStructure = computed(() => props.system.config?.system_structure ?? '')

function structureLabel(s: string | undefined) {
  if (s === 'core_plus_many') return 'Core + Many'
  if (s === 'core_plus_one') return 'Core + One'
  if (s === 'grouping_only') return 'Grouping Only'
  return s ?? ''
}

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

async function handleActivate(moduleId: string) {
  await activateModule(props.system.id, moduleId)
}

async function handleDeactivate(moduleId: string) {
  await deactivateModule(props.system.id, moduleId)
}

async function handleCreateVersion(moduleId: string) {
  await createVersion(props.system.id, moduleId)
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
          <Badge v-if="system.config?.system_structure" variant="outline" class="text-xs">
            {{ structureLabel(system.config.system_structure) }}
          </Badge>
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
            <template v-if="isMember">
              <template v-if="mod.is_core">
                <Badge variant="outline" class="text-xs text-primary border-primary/40">
                  <CircleDot class="w-3 h-3 mr-1" />active
                </Badge>
              </template>
              <template v-else>
                <template v-if="subscriptions[mod.id]">
                  <Badge
                    v-if="activeModuleIds.includes(mod.id)"
                    variant="outline"
                    class="text-xs text-primary border-primary/40"
                  >
                    <CircleDot class="w-3 h-3 mr-1" />active
                  </Badge>
                  <Badge v-else variant="outline" class="text-xs text-muted-foreground">
                    <Circle class="w-3 h-3 mr-1" />inactive
                  </Badge>
                  <Button
                    v-if="activeModuleIds.includes(mod.id)"
                    variant="ghost"
                    size="sm"
                    class="text-xs h-6"
                    :disabled="loading"
                    @click="handleDeactivate(mod.id)"
                  >
                    Deactivate
                  </Button>
                  <Button
                    v-else
                    variant="ghost"
                    size="sm"
                    class="text-xs h-6"
                    :disabled="loading"
                    @click="handleActivate(mod.id)"
                  >
                    Activate
                  </Button>
                </template>
              </template>
            </template>
            <Button
              v-if="canManage"
              variant="ghost"
              size="sm"
              class="text-xs h-6 text-destructive hover:text-destructive"
              @click="deletingModuleId = mod.id"
            >
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="text-xs h-6 text-muted-foreground"
              :disabled="loading"
              @click="handleCreateVersion(mod.id)"
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
    :system-structure="systemStructure"
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
</template>
