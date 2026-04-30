import { useState, useEffect } from 'react'
import { X, RefreshCw } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import { configApi } from '../../api/config'
import toast from 'react-hot-toast'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500'
const selectCls = inputCls

const FREQ_OPTIONS = [
  { value: 'MONTHLY',   label: 'Aylıq' },
  { value: 'QUARTERLY', label: 'Rüblük' },
  { value: 'ANNUAL',    label: 'İllik' },
]

const EMPTY = {
  name: '', categoryKey: '', categoryLabel: '', sourceKey: '', sourceLabel: '',
  amount: '', frequency: 'MONTHLY', dayOfMonth: '', notes: '', active: true,
}

export default function RecurringExpenseModal({ editing, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [categories, setCategories] = useState([])   // EXPENSE_CATEGORY items
  const [allSources, setAllSources] = useState([])   // EXPENSE_SOURCE items
  const [loadingCfg, setLoadingCfg] = useState(true)

  useEffect(() => {
    Promise.all([
      configApi.getActiveByCategory('EXPENSE_CATEGORY'),
      configApi.getActiveByCategory('EXPENSE_SOURCE'),
    ]).then(([catRes, srcRes]) => {
      setCategories(catRes.data?.data || [])
      setAllSources(srcRes.data?.data || [])
    }).catch(() => {}).finally(() => setLoadingCfg(false))
  }, [])

  useEffect(() => {
    if (editing) {
      setForm({
        name:          editing.name          || '',
        categoryKey:   editing.categoryKey   || '',
        categoryLabel: editing.categoryLabel || '',
        sourceKey:     editing.sourceKey     || '',
        sourceLabel:   editing.sourceLabel   || '',
        amount:        editing.amount > 0 ? String(editing.amount) : '',
        frequency:     editing.frequency     || 'MONTHLY',
        dayOfMonth:    editing.dayOfMonth    ? String(editing.dayOfMonth) : '',
        notes:         editing.notes         || '',
        active:        editing.active !== false,
      })
    } else {
      setForm(EMPTY)
    }
  }, [editing])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  // Sources filtered by selected category key
  const filteredSources = allSources.filter(s =>
    !form.categoryKey || s.description === form.categoryKey
  )

  const handleCategoryChange = (catKey) => {
    const catItem = categories.find(c => c.key === catKey)
    set('categoryKey', catKey)
    set('categoryLabel', catItem?.value || catItem?.key || catKey)
    // Reset source when category changes
    set('sourceKey', '')
    set('sourceLabel', '')
  }

  const handleSourceChange = (srcKey) => {
    const srcItem = allSources.find(s => s.key === srcKey)
    set('sourceKey', srcKey)
    set('sourceLabel', srcItem?.value || srcItem?.key || srcKey)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim())       return toast.error('Ad daxil edin')
    if (!form.categoryKey)       return toast.error('Kateqoriya seçin')
    if (!form.sourceKey)         return toast.error('Mənbə seçin')

    setSaving(true)
    try {
      const payload = {
        name:          form.name.trim(),
        categoryKey:   form.categoryKey,
        categoryLabel: form.categoryLabel,
        sourceKey:     form.sourceKey,
        sourceLabel:   form.sourceLabel,
        amount:        form.amount ? parseFloat(form.amount) : 0,
        frequency:     form.frequency,
        dayOfMonth:    form.dayOfMonth ? parseInt(form.dayOfMonth) : null,
        notes:         form.notes || null,
        active:        form.active,
      }
      if (editing) {
        await accountingApi.updateRecurring(editing.id, payload)
        toast.success('Daimi ödəniş yeniləndi')
      } else {
        await accountingApi.createRecurring(payload)
        toast.success('Daimi ödəniş yaradıldı')
      }
      onSaved()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <RefreshCw size={15} className="text-amber-500" />
              {editing ? 'Daimi Ödənişi Redaktə Et' : 'Yeni Daimi Ödəniş'}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Hər dövr üçün qaimə şablonu</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <X size={14} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Ad <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Məs: Azercell Korporativ İnternet"
              className={inputCls}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Kateqoriya <span className="text-red-500">*</span>
            </label>
            {loadingCfg ? (
              <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
            ) : categories.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                Kateqoriya tapılmadı. Konfiqurasiya panelindən <strong>EXPENSE_CATEGORY</strong> əlavə edin.
              </p>
            ) : (
              <select
                value={form.categoryKey}
                onChange={e => handleCategoryChange(e.target.value)}
                className={selectCls}
              >
                <option value="">Kateqoriya seçin</option>
                {categories.map(c => (
                  <option key={c.id} value={c.key}>{c.value || c.key}</option>
                ))}
              </select>
            )}
          </div>

          {/* Source */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Mənbə <span className="text-red-500">*</span>
            </label>
            {loadingCfg ? (
              <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
            ) : filteredSources.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                {form.categoryKey
                  ? `Bu kateqoriya üçün mənbə tapılmadı. Konfiqurasiya panelindən EXPENSE_SOURCE əlavə edin (description: "${form.categoryKey}").`
                  : 'Əvvəlcə kateqoriya seçin.'}
              </p>
            ) : (
              <select
                value={form.sourceKey}
                onChange={e => handleSourceChange(e.target.value)}
                disabled={!form.categoryKey}
                className={selectCls}
              >
                <option value="">Mənbə seçin</option>
                {filteredSources.map(s => (
                  <option key={s.id} value={s.key}>{s.value || s.key}</option>
                ))}
              </select>
            )}
          </div>

          {/* Amount + Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Məbləğ <span className="text-gray-400 font-normal">(boş = dəyişkən)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="0.00"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Tezlik <span className="text-red-500">*</span>
              </label>
              <select value={form.frequency} onChange={e => set('frequency', e.target.value)} className={selectCls}>
                {FREQ_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          {/* Day of Month + Active */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Ödəniş günü <span className="text-gray-400 font-normal">(1-31)</span>
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={form.dayOfMonth}
                onChange={e => set('dayOfMonth', e.target.value)}
                placeholder="—"
                className={inputCls}
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => set('active', e.target.checked)}
                  className="accent-amber-600 w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Aktivdir</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Qeyd</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="Əlavə məlumat..."
              className={`${inputCls} resize-none`}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-2 px-6 pb-5">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {editing ? 'Yadda Saxla' : 'Yarat'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Ləğv et
          </button>
        </div>
      </div>
    </div>
  )
}
