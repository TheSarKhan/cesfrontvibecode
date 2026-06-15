import { useState, useEffect } from 'react'
import { X, Building2, Pencil } from 'lucide-react'
import { customersApi } from '../../api/customers'
import { v, onlyDigits, onlyPhone, digitKeyDown, phoneKeyDown, makePasteHandler } from '../../utils/validation'
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
  { value: 'PASSIVE', label: 'Passiv' },
  { value: 'VARIABLE', label: 'Dəyişkən' },
]

const PAYMENT_OPTIONS = [
  { value: 'CASH', label: 'Nağd' },
  { value: 'TRANSFER', label: 'Köçürmə' },
]

const EMPTY = {
  companyName: '',
  voen: '',
  address: '',
  directorName: '',
  supplierPerson: '',
  supplierPhone: '',
  officeContactPerson: '',
  officeContactPhone: '',
  paymentTypes: [],
  status: 'ACTIVE',
  riskLevel: 'LOW',
  notes: '',
}

function Field({ label, required, error, children }) {
  return (
    <div className="ces-field">
      <label>{label} {required && <span className="req">*</span>}</label>
      {children}
      {error && <span className="ces-err">{error}</span>}
    </div>
  )
}

export default function CustomerModal({ editing, onClose, onSaved }) {
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
        address: editing.address || '',
        directorName: editing.directorName || '',
        supplierPerson: editing.supplierPerson || '',
        supplierPhone: editing.supplierPhone || '',
        officeContactPerson: editing.officeContactPerson || '',
        officeContactPhone: editing.officeContactPhone || '',
        paymentTypes: editing.paymentTypes ? [...editing.paymentTypes] : [],
        status: editing.status || 'ACTIVE',
        riskLevel: editing.riskLevel || 'LOW',
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

  const validate = () => {
    const errs = {}
    const e = (field, ...rules) => { const err = v.chain(form[field], ...rules); if (err) errs[field] = err }

    e('companyName',
      (val) => v.required(val, 'Şirkət adı tələb olunur'),
      (val) => v.minLen(val, 2),
      (val) => v.realContent(val),
      (val) => v.maxLen(val, 150))

    e('voen', v.voen)

    e('directorName',
      (val) => v.minLen(val, 2),
      (val) => v.realContent(val),
      (val) => v.maxLen(val, 100))

    e('address',
      (val) => v.minLen(val, 3, 'Minimum 3 simvol olmalıdır'),
      (val) => v.realContent(val),
      (val) => v.maxLen(val, 200))

    e('supplierPerson',
      (val) => v.minLen(val, 2),
      (val) => v.realContent(val),
      (val) => v.maxLen(val, 100))

    e('supplierPhone', v.phone)

    e('officeContactPerson',
      (val) => v.minLen(val, 2),
      (val) => v.realContent(val),
      (val) => v.maxLen(val, 100))

    e('officeContactPhone', v.phone)

    e('notes', (val) => v.maxLen(val, 500))

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const togglePayment = (val) => {
    setForm((prev) => ({
      ...prev,
      paymentTypes: prev.paymentTypes.includes(val)
        ? prev.paymentTypes.filter((p) => p !== val)
        : [...prev.paymentTypes, val],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    if (editing && initialForm && JSON.stringify(form) === JSON.stringify(initialForm)) {
      toast('Dəyişiklik edilməyib', { icon: 'ℹ️' })
      return
    }

    setLoading(true)
    try {
      if (editing) {
        await customersApi.update(editing.id, form)
        toast.success('Müştəri yeniləndi')
      } else {
        await customersApi.create(form)
        toast.success('Müştəri əlavə edildi')
      }
      onSaved()
    } catch (err) {
      if (err?.isPending) { onClose?.(); return }
      toast.error('Əməliyyat uğursuz oldu')
    } finally {
      setLoading(false)
    }
  }

  const inputWrap = (field) => clsx('ces-input', errors[field] && 'is-error')

  return (
    <div className="ces-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="ces-modal" style={{ maxWidth: 720 }}>
        <div className="ces-m-head">
          <div className={clsx('ces-m-ic', editing ? 'gold' : '')}>
            {editing ? <Pencil size={20} /> : <Building2 size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3>{editing ? 'Müştərini redaktə et' : 'Yeni müştəri'}</h3>
            <p>{editing ? editing.companyName : 'Məlumatları doldurun'}</p>
          </div>
          <button onClick={onClose} className="ces-modal-x" type="button" aria-label="Bağla">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="contents">
          <div className="ces-m-body">
            <p className="ces-sec-label" style={{ marginBottom: 14 }}>Şirkət məlumatları</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
              <Field label="Şirkətin adı" required error={errors.companyName}>
                <div className={inputWrap('companyName')}>
                  <input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="MMC / ASC adı" />
                </div>
              </Field>
              <Field label="VÖEN" error={errors.voen}>
                <div className={inputWrap('voen')}>
                  <input
                    className="mono"
                    value={form.voen}
                    onChange={(e) => set('voen', onlyDigits(e.target.value).slice(0, 10))}
                    onKeyDown={digitKeyDown}
                    onPaste={makePasteHandler((v) => onlyDigits(v).slice(0, 10))}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="1234567890"
                  />
                </div>
              </Field>
              <Field label="Ünvan" error={errors.address}>
                <div className={inputWrap('address')}>
                  <input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Şəhər, küçə" />
                </div>
              </Field>
              <Field label="Direktor adı" error={errors.directorName}>
                <div className={inputWrap('directorName')}>
                  <input value={form.directorName} onChange={(e) => set('directorName', e.target.value)} placeholder="Ad Soyad" />
                </div>
              </Field>
            </div>

            <p className="ces-sec-label" style={{ marginTop: 14, marginBottom: 14 }}>Təchizatçı</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
              <Field label="Məsul şəxs / Şöbə" error={errors.supplierPerson}>
                <div className={inputWrap('supplierPerson')}>
                  <input value={form.supplierPerson} onChange={(e) => set('supplierPerson', e.target.value)} placeholder="Ad Soyad və ya Şöbə" />
                </div>
              </Field>
              <Field label="Əlaqə nömrəsi" error={errors.supplierPhone}>
                <div className={inputWrap('supplierPhone')}>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={form.supplierPhone}
                    onChange={(e) => set('supplierPhone', onlyPhone(e.target.value))}
                    onKeyDown={phoneKeyDown}
                    onPaste={makePasteHandler(onlyPhone)}
                    placeholder="+994501234567"
                  />
                </div>
              </Field>
            </div>

            <p className="ces-sec-label" style={{ marginTop: 14, marginBottom: 14 }}>Ofis</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
              <Field label="Məsul şəxs" error={errors.officeContactPerson}>
                <div className={inputWrap('officeContactPerson')}>
                  <input value={form.officeContactPerson} onChange={(e) => set('officeContactPerson', e.target.value)} placeholder="Ad Soyad" />
                </div>
              </Field>
              <Field label="Əlaqə nömrəsi" error={errors.officeContactPhone}>
                <div className={inputWrap('officeContactPhone')}>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={form.officeContactPhone}
                    onChange={(e) => set('officeContactPhone', onlyPhone(e.target.value))}
                    onKeyDown={phoneKeyDown}
                    onPaste={makePasteHandler(onlyPhone)}
                    placeholder="+994501234567"
                  />
                </div>
              </Field>
            </div>

            <p className="ces-sec-label" style={{ marginTop: 14, marginBottom: 14 }}>Ödəniş və status</p>
            <div className="ces-field">
              <label>Ödəniş növü</label>
              <div className="flex gap-2 flex-wrap">
                {PAYMENT_OPTIONS.map((p) => {
                  const on = form.paymentTypes.includes(p.value)
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => togglePayment(p.value)}
                      className={clsx('ces-btn', on ? 'ces-btn-primary' : 'ces-btn-outline')}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
              <Field label="Status">
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className="ces-select">
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Risk səviyyəsi">
                <select value={form.riskLevel} onChange={(e) => set('riskLevel', e.target.value)} className="ces-select">
                  {RISK_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Qeyd" error={errors.notes}>
              <div className={clsx(inputWrap('notes'))} style={{ alignItems: 'flex-start', paddingTop: 4, paddingBottom: 4 }}>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Əlavə qeydlər..."
                />
              </div>
            </Field>
          </div>

          <div className="ces-m-foot">
            <button type="button" onClick={onClose} className="ces-btn ces-btn-ghost">
              Ləğv et
            </button>
            <button type="submit" disabled={loading} className="ces-btn ces-btn-primary">
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editing ? 'Yadda saxla' : 'Əlavə et'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
