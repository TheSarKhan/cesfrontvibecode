import { useState } from 'react'
import { X, Edit3 } from 'lucide-react'
import { requestsApi } from '../../api/requests'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

export default function BulkEditModal({ selectedIds, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [loading, setLoading] = useState(false)
  const [fields, setFields] = useState({ region: false, notes: false })
  const [values, setValues] = useState({ region: '', notes: '' })
  const [errors, setErrors] = useState({})

  const toggleField = (name, checked) => {
    setFields(f => ({ ...f, [name]: checked }))
    if (!checked) setErrors(e => { const n = { ...e }; delete n[name]; return n })
  }

  const setValue = (name, val) => {
    setValues(v => ({ ...v, [name]: val }))
    if (errors[name]) setErrors(e => { const n = { ...e }; delete n[name]; return n })
  }

  const handleSubmit = async () => {
    if (!fields.region && !fields.notes) return toast.error('Ən azı bir sahə seçin')

    const errs = {}
    if (fields.region) {
      if (!values.region.trim()) errs.region = 'Bölgə boş ola bilməz'
      else if (values.region.trim().length < 2) errs.region = 'Minimum 2 simvol olmalıdır'
      else if (values.region.length > 100) errs.region = 'Maksimum 100 simvol ola bilər'
    }
    if (fields.notes) {
      if (!values.notes.trim()) errs.notes = 'Qeyd boş ola bilməz'
      else if (values.notes.length > 500) errs.notes = `Maksimum 500 simvol ola bilər (${values.notes.length}/500)`
    }
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const promises = []
      if (fields.region) promises.push(requestsApi.bulkUpdateRegion(selectedIds, values.region.trim()))
      if (fields.notes) promises.push(requestsApi.bulkUpdateNotes(selectedIds, values.notes.trim()))
      await Promise.all(promises)
      toast.success(`${selectedIds.length} sorğu yeniləndi`)
      onSaved()
    } catch {
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ces-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ces-modal" style={{ maxWidth: 480 }}>
        <div className="ces-m-head">
          <div className="ces-m-ic gold">
            <Edit3 size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3>Toplu redaktə</h3>
            <p>{selectedIds.length} sorğu seçildi</p>
          </div>
          <button onClick={onClose} className="ces-modal-x" type="button" aria-label="Bağla">
            <X size={16} />
          </button>
        </div>

        <div className="ces-m-body">
          <p className="ces-sec-label" style={{ marginBottom: 12 }}>Yenilənəcək sahələr</p>

          {/* Region toggle + input */}
          <div className="ces-field">
            <label
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer', marginBottom: 8, padding: '10px 12px',
                border: '1px solid var(--ces-line)', borderRadius: 11,
                background: fields.region ? 'var(--ces-gold-50)' : 'var(--ces-surface)',
                borderColor: fields.region ? 'var(--ces-gold)' : 'var(--ces-line)',
                transition: 'background .15s, border-color .15s',
              }}
            >
              <span className="ces-chk" style={{ pointerEvents: 'none' }}>
                <input
                  type="checkbox"
                  checked={fields.region}
                  onChange={(e) => toggleField('region', e.target.checked)}
                />
                <span className="ces-cb"></span>
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ces-ink)' }}>Bölgə</span>
            </label>
            {fields.region && (
              <>
                <div className={clsx('ces-input', errors.region && 'is-error')}>
                  <input
                    value={values.region}
                    onChange={(e) => setValue('region', e.target.value)}
                    placeholder="Yeni bölgə..."
                    autoFocus
                  />
                </div>
                {errors.region && <span className="ces-err">{errors.region}</span>}
              </>
            )}
          </div>

          {/* Notes toggle + textarea */}
          <div className="ces-field" style={{ marginBottom: 0 }}>
            <label
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer', marginBottom: 8, padding: '10px 12px',
                border: '1px solid var(--ces-line)', borderRadius: 11,
                background: fields.notes ? 'var(--ces-gold-50)' : 'var(--ces-surface)',
                borderColor: fields.notes ? 'var(--ces-gold)' : 'var(--ces-line)',
                transition: 'background .15s, border-color .15s',
              }}
            >
              <span className="ces-chk" style={{ pointerEvents: 'none' }}>
                <input
                  type="checkbox"
                  checked={fields.notes}
                  onChange={(e) => toggleField('notes', e.target.checked)}
                />
                <span className="ces-cb"></span>
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ces-ink)' }}>Qeyd</span>
            </label>
            {fields.notes && (
              <>
                <div className={clsx('ces-input', errors.notes && 'is-error')} style={{ alignItems: 'flex-start', paddingTop: 4, paddingBottom: 4 }}>
                  <textarea
                    rows={3}
                    value={values.notes}
                    onChange={(e) => setValue('notes', e.target.value)}
                    placeholder="Yeni qeyd..."
                  />
                </div>
                {errors.notes && <span className="ces-err">{errors.notes}</span>}
              </>
            )}
          </div>
        </div>

        <div className="ces-m-foot">
          <button type="button" onClick={onClose} className="ces-btn ces-btn-ghost">
            Ləğv et
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || (!fields.region && !fields.notes)}
            className="ces-btn ces-btn-primary"
          >
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Yenilə
          </button>
        </div>
      </div>
    </div>
  )
}
