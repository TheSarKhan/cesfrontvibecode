import { useState } from 'react'
import { X, ArrowRight, RefreshCw } from 'lucide-react'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(58,58,58,0.45)] backdrop-blur-sm p-4 ces-font">
      <div className="bg-[var(--ces-surface)] rounded-[18px] shadow-[0_24px_48px_-20px_rgba(58,58,58,0.28),0_6px_14px_rgba(58,58,58,0.08)] w-full max-w-md relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3.5 px-6 pt-6 pb-5 border-b border-[var(--ces-line)]">
          <div className="w-11 h-11 rounded-[12px] grid place-items-center bg-[var(--ces-gold-100)] text-[var(--ces-gold-700)] shrink-0">
            <RefreshCw size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-[var(--ces-ink)] leading-tight">
              {bulkMode ? 'Toplu status dəyişdir' : 'Status dəyişdir'}
            </h2>
            <p className="text-[13px] text-[var(--ces-muted)] mt-1 truncate">
              {bulkMode ? `${item.name} seçildi` : `${item.name} · ${item.equipmentCode}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[8px] grid place-items-center text-[var(--ces-muted)] hover:bg-[var(--ces-graphite-50)] hover:text-[var(--ces-graphite)] transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Current → New visual */}
          {!bulkMode && (
            <div className="flex items-center gap-3 mb-5 p-3.5 bg-[var(--ces-graphite-50)] rounded-[12px]">
              <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold', currentCfg.cls)}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {currentCfg.label}
              </span>
              <ArrowRight size={16} className="text-[var(--ces-mute2)] shrink-0" />
              {selectedCfg ? (
                <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold', selectedCfg.cls)}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {selectedCfg.label}
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[11.5px] font-semibold text-[var(--ces-muted)] border border-dashed border-[var(--ces-line)]">
                  Seçin
                </span>
              )}
            </div>
          )}

          {/* Status options */}
          <div className="mb-5">
            <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-2">Yeni status</label>
            <div className="grid grid-cols-2 gap-2">
              {allowed.map((key) => {
                const cfg = STATUS_CFG[key]
                const on = newStatus === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setNewStatus(key)}
                    className={clsx(
                      'px-3 py-2.5 rounded-[10px] text-[12.5px] font-bold transition-all border-2',
                      on
                        ? cfg.cls + ' border-[var(--ces-graphite)] ring-2 ring-[rgba(58,58,58,0.15)]'
                        : 'bg-white border-[var(--ces-line)] text-[var(--ces-graphite)] hover:border-[var(--ces-graphite)]'
                    )}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
            {allowed.length === 0 && item.status === 'RENTED' && (
              <p className="mt-3 text-xs font-semibold text-[var(--ces-gold-700)] bg-[var(--ces-gold-50)] border border-[var(--ces-gold-100)] rounded-[10px] px-3 py-2">
                İcarədə olan texnikanın statusu yalnız layihə bağlandıqda avtomatik dəyişir
              </p>
            )}
            {allowed.length === 0 && item.status !== 'RENTED' && (
              <p className="mt-3 text-xs font-semibold text-[var(--ces-danger)] bg-[var(--ces-danger-100)] rounded-[10px] px-3 py-2">
                Bu statusdan heç bir keçid mümkün deyil
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[13px] font-semibold text-[var(--ces-ink)] mb-1.5">
              Səbəb / Qeyd
              <span className="ml-1 text-[11px] text-[var(--ces-muted)] font-medium">— isteğe bağlı</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Status dəyişikliyinin səbəbini qeyd edin..."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[var(--ces-line)] rounded-[11px] text-[var(--ces-ink)] placeholder-[var(--ces-mute2)] focus:outline-none focus:border-[var(--ces-graphite)] focus:ring-[3px] focus:ring-[rgba(58,58,58,0.1)] transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-6 py-4 border-t border-[var(--ces-line)] bg-[var(--ces-graphite-50)] justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-[10px] text-sm font-semibold text-[var(--ces-graphite)] bg-white border border-[var(--ces-line)] hover:border-[var(--ces-graphite)] transition-colors"
          >
            Ləğv et
          </button>
          <button
            onClick={handleSubmit}
            disabled={!newStatus || loading}
            className="inline-flex items-center gap-2 bg-[var(--ces-gold)] hover:bg-[var(--ces-gold-700)] disabled:opacity-60 disabled:pointer-events-none text-[var(--ces-on-gold)] font-semibold px-5 py-2.5 rounded-[10px] text-sm transition-colors"
          >
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Təsdiqlə
          </button>
        </div>
      </div>
    </div>
  )
}
