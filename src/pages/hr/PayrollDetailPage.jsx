import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, CheckCircle2, DollarSign, RotateCw, Pencil, Trash2, Plus, RefreshCw, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'
import PayrollEntryModal from './PayrollEntryModal'

const STATUS_CONFIG = {
  DRAFT:    { label: 'Layihə',     cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  APPROVED: { label: 'Təsdiqlənib', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  PAID:     { label: 'Ödənilib',    cls: 'bg-green-100 text-green-700 border-green-200' },
}

const fmt = (n) => Number(n ?? 0).toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function PayrollDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canEdit = hasPermission('HR_MANAGEMENT', 'canPut')
  const canDelete = hasPermission('HR_MANAGEMENT', 'canDelete')
  const canCreate = hasPermission('HR_MANAGEMENT', 'canPost')
  const { confirm, ConfirmDialog } = useConfirm()

  const [period, setPeriod] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingEntry, setEditingEntry] = useState(null)
  const [adding, setAdding] = useState(false)
  const [selectedEmpId, setSelectedEmpId] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await hrApi.getPeriod(id)
      setPeriod(res.data?.data ?? res.data)
    } catch { toast.error('Yüklənmədi') } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])
  useEffect(() => {
    hrApi.getEmployees().then(r => setEmployees((r.data?.data ?? r.data ?? []).filter(e => e.status === 'ACTIVE'))).catch(() => {})
  }, [])

  const isEditable = period?.status === 'DRAFT'
  const status = STATUS_CONFIG[period?.status] || { label: period?.status, cls: '' }

  const candidatesToAdd = useMemo(() => {
    if (!period) return []
    const inPeriod = new Set((period.entries || []).map(e => e.employeeId))
    return employees.filter(e => !inPeriod.has(e.id))
  }, [employees, period])

  const handleApprove = async () => {
    if (!(await confirm({ title: 'Təsdiqlə', message: 'Bu dövrün hesablamaları təsdiqlənsin?' }))) return
    try { await hrApi.approvePeriod(id); toast.success('Təsdiqləndi'); load() } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const handleMarkPaid = async () => {
    if (!(await confirm({ title: 'Ödənmiş kimi qeyd et' }))) return
    try { await hrApi.markPeriodPaid(id); toast.success('Ödənilmiş kimi qeyd edildi'); load() } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const handleReopen = async () => {
    if (!(await confirm({ title: 'Yenidən aç' }))) return
    try { await hrApi.reopenPeriod(id); toast.success('Yenidən açıldı'); load() } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const handleRepopulate = async () => {
    if (!(await confirm({ title: 'Yenidən doldur', message: 'Mövcud sətirlər saxlanılır, yeni aktiv işçilər əlavə edilir.' }))) return
    try { await hrApi.populatePeriod(id); toast.success('Doldur tamamlandı'); load() } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const handleDeleteEntry = async (entry) => {
    if (!(await confirm({ title: 'Sətri sil', message: `${entry.employeeFullName} silinsin?` }))) return
    try { await hrApi.deleteEntry(entry.id); toast.success('Silindi'); load() } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const handleAddEntry = async () => {
    if (!selectedEmpId) return
    try { await hrApi.addEntry(id, selectedEmpId); toast.success('Əlavə edildi'); setSelectedEmpId(''); setAdding(false); load() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const downloadPdf = async () => {
    try {
      const res = await hrApi.downloadPeriodPdf(id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
    } catch { toast.error('PDF endirilə bilmədi') }
  }
  const downloadPayslip = async (entryId) => {
    try {
      const res = await hrApi.downloadPayslip(entryId)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
    } catch { toast.error('Pay slip endirilə bilmədi') }
  }

  if (loading || !period) {
    return <div className="p-6 text-center text-gray-400">Yüklənir...</div>
  }

  return (
    <div>
      {ConfirmDialog}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/hr/payroll')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{period.label}</h1>
            <p className="text-xs text-gray-400 mt-0.5">İş günü: {period.workingDaysInMonth} • {period.entryCount} işçi</p>
          </div>
          <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${status.cls}`}>{status.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadPdf} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50">
            <FileText size={13} /> PDF
          </button>
          {canEdit && isEditable && (
            <button onClick={handleRepopulate} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100">
              <RefreshCw size={13} /> Yenidən doldur
            </button>
          )}
          {canEdit && isEditable && (
            <button onClick={handleApprove} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              <CheckCircle2 size={15} /> Təsdiqlə
            </button>
          )}
          {canEdit && period.status === 'APPROVED' && (
            <>
              <button onClick={handleReopen} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100">
                <RotateCw size={13} /> Yenidən aç
              </button>
              <button onClick={handleMarkPaid} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
                <DollarSign size={15} /> Ödənildi
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <SummaryCard label="Cəmi gross" value={fmt(period.totalGross)} accent="text-gray-800" />
        <SummaryCard label="Gəlir vergisi" value={fmt(period.totalIncomeTax)} accent="text-rose-600" />
        <SummaryCard label="Cəmi tutulan" value={fmt(period.totalEmployeeDeductions)} accent="text-rose-600" />
        <SummaryCard label="Cəmi ödəniləcək" value={fmt(period.totalNet)} accent="text-emerald-700" />
        <SummaryCard label="Şirkət əlavə xərci" value={fmt(period.totalEmployerContributions)} accent="text-purple-700" />
      </div>

      {/* Entries table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-[11px] uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">№</th>
              <th className="px-3 py-2 text-left font-medium">İşçi</th>
              <th className="px-3 py-2 text-left font-medium">FİN</th>
              <th className="px-3 py-2 text-left font-medium">Vəzifə</th>
              <th className="px-3 py-2 text-right font-medium">Gross</th>
              <th className="px-3 py-2 text-center font-medium">İş günü</th>
              <th className="px-3 py-2 text-right font-medium">Bonus</th>
              <th className="px-3 py-2 text-right font-medium">Cərimə</th>
              <th className="px-3 py-2 text-right font-medium">Vergi</th>
              <th className="px-3 py-2 text-right font-medium">Pensiya</th>
              <th className="px-3 py-2 text-right font-medium">İSH</th>
              <th className="px-3 py-2 text-right font-medium">İTSH</th>
              <th className="px-3 py-2 text-right font-medium">Cəmi tutul.</th>
              <th className="px-3 py-2 text-right font-medium bg-emerald-50 dark:bg-emerald-900/20">Net</th>
              <th className="px-3 py-2 text-right font-medium">Şirkət xərci</th>
              <th className="px-3 py-2 text-right font-medium w-[110px]">Əməliyyat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {(period.entries || []).length === 0 ? (
              <tr><td colSpan={16} className="px-3 py-8 text-center text-gray-400">Sətir yoxdur</td></tr>
            ) : period.entries.map((e, idx) => (
              <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100">{e.employeeFullName}</td>
                <td className="px-3 py-2 text-gray-500 text-xs">{e.employeeFin || '—'}</td>
                <td className="px-3 py-2 text-gray-500 text-xs">{e.positionName || '—'}</td>
                <td className="px-3 py-2 text-right font-medium">{fmt(e.grossTotal)}</td>
                <td className="px-3 py-2 text-center text-xs text-gray-600">{e.actualDaysWorked}/{e.workingDaysInMonth}</td>
                <td className="px-3 py-2 text-right text-xs">{Number(e.bonus) > 0 ? fmt(e.bonus) : '—'}</td>
                <td className="px-3 py-2 text-right text-xs text-rose-500">{Number(e.penalty) > 0 ? fmt(e.penalty) : '—'}</td>
                <td className="px-3 py-2 text-right text-xs">{fmt(e.incomeTax)}</td>
                <td className="px-3 py-2 text-right text-xs">{fmt(e.employeePension)}</td>
                <td className="px-3 py-2 text-right text-xs">{fmt(e.employeeUnemployment)}</td>
                <td className="px-3 py-2 text-right text-xs">{fmt(e.employeeMedical)}</td>
                <td className="px-3 py-2 text-right font-medium text-rose-600">{fmt(e.totalDeductions)}</td>
                <td className="px-3 py-2 text-right font-bold text-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10">{fmt(e.netPay)}</td>
                <td className="px-3 py-2 text-right text-purple-600">{fmt(e.totalCompanyCost)}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => downloadPayslip(e.id)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400" title="Pay slip"><FileText size={13} /></button>
                    {canEdit && isEditable && (
                      <button onClick={() => setEditingEntry(e)} className="p-1.5 rounded hover:bg-amber-50 text-amber-600" title="Redaktə"><Pencil size={13} /></button>
                    )}
                    {canDelete && isEditable && (
                      <button onClick={() => handleDeleteEntry(e)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Sil"><Trash2 size={13} /></button>
                    )}
                    {!isEditable && <Lock size={12} className="text-gray-300" />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add new entry */}
      {canCreate && isEditable && (
        <div className="mt-4">
          {adding ? (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} className="flex-1 px-3 py-2 text-sm rounded-lg border border-amber-300 bg-white">
                <option value="">İşçi seçin...</option>
                {candidatesToAdd.map(e => <option key={e.id} value={e.id}>{e.fullName} — {e.positionName || '—'}</option>)}
              </select>
              <button onClick={handleAddEntry} disabled={!selectedEmpId} className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg">Əlavə et</button>
              <button onClick={() => setAdding(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Ləğv</button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg">
              <Plus size={14} /> İşçi əlavə et
            </button>
          )}
        </div>
      )}

      {editingEntry && (
        <PayrollEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={() => { setEditingEntry(null); load() }}
        />
      )}
    </div>
  )
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">{label}</p>
      <p className={`text-base font-bold ${accent}`}>{value} <span className="text-xs font-normal text-gray-400">₼</span></p>
    </div>
  )
}
