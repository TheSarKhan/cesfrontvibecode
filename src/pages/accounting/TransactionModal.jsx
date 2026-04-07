import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import { projectsApi } from '../../api/projects'
import { contractorsApi } from '../../api/contractors'
import { customersApi } from '../../api/customers'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const CATEGORIES = {
  INCOME: [
    { value: 'RENTAL_INCOME', label: 'İcarə gəliri' },
    { value: 'SERVICE_INCOME', label: 'Xidmət gəliri' },
    { value: 'PROJECT_INCOME', label: 'Layihə gəliri' },
    { value: 'TRANSPORT_INCOME', label: 'Daşıma gəliri' },
    { value: 'PENALTY_INCOME', label: 'Cərimə / Penaltı gəliri' },
    { value: 'OTHER_INCOME', label: 'Digər gəlir' },
  ],
  EXPENSE: [
    { value: 'FUEL', label: 'Yanacaq' },
    { value: 'MAINTENANCE', label: 'Texniki xidmət' },
    { value: 'SPARE_PARTS', label: 'Ehtiyat hissələri' },
    { value: 'SALARY', label: 'Əmək haqqı' },
    { value: 'INSURANCE', label: 'Sığorta' },
    { value: 'TAX', label: 'Vergi' },
    { value: 'RENT', label: 'İcarə xərci' },
    { value: 'TRANSPORT', label: 'Daşıma xərci' },
    { value: 'UTILITIES', label: 'Kommunal xərclər' },
    { value: 'OFFICE', label: 'Ofis xərcləri' },
    { value: 'CONTRACTOR_PAYMENT', label: 'Podratçı ödənişi' },
    { value: 'EQUIPMENT_PURCHASE', label: 'Texnika alışı' },
    { value: 'DEPRECIATION', label: 'Amortizasiya' },
    { value: 'PENALTY_EXPENSE', label: 'Cərimə / Penaltı xərci' },
    { value: 'OTHER_EXPENSE', label: 'Digər xərc' },
  ],
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Nağd' },
  { value: 'BANK_TRANSFER', label: 'Bank köçürməsi' },
  { value: 'CARD', label: 'Kart' },
  { value: 'CHECK', label: 'Çek' },
  { value: 'OFFSET', label: 'Qarşılıqlı hesablaşma' },
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

export default function TransactionModal({ editing, defaultType, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState({
    type: editing?.type ?? defaultType ?? 'INCOME',
    category: editing?.category ?? '',
    amount: editing?.amount ?? '',
    transactionDate: editing?.transactionDate ?? new Date().toISOString().slice(0, 10),
    paymentMethod: editing?.paymentMethod ?? 'BANK_TRANSFER',
    referenceNumber: editing?.referenceNumber ?? '',
    description: editing?.description ?? '',
    projectId: editing?.projectId ? String(editing.projectId) : '',
    contractorId: editing?.contractorId ? String(editing.contractorId) : '',
    customerId: editing?.customerId ? String(editing.customerId) : '',
    notes: editing?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [projects, setProjects] = useState([])
  const [contractors, setContractors] = useState([])
  const [customers, setCustomers] = useState([])

  useEffect(() => {
    projectsApi.getAll().then(r => setProjects(r.data.data || r.data || [])).catch(() => {})
    contractorsApi.getAll().then(r => setContractors(r.data.data || r.data || [])).catch(() => {})
    customersApi.getAll().then(r => setCustomers(r.data.data || r.data || [])).catch(() => {})
  }, [])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))
  const isIncome = form.type === 'INCOME'
  const categories = CATEGORIES[form.type] || []

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Məbləğ daxil edin')
    if (!form.transactionDate) return toast.error('Tarix seçin')
    if (!form.category) return toast.error('Kateqoriya seçin')

    setSaving(true)
    const payload = {
      type: form.type,
      category: form.category,
      amount: parseFloat(form.amount),
      transactionDate: form.transactionDate,
      paymentMethod: form.paymentMethod,
      referenceNumber: form.referenceNumber || null,
      description: form.description || null,
      projectId: form.projectId ? parseInt(form.projectId) : null,
      contractorId: form.contractorId ? parseInt(form.contractorId) : null,
      customerId: form.customerId ? parseInt(form.customerId) : null,
      notes: form.notes || null,
    }

    try {
      if (editing) {
        await accountingApi.updateTransaction(editing.id, payload)
        toast.success('Əməliyyat yeniləndi')
      } else {
        await accountingApi.createTransaction(payload)
        toast.success('Əməliyyat əlavə edildi')
      }
      onSaved()
    } catch (err) {
      if (err?.isPending) { onClose?.(); return }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
            {editing ? 'Əməliyyatı Redaktə et' : 'Yeni Əməliyyat'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'INCOME', label: 'Gəlir', color: 'border-green-500 bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400' },
              { value: 'EXPENSE', label: 'Xərc', color: 'border-red-500 bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { set('type', opt.value); set('category', '') }}
                className={clsx(
                  'py-3 rounded-xl border-2 text-center font-semibold text-sm transition-all',
                  form.type === opt.value ? opt.color : 'border-gray-200 dark:border-gray-600 text-gray-400'
                )}
              >
                <span className={form.type === opt.value ? opt.text : ''}>
                  {opt.value === 'INCOME' ? '+' : '−'} {opt.label}
                </span>
              </button>
            ))}
          </div>

          {/* Category */}
          <Field label="Kateqoriya" required>
            <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls}>
              <option value="">— Kateqoriya seçin —</option>
              {categories.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Məbləğ (AZN)" required>
              <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                placeholder="0.00" min="0.01" step="0.01" className={inputCls} />
            </Field>
            <Field label="Tarix" required>
              <input type="date" value={form.transactionDate} onChange={e => set('transactionDate', e.target.value)} className={inputCls} />
            </Field>
          </div>

          {/* Payment method */}
          <Field label="Ödəniş üsulu">
            <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} className={inputCls}>
              {PAYMENT_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </Field>

          {/* Reference number */}
          <Field label="İstinad nömrəsi" hint="Bank əməliyyat nömrəsi, çek nömrəsi və s.">
            <input type="text" value={form.referenceNumber} onChange={e => set('referenceNumber', e.target.value)}
              placeholder="REF-2026-001" className={inputCls} />
          </Field>

          {/* Project */}
          <Field label="Layihə" hint="Əlaqəli layihə varsa seçin">
            <select value={form.projectId} onChange={e => set('projectId', e.target.value)} className={inputCls}>
              <option value="">— Layihə seçin (könüllü) —</option>
              {projects.filter(p => ['ACTIVE', 'COMPLETED'].includes(p.status)).map(p => (
                <option key={p.id} value={p.id}>
                  {p.projectCode || `PRJ-${String(p.id).padStart(4, '0')}`} · {p.companyName}
                </option>
              ))}
            </select>
          </Field>

          {/* Customer (for income) */}
          {isIncome && (
            <Field label="Müştəri">
              <select value={form.customerId} onChange={e => set('customerId', e.target.value)} className={inputCls}>
                <option value="">— Müştəri seçin (könüllü) —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </Field>
          )}

          {/* Contractor (for expense) */}
          {!isIncome && (
            <Field label="Podratçı">
              <select value={form.contractorId} onChange={e => set('contractorId', e.target.value)} className={inputCls}>
                <option value="">— Podratçı seçin (könüllü) —</option>
                {contractors.map(c => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </Field>
          )}

          {/* Description */}
          <Field label="Açıqlama">
            <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Əməliyyat haqqında qısa məlumat" className={inputCls} />
          </Field>

          {/* Notes */}
          <Field label="Qeydlər">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={2} placeholder="Əlavə qeydlər..."
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
