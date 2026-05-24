import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Plus, CheckCircle2, X, Trash2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'
import {
  PageHeader, Pill, Avatar, Field, Input, Select, Textarea, ModalShell,
  TableWrap, LoadingRow, EmptyRow,
} from './_shared'
import { LEAVE_STATUS, LEAVE_TYPES } from './_constants'

export default function LeavesPage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('HR_MANAGEMENT', 'canPost')
  const canEdit   = hasPermission('HR_MANAGEMENT', 'canPut')
  const canDelete = hasPermission('HR_MANAGEMENT', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [data, setData]               = useState({ content: [], totalPages: 0, page: 0, totalElements: 0, size: 15 })
  const [loading, setLoading]         = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [employees, setEmployees]     = useState([])
  const [creating, setCreating]       = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [form, setForm]               = useState({ employeeId: '', type: 'ANNUAL', startDate: '', endDate: '', reason: '' })

  const load = async () => {
    setLoading(true)
    try {
      const res = await hrApi.getLeavesPaged({ page: 0, size: 30, ...(statusFilter && { status: statusFilter }) })
      setData(res.data?.data ?? res.data)
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Yüklənmədi')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    hrApi.getEmployees()
      .then(r => setEmployees((r.data?.data ?? r.data ?? []).filter(e => e.status !== 'TERMINATED')))
      .catch(() => {})
  }, [])

  const submit = async () => {
    if (!form.employeeId || !form.startDate || !form.endDate) { toast.error('Bütün sahələri doldurun'); return }
    setSubmitting(true)
    try {
      await hrApi.createLeave({ ...form, employeeId: Number(form.employeeId) })
      toast.success('Tələb yaradıldı')
      setCreating(false)
      setForm({ employeeId: '', type: 'ANNUAL', startDate: '', endDate: '', reason: '' })
      load()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Xəta')
    } finally { setSubmitting(false) }
  }

  const approve = async (l) => {
    try { await hrApi.approveLeave(l.id, {}); toast.success('Təsdiqləndi'); load() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const reject = async (l) => {
    const note = window.prompt('Rədd səbəbi:')
    if (note === null) return
    try { await hrApi.rejectLeave(l.id, { note }); toast.success('Rədd edildi'); load() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const cancel = async (l) => {
    if (!(await confirm({ title: 'Ləğv et' }))) return
    try { await hrApi.cancelLeave(l.id); toast.success('Ləğv edildi'); load() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const remove = async (l) => {
    if (!(await confirm({ title: 'Sil' }))) return
    try { await hrApi.deleteLeave(l.id); toast.success('Silindi'); load() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }

  return (
    <div style={{ color: 'var(--ces-ink)' }}>
      <ConfirmDialog />

      <PageHeader
        eyebrow="HR · Məzuniyyət"
        title="Məzuniyyət tələbləri"
        subtitle={<><span className="num font-semibold" style={{ color: 'var(--ces-graphite)' }}>{data.totalElements}</span> tələb</>}
        right={
          <>
            <button onClick={() => navigate('/hr')} className="ces-btn ces-btn-outline ces-btn-sm">
              <ArrowLeft size={14} /> HR
            </button>
            {canCreate && (
              <button onClick={() => setCreating(true)} className="ces-btn ces-btn-primary">
                <Plus size={16} /> Yeni tələb
              </button>
            )}
          </>
        }
      />

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[
          { label: 'Hamısı',      val: '' },
          { label: 'Gözləyir',    val: 'PENDING' },
          { label: 'Təsdiqlənib', val: 'APPROVED' },
          { label: 'Rədd',        val: 'REJECTED' },
          { label: 'Ləğv',        val: 'CANCELLED' },
        ].map((c) => {
          const on = statusFilter === c.val
          return (
            <button
              key={c.label}
              onClick={() => setStatusFilter(c.val)}
              className="text-[12.5px] font-semibold transition-colors"
              style={{
                padding: '7px 14px',
                borderRadius: '999px',
                background: on ? 'var(--ces-graphite)' : 'var(--ces-surface)',
                color: on ? 'var(--ces-on-primary)' : 'var(--ces-muted)',
                border: `1px solid ${on ? 'var(--ces-graphite)' : 'var(--ces-line)'}`,
              }}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      <TableWrap>
        <div className="overflow-x-auto">
          <table className="ces-tbl w-full min-w-[920px]">
            <thead>
              <tr>
                <th>İşçi</th>
                <th>Növ</th>
                <th>Tarix</th>
                <th className="r">Gün</th>
                <th>Səbəb</th>
                <th>Status</th>
                <th className="r w-act">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <LoadingRow colSpan={7} />
                : (data.content || []).length === 0
                  ? <EmptyRow colSpan={7} icon={ClipboardList} message="Tələb yoxdur" />
                  : data.content.map(l => {
                    const s = LEAVE_STATUS[l.status] || { label: l.status, tone: 'muted' }
                    const t = LEAVE_TYPES.find(x => x.v === l.type)?.label || l.type
                    return (
                      <tr key={l.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={l.employeeFullName} size="sm" />
                            <span className="text-[13.5px] font-bold" style={{ color: 'var(--ces-ink)' }}>{l.employeeFullName}</span>
                          </div>
                        </td>
                        <td><Pill tone="muted" sm>{t}</Pill></td>
                        <td className="mono" style={{ color: 'var(--ces-muted)', fontSize: '12.5px' }}>
                          {l.startDate} → {l.endDate}
                        </td>
                        <td className="r num font-extrabold" style={{ color: 'var(--ces-graphite-900)' }}>{l.days}</td>
                        <td className="text-[12.5px] max-w-xs truncate" style={{ color: 'var(--ces-muted)' }} title={l.reason}>
                          {l.reason || '—'}
                        </td>
                        <td><Pill tone={s.tone} sm dot>{s.label}</Pill></td>
                        <td className="r">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && l.status === 'PENDING' && (
                              <>
                                <button onClick={() => approve(l)} className="ces-row-act" style={{ color: 'var(--ces-ok)' }} title="Təsdiqlə"><CheckCircle2 size={14} /></button>
                                <button onClick={() => reject(l)}  className="ces-row-act danger" title="Rədd et"><X size={14} /></button>
                              </>
                            )}
                            {canEdit && l.status === 'APPROVED' && new Date(l.startDate) > new Date() && (
                              <button onClick={() => cancel(l)} className="ces-row-act gold" title="Ləğv et"><X size={14} /></button>
                            )}
                            {canDelete && (
                              <button onClick={() => remove(l)} className="ces-row-act danger" title="Sil"><Trash2 size={14} /></button>
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
          icon={ClipboardList}
          eyebrow="Yeni qeyd"
          title="Məzuniyyət tələbi"
          subtitle="İşçi və tarix məlumatlarını seçin"
          onClose={() => setCreating(false)}
          maxWidth="520px"
          footer={
            <>
              <button onClick={() => setCreating(false)} className="ces-btn ces-btn-ghost ces-btn-sm">Ləğv</button>
              <button onClick={submit} disabled={submitting} className="ces-btn ces-btn-primary">
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
            <Field label="İşçi" required>
              <Select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                <option value="">Seçin...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </Select>
            </Field>
            <Field label="Növ" required>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {LEAVE_TYPES.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Başlanğıc" required>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </Field>
              <Field label="Bitmə" required>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </Field>
            </div>
            <Field label="Səbəb">
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} />
            </Field>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
