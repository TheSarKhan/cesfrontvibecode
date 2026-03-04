import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { contractorsApi } from '../../api/contractors'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const RISK_OPTIONS = [
  { value: 'LOW', label: 'Aşağı', color: 'text-green-600' },
  { value: 'MEDIUM', label: 'Orta', color: 'text-amber-600' },
  { value: 'HIGH', label: 'Yüksək', color: 'text-red-600' },
]

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Aktiv' },
  { value: 'INACTIVE', label: 'Deaktiv' },
]

const EMPTY = {
  companyName: '',
  voen: '',
  contactPerson: '',
  address: '',
  paymentType: '',
  status: 'ACTIVE',
  riskLevel: 'LOW',
  rating: '',
  notes: '',
}

export default function ContractorModal({ editing, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editing) {
      setForm({
        companyName: editing.companyName || '',
        voen: editing.voen || '',
        contactPerson: editing.contactPerson || '',
        address: editing.address || '',
        paymentType: editing.paymentType || '',
        status: editing.status || 'ACTIVE',
        riskLevel: editing.riskLevel || 'LOW',
        rating: editing.rating ?? '',
        notes: editing.notes || '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [editing])

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.companyName.trim()) return toast.error('Şirkət adı tələb olunur')

    const payload = {
      ...form,
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
    } catch {
      toast.error('Əməliyyat uğursuz oldu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {editing ? 'Podratçını redaktə et' : 'Yeni podratçı əlavə et'}
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
            {/* Company name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Şirkətin adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => set('companyName', e.target.value)}
                placeholder="MMC / ASC adı"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {/* VOEN */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">VÖEN</label>
              <input
                type="text"
                value={form.voen}
                onChange={(e) => set('voen', e.target.value)}
                placeholder="1234567890"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {/* Contact person */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Əlaqə şəxsi</label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => set('contactPerson', e.target.value)}
                placeholder="Ad Soyad"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ünvan</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="Şəhər, küçə"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {/* Payment type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ödəniş növü</label>
              <input
                type="text"
                value={form.paymentType}
                onChange={(e) => set('paymentType', e.target.value)}
                placeholder="Nağd / Bank köçürməsi / ..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {/* Risk + Status row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Risk səviyyəsi</label>
                <select
                  value={form.riskLevel}
                  onChange={(e) => set('riskLevel', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  {RISK_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
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
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Qeydlər</label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={3}
                placeholder="Əlavə qeydlər..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              />
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
