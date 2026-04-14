import { useState, useEffect } from 'react'
import { X, TrendingUp, Pencil } from 'lucide-react'
import { investorsApi } from '../../api/investors'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const RISK_OPTIONS = [
  { value: 'LOW', label: 'Aşağı' },
  { value: 'MEDIUM', label: 'Orta' },
  { value: 'HIGH', label: 'Yüksək' },
]

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Aktiv' },
  { value: 'INACTIVE', label: 'Deaktiv' },
]

const PAYMENT_OPTIONS = [
  { value: 'CASH', label: 'Nağd' },
  { value: 'TRANSFER', label: 'Köçürmə' },
]

const EMPTY = {
  companyName: '',
  voen: '',
  contactPerson: '',
  contactPhone: '',
  address: '',
  paymentType: [],
  status: 'ACTIVE',
  riskLevel: 'LOW',
  rating: '',
  notes: '',
}

export default function InvestorModal({ editing, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editing) {
      setForm({
        companyName: editing.companyName || '',
        voen: editing.voen || '',
        contactPerson: editing.contactPerson || '',
        contactPhone: editing.contactPhone || '',
        address: editing.address || '',
        paymentType: editing.paymentType ? editing.paymentType.split(',').filter(Boolean) : [],
        status: editing.status || 'ACTIVE',
        riskLevel: editing.riskLevel || 'LOW',
        rating: editing.rating ?? '',
        notes: editing.notes || '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [editing])

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validate = () => {
    const errs = {}
    if (!form.companyName?.trim()) errs.companyName = 'Şirkət adı tələb olunur'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      ...form,
      paymentType: form.paymentType.join(','),
      rating: form.rating !== '' ? parseFloat(form.rating) : null,
    }

    setLoading(true)
    try {
      if (editing) {
        await investorsApi.update(editing.id, payload)
        toast.success('İnvestor yeniləndi')
      } else {
        await investorsApi.create(payload)
        toast.success('İnvestor əlavə edildi')
      }
      onSaved()
    } catch (err) {
      if (err?.isPending) { onClose?.(); return }
      toast.error('Əməliyyat uğursuz oldu')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = (field) => clsx(
    'w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent',
    errors[field]
      ? 'border-red-400 dark:border-red-500 focus:ring-red-400'
      : 'border-gray-200 dark:border-gray-600 focus:ring-amber-500'
  )
  const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              {editing ? <Pencil size={18} className="text-amber-500 shrink-0" /> : <TrendingUp size={18} className="text-amber-500 shrink-0" />}
              {editing ? 'İnvestoru redaktə et' : 'Yeni investor əlavə et'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {editing ? editing.companyName : 'Məlumatları doldurun'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors shrink-0"
          >
            <X size={14} className="text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
            <div>
              <label className={labelCls}>Şirkətin adı <span className="text-red-500">*</span></label>
              <input type="text" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="MMC / ASC adı" className={inputCls('companyName')} />
              {errors.companyName && <p className="mt-1 text-xs text-red-500">{errors.companyName}</p>}
            </div>

            <div>
              <label className={labelCls}>VÖEN</label>
              <input type="text" value={form.voen} onChange={(e) => set('voen', e.target.value)} placeholder="1234567890" className={inputCls('')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Əlaqə şəxsi</label>
                <input type="text" value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} placeholder="Ad Soyad" className={inputCls('')} />
              </div>
              <div>
                <label className={labelCls}>Telefon</label>
                <input type="text" value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} placeholder="+994501234567" className={inputCls('')} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Ünvan</label>
              <input type="text" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Şəhər, küçə" className={inputCls('')} />
            </div>

            <div>
              <label className={labelCls}>Ödəniş növü</label>
              <div className="flex gap-2">
                {PAYMENT_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => set('paymentType', form.paymentType.includes(p.value)
                      ? form.paymentType.filter(v => v !== p.value)
                      : [...form.paymentType, p.value])}
                    className={clsx(
                      'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                      form.paymentType.includes(p.value)
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-amber-400'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Risk səviyyəsi</label>
                <select value={form.riskLevel} onChange={(e) => set('riskLevel', e.target.value)} className={inputCls('')}>
                  {RISK_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls('')}>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Reytinq (0–5)</label>
              <input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => set('rating', e.target.value)} placeholder="4.5" className={inputCls('')} />
            </div>

            <div>
              <label className={labelCls}>Qeydlər</label>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} placeholder="Əlavə qeydlər..." className={`${inputCls('')} resize-none`} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {editing ? 'Yadda saxla' : 'Əlavə et'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Ləğv et
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
