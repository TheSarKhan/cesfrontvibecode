import DateInput from '../../components/common/DateInput'
import { useState, useEffect } from 'react'
import { X, CreditCard, Pencil } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import { contractorsApi } from '../../api/contractors'
import { customersApi } from '../../api/customers'
import { investorsApi } from '../../api/investors'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const DIRECTIONS = [
  { value: 'OUTGOING', label: 'Ödəniş (Çıxan)', desc: 'Şirkətdən xaric', color: 'border-red-500 bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400' },
  { value: 'INCOMING', label: 'Daxilolma (Gələn)', desc: 'Şirkətə daxil', color: 'border-green-500 bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400' },
]

const STATUSES = [
  { value: 'PENDING', label: 'Gözləyir' },
  { value: 'COMPLETED', label: 'Tamamlanıb' },
  { value: 'CANCELLED', label: 'Ləğv edilib' },
  { value: 'OVERDUE', label: 'Gecikib' },
]

const METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank köçürməsi' },
  { value: 'CASH', label: 'Nağd' },
  { value: 'CARD', label: 'Kart' },
  { value: 'CHECK', label: 'Çek' },
  { value: 'OFFSET', label: 'Qarşılıqlı hesablaşma' },
]

const PARTY_TYPES = [
  { value: 'CONTRACTOR', label: 'Podratçı' },
  { value: 'CUSTOMER', label: 'Müştəri' },
  { value: 'INVESTOR', label: 'İnvestor' },
  { value: 'OTHER', label: 'Digər' },
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

export default function PaymentModal({ editing, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState({
    direction: editing?.direction ?? 'OUTGOING',
    amount: editing?.amount ?? '',
    paymentDate: editing?.paymentDate ?? new Date().toISOString().slice(0, 10),
    dueDate: editing?.dueDate ?? '',
    status: editing?.status ?? 'PENDING',
    paymentMethod: editing?.paymentMethod ?? 'BANK_TRANSFER',
    referenceNumber: editing?.referenceNumber ?? '',
    partyType: editing?.partyType ?? 'CONTRACTOR',
    partyId: editing?.partyId ? String(editing.partyId) : '',
    partyName: editing?.partyName ?? '',
    invoiceId: editing?.invoiceId ? String(editing.invoiceId) : '',
    description: editing?.description ?? '',
    notes: editing?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [contractors, setContractors] = useState([])
  const [customers, setCustomers] = useState([])
  const [investors, setInvestors] = useState([])

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
    e.preventDefault()
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Məbləğ daxil edin')
    if (!form.paymentDate) return toast.error('Ödəniş tarixi seçin')

    setSaving(true)
    const selectedParty = partyList.find(p => String(p.id) === form.partyId)
    const payload = {
      direction: form.direction,
      amount: parseFloat(form.amount),
      paymentDate: form.paymentDate,
      dueDate: form.dueDate || null,
      status: form.status,
      paymentMethod: form.paymentMethod,
      referenceNumber: form.referenceNumber || null,
      partyType: form.partyType,
      partyId: form.partyId ? parseInt(form.partyId) : null,
      partyName: selectedParty?.companyName || form.partyName || null,
      invoiceId: form.invoiceId ? parseInt(form.invoiceId) : null,
      description: form.description || null,
      notes: form.notes || null,
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
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            {editing ? <Pencil size={16} className="text-amber-500 shrink-0" /> : <CreditCard size={16} className="text-amber-500 shrink-0" />}
            {editing ? 'Ödənişi Redaktə et' : 'Yeni Ödəniş'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Direction */}
          <div className="grid grid-cols-2 gap-2">
            {DIRECTIONS.map(d => (
              <button
                key={d.value}
                type="button"
                onClick={() => set('direction', d.value)}
                className={clsx(
                  'py-3 rounded-xl border-2 text-center transition-all',
                  form.direction === d.value ? d.color : 'border-gray-200 dark:border-gray-600'
                )}
              >
                <p className={clsx('text-sm font-semibold', form.direction === d.value ? d.text : 'text-gray-400')}>{d.label}</p>
                <p className={clsx('text-[10px]', form.direction === d.value ? d.text : 'text-gray-400')}>{d.desc}</p>
              </button>
            ))}
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Məbləğ (AZN)" required>
              <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                placeholder="0.00" min="0.01" step="0.01" className={inputCls} />
            </Field>
            <Field label="Ödəniş tarixi" required>
              <DateInput value={form.paymentDate} onChange={e => set('paymentDate', e.target.value)} className={inputCls} />
            </Field>
          </div>

          {/* Due date + Status */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Son ödəniş tarixi" hint="Vaxtında ödənilməlidir">
              <DateInput value={form.dueDate} onChange={e => set('dueDate', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Payment method */}
          <Field label="Ödəniş üsulu">
            <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} className={inputCls}>
              {METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </Field>

          {/* Reference number */}
          <Field label="İstinad nömrəsi">
            <input type="text" value={form.referenceNumber} onChange={e => set('referenceNumber', e.target.value)}
              placeholder="Bank əməliyyat nömrəsi..." className={inputCls} />
          </Field>

          {/* Party */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tərəf növü">
              <select value={form.partyType} onChange={e => { set('partyType', e.target.value); set('partyId', ''); set('partyName', '') }} className={inputCls}>
                {PARTY_TYPES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Tərəf">
              {form.partyType === 'OTHER' ? (
                <input type="text" value={form.partyName} onChange={e => set('partyName', e.target.value)}
                  placeholder="Ad daxil edin" className={inputCls} />
              ) : (
                <select value={form.partyId} onChange={e => set('partyId', e.target.value)} className={inputCls}>
                  <option value="">— Seçin —</option>
                  {partyList.map(p => (
                    <option key={p.id} value={p.id}>{p.companyName}</option>
                  ))}
                </select>
              )}
            </Field>
          </div>

          {/* Description + Notes */}
          <Field label="Açıqlama">
            <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Ödənişin təyinatı" className={inputCls} />
          </Field>

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
