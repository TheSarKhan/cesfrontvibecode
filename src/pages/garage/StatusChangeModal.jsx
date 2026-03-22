import { useState } from 'react'
import { X, ArrowRight } from 'lucide-react'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { STATUS_CFG, ALLOWED_TRANSITIONS } from '../../constants/garage'

export default function StatusChangeModal({ item, onClose, onConfirm, bulkMode }) {
  useEscapeKey(onClose)
  const [newStatus, setNewStatus] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const allowed = bulkMode
    ? Object.keys(STATUS_CFG).filter(k => k !== 'RENTED')
    : (ALLOWED_TRANSITIONS[item.status] || [])
  const currentCfg = STATUS_CFG[item.status] || STATUS_CFG.AVAILABLE
  const selectedCfg = newStatus ? STATUS_CFG[newStatus] : null

  const handleSubmit = async () => {
    if (!newStatus) return
    setLoading(true)
    try {
      await onConfirm(item, newStatus, reason.trim() || null)
      onClose()
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors"
        >
          <X size={14} className="text-white" />
        </button>

        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
          {bulkMode ? 'Toplu status dəyişdir' : 'Status dəyişdir'}
        </h2>
        <p className="text-xs text-gray-400 mb-5 truncate">
          {bulkMode ? `${item.name} seçildi` : `${item.name} · ${item.equipmentCode}`}
        </p>

        {/* Current → New visual */}
        {!bulkMode && (
          <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <span className={clsx('px-2.5 py-1 rounded-lg text-xs font-semibold border', currentCfg.cls)}>
              {currentCfg.label}
            </span>
            <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />
            {selectedCfg ? (
              <span className={clsx('px-2.5 py-1 rounded-lg text-xs font-semibold border', selectedCfg.cls)}>
                {selectedCfg.label}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg text-xs text-gray-400 border border-dashed border-gray-300 dark:border-gray-600">
                Seçin
              </span>
            )}
          </div>
        )}

        {/* Status options */}
        <div className="space-y-2 mb-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Yeni status</label>
          <div className="grid grid-cols-2 gap-2">
            {allowed.map((key) => {
              const cfg = STATUS_CFG[key]
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setNewStatus(key)}
                  className={clsx(
                    'px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all',
                    newStatus === key
                      ? 'ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-gray-800 ' + cfg.cls
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                  )}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>
          {allowed.length === 0 && item.status === 'RENTED' && (
            <p className="text-xs text-amber-600 italic">İcarədə olan texnikanın statusu yalnız layihə bağlandıqda avtomatik dəyişir</p>
          )}
          {allowed.length === 0 && item.status !== 'RENTED' && (
            <p className="text-xs text-red-500 italic">Bu statusdan heç bir keçid mümkün deyil</p>
          )}
        </div>

        {/* Reason */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Səbəb / Qeyd
            <span className="ml-1 text-xs text-gray-400 font-normal">— isteğe bağlı</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Status dəyişikliyinin səbəbini qeyd edin..."
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={!newStatus || loading}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Təsdiqlə
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Ləğv et
          </button>
        </div>
      </div>
    </div>
  )
}
