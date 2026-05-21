import { useState, useRef } from 'react'
import { X, Layers, Pencil } from 'lucide-react'
import { departmentsApi } from '../../api/departments'
import toast from 'react-hot-toast'
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
    e('name', v.required, (val) => v.minLen(val, 2), v.realContent, (val) => v.maxLen(val, 100))
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-7 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors"
        >
          <X size={14} className="text-white" />
        </button>

        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
          {editing ? <Pencil size={18} className="text-amber-500 shrink-0" /> : <Layers size={18} className="text-amber-500 shrink-0" />}
          {editing ? 'Şöbəni redaktə et' : 'Yeni şöbə əlavə et'}
        </h2>
        <p className="text-sm text-gray-400 mb-6">Şöbənin adını və təsvirini daxil edin</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Şöbənin adı <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:border-transparent ${errors.name ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : 'border-gray-300 dark:border-gray-600 focus:ring-amber-500'}`}
              placeholder="Şöbənin adı"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Təsvir</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className={`w-full border border-dashed rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:border-transparent resize-none ${errors.description ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : 'border-gray-300 dark:border-gray-600 focus:ring-amber-500'}`}
              placeholder="Şöbəni təsvir edin"
            />
            {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {editing ? 'Yenilə' : 'Əlavə et'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Ləğv et
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
