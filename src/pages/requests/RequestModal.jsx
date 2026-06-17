import DateInput from '../../components/common/DateInput'
import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react'
import { X, Plus, Trash2, Search, MapPin, ChevronRight, ChevronLeft, Check, Building2, FolderKanban, Settings2, ClipboardList, Pencil } from 'lucide-react'
import { requestsApi } from '../../api/requests'
import { customersApi } from '../../api/customers'
import { PROJECT_TYPES } from '../../constants/requests'
import ComboInput from '../../components/common/ComboInput'
import { onlyDigits, digitKeyDown, makePasteHandler } from '../../utils/validation'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const MapPickerModal = lazy(() => import('../../components/common/MapPickerModal'))

const EMPTY = {
  customerId: null,
  companyName: '',
  contactPerson: '',
  phonePrefix: '+994',
  phoneLocal: '',
  projectName: '',
  region: '',
  requestDate: new Date().toISOString().slice(0, 10),
  projectType: '',
  dayCount: '',
  transportationRequired: false,
  paymentMethod: '',
  params: [],
  notes: '',
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Nağd' },
  { value: 'TRANSFER', label: 'Köçürmə' },
]

const COUNTRY_CODES = [
  { code: '+994', flag: '🇦🇿', label: 'AZ' },
  { code: '+90',  flag: '🇹🇷', label: 'TR' },
  { code: '+7',   flag: '🇷🇺', label: 'RU' },
  { code: '+995', flag: '🇬🇪', label: 'GE' },
  { code: '+380', flag: '🇺🇦', label: 'UA' },
  { code: '+998', flag: '🇺🇿', label: 'UZ' },
  { code: '+996', flag: '🇰🇬', label: 'KG' },
  { code: '+992', flag: '🇹🇯', label: 'TJ' },
  { code: '+993', flag: '🇹🇲', label: 'TM' },
  { code: '+1',   flag: '🇺🇸', label: 'US' },
  { code: '+44',  flag: '🇬🇧', label: 'GB' },
  { code: '+49',  flag: '🇩🇪', label: 'DE' },
  { code: '+33',  flag: '🇫🇷', label: 'FR' },
  { code: '+971', flag: '🇦🇪', label: 'AE' },
]

function parsePhone(full) {
  if (!full) return { prefix: '+994', local: '' }
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length)
  for (const c of sorted) {
    if (full.startsWith(c.code)) return { prefix: c.code, local: full.slice(c.code.length) }
  }
  return { prefix: '+994', local: full }
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

const STEPS = [
  { key: 'customer', label: 'Müştəri', icon: Building2 },
  { key: 'project', label: 'Layihə', icon: FolderKanban },
  { key: 'details', label: 'Əlavələr', icon: Settings2 },
]

export default function RequestModal({ editing, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY)
  const [initialForm, setInitialForm] = useState(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState([])
  const [customerResults, setCustomerResults] = useState([])
  const [mapOpen, setMapOpen] = useState(false)
  const [visited, setVisited] = useState([0])
  const [errors, setErrors] = useState({})
  const searchTimeout = useRef(null)

  const isDirty = useMemo(() => {
    if (!initialForm) return false
    return JSON.stringify(form) !== JSON.stringify(initialForm)
  }, [form, initialForm])

  const handleClose = () => {
    if (isDirty) {
      if (!window.confirm('Saxlanılmamış dəyişikliklər var. Çıxmaq istəyirsiniz?')) return
    }
    onClose()
  }

  useEscapeKey(handleClose)

  useEffect(() => {
    customersApi.getAll().then((r) => setCustomers(r.data.data || r.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (editing) {
      const f = {
        customerId: editing.customerId || null,
        companyName: editing.companyName || '',
        contactPerson: editing.contactPerson || '',
        ...(() => { const p = parsePhone(editing.contactPhone); return { phonePrefix: p.prefix, phoneLocal: p.local } })(),
        projectName: editing.projectName || '',
        region: editing.region || '',
        requestDate: editing.requestDate || '',
        projectType: editing.projectType || '',
        dayCount: editing.dayCount ?? '',
        transportationRequired: editing.transportationRequired || false,
        paymentMethod: editing.paymentMethod || '',
        params: editing.params ? editing.params.map((p) => ({ ...p })) : [],
        notes: editing.notes || '',
      }
      setForm(f)
      setInitialForm(JSON.parse(JSON.stringify(f)))
      if (editing.companyName) setCustomerSearch(editing.companyName)
      setVisited([0, 1, 2])
    } else {
      setForm(EMPTY)
      setInitialForm(JSON.parse(JSON.stringify(EMPTY)))
      setCustomerSearch('')
      setVisited([0])
      setStep(0)
    }
  }, [editing])

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n })
  }

  const validate = (s) => {
    const errs = {}
    if (s === 0) {
      const name = form.companyName.trim()
      if (!name) errs.companyName = 'Şirkət adı tələb olunur'
      else if (name.length < 2) errs.companyName = 'Minimum 2 simvol olmalıdır'
      else if (name.length > 100) errs.companyName = 'Maksimum 100 simvol ola bilər'

      if (!form.contactPerson?.trim()) errs.contactPerson = 'Əlaqə şəxsi tələb olunur'
      else if (form.contactPerson.length > 100) errs.contactPerson = 'Maksimum 100 simvol ola bilər'

      if (!form.phoneLocal?.trim()) errs.phoneLocal = 'Əlaqə nömrəsi tələb olunur'
      else {
        const digits = form.phoneLocal.replace(/\D/g, '')
        if (digits.length < 4) errs.phoneLocal = 'Nömrə çox qısadır'
        else if (digits.length > 15) errs.phoneLocal = 'Nömrə çox uzundur (maks. 15 rəqəm)'
      }
    }
    if (s === 1) {
      if (!form.projectName?.trim()) errs.projectName = 'Layihə adı tələb olunur'
      else if (form.projectName.length > 200) errs.projectName = 'Maksimum 200 simvol ola bilər'

      if (!form.region?.trim()) errs.region = 'Bölgə tələb olunur'
      else if (form.region.length > 100) errs.region = 'Maksimum 100 simvol ola bilər'

      if (!form.requestDate) errs.requestDate = 'Sorğu tarixi tələb olunur'

      if (!form.projectType) errs.projectType = 'Layihə tipi seçilməlidir'

      if (!form.paymentMethod) errs.paymentMethod = 'Ödəniş növü seçilməlidir'

      if (form.dayCount !== '' && form.dayCount !== null) {
        const n = parseInt(form.dayCount)
        if (isNaN(n) || n < 1) errs.dayCount = 'Müddət müsbət tam rəqəm olmalıdır'
        else if (n > 3650) errs.dayCount = 'Maksimum 3650 gün/ay ola bilər'
      }
    }
    if (s === 2) {
      if (form.notes && form.notes.length > 500)
        errs.notes = `Maksimum 500 simvol ola bilər (${form.notes.length}/500)`
      form.params.forEach((p, i) => {
        const key = p.paramKey.trim()
        const val = p.paramValue.trim()
        if (!key && val) errs[`paramKey_${i}`] = 'Parametr adı tələb olunur'
        if (key && !val) errs[`param_${i}`] = 'Dəyər tələb olunur'
        if (key && val && !/^\d+(\.\d+)?$/.test(val)) errs[`param_${i}`] = 'Dəyər müsbət rəqəm olmalıdır'
        if (p.paramKey.length > 100) errs[`paramKey_${i}`] = 'Maksimum 100 simvol'
        if (val.length > 200) errs[`param_${i}`] = 'Maksimum 200 simvol'
      })
    }
    return errs
  }

  const handleCustomerSearch = (val) => {
    setCustomerSearch(val)
    set('companyName', val)
    set('customerId', null)
    clearTimeout(searchTimeout.current)
    if (!val.trim()) { setCustomerResults([]); return }
    searchTimeout.current = setTimeout(() => {
      const q = val.toLowerCase()
      const results = customers.filter((c) =>
        c.companyName?.toLowerCase().includes(q) ||
        c.voen?.toLowerCase().includes(q)
      ).slice(0, 5)
      setCustomerResults(results)
    }, 200)
  }

  const selectCustomer = (c) => {
    setCustomerSearch(c.companyName)
    setCustomerResults([])
    const rawPhone = c.officeContactPhone || c.supplierPhone || ''
    const { prefix, local } = parsePhone(rawPhone)
    setForm((prev) => ({
      ...prev,
      customerId: c.id,
      companyName: c.companyName,
      contactPerson: c.officeContactPerson || c.supplierPerson || '',
      phonePrefix: prefix,
      phoneLocal: local,
    }))
  }

  const addParam = () => setForm((p) => ({ ...p, params: [...p.params, { paramKey: '', paramValue: '' }] }))
  const removeParam = (i) => setForm((p) => ({ ...p, params: p.params.filter((_, idx) => idx !== i) }))
  const setParamField = (i, field, val) => {
    setForm((p) => ({
      ...p,
      params: p.params.map((param, idx) => idx === i ? { ...param, [field]: val } : param),
    }))
    const errKey = field === 'paramKey' ? `paramKey_${i}` : `param_${i}`
    if (errors[errKey]) setErrors((e) => { const n = { ...e }; delete n[errKey]; return n })
  }

  const goNext = () => {
    const errs = validate(step)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    const next = step + 1
    setStep(next)
    setVisited((v) => v.includes(next) ? v : [...v, next])
  }

  const goBack = () => setStep((s) => Math.max(0, s - 1))

  const goToStep = (i) => {
    if (visited.includes(i) || i <= step) {
      if (i > 0 && !form.companyName.trim()) {
        toast.error('Əvvəlcə şirkət adı daxil edin')
        return
      }
      setStep(i)
      setVisited((v) => v.includes(i) ? v : [...v, i])
    }
  }

  const handleSubmit = async () => {
    const e0 = validate(0), e1 = validate(1), e2 = validate(2)
    if (Object.keys(e0).length) { setStep(0); setErrors(e0); return }
    if (Object.keys(e1).length) { setStep(1); setErrors(e1); return }
    if (Object.keys(e2).length) { setStep(2); setErrors(e2); return }

    const payload = {
      ...form,
      contactPhone: form.phoneLocal ? form.phonePrefix + form.phoneLocal : '',
      projectType: form.projectType || null,
      dayCount: form.dayCount ? parseInt(form.dayCount) : null,
      requestDate: form.requestDate || null,
      params: form.params.filter((p) => p.paramKey?.trim()),
    }

    setLoading(true)
    try {
      if (editing) {
        await requestsApi.update(editing.id, payload)
        toast.success('Sorğu yeniləndi')
      } else {
        await requestsApi.create(payload)
        toast.success('Sorğu yaradıldı')
      }
      onSaved()
    } catch (err) {
      if (err?.isPending) { onClose?.(); return }
    } finally {
      setLoading(false)
    }
  }

  const stepComplete = [
    !!(form.companyName.trim() && form.contactPerson?.trim() && form.phoneLocal?.trim()),
    !!(form.projectName?.trim() && form.region?.trim() && form.requestDate && form.projectType && form.paymentMethod),
    true,
  ]

  const inputWrap = (field) => clsx('ces-input', errors[field] && 'is-error')

  return (
    <div className="ces-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="ces-modal" style={{ maxWidth: 720 }}>
        {/* Header */}
        <div className="ces-m-head">
          <div className={clsx('ces-m-ic', editing ? 'gold' : '')}>
            {editing ? <Pencil size={20} /> : <ClipboardList size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3>{editing ? `Sorğu #${editing.requestCode || editing.id}` : 'Yeni sorğu yarat'}</h3>
            <p>{editing ? 'Məlumatları redaktə et' : `${STEPS[step].label} məlumatlarını doldurun`}</p>
          </div>
          <button onClick={handleClose} className="ces-modal-x" type="button" aria-label="Bağla">
            <X size={16} />
          </button>
        </div>

        {/* Stepper */}
        <div style={{ padding: '18px 26px 4px' }}>
          <div className="flex items-center justify-between" style={{ gap: 8 }}>
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const isActive = step === i
              const isCompleted = stepComplete[i] && visited.includes(i) && i < step
              const isClickable = visited.includes(i) || i <= step
              return (
                <div key={s.key} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? 1 : 'none', minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => goToStep(i)}
                    disabled={!isClickable}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 10,
                      background: isActive ? 'var(--ces-gold-50)' : 'transparent',
                      border: isActive ? '1px solid var(--ces-gold-100)' : '1px solid transparent',
                      cursor: isClickable ? 'pointer' : 'not-allowed',
                      opacity: !isActive && !isClickable ? 0.4 : 1,
                      transition: 'background .15s, border-color .15s',
                    }}
                  >
                    <span
                      style={{
                        width: 30, height: 30, borderRadius: 999,
                        display: 'grid', placeItems: 'center',
                        background: isActive ? 'var(--ces-gold)'
                          : isCompleted ? 'var(--ces-ok)'
                          : 'var(--ces-graphite-100)',
                        color: isActive ? 'var(--ces-on-gold)' : isCompleted ? '#fff' : 'var(--ces-muted)',
                        flex: 'none',
                      }}
                    >
                      {isCompleted && !isActive ? <Check size={14} /> : <Icon size={14} />}
                    </span>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: 12.5, fontWeight: 700, color: isActive ? 'var(--ces-gold-700)' : 'var(--ces-ink)', margin: 0 }}>
                        {s.label}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--ces-mute2)', margin: 0 }}>
                        Addım {i + 1}/{STEPS.length}
                      </p>
                    </div>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div
                      style={{
                        flex: 1, height: 1, margin: '0 10px',
                        background: i < step ? 'var(--ces-ok)' : 'var(--ces-line)',
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div className="ces-m-body" style={{ paddingTop: 16 }}>
          {step === 0 && (
            <div>
              <p className="ces-sec-label" style={{ marginBottom: 14 }}>Müştəri məlumatı</p>

              <div style={{ position: 'relative' }}>
                <Field label="Şirkət adı" required error={errors.companyName}>
                  <div className={clsx(inputWrap('companyName'), 'has-icon')} style={{ paddingRight: 12 }}>
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      placeholder="Şirkət adı yazın və ya bazadan seçin..."
                      autoFocus
                    />
                    <Search size={15} style={{ color: 'var(--ces-mute2)' }} />
                  </div>
                </Field>
                {customerResults.length > 0 && (
                  <div
                    style={{
                      position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0,
                      marginTop: 2, background: 'var(--ces-surface)',
                      border: '1px solid var(--ces-line)', borderRadius: 11,
                      boxShadow: 'var(--ces-shadow-lg)', overflow: 'hidden',
                    }}
                  >
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        style={{
                          width: '100%', textAlign: 'left',
                          padding: '10px 14px', fontSize: 13.5,
                          background: 'transparent', border: 0, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: 12,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ces-gold-50)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--ces-ink)' }}>{c.companyName}</span>
                        {c.voen && <span className="mono" style={{ fontSize: 11.5, color: 'var(--ces-muted)' }}>VÖEN: {c.voen}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <Field label="Əlaqə şəxsi" required error={errors.contactPerson}>
                  <div className={inputWrap('contactPerson')}>
                    <input value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} placeholder="Ad Soyad" />
                  </div>
                </Field>
                <Field label="Əlaqə nömrəsi" required error={errors.phoneLocal}>
                  <div className={inputWrap('phoneLocal')} style={{ padding: '0 8px 0 4px' }}>
                    <select
                      value={form.phonePrefix}
                      onChange={(e) => set('phonePrefix', e.target.value)}
                      style={{
                        background: 'transparent', border: 0, outline: 0,
                        fontSize: 13.5, padding: '11px 4px 11px 8px',
                        fontFamily: 'inherit', cursor: 'pointer',
                        color: 'var(--ces-ink)', flex: 'none',
                      }}
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                      ))}
                    </select>
                    <input
                      className="mono"
                      type="tel"
                      inputMode="numeric"
                      value={form.phoneLocal}
                      onChange={(e) => set('phoneLocal', onlyDigits(e.target.value))}
                      onKeyDown={digitKeyDown}
                      onPaste={makePasteHandler(onlyDigits)}
                      placeholder="501234567"
                    />
                  </div>
                </Field>
              </div>

              {form.customerId && (
                <div className="ces-alert" style={{ marginTop: 8, borderLeftColor: 'var(--ces-ok)', background: 'var(--ces-ok-100)' }}>
                  <div className="ces-al-ic" style={{ background: '#e8fbe5', color: 'var(--ces-ok)' }}>
                    <Check size={16} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ces-ok)' }}>Müştəri bazadan seçildi</span>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="ces-sec-label" style={{ marginBottom: 14 }}>Layihə məlumatı</p>

              <Field label="Layihə adı" required error={errors.projectName}>
                <div className={inputWrap('projectName')}>
                  <input value={form.projectName} onChange={(e) => set('projectName', e.target.value)} placeholder="Layihənin adı" autoFocus />
                </div>
              </Field>

              <Field label="Bölgə" required error={errors.region}>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <ComboInput category="REGION" value={form.region} onChange={(v) => set('region', v)} placeholder="Bakı, Sumqayıt..." />
                  </div>
                  <button
                    type="button"
                    onClick={() => setMapOpen(true)}
                    className="ces-btn ces-btn-icon ces-btn-outline"
                    title="Xəritədən seç"
                  >
                    <MapPin size={16} />
                  </button>
                </div>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <Field label="Sorğu tarixi" required error={errors.requestDate}>
                  <div className={inputWrap('requestDate')}>
                    <DateInput
                      value={form.requestDate}
                      onChange={(e) => set('requestDate', e.target.value)}
                      style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 14, padding: '11px 0', width: '100%', fontFamily: 'inherit' }}
                    />
                  </div>
                </Field>
                <Field label="Layihə tipi" required error={errors.projectType}>
                  <select
                    value={form.projectType}
                    onChange={(e) => set('projectType', e.target.value)}
                    className={clsx('ces-select', errors.projectType && 'is-error')}
                    style={errors.projectType ? { borderColor: 'var(--ces-danger)' } : undefined}
                  >
                    <option value="">Seçin</option>
                    {PROJECT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Ödəniş növü" required error={errors.paymentMethod}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {PAYMENT_METHODS.map((m) => {
                    const active = form.paymentMethod === m.value
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => set('paymentMethod', m.value)}
                        className={clsx('ces-btn', active ? 'ces-btn-primary' : 'ces-btn-outline')}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        {active && <Check size={14} />}
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <label
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: 'pointer', padding: '14px 16px',
                  border: '1px solid var(--ces-line)', borderRadius: 12,
                  background: form.transportationRequired ? 'var(--ces-gold-50)' : 'var(--ces-surface)',
                  borderColor: form.transportationRequired ? 'var(--ces-gold)' : 'var(--ces-line)',
                  transition: 'background .15s, border-color .15s',
                  marginTop: 12,
                }}
              >
                <span className="ces-chk" style={{ pointerEvents: 'none' }}>
                  <input
                    type="checkbox"
                    checked={form.transportationRequired}
                    onChange={(e) => set('transportationRequired', e.target.checked)}
                  />
                  <span className="ces-cb"></span>
                </span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ces-ink)', margin: 0 }}>Daşınma tələb olunur</p>
                  <p style={{ fontSize: 11.5, color: 'var(--ces-muted)', margin: 0 }}>Qiymət koordinator tərəfindən təyin edilir</p>
                </div>
              </label>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="ces-sec-label" style={{ marginBottom: 14 }}>Texniki parametrlər</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {form.params.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <ComboInput
                        category="TECH_PARAM"
                        value={p.paramKey}
                        onChange={(v) => setParamField(i, 'paramKey', v)}
                        placeholder="Parametr adı"
                      />
                      {errors[`paramKey_${i}`] && (
                        <p className="ces-err" style={{ marginTop: 4 }}>{errors[`paramKey_${i}`]}</p>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={clsx('ces-input', errors[`param_${i}`] && 'is-error')}>
                        <input
                          value={p.paramValue}
                          onChange={(e) => setParamField(i, 'paramValue', e.target.value)}
                          placeholder="Rəqəm daxil edin"
                          className="mono"
                        />
                      </div>
                      {errors[`param_${i}`] && (
                        <p className="ces-err" style={{ marginTop: 4 }}>{errors[`param_${i}`]}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeParam(i)}
                      className="ces-row-act danger"
                      style={{ marginTop: 6 }}
                      title="Sil"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addParam}
                  className="ces-btn ces-btn-sm ces-btn-outline"
                  style={{ alignSelf: 'flex-start', marginTop: 4 }}
                >
                  <Plus size={14} />
                  Parametr əlavə et
                </button>
              </div>

              <p className="ces-sec-label" style={{ marginTop: 18, marginBottom: 14 }}>Qeyd və xülasə</p>
              <Field label="Qeyd" error={errors.notes}>
                <div className={clsx('ces-input', errors.notes && 'is-error')} style={{ alignItems: 'flex-start', paddingTop: 4, paddingBottom: 4 }}>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    placeholder="Əlavə qeydlər..."
                  />
                </div>
              </Field>

              <div className="ces-card" style={{ padding: 18, marginTop: 4 }}>
                <h4>Xülasə</h4>
                <div className="ces-card-row"><span>Şirkət</span><b>{form.companyName || '—'}</b></div>
                <div className="ces-card-row"><span>Əlaqə</span><b>{form.contactPerson || '—'}</b></div>
                <div className="ces-card-row"><span>Layihə</span><b>{form.projectName || '—'}</b></div>
                <div className="ces-card-row"><span>Bölgə</span><b>{form.region || '—'}</b></div>
                <div className="ces-card-row"><span>Tarix</span><b className="mono">{form.requestDate || '—'}</b></div>
                <div className="ces-card-row">
                  <span>Ödəniş növü</span>
                  <b>{PAYMENT_METHODS.find((m) => m.value === form.paymentMethod)?.label || '—'}</b>
                </div>
                <div className="ces-card-row">
                  <span>Daşınma</span>
                  <b style={{ color: form.transportationRequired ? 'var(--ces-ok)' : 'var(--ces-muted)' }}>
                    {form.transportationRequired ? 'Bəli' : 'Xeyr'}
                  </b>
                </div>
                {form.params.filter(p => p.paramKey).length > 0 && (
                  <div className="ces-card-row">
                    <span>Parametrlər</span>
                    <b>{form.params.filter(p => p.paramKey).length} ədəd</b>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ces-m-foot">
          {step > 0 && (
            <button type="button" onClick={goBack} className="ces-btn ces-btn-ghost">
              <ChevronLeft size={14} />
              Geri
            </button>
          )}
          <div className="flex-1" />
          {isDirty && <span style={{ fontSize: 12, color: 'var(--ces-warn)', fontWeight: 600 }}>Dəyişikliklər var</span>}
          <button type="button" onClick={handleClose} className="ces-btn ces-btn-ghost">
            Ləğv et
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={goNext} className="ces-btn ces-btn-primary">
              Davam et
              <ChevronRight size={14} />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={loading} className="ces-btn ces-btn-primary">
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editing ? 'Yadda saxla' : 'Sorğu yarat'}
              <Check size={14} />
            </button>
          )}
        </div>
      </div>
      {mapOpen && (
        <Suspense fallback={null}>
          <MapPickerModal
            onClose={() => setMapOpen(false)}
            onSelect={(region) => set('region', region)}
          />
        </Suspense>
      )}
    </div>
  )
}
