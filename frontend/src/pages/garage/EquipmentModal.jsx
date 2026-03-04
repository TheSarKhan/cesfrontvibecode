import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { garageApi } from '../../api/garage'
import { contractorsApi } from '../../api/contractors'
import toast from 'react-hot-toast'

const OWNERSHIP_TYPES = [
  { value: 'COMPANY', label: 'Şirkət' },
  { value: 'INVESTOR', label: 'İnvestor' },
  { value: 'CONTRACTOR', label: 'Podratçı' },
]

const STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Mövcud' },
  { value: 'RENTED', label: 'İcarədə' },
  { value: 'DEFECTIVE', label: 'Nasaz' },
  { value: 'OUT_OF_SERVICE', label: 'Xidmətdən kənarda' },
]

const EMPTY = {
  name: '',
  equipmentCode: '',
  type: '',
  brand: '',
  model: '',
  serialNumber: '',
  year: '',
  ownershipType: 'COMPANY',
  status: 'AVAILABLE',
  dailyRate: '',
  description: '',
  // INVESTOR fields
  investorName: '',
  investorVoen: '',
  investorPhone: '',
  // CONTRACTOR field
  contractorId: '',
}

export default function EquipmentModal({ editing, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [contractors, setContractors] = useState([])

  useEffect(() => {
    contractorsApi.getAll()
      .then((res) => setContractors(res.data.data || res.data || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name || '',
        equipmentCode: editing.equipmentCode || '',
        type: editing.type || '',
        brand: editing.brand || '',
        model: editing.model || '',
        serialNumber: editing.serialNumber || '',
        year: editing.year || '',
        ownershipType: editing.ownershipType || 'COMPANY',
        status: editing.status || 'AVAILABLE',
        dailyRate: editing.dailyRate ?? '',
        description: editing.description || '',
        investorName: editing.investorName || '',
        investorVoen: editing.investorVoen || '',
        investorPhone: editing.investorPhone || '',
        contractorId: editing.contractorId || editing.contractor?.id || '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [editing])

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Texnika adı tələb olunur')
    if (!form.equipmentCode.trim()) return toast.error('Texnika kodu tələb olunur')
    if (!form.type.trim()) return toast.error('Növ tələb olunur')

    const payload = {
      name: form.name,
      equipmentCode: form.equipmentCode,
      type: form.type,
      brand: form.brand || null,
      model: form.model || null,
      serialNumber: form.serialNumber || null,
      year: form.year ? parseInt(form.year) : null,
      ownershipType: form.ownershipType,
      status: form.status,
      dailyRate: form.dailyRate !== '' ? parseFloat(form.dailyRate) : null,
      description: form.description || null,
    }

    if (form.ownershipType === 'INVESTOR') {
      payload.investorName = form.investorName || null
      payload.investorVoen = form.investorVoen || null
      payload.investorPhone = form.investorPhone || null
    }

    if (form.ownershipType === 'CONTRACTOR') {
      payload.contractorId = form.contractorId ? parseInt(form.contractorId) : null
    }

    setLoading(true)
    try {
      if (editing) {
        await garageApi.update(editing.id, payload)
        toast.success('Texnika yeniləndi')
      } else {
        await garageApi.create(payload)
        toast.success('Texnika əlavə edildi')
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
              {editing ? 'Texnikanı redaktə et' : 'Yeni texnika əlavə et'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {editing ? editing.name : 'Məlumatları doldurun'}
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
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Texnika adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ekskavator, Kran..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {/* Code + Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Texnika kodu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.equipmentCode}
                  onChange={(e) => set('equipmentCode', e.target.value)}
                  placeholder="EQ-001"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Növ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.type}
                  onChange={(e) => set('type', e.target.value)}
                  placeholder="Ekskavator, Kran..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Brand + Model */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Marka</label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => set('brand', e.target.value)}
                  placeholder="Caterpillar"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Model</label>
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) => set('model', e.target.value)}
                  placeholder="320D"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Serial + Year */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Seriya nömrəsi</label>
                <input
                  type="text"
                  value={form.serialNumber}
                  onChange={(e) => set('serialNumber', e.target.value)}
                  placeholder="SN-12345"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">İstehsal ili</label>
                <input
                  type="number"
                  min="1990"
                  max="2030"
                  value={form.year}
                  onChange={(e) => set('year', e.target.value)}
                  placeholder="2020"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Ownership + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Mülkiyyət növü</label>
                <select
                  value={form.ownershipType}
                  onChange={(e) => set('ownershipType', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  {OWNERSHIP_TYPES.map((o) => (
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

            {/* Daily rate */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Günlük tarif (AZN)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.dailyRate}
                onChange={(e) => set('dailyRate', e.target.value)}
                placeholder="500.00"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {/* INVESTOR fields */}
            {form.ownershipType === 'INVESTOR' && (
              <div className="space-y-3 pt-2 border-t border-amber-100 dark:border-gray-600">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">İnvestor məlumatları</p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">İnvestorun adı</label>
                  <input
                    type="text"
                    value={form.investorName}
                    onChange={(e) => set('investorName', e.target.value)}
                    placeholder="Ad Soyad / Şirkət adı"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">VÖEN</label>
                    <input
                      type="text"
                      value={form.investorVoen}
                      onChange={(e) => set('investorVoen', e.target.value)}
                      placeholder="1234567890"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Telefon</label>
                    <input
                      type="text"
                      value={form.investorPhone}
                      onChange={(e) => set('investorPhone', e.target.value)}
                      placeholder="+994 XX XXX XX XX"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CONTRACTOR field */}
            {form.ownershipType === 'CONTRACTOR' && (
              <div className="pt-2 border-t border-amber-100 dark:border-gray-600">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">Podratçı məlumatları</p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Podratçı</label>
                  <select
                    value={form.contractorId}
                    onChange={(e) => set('contractorId', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">Podratçı seçin</option>
                    {contractors.map((c) => (
                      <option key={c.id} value={c.id}>{c.companyName}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Qeydlər</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
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
