import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'

// Logout etmədən icazələri canlı saxlayır:
//   • müəyyən aralıqla (POLL_MS) /me-ni yenidən çəkir,
//   • tab yenidən aktivləşəndə / pəncərə fokuslananda dərhal yeniləyir.
// Backend icazələri onsuz da hər sorğuda DB-dən təzə yükləyir; bu hook
// yalnız frontend-dəki keşlənmiş permission siyahısını (sidebar/UI) sinxronlaşdırır.
const POLL_MS = 45_000
const MIN_GAP_MS = 8_000 // ardıcıl çağırışlar arası minimal məsafə (spam-ın qarşısı)

export function usePermissionSync(enabled = true) {
  const refetchMe = useAuthStore((s) => s.refetchMe)
  const lastRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const sync = () => {
      const now = Date.now()
      if (now - lastRef.current < MIN_GAP_MS) return
      lastRef.current = now
      refetchMe()
    }

    const onVisible = () => { if (document.visibilityState === 'visible') sync() }

    const id = setInterval(sync, POLL_MS)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', sync)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', sync)
    }
  }, [enabled, refetchMe])
}
