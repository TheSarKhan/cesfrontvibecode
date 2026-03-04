import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { departmentsApi } from '../../api/departments'
import { usersApi } from '../../api/users'
import DepartmentCard from './DepartmentCard'
import DepartmentModal from './DepartmentModal'
import RolesView from './RolesView'
import toast from 'react-hot-toast'

export default function RolesPage() {
  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDept, setSelectedDept] = useState(null)
  const [deptModal, setDeptModal] = useState({ open: false, editing: null })

  const loadData = async () => {
    setLoading(true)
    try {
      const [deptRes, userRes] = await Promise.all([
        departmentsApi.getAll(),
        usersApi.getAll(),
      ])
      setDepartments(deptRes.data.data || [])
      setUsers(userRes.data.data || [])
    } catch {
      toast.error('Məlumatlar yüklənmədi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleDeleteDept = async (dept) => {
    if (!window.confirm(`"${dept.name}" şöbəsini silmək istəyirsiniz?`)) return
    try {
      await departmentsApi.delete(dept.id)
      toast.success('Şöbə silindi')
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Silmə əməliyyatı uğursuz oldu')
    }
  }

  // ── Roles view ──────────────────────────────────────────────
  if (selectedDept) {
    return (
      <RolesView
        dept={selectedDept}
        users={users}
        departments={departments}
        onBack={() => setSelectedDept(null)}
      />
    )
  }

  // ── Departments view ─────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">İcazələrin tənzimlənməsi</h2>
        <button
          onClick={() => setDeptModal({ open: true, editing: null })}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Yeni şöbə əlavə et
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-32 animate-pulse" />
          ))}
        </div>
      ) : departments.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          Hələ heç bir şöbə yoxdur. Yeni şöbə əlavə edin.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <DepartmentCard
              key={dept.id}
              dept={dept}
              users={users.filter((u) => u.departmentId === dept.id)}
              onSelect={() => setSelectedDept(dept)}
              onEdit={() => setDeptModal({ open: true, editing: dept })}
              onDelete={() => handleDeleteDept(dept)}
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
    </div>
  )
}
