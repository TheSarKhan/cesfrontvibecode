import { useState, useEffect } from 'react'
import { X, HardHat, Pencil } from 'lucide-react'
import { contractorsApi } from '../../api/contractors'
import { v } from '../../utils/validation'
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
  phone: '',
  address: '',
  paymentType: [],
  status: 'ACTIVE',
  riskLevel: 'LOW',
  rating: '',
  notes: '',
}

export default function ContractorModal({ editing, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState(EMPTY)
  const [initialForm, setInitialForm] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editing) {
      const data = {
        companyName: editing.companyName || '',
        voen: editing.voen || '',
        contactPerson: editing.contactPerson || '',
        phone: editing.phone || '',
        address: editing.address || '',
        paymentType: editing.paymentType ? editing.paymentType.split(',').filter(Boolean) : [],
        status: editing.status || 'ACTIVE',
        riskLevel: editing.riskLevel || 'LOW',
        rating: editing.rating ?? '',
        notes: editing.notes || '',
      }
      setForm(data)
      setInitialForm(data)
    } else {
      setForm(EMPTY)
      setInitialForm(null)
    }
  }, [editing])

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const inputCls = (field) => clsx(
    'w-full px-3.5 py-2.5 text-sm border rounded-[11px] bg-white text-[var(--ces-ink)] placeholder-[var(--ces-mute2)] focus:outline-none transition-all',
    errors[field]
      ? 'border-[var(--ces-danger)] focus:border-[var(--ces-danger)] focus:ring-[3px] focus:ring-[rgba(212,56,90,0.12)]'
      : 'border-[var(--ces-line)] focus:border-[var(--ces-graphite)] focus:ring-[3px] focus:ring-[rgba(58,58,58,0.1)]'
  )

  const validate = () => {
    const errs = {}
    const e = (field, ...rules) => { const err = v.chain(form[field], ...rules); if (err) errs[field] = err }

    e('companyName',
      (val) => v.required(val, 'Şirkət adı tələb olunur'),
      (val) => v.minLen(val, 2),
      (val) => v.realContent(val),
      (val) => v.maxLen(val, 150))

    e('voen', v.voen)

    e('contactPerson',
      (val) => v.minLen(val, 2),
      (val) => v.realContent(val),
      (val) => v.maxLen(val, 100))

    e('phone', v.phone)

    e('address',
      (val) => v.minLen(val, 3, 'Minimum 3 simvol olmalıdır'),
      (val) => v.realContent(val),
      (val) => v.maxLen(val, 200))

    e('notes', (val) => v.maxLen(val, 500))

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    if (editing && initialForm && JSON.stringify(form) === JSON.stringify(initialForm)) {
      toast('Dəyişiklik edilməyib', { icon: 'ℹ️' })
      return
    }

    const payload = {
      ...form,
      paymentType: form.paymentType.join(','),
      rating: form.rating !== '' ? parseFloat(form.rating) : null,
    }

    setLoading(true)
    try {
      if (editing) {
        await contractorsApi.update(editing.id, payload)
        toast.success('Podratçı yeniləndi')
      } else {
        await contractorsApi.create(payload)
        toast.success('Podratçı əlavə edildi')
      }
      onSaved()
    } catch (err) {
      if (err?.isPending) { onClose?.(); return }
      const msg = err?.response?.data?.message || 'Xəta baş verdi'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(58,58,58,0.45)] backdrop-blur-sm p-4 ces-font">
      <div className="bg-[var(--ces-surface)] rounded-[18px] shadow-[0_24px_48px_-20px_rgba(58,58,58,0.28),0_6px_14px_rgba(58,58,58,0.08)] w-full max-w-lg relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3.5 px-6 pt-6 pb-5 border-b border-[var(--ces-line)]">
          <div className="w-11 h-11 rounded-[12px] grid place-items-center bg-[var(--ces-gold-100)] text-[var(--ces-gold-700)] shrink-0">
            {editing ? <Pencil size={18} /> : <HardHat size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-[var(--ces-ink)] leading-tight">
              {editing ? 'Podratçını redaktə et' : 'Yeni podratçı əlavə et'}
            </h2>
            <p className="text-[13px] text-[var(--ces-muted)] mt-1 truncate">
              {editing ? editing.companyName : 'Məlumatları doldurun'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[8px] grid place-items-center text-[var(--ces-muted)] hover:bg-[var(--ces-graphite-50)] hover:text-[var(--ces-graphite)] transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
            {/* Company name */}
            <div>
              <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-1.5">
                Şirkətin adı <span className="text-[var(--ces-danger)]">*</span>
              </label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => set('companyName', e.target.value)}
                placeholder="MMC / ASC adı"
                className={inputCls('companyName')}
              />
              {errors.companyName && <p className="mt-1.5 text-xs font-semibold text-[var(--ces-danger)]">{errors.companyName}</p>}
            </div>

            {/* VOEN */}
            <div>
              <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-1.5">VÖEN</label>
              <input
                type="text"
                value={form.voen}
                onChange={(e) => set('voen', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="1234567890"
                className={inputCls('voen')}
              />
              {errors.voen && <p className="mt-1.5 text-xs font-semibold text-[var(--ces-danger)]">{errors.voen}</p>}
            </div>

            {/* Contact person */}
            <div>
              <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-1.5">Əlaqə şəxsi</label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => set('contactPerson', e.target.value)}
                placeholder="Ad Soyad"
                className={inputCls('contactPerson')}
              />
              {errors.contactPerson && <p className="mt-1.5 text-xs font-semibold text-[var(--ces-danger)]">{errors.contactPerson}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-1.5">Telefon</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+994501234567"
                className={inputCls('phone')}
              />
              {errors.phone && <p className="mt-1.5 text-xs font-semibold text-[var(--ces-danger)]">{errors.phone}</p>}
            </div>

            {/* Address */}
            <div>
              <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-1.5">Ünvan</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="Şəhər, küçə"
                className={inputCls('address')}
              />
              {errors.address && <p className="mt-1.5 text-xs font-semibold text-[var(--ces-danger)]">{errors.address}</p>}
            </div>

            {/* Payment type */}
            <div>
              <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-1.5">Ödəniş növü</label>
              <div className="flex gap-2">
                {PAYMENT_OPTIONS.map((p) => {
                  const on = form.paymentType.includes(p.value)
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => set('paymentType', on
                        ? form.paymentType.filter(v => v !== p.value)
                        : [...form.paymentType, p.value])}
                      className={clsx(
                        'px-4 py-2 rounded-[10px] text-sm font-semibold border transition-colors',
                        on
                          ? 'bg-[var(--ces-graphite)] text-[var(--ces-on-primary)] border-[var(--ces-graphite)]'
                          : 'bg-white text-[var(--ces-graphite)] border-[var(--ces-line)] hover:border-[var(--ces-graphite)]'
                      )}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Risk + Status row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-1.5">Risk səviyyəsi</label>
                <select
                  value={form.riskLevel}
                  onChange={(e) => set('riskLevel', e.target.value)}
                  className={inputCls('')}
                >
                  {RISK_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                  className={inputCls('')}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-1.5">
                Reytinq (0–5)
              </label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={form.rating}
                onChange={(e) => set('rating', e.target.value)}
                placeholder="4.5"
                className={inputCls('')}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-1.5">Qeydlər</label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={3}
                placeholder="Əlavə qeydlər..."
                className={`${inputCls('notes')} resize-none`}
              />
              {errors.notes && <p className="mt-1.5 text-xs font-semibold text-[var(--ces-danger)]">{errors.notes}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2.5 px-6 py-4 border-t border-[var(--ces-line)] bg-[var(--ces-graphite-50)] justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-[10px] text-sm font-semibold text-[var(--ces-graphite)] bg-white border border-[var(--ces-line)] hover:border-[var(--ces-graphite)] transition-colors"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 bg-[var(--ces-gold)] hover:bg-[var(--ces-gold-700)] disabled:opacity-60 disabled:pointer-events-none text-[var(--ces-on-gold)] font-semibold px-5 py-2.5 rounded-[10px] text-sm transition-colors"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {editing ? 'Yadda saxla' : 'Əlavə et'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
