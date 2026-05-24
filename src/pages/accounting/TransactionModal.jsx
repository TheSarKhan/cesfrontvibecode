import DateInput from '../../components/common/DateInput'
import { useState, useEffect } from 'react'
import { ArrowLeftRight, Pencil } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import { projectsApi } from '../../api/projects'
import { contractorsApi } from '../../api/contractors'
import { customersApi } from '../../api/customers'
import toast from 'react-hot-toast'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { Field, Input, Textarea, Select, ModalShell } from './_shared'

const CATEGORIES = {
  INCOME: [
    { value: 'RENTAL_INCOME',    label: 'İcarə gəliri' },
    { value: 'SERVICE_INCOME',   label: 'Xidmət gəliri' },
    { value: 'PROJECT_INCOME',   label: 'Layihə gəliri' },
    { value: 'TRANSPORT_INCOME', label: 'Daşıma gəliri' },
    { value: 'PENALTY_INCOME',   label: 'Cərimə / Penaltı gəliri' },
    { value: 'OTHER_INCOME',     label: 'Digər gəlir' },
  ],
  EXPENSE: [
    { value: 'FUEL',               label: 'Yanacaq' },
    { value: 'MAINTENANCE',        label: 'Texniki xidmət' },
    { value: 'SPARE_PARTS',        label: 'Ehtiyat hissələri' },
    { value: 'SALARY',             label: 'Əmək haqqı' },
    { value: 'INSURANCE',          label: 'Sığorta' },
    { value: 'TAX',                label: 'Vergi' },
    { value: 'RENT',               label: 'İcarə xərci' },
    { value: 'TRANSPORT',          label: 'Daşıma xərci' },
    { value: 'UTILITIES',          label: 'Kommunal xərclər' },
    { value: 'OFFICE',             label: 'Ofis xərcləri' },
    { value: 'CONTRACTOR_PAYMENT', label: 'Podratçı ödənişi' },
    { value: 'EQUIPMENT_PURCHASE', label: 'Texnika alışı' },
    { value: 'DEPRECIATION',       label: 'Amortizasiya' },
    { value: 'PENALTY_EXPENSE',    label: 'Cərimə / Penaltı xərci' },
    { value: 'OTHER_EXPENSE',      label: 'Digər xərc' },
  ],
}

const PAYMENT_METHODS = [
  { value: 'CASH',          label: 'Nağd' },
  { value: 'BANK_TRANSFER', label: 'Bank köçürməsi' },
  { value: 'CARD',          label: 'Kart' },
  { value: 'CHECK',         label: 'Çek' },
  { value: 'OFFSET',        label: 'Qarşılıqlı hesablaşma' },
]

const TONE_BG = {
  ok:     { bg: 'var(--ces-ok-100)', color: 'var(--ces-ok)',     border: 'var(--ces-ok)' },
  danger: { bg: 'var(--ces-danger-100)', color: 'var(--ces-danger)', border: 'var(--ces-danger)' },
}

export default function TransactionModal({ editing, defaultType, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState({
    type:            editing?.type            ?? defaultType ?? 'INCOME',
    category:        editing?.category        ?? '',
    amount:          editing?.amount          ?? '',
    transactionDate: editing?.transactionDate ?? new Date().toISOString().slice(0, 10),
    paymentMethod:   editing?.paymentMethod   ?? 'BANK_TRANSFER',
    referenceNumber: editing?.referenceNumber ?? '',
    description:     editing?.description     ?? '',
    projectId:       editing?.projectId       ? String(editing.projectId)    : '',
    contractorId:    editing?.contractorId    ? String(editing.contractorId) : '',
    customerId:      editing?.customerId      ? String(editing.customerId)   : '',
    notes:           editing?.notes           ?? '',
  })
  const [saving, setSaving]             = useState(false)
  const [projects, setProjects]         = useState([])
  const [contractors, setContractors]   = useState([])
  const [customers, setCustomers]       = useState([])

  useEffect(() => {
    projectsApi.getAll().then(r => setProjects(r.data.data || r.data || [])).catch(() => {})
    contractorsApi.getAll().then(r => setContractors(r.data.data || r.data || [])).catch(() => {})
    customersApi.getAll().then(r => setCustomers(r.data.data || r.data || [])).catch(() => {})
  }, [])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))
  const isIncome = form.type === 'INCOME'
  const categories = CATEGORIES[form.type] || []

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Məbləğ daxil edin')
    if (!form.transactionDate) return toast.error('Tarix seçin')
    if (!form.category) return toast.error('Kateqoriya seçin')

    setSaving(true)
    const payload = {
      type:            form.type,
      category:        form.category,
      amount:          parseFloat(form.amount),
      transactionDate: form.transactionDate,
      paymentMethod:   form.paymentMethod,
      referenceNumber: form.referenceNumber || null,
      description:     form.description || null,
      projectId:       form.projectId    ? parseInt(form.projectId)    : null,
      contractorId:    form.contractorId ? parseInt(form.contractorId) : null,
      customerId:      form.customerId   ? parseInt(form.customerId)   : null,
      notes:           form.notes || null,
    }

    try {
      if (editing) { await accountingApi.updateTransaction(editing.id, payload); toast.success('Əməliyyat yeniləndi') }
      else { await accountingApi.createTransaction(payload); toast.success('Əməliyyat əlavə edildi') }
      onSaved()
    } catch (err) {
      if (err?.isPending) { onClose?.(); return }
    } finally { setSaving(false) }
  }

  return (
    <ModalShell
      icon={editing ? Pencil : ArrowLeftRight}
      eyebrow={editing ? 'Redaktə' : 'Yeni qeyd'}
      title={editing ? 'Əməliyyatı redaktə et' : 'Yeni əməliyyat'}
      subtitle="Gəlir/xərc kateqoriyası və məbləğ"
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
        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'INCOME',  label: 'Gəlir', tone: 'ok',     sign: '+' },
            { value: 'EXPENSE', label: 'Xərc',  tone: 'danger', sign: '−' },
          ].map(opt => {
            const on = form.type === opt.value
            const t = TONE_BG[opt.tone]
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { set('type', opt.value); set('category', '') }}
                className="py-3 text-center font-bold text-[14px] transition-all"
                style={{
                  background: on ? t.bg : 'var(--ces-surface)',
                  border: `1px solid ${on ? t.border : 'var(--ces-line)'}`,
                  borderRadius: '12px',
                  color: on ? t.color : 'var(--ces-mute2)',
                  boxShadow: on ? `0 0 0 3px ${t.bg}` : 'none',
                }}
              >
                {opt.sign} {opt.label}
              </button>
            )
          })}
        </div>

        <Field label="Kateqoriya" required>
          <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">— Kateqoriya seçin —</option>
            {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Məbləğ" required>
            <Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" suffix="₼" />
          </Field>
          <Field label="Tarix" required>
            <div className="flex items-center px-[13px]"
              style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '11px', minHeight: '44px' }}>
              <DateInput value={form.transactionDate} onChange={(e) => set('transactionDate', e.target.value)}
                className="flex-1 border-0 outline-0 bg-transparent text-[14px] py-[11px] w-full" />
            </div>
          </Field>
        </div>

        <Field label="Ödəniş üsulu">
          <Select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
        </Field>

        <Field label="İstinad nömrəsi" hint="Bank əməliyyat nömrəsi, çek nömrəsi və s.">
          <Input value={form.referenceNumber} onChange={(e) => set('referenceNumber', e.target.value)} placeholder="REF-2026-001" />
        </Field>

        <Field label="Layihə" hint="Əlaqəli layihə varsa seçin">
          <Select value={form.projectId} onChange={(e) => set('projectId', e.target.value)}>
            <option value="">— Layihə seçin (könüllü) —</option>
            {projects.filter(p => ['ACTIVE', 'COMPLETED'].includes(p.status)).map(p => (
              <option key={p.id} value={p.id}>
                {p.projectCode || `PRJ-${String(p.id).padStart(4, '0')}`} · {p.companyName}
              </option>
            ))}
          </Select>
        </Field>

        {isIncome ? (
          <Field label="Müştəri">
            <Select value={form.customerId} onChange={(e) => set('customerId', e.target.value)}>
              <option value="">— Müştəri seçin (könüllü) —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </Select>
          </Field>
        ) : (
          <Field label="Podratçı">
            <Select value={form.contractorId} onChange={(e) => set('contractorId', e.target.value)}>
              <option value="">— Podratçı seçin (könüllü) —</option>
              {contractors.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </Select>
          </Field>
        )}

        <Field label="Açıqlama">
          <Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Əməliyyat haqqında qısa məlumat" />
        </Field>

        <Field label="Qeydlər">
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Əlavə qeydlər..." />
        </Field>
      </form>
    </ModalShell>
  )
}
