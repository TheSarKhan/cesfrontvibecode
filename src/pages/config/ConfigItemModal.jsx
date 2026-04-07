import { useState, useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { configApi } from '../../api/config'
import toast from 'react-hot-toast'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'

const EMPTY = { category: '', key: '', value: '', description: '', sortOrder: 0, active: true }

export default function ConfigItemModal({ editing, categories, currentCategory, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY)
  const [initialForm, setInitialForm] = useState(null)
  const [loading, setLoading] = useState(false)
  const [customCategory, setCustomCategory] = useState(false)

  const isDirty = useMemo(() => {
    if (!initialForm) return false
    return JSON.stringify(form) !== JSON.stringify(initialForm)
  }, [form, initialForm])

  const handleClose = () => {
    if (isDirty && !window.confirm('Saxlanılmamış dəyişikliklər var. Çıxmaq istəyirsiniz?')) return
    onClose()
  }

  useEscapeKey(handleClose)

  useEffect(() => {
    if (editing) {
      const f = {
        category: editing.category || '',
        key: editing.key || '',
        value: editing.value || '',
        description: editing.description || '',
        sortOrder: editing.sortOrder ?? 0,
        active: editing.active ?? true,
      }
      setForm(f)
      setInitialForm(JSON.parse(JSON.stringify(f)))
    } else {
      const f = { ...EMPTY, category: currentCategory || '' }
      setForm(f)
      setInitialForm(JSON.parse(JSON.stringify(f)))
    }
  }, [editing, currentCategory])

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.category.trim()) return toast.error('Kateqoriya tələb olunur')
    if (!form.key.trim()) return toast.error('Açar / Ad tələb olunur')

    setLoading(true)
    try {
      if (editing) {
        await configApi.update(editing.id, form)
        toast.success('Element yeniləndi')
      } else {
        await configApi.create(form)
        toast.success('Element yaradıldı')
      }
      onSaved()
    } catch {
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden">
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {editing ? 'Elementi redaktə et' : 'Yeni element'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {editing ? `${editing.category} → ${editing.key}` : 'Kateqoriya və açar məlumatlarını doldurun'}
            </p>
          </div>
          <button onClick={handleClose} className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors shrink-0">
            <X size={14} className="text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto scrollbar-thin">
            {/* Category */}
            <div>
              <label className={labelCls}>
                Kateqoriya <span className="text-red-500">*</span>
              </label>
              {!customCategory && categories.length > 0 ? (
                <div className="flex gap-2">
                  <select
                    value={form.category}
                    onChange={(e) => set('category', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Seçin</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setCustomCategory(true); set('category', '') }}
                    className="px-3 py-2 text-xs font-medium text-amber-600 hover:text-amber-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
                  >
                    + Yeni
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => set('category', e.target.value.toUpperCase())}
                    placeholder="Məsələn: EQUIPMENT_COLOR"
                    className={inputCls}
                  />
                  {categories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCustomCategory(false)}
                      className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
                    >
                      Siyahı
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Key */}
            <div>
              <label className={labelCls}>Açar / Ad <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.key}
                onChange={(e) => set('key', e.target.value)}
                placeholder="Məsələn: Komatsu"
                className={inputCls}
              />
            </div>

            {/* Value */}
            <div>
              <label className={labelCls}>Dəyər / Etiket</label>
              <input
                type="text"
                value={form.value}
                onChange={(e) => set('value', e.target.value)}
                placeholder="Görünən ad (ixtiyari)"
                className={inputCls}
              />
            </div>

            {/* Description */}
            <div>
              <label className={labelCls}>Təsvir</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={2}
                placeholder="Əlavə məlumat..."
                className={`${inputCls} resize-none`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Sort order */}
              <div>
                <label className={labelCls}>Sıra</label>
                <input
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={(e) => set('sortOrder', parseInt(e.target.value) || 0)}
                  className={inputCls}
                />
              </div>

              {/* Active */}
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => set('active', e.target.checked)}
                    className="accent-amber-600 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Aktivdir</span>
                </label>
              </div>
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
          </div>
        </form>
      </div>
    </div>
  )
}
