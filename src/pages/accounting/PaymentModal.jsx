import DateInput from '../../components/common/DateInput'
import { useState, useEffect } from 'react'
import { CreditCard, Pencil, ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import { contractorsApi } from '../../api/contractors'
import { customersApi } from '../../api/customers'
import { investorsApi } from '../../api/investors'
import toast from 'react-hot-toast'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { Field, Input, Textarea, Select, ModalShell } from './_shared'

const DIRECTIONS = [
  { value: 'OUTGOING', label: 'Ödəniş (Çıxan)', desc: 'Şirkətdən xaric', tone: 'danger', icon: ArrowUpRight },
  { value: 'INCOMING', label: 'Daxilolma (Gələn)', desc: 'Şirkətə daxil', tone: 'ok',     icon: ArrowDownRight },
]

const STATUSES = [
  { value: 'PENDING',   label: 'Gözləyir' },
  { value: 'COMPLETED', label: 'Tamamlanıb' },
  { value: 'CANCELLED', label: 'Ləğv edilib' },
  { value: 'OVERDUE',   label: 'Gecikib' },
]

const METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank köçürməsi' },
  { value: 'CASH',          label: 'Nağd' },
  { value: 'CARD',          label: 'Kart' },
  { value: 'CHECK',         label: 'Çek' },
  { value: 'OFFSET',        label: 'Qarşılıqlı hesablaşma' },
]

const PARTY_TYPES = [
  { value: 'CONTRACTOR', label: 'Podratçı' },
  { value: 'CUSTOMER',   label: 'Müştəri' },
  { value: 'INVESTOR',   label: 'İnvestor' },
  { value: 'OTHER',      label: 'Digər' },
]

const TONE_BG = {
  ok:     { bg: 'var(--ces-ok-100)', color: 'var(--ces-ok)',     border: 'var(--ces-ok)' },
  danger: { bg: 'var(--ces-danger-100)', color: 'var(--ces-danger)', border: 'var(--ces-danger)' },
}

export default function PaymentModal({ editing, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState({
    direction:       editing?.direction       ?? 'OUTGOING',
    amount:          editing?.amount          ?? '',
    paymentDate:     editing?.paymentDate     ?? new Date().toISOString().slice(0, 10),
    dueDate:         editing?.dueDate         ?? '',
    status:          editing?.status          ?? 'PENDING',
    paymentMethod:   editing?.paymentMethod   ?? 'BANK_TRANSFER',
    referenceNumber: editing?.referenceNumber ?? '',
    partyType:       editing?.partyType       ?? 'CONTRACTOR',
    partyId:         editing?.partyId         ? String(editing.partyId) : '',
    partyName:       editing?.partyName       ?? '',
    invoiceId:       editing?.invoiceId       ? String(editing.invoiceId) : '',
    description:     editing?.description     ?? '',
    notes:           editing?.notes           ?? '',
  })
  const [saving, setSaving]           = useState(false)
  const [contractors, setContractors] = useState([])
  const [customers, setCustomers]     = useState([])
  const [investors, setInvestors]     = useState([])

  useEffect(() => {
    contractorsApi.getAll().then(r => setContractors(r.data.data || r.data || [])).catch(() => {})
    customersApi.getAll().then(r => setCustomers(r.data.data || r.data || [])).catch(() => {})
    investorsApi.getAll().then(r => setInvestors(r.data.data || r.data || [])).catch(() => {})
  }, [])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const partyList = form.partyType === 'CONTRACTOR' ? contractors
    : form.partyType === 'CUSTOMER' ? customers
    : form.partyType === 'INVESTOR' ? investors
    : []

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Məbləğ daxil edin')
    if (!form.paymentDate) return toast.error('Ödəniş tarixi seçin')

    setSaving(true)
    const selectedParty = partyList.find(p => String(p.id) === form.partyId)
    const payload = {
      direction:       form.direction,
      amount:          parseFloat(form.amount),
      paymentDate:     form.paymentDate,
      dueDate:         form.dueDate || null,
      status:          form.status,
      paymentMethod:   form.paymentMethod,
      referenceNumber: form.referenceNumber || null,
      partyType:       form.partyType,
      partyId:         form.partyId   ? parseInt(form.partyId)   : null,
      partyName:       selectedParty?.companyName || form.partyName || null,
      invoiceId:       form.invoiceId ? parseInt(form.invoiceId) : null,
      description:     form.description || null,
      notes:           form.notes || null,
    }

    try {
      if (editing) {
        await accountingApi.updatePayment(editing.id, payload)
        toast.success('Ödəniş yeniləndi')
      } else {
        await accountingApi.createPayment(payload)
        toast.success('Ödəniş əlavə edildi')
      }
      onSaved()
    } catch (err) {
      if (err?.isPending) { onClose?.(); return }
    } finally { setSaving(false) }
  }

  return (
    <ModalShell
      icon={editing ? Pencil : CreditCard}
      eyebrow={editing ? 'Redaktə' : 'Yeni qeyd'}
      title={editing ? 'Ödənişi redaktə et' : 'Yeni ödəniş'}
      subtitle="İstiqamət, məbləğ və tərəf məlumatları"
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
        {/* Direction */}
        <div className="grid grid-cols-2 gap-2">
          {DIRECTIONS.map(d => {
            const on = form.direction === d.value
            const t = TONE_BG[d.tone]
            const Icon = d.icon
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => set('direction', d.value)}
                className="py-3 text-center transition-all flex flex-col items-center gap-1"
                style={{
                  background: on ? t.bg : 'var(--ces-surface)',
                  border: `1px solid ${on ? t.border : 'var(--ces-line)'}`,
                  borderRadius: '12px',
                  boxShadow: on ? `0 0 0 3px ${t.bg}` : 'none',
                }}
              >
                <Icon size={16} style={{ color: on ? t.color : 'var(--ces-mute2)' }} />
                <p className="text-[13px] font-bold" style={{ color: on ? t.color : 'var(--ces-ink)' }}>{d.label}</p>
                <p className="text-[10.5px]" style={{ color: on ? t.color : 'var(--ces-muted)', opacity: on ? 0.85 : 1 }}>{d.desc}</p>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Məbləğ" required>
            <Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" suffix="₼" />
          </Field>
          <Field label="Ödəniş tarixi" required>
            <div className="flex items-center px-[13px]"
              style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '11px', minHeight: '44px' }}>
              <DateInput value={form.paymentDate} onChange={(e) => set('paymentDate', e.target.value)}
                className="flex-1 border-0 outline-0 bg-transparent text-[14px] py-[11px] w-full" />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Son ödəniş tarixi" hint="Vaxtında ödənilməlidir">
            <div className="flex items-center px-[13px]"
              style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '11px', minHeight: '44px' }}>
              <DateInput value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)}
                className="flex-1 border-0 outline-0 bg-transparent text-[14px] py-[11px] w-full" />
            </div>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </Field>
        </div>

        <Field label="Ödəniş üsulu">
          <Select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
            {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
        </Field>

        <Field label="İstinad nömrəsi">
          <Input value={form.referenceNumber} onChange={(e) => set('referenceNumber', e.target.value)}
            placeholder="Bank əməliyyat nömrəsi..." />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tərəf növü">
            <Select value={form.partyType} onChange={(e) => { set('partyType', e.target.value); set('partyId', ''); set('partyName', '') }}>
              {PARTY_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </Field>
          <Field label="Tərəf">
            {form.partyType === 'OTHER' ? (
              <Input value={form.partyName} onChange={(e) => set('partyName', e.target.value)} placeholder="Ad daxil edin" />
            ) : (
              <Select value={form.partyId} onChange={(e) => set('partyId', e.target.value)}>
                <option value="">— Seçin —</option>
                {partyList.map(p => <option key={p.id} value={p.id}>{p.companyName}</option>)}
              </Select>
            )}
          </Field>
        </div>

        <Field label="Açıqlama">
          <Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Ödənişin təyinatı" />
        </Field>

        <Field label="Qeydlər">
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Əlavə qeydlər..." />
        </Field>
      </form>
    </ModalShell>
  )
}
