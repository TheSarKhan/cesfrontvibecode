import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import CommandPalette from '../common/CommandPalette'
import MobileNav from './MobileNav'
import { NAV_ITEMS } from '../../constants/navigation'
import { useAuthStore } from '../../store/authStore'
import { useNotifications } from '../../hooks/useNotifications'

function getPageTitle(pathname) {
  const match = NAV_ITEMS.find((item) => pathname.startsWith(item.path))
  return match?.label ?? 'Dashboard'
}

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  useNotifications(!!user)

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="hidden sm:flex">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar pageTitle={getPageTitle(location.pathname)} onSearchOpen={() => setCmdOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 pb-16 sm:pb-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <MobileNav />
    </div>
  )
}
