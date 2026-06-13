import { useState, useEffect } from 'react'
import { X, UserCog, Pencil } from 'lucide-react'
import { operatorsApi } from '../../api/operators'
import { v } from '../../utils/validation'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const EMPTY = { firstName: '', lastName: '', address: '', phone: '', email: '', specialization: '', notes: '' }

export default function OperatorModal({ editing, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState(EMPTY)
  const [initialForm, setInitialForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editing) {
      const data = {
        firstName: editing.firstName || '',
        lastName: editing.lastName || '',
        address: editing.address || '',
        phone: editing.phone || '',
        email: editing.email || '',
        specialization: editing.specialization || '',
        notes: editing.notes || '',
      }
      setForm(data)
      setInitialForm(data)
    } else {
      setForm(EMPTY)
      setInitialForm(null)
    }
  }, [editing])

  const set = (k) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [k]: value }))
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }))
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

    e('firstName',
      (val) => v.required(val, 'Ad tələb olunur'),
      (val) => v.minLen(val, 2),
      (val) => v.realContent(val),
      (val) => v.maxLen(val, 50))

    e('lastName',
      (val) => v.required(val, 'Soyad tələb olunur'),
      (val) => v.minLen(val, 2),
      (val) => v.realContent(val),
      (val) => v.maxLen(val, 50))

    e('phone', v.phone)
    e('email', v.email)

    e('address',
      (val) => v.minLen(val, 3, 'Minimum 3 simvol olmalıdır'),
      (val) => v.realContent(val),
      (val) => v.maxLen(val, 200))

    e('specialization',
      (val) => v.minLen(val, 2),
      (val) => v.realContent(val),
      (val) => v.maxLen(val, 100))

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
    setSaving(true)
    try {
      if (editing) {
        await operatorsApi.update(editing.id, form)
        toast.success('Operator yeniləndi')
      } else {
        await operatorsApi.create(form)
        toast.success('Operator əlavə edildi')
      }
      onSaved()
    } catch (err) {
      if (err?.isPending) { onClose?.(); return }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(58,58,58,0.45)] backdrop-blur-sm p-4 ces-font">
      <div className="bg-[var(--ces-surface)] rounded-[18px] shadow-[0_24px_48px_-20px_rgba(58,58,58,0.28),0_6px_14px_rgba(58,58,58,0.08)] w-full max-w-lg relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3.5 px-6 pt-6 pb-5 border-b border-[var(--ces-line)]">
          <div className="w-11 h-11 rounded-[12px] grid place-items-center bg-[var(--ces-gold-100)] text-[var(--ces-gold-700)] shrink-0">
            {editing ? <Pencil size={18} /> : <UserCog size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-[var(--ces-ink)] leading-tight">
              {editing ? 'Operatoru redaktə et' : 'Yeni operator əlavə et'}
            </h2>
            <p className="text-[13px] text-[var(--ces-muted)] mt-1 truncate">
              {editing ? editing.fullName : 'Məlumatları doldurun'}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-1.5">Ad <span className="text-[var(--ces-danger)]">*</span></label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={set('firstName')}
                  placeholder="Əli"
                  className={inputCls('firstName')}
                />
                {errors.firstName && <p className="mt-1.5 text-xs font-semibold text-[var(--ces-danger)]">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-1.5">Soyad <span className="text-[var(--ces-danger)]">*</span></label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={set('lastName')}
                  placeholder="Məmmədov"
                  className={inputCls('lastName')}
                />
                {errors.lastName && <p className="mt-1.5 text-xs font-semibold text-[var(--ces-danger)]">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-1.5">Ünvan</label>
              <input
                type="text"
                value={form.address}
                onChange={set('address')}
                placeholder="Bakı, Nərimanov r."
                className={inputCls('address')}
              />
              {errors.address && <p className="mt-1.5 text-xs font-semibold text-[var(--ces-danger)]">{errors.address}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-1.5">Telefon</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="+994 50 000 00 00"
                  className={inputCls('phone')}
                />
                {errors.phone && <p className="mt-1.5 text-xs font-semibold text-[var(--ces-danger)]">{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="ali@mail.com"
                  className={inputCls('email')}
                />
                {errors.email && <p className="mt-1.5 text-xs font-semibold text-[var(--ces-danger)]">{errors.email}</p>}
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-1.5">İxtisas</label>
              <input
                type="text"
                value={form.specialization}
                onChange={set('specialization')}
                placeholder="Ekskavator operatoru, Kran operatoru..."
                className={inputCls('specialization')}
              />
              {errors.specialization && <p className="mt-1.5 text-xs font-semibold text-[var(--ces-danger)]">{errors.specialization}</p>}
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-1.5">Qeyd</label>
              <textarea
                value={form.notes}
                onChange={set('notes')}
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
              disabled={saving}
              className="inline-flex items-center gap-2 bg-[var(--ces-gold)] hover:bg-[var(--ces-gold-700)] disabled:opacity-60 disabled:pointer-events-none text-[var(--ces-on-gold)] font-semibold px-5 py-2.5 rounded-[10px] text-sm transition-colors"
            >
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editing ? 'Yadda saxla' : 'Əlavə et'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
