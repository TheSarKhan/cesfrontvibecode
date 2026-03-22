import { useState, useEffect, useMemo } from 'react'
import { Eye, Clock, Check, XCircle, Pencil, Trash2, ClipboardCheck } from 'lucide-react'
import { approvalApi } from '../../api/approval'
import { useAuthStore } from '../../store/authStore'
import ApprovalDiffModal from './ApprovalDiffModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const MODULE_LABEL = {
  CUSTOMER_MANAGEMENT: 'Müştərilər',
  CONTRACTOR_MANAGEMENT: 'Podratçılar',
  INVESTORS: 'İnvestorlar',
  OPERATORS: 'Operatorlar',
  EMPLOYEE_MANAGEMENT: 'İşçilər',
  GARAGE: 'Qaraj',
  REQUESTS: 'Sorğular',
  COORDINATOR: 'Koordinator',
  PROJECTS: 'Layihələr',
  ACCOUNTING: 'Mühasibatlıq',
  SERVICE_MANAGEMENT: 'Texniki Servis',
}

const STATUS_CLS = {
  PENDING:  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  APPROVED: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  REJECTED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
}
const STATUS_LABEL = { PENDING: 'Gözləyir', APPROVED: 'Təsdiqləndi', REJECTED: 'Rədd edildi' }

const getOpLabel = (op) => {
  if (op.operationType === 'DELETE') return 'Silmə'
  if (op.moduleCode === 'COORDINATOR') return 'Təklif hazırlanması'
  return 'Redaktə'
}
const getOpCls = (op) => {
  if (op.operationType === 'DELETE') return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
  if (op.moduleCode === 'COORDINATOR') return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800'
  return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
}
const getOpIcon = (op) => op.operationType === 'DELETE' ? Trash2 : Pencil

export default function ApprovalPage() {
  const { user } = useAuthStore()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [deptFilter, setDeptFilter] = useState('ALL')
  const [selectedId, setSelectedId] = useState(null)

  const departments = useMemo(() => {
    return user?.approvalDepartments || []
  }, [user])

  const load = async () => {
    setLoading(true)
    try {
      const res = await approvalApi.getQueue()
      setItems(res.data.data || res.data || [])
    } catch {
      toast.error('Əməliyyatlar yüklənmədi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return items.filter(op => {
      const matchStatus = !statusFilter || op.status === statusFilter
      const matchDept = deptFilter === 'ALL' || op.performerDepartmentName === deptFilter || String(op.performerDepartmentId) === deptFilter
      return matchStatus && matchDept
    })
  }, [items, statusFilter, deptFilter])

  const pendingCount = items.filter(o => o.status === 'PENDING').length

  const deptOptions = useMemo(() => {
    const seen = new Map()
    items.forEach(op => {
      if (op.performerDepartmentId && op.performerDepartmentName) {
        seen.set(String(op.performerDepartmentId), op.performerDepartmentName)
      }
    })
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [items])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <ClipboardCheck size={20} className="text-amber-500" />
            Təsdiq Növbəsi
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {pendingCount > 0 ? `${pendingCount} gözləyən əməliyyat` : 'Gözləyən əməliyyat yoxdur'}
          </p>
        </div>
        <button
          onClick={load}
          className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
        >
          Yenilə
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Status filter */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-sm">
          {['', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx(
                'px-3 py-1.5 font-medium transition-colors',
                statusFilter === s
                  ? 'bg-amber-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              {s === '' ? 'Hamısı' : STATUS_LABEL[s]}
              {s === 'PENDING' && pendingCount > 0 && (
                <span className="ml-1.5 bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Department filter */}
        {deptOptions.length > 1 && (
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">Bütün şöbələr</option>
            {deptOptions.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Modul</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Əməliyyat</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Entity</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Şöbə</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Edən</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tarix</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                <th className="py-3 px-4 text-right" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="py-3 px-4">
                        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-gray-400">
                    {items.length === 0 ? 'Heç bir əməliyyat tapılmadı' : 'Filtrlərə uyğun nəticə yoxdur'}
                  </td>
                </tr>
              ) : (
                filtered.map(op => {
                  const OpIcon = getOpIcon(op)
                  return (
                    <tr
                      key={op.id}
                      className={clsx(
                        'border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors',
                        op.status === 'PENDING' && 'bg-amber-50/20 dark:bg-amber-900/5'
                      )}
                    >
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {MODULE_LABEL[op.moduleCode] || op.moduleCode}
                      </td>
                      <td className="py-3 px-4">
                        <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border', getOpCls(op))}>
                          <OpIcon size={10} />
                          {getOpLabel(op)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-800 dark:text-gray-200">
                        {op.entityLabel || `#${op.entityId}`}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                        {op.performerDepartmentName || '—'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                        {op.performedByName || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400 dark:text-gray-500">
                        {op.createdAt ? new Date(op.createdAt).toLocaleString('az-AZ') : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border', STATUS_CLS[op.status])}>
                          {op.status === 'PENDING' && <Clock size={10} />}
                          {op.status === 'APPROVED' && <Check size={10} />}
                          {op.status === 'REJECTED' && <XCircle size={10} />}
                          {STATUS_LABEL[op.status]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedId(op.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Eye size={12} />
                          Bax
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId && (
        <ApprovalDiffModal
          operationId={selectedId}
          onClose={() => setSelectedId(null)}
          onActionDone={() => {
            setSelectedId(null)
            load()
          }}
        />
      )}
    </div>
  )
}
