import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { NAV_ITEMS } from '../../constants/navigation'
import { useAuthStore } from '../../store/authStore'
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { dashboardApi } from '../../api/dashboard'

export default function Sidebar({ collapsed, onToggle }) {
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const fetch = () => dashboardApi.getStats().then(r => setPendingCount(r.data?.data?.pendingApprovals ?? r.data?.pendingApprovals ?? 0)).catch(() => {})
    fetch()
    const id = setInterval(fetch, 60000)
    return () => clearInterval(id)
  }, [])

  return (
    <aside
      className={clsx(
        'flex flex-col h-screen bg-gray-900 dark:bg-gray-950 text-white transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        {!collapsed && (
          <div>
            <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">CES</p>
            <p className="text-[10px] text-gray-400 leading-tight">Equipment ERP</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md hover:bg-gray-700 transition-colors ml-auto"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {NAV_ITEMS.filter((item) => !item.module || hasPermission(item.module)).map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )
              }
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {item.id === 'approval' && pendingCount > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 shrink-0">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className="border-t border-gray-700 px-4 py-3">
        {!collapsed && (
          <div className="mb-2">
            <p className="text-xs font-semibold truncate">{user?.fullName || user?.username}</p>
            <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-red-400 transition-colors w-full"
        >
          <LogOut size={15} className="shrink-0" />
          {!collapsed && 'Çıxış'}
        </button>
      </div>
    </aside>
  )
}
