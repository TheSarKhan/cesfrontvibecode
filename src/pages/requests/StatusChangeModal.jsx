import { useState } from 'react'
import { X, ArrowRight } from 'lucide-react'
import { requestsApi } from '../../api/requests'
import { STATUS_CFG, ALLOWED_TRANSITIONS } from '../../constants/requests'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

export default function StatusChangeModal({ request, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [selected, setSelected] = useState(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const currentStatus = request.status
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || []
  const current = STATUS_CFG[currentStatus] || STATUS_CFG.DRAFT

  const handleSubmit = async () => {
    if (!selected) return toast.error('Yeni status seçin')
    setLoading(true)
    try {
      await requestsApi.changeStatus(request.id, { status: selected, reason: reason.trim() || null })
      toast.success('Status dəyişdirildi')
      onSaved()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Status dəyişmə uğursuz oldu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Status dəyiş</h2>
            <p className="text-xs text-gray-400 mt-0.5">{request.requestCode || `REQ-${String(request.id).padStart(4, '0')}`}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors shrink-0">
            <X size={14} className="text-white" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Current status */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Hazırkı status</p>
            <span className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium border', current.cls)}>
              {current.label}
            </span>
          </div>

          {/* Transition options */}
          {allowed.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Bu statusdan keçid mümkün deyil</p>
          ) : (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Yeni status seçin</p>
              <div className="space-y-2">
                {allowed.map((s) => {
                  const cfg = STATUS_CFG[s]
                  return (
                    <button
                      key={s}
                      onClick={() => setSelected(s)}
                      className={clsx(
                        'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                        selected === s
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      )}
                    >
                      <ArrowRight size={14} className={clsx(selected === s ? 'text-amber-600' : 'text-gray-400')} />
                      <span className={clsx('px-2 py-0.5 rounded-md text-xs font-medium border', cfg.cls)}>
                        {cfg.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Reason */}
          {allowed.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Səbəb (ixtiyari)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Status dəyişmə səbəbi..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {allowed.length > 0 && (
          <div className="flex gap-3 p-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={handleSubmit}
              disabled={!selected || loading}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Təsdiqlə
            </button>
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              Ləğv et
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
