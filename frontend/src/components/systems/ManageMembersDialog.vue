<script setup lang="ts">
import { watch } from 'vue'
import { useSystemStore } from '@/stores/system'
import { useMemberManagementStore } from '@/stores/memberManagement'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useModalShortcutGuard } from '@/composables/useModalShortcutGuard'

interface Props {
  open: boolean
  systemId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const systemStore = useSystemStore()
const memberManagementStore = useMemberManagementStore()

useModalShortcutGuard(() => props.open)

watch(
  () => props.open,
  async (val) => {
    if (!val) return
    await memberManagementStore.loadAdminData(props.systemId)
  },
)

const modules = () => systemStore.modulesBySystem[props.systemId] ?? []
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Manage Members</DialogTitle>
        <DialogDescription class="sr-only"
          >Add or remove system members and manage their roles</DialogDescription
        >
      </DialogHeader>

      <div
        v-if="memberManagementStore.adminLoading"
        class="text-sm text-muted-foreground py-4 text-center"
      >
        Loading…
      </div>

      <template v-else>
        <!-- Members / admin toggles -->
        <section class="space-y-1 mb-6">
          <h3 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Members
          </h3>
          <div
            v-for="m in memberManagementStore.adminMemberships"
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
              :disabled="memberManagementStore.loading"
              class="ml-4 shrink-0 text-xs"
              @click="memberManagementStore.updateMembershipAdmin(props.systemId, m.id, !m.admin)"
            >
              {{ m.admin ? 'Remove Admin' : 'Make Admin' }}
            </Button>
          </div>
          <p
            v-if="memberManagementStore.adminMemberships.length === 0"
            class="text-sm text-muted-foreground px-3 py-2"
          >
            No members yet.
          </p>
        </section>

        <!-- Per-module editor toggles -->
        <section v-for="mod in modules()" :key="mod.id" class="mb-5">
          <h3 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            {{ mod.name }} — Editors
          </h3>
          <div
            v-for="sub in memberManagementStore.adminSubscriptionsByModule[mod.id] ?? []"
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
              :disabled="memberManagementStore.loading"
              class="ml-4 shrink-0 text-xs"
              @click="
                memberManagementStore.updateSubscriptionEditor(
                  props.systemId,
                  mod.id,
                  sub.id,
                  !sub.editor,
                )
              "
            >
              {{ sub.editor ? 'Remove Editor' : 'Make Editor' }}
            </Button>
          </div>
          <p
            v-if="(memberManagementStore.adminSubscriptionsByModule[mod.id] ?? []).length === 0"
            class="text-sm text-muted-foreground px-3 py-2"
          >
            No subscribers yet.
          </p>
        </section>
      </template>
    </DialogContent>
  </Dialog>
</template>
