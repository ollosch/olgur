import { markRaw, type Component } from 'vue'
import type { Module, ModuleToolKey } from '@/types/domain'
import UnitDataTab from '@/components/layout/UnitDataTab.vue'
import OrdnanceVersusArmorTool from '@/components/tools/OrdnanceVersusArmorTool.vue'

export interface ToolDescriptor {
  key: ModuleToolKey
  label: string
}

export const TOOL_LABELS: Record<ModuleToolKey, string> = {
  unit_browser: 'Unit Data',
  ordnance_versus_armor: 'Ordnance vs Armor',
}

/** Deployed implementations keyed by stable tool key. */
export const TOOL_COMPONENTS: Record<ModuleToolKey, Component> = {
  unit_browser: markRaw(UnitDataTab),
  ordnance_versus_armor: markRaw(OrdnanceVersusArmorTool),
}

/** Safely narrow an arbitrary declared key to a known tool key. */
export function isKnownToolKey(key: string): key is ModuleToolKey {
  return key in TOOL_COMPONENTS
}

/** The known tool keys a module declares, unknown keys safely dropped. */
export function moduleTools(module: Module): ToolDescriptor[] {
  return (module.tools ?? [])
    .map((declaration) => declaration.key)
    .filter(isKnownToolKey)
    .map((key) => ({ key, label: TOOL_LABELS[key] }))
}

/** Union of known tools declared by the given modules, deduplicated by key. */
export function activeTools(modules: Module[]): ToolDescriptor[] {
  const seen = new Set<ModuleToolKey>()
  const tools: ToolDescriptor[] = []

  for (const module of modules) {
    for (const tool of moduleTools(module)) {
      if (!seen.has(tool.key)) {
        seen.add(tool.key)
        tools.push(tool)
      }
    }
  }

  return tools
}
