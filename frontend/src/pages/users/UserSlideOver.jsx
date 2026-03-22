import { useState } from 'react'
import { X, Pencil, Trash2, User, Shield, History, Phone, Mail, Building2, Calendar, Clock, ToggleLeft, ToggleRight } from 'lucide-react'
import { clsx } from 'clsx'
import ActivityFeed from '../../components/common/ActivityFeed'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#ec4899',
  '#6366f1', '#14b8a6', '#f43f5e', '#f59e0b',
]

const TABS = [
  { id: 'info',        label: 'Məlumat',   icon: User },
  { id: 'permissions', label: 'İcazələr',  icon: Shield },
  { id: 'history',     label: 'Tarixçə',   icon: History },
]

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <Icon size={14} className="text-gray-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-gray-800 dark:text-gray-200">{value}</p>
      </div>
    </div>
  )
}

const fmt = (d) => d ? new Date(d).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null

export default function UserSlideOver({ user, onClose, onEdit, onDelete, onToggleActive }) {
  const [tab, setTab] = useState('info')
  useEscapeKey(onClose)

  const permissions = user.permissions || user.rolePermissions || []

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ backgroundColor: AVATAR_COLORS[user.id % AVATAR_COLORS.length] }}
          >
            {user.fullName?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 truncate">{user.fullName}</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {user.roleName && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                  {user.roleName}
                </span>
              )}
              <span className={clsx(
                'px-1.5 py-0.5 rounded text-[10px] font-semibold border',
                user.active
                  ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                  : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
              )}>
                {user.active ? 'Aktiv' : 'Deaktiv'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onToggleActive && (
              <button
                onClick={onToggleActive}
                className={clsx(
                  'p-1.5 rounded-lg transition-colors',
                  user.active
                    ? 'text-emerald-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-gray-400 hover:text-emerald-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                )}
                title={user.active ? 'Deaktiv et' : 'Aktiv et'}
              >
                {user.active ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
              </button>
            )}
            {onEdit && (
              <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Redaktə et">
                <Pencil size={15} />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Sil">
                <Trash2 size={15} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-1">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 px-4 pt-3 pb-0 border-b border-gray-100 dark:border-gray-800 shrink-0">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2',
                  tab === t.id
                    ? 'text-amber-600 border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                    : 'text-gray-400 dark:text-gray-500 border-transparent hover:text-gray-600 dark:hover:text-gray-300'
                )}
              >
                <Icon size={13} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Məlumat ── */}
          {tab === 'info' && (
            <div className="p-5 space-y-1">
              <InfoRow icon={Mail}      label="Email"     value={user.email} />
              <InfoRow icon={Phone}     label="Telefon"   value={user.phone} />
              <InfoRow icon={Building2} label="Şöbə"      value={user.departmentName} />
              <InfoRow icon={Shield}    label="Rol"       value={user.roleName} />
              <InfoRow icon={Calendar}  label="Yaradılma" value={fmt(user.createdAt)} />
              <InfoRow icon={Clock}     label="Son giriş" value={fmt(user.lastLoginAt)} />
            </div>
          )}

          {/* ── İcazələr ── */}
          {tab === 'permissions' && (
            <div className="p-5">
              {permissions.length > 0 ? (
                <div className="space-y-2">
                  {permissions.map((perm, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">{perm.moduleName || perm.moduleCode}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {perm.canGet && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800">Oxumaq</span>}
                        {perm.canPost && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800">Yazmaq</span>}
                        {perm.canPut && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Redaktə</span>}
                        {perm.canDelete && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">Silmək</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <Shield size={28} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">İcazə məlumatı mövcud deyil</p>
                  <p className="text-xs text-gray-400 mt-1">Rollar bölməsindən icazələri idarə edin</p>
                </div>
              )}
            </div>
          )}

          {/* ── Tarixçə ── */}
          {tab === 'history' && (
            <div className="p-4">
              <ActivityFeed entityType="USER" entityId={user.id} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
