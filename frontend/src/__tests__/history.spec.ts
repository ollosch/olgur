import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHistoryStore } from '@/stores/history'
import { useSystemStore } from '@/stores/system'
import type { System } from '@/types/domain'

function useSystem(): void {
  const systemStore = useSystemStore()
  systemStore.currentSystem = {
    id: 'sys1',
    slug: 'sys1',
    name: 'System',
    description: null,
    config: {
      global_rule_numbers: false,
      sort_rules_by: 'number',
      toc_depth: 0,
      proofread_threshold: 3,
      cover_image: null,
    },
    permissions: { 'system.manage': false, 'membership.manage': false, 'module.create': false },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  } as System
}

function makeEntry(id: string, mode: 'draft' | 'release') {
  return {
    type: 'rule' as const,
    id,
    systemId: 'sys1',
    mode,
    title: `Rule ${id}`,
    number: id,
  }
}

describe('useHistoryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useSystem()
  })

  it('keeps draft and released history together in one newest-first list', () => {
    const store = useHistoryStore()

    store.record(makeEntry('r1', 'draft'))
    store.record(makeEntry('r1', 'release'))

    expect(store.currentSystemEntries.map((e) => e.mode)).toEqual(['release', 'draft'])
  })

  it('moves an entry to the top within its own mode only', () => {
    const store = useHistoryStore()

    store.record(makeEntry('r1', 'draft'))
    store.record(makeEntry('r2', 'draft'))
    store.record(makeEntry('r1', 'draft'))

    expect(store.currentSystemEntries.map((e) => e.id)).toEqual(['r1', 'r2'])
  })

  it('caps each mode at twenty entries', () => {
    const store = useHistoryStore()

    for (let i = 0; i < 25; i += 1) {
      store.record(makeEntry(`draft-${i}`, 'draft'))
      store.record(makeEntry(`release-${i}`, 'release'))
    }

    expect(store.currentSystemEntries.filter((e) => e.mode === 'draft')).toHaveLength(20)
    expect(store.currentSystemEntries.filter((e) => e.mode === 'release')).toHaveLength(20)
  })

  it('clears both lists when a system is cleared', () => {
    const store = useHistoryStore()

    store.record(makeEntry('r1', 'draft'))
    store.record(makeEntry('r2', 'release'))
    store.clearSystem('sys1')

    expect(store.currentSystemEntries).toEqual([])
  })
})
