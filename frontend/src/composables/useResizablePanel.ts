import { onBeforeUnmount, ref, type Ref } from 'vue'
import { loadNumber, saveItem } from '@/lib/storage'

export interface ResizablePanelOptions {
  /** localStorage key used to persist the panel size. */
  storageKey: string
  /** Initial size in px when nothing is stored yet. Accepts a function for dynamic defaults. */
  defaultSize: number | (() => number)
  /** Minimum size in px. Accepts a function for dynamic values (e.g. viewport-relative). */
  min: number | (() => number)
  /** Maximum size in px. Accepts a function for dynamic values (e.g. viewport-relative). */
  max: number | (() => number)
  /** Axis of the resize: 'horizontal' for width, 'vertical' for height. */
  direction: 'horizontal' | 'vertical'
  /**
   * When true, dragging in the *negative* axis direction grows the panel.
   * Use this for right-anchored panels (drag left → wider) and
   * top-edge handles on bottom panels (drag up → taller).
   * Defaults to false.
   */
  inverted?: boolean
}

export interface ResizablePanelReturn {
  size: Ref<number>
  isDragging: Ref<boolean>
  startResize: (event: PointerEvent) => void
}

function resolve(val: number | (() => number)): number {
  return typeof val === 'function' ? val() : val
}

export function useResizablePanel(options: ResizablePanelOptions): ResizablePanelReturn {
  const { storageKey, direction, inverted = false } = options

  const size = ref(loadNumber(storageKey, resolve(options.defaultSize)))
  const isDragging = ref(false)

  let dragStartPos = 0
  let dragStartSize = 0

  function onMove(e: PointerEvent): void {
    if (!isDragging.value) return
    const currentPos = direction === 'horizontal' ? e.clientX : e.clientY
    const delta = inverted ? dragStartPos - currentPos : currentPos - dragStartPos
    size.value = Math.max(
      resolve(options.min),
      Math.min(dragStartSize + delta, resolve(options.max)),
    )
  }

  function onEnd(): void {
    isDragging.value = false
    saveItem(storageKey, String(size.value))
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onEnd)
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  }

  function startResize(e: PointerEvent): void {
    isDragging.value = true
    dragStartPos = direction === 'horizontal' ? e.clientX : e.clientY
    dragStartSize = size.value
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onEnd)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = direction === 'horizontal' ? 'ew-resize' : 'ns-resize'
  }

  onBeforeUnmount(() => {
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onEnd)
  })

  return { size, isDragging, startResize }
}
