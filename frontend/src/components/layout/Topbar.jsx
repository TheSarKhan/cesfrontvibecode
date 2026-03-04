import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { Bell, User, Moon, Sun } from 'lucide-react'

export default function Topbar({ pageTitle }) {
  const user = useAuthStore((s) => s.user)
  const { isDark, toggleTheme } = useThemeStore()

  return (
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 shrink-0 transition-colors">
      <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">{pageTitle}</h1>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={isDark ? 'Gündüz modu' : 'Gecə modu'}
        >
          {isDark ? (
            <Sun size={18} className="text-amber-400" />
          ) : (
            <Moon size={18} className="text-gray-500" />
          )}
        </button>

        <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative">
          <Bell size={18} className="text-gray-500 dark:text-gray-400" />
        </button>

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
