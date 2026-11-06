import { useEffect } from 'react'

/**
 * Keeps the device screen awake while the component is mounted.
 *
 * Primary path: the Screen Wake Lock API. The OS can drop the lock at any
 * time (page hidden, battery saver, a request made before any user gesture),
 * so we re-acquire it on visibilitychange, on the sentinel's `release` event,
 * and on every tap while we don't hold it.
 *
 * Fallback: when the API is missing or keeps failing (e.g. iOS home-screen
 * PWAs before iOS 18.4, where requests "succeed" but don't work), loop a tiny
 * muted inline video, which also prevents the screen from sleeping.
 */
export function useWakeLock() {
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null
    let pending = false
    let cancelled = false
    let video: HTMLVideoElement | null = null

    const ensureVideo = () => {
      if (!video) {
        video = document.createElement('video')
        video.src = '/keep-awake.mp4'
        video.muted = true
        video.loop = true
        video.playsInline = true
        video.setAttribute('playsinline', '')
        video.setAttribute('muted', '')
        video.setAttribute('aria-hidden', 'true')
        Object.assign(video.style, {
          position: 'fixed',
          width: '1px',
          height: '1px',
          opacity: '0',
          pointerEvents: 'none',
          top: '0',
          left: '0',
        })
        document.body.appendChild(video)
      }
      if (video.paused) video.play().catch(() => {})
    }

    // iOS standalone PWAs before 18.4 accept wake lock requests but ignore them.
    const isOldIosStandalone = (() => {
      const nav = navigator as Navigator & { standalone?: boolean }
      const m = navigator.userAgent.match(/OS (\d+)_(\d+)/)
      if (!nav.standalone || !m) return false
      const [major, minor] = [Number(m[1]), Number(m[2])]
      return major < 18 || (major === 18 && minor < 4)
    })()

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return
      if (!('wakeLock' in navigator) || isOldIosStandalone) {
        ensureVideo()
        return
      }
      if ((wakeLock && !wakeLock.released) || pending) return
      pending = true
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          lock.release().catch(() => {})
          return
        }
        wakeLock = lock
        video?.pause()
        lock.addEventListener('release', () => {
          wakeLock = null
          // Re-acquire if the system dropped it while we're still visible.
          if (!cancelled && document.visibilityState === 'visible') acquire()
        })
      } catch {
        // NotAllowedError (no user gesture yet, battery saver, etc.) — the
        // next tap retries; meanwhile keep the screen on with the video.
        ensureVideo()
      } finally {
        pending = false
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', acquire)
    window.addEventListener('focus', acquire)
    document.addEventListener('pointerdown', acquire, { passive: true })

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', acquire)
      window.removeEventListener('focus', acquire)
      document.removeEventListener('pointerdown', acquire)
      wakeLock?.release().catch(() => {})
      wakeLock = null
      if (video) {
        video.pause()
        video.remove()
        video = null
      }
    }
  }, [])
}
