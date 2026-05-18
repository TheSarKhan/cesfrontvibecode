import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar, FileText, CheckCircle2, DollarSign, RotateCw, Trash2, Calculator } from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'

const STATUS_CONFIG = {
  DRAFT:    { label: 'Layihə',     cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  APPROVED: { label: 'Təsdiqlənib', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  PAID:     { label: 'Ödənilib',    cls: 'bg-green-100 text-green-700 border-green-200' },
}

const AZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']

const fmt = (n) => Number(n ?? 0).toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function PayrollListPage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('HR_MANAGEMENT', 'canPost')
  const canEdit = hasPermission('HR_MANAGEMENT', 'canPut')
  const canDelete = hasPermission('HR_MANAGEMENT', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const today = new Date()
  const [newPeriod, setNewPeriod] = useState({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    workingDaysInMonth: 22,
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await hrApi.getPeriods()
      setPeriods(res.data?.data ?? res.data ?? [])
    } catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Dövrlər yüklənmədi') } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!canCreate) return
    try {
      const res = await hrApi.createPeriod(newPeriod, true)
      toast.success('Dövr yaradıldı')
      const created = res.data?.data ?? res.data
      navigate(`/hr/payroll/${created.id}`)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Yaradıla bilmədi')
    } finally { setCreating(false) }
  }

  const handleApprove = async (p) => {
    if (!(await confirm({ title: 'Dövrü təsdiqlə', message: `${AZ_MONTHS[p.month - 1]} ${p.year} dövrünü təsdiqləmək istəyirsiniz?` }))) return
    try { await hrApi.approvePeriod(p.id); toast.success('Təsdiqləndi'); load() } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const handleMarkPaid = async (p) => {
    if (!(await confirm({ title: 'Ödənmiş kimi qeyd et', message: `${AZ_MONTHS[p.month - 1]} ${p.year} ödənildiyini qeyd edirsiniz?` }))) return
    try { await hrApi.markPeriodPaid(p.id); toast.success('Ödənmiş kimi qeyd edildi'); load() } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const handleReopen = async (p) => {
    if (!(await confirm({ title: 'Yenidən aç', message: 'Dövrü DRAFT statusuna geri qaytarın?' }))) return
    try { await hrApi.reopenPeriod(p.id); toast.success('Dövr yenidən açıldı'); load() } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const handleDelete = async (p) => {
    if (!(await confirm({ title: 'Dövrü sil', message: 'Bu dövr və bütün hesablamaları silinəcək.' }))) return
    try { await hrApi.deletePeriod(p.id); toast.success('Silindi'); load() } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const downloadPdf = async (p) => {
    try {
      const res = await hrApi.downloadPeriodPdf(p.id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
    } catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'PDF endirilə bilmədi') }
  }

  return (
    <div>
      <ConfirmDialog />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Calculator size={22} className="text-emerald-600" />
            Əməkhaqqı Cədvəlləri
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Aylıq əməkhaqqı dövrləri</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/hr')} className="px-3 py-2 text-xs font-medium text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50">
            ← HR
          </button>
          {canCreate && (
            <button onClick={() => setCreating(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              <Plus size={16} /> Yeni dövr
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium">Dövr</th>
              <th className="px-3 py-2.5 text-center font-medium">İşçi</th>
              <th className="px-3 py-2.5 text-right font-medium">Gross</th>
              <th className="px-3 py-2.5 text-right font-medium">Tutulan</th>
              <th className="px-3 py-2.5 text-right font-medium">Ödəniləcək</th>
              <th className="px-3 py-2.5 text-right font-medium">Şirkət xərci</th>
              <th className="px-3 py-2.5 text-left font-medium">Status</th>
              <th className="px-3 py-2.5 text-right font-medium">Əməliyyat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-gray-400">Yüklənir...</td></tr>
            ) : periods.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-gray-400">Hələ heç bir dövr yoxdur</td></tr>
            ) : periods.map(p => {
              const s = STATUS_CONFIG[p.status] || { label: p.status, cls: 'bg-gray-100 text-gray-500' }
              const totalCompanyCost = (Number(p.totalGross || 0) + Number(p.totalEmployerContributions || 0))
              return (
                <tr
                  key={p.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => navigate(`/hr/payroll/${p.id}`)}
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-emerald-600" />
                      <span className="font-semibold text-gray-800 dark:text-gray-100">{p.label}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center text-gray-600 dark:text-gray-300">{p.entryCount || 0}</td>
                  <td className="px-3 py-3 text-right font-medium text-gray-800 dark:text-gray-100">{fmt(p.totalGross)}</td>
                  <td className="px-3 py-3 text-right text-rose-600">{fmt(p.totalEmployeeDeductions)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">{fmt(p.totalNet)}</td>
                  <td className="px-3 py-3 text-right text-gray-600 dark:text-gray-300">{fmt(totalCompanyCost)}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${s.cls}`}>
                      {s.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => downloadPdf(p)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700" title="PDF endir"><FileText size={14} /></button>
                      {canEdit && p.status === 'DRAFT' && (
                        <button onClick={() => handleApprove(p)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Təsdiqlə"><CheckCircle2 size={14} /></button>
                      )}
                      {canEdit && p.status === 'APPROVED' && (
                        <button onClick={() => handleMarkPaid(p)} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Ödənmiş kimi qeyd et"><DollarSign size={14} /></button>
                      )}
                      {canEdit && p.status === 'APPROVED' && (
                        <button onClick={() => handleReopen(p)} className="p-1.5 rounded hover:bg-amber-50 text-amber-600" title="Yenidən aç"><RotateCw size={14} /></button>
                      )}
                      {canDelete && p.status !== 'PAID' && (
                        <button onClick={() => handleDelete(p)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Sil"><Trash2 size={14} /></button>
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
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">Yeni aylıq dövr</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">İl</label>
                <input type="number" value={newPeriod.year} onChange={e => setNewPeriod({ ...newPeriod, year: Number(e.target.value) })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ay</label>
                <select value={newPeriod.month} onChange={e => setNewPeriod({ ...newPeriod, month: Number(e.target.value) })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700">
                  {AZ_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">İş günü sayı</label>
                <input type="number" min="1" max="31" value={newPeriod.workingDaysInMonth} onChange={e => setNewPeriod({ ...newPeriod, workingDaysInMonth: Number(e.target.value) })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700" />
              </div>
              <p className="text-xs text-gray-500 italic">Bütün aktiv işçilər avtomatik daxil ediləcək.</p>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setCreating(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Ləğv</button>
              <button onClick={create} className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">Yarat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
