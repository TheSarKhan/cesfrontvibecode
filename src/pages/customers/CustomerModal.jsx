import { useState, useEffect } from 'react'
import { X, Building2, Pencil } from 'lucide-react'
import { customersApi } from '../../api/customers'
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
  supplierPerson: '',
  supplierPhone: '',
  officeContactPerson: '',
  officeContactPhone: '',
  paymentTypes: [],
  status: 'ACTIVE',
  riskLevel: 'LOW',
  notes: '',
}

const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'

export default function CustomerModal({ editing, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editing) {
      setForm({
        companyName: editing.companyName || '',
        voen: editing.voen || '',
        address: editing.address || '',
        supplierPerson: editing.supplierPerson || '',
        supplierPhone: editing.supplierPhone || '',
        officeContactPerson: editing.officeContactPerson || '',
        officeContactPhone: editing.officeContactPhone || '',
        paymentTypes: editing.paymentTypes ? [...editing.paymentTypes] : [],
        status: editing.status || 'ACTIVE',
        riskLevel: editing.riskLevel || 'LOW',
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

  const inputCls = (field) => clsx(
    'w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent',
    errors[field]
      ? 'border-red-400 dark:border-red-500 focus:ring-red-400'
      : 'border-gray-200 dark:border-gray-600 focus:ring-amber-500'
  )

  const validate = () => {
    const errs = {}

    if (!form.companyName?.trim())
      errs.companyName = 'Şirkət adı tələb olunur'
    else if (form.companyName.trim().length < 2)
      errs.companyName = 'Minimum 2 simvol olmalıdır'
    else if (form.companyName.trim().length > 150)
      errs.companyName = 'Maksimum 150 simvol ola bilər'

    if (form.voen && !/^\d{10}$/.test(form.voen.trim()))
      errs.voen = 'VÖEN 10 rəqəmdən ibarət olmalıdır'

    if (form.address && form.address.trim().length > 200)
      errs.address = 'Maksimum 200 simvol ola bilər'

    if (form.supplierPerson && form.supplierPerson.trim().length > 100)
      errs.supplierPerson = 'Maksimum 100 simvol ola bilər'

    if (form.supplierPhone && form.supplierPhone.trim().length > 30)
      errs.supplierPhone = 'Maksimum 30 simvol ola bilər'

    if (form.officeContactPerson && form.officeContactPerson.trim().length > 100)
      errs.officeContactPerson = 'Maksimum 100 simvol ola bilər'

    if (form.officeContactPhone && form.officeContactPhone.trim().length > 30)
      errs.officeContactPhone = 'Maksimum 30 simvol ola bilər'

    if (form.notes && form.notes.trim().length > 500)
      errs.notes = 'Maksimum 500 simvol ola bilər'

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              {editing ? <Pencil size={18} className="text-amber-500 shrink-0" /> : <Building2 size={18} className="text-amber-500 shrink-0" />}
              {editing ? 'Müştərini redaktə et' : 'Yeni müştəri əlavə et'}
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
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto scrollbar-thin">

            {/* Şirkət məlumatları */}
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Şirkət məlumatları</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Şirkətin adı <span className="text-red-500">*</span></label>
                <input type="text" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="MMC / ASC adı" className={inputCls('companyName')} />
                {errors.companyName && <p className="mt-1 text-xs text-red-500">{errors.companyName}</p>}
              </div>
              <div>
                <label className={labelCls}>VÖEN</label>
                <input type="text" value={form.voen} onChange={(e) => set('voen', e.target.value)} placeholder="1234567890" className={inputCls('voen')} />
                {errors.voen && <p className="mt-1 text-xs text-red-500">{errors.voen}</p>}
              </div>
            </div>

            <div>
              <label className={labelCls}>Ünvan</label>
              <input type="text" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Şəhər, küçə" className={inputCls('address')} />
              {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
            </div>

            {/* Təchizatçı */}
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-1">Təchizatçı</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Məsul şəxs / Şöbə</label>
                <input type="text" value={form.supplierPerson} onChange={(e) => set('supplierPerson', e.target.value)} placeholder="Ad Soyad və ya Şöbə" className={inputCls('supplierPerson')} />
                {errors.supplierPerson && <p className="mt-1 text-xs text-red-500">{errors.supplierPerson}</p>}
              </div>
              <div>
                <label className={labelCls}>Əlaqə nömrəsi</label>
                <input type="text" value={form.supplierPhone} onChange={(e) => set('supplierPhone', e.target.value)} placeholder="+994501234567" className={inputCls('supplierPhone')} />
                {errors.supplierPhone && <p className="mt-1 text-xs text-red-500">{errors.supplierPhone}</p>}
              </div>
            </div>

            {/* Ofis məsul şəxsi */}
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-1">Ofis</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Məsul şəxs</label>
                <input type="text" value={form.officeContactPerson} onChange={(e) => set('officeContactPerson', e.target.value)} placeholder="Ad Soyad" className={inputCls('officeContactPerson')} />
                {errors.officeContactPerson && <p className="mt-1 text-xs text-red-500">{errors.officeContactPerson}</p>}
              </div>
              <div>
                <label className={labelCls}>Əlaqə nömrəsi</label>
                <input type="text" value={form.officeContactPhone} onChange={(e) => set('officeContactPhone', e.target.value)} placeholder="+994501234567" className={inputCls('officeContactPhone')} />
                {errors.officeContactPhone && <p className="mt-1 text-xs text-red-500">{errors.officeContactPhone}</p>}
              </div>
            </div>

            {/* Ödəniş növü */}
            <div>
              <label className={labelCls}>Ödəniş növü</label>
              <div className="flex gap-2">
                {PAYMENT_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => togglePayment(p.value)}
                    className={clsx(
                      'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                      form.paymentTypes.includes(p.value)
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-amber-400'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status + Risk */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Status</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls('')}>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Risk səviyyəsi</label>
                <select value={form.riskLevel} onChange={(e) => set('riskLevel', e.target.value)} className={inputCls('')}>
                  {RISK_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Qeyd */}
            <div>
              <label className={labelCls}>Qeyd</label>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} placeholder="Əlavə qeydlər..." className={`${inputCls('notes')} resize-none`} />
              {errors.notes && <p className="mt-1 text-xs text-red-500">{errors.notes}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
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
