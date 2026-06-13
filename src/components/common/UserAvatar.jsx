import { useState, useEffect } from 'react'
import axiosInstance from '../../api/axios'

/**
 * İstifadəçinin profil şəklini blob kimi yükləyir.
 * Yüklənmiş şəkil yoxdursa, ad hərfini fallback olaraq göstərir.
 */
export default function UserAvatar({
  user,
  size = 32,
  fallbackBg = 'var(--ces-graphite)',
  fallbackFg = 'var(--ces-gold)',
  className = '',
}) {
  const [blobUrl, setBlobUrl] = useState(null)

  useEffect(() => {
    if (!user?.profileImage) { setBlobUrl(null); return }
    let cancelled = false
    let url = null
    axiosInstance.get('/users/me/profile-image', { responseType: 'blob' })
      .then((res) => {
        url = URL.createObjectURL(res.data)
        if (!cancelled) setBlobUrl(url)
      })
      .catch(() => {})
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
  }, [user?.profileImage])

  if (blobUrl) {
    return (
      <img
        src={blobUrl}
        alt=""
        className={`flex-none rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  const initial = (user?.fullName?.[0] || user?.username?.[0] || 'U').toUpperCase()
  return (
    <div
      className={`ces-avatar flex-none rounded-full grid place-items-center font-extrabold ${className}`}
      style={{
        width: size,
        height: size,
        background: fallbackBg,
        color: fallbackFg,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {initial}
    </div>
  )
}
