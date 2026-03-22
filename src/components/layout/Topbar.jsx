import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { useNotificationStore } from '../../store/notificationStore'
import { Bell, User, Moon, Sun, Search, CheckCheck } from 'lucide-react'
import { clsx } from 'clsx'

const TYPE_CLS = {
  SUCCESS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  INFO:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  WARNING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}
const TYPE_DOT = {
  SUCCESS: 'bg-green-500',
  INFO:    'bg-blue-500',
  WARNING: 'bg-amber-500',
}

function fmtTime(timestamp) {
  if (!timestamp) return ''
  try {
    const d = new Date(timestamp)
    return d.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

export default function Topbar({ pageTitle, onSearchOpen }) {
  const user = useAuthStore((s) => s.user)
  const { isDark, toggleTheme } = useThemeStore()
  const { notifications, unreadCount, markAllRead, clear } = useNotificationStore()

  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Kənara klikdə bağla
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    setOpen((v) => !v)
    if (!open && unreadCount > 0) markAllRead()
  }

  return (
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 shrink-0 transition-colors print:hidden">
      <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">{pageTitle}</h1>

      <div className="flex items-center gap-3">
        {/* Axtarış */}
        <button
          onClick={onSearchOpen}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
        >
          <Search size={13} />
          <span className="hidden sm:inline text-gray-500">Axtar...</span>
          <kbd className="hidden sm:inline text-[10px] font-mono bg-white dark:bg-gray-900 px-1 py-0.5 rounded border border-gray-200 dark:border-gray-600">Ctrl+K</kbd>
        </button>

        {/* Tema */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={isDark ? 'Gündüz modu' : 'Gecə modu'}
        >
          {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-gray-500" />}
        </button>

        {/* Bildirişlər */}
        <div className="relative" ref={ref}>
          <button
            onClick={handleOpen}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Bildirişlər"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            {unreadCount === 0 && notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full" />
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col max-h-[420px]">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Bildirişlər</span>
                {notifications.length > 0 && (
                  <button
                    onClick={clear}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                    title="Hamısını sil"
                  >
                    <CheckCheck size={13} />
                    Təmizlə
                  </button>
                )}
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <Bell size={28} className="text-gray-200 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Bildiriş yoxdur</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={clsx(
                        'flex gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-700/50',
                        !n.read && 'bg-blue-50/40 dark:bg-blue-900/10'
                      )}
                    >
                      <span className={clsx('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', TYPE_DOT[n.type] || 'bg-gray-400')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{n.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">{fmtTime(n.timestamp)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* İstifadəçi */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
            <User size={15} className="text-white" />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">
            {user?.fullName || user?.username}
          </span>
        </div>
      </div>
    </header>
  )
}
