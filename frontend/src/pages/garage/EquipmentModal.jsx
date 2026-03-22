import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { garageApi } from '../../api/garage'
import { contractorsApi } from '../../api/contractors'
import { investorsApi } from '../../api/investors'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const OWNERSHIP_TYPES = [
  { value: 'COMPANY', label: 'Şirkət', desc: 'Şirkətin öz texnikası' },
  { value: 'INVESTOR', label: 'İnvestor', desc: 'İnvestora məxsus texnika' },
  { value: 'CONTRACTOR', label: 'Podratçı', desc: 'Podratçıya məxsus texnika' },
]

const STEPS = [
  { id: 1, label: 'Əsas məlumatlar' },
  { id: 2, label: 'Maliyyə & Texniki' },
  { id: 3, label: 'Mülkiyyət' },
]

const EMPTY = {
  equipmentCode: '', name: '', type: '', serialNumber: '',
  brand: '', model: '', manufactureYear: '',
  purchaseDate: '', purchasePrice: '', currentMarketValue: '',
  depreciationRate: '', hourKmCounter: '', motoHours: '', storageLocation: '',
  ownershipType: 'COMPANY',
  notes: '', ownerInvestorId: '', ownerContractorId: '',
}

function Field({ label, required, children, error }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center gap-1 px-6 pt-4 pb-2">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-1 flex-1">
          <div className={clsx(
            'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors',
            current > step.id
              ? 'bg-emerald-500 text-white'
              : current === step.id
              ? 'bg-amber-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          )}>
            {current > step.id ? <Check size={12} /> : step.id}
          </div>
          <span className={clsx(
            'text-[10px] font-medium truncate',
            current === step.id ? 'text-amber-600' : 'text-gray-400'
          )}>
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <div className={clsx(
              'flex-1 h-px mx-1',
              current > step.id ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-gray-200 dark:bg-gray-700'
            )} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function EquipmentModal({ editing, onClose, onSaved }) {
  useEscapeKey(onClose)
  const isClone = editing?._clone
  const isEditing = editing && !isClone
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [contractors, setContractors] = useState([])
  const [investors, setInvestors] = useState([])
  const [errors, setErrors] = useState({})

  useEffect(() => {
    contractorsApi.getAll()
      .then((res) => setContractors(res.data.data || res.data || []))
      .catch(() => {})
    investorsApi.getAll()
      .then((res) => setInvestors(res.data.data || res.data || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (editing) {
      let investorId = ''
      if (editing.ownerInvestorVoen) {
        investorId = investors.find(i => i.voen === editing.ownerInvestorVoen)?.id ?? ''
      } else if (editing.ownerInvestorName) {
        investorId = investors.find(i => i.companyName === editing.ownerInvestorName)?.id ?? ''
      }
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
        motoHours: editing.motoHours ?? '',
        storageLocation: editing.storageLocation || '',
        ownershipType: editing.ownershipType || 'COMPANY',
        notes: editing.notes || '',
        ownerInvestorId: investorId ? String(investorId) : '',
        ownerContractorId: editing.ownerContractorId ?? '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [editing, investors])

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

  const validateStep = (s) => {
    const errs = {}
    if (s === 1) {
      if (!form.name?.trim()) errs.name = 'Texnika adı tələb olunur'
      if (!form.equipmentCode?.trim()) errs.equipmentCode = 'Texnika kodu tələb olunur'
      if (!form.type?.trim()) errs.type = 'Növ tələb olunur'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const nextStep = () => {
    if (!validateStep(step)) return
    setStep((s) => Math.min(s + 1, 3))
  }

  const handleSubmit = async () => {
    if (!validateStep(step)) return

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
      motoHours: form.motoHours !== '' ? parseFloat(form.motoHours) : null,
      storageLocation: form.storageLocation || null,
      ownershipType: form.ownershipType,
      status: isEditing ? editing.status : 'AVAILABLE',
      notes: form.notes || null,
    }

    if (form.ownershipType === 'INVESTOR') {
      const inv = investors.find(i => String(i.id) === String(form.ownerInvestorId))
      payload.ownerInvestorName = inv?.companyName || null
      payload.ownerInvestorVoen = inv?.voen || null
      payload.ownerInvestorPhone = inv?.contactPhone || null
    }

    if (form.ownershipType === 'CONTRACTOR') {
      payload.ownerContractorId = form.ownerContractorId ? parseInt(form.ownerContractorId) : null
    }

    setLoading(true)
    try {
      if (isEditing) {
        await garageApi.update(editing.id, payload)
        toast.success('Texnika yeniləndi')
      } else {
        await garageApi.create(payload)
        toast.success(isClone ? 'Texnika kopyalandı' : 'Texnika əlavə edildi')
      }
      onSaved()
    } catch (err) {
      if (err?.isPending) { onClose?.(); return }
      toast.error(err?.response?.data?.message || 'Əməliyyat uğursuz oldu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-2">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {isClone ? 'Texnikanı kopyala' : isEditing ? 'Texnikanı redaktə et' : 'Yeni texnika əlavə et'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isClone ? `${editing.name} əsasında yeni texnika` : isEditing ? editing.name : 'Məlumatları doldurun'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors shrink-0"
          >
            <X size={14} className="text-white" />
          </button>
        </div>

        {/* Step indicator */}
        <StepIndicator steps={STEPS} current={step} />

        {/* Step content */}
        <div className="px-6 py-4 space-y-4 max-h-[55vh] overflow-y-auto scrollbar-thin">

          {/* ── STEP 1: Əsas məlumatlar ── */}
          {step === 1 && (
            <>
              <Field label="Texnika adı" required error={errors.name}>
                <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
                  placeholder="Ekskavator, Kran, Yükləyici..." className={inputCls('name')} autoFocus />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Texnika kodu" required error={errors.equipmentCode}>
                  <input type="text" value={form.equipmentCode} onChange={(e) => set('equipmentCode', e.target.value)}
                    placeholder="EQ-001" className={inputCls('equipmentCode')} />
                </Field>
                <Field label="Növ / Kateqoriya" required error={errors.type}>
                  <input type="text" value={form.type} onChange={(e) => set('type', e.target.value)}
                    placeholder="Ekskavator, Kran..." className={inputCls('type')} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Brend">
                  <input type="text" value={form.brand} onChange={(e) => set('brand', e.target.value)}
                    placeholder="Caterpillar" className={inputCls('')} />
                </Field>
                <Field label="Model">
                  <input type="text" value={form.model} onChange={(e) => set('model', e.target.value)}
                    placeholder="320D" className={inputCls('')} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Seriya nömrəsi">
                  <input type="text" value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)}
                    placeholder="SN-12345" className={inputCls('')} />
                </Field>
                <Field label="İstehsal ili">
                  <input type="number" min="1900" max="2030" value={form.manufactureYear}
                    onChange={(e) => set('manufactureYear', e.target.value)} placeholder="2020" className={inputCls('')} />
                </Field>
              </div>

            </>
          )}

          {/* ── STEP 2: Maliyyə & Texniki ── */}
          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Alınma tarixi">
                  <input type="date" value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)}
                    className={inputCls('')} />
                </Field>
                <Field label="Alış qiyməti (AZN)">
                  <input type="number" min="0" step="0.01" value={form.purchasePrice}
                    onChange={(e) => set('purchasePrice', e.target.value)} placeholder="0.00" className={inputCls('')} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Cari bazar dəyəri (AZN)">
                  <input type="number" min="0" step="0.01" value={form.currentMarketValue}
                    onChange={(e) => set('currentMarketValue', e.target.value)} placeholder="0.00" className={inputCls('')} />
                </Field>
                <Field label="Amortizasiya faizi (%)">
                  <input type="number" min="0" max="100" step="0.01" value={form.depreciationRate}
                    onChange={(e) => set('depreciationRate', e.target.value)} placeholder="0.00" className={inputCls('')} />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Saat / KM göstəricisi">
                  <input type="number" min="0" step="0.01" value={form.hourKmCounter}
                    onChange={(e) => set('hourKmCounter', e.target.value)} placeholder="0.00" className={inputCls('')} />
                </Field>
                <Field label="Moto saatlar">
                  <input type="number" min="0" step="0.01" value={form.motoHours}
                    onChange={(e) => set('motoHours', e.target.value)} placeholder="0.00" className={inputCls('')} />
                </Field>
                <Field label="Saxlanma yeri">
                  <input type="text" value={form.storageLocation} onChange={(e) => set('storageLocation', e.target.value)}
                    placeholder="Anbar, Sahə..." className={inputCls('')} />
                </Field>
              </div>

            </>
          )}

          {/* ── STEP 3: Mülkiyyət ── */}
          {step === 3 && (
            <>
              <Field label="Mülkiyyət növü">
                <div className="grid grid-cols-3 gap-2">
                  {OWNERSHIP_TYPES.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => set('ownershipType', o.value)}
                      className={clsx(
                        'p-3 rounded-xl border-2 text-left transition-all',
                        form.ownershipType === o.value
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-600'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      )}
                    >
                      <p className={clsx(
                        'text-xs font-semibold',
                        form.ownershipType === o.value ? 'text-amber-700 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'
                      )}>{o.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{o.desc}</p>
                    </button>
                  ))}
                </div>
              </Field>

              {/* INVESTOR fields */}
              {form.ownershipType === 'INVESTOR' && (
                <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/10 space-y-3">
                  <p className="text-xs font-semibold text-amber-600">İnvestor məlumatları</p>
                  <Field label="İnvestor seçin">
                    <select value={form.ownerInvestorId}
                      onChange={(e) => set('ownerInvestorId', e.target.value)} className={inputCls('')}>
                      <option value="">İnvestor seçin</option>
                      {investors.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.companyName}{inv.voen ? ` (${inv.voen})` : ''}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {form.ownerInvestorId && (() => {
                    const inv = investors.find(i => String(i.id) === String(form.ownerInvestorId))
                    if (!inv) return null
                    return (
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                        {inv.voen && <span>VÖEN: <strong className="text-gray-700 dark:text-gray-300">{inv.voen}</strong></span>}
                        {inv.contactPhone && <span>Tel: <strong className="text-gray-700 dark:text-gray-300">{inv.contactPhone}</strong></span>}
                        {inv.contactPerson && <span className="col-span-2">Əlaqədar: <strong className="text-gray-700 dark:text-gray-300">{inv.contactPerson}</strong></span>}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* CONTRACTOR fields */}
              {form.ownershipType === 'CONTRACTOR' && (
                <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/10 space-y-3">
                  <p className="text-xs font-semibold text-amber-600">Podratçı məlumatları</p>
                  <Field label="Podratçı seçin">
                    <select value={form.ownerContractorId}
                      onChange={(e) => set('ownerContractorId', e.target.value)} className={inputCls('')}>
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
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
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
                  className={clsx(inputCls(''), 'resize-none')} />
              </Field>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium transition-colors"
            >
              <ChevronLeft size={16} />
              Geriyə
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Ləğv et
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              Davam et
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isClone ? 'Kopyala' : isEditing ? 'Yadda saxla' : 'Əlavə et'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
