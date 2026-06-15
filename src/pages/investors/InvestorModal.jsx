import { useState, useEffect } from 'react'
import { X, TrendingUp, Pencil, AlertCircle } from 'lucide-react'
import { investorsApi } from '../../api/investors'
import { v, onlyDigits, onlyPhone, digitKeyDown, decimalKeyDown, phoneKeyDown, makePasteHandler } from '../../utils/validation'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const RISK_OPTIONS = [
  { value: 'LOW',    label: 'Aşağı' },
  { value: 'MEDIUM', label: 'Orta' },
  { value: 'HIGH',   label: 'Yüksək' },
]

const STATUS_OPTIONS = [
  { value: 'ACTIVE',   label: 'Aktiv' },
  { value: 'INACTIVE', label: 'Deaktiv' },
]

const PAYMENT_OPTIONS = [
  { value: 'CASH',     label: 'Nağd' },
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

/* ─── UI kit `.input` reusable ─── */
function Field({ label, required, error, children, hint }) {
  return (
    <div>
      <label className="block text-[13px] font-semibold mb-[7px]" style={{ color: 'var(--ces-ink)' }}>
        {label}
        {required && <span style={{ color: 'var(--ces-danger)' }}> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-[11.5px]" style={{ color: 'var(--ces-muted)' }}>{hint}</p>}
      {error && (
        <p className="mt-1.5 text-[11.5px] font-semibold flex items-center gap-1" style={{ color: 'var(--ces-danger)' }}>
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', error, prefix, suffix, autoFocus, onKeyDown, onPaste, inputMode, maxLength }) {
  const [focused, setFocused] = useState(false)
  return (
    <div
      className="flex items-center px-[13px] transition-all"
      style={{
        background: 'var(--ces-surface)',
        border: `1px solid ${error ? 'var(--ces-danger)' : focused ? 'var(--ces-graphite)' : 'var(--ces-line)'}`,
        borderRadius: '11px',
        minHeight: '44px',
        boxShadow: error
          ? '0 0 0 3px rgba(212,56,90,.12)'
          : focused
          ? '0 0 0 3px rgba(58,58,58,.1)'
          : 'none',
      }}
    >
      {prefix && (
        <span
          className="text-[12.5px] font-semibold mr-2"
          style={{
            padding: '6px 10px',
            background: 'var(--ces-graphite-50)',
            borderRadius: '7px',
            color: 'var(--ces-muted)',
            letterSpacing: '.04em',
          }}
        >
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="flex-1 border-0 outline-0 bg-transparent text-[14px] py-[11px] w-full"
        style={{ color: 'var(--ces-ink)' }}
      />
      {suffix && (
        <span
          className="text-[12.5px] font-semibold ml-2"
          style={{
            padding: '6px 10px',
            background: 'var(--ces-graphite-50)',
            borderRadius: '7px',
            color: 'var(--ces-muted)',
          }}
        >
          {suffix}
        </span>
      )}
    </div>
  )
}

function Textarea({ value, onChange, placeholder, rows = 3, error }) {
  const [focused, setFocused] = useState(false)
  return (
    <div
      className="flex items-start px-[13px] transition-all"
      style={{
        background: 'var(--ces-surface)',
        border: `1px solid ${error ? 'var(--ces-danger)' : focused ? 'var(--ces-graphite)' : 'var(--ces-line)'}`,
        borderRadius: '11px',
        padding: '4px 13px',
        boxShadow: error
          ? '0 0 0 3px rgba(212,56,90,.12)'
          : focused
          ? '0 0 0 3px rgba(58,58,58,.1)'
          : 'none',
      }}
    >
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="flex-1 border-0 outline-0 bg-transparent text-[14px] py-[11px] w-full resize-none"
        style={{ color: 'var(--ces-ink)' }}
      />
    </div>
  )
}

function Select({ value, onChange, options }) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="w-full appearance-none cursor-pointer transition-all"
      style={{
        padding: '11px 36px 11px 13px',
        background: `#fff url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b6b6b' stroke-width='2.4' stroke-linecap='round'><path d='m6 9 6 6 6-6'/></svg>") no-repeat right 12px center`,
        border: `1px solid ${focused ? 'var(--ces-graphite)' : 'var(--ces-line)'}`,
        borderRadius: '11px',
        minHeight: '44px',
        fontSize: '14px',
        color: 'var(--ces-ink)',
        outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(58,58,58,.1)' : 'none',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

/* ═══════════════════════════════════════════════════ */
export default function InvestorModal({ editing, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState(EMPTY)
  const [initialForm, setInitialForm] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editing) {
      const data = {
        companyName:   editing.companyName || '',
        voen:          editing.voen || '',
        contactPerson: editing.contactPerson || '',
        contactPhone:  editing.contactPhone || '',
        address:       editing.address || '',
        paymentType:   editing.paymentType ? editing.paymentType.split(',').filter(Boolean) : [],
        status:        editing.status || 'ACTIVE',
        riskLevel:     editing.riskLevel || 'LOW',
        rating:        editing.rating ?? '',
        notes:         editing.notes || '',
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

    e('contactPhone', v.phone)

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(26,26,26,.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-[560px] overflow-hidden flex flex-col max-h-[92vh]"
        style={{
          background: 'var(--ces-surface)',
          borderRadius: 'var(--ces-radius-lg)',
          boxShadow: 'var(--ces-shadow-lg)',
        }}
      >
        {/* ─── Header ─── */}
        <div
          className="flex items-start justify-between gap-3 px-6 py-5 shrink-0"
          style={{ borderBottom: '1px solid var(--ces-line)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-[10px] grid place-items-center flex-none"
              style={{
                background: editing ? 'var(--ces-gold-100)' : 'var(--ces-graphite-100)',
                color: editing ? 'var(--ces-gold-700)' : 'var(--ces-graphite)',
              }}
            >
              {editing ? <Pencil size={18} /> : <TrendingUp size={18} />}
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-[.16em]" style={{ color: 'var(--ces-gold)' }}>
                {editing ? 'Redaktə' : 'Yeni qeyd'}
              </p>
              <h2 className="text-[18px] font-extrabold leading-tight truncate" style={{ color: 'var(--ces-ink)' }}>
                {editing ? editing.companyName : 'Yeni investor əlavə et'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[8px] grid place-items-center transition-colors flex-none"
            style={{ color: 'var(--ces-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ces-graphite-50)'
              e.currentTarget.style.color = 'var(--ces-graphite)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--ces-muted)'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ─── Form ─── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">

            <Field label="Şirkətin adı" required error={errors.companyName}>
              <Input
                value={form.companyName}
                onChange={(e) => set('companyName', e.target.value)}
                placeholder="MMC / ASC adı"
                error={errors.companyName}
                autoFocus
              />
            </Field>

            <Field label="VÖEN" error={errors.voen} hint="10 rəqəmli vergi ödəyici nömrəsi">
              <Input
                value={form.voen}
                onChange={(e) => set('voen', onlyDigits(e.target.value).slice(0, 10))}
                onKeyDown={digitKeyDown}
                onPaste={makePasteHandler((v) => onlyDigits(v).slice(0, 10))}
                inputMode="numeric"
                maxLength={10}
                placeholder="1234567890"
                error={errors.voen}
                prefix="AZ"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Əlaqə şəxsi" error={errors.contactPerson}>
                <Input
                  value={form.contactPerson}
                  onChange={(e) => set('contactPerson', e.target.value)}
                  placeholder="Ad Soyad"
                  error={errors.contactPerson}
                />
              </Field>
              <Field label="Telefon" error={errors.contactPhone}>
                <Input
                  value={form.contactPhone}
                  onChange={(e) => set('contactPhone', onlyPhone(e.target.value))}
                  onKeyDown={phoneKeyDown}
                  onPaste={makePasteHandler(onlyPhone)}
                  inputMode="tel"
                  type="tel"
                  placeholder="+994501234567"
                  error={errors.contactPhone}
                />
              </Field>
            </div>

            <Field label="Ünvan" error={errors.address}>
              <Input
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="Şəhər, küçə"
                error={errors.address}
              />
            </Field>

            <Field label="Ödəniş növü" hint="Bir və ya daha çox seçə bilərsiniz">
              <div className="flex gap-2 flex-wrap">
                {PAYMENT_OPTIONS.map((p) => {
                  const on = form.paymentType.includes(p.value)
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => set('paymentType', on
                        ? form.paymentType.filter(x => x !== p.value)
                        : [...form.paymentType, p.value])}
                      className="text-[13px] font-semibold transition-colors"
                      style={{
                        padding: '9px 16px',
                        borderRadius: '10px',
                        background: on ? 'var(--ces-graphite)' : 'var(--ces-surface)',
                        color: on ? 'var(--ces-on-primary)' : 'var(--ces-ink)',
                        border: `1px solid ${on ? 'var(--ces-graphite)' : 'var(--ces-line)'}`,
                      }}
                      onMouseEnter={(e) => {
                        if (!on) e.currentTarget.style.borderColor = 'var(--ces-graphite)'
                      }}
                      onMouseLeave={(e) => {
                        if (!on) e.currentTarget.style.borderColor = 'var(--ces-line)'
                      }}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Risk səviyyəsi">
                <Select
                  value={form.riskLevel}
                  onChange={(e) => set('riskLevel', e.target.value)}
                  options={RISK_OPTIONS}
                />
              </Field>
              <Field label="Status">
                <Select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                  options={STATUS_OPTIONS}
                />
              </Field>
            </div>

            <Field label="Reytinq" hint="0.0 – 5.0 arası dəyər">
              <Input
                value={form.rating}
                onChange={(e) => set('rating', e.target.value)}
                onKeyDown={decimalKeyDown}
                inputMode="decimal"
                placeholder="4.5"
                suffix="/ 5"
              />
            </Field>

            <Field label="Qeydlər" error={errors.notes}>
              <Textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Əlavə qeydlər (max 500 simvol)..."
                error={errors.notes}
              />
            </Field>
          </div>

          {/* ─── Footer ─── */}
          <div
            className="flex items-center justify-end gap-2 px-6 py-4 shrink-0"
            style={{
              borderTop: '1px solid var(--ces-line)',
              background: 'var(--ces-graphite-50)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="ces-btn ces-btn-ghost ces-btn-sm"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              disabled={loading}
              className={clsx('ces-btn ces-btn-primary')}
            >
              {loading && (
                <span
                  className="w-3.5 h-3.5 rounded-full animate-spin"
                  style={{ border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'var(--ces-on-primary)' }}
                />
              )}
              {editing ? 'Yadda saxla' : 'Əlavə et'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
