import { useState } from 'react'
import { X } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const BUDGET_CATEGORIES = [
  { value: 'FUEL', label: 'Yanacaq' },
  { value: 'MAINTENANCE', label: 'Texniki xidmət' },
  { value: 'SPARE_PARTS', label: 'Ehtiyat hissələri' },
  { value: 'SALARY', label: 'Əmək haqqı' },
  { value: 'INSURANCE', label: 'Sığorta' },
  { value: 'TAX', label: 'Vergi' },
  { value: 'RENT', label: 'İcarə xərci' },
  { value: 'TRANSPORT', label: 'Daşıma' },
  { value: 'UTILITIES', label: 'Kommunal' },
  { value: 'OFFICE', label: 'Ofis' },
  { value: 'EQUIPMENT_PURCHASE', label: 'Texnika alışı' },
  { value: 'MARKETING', label: 'Marketinq' },
  { value: 'LEGAL', label: 'Hüquqi xidmət' },
  { value: 'CONTRACTOR_PAYMENT', label: 'Podratçı ödənişi' },
  { value: 'OTHER', label: 'Digər' },
]

const PERIODS = [
  { value: 'MONTHLY', label: 'Aylıq' },
  { value: 'QUARTERLY', label: 'Rüblük' },
  { value: 'YEARLY', label: 'İllik' },
]

const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
]

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500'

function Field({ label, required, children, hint }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function BudgetModal({ editing, onClose, onSaved }) {
  useEscapeKey(onClose)
  const now = new Date()
  const [form, setForm] = useState({
    category: editing?.category ?? '',
    plannedAmount: editing?.plannedAmount ?? '',
    period: editing?.period ?? 'MONTHLY',
    year: editing?.year ?? now.getFullYear(),
    month: editing?.month ?? (now.getMonth() + 1),
    quarter: editing?.quarter ?? Math.ceil((now.getMonth() + 1) / 3),
    notes: editing?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.category) return toast.error('Kateqoriya seçin')
    if (!form.plannedAmount || parseFloat(form.plannedAmount) <= 0) return toast.error('Büdcə məbləği daxil edin')

    setSaving(true)
    const payload = {
      category: form.category,
      plannedAmount: parseFloat(form.plannedAmount),
      period: form.period,
      year: parseInt(form.year),
      month: form.period === 'MONTHLY' ? parseInt(form.month) : null,
      quarter: form.period === 'QUARTERLY' ? parseInt(form.quarter) : null,
      notes: form.notes || null,
    }

    try {
      if (editing) {
        await accountingApi.updateBudget(editing.id, payload)
        toast.success('Büdcə yeniləndi')
      } else {
        await accountingApi.createBudget(payload)
        toast.success('Büdcə əlavə edildi')
      }
      onSaved()
    } catch (err) {
      if (err?.isPending) { onClose?.(); return }
      toast.error(err?.response?.data?.message || 'Uğursuz oldu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
            {editing ? 'Büdcəni Redaktə et' : 'Yeni Büdcə'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Category */}
          <Field label="Kateqoriya" required>
            <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls}>
              <option value="">— Kateqoriya seçin —</option>
              {BUDGET_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>

          {/* Amount */}
          <Field label="Planlaşdırılmış məbləğ (AZN)" required>
            <input type="number" value={form.plannedAmount} onChange={e => set('plannedAmount', e.target.value)}
              placeholder="0.00" min="0.01" step="0.01" className={inputCls} />
          </Field>

          {/* Period */}
          <Field label="Dövr">
            <div className="grid grid-cols-3 gap-2">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set('period', p.value)}
                  className={clsx(
                    'py-2 rounded-lg border text-xs font-semibold transition-all text-center',
                    form.period === p.value
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Year */}
          <Field label="İl" required>
            <select value={form.year} onChange={e => set('year', e.target.value)} className={inputCls}>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </Field>

          {/* Month (if monthly) */}
          {form.period === 'MONTHLY' && (
            <Field label="Ay">
              <select value={form.month} onChange={e => set('month', e.target.value)} className={inputCls}>
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </Field>
          )}

          {/* Quarter (if quarterly) */}
          {form.period === 'QUARTERLY' && (
            <Field label="Rüb">
              <select value={form.quarter} onChange={e => set('quarter', e.target.value)} className={inputCls}>
                <option value={1}>1-ci rüb (Yan-Mar)</option>
                <option value={2}>2-ci rüb (Apr-İyn)</option>
                <option value={3}>3-cü rüb (İyl-Sen)</option>
                <option value={4}>4-cü rüb (Okt-Dek)</option>
              </select>
            </Field>
          )}

          {/* Notes */}
          <Field label="Qeydlər">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={2} placeholder="Büdcə haqqında qeydlər..."
              className={clsx(inputCls, 'resize-none')} />
          </Field>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            Ləğv et
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
            {saving ? 'Saxlanılır...' : (editing ? 'Yenilə' : 'Əlavə et')}
          </button>
        </div>
      </div>
    </div>
  )
}
