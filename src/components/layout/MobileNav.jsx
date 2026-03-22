import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuthStore } from '../../store/authStore'
import {
  LayoutDashboard, Building2, ClipboardList,
  FolderKanban, Truck
} from 'lucide-react'

// Show only the 5 most important nav items on mobile
const MOBILE_NAV = [
  { id: 'dashboard', label: 'Panel', path: '/', icon: LayoutDashboard },
  { id: 'customers', label: 'Müştəri', path: '/customers', icon: Building2, module: 'CUSTOMER_MANAGEMENT' },
  { id: 'requests', label: 'Sorğular', path: '/requests', icon: ClipboardList, module: 'REQUESTS' },
  { id: 'projects', label: 'Layihə', path: '/projects', icon: FolderKanban, module: 'PROJECTS' },
  { id: 'garage', label: 'Qaraj', path: '/garage', icon: Truck, module: 'GARAGE' },
]

export default function MobileNav() {
  const hasPermission = useAuthStore(s => s.hasPermission)
  const visible = MOBILE_NAV.filter(item => !item.module || hasPermission(item.module))

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex sm:hidden print:hidden">
      {visible.map(item => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => clsx(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors',
              isActive
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-400 dark:text-gray-500'
            )}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
