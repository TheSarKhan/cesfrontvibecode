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

const REPAIR_STATUS_OPTIONS = [
  { value: '', label: '—' },
  { value: 'Hazır', label: 'Hazır' },
  { value: 'Təmirdədir', label: 'Təmirdədir' },
]

const TECH_READINESS_OPTIONS = [
  { value: '', label: '—' },
  { value: 'Hazır', label: 'Hazır' },
  { value: 'Qismən hazır', label: 'Qismən hazır' },
  { value: 'Hazır deyil', label: 'Hazır deyil' },
]

const EMPTY = {
  equipmentCode: '',
  name: '',
  type: '',
  serialNumber: '',
  brand: '',
  model: '',
  manufactureYear: '',
  purchaseDate: '',
  purchasePrice: '',
  currentMarketValue: '',
  depreciationRate: '',
  hourKmCounter: '',
  storageLocation: '',
  ownershipType: 'COMPANY',
  status: 'AVAILABLE',
  lastInspectionDate: '',
  nextInspectionDate: '',
  technicalReadinessStatus: '',
  repairStatus: '',
  notes: '',
  ownerInvestorName: '',
  ownerInvestorVoen: '',
  ownerInvestorPhone: '',
  ownerContractorId: '',
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest pt-1">{children}</p>
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
        equipmentCode: editing.equipmentCode || '',
        name: editing.name || '',
        type: editing.type || '',
        serialNumber: editing.serialNumber || '',
        brand: editing.brand || '',
        model: editing.model || '',
        manufactureYear: editing.manufactureYear ?? '',
        purchaseDate: editing.purchaseDate || '',
        purchasePrice: editing.purchasePrice ?? '',
        currentMarketValue: editing.currentMarketValue ?? '',
        depreciationRate: editing.depreciationRate ?? '',
        hourKmCounter: editing.hourKmCounter ?? '',
        storageLocation: editing.storageLocation || '',
        ownershipType: editing.ownershipType || 'COMPANY',
        status: editing.status || 'AVAILABLE',
        lastInspectionDate: editing.lastInspectionDate || '',
        nextInspectionDate: editing.nextInspectionDate || '',
        technicalReadinessStatus: editing.technicalReadinessStatus || '',
        repairStatus: editing.repairStatus || '',
        notes: editing.notes || '',
        ownerInvestorName: editing.ownerInvestorName || '',
        ownerInvestorVoen: editing.ownerInvestorVoen || '',
        ownerInvestorPhone: editing.ownerInvestorPhone || '',
        ownerContractorId: editing.ownerContractorId ?? '',
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
      equipmentCode: form.equipmentCode,
      name: form.name,
      type: form.type,
      serialNumber: form.serialNumber || null,
      brand: form.brand || null,
      model: form.model || null,
      manufactureYear: form.manufactureYear !== '' ? parseInt(form.manufactureYear) : null,
      purchaseDate: form.purchaseDate || null,
      purchasePrice: form.purchasePrice !== '' ? parseFloat(form.purchasePrice) : null,
      currentMarketValue: form.currentMarketValue !== '' ? parseFloat(form.currentMarketValue) : null,
      depreciationRate: form.depreciationRate !== '' ? parseFloat(form.depreciationRate) : null,
      hourKmCounter: form.hourKmCounter !== '' ? parseFloat(form.hourKmCounter) : null,
      storageLocation: form.storageLocation || null,
      ownershipType: form.ownershipType,
      status: form.status,
      lastInspectionDate: form.lastInspectionDate || null,
      nextInspectionDate: form.nextInspectionDate || null,
      technicalReadinessStatus: form.technicalReadinessStatus || null,
      repairStatus: form.repairStatus || null,
      notes: form.notes || null,
    }

    if (form.ownershipType === 'INVESTOR') {
      payload.ownerInvestorName = form.ownerInvestorName || null
      payload.ownerInvestorVoen = form.ownerInvestorVoen || null
      payload.ownerInvestorPhone = form.ownerInvestorPhone || null
    }

    if (form.ownershipType === 'CONTRACTOR') {
      payload.ownerContractorId = form.ownerContractorId ? parseInt(form.ownerContractorId) : null
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden">
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
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">

            <SectionLabel>Ümumi məlumatlar</SectionLabel>

            <Field label="Texnika adı" required>
              <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="Ekskavator, Kran..." className={inputCls} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Texnika kodu" required>
                <input type="text" value={form.equipmentCode} onChange={(e) => set('equipmentCode', e.target.value)}
                  placeholder="EQ-001" className={inputCls} />
              </Field>
              <Field label="Növ / Kateqoriya" required>
                <input type="text" value={form.type} onChange={(e) => set('type', e.target.value)}
                  placeholder="Ekskavator, Kran..." className={inputCls} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Brend">
                <input type="text" value={form.brand} onChange={(e) => set('brand', e.target.value)}
                  placeholder="Caterpillar" className={inputCls} />
              </Field>
              <Field label="Model">
                <input type="text" value={form.model} onChange={(e) => set('model', e.target.value)}
                  placeholder="320D" className={inputCls} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Seriya nömrəsi">
                <input type="text" value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)}
                  placeholder="SN-12345" className={inputCls} />
              </Field>
              <Field label="İstehsal ili">
                <input type="number" min="1900" max="2030" value={form.manufactureYear}
                  onChange={(e) => set('manufactureYear', e.target.value)} placeholder="2020" className={inputCls} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Alınma tarixi">
                <input type="date" value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)}
                  className={inputCls} />
              </Field>
              <Field label="Alış qiyməti (AZN)">
                <input type="number" min="0" step="0.01" value={form.purchasePrice}
                  onChange={(e) => set('purchasePrice', e.target.value)} placeholder="0.00" className={inputCls} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Cari bazar dəyəri (AZN)">
                <input type="number" min="0" step="0.01" value={form.currentMarketValue}
                  onChange={(e) => set('currentMarketValue', e.target.value)} placeholder="0.00" className={inputCls} />
              </Field>
              <Field label="Amortizasiya faizi (%)">
                <input type="number" min="0" max="100" step="0.01" value={form.depreciationRate}
                  onChange={(e) => set('depreciationRate', e.target.value)} placeholder="0.00" className={inputCls} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Saat / KM göstəricisi">
                <input type="number" min="0" step="0.01" value={form.hourKmCounter}
                  onChange={(e) => set('hourKmCounter', e.target.value)} placeholder="0.00" className={inputCls} />
              </Field>
              <Field label="Saxlanma yeri">
                <input type="text" value={form.storageLocation} onChange={(e) => set('storageLocation', e.target.value)}
                  placeholder="Anbar, Sahə..." className={inputCls} />
              </Field>
            </div>

            <SectionLabel>Texniki baxış tarixləri</SectionLabel>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Son texniki baxış tarixi">
                <input type="date" value={form.lastInspectionDate}
                  onChange={(e) => set('lastInspectionDate', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Növbəti texniki baxış tarixi">
                <input type="date" value={form.nextInspectionDate}
                  onChange={(e) => set('nextInspectionDate', e.target.value)} className={inputCls} />
              </Field>
            </div>

            <SectionLabel>Statuslar</SectionLabel>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Status">
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Təmir statusu">
                <select value={form.repairStatus} onChange={(e) => set('repairStatus', e.target.value)} className={inputCls}>
                  {REPAIR_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Texniki hazırlıq">
                <select value={form.technicalReadinessStatus}
                  onChange={(e) => set('technicalReadinessStatus', e.target.value)} className={inputCls}>
                  {TECH_READINESS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </div>

            <SectionLabel>Mülkiyyət</SectionLabel>

            <Field label="Mülkiyyət növü">
              <select value={form.ownershipType} onChange={(e) => set('ownershipType', e.target.value)} className={inputCls}>
                {OWNERSHIP_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>

            {/* INVESTOR fields */}
            {form.ownershipType === 'INVESTOR' && (
              <div className="space-y-3 p-4 rounded-xl border border-amber-100 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/10">
                <p className="text-xs font-semibold text-amber-600">İnvestor məlumatları</p>
                <Field label="İnvestorun adı, soyadı">
                  <input type="text" value={form.ownerInvestorName}
                    onChange={(e) => set('ownerInvestorName', e.target.value)}
                    placeholder="Ad Soyad" className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="VÖEN">
                    <input type="text" value={form.ownerInvestorVoen}
                      onChange={(e) => set('ownerInvestorVoen', e.target.value)}
                      placeholder="1234567890" className={inputCls} />
                  </Field>
                  <Field label="Əlaqə nömrəsi">
                    <input type="text" value={form.ownerInvestorPhone}
                      onChange={(e) => set('ownerInvestorPhone', e.target.value)}
                      placeholder="+994 XX XXX XX XX" className={inputCls} />
                  </Field>
                </div>
              </div>
            )}

            {/* CONTRACTOR fields */}
            {form.ownershipType === 'CONTRACTOR' && (
              <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/10">
                <p className="text-xs font-semibold text-amber-600 mb-3">Podratçı məlumatları</p>
                <Field label="Podratçı">
                  <select value={form.ownerContractorId}
                    onChange={(e) => set('ownerContractorId', e.target.value)} className={inputCls}>
                    <option value="">Podratçı seçin</option>
                    {contractors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}{c.voen ? ` (${c.voen})` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                {form.ownerContractorId && (() => {
                  const c = contractors.find((x) => String(x.id) === String(form.ownerContractorId))
                  if (!c) return null
                  return (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {c.voen && <span>VÖEN: <strong className="text-gray-700 dark:text-gray-300">{c.voen}</strong></span>}
                      {c.phone && <span>Tel: <strong className="text-gray-700 dark:text-gray-300">{c.phone}</strong></span>}
                      {c.contactPerson && <span className="col-span-2">Əlaqədar: <strong className="text-gray-700 dark:text-gray-300">{c.contactPerson}</strong></span>}
                    </div>
                  )
                })()}
              </div>
            )}

            <Field label="Qeyd">
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
                rows={3} placeholder="Əlavə qeydlər..."
                className={`${inputCls} resize-none`} />
            </Field>
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
