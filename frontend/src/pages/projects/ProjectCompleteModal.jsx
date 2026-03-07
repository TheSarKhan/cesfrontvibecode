import { useState } from 'react'
import { X, CheckCircle, AlertCircle } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import toast from 'react-hot-toast'

export default function ProjectCompleteModal({ project, onClose, onSaved }) {
  const [form, setForm] = useState({
    evacuationCost: '',
    scheduledHours: '',
    actualHours: '',
  })
  const [saving, setSaving] = useState(false)

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }))

  const handleSubmit = async () => {
    if (!form.evacuationCost || parseFloat(form.evacuationCost) < 0) {
      toast.error('Evakuator xərcini daxil edin')
      return
    }
    if (!form.scheduledHours || parseFloat(form.scheduledHours) <= 0) {
      toast.error('Planlaşdırılan iş saatını daxil edin')
      return
    }
    if (!form.actualHours || parseFloat(form.actualHours) <= 0) {
      toast.error('Faktiki iş saatını daxil edin')
      return
    }

    if (!window.confirm('Layihəni bağlamaq istəyirsiniz? Bu əməliyyat geri alına bilməz.')) return

    setSaving(true)
    try {
      await projectsApi.complete(project.id, {
        evacuationCost: parseFloat(form.evacuationCost),
        scheduledHours: parseFloat(form.scheduledHours),
        actualHours: parseFloat(form.actualHours),
      })
      toast.success('Layihə uğurla bağlandı. Mühasibatlığa yönləndirildi.')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Layihə bağlanmadı')
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
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Layihəni Bitir</h2>
            <p className="text-xs text-gray-400 mt-0.5">{project.projectCode || project.requestCode} · {project.companyName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Layihəni bağladıqdan sonra <strong>Mühasibatlıq moduluna</strong> avtomatik yönləndiriləcək. Bu əməliyyat geri alına bilməz.
            </p>
          </div>

          {/* Evacuation Cost */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              Evakuator Xərci (AZN) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.evacuationCost}
              onChange={(e) => set('evacuationCost', e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Work Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                Planlaşdırılan İş Saatı <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.scheduledHours}
                onChange={(e) => set('scheduledHours', e.target.value)}
                placeholder="0"
                min="0"
                step="0.5"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                Faktiki İş Saatı <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.actualHours}
                onChange={(e) => set('actualHours', e.target.value)}
                placeholder="0"
                min="0"
                step="0.5"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Summary preview */}
          {(form.scheduledHours || form.actualHours) && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
              {form.scheduledHours && form.actualHours && (
                <div className="flex justify-between">
                  <span>Fərq (faktiki − planlı):</span>
                  <span className={parseFloat(form.actualHours) >= parseFloat(form.scheduledHours) ? 'text-green-600' : 'text-red-500'}>
                    {(parseFloat(form.actualHours || 0) - parseFloat(form.scheduledHours || 0)).toFixed(1)} saat
                  </span>
                </div>
              )}
              {form.evacuationCost && (
                <div className="flex justify-between">
                  <span>Evakuator xərci:</span>
                  <span className="text-red-500">
                    {parseFloat(form.evacuationCost || 0).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Ləğv et
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <CheckCircle size={15} />
            {saving ? 'Bağlanır...' : 'Layihəni Bağla'}
          </button>
        </div>
      </div>
    </div>
  )
}
