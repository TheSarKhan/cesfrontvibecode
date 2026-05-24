import DateInput from '../../components/common/DateInput'
import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Check, Copy, Pencil, Plus } from 'lucide-react'
import { garageApi } from '../../api/garage'
import ComboInput from '../../components/common/ComboInput'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useConfirm } from '../../components/common/ConfirmDialog'

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
  safetyEquipmentIds: [],
}

function Field({ label, required, children, error }) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-1.5">
        {label} {required && <span className="text-[var(--ces-danger)]">*</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs font-semibold text-[var(--ces-danger)]">{error}</p>}
    </div>
  )
}

function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center gap-1.5 px-6 py-4 border-b border-[var(--ces-line)] bg-[var(--ces-graphite-50)]">
      {steps.map((step, i) => {
        const done = current > step.id
        const active = current === step.id
        return (
          <div key={step.id} className="flex items-center gap-2 flex-1">
            <div className={clsx(
              'w-7 h-7 rounded-full grid place-items-center text-[11px] font-extrabold shrink-0 transition-colors font-mono',
              done && 'bg-[var(--ces-ok)] text-white',
              active && 'bg-[var(--ces-gold)] text-[var(--ces-on-gold)] shadow-[0_0_0_4px_var(--ces-gold-100)]',
              !done && !active && 'bg-white border border-[var(--ces-line)] text-[var(--ces-muted)]'
            )}>
              {done ? <Check size={13} /> : step.id}
            </div>
            <span className={clsx(
              'text-[12px] font-bold truncate',
              active ? 'text-[var(--ces-ink)]' : 'text-[var(--ces-muted)]'
            )}>
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <div className={clsx(
                'flex-1 h-0.5 mx-1 rounded-full',
                done ? 'bg-[var(--ces-ok)]' : 'bg-[var(--ces-graphite-100)]'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function EquipmentModal({ editing, onClose, onSaved, contractors = [], investors = [], safetyTypes = [] }) {
  const isClone = editing?._clone
  const isEditing = editing && !isClone
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(EMPTY)
  const [initialForm, setInitialForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { confirm, ConfirmDialog } = useConfirm()

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm)

  const handleClose = async () => {
    if (isDirty) {
      if (!(await confirm({
        title: 'Bağlamağı təsdiqlə',
        message: 'Dəyişikliklər yadda saxlanmayıb. Bağlamaq istəyirsiniz?',
        confirmText: 'Bağla',
      }))) return
    }
    onClose()
  }

  useEscapeKey(handleClose)

  useEffect(() => {
    if (editing) {
      let investorId = ''
      if (editing.ownerInvestorVoen) {
        investorId = investors.find(i => i.voen === editing.ownerInvestorVoen)?.id ?? ''
      } else if (editing.ownerInvestorName) {
        investorId = investors.find(i => i.companyName === editing.ownerInvestorName)?.id ?? ''
      }
      const data = {
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
        safetyEquipmentIds: editing.safetyEquipment?.map(s => s.id) || [],
      }
      setForm(data)
      setInitialForm(data)
    } else {
      setForm(EMPTY)
      setInitialForm(EMPTY)
    }
  }, [editing, investors])

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const inputCls = (field) => clsx(
    'w-full px-3.5 py-2.5 text-sm bg-white border rounded-[11px] text-[var(--ces-ink)] placeholder-[var(--ces-mute2)] focus:outline-none transition-all',
    errors[field]
      ? 'border-[var(--ces-danger)] focus:border-[var(--ces-danger)] focus:ring-[3px] focus:ring-[rgba(212,56,90,0.12)]'
      : 'border-[var(--ces-line)] focus:border-[var(--ces-graphite)] focus:ring-[3px] focus:ring-[rgba(58,58,58,0.1)]'
  )

  const hasLetter = (v) => /\p{L}/u.test(v ?? '')
  const hasLetterOrDigit = (v) => /[\p{L}\d]/u.test(v ?? '')
  const currentYear = new Date().getFullYear()

  const validateStep = (s) => {
    const errs = {}

    if (s === 1) {
      const name = form.name?.trim() ?? ''
      if (!name) errs.name = 'Texnika adı tələb olunur'
      else if (name.length < 2) errs.name = 'Ad minimum 2 simvol olmalıdır'
      else if (!hasLetter(name)) errs.name = 'Ad ən azı bir hərf içərməlidir'

      const code = form.equipmentCode?.trim() ?? ''
      if (!code) errs.equipmentCode = 'Texnika kodu tələb olunur'
      else if (code.length < 2) errs.equipmentCode = 'Kod minimum 2 simvol olmalıdır'
      else if (!hasLetterOrDigit(code)) errs.equipmentCode = 'Kod ən azı bir hərf və ya rəqəm içərməlidir'

      const type = form.type?.trim() ?? ''
      if (!type) errs.type = 'Növ tələb olunur'
      else if (type.length < 2) errs.type = 'Növ minimum 2 simvol olmalıdır'
      else if (!hasLetter(type)) errs.type = 'Növ ən azı bir hərf içərməlidir'

      if (form.manufactureYear !== '' && form.manufactureYear != null) {
        const y = parseInt(form.manufactureYear)
        if (isNaN(y) || y < 1900 || y > currentYear + 1)
          errs.manufactureYear = `İstehsal ili 1900 - ${currentYear + 1} arasında olmalıdır`
      }
    }

    if (s === 2) {
      if (form.purchasePrice === '' || form.purchasePrice == null) {
        errs.purchasePrice = 'Alış qiyməti tələb olunur'
      } else {
        const p = parseFloat(form.purchasePrice)
        if (isNaN(p)) errs.purchasePrice = 'Düzgün rəqəm daxil edin'
        else if (p < 0) errs.purchasePrice = 'Alış qiyməti mənfi ola bilməz'
        else if (p > 99999999) errs.purchasePrice = 'Alış qiyməti çox böyükdür'
      }

      if (!form.purchaseDate) {
        errs.purchaseDate = 'Alınma tarixi tələb olunur'
      }

      if (form.currentMarketValue !== '' && form.currentMarketValue != null) {
        const v = parseFloat(form.currentMarketValue)
        if (isNaN(v)) errs.currentMarketValue = 'Düzgün rəqəm daxil edin'
        else if (v < 0) errs.currentMarketValue = 'Bazar dəyəri mənfi ola bilməz'
        else if (v > 99999999) errs.currentMarketValue = 'Bazar dəyəri çox böyükdür'
      }

      if (form.depreciationRate !== '' && form.depreciationRate != null) {
        const d = parseFloat(form.depreciationRate)
        if (isNaN(d)) errs.depreciationRate = 'Düzgün rəqəm daxil edin'
        else if (d < 0 || d > 100) errs.depreciationRate = 'Amortizasiya 0-100% arasında olmalıdır'
      }

      if (form.motoHours !== '' && form.motoHours != null) {
        const m = parseFloat(form.motoHours)
        if (isNaN(m)) errs.motoHours = 'Düzgün rəqəm daxil edin'
        else if (m < 0) errs.motoHours = 'Moto saatlar mənfi ola bilməz'
        else if (m > 999999) errs.motoHours = 'Moto saatlar çox böyükdür'
      }

      if (form.hourKmCounter !== '' && form.hourKmCounter != null) {
        const h = parseFloat(form.hourKmCounter)
        if (isNaN(h)) errs.hourKmCounter = 'Düzgün rəqəm daxil edin'
        else if (h < 0) errs.hourKmCounter = 'Saat/KM göstəricisi mənfi ola bilməz'
        else if (h > 999999) errs.hourKmCounter = 'Saat/KM göstəricisi çox böyükdür'
      }
    }

    if (s === 3) {
      if (form.ownershipType === 'INVESTOR' && !form.ownerInvestorId)
        errs.ownerInvestorId = 'İnvestor seçilməlidir'
      if (form.ownershipType === 'CONTRACTOR' && !form.ownerContractorId)
        errs.ownerContractorId = 'Podratçı seçilməlidir'
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
    if (isEditing && !isDirty) {
      toast('Dəyişiklik edilməyib', { icon: 'ℹ️' })
      return
    }

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
      safetyEquipmentIds: form.safetyEquipmentIds || [],
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(58,58,58,0.45)] backdrop-blur-sm p-4 ces-font">
      <div className="bg-[var(--ces-surface)] rounded-[18px] shadow-[0_24px_48px_-20px_rgba(58,58,58,0.28),0_6px_14px_rgba(58,58,58,0.08)] w-full max-w-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3.5 px-6 pt-6 pb-5 border-b border-[var(--ces-line)]">
          <div className="w-11 h-11 rounded-[12px] grid place-items-center bg-[var(--ces-gold-100)] text-[var(--ces-gold-700)] shrink-0">
            {isClone ? <Copy size={18} /> : isEditing ? <Pencil size={18} /> : <Plus size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-[var(--ces-ink)] leading-tight">
              {isClone ? 'Texnikanı kopyala' : isEditing ? 'Texnikanı redaktə et' : 'Yeni texnika əlavə et'}
            </h2>
            <p className="text-[13px] text-[var(--ces-muted)] mt-1 truncate">
              {isClone ? `${editing.name} əsasında yeni texnika` : isEditing ? editing.name : 'Məlumatları doldurun'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-[8px] grid place-items-center text-[var(--ces-muted)] hover:bg-[var(--ces-graphite-50)] hover:text-[var(--ces-graphite)] transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <StepIndicator steps={STEPS} current={step} />

        {/* Step content */}
        <div className="px-6 py-5 space-y-4 max-h-[55vh] overflow-y-auto scrollbar-thin">

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
                  <ComboInput category="EQUIPMENT_TYPE" value={form.type} onChange={(v) => set('type', v)}
                    placeholder="Ekskavator, Kran..." className={errors.type ? 'border-[var(--ces-danger)] focus:ring-[var(--ces-danger)]' : ''} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Brend">
                  <ComboInput category="EQUIPMENT_BRAND" value={form.brand} onChange={(v) => set('brand', v)}
                    placeholder="Caterpillar" />
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
                <Field label="İstehsal ili" error={errors.manufactureYear}>
                  <input type="number" min="1900" max={new Date().getFullYear() + 1} value={form.manufactureYear}
                    onChange={(e) => set('manufactureYear', e.target.value)} placeholder="2020" className={inputCls('manufactureYear')} />
                </Field>
              </div>
            </>
          )}

          {/* ── STEP 2: Maliyyə & Texniki ── */}
          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Alınma tarixi" required error={errors.purchaseDate}>
                  <DateInput value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)}
                    className={inputCls('purchaseDate')} />
                </Field>
                <Field label="Alış qiyməti (AZN)" required error={errors.purchasePrice}>
                  <input type="number" min="0" step="0.01" value={form.purchasePrice}
                    onChange={(e) => set('purchasePrice', e.target.value)} placeholder="0.00" className={inputCls('purchasePrice')} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Cari bazar dəyəri (AZN)" error={errors.currentMarketValue}>
                  <input type="number" min="0" step="0.01" value={form.currentMarketValue}
                    onChange={(e) => set('currentMarketValue', e.target.value)} placeholder="0.00" className={inputCls('currentMarketValue')} />
                </Field>
                <Field label="Amortizasiya faizi (%)" error={errors.depreciationRate}>
                  <input type="number" min="0" max="100" step="0.01" value={form.depreciationRate}
                    onChange={(e) => set('depreciationRate', e.target.value)} placeholder="0.00" className={inputCls('depreciationRate')} />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Saat / KM göstəricisi" error={errors.hourKmCounter}>
                  <input type="number" min="0" step="0.01" value={form.hourKmCounter}
                    onChange={(e) => set('hourKmCounter', e.target.value)} placeholder="0.00" className={inputCls('hourKmCounter')} />
                </Field>
                <Field label="Moto saatlar" error={errors.motoHours}>
                  <input type="number" min="0" step="0.01" value={form.motoHours}
                    onChange={(e) => set('motoHours', e.target.value)} placeholder="0.00" className={inputCls('motoHours')} />
                </Field>
                <Field label="Saxlanma yeri">
                  <ComboInput category="STORAGE_LOCATION" value={form.storageLocation} onChange={(v) => set('storageLocation', v)}
                    placeholder="Anbar, Sahə..." />
                </Field>
              </div>

              {safetyTypes.length > 0 && (
                <div>
                  <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-2">Təhlükəsizlik avadanlıqları</label>
                  <div className="grid grid-cols-3 gap-2">
                    {safetyTypes.map((st) => {
                      const checked = (form.safetyEquipmentIds || []).includes(st.id)
                      return (
                        <label key={st.id} className={clsx(
                          'flex items-center gap-2 cursor-pointer rounded-[10px] border p-2.5 transition-all text-[13px]',
                          checked
                            ? 'border-[var(--ces-ok)] bg-[var(--ces-ok-100)] text-[var(--ces-ok)] font-bold'
                            : 'border-[var(--ces-line)] bg-white text-[var(--ces-muted)] hover:border-[var(--ces-graphite)]'
                        )}>
                          <input type="checkbox" checked={checked}
                            onChange={() => {
                              const ids = form.safetyEquipmentIds || []
                              set('safetyEquipmentIds', checked ? ids.filter(id => id !== st.id) : [...ids, st.id])
                            }}
                            className="accent-[var(--ces-ok)] w-4 h-4" />
                          {st.key}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── STEP 3: Mülkiyyət ── */}
          {step === 3 && (
            <>
              <Field label="Mülkiyyət növü">
                <div className="grid grid-cols-3 gap-2">
                  {OWNERSHIP_TYPES.map((o) => {
                    const on = form.ownershipType === o.value
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => set('ownershipType', o.value)}
                        className={clsx(
                          'p-3.5 rounded-[12px] border-2 text-left transition-all',
                          on
                            ? 'border-[var(--ces-gold)] bg-[var(--ces-gold-50)]'
                            : 'border-[var(--ces-line)] bg-white hover:border-[var(--ces-graphite)]'
                        )}
                      >
                        <p className={clsx(
                          'text-[13px] font-bold',
                          on ? 'text-[var(--ces-gold-700)]' : 'text-[var(--ces-ink)]'
                        )}>{o.label}</p>
                        <p className="text-[11px] text-[var(--ces-muted)] mt-1">{o.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </Field>

              {/* INVESTOR fields */}
              {form.ownershipType === 'INVESTOR' && (
                <div className="p-4 rounded-[14px] border border-[var(--ces-gold-100)] bg-[var(--ces-gold-50)] space-y-3">
                  <p className="text-[11px] tracking-[0.14em] uppercase font-bold text-[var(--ces-gold-700)]">İnvestor məlumatları</p>
                  <Field label="İnvestor seçin" error={errors.ownerInvestorId}>
                    <select value={form.ownerInvestorId}
                      onChange={(e) => { set('ownerInvestorId', e.target.value); if (errors.ownerInvestorId) setErrors(p => ({ ...p, ownerInvestorId: undefined })) }} className={inputCls('ownerInvestorId')}>
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
                      <div className="grid grid-cols-2 gap-2 text-[12px] text-[var(--ces-muted)]">
                        {inv.voen && <span>VÖEN: <strong className="text-[var(--ces-ink)] font-mono">{inv.voen}</strong></span>}
                        {inv.contactPhone && <span>Tel: <strong className="text-[var(--ces-ink)] font-mono">{inv.contactPhone}</strong></span>}
                        {inv.contactPerson && <span className="col-span-2">Əlaqədar: <strong className="text-[var(--ces-ink)]">{inv.contactPerson}</strong></span>}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* CONTRACTOR fields */}
              {form.ownershipType === 'CONTRACTOR' && (
                <div className="p-4 rounded-[14px] border border-[var(--ces-gold-100)] bg-[var(--ces-gold-50)] space-y-3">
                  <p className="text-[11px] tracking-[0.14em] uppercase font-bold text-[var(--ces-gold-700)]">Podratçı məlumatları</p>
                  <Field label="Podratçı seçin" error={errors.ownerContractorId}>
                    <select value={form.ownerContractorId}
                      onChange={(e) => { set('ownerContractorId', e.target.value); if (errors.ownerContractorId) setErrors(p => ({ ...p, ownerContractorId: undefined })) }} className={inputCls('ownerContractorId')}>
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
                      <div className="grid grid-cols-2 gap-2 text-[12px] text-[var(--ces-muted)]">
                        {c.voen && <span>VÖEN: <strong className="text-[var(--ces-ink)] font-mono">{c.voen}</strong></span>}
                        {c.phone && <span>Tel: <strong className="text-[var(--ces-ink)] font-mono">{c.phone}</strong></span>}
                        {c.contactPerson && <span className="col-span-2">Əlaqədar: <strong className="text-[var(--ces-ink)]">{c.contactPerson}</strong></span>}
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
        <div className="flex items-center gap-2.5 px-6 py-4 border-t border-[var(--ces-line)] bg-[var(--ces-graphite-50)]">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ces-graphite)] hover:text-[var(--ces-ink)] transition-colors"
            >
              <ChevronLeft size={16} />
              Geriyə
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 rounded-[10px] text-sm font-semibold text-[var(--ces-graphite)] bg-white border border-[var(--ces-line)] hover:border-[var(--ces-graphite)] transition-colors"
          >
            Ləğv et
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="inline-flex items-center gap-1.5 bg-[var(--ces-gold)] hover:bg-[var(--ces-gold-700)] text-[var(--ces-on-gold)] font-semibold px-5 py-2.5 rounded-[10px] text-sm transition-colors"
            >
              Davam et
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-[var(--ces-gold)] hover:bg-[var(--ces-gold-700)] disabled:opacity-60 disabled:pointer-events-none text-[var(--ces-on-gold)] font-semibold px-5 py-2.5 rounded-[10px] text-sm transition-colors"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isClone ? 'Kopyala' : isEditing ? 'Yadda saxla' : 'Əlavə et'}
            </button>
          )}
        </div>
      </div>
      <ConfirmDialog />
    </div>
  )
}
