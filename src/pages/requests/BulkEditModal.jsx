import { useState } from 'react'
import { X } from 'lucide-react'
import { requestsApi } from '../../api/requests'
import { inputCls, labelCls } from '../../constants/requests'
import toast from 'react-hot-toast'
import { useEscapeKey } from '../../hooks/useEscapeKey'

export default function BulkEditModal({ selectedIds, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [loading, setLoading] = useState(false)
  const [fields, setFields] = useState({ region: false, notes: false })
  const [values, setValues] = useState({ region: '', notes: '' })

  const handleSubmit = async () => {
    if (!fields.region && !fields.notes) return toast.error('Ən azı bir sahə seçin')
    setLoading(true)
    try {
      const promises = []
      if (fields.region) promises.push(requestsApi.bulkUpdateRegion(selectedIds, values.region))
      if (fields.notes) promises.push(requestsApi.bulkUpdateNotes(selectedIds, values.notes))
      await Promise.all(promises)
      toast.success(`${selectedIds.length} sorğu yeniləndi`)
      onSaved()
    } catch {
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden">
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Toplu redaktə</h2>
            <p className="text-xs text-gray-400 mt-0.5">{selectedIds.length} sorğu seçildi</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors shrink-0">
            <X size={14} className="text-white" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Region */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input type="checkbox" checked={fields.region} onChange={(e) => setFields(f => ({ ...f, region: e.target.checked }))} className="accent-amber-600 w-4 h-4" />
              <span className={labelCls + ' !mb-0'}>Bölgə</span>
            </label>
            {fields.region && (
              <input type="text" value={values.region} onChange={(e) => setValues(v => ({ ...v, region: e.target.value }))} placeholder="Yeni bölgə..." className={inputCls} />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input type="checkbox" checked={fields.notes} onChange={(e) => setFields(f => ({ ...f, notes: e.target.checked }))} className="accent-amber-600 w-4 h-4" />
              <span className={labelCls + ' !mb-0'}>Qeyd</span>
            </label>
            {fields.notes && (
              <textarea value={values.notes} onChange={(e) => setValues(v => ({ ...v, notes: e.target.value }))} rows={3} placeholder="Yeni qeyd..." className={`${inputCls} resize-none`} />
            )}
          </div>
        </div>

        <div className="flex gap-3 p-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={handleSubmit}
            disabled={loading || (!fields.region && !fields.notes)}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Yenilə
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            Ləğv et
          </button>
        </div>
      </div>
    </div>
  )
}
