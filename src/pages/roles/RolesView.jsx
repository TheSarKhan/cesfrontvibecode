import { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronDown, ChevronRight, Plus, Trash2, Pencil, Search } from 'lucide-react'
import { rolesApi } from '../../api/roles'
import { useAuthStore } from '../../store/authStore'
import RoleModal from './RoleModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'

const PERM_LABELS = [
  { key: 'canGet', label: 'Oxumaq' },
  { key: 'canPost', label: 'Yazmaq' },
  { key: 'canPut', label: 'Redaktə' },
  { key: 'canDelete', label: 'Silmək' },
]

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-emerald-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-rose-500',
]

function UserAvatar({ user }) {
  const name = user.fullName || ''
  const parts = name.trim().split(/\s+/)
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : (name[0] || '?').toUpperCase()
  const color = AVATAR_COLORS[user.id % AVATAR_COLORS.length]
  return (
    <div
      className={clsx(color, 'w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold ring-2 ring-white dark:ring-gray-800')}
      title={name}
    >
      {initials}
    </div>
  )
}

function AvatarStack({ users }) {
  if (!users.length) return <span className="text-xs text-gray-400 dark:text-gray-500">İstifadəçi yoxdur</span>
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {users.slice(0, 4).map((u) => <UserAvatar key={u.id} user={u} />)}
        {users.length > 4 && (
          <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 font-semibold ring-2 ring-white dark:ring-gray-800">
            +{users.length - 4}
          </div>
        )}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{users.length} nəfər</span>
    </div>
  )
}

function RoleRow({ role, users, onEdit, onDelete, canEdit, canDelete }) {
  const [expanded, setExpanded] = useState(false)
  const roleUsers = users.filter((u) => u.roleId === role.id)

  return (
    <>
      <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-amber-600 hover:text-amber-700 transition-colors"
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">{role.name}</span>
          </div>
        </td>
        <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{role.description || '—'}</td>
        <td className="py-3 px-4">
          <AvatarStack users={roleUsers} />
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-1 justify-end">
            {canEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
                title="Redaktə et"
              >
                <Pencil size={15} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"
                title="Sil"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </td>
      </tr>

      {expanded && role.permissions?.length > 0 && (
        role.permissions.map((perm) => (
          <tr key={perm.moduleId} className="bg-amber-50/40 dark:bg-amber-900/10 border-b border-amber-100/60 dark:border-amber-800/30">
            <td className="py-2 px-4 pl-10">
              <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{perm.moduleNameAz}</span>
            </td>
            <td className="py-2 px-4" colSpan={3}>
              <div className="flex items-center gap-6 flex-wrap">
                {PERM_LABELS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-1.5 cursor-default">
                    <input
                      type="checkbox"
                      readOnly
                      checked={perm[key]}
                      className="accent-amber-600 w-3.5 h-3.5 cursor-default"
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                  </label>
                ))}
                {perm.canSendToCoordinator && (
                  <label className="flex items-center gap-1.5 cursor-default">
                    <input type="checkbox" readOnly checked className="accent-purple-600 w-3.5 h-3.5 cursor-default" />
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Kordinatora göndər</span>
                  </label>
                )}
                {perm.canSubmitOffer && (
                  <label className="flex items-center gap-1.5 cursor-default">
                    <input type="checkbox" readOnly checked className="accent-purple-600 w-3.5 h-3.5 cursor-default" />
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Təklif göndər</span>
                  </label>
                )}
              </div>
            </td>
          </tr>
        ))
      )}

      {expanded && (!role.permissions || role.permissions.length === 0) && (
        <tr className="bg-amber-50/40 dark:bg-amber-900/10 border-b border-amber-100/60 dark:border-amber-800/30">
          <td colSpan={4} className="py-2 px-4 pl-10">
            <span className="text-xs text-gray-400 dark:text-gray-500">Bu rola heç bir icazə verilməyib</span>
          </td>
        </tr>
      )}
    </>
  )
}

export default function RolesView({ dept, users, departments, onBack }) {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('ROLE_PERMISSION', 'canPost')
  const canEdit   = hasPermission('ROLE_PERMISSION', 'canPut')
  const canDelete = hasPermission('ROLE_PERMISSION', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [roleModal, setRoleModal] = useState({ open: false, editing: null })
  const [search, setSearch] = useState('')
  const searchRef = useRef(null)

  usePageShortcuts({
    onNew: canCreate ? () => setRoleModal({ open: true, editing: null }) : undefined,
    searchRef,
  })

  const loadRoles = async () => {
    setLoading(true)
    try {
      const res = await rolesApi.getByDepartment(dept.id)
      setRoles(res.data.data || [])
    } catch {
      toast.error('Rollar yüklənmədi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRoles() }, [dept.id])

  const filtered = useMemo(() => {
    if (!search) return roles
    const q = search.toLowerCase()
    return roles.filter(r =>
      r.name?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q)
    )
  }, [roles, search])

  const handleDelete = async (role) => {
    if (!(await confirm({ title: 'Rolu sil', message: `"${role.name}" rolunu silmək istəyirsiniz?` }))) return
    try {
      await rolesApi.delete(role.id)
      toast.success('Rol silindi')
      loadRoles()
    } catch {
      toast.error('Silmə əməliyyatı uğursuz oldu')
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-amber-600 transition-colors"
        >
          <ChevronLeft size={16} />
          Şöbələr
        </button>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{dept.name}</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">İcazələrin tənzimlənməsi</h1>
          <p className="text-xs text-gray-400 mt-0.5">{roles.length} rol</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setRoleModal({ open: true, editing: null })}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Yeni rol əlavə et
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rol axtar..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rolun adı</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rolun təsviri</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">İstifadəçilər</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    {[1, 2, 3, 4].map((j) => (
                      <td key={j} className="py-3 px-4">
                        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                    {search ? 'Axtarış nəticəsi tapılmadı' : 'Bu şöbədə hələ rol yoxdur'}
                  </td>
                </tr>
              ) : (
                filtered.map((role) => (
                  <RoleRow
                    key={role.id}
                    role={role}
                    users={users}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onEdit={() => setRoleModal({ open: true, editing: role })}
                    onDelete={() => handleDelete(role)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {roleModal.open && (
        <RoleModal
          editing={roleModal.editing}
          currentDept={dept}
          departments={departments}
          onClose={() => setRoleModal({ open: false, editing: null })}
          onSaved={() => { setRoleModal({ open: false, editing: null }); loadRoles() }}
        />
      )}

      <ConfirmDialog />
    </div>
  )
}
