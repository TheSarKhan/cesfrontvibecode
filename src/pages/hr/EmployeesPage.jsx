import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search, Users, Eye, FileDown } from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import { departmentsApi } from '../../api/departments'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'
import EmployeeModal from './EmployeeModal'
import EmployeeSlideOver from './EmployeeSlideOver'
import Pagination from '../../components/common/Pagination'

const STATUS_CONFIG = {
  ACTIVE:     { label: 'Aktiv',         cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400' },
  ON_LEAVE:   { label: 'Məzuniyyətdə',  cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400' },
  TERMINATED: { label: 'İşdən çıxıb',   cls: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400' },
}

const fmt = (n) => Number(n ?? 0).toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function EmployeesPage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('HR_MANAGEMENT', 'canPost')
  const canEdit = hasPermission('HR_MANAGEMENT', 'canPut')
  const canDelete = hasPermission('HR_MANAGEMENT', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()


  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, editing: null })
  const [slideOver, setSlideOver] = useState(null)
  const [positions, setPositions] = useState([])
  const [departments, setDepartments] = useState([])

  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') || ''
  const statusFilter = searchParams.get('status') || ''
  const page = Number(searchParams.get('page') || '0')
  const size = Number(searchParams.get('size') || '15')

  const setSearch = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('q', v) : n.delete('q'); n.delete('page'); return n }, { replace: true })
  const setStatus = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('status', v) : n.delete('status'); n.delete('page'); return n }, { replace: true })
  const setPage = (p) => setSearchParams(prev => { const n = new URLSearchParams(prev); p > 0 ? n.set('page', String(p)) : n.delete('page'); return n }, { replace: true })
  const setPageSize = (s) => setSearchParams(prev => { const n = new URLSearchParams(prev); s !== 15 ? n.set('size', String(s)) : n.delete('size'); n.delete('page'); return n }, { replace: true })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, size, ...(search && { q: search }), ...(statusFilter && { status: statusFilter }) }
      const res = await hrApi.getEmployeesPaged(params)
      setData(res.data.data || res.data)
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'İşçilər yüklənmədi')
    } finally { setLoading(false) }
  }, [page, size, search, statusFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    hrApi.getPositions().then(r => setPositions(r.data?.data ?? r.data ?? [])).catch(() => {})
    departmentsApi.getAll().then(r => setDepartments(r.data?.data ?? r.data ?? [])).catch(() => {})
  }, [])

  const handleDelete = async (e) => {
    if (!(await confirm({ title: 'İşçini sil', message: `"${e.fullName}" işçisini silmək istəyirsiniz?` }))) return
    try {
      await hrApi.deleteEmployee(e.id)
      toast.success('İşçi silindi')
      load()
    } catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Silmə uğursuz oldu') }
  }

  const handleTerminate = async (e) => {
    const reason = window.prompt('İşdən çıxma səbəbi:')
    if (reason === null) return
    try {
      await hrApi.terminateEmployee(e.id, { reason, terminationDate: new Date().toISOString().slice(0, 10) })
      toast.success('İşçi işdən çıxarıldı')
      load()
    } catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Əməliyyat uğursuz oldu') }
  }

  const exportExcel = () => {
    const rows = data.content.map(e => ({
      'Kod': e.employeeCode || '',
      'Ad Soyad': e.fullName || '',
      'FİN': e.fin || '',
      'Vəzifə': e.positionName || '',
      'Şöbə': e.departmentName || '',
      'Əməkhaqqı (Gross)': e.grossSalary || 0,
      'Telefon': e.phone || '',
      'Email': e.email || '',
      'İşə qəbul': e.hireDate || '',
      'Status': STATUS_CONFIG[e.status]?.label || e.status,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [12, 25, 14, 18, 18, 14, 14, 22, 12, 14].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'İşçilər')
    XLSX.writeFile(wb, 'isciler.xlsx')
  }

  return (
    <div>
      <ConfirmDialog />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Users size={22} className="text-amber-600" />
            İşçilər
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{data.totalElements} işçi</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/hr')}
            className="px-3 py-2 text-xs font-medium text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50"
          >
            ← HR
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50"
          >
            <FileDown size={13} /> Excel
          </button>
          {canCreate && (
            <button
              onClick={() => setModal({ open: true, editing: null })}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              <Plus size={16} /> Yeni işçi
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, soyad, FİN, kod..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
        >
          <option value="">Bütün statuslar</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium">Kod</th>
                <th className="px-3 py-2.5 text-left font-medium">Ad Soyad</th>
                <th className="px-3 py-2.5 text-left font-medium">FİN</th>
                <th className="px-3 py-2.5 text-left font-medium">Vəzifə</th>
                <th className="px-3 py-2.5 text-left font-medium">Şöbə</th>
                <th className="px-3 py-2.5 text-right font-medium">Əməkhaqqı (₼)</th>
                <th className="px-3 py-2.5 text-left font-medium">Status</th>
                <th className="px-3 py-2.5 text-right font-medium w-[120px]">Əməliyyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-gray-400">Yüklənir...</td></tr>
              ) : data.content.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-gray-400">İşçi tapılmadı</td></tr>
              ) : data.content.map(e => {
                const s = STATUS_CONFIG[e.status] || { label: e.status, cls: 'bg-gray-100 text-gray-500 border-gray-200' }
                return (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => setSlideOver(e)}>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{e.employeeCode || '—'}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-800 dark:text-gray-100">{e.fullName}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{e.fin || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{e.positionName || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{e.departmentName || '—'}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-800 dark:text-gray-100">{fmt(e.grossSalary)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${s.cls}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right" onClick={(ev) => ev.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSlideOver(e)}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700"
                          title="Bax"
                        ><Eye size={14} /></button>
                        {canEdit && (
                          <button
                            onClick={() => setModal({ open: true, editing: e })}
                            className="p-1.5 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600"
                            title="Redaktə et"
                          ><Pencil size={14} /></button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(e)}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                            title="Sil"
                          ><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {data.totalPages > 0 && (
          <Pagination
            page={data.page + 1}
            pageSize={data.size}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            onPage={(p) => setPage(p - 1)}
            onPageSize={(s) => setPageSize(s)}
          />
        )}
      </div>

      {modal.open && (
        <EmployeeModal
          editing={modal.editing}
          positions={positions}
          departments={departments}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => { setModal({ open: false, editing: null }); load() }}
        />
      )}

      {slideOver && (
        <EmployeeSlideOver
          employee={slideOver}
          onClose={() => setSlideOver(null)}
          onEdit={() => { setModal({ open: true, editing: slideOver }); setSlideOver(null) }}
          onTerminate={() => handleTerminate(slideOver)}
        />
      )}
    </div>
  )
}
