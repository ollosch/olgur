import { computed, ref } from 'vue'

const online = ref<boolean>(
  typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
    ? navigator.onLine
    : true,
)

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    online.value = true
  })
  window.addEventListener('offline', () => {
    online.value = false
  })
}

async function probe(): Promise<boolean> {
  const url = (import.meta.env.VITE_COOKIE_URL as string | undefined) ?? '/'
  try {
    await fetch(url, { method: 'HEAD', cache: 'no-store' })
    online.value = true
  } catch {
    online.value = false
  }
  return online.value
}

export function useOnline() {
  const offline = computed(() => !online.value)

  return { online, offline, probe }
}
