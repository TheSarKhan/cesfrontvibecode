import { useState, useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { NAV_ITEMS, NAV_SECTIONS } from '../../constants/navigation'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { dashboardApi } from '../../api/dashboard'
import UserAvatar from '../common/UserAvatar'

/* ─────────────────────────────────────────────────────
   CES ERP Sidebar — UI Kit `.sidebar-demo` pattern
   • Graphite bg, gold active state, white-78 idle items
   • Section labels (.sd-lab) for grouping
   • Collapsible to 76px (icon-only)
───────────────────────────────────────────────────── */
export default function Sidebar({ collapsed, onToggle }) {
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const [pendingCount, setPendingCount] = useState(0)
  const approvalQueueVersion = useNotificationStore((s) => s.approvalQueueVersion)

  useEffect(() => {
    dashboardApi.getStats()
      .then(r => setPendingCount(r.data?.data?.pendingApprovals ?? r.data?.pendingApprovals ?? 0))
      .catch(() => {})
  }, [approvalQueueVersion])

  const grouped = useMemo(() => {
    const allowed = NAV_ITEMS.filter((item) => !item.module || hasPermission(item.module))
    return NAV_SECTIONS
      .map((sec) => ({ ...sec, items: allowed.filter((i) => i.section === sec.key) }))
      .filter((sec) => sec.items.length > 0)
  }, [hasPermission])

  return (
    <aside
      className="ces-sidebar ces-font flex flex-col h-screen shrink-0 transition-all duration-300"
      style={{
        width: collapsed ? '76px' : '260px',
        background: 'var(--ces-bg)',
        borderRight: '1px solid var(--ces-line)',
        color: 'var(--ces-graphite)',
      }}
    >
      {/* ─── Brand block (.sd-brand) ─── */}
      <div
        className="flex items-center gap-2.5 px-3 pt-4 pb-4"
        style={{ borderBottom: '1px solid var(--ces-line)' }}
      >
        <div
          className="flex-none grid place-items-center p-1"
          style={{
            width: '42px',
            height: '42px',
            background: 'var(--ces-graphite)',
            borderRadius: '9px',
          }}
        >
          <img
            src="/e8e0f0a3bd7902466f6cdf7793af03199b95dce7 (1).png"
            alt="CES"
            className="w-full h-full object-contain"
          />
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div
              className="text-[11.5px] font-extrabold leading-[1.18] uppercase tracking-[.02em]"
              style={{ color: 'var(--ces-ink)' }}
            >
              CONSTRUCTION<br />
              <span style={{ color: 'var(--ces-gold-700)' }}>EQUIPMENT</span> SERVICES
            </div>
          </div>
        )}

        {!collapsed && (
          <button
            onClick={onToggle}
            className="ces-sb-toggle flex-none w-7 h-7 grid place-items-center rounded-md transition-colors"
            title="Yığ"
          >
            <ChevronLeft size={15} />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={onToggle}
          className="ces-sb-toggle mx-3 mt-3 h-8 grid place-items-center rounded-md transition-colors"
          title="Aç"
        >
          <ChevronRight size={15} />
        </button>
      )}

      {/* ─── Nav sections ─── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 scrollbar-thin">
        {grouped.map((section, sIdx) => (
          <div
            key={section.key}
            className={clsx('flex flex-col gap-0.5', sIdx > 0 && 'mt-4')}
          >
            {!collapsed && (
              <span
                className="text-[10px] font-bold uppercase px-[10px] pt-[6px] pb-1"
                style={{
                  color: 'var(--ces-mute2)',
                  letterSpacing: '.16em',
                }}
              >
                {section.label}
              </span>
            )}

            {collapsed && sIdx > 0 && (
              <div
                className="mx-2 my-2 h-px"
                style={{ background: 'var(--ces-line)' }}
              />
            )}

            {section.items.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                collapsed={collapsed}
                pendingCount={item.id === 'approval' ? pendingCount : 0}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* ─── User + logout ─── */}
      <div
        className="px-3 py-3"
        style={{ borderTop: '1px solid var(--ces-line)' }}
      >
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <UserAvatar user={user} size={36} fallbackBg="var(--ces-gold)" fallbackFg="var(--ces-on-gold)" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold truncate" style={{ color: 'var(--ces-ink)' }}>
                {user?.fullName || user?.username}
              </p>
              <p
                className="text-[10.5px] truncate uppercase tracking-[.04em]"
                style={{ color: 'var(--ces-muted)' }}
              >
                {user?.email || 'staff@ces.az'}
              </p>
            </div>
            <button
              onClick={logout}
              className="ces-sb-logout flex-none w-8 h-8 grid place-items-center rounded-md transition-colors"
              title="Çıxış"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="ces-sb-logout w-full h-10 grid place-items-center rounded-md transition-colors"
            title="Çıxış"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  )
}

/* ──────── Nav item — .sd-item / .sd-item.active pattern ──────── */
function NavItem({ item, collapsed, pendingCount }) {
  const Icon = item.icon

  if (item.comingSoon) {
    return (
      <div
        title={collapsed ? `${item.label} (tezliklə)` : 'Bu modul gələcəkdə əlavə olunacaq'}
        className="ces-sb-item-disabled flex items-center gap-[11px] rounded-[9px] select-none cursor-not-allowed"
        style={{
          padding: collapsed ? '10px' : '10px 12px',
          color: 'var(--ces-mute2)',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <Icon size={18} className="shrink-0" />
        {!collapsed && (
          <>
            <span className="truncate text-[13.5px] font-medium">{item.label}</span>
            <span
              className="ml-auto text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
              style={{
                background: 'var(--ces-gold-100)',
                color: 'var(--ces-gold-700)',
                border: '1px solid rgba(200,147,42,.28)',
              }}
            >
              Tezliklə
            </span>
          </>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        clsx(
          'ces-sb-item relative flex items-center gap-[11px] rounded-[9px] text-[13.5px] transition-colors',
          isActive && 'is-active',
          collapsed && 'justify-center'
        )
      }
      style={{ padding: collapsed ? '10px' : '10px 12px' }}
    >
      {({ isActive }) => (
        <>
          <Icon size={18} className="shrink-0" />
          {!collapsed && (
            <span className="truncate" style={{ fontWeight: isActive ? 700 : 500 }}>
              {item.label}
            </span>
          )}
          {!collapsed && pendingCount > 0 && (
            <span
              className="ml-auto text-[11px] font-bold rounded-full px-2 py-[1px]"
              style={{
                background: isActive ? 'rgba(0,0,0,.18)' : 'var(--ces-graphite-100)',
                color: isActive ? 'var(--ces-on-gold)' : 'var(--ces-ink)',
              }}
            >
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
          {collapsed && pendingCount > 0 && (
            <span
              className="absolute top-0.5 right-0.5 min-w-[16px] h-4 grid place-items-center text-[9px] font-extrabold rounded-full px-1"
              style={{
                background: 'var(--ces-danger)',
                color: '#fff',
              }}
            >
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}
