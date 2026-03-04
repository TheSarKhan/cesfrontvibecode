import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronDown, ChevronRight, Plus, Trash2, Pencil, ShieldCheck } from 'lucide-react'
import { rolesApi } from '../../api/roles'
import RoleModal from './RoleModal'
import ApprovalModal from './ApprovalModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

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
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
  const color = AVATAR_COLORS[user.id % AVATAR_COLORS.length]
  return (
    <div className={clsx(color, 'w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold ring-2 ring-white')}>
      {initials}
    </div>
  )
}

function AvatarStack({ users }) {
  if (!users.length) return <span className="text-xs text-gray-400">İstifadəçi yoxdur</span>
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {users.slice(0, 4).map((u) => <UserAvatar key={u.id} user={u} />)}
        {users.length > 4 && (
          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500 font-semibold ring-2 ring-white">
            +{users.length - 4}
          </div>
        )}
      </div>
      <span className="text-xs text-gray-500">{users.length} nəfər</span>
    </div>
  )
}

function RoleRow({ role, users, onEdit, onDelete, onApproval }) {
  const [expanded, setExpanded] = useState(false)
  const roleUsers = users.filter((u) => u.roleId === role.id)

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-amber-600 hover:text-amber-700 transition-colors"
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            <span className="font-medium text-gray-800 text-sm">{role.name}</span>
          </div>
        </td>
        <td className="py-3 px-4 text-sm text-gray-500">{role.description || '—'}</td>
        <td className="py-3 px-4">
          <AvatarStack users={roleUsers} />
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={() => onApproval(role, roleUsers)}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-amber-600 transition-colors"
              title="Approval idarəetməsi"
            >
              <ShieldCheck size={15} />
            </button>
            <button
              onClick={onEdit}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-amber-600 transition-colors"
              title="Redaktə et"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
              title="Sil"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </td>
      </tr>

      {expanded && role.permissions?.length > 0 && (
        role.permissions.map((perm) => (
          <tr key={perm.moduleId} className="bg-amber-50/40 border-b border-amber-100/60">
            <td className="py-2 px-4 pl-10">
              <span className="text-xs text-gray-600 font-medium">{perm.moduleNameAz}</span>
            </td>
            <td className="py-2 px-4" colSpan={3}>
              <div className="flex items-center gap-6">
                {PERM_LABELS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-1.5 cursor-default">
                    <input
                      type="checkbox"
                      readOnly
                      checked={perm[key]}
                      className="accent-amber-600 w-3.5 h-3.5 cursor-default"
                    />
                    <span className="text-xs text-gray-600">{label}</span>
                  </label>
                ))}
              </div>
            </td>
          </tr>
        ))
      )}

      {expanded && (!role.permissions || role.permissions.length === 0) && (
        <tr className="bg-amber-50/40 border-b border-amber-100/60">
          <td colSpan={4} className="py-2 px-4 pl-10">
            <span className="text-xs text-gray-400">Bu rola heç bir icazə verilməyib</span>
          </td>
        </tr>
      )}
    </>
  )
}

export default function RolesView({ dept, users, departments, onBack }) {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [roleModal, setRoleModal] = useState({ open: false, editing: null })
  const [approvalModal, setApprovalModal] = useState({ open: false, role: null, roleUsers: [] })

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

  const handleDelete = async (role) => {
    if (!window.confirm(`"${role.name}" rolunu silmək istəyirsiniz?`)) return
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
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-700">{dept.name}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">İcazələrin tənzimlənməsi</h2>
        <button
          onClick={() => setRoleModal({ open: true, editing: null })}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Yeni rol əlavə et
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rolun adı</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rolun təsviri</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">İstifadəçilər</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {[1, 2, 3, 4].map((j) => (
                    <td key={j} className="py-3 px-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : roles.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-sm text-gray-400">
                  Bu şöbədə hələ rol yoxdur
                </td>
              </tr>
            ) : (
              roles.map((role) => (
                <RoleRow
                  key={role.id}
                  role={role}
                  users={users}
                  onEdit={() => setRoleModal({ open: true, editing: role })}
                  onDelete={() => handleDelete(role)}
                  onApproval={(role, roleUsers) => setApprovalModal({ open: true, role, roleUsers })}
                />
              ))
            )}
          </tbody>
        </table>
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

      {approvalModal.open && (
        <ApprovalModal
          role={approvalModal.role}
          roleUsers={approvalModal.roleUsers}
          departments={departments}
          onClose={() => setApprovalModal({ open: false, role: null, roleUsers: [] })}
        />
      )}
    </div>
  )
}
