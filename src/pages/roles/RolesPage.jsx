import { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, Search, Shield, Building2 } from 'lucide-react'
import { departmentsApi } from '../../api/departments'
import { rolesApi } from '../../api/roles'
import { usersApi } from '../../api/users'
import { useAuthStore } from '../../store/authStore'
import DepartmentCard from './DepartmentCard'
import DepartmentModal from './DepartmentModal'
import RolesView from './RolesView'
import toast from 'react-hot-toast'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'

export default function RolesPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('ROLE_PERMISSION', 'canPost')
  const canEdit   = hasPermission('ROLE_PERMISSION', 'canPut')
  const canDelete = hasPermission('ROLE_PERMISSION', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
  const [roleCounts, setRoleCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedDept, setSelectedDept] = useState(null)
  const [deptModal, setDeptModal] = useState({ open: false, editing: null })
  const [search, setSearch] = useState('')
  const searchRef = useRef(null)

  usePageShortcuts({
    onNew: canCreate ? () => setDeptModal({ open: true, editing: null }) : undefined,
    searchRef,
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [deptRes, userRes, rolesRes] = await Promise.all([
        departmentsApi.getAll(),
        usersApi.getAll(),
        rolesApi.getAll(),
      ])
      const depts = deptRes.data.data || []
      const allRoles = rolesRes.data.data || []
      setDepartments(depts)
      setUsers(userRes.data.data || [])

      const counts = {}
      depts.forEach(d => { counts[d.id] = 0 })
      allRoles.forEach(r => {
        if (r.departmentId != null) counts[r.departmentId] = (counts[r.departmentId] || 0) + 1
      })
      setRoleCounts(counts)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const refreshRoleCount = async (deptId) => {
    try {
      const res = await rolesApi.getByDepartment(deptId)
      setRoleCounts(prev => ({ ...prev, [deptId]: (res.data.data || []).length }))
    } catch {}
  }

  useEffect(() => { loadData() }, [])

  const filtered = useMemo(() => {
    if (!search) return departments
    const q = search.toLowerCase()
    return departments.filter(d =>
      d.name?.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q)
    )
  }, [departments, search])

  const handleDeleteDept = async (dept) => {
    if (!(await confirm({ title: 'Şöbəni sil', message: `"${dept.name}" şöbəsini silmək istəyirsiniz?` }))) return
    try {
      await departmentsApi.delete(dept.id)
      toast.success('Şöbə silindi')
      setDepartments(prev => prev.filter(d => d.id !== dept.id))
      setRoleCounts(prev => { const next = { ...prev }; delete next[dept.id]; return next })
    } catch (err) {
      if (err?.isPending) return
    }
  }

  const totalRoles = Object.values(roleCounts).reduce((a, b) => a + b, 0)

  if (selectedDept) {
    return (
      <RolesView
        dept={selectedDept}
        users={users}
        departments={departments}
        onBack={() => { refreshRoleCount(selectedDept.id); setSelectedDept(null) }}
      />
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="ces-page-title">Rollar və İcazələr</h1>
          <p className="ces-page-sub">
            {departments.length} şöbə · {totalRoles} rol · {users.length} istifadəçi
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setDeptModal({ open: true, editing: null })}
            className="ces-btn ces-btn-primary"
          >
            <Plus size={16} />
            Yeni şöbə
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-5 flex">
        <div className="ces-input has-icon sm" style={{ maxWidth: 360, width: '100%' }}>
          <Search size={15} />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Şöbə axtar..."
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl"
              style={{
                background: 'var(--ces-graphite-50)',
                border: '1px solid var(--ces-line)',
                height: 148,
              }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="ces-card" style={{ padding: 56, textAlign: 'center' }}>
          <div className="inline-flex w-14 h-14 rounded-full mb-3 items-center justify-center" style={{ background: 'var(--ces-graphite-50)', color: 'var(--ces-mute2)' }}>
            <Building2 size={26} />
          </div>
          <h3 className="text-lg font-bold text-[var(--ces-ink)] m-0">
            {search ? 'Şöbə tapılmadı' : 'Hələ şöbə yoxdur'}
          </h3>
          <p className="text-sm text-[var(--ces-muted)] mt-1 mb-4">
            {search ? 'Axtarış şərtlərini dəyişin' : 'Başlamaq üçün yeni şöbə əlavə edin'}
          </p>
          {!search && canCreate && (
            <button
              onClick={() => setDeptModal({ open: true, editing: null })}
              className="ces-btn ces-btn-primary"
            >
              <Plus size={16} />
              Yeni şöbə
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((dept) => (
            <DepartmentCard
              key={dept.id}
              dept={dept}
              users={users.filter((u) => u.departmentId === dept.id)}
              roleCount={roleCounts[dept.id]}
              onSelect={() => setSelectedDept(dept)}
              onEdit={() => {
                if (!canEdit) { toast.error('Redaktə icazəniz yoxdur'); return }
                setDeptModal({ open: true, editing: dept })
              }}
              onDelete={canDelete ? () => handleDeleteDept(dept) : null}
            />
          ))}
        </div>
      )}

      {deptModal.open && (
        <DepartmentModal
          editing={deptModal.editing}
          onClose={() => setDeptModal({ open: false, editing: null })}
          onSaved={(newDept) => {
            setDeptModal({ open: false, editing: null })
            if (newDept) {
              setDepartments(prev => [...prev, newDept])
              setRoleCounts(prev => ({ ...prev, [newDept.id]: 0 }))
            }
          }}
        />
      )}
      <ConfirmDialog />
    </div>
  )
}
