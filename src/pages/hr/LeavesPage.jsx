import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Plus, CheckCircle2, X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'

const TYPES = [
  { v: 'ANNUAL', label: 'İllik' },
  { v: 'SICK', label: 'Xəstəlik' },
  { v: 'UNPAID', label: 'Ödənişsiz' },
  { v: 'MATERNITY', label: 'Dekret' },
  { v: 'BUSINESS_TRIP', label: 'Ezamiyyət' },
]
const STATUSES = {
  PENDING:   { label: 'Gözləyir',    cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  APPROVED:  { label: 'Təsdiqlənib', cls: 'bg-green-100 text-green-700 border-green-200' },
  REJECTED:  { label: 'Rədd edilib', cls: 'bg-red-100 text-red-700 border-red-200' },
  CANCELLED: { label: 'Ləğv edilib', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
}

export default function LeavesPage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('HR_MANAGEMENT', 'canPost')
  const canEdit = hasPermission('HR_MANAGEMENT', 'canPut')
  const canDelete = hasPermission('HR_MANAGEMENT', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [data, setData] = useState({ content: [], totalPages: 0, page: 0, totalElements: 0, size: 15 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [employees, setEmployees] = useState([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ employeeId: '', type: 'ANNUAL', startDate: '', endDate: '', reason: '' })

  const load = async () => {
    setLoading(true)
    try {
      const res = await hrApi.getLeavesPaged({ page: 0, size: 30, ...(statusFilter && { status: statusFilter }) })
      setData(res.data?.data ?? res.data)
    } catch { toast.error('Yüklənmədi') } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [statusFilter])
  useEffect(() => { hrApi.getEmployees().then(r => setEmployees((r.data?.data ?? r.data ?? []).filter(e => e.status !== 'TERMINATED'))).catch(() => {}) }, [])

  const submit = async () => {
    if (!form.employeeId || !form.startDate || !form.endDate) { toast.error('Bütün sahələri doldurun'); return }
    try {
      await hrApi.createLeave({ ...form, employeeId: Number(form.employeeId) })
      toast.success('Tələb yaradıldı')
      setCreating(false)
      setForm({ employeeId: '', type: 'ANNUAL', startDate: '', endDate: '', reason: '' })
      load()
    } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }

  const approve = async (l) => {
    try { await hrApi.approveLeave(l.id, {}); toast.success('Təsdiqləndi'); load() } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const reject = async (l) => {
    const note = window.prompt('Rədd səbəbi:')
    if (note === null) return
    try { await hrApi.rejectLeave(l.id, { note }); toast.success('Rədd edildi'); load() } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const cancel = async (l) => {
    if (!(await confirm({ title: 'Ləğv et' }))) return
    try { await hrApi.cancelLeave(l.id); toast.success('Ləğv edildi'); load() } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const remove = async (l) => {
    if (!(await confirm({ title: 'Sil' }))) return
    try { await hrApi.deleteLeave(l.id); toast.success('Silindi'); load() } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }

  return (
    <div>
      {ConfirmDialog}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <ClipboardList size={22} className="text-rose-600" />
            Məzuniyyət Tələbləri
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{data.totalElements} tələb</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/hr')} className="px-3 py-2 text-xs font-medium text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50">← HR</button>
          {canCreate && (
            <button onClick={() => setCreating(true)} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              <Plus size={16} /> Yeni tələb
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <option value="">Bütün statuslar</option>
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium">İşçi</th>
              <th className="px-3 py-2.5 text-left font-medium">Növ</th>
              <th className="px-3 py-2.5 text-left font-medium">Tarix</th>
              <th className="px-3 py-2.5 text-center font-medium">Gün</th>
              <th className="px-3 py-2.5 text-left font-medium">Səbəb</th>
              <th className="px-3 py-2.5 text-left font-medium">Status</th>
              <th className="px-3 py-2.5 text-right font-medium w-[140px]">Əməliyyat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? <tr><td colSpan={7} className="text-center py-6 text-gray-400">Yüklənir...</td></tr>
              : (data.content || []).length === 0 ? <tr><td colSpan={7} className="text-center py-6 text-gray-400">Tələb yoxdur</td></tr>
              : data.content.map(l => {
                const s = STATUSES[l.status] || { label: l.status, cls: 'bg-gray-100 text-gray-500' }
                const t = TYPES.find(x => x.v === l.type)?.label || l.type
                return (
                  <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-3 py-2.5 font-medium text-gray-800 dark:text-gray-100">{l.employeeFullName}</td>
                    <td className="px-3 py-2.5 text-gray-600">{t}</td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs">{l.startDate} → {l.endDate}</td>
                    <td className="px-3 py-2.5 text-center">{l.days}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs max-w-xs truncate" title={l.reason}>{l.reason || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && l.status === 'PENDING' && (
                          <>
                            <button onClick={() => approve(l)} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Təsdiqlə"><CheckCircle2 size={14} /></button>
                            <button onClick={() => reject(l)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Rədd et"><X size={14} /></button>
                          </>
                        )}
                        {canEdit && l.status === 'APPROVED' && new Date(l.startDate) > new Date() && (
                          <button onClick={() => cancel(l)} className="p-1.5 rounded hover:bg-amber-50 text-amber-600" title="Ləğv et"><X size={14} /></button>
                        )}
                        {canDelete && (
                          <button onClick={() => remove(l)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Sil"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setCreating(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">Yeni məzuniyyət tələbi</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">İşçi *</label>
                <select value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700">
                  <option value="">Seçin...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Növ *</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700">
                  {TYPES.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Başlanğıc *</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Bitmə *</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Səbəb</label>
                <textarea rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setCreating(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Ləğv</button>
              <button onClick={submit} className="px-5 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg">Yarat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
