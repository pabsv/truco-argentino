import { useEffect } from 'react'

/**
 * Keeps the device screen awake while the component is mounted.
 *
 * Uses the Screen Wake Lock API (Chrome on Android, Safari 16.4+ on iOS).
 * Silently no-ops in browsers that don't support it.
 *
 * The browser automatically releases the lock when the page becomes hidden
 * (e.g., the user switches apps or locks the phone), so we re-acquire it
 * whenever the page becomes visible again.
 */
export function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return

    let wakeLock: WakeLockSentinel | null = null
    let cancelled = false

    const requestLock = async () => {
      try {
        wakeLock = await navigator.wakeLock.request('screen')
      } catch {
        // NotAllowedError can fire if the page isn't visible at request time.
        // Safe to ignore — visibilitychange will retry when we're visible again.
      }
    }

    const handleVisibilityChange = () => {
      if (!cancelled && document.visibilityState === 'visible') {
        requestLock()
      }
    }

    requestLock()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      wakeLock?.release().catch(() => {
        // Ignore release errors — the sentinel may already be released.
      })
      wakeLock = null
    }
  }, [])
}
