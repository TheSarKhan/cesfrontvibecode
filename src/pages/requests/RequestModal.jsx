import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react'
import { X, Plus, Trash2, Search, MapPin, ChevronRight, ChevronLeft, Check, Building2, FolderKanban, Settings2 } from 'lucide-react'
import { requestsApi } from '../../api/requests'
import { customersApi } from '../../api/customers'
import { inputCls, labelCls, PROJECT_TYPES } from '../../constants/requests'
import ComboInput from '../../components/common/ComboInput'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const MapPickerModal = lazy(() => import('../../components/common/MapPickerModal'))

const EMPTY = {
  customerId: null,
  companyName: '',
  contactPerson: '',
  contactPhone: '',
  projectName: '',
  region: '',
  requestDate: new Date().toISOString().slice(0, 10),
  projectType: '',
  dayCount: '',
  transportationRequired: false,
  params: [],
  notes: '',
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
  const [searchLoading, setSearchLoading] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [visited, setVisited] = useState([0])
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
        contactPhone: editing.contactPhone || '',
        projectName: editing.projectName || '',
        region: editing.region || '',
        requestDate: editing.requestDate || '',
        projectType: editing.projectType || '',
        dayCount: editing.dayCount ?? '',
        transportationRequired: editing.transportationRequired || false,
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

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  // Müştəri axtarışı
  const handleCustomerSearch = (val) => {
    setCustomerSearch(val)
    set('companyName', val)
    set('customerId', null)
    clearTimeout(searchTimeout.current)
    if (!val.trim()) { setCustomerResults([]); return }
    searchTimeout.current = setTimeout(() => {
      setSearchLoading(true)
      const q = val.toLowerCase()
      const results = customers.filter((c) =>
        c.companyName?.toLowerCase().includes(q) ||
        c.voen?.toLowerCase().includes(q)
      ).slice(0, 5)
      setCustomerResults(results)
      setSearchLoading(false)
    }, 200)
  }

  const selectCustomer = (c) => {
    setCustomerSearch(c.companyName)
    setCustomerResults([])
    setForm((prev) => ({
      ...prev,
      customerId: c.id,
      companyName: c.companyName,
      contactPerson: c.officeContactPerson || c.supplierPerson || '',
      contactPhone: c.officeContactPhone || c.supplierPhone || '',
    }))
  }

  // Texniki parametrlər
  const addParam = () => setForm((p) => ({ ...p, params: [...p.params, { paramKey: '', paramValue: '' }] }))
  const removeParam = (i) => setForm((p) => ({ ...p, params: p.params.filter((_, idx) => idx !== i) }))
  const setParamField = (i, field, val) => setForm((p) => ({
    ...p,
    params: p.params.map((param, idx) => idx === i ? { ...param, [field]: val } : param),
  }))

  const goNext = () => {
    if (step === 0 && !form.companyName.trim()) {
      toast.error('Şirkət adı tələb olunur')
      return
    }
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
    if (!form.companyName.trim()) return toast.error('Şirkət adı tələb olunur')

    const payload = {
      ...form,
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
      toast.error(err?.response?.data?.message || 'Əməliyyat uğursuz oldu')
    } finally {
      setLoading(false)
    }
  }

  // Step completion indicators
  const stepComplete = [
    !!form.companyName.trim(),
    !!(form.projectName || form.region || form.projectType),
    true, // details step is always "ok" (optional)
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {editing ? `Sorğu #${editing.requestCode || editing.id}` : 'Yeni sorğu yarat'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {editing ? 'Məlumatları redaktə et' : STEPS[step].label + ' məlumatlarını doldurun'}
            </p>
          </div>
          <button onClick={handleClose} className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors shrink-0">
            <X size={14} className="text-white" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const isActive = step === i
              const isCompleted = stepComplete[i] && visited.includes(i) && i < step
              const isClickable = visited.includes(i) || i <= step
              return (
                <div key={s.key} className="flex items-center flex-1 last:flex-none">
                  <button
                    type="button"
                    onClick={() => goToStep(i)}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2 rounded-xl transition-all',
                      isActive && 'bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-200 dark:ring-amber-700',
                      !isActive && isClickable && 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer',
                      !isActive && !isClickable && 'opacity-40 cursor-default',
                    )}
                    disabled={!isClickable}
                  >
                    <div className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0',
                      isActive && 'bg-amber-600 text-white shadow-md shadow-amber-200 dark:shadow-amber-900',
                      isCompleted && !isActive && 'bg-green-500 text-white',
                      !isActive && !isCompleted && 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500',
                    )}>
                      {isCompleted && !isActive ? <Check size={14} /> : <Icon size={14} />}
                    </div>
                    <div className="text-left hidden sm:block">
                      <p className={clsx(
                        'text-xs font-semibold',
                        isActive ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400',
                      )}>{s.label}</p>
                      <p className="text-[10px] text-gray-400">Addım {i + 1}/{STEPS.length}</p>
                    </div>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={clsx(
                      'flex-1 h-px mx-2 transition-colors',
                      i < step ? 'bg-green-300 dark:bg-green-700' : 'bg-gray-200 dark:bg-gray-700',
                    )} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-4 space-y-4 max-h-[55vh] overflow-y-auto scrollbar-thin">

          {/* Step 1: Müştəri */}
          {step === 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="relative">
                <label className={labelCls}>Şirkət adı <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => handleCustomerSearch(e.target.value)}
                    placeholder="Şirkət adı yazın və ya axtarın..."
                    className={inputCls}
                    autoFocus
                  />
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                {customerResults.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        <span className="font-medium text-gray-800 dark:text-gray-200">{c.companyName}</span>
                        {c.voen && <span className="text-xs text-gray-400 ml-2">VÖEN: {c.voen}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Əlaqə şəxsi</label>
                  <input type="text" value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} placeholder="Ad Soyad" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Əlaqə nömrəsi</label>
                  <input type="text" value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} placeholder="+994501234567" className={inputCls} />
                </div>
              </div>

              {form.customerId && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <Check size={14} className="text-green-500 shrink-0" />
                  <span className="text-xs text-green-700 dark:text-green-400">Müştəri bazadan seçildi</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Layihə */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div>
                <label className={labelCls}>Layihə adı</label>
                <input type="text" value={form.projectName} onChange={(e) => set('projectName', e.target.value)} placeholder="Layihənin adı" className={inputCls} autoFocus />
              </div>

              <div>
                <label className={labelCls}>Bölgə</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <ComboInput category="REGION" value={form.region} onChange={(v) => set('region', v)} placeholder="Bakı, Sumqayıt..." />
                  </div>
                  <button
                    type="button"
                    onClick={() => setMapOpen(true)}
                    className="px-2.5 py-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
                    title="Xəritədən seç"
                  >
                    <MapPin size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Sorğu tarixi</label>
                  <input type="date" value={form.requestDate} onChange={(e) => set('requestDate', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Layihə tipi</label>
                  <select value={form.projectType} onChange={(e) => set('projectType', e.target.value)} className={inputCls}>
                    <option value="">Seçin</option>
                    {PROJECT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <input
                  type="checkbox"
                  checked={form.transportationRequired}
                  onChange={(e) => set('transportationRequired', e.target.checked)}
                  className="accent-amber-600 w-4 h-4"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Daşınma tələb olunur</span>
                  <p className="text-[10px] text-gray-400">Qiymət koordinator tərəfindən təyin edilir</p>
                </div>
              </label>
            </div>
          )}

          {/* Step 3: Əlavələr */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              {/* Texniki parametrlər */}
              <div>
                <label className={labelCls}>Texniki parametrlər</label>
                <div className="space-y-2 mt-1">
                  {form.params.map((p, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <ComboInput
                          category="TECH_PARAM"
                          value={p.paramKey}
                          onChange={(v) => setParamField(i, 'paramKey', v)}
                          placeholder="Parametr adı"
                        />
                      </div>
                      <input
                        type="text"
                        value={p.paramValue}
                        onChange={(e) => setParamField(i, 'paramValue', e.target.value)}
                        placeholder="Dəyər"
                        className={clsx(inputCls, 'flex-1')}
                      />
                      <button type="button" onClick={() => removeParam(i)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addParam}
                    className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"
                  >
                    <Plus size={14} />
                    Parametr əlavə et
                  </button>
                </div>
              </div>

              {/* Qeyd */}
              <div>
                <label className={labelCls}>Qeyd</label>
                <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} placeholder="Əlavə qeydlər..." className={`${inputCls} resize-none`} />
              </div>

              {/* Summary */}
              <div className="bg-gray-50 dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Xülasə</p>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">Şirkət</span>
                    <span className="text-gray-700 dark:text-gray-300 text-xs font-medium">{form.companyName || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">Əlaqə</span>
                    <span className="text-gray-700 dark:text-gray-300 text-xs font-medium">{form.contactPerson || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">Layihə</span>
                    <span className="text-gray-700 dark:text-gray-300 text-xs font-medium">{form.projectName || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">Bölgə</span>
                    <span className="text-gray-700 dark:text-gray-300 text-xs font-medium">{form.region || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">Tarix</span>
                    <span className="text-gray-700 dark:text-gray-300 text-xs font-medium">{form.requestDate || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs">Daşınma</span>
                    <span className={clsx('text-xs font-medium', form.transportationRequired ? 'text-green-600' : 'text-gray-400')}>
                      {form.transportationRequired ? 'Bəli' : 'Xeyr'}
                    </span>
                  </div>
                  {form.params.filter(p => p.paramKey).length > 0 && (
                    <div className="flex justify-between col-span-2">
                      <span className="text-gray-400 text-xs">Parametrlər</span>
                      <span className="text-gray-700 dark:text-gray-300 text-xs font-medium">
                        {form.params.filter(p => p.paramKey).length} ədəd
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          {step > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft size={14} />
              Geri
            </button>
          )}

          <div className="flex-1" />

          {isDirty && <span className="flex items-center text-xs text-amber-500">Dəyişikliklər var</span>}

          <button type="button" onClick={handleClose} className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            Ləğv et
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              Davam et
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
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
