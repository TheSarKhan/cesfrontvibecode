import { useState } from 'react'
import { X } from 'lucide-react'
import { departmentsApi } from '../../api/departments'
import toast from 'react-hot-toast'
import { useEscapeKey } from '../../hooks/useEscapeKey'

export default function DepartmentModal({ editing, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState({
    name: editing?.name || '',
    description: editing?.description || '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editing) {
        await departmentsApi.update(editing.id, form)
        toast.success('Şöbə yeniləndi')
      } else {
        await departmentsApi.create(form)
        toast.success('Şöbə yaradıldı')
      }
      onSaved()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Əməliyyat uğursuz oldu')
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

        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">
          {editing ? 'Şöbəni redaktə et' : 'Yeni şöbə əlavə et'}
        </h2>
        <p className="text-sm text-gray-400 mb-6">Şöbənin adını və təsvirini daxil edin</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Şöbənin adı</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Şöbənin adı"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Təsvir</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              placeholder="Şöbəni təsvir edin"
            />
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
