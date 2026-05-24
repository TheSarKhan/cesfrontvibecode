import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Calendar, FileText, CheckCircle2, DollarSign, RotateCw, Trash2, Calculator, ArrowLeft,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'
import {
  PageHeader, Pill, Field, Input, Select, ModalShell,
  TableWrap, LoadingRow, EmptyRow,
} from './_shared'
import { fmt, PAYROLL_STATUS, AZ_MONTHS } from './_constants'

export default function PayrollListPage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('HR_MANAGEMENT', 'canPost')
  const canEdit   = hasPermission('HR_MANAGEMENT', 'canPut')
  const canDelete = hasPermission('HR_MANAGEMENT', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [periods, setPeriods]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [creating, setCreating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const today = new Date()
  const [newPeriod, setNewPeriod] = useState({
    year:               today.getFullYear(),
    month:              today.getMonth() + 1,
    workingDaysInMonth: 22,
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await hrApi.getPeriods()
      setPeriods(res.data?.data ?? res.data ?? [])
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Dövrlər yüklənmədi')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!canCreate) return
    setSubmitting(true)
    try {
      const res = await hrApi.createPeriod(newPeriod, true)
      toast.success('Dövr yaradıldı')
      const created = res.data?.data ?? res.data
      navigate(`/hr/payroll/${created.id}`)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Yaradıla bilmədi')
    } finally {
      setSubmitting(false)
      setCreating(false)
    }
  }

  const handleApprove = async (p) => {
    if (!(await confirm({ title: 'Dövrü təsdiqlə', message: `${AZ_MONTHS[p.month - 1]} ${p.year} dövrünü təsdiqləmək istəyirsiniz?` }))) return
    try { await hrApi.approvePeriod(p.id); toast.success('Təsdiqləndi'); load() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const handleMarkPaid = async (p) => {
    if (!(await confirm({ title: 'Ödənmiş kimi qeyd et', message: `${AZ_MONTHS[p.month - 1]} ${p.year} ödənildiyini qeyd edirsiniz?` }))) return
    try { await hrApi.markPeriodPaid(p.id); toast.success('Ödənmiş kimi qeyd edildi'); load() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const handleReopen = async (p) => {
    if (!(await confirm({ title: 'Yenidən aç', message: 'Dövrü DRAFT statusuna geri qaytarın?' }))) return
    try { await hrApi.reopenPeriod(p.id); toast.success('Dövr yenidən açıldı'); load() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const handleDelete = async (p) => {
    if (!(await confirm({ title: 'Dövrü sil', message: 'Bu dövr və bütün hesablamaları silinəcək.' }))) return
    try { await hrApi.deletePeriod(p.id); toast.success('Silindi'); load() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const downloadPdf = async (p) => {
    try {
      const res = await hrApi.downloadPeriodPdf(p.id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'PDF endirilə bilmədi')
    }
  }

  return (
    <div style={{ color: 'var(--ces-ink)' }}>
      <ConfirmDialog />

      <PageHeader
        eyebrow="HR · Əməkhaqqı"
        title="Aylıq cədvəllər"
        subtitle={<><span className="num font-semibold" style={{ color: 'var(--ces-graphite)' }}>{periods.length}</span> dövr qeyd olunub</>}
        right={
          <>
            <button onClick={() => navigate('/hr')} className="ces-btn ces-btn-outline ces-btn-sm">
              <ArrowLeft size={14} /> HR
            </button>
            {canCreate && (
              <button onClick={() => setCreating(true)} className="ces-btn ces-btn-primary">
                <Plus size={16} /> Yeni dövr
              </button>
            )}
          </>
        }
      />

      <TableWrap>
        <div className="overflow-x-auto">
          <table className="ces-tbl w-full min-w-[920px]">
            <thead>
              <tr>
                <th>Dövr</th>
                <th className="r">İşçi</th>
                <th className="r">Gross</th>
                <th className="r">Tutulan</th>
                <th className="r">Ödəniləcək</th>
                <th className="r">Şirkət xərci</th>
                <th>Status</th>
                <th className="r w-act">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <LoadingRow colSpan={8} />
                : periods.length === 0
                  ? <EmptyRow colSpan={8} icon={Calculator} message="Hələ heç bir dövr yoxdur" />
                  : periods.map(p => {
                    const s = PAYROLL_STATUS[p.status] || { label: p.status, tone: 'muted' }
                    const totalCompanyCost = (Number(p.totalGross || 0) + Number(p.totalEmployerContributions || 0))
                    return (
                      <tr
                        key={p.id}
                        onClick={() => navigate(`/hr/payroll/${p.id}`)}
                        className="cursor-pointer"
                      >
                        <td>
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-7 h-7 rounded-[8px] grid place-items-center flex-none"
                              style={{ background: 'var(--ces-gold-100)', color: 'var(--ces-gold-700)' }}
                            >
                              <Calendar size={13} />
                            </span>
                            <span className="text-[13.5px] font-bold" style={{ color: 'var(--ces-ink)' }}>{p.label}</span>
                          </div>
                        </td>
                        <td className="r num font-extrabold" style={{ color: 'var(--ces-graphite-900)' }}>{p.entryCount || 0}</td>
                        <td className="r num font-semibold" style={{ color: 'var(--ces-ink)' }}>{fmt(p.totalGross)}</td>
                        <td className="r num" style={{ color: 'var(--ces-danger)' }}>{fmt(p.totalEmployeeDeductions)}</td>
                        <td className="r num font-extrabold" style={{ color: 'var(--ces-ok)' }}>{fmt(p.totalNet)}</td>
                        <td className="r num" style={{ color: 'var(--ces-info)' }}>{fmt(totalCompanyCost)}</td>
                        <td><Pill tone={s.tone} sm dot>{s.label}</Pill></td>
                        <td className="r" onClick={(ev) => ev.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => downloadPdf(p)} className="ces-row-act" title="PDF endir"><FileText size={14} /></button>
                            {canEdit && p.status === 'DRAFT' && (
                              <button onClick={() => handleApprove(p)} className="ces-row-act info" title="Təsdiqlə"><CheckCircle2 size={14} /></button>
                            )}
                            {canEdit && p.status === 'APPROVED' && (
                              <button onClick={() => handleMarkPaid(p)} className="ces-row-act" style={{ color: 'var(--ces-ok)' }} title="Ödənmiş kimi qeyd et"><DollarSign size={14} /></button>
                            )}
                            {canEdit && p.status === 'APPROVED' && (
                              <button onClick={() => handleReopen(p)} className="ces-row-act gold" title="Yenidən aç"><RotateCw size={14} /></button>
                            )}
                            {canDelete && p.status !== 'PAID' && (
                              <button onClick={() => handleDelete(p)} className="ces-row-act danger" title="Sil"><Trash2 size={14} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        </div>
      </TableWrap>

      {creating && (
        <ModalShell
          icon={Calendar}
          eyebrow="Yeni qeyd"
          title="Aylıq dövr"
          subtitle="Bütün aktiv işçilər avtomatik daxil ediləcək"
          onClose={() => setCreating(false)}
          maxWidth="480px"
          footer={
            <>
              <button onClick={() => setCreating(false)} className="ces-btn ces-btn-ghost ces-btn-sm">Ləğv</button>
              <button onClick={create} disabled={submitting} className="ces-btn ces-btn-primary">
                {submitting && (
                  <span className="w-3.5 h-3.5 rounded-full animate-spin"
                    style={{ border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'var(--ces-on-primary)' }} />
                )}
                Yarat
              </button>
            </>
          }
        >
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="İl">
                <Input type="number" value={newPeriod.year} onChange={(e) => setNewPeriod({ ...newPeriod, year: Number(e.target.value) })} />
              </Field>
              <Field label="Ay">
                <Select value={newPeriod.month} onChange={(e) => setNewPeriod({ ...newPeriod, month: Number(e.target.value) })}>
                  {AZ_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="İş günü sayı" hint="Adətən 22 (5 günlük iş həftəsi)">
              <Input
                type="number"
                min="1"
                max="31"
                value={newPeriod.workingDaysInMonth}
                onChange={(e) => setNewPeriod({ ...newPeriod, workingDaysInMonth: Number(e.target.value) })}
                suffix="gün"
              />
            </Field>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
