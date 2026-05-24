import DateInput from '../../components/common/DateInput'
import { useState, useEffect, useMemo } from 'react'
import { Receipt, Pencil, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import { projectsApi } from '../../api/projects'
import { contractorsApi } from '../../api/contractors'
import { customersApi } from '../../api/customers'
import toast from 'react-hot-toast'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { Field, Input, Textarea, Select, ModalShell, Pill } from './_shared'
import { AZ_MONTHS } from './_constants'

const TYPE_OPTIONS = [
  { value: 'INCOME',             label: 'Gəlir',  desc: 'Layihədən qazanılan gəlir', tone: 'ok' },
  { value: 'COMPANY_EXPENSE',    label: 'Xərc',   desc: 'Şirkət daxili xərclər',     tone: 'danger' },
  { value: 'CONTRACTOR_EXPENSE', label: 'Ödəmə',  desc: 'İnvestor / Podratçı ödənişi', tone: 'info' },
]

const TONE_BG = {
  ok:     { bg: 'var(--ces-ok-100)', color: 'var(--ces-ok)',     border: 'var(--ces-ok)' },
  info:   { bg: 'var(--ces-info-100)', color: 'var(--ces-info)',   border: 'var(--ces-info)' },
  danger: { bg: 'var(--ces-danger-100)', color: 'var(--ces-danger)', border: 'var(--ces-danger)' },
}

export default function InvoiceModal({ editing, defaultType, preProject, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState({
    type:               editing?.type        ?? defaultType ?? 'INCOME',
    invoiceNumber:      editing?.invoiceNumber ?? '',
    amount:             editing?.amount       ?? '',
    invoiceDate:        editing?.invoiceDate  ?? new Date().toISOString().slice(0, 10),
    etaxesId:           editing?.etaxesId     ?? '',
    equipmentName:      editing?.equipmentName ?? (preProject?.equipmentName ?? ''),
    companyName:        editing?.companyName   ?? (preProject?.companyName ?? ''),
    serviceDescription: editing?.serviceDescription ?? '',
    projectId:          editing?.projectId    ?? (preProject?.id ? String(preProject.id) : ''),
    contractorId:       editing?.contractorId ?? '',
    customerId:         editing?.customerId   ?? '',
    notes:              editing?.notes        ?? '',
    periodMonth:        editing?.periodMonth  ?? '',
    periodYear:         editing?.periodYear   ?? new Date().getFullYear(),
    standardDays:       editing?.standardDays ?? '',
    extraDays:          editing?.extraDays    ?? '',
    extraHours:         editing?.extraHours   ?? '',
    monthlyRate:        editing?.monthlyRate  ?? 14000,
    workingDaysInMonth: editing?.workingDaysInMonth ?? 26,
    workingHoursPerDay: editing?.workingHoursPerDay ?? 9,
  })
  const [saving, setSaving]               = useState(false)
  const [showTimesheet, setShowTimesheet] = useState(!!(editing?.periodMonth))
  const [projects, setProjects]           = useState([])
  const [contractors, setContractors]     = useState([])
  const [customers, setCustomers]         = useState([])

  useEffect(() => {
    projectsApi.getAll().then(r => setProjects(r.data.data || r.data || [])).catch(() => {})
    contractorsApi.getAll().then(r => setContractors(r.data.data || r.data || [])).catch(() => {})
    customersApi.getAll().then(r => setCustomers(r.data.data || r.data || [])).catch(() => {})
  }, [])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const isA  = form.type === 'INCOME'
  const isB1 = form.type === 'CONTRACTOR_EXPENSE'
  const isB2 = form.type === 'COMPANY_EXPENSE'

  const timesheetCalc = useMemo(() => {
    if (!showTimesheet || !isA) return null
    const monthly   = parseFloat(form.monthlyRate) || 0
    const workDays  = parseFloat(form.workingDaysInMonth) || 26
    const workHours = parseFloat(form.workingHoursPerDay) || 9
    if (!monthly || !workDays || !workHours) return null
    const daily   = monthly / workDays
    const stdAmt  = daily * (parseFloat(form.standardDays) || 0)
    const extDAmt = daily * (parseFloat(form.extraDays) || 0)
    const extHAmt = (daily / workHours) * (parseFloat(form.extraHours) || 0)
    const total   = stdAmt + extDAmt + extHAmt
    return total > 0 ? { daily, stdAmt, extDAmt, extHAmt, total } : null
  }, [showTimesheet, isA, form.monthlyRate, form.workingDaysInMonth, form.workingHoursPerDay, form.standardDays, form.extraDays, form.extraHours])

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (!timesheetCalc && (!form.amount || parseFloat(form.amount) <= 0)) return toast.error('Məbləğ daxil edin')
    if (!form.invoiceDate) return toast.error('Tarix seçin')
    if (isA && !form.projectId) return toast.error('Gəlir qaiməsi üçün layihə seçilməlidir')

    setSaving(true)
    const payload = {
      type:               form.type,
      invoiceNumber:      form.invoiceNumber || null,
      amount:             timesheetCalc ? parseFloat(timesheetCalc.total.toFixed(2)) : parseFloat(form.amount),
      invoiceDate:        form.invoiceDate,
      etaxesId:           isA ? (form.etaxesId || null) : null,
      equipmentName:      form.equipmentName || null,
      companyName:        form.companyName || null,
      serviceDescription: (isB1 || isB2) ? (form.serviceDescription || null) : null,
      projectId:          form.projectId    ? parseInt(form.projectId)    : null,
      contractorId:       form.contractorId ? parseInt(form.contractorId) : null,
      customerId:         form.customerId   ? parseInt(form.customerId)   : null,
      notes:              form.notes || null,
      periodMonth:        (isA && showTimesheet && form.periodMonth) ? parseInt(form.periodMonth) : null,
      periodYear:         (isA && showTimesheet && form.periodYear)  ? parseInt(form.periodYear)  : null,
      standardDays:       (isA && showTimesheet && form.standardDays !== '') ? parseInt(form.standardDays) : null,
      extraDays:          (isA && showTimesheet && form.extraDays !== '')    ? parseInt(form.extraDays)    : null,
      extraHours:         (isA && showTimesheet && form.extraHours !== '')   ? parseFloat(form.extraHours) : null,
      monthlyRate:        (isA && showTimesheet) ? parseFloat(form.monthlyRate)      : null,
      workingDaysInMonth: (isA && showTimesheet) ? parseInt(form.workingDaysInMonth) : null,
      workingHoursPerDay: (isA && showTimesheet) ? parseInt(form.workingHoursPerDay) : null,
    }

    try {
      if (editing) {
        await accountingApi.update(editing.id, payload)
        toast.success('Qaimə yeniləndi')
      } else {
        await accountingApi.create(payload)
        toast.success('Qaimə əlavə edildi')
      }
      onSaved()
    } catch (err) {
      if (err?.isPending) { onClose?.(); return }
    } finally { setSaving(false) }
  }

  const activeProjects = projects.filter(p => ['ACTIVE', 'COMPLETED'].includes(p.status))
  const isPreProject = !!preProject && !editing

  return (
    <ModalShell
      icon={editing ? Pencil : Receipt}
      eyebrow={editing ? 'Redaktə' : 'Yeni qeyd'}
      title={editing ? 'Qaiməni redaktə et' : 'Yeni qaimə'}
      subtitle="Növ, məbləğ və əlaqəli məlumatları doldurun"
      onClose={onClose}
      tone={editing ? 'gold' : 'graphite'}
      maxWidth="580px"
      footer={
        <>
          <button type="button" onClick={onClose} className="ces-btn ces-btn-ghost ces-btn-sm">Ləğv et</button>
          <button onClick={handleSubmit} disabled={saving} className="ces-btn ces-btn-primary">
            {saving && (
              <span className="w-3.5 h-3.5 rounded-full animate-spin"
                style={{ border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'var(--ces-on-primary)' }} />
            )}
            {saving ? 'Saxlanılır...' : (editing ? 'Yenilə' : 'Əlavə et')}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Type picker */}
        <div className="grid grid-cols-3 gap-2">
          {TYPE_OPTIONS.map(opt => {
            const on = form.type === opt.value
            const t = TONE_BG[opt.tone]
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('type', opt.value)}
                className="p-3 text-left transition-all"
                style={{
                  background: on ? t.bg : 'var(--ces-surface)',
                  border: `1px solid ${on ? t.border : 'var(--ces-line)'}`,
                  borderRadius: '12px',
                  boxShadow: on ? `0 0 0 3px ${t.bg}` : 'none',
                }}
              >
                <p className="text-[14px] font-bold" style={{ color: on ? t.color : 'var(--ces-ink)' }}>{opt.label}</p>
                <p className="text-[10.5px] mt-0.5" style={{ color: on ? t.color : 'var(--ces-muted)', opacity: on ? 0.85 : 1 }}>{opt.desc}</p>
              </button>
            )
          })}
        </div>

        {/* Project */}
        <Field label="Layihə" required={isA} hint={!isA ? 'İstəyə bağlı — əlaqəli layihə varsa seçin' : undefined}>
          {isPreProject ? (
            <div
              className="flex items-center gap-2 px-3 py-2.5"
              style={{
                background: 'var(--ces-gold-50)',
                border: '1px solid var(--ces-gold-100)',
                borderRadius: '11px',
                minHeight: '44px',
              }}
            >
              <span className="text-[12px] font-mono font-bold" style={{ color: 'var(--ces-ok)' }}>
                {preProject.projectCode || `PRJ-${String(preProject.id).padStart(4,'0')}`}
              </span>
              <span className="text-[12.5px]" style={{ color: 'var(--ces-ink)' }}>{preProject.companyName}</span>
              <span className="ml-auto"><Pill tone="muted" sm>Bağlanmış</Pill></span>
            </div>
          ) : (
            <Select value={form.projectId} onChange={(e) => set('projectId', e.target.value)}>
              <option value="">— Layihə seçin —</option>
              {activeProjects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.projectCode || `PRJ-${String(p.id).padStart(4,'0')}`} · {p.companyName}
                  {p.status === 'COMPLETED' ? ' ✓ bağlanmış' : ''}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* Contractor (only B1) */}
        {isB1 && (
          <Field label="Podratçı" hint="İnvestora ödənişdə boş qoya bilərsiniz">
            <Select value={form.contractorId} onChange={(e) => set('contractorId', e.target.value)}>
              <option value="">— Seçin (istəyə bağlı) —</option>
              {contractors.map(c => <option key={c.id} value={c.id}>{c.companyName} ({c.voen})</option>)}
            </Select>
          </Field>
        )}

        {isB1 && (
          <Field label="Alıcı / Şirkət adı" hint="Podratçı siyahısında olmayan investoru burada yazın">
            <Input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="İnvestor MMC" />
          </Field>
        )}

        {isB1 && (
          <Field label="Ödəmə məqsədi">
            <Input value={form.serviceDescription} onChange={(e) => set('serviceDescription', e.target.value)}
              placeholder="Avadanlıq icarəsi, yanacaq, texniki xidmət..." />
          </Field>
        )}

        {/* Company expense */}
        {isB2 && (
          <Field label="Xərc növü" hint="Kontur, kommunal xərc, ofis, maaş...">
            <Input value={form.serviceDescription} onChange={(e) => set('serviceDescription', e.target.value)}
              placeholder="Kommunal xərc, işçi kontur, ofis icarəsi..." />
          </Field>
        )}

        {isB2 && (
          <Field label="Təchizatçı / Şirkət" hint="İstəyə bağlı">
            <Input value={form.companyName} onChange={(e) => set('companyName', e.target.value)}
              placeholder="Azərenerji, Bakıtelekom..." />
          </Field>
        )}

        {/* Amount + Date */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Məbləğ" required>
            <Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)}
              placeholder="0.00" suffix="₼" disabled={!!timesheetCalc} />
          </Field>
          <Field label="Tarix" required>
            <div className="flex items-center px-[13px]"
              style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '11px', minHeight: '44px' }}>
              <Calendar size={14} style={{ color: 'var(--ces-mute2)' }} className="mr-2 flex-none" />
              <DateInput value={form.invoiceDate} onChange={(e) => set('invoiceDate', e.target.value)}
                className="flex-1 border-0 outline-0 bg-transparent text-[14px] py-[11px] w-full" />
            </div>
          </Field>
        </div>

        {/* Invoice number */}
        <Field label="Qaimə nömrəsi" hint="Seriya + nömrə (məs. MT251010637360)">
          <Input value={form.invoiceNumber} onChange={(e) => set('invoiceNumber', e.target.value)}
            placeholder="MT251010637360" mono />
        </Field>

        {/* Income — Timesheet calculator */}
        {isA && (
          <div className="overflow-hidden" style={{ border: '1px solid var(--ces-line)', borderRadius: '12px' }}>
            <button type="button" onClick={() => setShowTimesheet(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors"
              style={{ background: showTimesheet ? 'var(--ces-gold-50)' : 'var(--ces-graphite-50)' }}>
              <span className="text-[12.5px] font-semibold" style={{ color: showTimesheet ? 'var(--ces-gold-700)' : 'var(--ces-graphite)' }}>
                Aylıq iş cədvəlindən hesabla
              </span>
              {showTimesheet
                ? <ChevronUp size={14} style={{ color: 'var(--ces-gold-700)' }} />
                : <ChevronDown size={14} style={{ color: 'var(--ces-mute2)' }} />}
            </button>
            {showTimesheet && (
              <div className="p-3 space-y-3" style={{ background: 'var(--ces-surface)', borderTop: '1px solid var(--ces-line)' }}>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Ay">
                    <Select value={form.periodMonth} onChange={(e) => set('periodMonth', e.target.value)}>
                      <option value="">Seçin...</option>
                      {AZ_MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </Select>
                  </Field>
                  <Field label="İl">
                    <Input type="number" min="2020" max="2040" value={form.periodYear} onChange={(e) => set('periodYear', e.target.value)} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Standart gün">
                    <Input type="number" min="0" max="31" value={form.standardDays} onChange={(e) => set('standardDays', e.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Əlavə gün">
                    <Input type="number" min="0" max="31" value={form.extraDays} onChange={(e) => set('extraDays', e.target.value)} placeholder="0" />
                  </Field>
                </div>
                <Field label="Əlavə saat">
                  <Input type="number" min="0" step="0.5" value={form.extraHours} onChange={(e) => set('extraHours', e.target.value)} placeholder="0" />
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Aylıq tarif">
                    <Input type="number" min="1" step="0.01" value={form.monthlyRate} onChange={(e) => set('monthlyRate', e.target.value)} suffix="₼" />
                  </Field>
                  <Field label="Norma gün">
                    <Input type="number" min="1" max="31" value={form.workingDaysInMonth} onChange={(e) => set('workingDaysInMonth', e.target.value)} />
                  </Field>
                  <Field label="Norma saat">
                    <Input type="number" min="1" max="24" value={form.workingHoursPerDay} onChange={(e) => set('workingHoursPerDay', e.target.value)} />
                  </Field>
                </div>
                {timesheetCalc && (
                  <div className="px-3 py-2 space-y-1"
                    style={{ background: '#e8fbe5', border: '1px solid rgba(15,157,106,.2)', borderRadius: '10px' }}>
                    {timesheetCalc.stdAmt > 0 && (
                      <div className="flex justify-between text-[11.5px]" style={{ color: 'var(--ces-muted)' }}>
                        <span>Standart gün ({form.standardDays} × {Number(timesheetCalc.daily).toFixed(2)})</span>
                        <span className="num">{Number(timesheetCalc.stdAmt).toFixed(2)} ₼</span>
                      </div>
                    )}
                    {timesheetCalc.extDAmt > 0 && (
                      <div className="flex justify-between text-[11.5px]" style={{ color: 'var(--ces-muted)' }}>
                        <span>Əlavə gün ({form.extraDays} × {Number(timesheetCalc.daily).toFixed(2)})</span>
                        <span className="num">{Number(timesheetCalc.extDAmt).toFixed(2)} ₼</span>
                      </div>
                    )}
                    {timesheetCalc.extHAmt > 0 && (
                      <div className="flex justify-between text-[11.5px]" style={{ color: 'var(--ces-muted)' }}>
                        <span>Əlavə saat ({form.extraHours} saat)</span>
                        <span className="num">{Number(timesheetCalc.extHAmt).toFixed(2)} ₼</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[13px] font-extrabold pt-1.5"
                      style={{ color: 'var(--ces-ok)', borderTop: '1px solid rgba(15,157,106,.2)' }}>
                      <span>Cəmi (avtomatik)</span>
                      <span className="num">{Number(timesheetCalc.total).toFixed(2)} ₼</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Income — extra fields */}
        {isA && (
          <Field label="Texnika adı">
            <Input value={form.equipmentName} onChange={(e) => set('equipmentName', e.target.value)}
              placeholder="Hidravlik Ekskavator, Kran..." />
          </Field>
        )}

        {isA && (
          <Field label="Müştəri" hint="İstəyə bağlı">
            <Select value={form.customerId} onChange={(e) => set('customerId', e.target.value)}>
              <option value="">— Müştəri seçin —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}{c.voen ? ` (${c.voen})` : ''}</option>)}
            </Select>
          </Field>
        )}

        {isA && (
          <Field label="Müştəri şirkəti adı" hint="Siyahıda olmayan müştəri üçün əl ilə yazın">
            <Input value={form.companyName} onChange={(e) => set('companyName', e.target.value)}
              placeholder="ABC İnşaat MMC" />
          </Field>
        )}

        <Field label="Qeydlər">
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Əlavə məlumat..." />
        </Field>
      </form>
    </ModalShell>
  )
}

