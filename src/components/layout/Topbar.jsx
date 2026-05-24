import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { useNotificationStore } from '../../store/notificationStore'
import { Bell, Moon, Sun, Sparkles, Search, CheckCheck, ChevronDown, LogOut, User as UserIcon } from 'lucide-react'
import { fmtTime } from '../../utils/date'
import UserAvatar from '../common/UserAvatar'

/* ─────────────────────────────────────────────────────
   CES ERP Topbar — UI Kit form/button patterns
   • White surface, subtle line border
   • Page title with section eyebrow
   • Search (Ctrl+K), theme, notifications, user menu
───────────────────────────────────────────────────── */

const NOTIF_DOT = {
  SUCCESS: 'var(--ces-ok)',
  INFO:    'var(--ces-info)',
  WARNING: 'var(--ces-warn)',
  ERROR:   'var(--ces-danger)',
}
const NOTIF_BG = {
  SUCCESS: 'rgba(15,157,106,.1)',
  INFO:    'rgba(37,99,200,.1)',
  WARNING: 'rgba(224,138,0,.1)',
  ERROR:   'rgba(212,56,90,.1)',
}

export default function Topbar({ pageTitle, onSearchOpen }) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { theme, toggleTheme } = useThemeStore()
  const { notifications, unreadCount, markAllRead, clear } = useNotificationStore()

  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen]   = useState(false)
  const notifRef = useRef(null)
  const userRef  = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (userRef.current  && !userRef.current.contains(e.target))  setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNotifOpen = () => {
    setNotifOpen((v) => !v)
    if (!notifOpen && unreadCount > 0) markAllRead()
  }

  return (
    <header
      className="ces-topbar ces-font flex items-center justify-end shrink-0 transition-colors print:hidden"
      style={{
        height: '64px',
        padding: '0 24px',
        background: 'var(--ces-surface)',
        borderBottom: '1px solid var(--ces-line)',
      }}
    >
      {/* ─── RIGHT: actions ─── */}
      <div className="flex items-center gap-2">

        {/* Search trigger (UI kit `.input.has-icon` like) */}
        <button
          onClick={onSearchOpen}
          className="ces-tb-search hidden sm:flex items-center gap-2 px-3 transition-all"
          style={{
            height: '38px',
            background: 'var(--ces-graphite-50)',
            border: '1px solid var(--ces-line)',
            borderRadius: '10px',
            color: 'var(--ces-muted)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--ces-graphite)'
            e.currentTarget.style.background = 'var(--ces-surface)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--ces-line)'
            e.currentTarget.style.background = 'var(--ces-graphite-50)'
          }}
          title="Axtarış"
        >
          <Search size={14} />
          <span className="text-[13px] font-medium">Axtar...</span>
          <kbd
            className="hidden md:inline-block text-[10px] font-mono px-1.5 py-0.5 ml-1 rounded"
            style={{
              background: 'var(--ces-surface)',
              border: '1px solid var(--ces-line)',
              color: 'var(--ces-muted)',
            }}
          >
            Ctrl+K
          </kbd>
        </button>

        {/* Mobile search */}
        <button
          onClick={onSearchOpen}
          className="ces-tb-btn sm:hidden flex items-center justify-center transition-colors"
          style={{ width: '38px', height: '38px', borderRadius: '10px' }}
          title="Axtarış"
        >
          <Search size={16} />
        </button>

        {/* Theme toggle — cycle: light → dark → galactic → light */}
        <button
          onClick={toggleTheme}
          className="ces-tb-btn flex items-center justify-center transition-colors"
          style={{ width: '38px', height: '38px', borderRadius: '10px' }}
          title={
            theme === 'light' ? 'Gecə modu' :
            theme === 'dark' ? 'Galactic modu' :
            'Gündüz modu'
          }
        >
          {theme === 'light' && <Moon size={16} />}
          {theme === 'dark' && <Sun size={16} style={{ color: 'var(--ces-gold)' }} />}
          {theme === 'galactic' && <Sparkles size={16} style={{ color: 'var(--ces-gold)' }} />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleNotifOpen}
            className="ces-tb-btn relative flex items-center justify-center transition-colors"
            style={{ width: '38px', height: '38px', borderRadius: '10px' }}
            title="Bildirişlər"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] grid place-items-center text-[10px] font-extrabold rounded-full px-1"
                style={{
                  background: 'var(--ces-danger)',
                  color: '#fff',
                  border: '2px solid var(--ces-surface)',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            {unreadCount === 0 && notifications.length > 0 && (
              <span
                className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--ces-ok)' }}
              />
            )}
          </button>

          {notifOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-[360px] z-50 flex flex-col"
              style={{
                background: 'var(--ces-surface)',
                border: '1px solid var(--ces-line)',
                borderRadius: '14px',
                boxShadow: 'var(--ces-shadow)',
                maxHeight: '460px',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ borderBottom: '1px solid var(--ces-line)' }}
              >
                <div>
                  <p className="text-[10px] font-bold tracking-[.16em] uppercase" style={{ color: 'var(--ces-gold)' }}>
                    Bildirişlər
                  </p>
                  <p className="text-[14px] font-bold" style={{ color: 'var(--ces-ink)' }}>
                    {notifications.length === 0 ? 'Sakitlik' : `${notifications.length} bildiriş`}
                  </p>
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={clear}
                    className="flex items-center gap-1 text-[12px] font-semibold transition-colors"
                    style={{ color: 'var(--ces-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ces-danger)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ces-muted)')}
                    title="Hamısını sil"
                  >
                    <CheckCheck size={13} />
                    Təmizlə
                  </button>
                )}
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1 scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="py-10 px-4 text-center">
                    <div
                      className="w-12 h-12 rounded-2xl mx-auto mb-3 grid place-items-center"
                      style={{ background: 'var(--ces-graphite-50)' }}
                    >
                      <Bell size={20} style={{ color: 'var(--ces-mute2)' }} />
                    </div>
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--ces-ink)' }}>
                      Yeni bildiriş yoxdur
                    </p>
                    <p className="text-[12px] mt-1" style={{ color: 'var(--ces-muted)' }}>
                      Hər şey nəzarət altındadır
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex gap-3 px-4 py-3 transition-colors"
                      style={{
                        borderBottom: '1px solid var(--ces-line-2)',
                        background: !n.read ? 'rgba(200,147,42,.04)' : 'transparent',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ces-graphite-50)')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = !n.read ? 'rgba(200,147,42,.04)' : 'transparent')
                      }
                    >
                      <div
                        className="flex-none w-8 h-8 rounded-lg grid place-items-center"
                        style={{ background: NOTIF_BG[n.type] || 'var(--ces-graphite-50)' }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: NOTIF_DOT[n.type] || 'var(--ces-mute2)' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold truncate" style={{ color: 'var(--ces-ink)' }}>
                          {n.title}
                        </p>
                        <p
                          className="text-[12px] mt-0.5 leading-snug"
                          style={{ color: 'var(--ces-muted)' }}
                        >
                          {n.message}
                        </p>
                        <p className="text-[10.5px] mt-1.5 font-mono" style={{ color: 'var(--ces-mute2)' }}>
                          {fmtTime(n.timestamp)}
                        </p>
                      </div>
                      {!n.read && (
                        <span
                          className="flex-none w-1.5 h-1.5 rounded-full mt-2"
                          style={{ background: 'var(--ces-gold)' }}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div
          className="hidden sm:block h-7 w-px mx-1"
          style={{ background: 'var(--ces-line)' }}
        />

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserOpen((v) => !v)}
            className="ces-tb-user flex items-center gap-2.5 pl-1 pr-2.5 transition-colors"
            style={{
              height: '38px',
              borderRadius: '10px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ces-graphite-50)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <UserAvatar user={user} size={32} />
            <div className="hidden md:block text-left">
              <p className="text-[12px] font-bold leading-none" style={{ color: 'var(--ces-ink)' }}>
                {user?.fullName || user?.username || 'İstifadəçi'}
              </p>
              <p
                className="text-[10px] mt-0.5 leading-none uppercase tracking-[.06em]"
                style={{ color: 'var(--ces-muted)' }}
              >
                {user?.role || user?.email?.split('@')[0] || 'Operator'}
              </p>
            </div>
            <ChevronDown size={12} className="hidden md:block" style={{ color: 'var(--ces-mute2)' }} />
          </button>

          {userOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-[240px] z-50"
              style={{
                background: 'var(--ces-surface)',
                border: '1px solid var(--ces-line)',
                borderRadius: '14px',
                boxShadow: 'var(--ces-shadow)',
              }}
            >
              <div
                className="px-4 py-3"
                style={{ borderBottom: '1px solid var(--ces-line)' }}
              >
                <div className="flex items-center gap-2.5">
                  <UserAvatar user={user} size={40} fallbackBg="var(--ces-gold)" fallbackFg="var(--ces-graphite)" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold truncate" style={{ color: 'var(--ces-ink)' }}>
                      {user?.fullName || user?.username}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--ces-muted)' }}>
                      {user?.email || '—'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <button
                  onClick={() => { setUserOpen(false); navigate('/profile') }}
                  className="ces-tb-menu-item w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] transition-colors text-[13px] font-medium"
                  style={{ color: 'var(--ces-ink)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ces-graphite-50)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <UserIcon size={14} style={{ color: 'var(--ces-muted)' }} />
                  Profil ayarları
                </button>
                <button
                  onClick={logout}
                  className="ces-tb-menu-item w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] transition-colors text-[13px] font-medium"
                  style={{ color: 'var(--ces-danger)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(212,56,90,.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <LogOut size={14} />
                  Çıxış
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
