import { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, Search, Shield } from 'lucide-react'
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
      const [deptRes, userRes] = await Promise.all([
        departmentsApi.getAll(),
        usersApi.getAll(),
      ])
      const depts = deptRes.data.data || []
      setDepartments(depts)
      setUsers(userRes.data.data || [])

      // Load role counts for each department
      const counts = {}
      await Promise.all(depts.map(async (d) => {
        try {
          const res = await rolesApi.getByDepartment(d.id)
          counts[d.id] = (res.data.data || []).length
        } catch { counts[d.id] = 0 }
      }))
      setRoleCounts(counts)
    } catch {
      toast.error('Məlumatlar yüklənmədi')
    } finally {
      setLoading(false)
    }
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
      loadData()
    } catch (err) {
      if (err?.isPending) return
      toast.error(err?.response?.data?.message || 'Silmə əməliyyatı uğursuz oldu')
    }
  }

  // ── Roles view
  if (selectedDept) {
    return (
      <RolesView
        dept={selectedDept}
        users={users}
        departments={departments}
        onBack={() => { setSelectedDept(null); loadData() }}
      />
    )
  }

  // ── Departments view
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Rolların idarə edilməsi</h1>
          <p className="text-xs text-gray-400 mt-0.5">{departments.length} şöbə</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setDeptModal({ open: true, editing: null })}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Yeni şöbə
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
            placeholder="Şöbə axtar..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 h-32 animate-pulse">
              <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-1/2 mb-3" />
              <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/3 mb-4" />
              <div className="flex -space-x-2">
                {[1, 2, 3].map(j => <div key={j} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 ring-2 ring-white dark:ring-gray-800" />)}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Shield size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {search ? 'Axtarış nəticəsi tapılmadı' : 'Hələ heç bir şöbə yoxdur. Yeni şöbə əlavə edin.'}
          </p>
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
              onEdit={canEdit ? () => setDeptModal({ open: true, editing: dept }) : null}
              onDelete={canDelete ? () => handleDeleteDept(dept) : null}
            />
          ))}
        </div>
      )}

      {deptModal.open && (
        <DepartmentModal
          editing={deptModal.editing}
          onClose={() => setDeptModal({ open: false, editing: null })}
          onSaved={() => {
            setDeptModal({ open: false, editing: null })
            loadData()
          }}
        />
      )}
      <ConfirmDialog />
    </div>
  )
}
