import { useState, useRef } from 'react'
import { X, Building2, Pencil } from 'lucide-react'
import { departmentsApi } from '../../api/departments'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { v } from '../../utils/validation'

export default function DepartmentModal({ editing, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState({
    name: editing?.name || '',
    description: editing?.description || '',
  })
  const initialForm = useRef({ name: editing?.name || '', description: editing?.description || '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    const e = (field, ...rules) => { const err = v.chain(form[field] || '', ...rules); if (err) errs[field] = err }
    e('name', v.required, v.minLen(2), v.realContent, v.maxLen(100))
    if (form.description?.trim()) {
      const descErr = v.maxLen(form.description, 500)
      if (descErr) errs.description = descErr
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const set = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    if (editing && JSON.stringify(form) === JSON.stringify(initialForm.current)) {
      toast('Dəyişiklik edilməyib', { icon: 'ℹ️' })
      return
    }
    setLoading(true)
    try {
      if (editing) {
        await departmentsApi.update(editing.id, form)
        toast.success('Şöbə yeniləndi')
        onSaved(null)
      } else {
        const res = await departmentsApi.create(form)
        const newDept = res.data?.data || res.data
        toast.success('Şöbə yaradıldı')
        onSaved(newDept)
      }
    } catch (err) {
      if (err?.isPending) onSaved(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ces-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="ces-modal" style={{ maxWidth: 480 }}>
        <div className="ces-m-head">
          <div className={clsx('ces-m-ic', editing ? 'gold' : '')}>
            {editing ? <Pencil size={20} /> : <Building2 size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3>{editing ? 'Şöbəni redaktə et' : 'Yeni şöbə'}</h3>
            <p>{editing ? editing.name : 'Şöbənin adını və təsvirini daxil edin'}</p>
          </div>
          <button onClick={onClose} className="ces-modal-x" type="button" aria-label="Bağla">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="contents">
          <div className="ces-m-body">
            <div className="ces-field">
              <label>Şöbənin adı <span className="req">*</span></label>
              <div className={clsx('ces-input', errors.name && 'is-error')}>
                <input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Məs: Mühasibatlıq"
                  autoFocus
                />
              </div>
              {errors.name && <span className="ces-err">{errors.name}</span>}
            </div>

            <div className="ces-field">
              <label>Təsvir</label>
              <div className={clsx('ces-input', errors.description && 'is-error')} style={{ alignItems: 'flex-start', paddingTop: 4, paddingBottom: 4 }}>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Şöbəni qısaca təsvir edin..."
                />
              </div>
              {errors.description && <span className="ces-err">{errors.description}</span>}
            </div>
          </div>

          <div className="ces-m-foot">
            <button type="button" onClick={onClose} className="ces-btn ces-btn-ghost">
              Ləğv et
            </button>
            <button type="submit" disabled={loading} className="ces-btn ces-btn-primary">
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editing ? 'Yadda saxla' : 'Əlavə et'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
