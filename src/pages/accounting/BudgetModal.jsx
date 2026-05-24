import { useState } from 'react'
import { PiggyBank, Pencil } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import toast from 'react-hot-toast'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { Field, Input, Textarea, Select, ModalShell } from './_shared'
import { AZ_MONTHS } from './_constants'

const BUDGET_CATEGORIES = [
  { value: 'FUEL',               label: 'Yanacaq' },
  { value: 'MAINTENANCE',        label: 'Texniki xidmət' },
  { value: 'SPARE_PARTS',        label: 'Ehtiyat hissələri' },
  { value: 'SALARY',             label: 'Əmək haqqı' },
  { value: 'INSURANCE',          label: 'Sığorta' },
  { value: 'TAX',                label: 'Vergi' },
  { value: 'RENT',               label: 'İcarə xərci' },
  { value: 'TRANSPORT',          label: 'Daşıma' },
  { value: 'UTILITIES',          label: 'Kommunal' },
  { value: 'OFFICE',             label: 'Ofis' },
  { value: 'EQUIPMENT_PURCHASE', label: 'Texnika alışı' },
  { value: 'MARKETING',          label: 'Marketinq' },
  { value: 'LEGAL',              label: 'Hüquqi xidmət' },
  { value: 'CONTRACTOR_PAYMENT', label: 'Podratçı ödənişi' },
  { value: 'OTHER',              label: 'Digər' },
]

const PERIODS = [
  { value: 'MONTHLY',   label: 'Aylıq' },
  { value: 'QUARTERLY', label: 'Rüblük' },
  { value: 'YEARLY',    label: 'İllik' },
]

export default function BudgetModal({ editing, onClose, onSaved }) {
  useEscapeKey(onClose)
  const now = new Date()
  const [form, setForm] = useState({
    category:      editing?.category      ?? '',
    plannedAmount: editing?.plannedAmount ?? '',
    period:        editing?.period        ?? 'MONTHLY',
    year:          editing?.year          ?? now.getFullYear(),
    month:         editing?.month         ?? (now.getMonth() + 1),
    quarter:       editing?.quarter       ?? Math.ceil((now.getMonth() + 1) / 3),
    notes:         editing?.notes         ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (!form.category) return toast.error('Kateqoriya seçin')
    if (!form.plannedAmount || parseFloat(form.plannedAmount) <= 0) return toast.error('Büdcə məbləği daxil edin')

    setSaving(true)
    const payload = {
      category:      form.category,
      plannedAmount: parseFloat(form.plannedAmount),
      period:        form.period,
      year:          parseInt(form.year),
      month:         form.period === 'MONTHLY' ? parseInt(form.month) : null,
      quarter:       form.period === 'QUARTERLY' ? parseInt(form.quarter) : null,
      notes:         form.notes || null,
    }

    try {
      if (editing) { await accountingApi.updateBudget(editing.id, payload); toast.success('Büdcə yeniləndi') }
      else { await accountingApi.createBudget(payload); toast.success('Büdcə əlavə edildi') }
      onSaved()
    } catch (err) {
      if (err?.isPending) { onClose?.(); return }
    } finally { setSaving(false) }
  }

  return (
    <ModalShell
      icon={editing ? Pencil : PiggyBank}
      eyebrow={editing ? 'Redaktə' : 'Yeni qeyd'}
      title={editing ? 'Büdcəni redaktə et' : 'Yeni büdcə'}
      subtitle="Kateqoriya, məbləğ və dövr"
      onClose={onClose}
      tone={editing ? 'gold' : 'graphite'}
      maxWidth="480px"
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
        <Field label="Kateqoriya" required>
          <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">— Kateqoriya seçin —</option>
            {BUDGET_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </Field>

        <Field label="Planlaşdırılmış məbləğ" required>
          <Input type="number" min="0.01" step="0.01" value={form.plannedAmount}
            onChange={(e) => set('plannedAmount', e.target.value)} placeholder="0.00" suffix="₼" />
        </Field>

        <Field label="Dövr">
          <div className="grid grid-cols-3 gap-2">
            {PERIODS.map(p => {
              const on = form.period === p.value
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set('period', p.value)}
                  className="py-2.5 text-[12.5px] font-semibold transition-colors"
                  style={{
                    background: on ? 'var(--ces-graphite)' : 'var(--ces-surface)',
                    color: on ? 'var(--ces-on-primary)' : 'var(--ces-muted)',
                    border: `1px solid ${on ? 'var(--ces-graphite)' : 'var(--ces-line)'}`,
                    borderRadius: '10px',
                  }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="İl" required>
            <Select value={form.year} onChange={(e) => set('year', e.target.value)}>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
          </Field>

          {form.period === 'MONTHLY' && (
            <Field label="Ay">
              <Select value={form.month} onChange={(e) => set('month', e.target.value)}>
                {AZ_MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </Select>
            </Field>
          )}

          {form.period === 'QUARTERLY' && (
            <Field label="Rüb">
              <Select value={form.quarter} onChange={(e) => set('quarter', e.target.value)}>
                <option value={1}>1-ci rüb (Yan-Mar)</option>
                <option value={2}>2-ci rüb (Apr-İyn)</option>
                <option value={3}>3-cü rüb (İyl-Sen)</option>
                <option value={4}>4-cü rüb (Okt-Dek)</option>
              </Select>
            </Field>
          )}
        </div>

        <Field label="Qeydlər">
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
            placeholder="Büdcə haqqında qeydlər..." />
        </Field>
      </form>
    </ModalShell>
  )
}
