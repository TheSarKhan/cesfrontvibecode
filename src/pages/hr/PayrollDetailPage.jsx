import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FileText, CheckCircle2, DollarSign, RotateCw, Pencil, Trash2, Plus, RefreshCw, Lock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'
import PayrollEntryModal from './PayrollEntryModal'
import { Pill, Avatar, Select, TableWrap, EmptyRow } from './_shared'
import { fmt, PAYROLL_STATUS } from './_constants'

export default function PayrollDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canEdit   = hasPermission('HR_MANAGEMENT', 'canPut')
  const canDelete = hasPermission('HR_MANAGEMENT', 'canDelete')
  const canCreate = hasPermission('HR_MANAGEMENT', 'canPost')
  const { confirm, ConfirmDialog } = useConfirm()

  const [period, setPeriod]             = useState(null)
  const [employees, setEmployees]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [editingEntry, setEditingEntry] = useState(null)
  const [adding, setAdding]             = useState(false)
  const [selectedEmpId, setSelectedEmpId] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await hrApi.getPeriod(id)
      setPeriod(res.data?.data ?? res.data)
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Yüklənmədi')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    hrApi.getEmployees()
      .then(r => setEmployees((r.data?.data ?? r.data ?? []).filter(e => e.status === 'ACTIVE')))
      .catch(() => {})
  }, [])

  const isEditable = period?.status === 'DRAFT'
  const status = PAYROLL_STATUS[period?.status] || { label: period?.status, tone: 'muted' }

  const candidatesToAdd = useMemo(() => {
    if (!period) return []
    const inPeriod = new Set((period.entries || []).map(e => e.employeeId))
    return employees.filter(e => !inPeriod.has(e.id))
  }, [employees, period])

  const handleApprove = async () => {
    if (!(await confirm({ title: 'Təsdiqlə', message: 'Bu dövrün hesablamaları təsdiqlənsin?' }))) return
    try { await hrApi.approvePeriod(id); toast.success('Təsdiqləndi'); load() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const handleMarkPaid = async () => {
    if (!(await confirm({ title: 'Ödənmiş kimi qeyd et' }))) return
    try { await hrApi.markPeriodPaid(id); toast.success('Ödənilmiş kimi qeyd edildi'); load() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const handleReopen = async () => {
    if (!(await confirm({ title: 'Yenidən aç' }))) return
    try { await hrApi.reopenPeriod(id); toast.success('Yenidən açıldı'); load() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const handleRepopulate = async () => {
    if (!(await confirm({ title: 'Yenidən doldur', message: 'Mövcud sətirlər saxlanılır, yeni aktiv işçilər əlavə edilir.' }))) return
    try { await hrApi.populatePeriod(id); toast.success('Doldur tamamlandı'); load() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const handleDeleteEntry = async (entry) => {
    if (!(await confirm({ title: 'Sətri sil', message: `${entry.employeeFullName} silinsin?` }))) return
    try { await hrApi.deleteEntry(entry.id); toast.success('Silindi'); load() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const handleAddEntry = async () => {
    if (!selectedEmpId) return
    try {
      await hrApi.addEntry(id, selectedEmpId)
      toast.success('Əlavə edildi')
      setSelectedEmpId(''); setAdding(false); load()
    } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const downloadPdf = async () => {
    try {
      const res = await hrApi.downloadPeriodPdf(id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'PDF endirilə bilmədi')
    }
  }
  const downloadPayslip = async (entryId) => {
    try {
      const res = await hrApi.downloadPayslip(entryId)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Pay slip endirilə bilmədi')
    }
  }

  if (loading || !period) {
    return (
      <div className="flex items-center justify-center h-64 gap-2" style={{ color: 'var(--ces-muted)' }}>
        <RefreshCw size={18} className="animate-spin" />
        <span className="text-[14px] font-medium">Yüklənir...</span>
      </div>
    )
  }

  const summary = [
    { label: 'Cəmi gross',         value: fmt(period.totalGross),                   color: 'var(--ces-graphite-900)' },
    { label: 'Gəlir vergisi',      value: fmt(period.totalIncomeTax),               color: 'var(--ces-danger)' },
    { label: 'Cəmi tutulan',       value: fmt(period.totalEmployeeDeductions),      color: 'var(--ces-danger)' },
    { label: 'Cəmi ödəniləcək',    value: fmt(period.totalNet),                     color: 'var(--ces-ok)' },
    { label: 'Şirkət əlavə xərci', value: fmt(period.totalEmployerContributions),   color: 'var(--ces-info)' },
  ]

  return (
    <div style={{ color: 'var(--ces-ink)' }}>
      <ConfirmDialog />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/hr/payroll')}
            className="w-9 h-9 rounded-[10px] grid place-items-center transition-colors"
            style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', color: 'var(--ces-graphite)' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--ces-graphite)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--ces-line)')}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="text-[11px] font-bold tracking-[.16em] uppercase mb-1" style={{ color: 'var(--ces-gold)' }}>
              HR · Əməkhaqqı dövrü
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[24px] font-extrabold tracking-[-.022em] leading-none" style={{ color: 'var(--ces-graphite-900)' }}>
                {period.label}
              </h1>
              <Pill tone={status.tone} sm dot>{status.label}</Pill>
            </div>
            <p className="text-[12.5px] mt-1.5" style={{ color: 'var(--ces-muted)' }}>
              İş günü: <span className="font-semibold num" style={{ color: 'var(--ces-graphite)' }}>{period.workingDaysInMonth}</span>
              {' · '}
              <span className="font-semibold num" style={{ color: 'var(--ces-graphite)' }}>{period.entryCount}</span> işçi
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={downloadPdf} className="ces-btn ces-btn-outline ces-btn-sm">
            <FileText size={14} /> PDF
          </button>
          {canEdit && isEditable && (
            <button
              onClick={handleRepopulate}
              className="ces-btn ces-btn-sm"
              style={{ background: 'var(--ces-gold-100)', color: 'var(--ces-gold-700)', border: '1px solid rgba(200,147,42,.25)' }}
            >
              <RefreshCw size={13} /> Yenidən doldur
            </button>
          )}
          {canEdit && isEditable && (
            <button onClick={handleApprove} className="ces-btn ces-btn-primary">
              <CheckCircle2 size={15} /> Təsdiqlə
            </button>
          )}
          {canEdit && period.status === 'APPROVED' && (
            <>
              <button
                onClick={handleReopen}
                className="ces-btn ces-btn-sm"
                style={{ background: 'var(--ces-gold-100)', color: 'var(--ces-gold-700)', border: '1px solid rgba(200,147,42,.25)' }}
              >
                <RotateCw size={13} /> Yenidən aç
              </button>
              <button
                onClick={handleMarkPaid}
                className="ces-btn ces-btn-sm"
                style={{ background: 'var(--ces-ok)', color: '#fff' }}
              >
                <DollarSign size={15} /> Ödənildi
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {summary.map((s) => (
          <div
            key={s.label}
            style={{
              background: 'var(--ces-surface)',
              border: '1px solid var(--ces-line)',
              borderRadius: '14px',
              padding: '14px 16px',
              boxShadow: 'var(--ces-shadow-sm)',
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: 'var(--ces-muted)' }}>
              {s.label}
            </p>
            <p className="text-[18px] font-extrabold tracking-[-.02em] num mt-1" style={{ color: s.color }}>
              {s.value} <span className="text-[12px]" style={{ color: 'var(--ces-mute2)' }}>₼</span>
            </p>
          </div>
        ))}
      </div>

      {/* Entries table */}
      <TableWrap>
        <div className="overflow-x-auto">
          <table className="ces-tbl w-full min-w-[1200px]">
            <thead>
              <tr>
                <th>№</th>
                <th>İşçi</th>
                <th>FİN</th>
                <th>Vəzifə</th>
                <th className="r">Gross</th>
                <th>Gün</th>
                <th className="r">Bonus</th>
                <th className="r">Cərimə</th>
                <th className="r">Vergi</th>
                <th className="r">Pensiya</th>
                <th className="r">İSH</th>
                <th className="r">İTSH</th>
                <th className="r">Cəmi tutul.</th>
                <th className="r" style={{ background: '#e8fbe5' }}>Net</th>
                <th className="r">Şirkət xərci</th>
                <th className="r w-act">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {(period.entries || []).length === 0
                ? <EmptyRow colSpan={16} icon={Pencil} message="Bu dövrdə sətir yoxdur" />
                : period.entries.map((e, idx) => (
                  <tr key={e.id}>
                    <td className="num" style={{ color: 'var(--ces-mute2)' }}>{idx + 1}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar name={e.employeeFullName} size="xs" />
                        <span className="text-[13.5px] font-bold" style={{ color: 'var(--ces-ink)' }}>{e.employeeFullName}</span>
                      </div>
                    </td>
                    <td className="mono" style={{ color: 'var(--ces-muted)', fontSize: '12.5px' }}>{e.employeeFin || '—'}</td>
                    <td style={{ color: 'var(--ces-muted)', fontSize: '12.5px' }}>{e.positionName || '—'}</td>
                    <td className="r num font-semibold" style={{ color: 'var(--ces-ink)' }}>{fmt(e.grossTotal)}</td>
                    <td className="num" style={{ color: 'var(--ces-muted)', fontSize: '12.5px' }}>{e.actualDaysWorked}/{e.workingDaysInMonth}</td>
                    <td className="r num" style={{ color: 'var(--ces-mute2)', fontSize: '12px' }}>{Number(e.bonus) > 0 ? fmt(e.bonus) : '—'}</td>
                    <td className="r num" style={{ color: Number(e.penalty) > 0 ? 'var(--ces-danger)' : 'var(--ces-mute2)', fontSize: '12px' }}>
                      {Number(e.penalty) > 0 ? fmt(e.penalty) : '—'}
                    </td>
                    <td className="r num" style={{ color: 'var(--ces-muted)', fontSize: '12px' }}>{fmt(e.incomeTax)}</td>
                    <td className="r num" style={{ color: 'var(--ces-muted)', fontSize: '12px' }}>{fmt(e.employeePension)}</td>
                    <td className="r num" style={{ color: 'var(--ces-muted)', fontSize: '12px' }}>{fmt(e.employeeUnemployment)}</td>
                    <td className="r num" style={{ color: 'var(--ces-muted)', fontSize: '12px' }}>{fmt(e.employeeMedical)}</td>
                    <td className="r num font-semibold" style={{ color: 'var(--ces-danger)' }}>{fmt(e.totalDeductions)}</td>
                    <td className="r num font-extrabold" style={{ color: 'var(--ces-ok)', background: 'rgba(15,157,106,.04)' }}>{fmt(e.netPay)}</td>
                    <td className="r num" style={{ color: 'var(--ces-info)' }}>{fmt(e.totalCompanyCost)}</td>
                    <td className="r">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => downloadPayslip(e.id)} className="ces-row-act" title="Pay slip"><FileText size={13} /></button>
                        {canEdit && isEditable && (
                          <button onClick={() => setEditingEntry(e)} className="ces-row-act gold" title="Redaktə"><Pencil size={13} /></button>
                        )}
                        {canDelete && isEditable && (
                          <button onClick={() => handleDeleteEntry(e)} className="ces-row-act danger" title="Sil"><Trash2 size={13} /></button>
                        )}
                        {!isEditable && <Lock size={12} style={{ color: 'var(--ces-mute2)' }} />}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </TableWrap>

      {/* Add new entry */}
      {canCreate && isEditable && (
        <div className="mt-4">
          {adding ? (
            <div
              className="flex items-center gap-2 p-3 flex-wrap"
              style={{
                background: 'var(--ces-gold-50)',
                border: '1px solid var(--ces-gold-100)',
                borderRadius: '14px',
              }}
            >
              <div className="flex-1 min-w-[260px]">
                <Select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)}>
                  <option value="">İşçi seçin...</option>
                  {candidatesToAdd.map(e => <option key={e.id} value={e.id}>{e.fullName} — {e.positionName || '—'}</option>)}
                </Select>
              </div>
              <button onClick={handleAddEntry} disabled={!selectedEmpId} className="ces-btn ces-btn-primary ces-btn-sm">
                <Plus size={14} /> Əlavə et
              </button>
              <button onClick={() => setAdding(false)} className="ces-btn ces-btn-ghost ces-btn-sm">Ləğv</button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="ces-btn ces-btn-sm"
              style={{
                background: 'var(--ces-gold-50)',
                color: 'var(--ces-gold-700)',
                border: '1px solid var(--ces-gold-100)',
              }}
            >
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
