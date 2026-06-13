import { useState, useEffect, useMemo } from 'react'
import { X, Settings, Pencil, Plus } from 'lucide-react'
import { configApi } from '../../api/config'
import toast from 'react-hot-toast'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { v } from '../../utils/validation'
import { clsx } from 'clsx'
import { CATEGORY_LABELS } from './ConfigPage'

const EMPTY = { category: '', key: '', value: '', description: '', sortOrder: 0, active: true }

function Field({ label, required, error, hint, children }) {
  return (
    <div className="ces-field">
      <label>{label} {required && <span className="req">*</span>}</label>
      {children}
      {error && <span className="ces-err">{error}</span>}
      {!error && hint && <span className="ces-hint">{hint}</span>}
    </div>
  )
}

export default function ConfigItemModal({ editing, categories, currentCategory, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY)
  const [initialForm, setInitialForm] = useState(null)
  const [loading, setLoading] = useState(false)
  const [customCategory, setCustomCategory] = useState(false)
  const [errors, setErrors] = useState({})

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

  const set = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const validate = () => {
    const errs = {}
    const e = (field, ...rules) => { const err = v.chain(form[field] || '', ...rules); if (err) errs[field] = err }
    e('category',
      (val) => v.required(val),
      (val) => v.minLen(val, 2),
      (val) => v.realContent(val),
      (val) => v.maxLen(val, 50))
    e('key',
      (val) => v.required(val),
      (val) => v.minLen(val, 1),
      (val) => v.realContent(val),
      (val) => v.maxLen(val, 100))
    if (form.value?.trim()) {
      const valErr = v.maxLen(form.value, 200)
      if (valErr) errs.value = valErr
    }
    if (form.description?.trim()) {
      const descErr = v.maxLen(form.description, 500)
      if (descErr) errs.description = descErr
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

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
    <div className="ces-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="ces-modal" style={{ maxWidth: 560 }}>
        <div className="ces-m-head">
          <div className={clsx('ces-m-ic', editing ? 'gold' : '')}>
            {editing ? <Pencil size={20} /> : <Settings size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3>{editing ? 'Elementi redaktə et' : 'Yeni element'}</h3>
            <p>
              {editing
                ? `${CATEGORY_LABELS[editing.category] || editing.category} → ${editing.key}`
                : 'Kateqoriya və açar məlumatlarını doldurun'}
            </p>
          </div>
          <button onClick={handleClose} className="ces-modal-x" type="button" aria-label="Bağla">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="contents">
          <div className="ces-m-body">
            {/* Category */}
            <Field label="Kateqoriya" required error={errors.category}>
              {!customCategory && categories.length > 0 ? (
                <div className="flex gap-2">
                  <select
                    value={form.category}
                    onChange={(e) => set('category', e.target.value)}
                    className={clsx('ces-select flex-1', errors.category && 'is-error')}
                  >
                    <option value="">Seçin</option>
                    {categories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setCustomCategory(true); set('category', '') }}
                    className="ces-btn ces-btn-outline ces-btn-sm"
                  >
                    <Plus size={14} />
                    Yeni
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className={clsx('ces-input flex-1', errors.category && 'is-error')}>
                    <input
                      type="text"
                      value={form.category}
                      onChange={(e) => set('category', e.target.value.toUpperCase())}
                      placeholder="Məs: EQUIPMENT_COLOR"
                      className="mono"
                    />
                  </div>
                  {categories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCustomCategory(false)}
                      className="ces-btn ces-btn-outline ces-btn-sm"
                    >
                      Siyahı
                    </button>
                  )}
                </div>
              )}
            </Field>

            {/* Key */}
            <Field label="Açar / Ad" required error={errors.key}>
              <div className={clsx('ces-input', errors.key && 'is-error')}>
                <input
                  type="text"
                  value={form.key}
                  onChange={(e) => set('key', e.target.value)}
                  placeholder="Məs: Komatsu"
                />
              </div>
            </Field>

            {/* Value */}
            <Field label="Dəyər / Etiket" error={errors.value} hint="Görünən ad (ixtiyari)">
              <div className={clsx('ces-input', errors.value && 'is-error')}>
                <input
                  type="text"
                  value={form.value}
                  onChange={(e) => set('value', e.target.value)}
                  placeholder="Display adı"
                />
              </div>
            </Field>

            {/* Description */}
            <Field label="Təsvir" error={errors.description}>
              <div className={clsx('ces-input', errors.description && 'is-error')} style={{ alignItems: 'flex-start', paddingTop: 4, paddingBottom: 4 }}>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={2}
                  placeholder="Əlavə məlumat..."
                />
              </div>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
              <Field label="Sıra">
                <div className="ces-input">
                  <input
                    type="number"
                    min="0"
                    value={form.sortOrder}
                    onChange={(e) => set('sortOrder', parseInt(e.target.value) || 0)}
                    className="mono"
                  />
                </div>
              </Field>

              <div className="ces-field flex items-end">
                <label className="ces-chk" style={{ marginBottom: 12 }}>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => set('active', e.target.checked)}
                  />
                  <span className="ces-cb" />
                  <span>Aktivdir</span>
                </label>
              </div>
            </div>
          </div>

          <div className="ces-m-foot">
            {isDirty && (
              <span className="text-xs font-semibold mr-auto" style={{ color: 'var(--ces-gold-700)' }}>
                ● Dəyişikliklər var
              </span>
            )}
            <button type="button" onClick={handleClose} className="ces-btn ces-btn-ghost">
              Ləğv et
            </button>
            <button type="submit" disabled={loading} className="ces-btn ces-btn-primary">
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editing ? 'Yadda saxla' : 'Yarat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
