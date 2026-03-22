import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Plus, Trash2, Search } from 'lucide-react'
import { requestsApi } from '../../api/requests'
import { customersApi } from '../../api/customers'
import { inputCls, labelCls, sectionCls, PROJECT_TYPES } from '../../constants/requests'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import PrintButton from '../../components/common/PrintButton'

const EMPTY = {
  customerId: null,
  companyName: '',
  contactPerson: '',
  contactPhone: '',
  projectName: '',
  region: '',
  requestDate: '',
  projectType: '',
  dayCount: '',
  transportationRequired: false,
  params: [],
  notes: '',
}

export default function RequestModal({ editing, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY)
  const [initialForm, setInitialForm] = useState(null)
  const [loading, setLoading] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState([])
  const [customerResults, setCustomerResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
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
    } else {
      setForm(EMPTY)
      setInitialForm(JSON.parse(JSON.stringify(EMPTY)))
      setCustomerSearch('')
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
  const setParam = (i, field, val) => setForm((p) => ({
    ...p,
    params: p.params.map((param, idx) => idx === i ? { ...param, [field]: val } : param),
  }))

  const handleSubmit = async (e) => {
    e.preventDefault()
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {editing ? `Sorğu #${editing.requestCode || editing.id}` : 'Yeni sorğu yarat'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{editing ? 'Məlumatları redaktə et' : 'Bütün lazımi məlumatları doldurun'}</p>
          </div>
          <button onClick={handleClose} className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors shrink-0">
            <X size={14} className="text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto scrollbar-thin">

            {/* Müştəri axtarışı */}
            <p className={sectionCls}>Müştəri məlumatları</p>

            <div className="relative">
              <label className={labelCls}>Şirkət adı <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  placeholder="Şirkət adı yazın və ya axtarın..."
                  className={inputCls}
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

            {/* Layihə */}
            <p className={sectionCls}>Layihə məlumatları</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Layihə adı</label>
                <input type="text" value={form.projectName} onChange={(e) => set('projectName', e.target.value)} placeholder="Layihənin adı" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Bölgə</label>
                <input type="text" value={form.region} onChange={(e) => set('region', e.target.value)} placeholder="Bakı, Sumqayıt..." className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Sorğu tarixi</label>
                <input type="date" value={form.requestDate} onChange={(e) => set('requestDate', e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Layihə tipi</label>
                <select value={form.projectType} onChange={(e) => set('projectType', e.target.value)} className={inputCls}>
                  <option value="">Seçin</option>
                  {PROJECT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{form.projectType === 'MONTHLY' ? 'Ay sayı' : 'Gün sayı'}</label>
                <input type="number" min="1" value={form.dayCount} onChange={(e) => set('dayCount', e.target.value)} placeholder="30" className={inputCls} />
              </div>
            </div>

            {/* Daşınma */}
            <p className={sectionCls}>Daşınma</p>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.transportationRequired}
                onChange={(e) => set('transportationRequired', e.target.checked)}
                className="accent-amber-600 w-4 h-4"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Daşınma tələb olunur (qiymət koordinator tərəfindən təyin edilir)</span>
            </label>

            {/* Texniki parametrlər */}
            <p className={sectionCls}>Texniki parametrlər</p>

            <div className="space-y-2">
              {form.params.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={p.paramKey}
                    onChange={(e) => setParam(i, 'paramKey', e.target.value)}
                    placeholder="Parametr adı"
                    className={clsx(inputCls, 'flex-1')}
                  />
                  <input
                    type="text"
                    value={p.paramValue}
                    onChange={(e) => setParam(i, 'paramValue', e.target.value)}
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

            {/* Qeyd */}
            <div>
              <label className={labelCls}>Qeyd</label>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Əlavə qeydlər..." className={`${inputCls} resize-none`} />
            </div>
          </div>

          <div className="flex gap-3 p-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editing ? 'Yadda saxla' : 'Yarat'}
            </button>
            <button type="button" onClick={handleClose} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              Ləğv et
            </button>
            {isDirty && <span className="flex items-center text-xs text-amber-500 ml-auto">Dəyişikliklər var</span>}
            <PrintButton className="ml-auto" />
          </div>
        </form>
      </div>
    </div>
  )
}
