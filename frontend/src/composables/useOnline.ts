import { computed, ref } from 'vue'

const online = ref<boolean>(
  typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
    ? navigator.onLine
    : true,
)

type OnlineCallback = () => void
const onlineCallbacks = new Set<OnlineCallback>()

function notifyReconnected(): void {
  for (const cb of onlineCallbacks) cb()
}

function setOnline(value: boolean): void {
  const wasOffline = !online.value
  online.value = value
  if (value && wasOffline) notifyReconnected()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void probe()
  })
  window.addEventListener('offline', () => {
    setOnline(false)
  })
}

async function probe(): Promise<boolean> {
  const url = (import.meta.env.VITE_COOKIE_URL as string | undefined) ?? '/'
  try {
    await fetch(url, { method: 'HEAD', cache: 'no-store' })
    setOnline(true)
  } catch {
    setOnline(false)
  }
  return online.value
}

export function useOnline() {
  const offline = computed(() => !online.value)

  function onOnline(cb: OnlineCallback): () => void {
    onlineCallbacks.add(cb)
    return () => onlineCallbacks.delete(cb)
  }

  return { online, offline, probe, onOnline }
}
