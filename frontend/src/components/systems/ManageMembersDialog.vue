<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSystemStore } from '@/stores/system'
import type { MembershipWithUser, SubscriptionWithUser } from '@/types/domain'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
  systemId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const systemStore = useSystemStore()

const memberships = ref<MembershipWithUser[]>([])
const subscriptionsByModule = ref<Record<string, SubscriptionWithUser[]>>({})
const loadingMemberships = ref(false)
const togglingId = ref<string | null>(null)

watch(
  () => props.open,
  async (val) => {
    if (!val) return
    loadingMemberships.value = true
    memberships.value = await systemStore.fetchSystemMemberships(props.systemId)

    const modules = systemStore.modulesBySystem[props.systemId] ?? []
    const results = await Promise.all(
      modules.map((m) =>
        systemStore.fetchModuleSubscriptions(props.systemId, m.id).then((subs) => ({
          moduleId: m.id,
          subs,
        })),
      ),
    )
    for (const { moduleId, subs } of results) {
      subscriptionsByModule.value[moduleId] = subs
    }

    loadingMemberships.value = false
  },
)

async function toggleAdmin(membership: MembershipWithUser) {
  togglingId.value = membership.id
  const updated = await systemStore.updateMembershipAdmin(
    props.systemId,
    membership.id,
    !membership.admin,
  )
  if (updated) {
    const idx = memberships.value.findIndex((m) => m.id === membership.id)
    if (idx !== -1) {
      memberships.value[idx] = { ...memberships.value[idx]!, admin: updated.admin }
    }
  }
  togglingId.value = null
}

async function toggleEditor(systemId: string, moduleId: string, sub: SubscriptionWithUser) {
  togglingId.value = sub.id
  const updated = await systemStore.updateSubscriptionEditor(systemId, moduleId, sub.id, !sub.editor)
  if (updated) {
    const list = subscriptionsByModule.value[moduleId] ?? []
    const idx = list.findIndex((s) => s.id === sub.id)
    if (idx !== -1) {
      list[idx] = { ...list[idx]!, editor: updated.editor }
    }
  }
  togglingId.value = null
}

const modules = () => systemStore.modulesBySystem[props.systemId] ?? []
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Manage Members</DialogTitle>
      </DialogHeader>

      <div v-if="loadingMemberships" class="text-sm text-muted-foreground py-4 text-center">
        Loading…
      </div>

      <template v-else>
        <!-- Members / admin toggles -->
        <section class="space-y-1 mb-6">
          <h3 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Members
          </h3>
          <div
            v-for="m in memberships"
            :key="m.id"
            class="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/30"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-foreground truncate">{{ m.user_name }}</p>
              <p class="text-xs text-muted-foreground truncate">{{ m.user_email }}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              :disabled="togglingId === m.id"
              class="ml-4 shrink-0 text-xs"
              @click="toggleAdmin(m)"
            >
              {{ m.admin ? 'Remove Admin' : 'Make Admin' }}
            </Button>
          </div>
          <p v-if="memberships.length === 0" class="text-sm text-muted-foreground px-3 py-2">
            No members yet.
          </p>
        </section>

        <!-- Per-module editor toggles -->
        <section v-for="mod in modules()" :key="mod.id" class="mb-5">
          <h3 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            {{ mod.name }} — Editors
          </h3>
          <div
            v-for="sub in subscriptionsByModule[mod.id] ?? []"
            :key="sub.id"
            class="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/30"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-foreground truncate">{{ sub.user_name }}</p>
              <p class="text-xs text-muted-foreground truncate">{{ sub.user_email }}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              :disabled="togglingId === sub.id"
              class="ml-4 shrink-0 text-xs"
              @click="toggleEditor(props.systemId, mod.id, sub)"
            >
              {{ sub.editor ? 'Remove Editor' : 'Make Editor' }}
            </Button>
          </div>
          <p
            v-if="(subscriptionsByModule[mod.id] ?? []).length === 0"
            class="text-sm text-muted-foreground px-3 py-2"
          >
            No subscribers yet.
          </p>
        </section>
      </template>
    </DialogContent>
  </Dialog>
</template>
