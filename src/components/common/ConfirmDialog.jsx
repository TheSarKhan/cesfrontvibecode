import { useEffect, useRef } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

/**
 * Usage: import { useConfirm } from '../../components/common/ConfirmDialog'
 *
 * const { confirm, ConfirmDialog } = useConfirm()
 * // In JSX: <ConfirmDialog />
 * // In handler: if (await confirm({ title, message })) { ... }
 */

import { useState, useCallback } from 'react'

export function useConfirm() {
  const [state, setState] = useState(null) // { title, message, resolve }

  const confirm = useCallback(({ title = 'Təsdiq', message, confirmText = 'Təsdiq et', danger } = {}) => {
    const isDanger = danger !== undefined
      ? danger
      : title.toLowerCase().includes('sil')
    return new Promise((resolve) => {
      setState({ title, message, confirmText, danger: isDanger, resolve })
    })
  }, [])

  const handleConfirm = () => {
    state?.resolve(true)
    setState(null)
  }

  const handleCancel = () => {
    state?.resolve(false)
    setState(null)
  }

  function Dialog() {
    const cancelRef = useRef(null)

    useEffect(() => {
      if (state) cancelRef.current?.focus()
    }, [])

    if (!state) return null

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center ces-font p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-[rgba(58,58,58,0.45)] backdrop-blur-sm"
          onClick={handleCancel}
        />

        {/* Dialog */}
        <div className="relative bg-[var(--ces-surface)] rounded-[18px] shadow-[0_24px_48px_-20px_rgba(58,58,58,0.28),0_6px_14px_rgba(58,58,58,0.08)] w-full max-w-[420px] p-6 animate-in fade-in zoom-in-95 duration-150">
          {/* Close */}
          <button
            onClick={handleCancel}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-[8px] grid place-items-center text-[var(--ces-muted)] hover:bg-[var(--ces-graphite-50)] hover:text-[var(--ces-graphite)] transition-colors"
          >
            <X size={16} />
          </button>

          {/* Header row */}
          <div className="flex items-center gap-3.5 mb-4">
            <div className={`w-11 h-11 rounded-[12px] grid place-items-center shrink-0 ${
              state.danger
                ? 'bg-[var(--ces-danger-100)] text-[var(--ces-danger)]'
                : 'bg-[var(--ces-gold-100)] text-[var(--ces-gold-700)]'
            }`}>
              {state.danger
                ? <Trash2 size={20} />
                : <AlertTriangle size={20} />
              }
            </div>
            <h3 className="text-[17px] font-extrabold text-[var(--ces-ink)] tracking-tight leading-tight">
              {state.title}
            </h3>
          </div>

          {/* Message */}
          {state.message && (
            <div className="bg-[var(--ces-graphite-50)] rounded-[12px] px-4 py-3.5 mb-5">
              <p className="text-[13.5px] text-[var(--ces-ink)] leading-relaxed">
                {state.message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2.5 justify-end">
            <button
              ref={cancelRef}
              onClick={handleCancel}
              className="px-5 py-2.5 text-sm font-semibold text-[var(--ces-graphite)] bg-white border border-[var(--ces-line)] hover:border-[var(--ces-graphite)] rounded-[10px] transition-colors"
            >
              Ləğv et
            </button>
            <button
              onClick={handleConfirm}
              className={`px-5 py-2.5 text-sm font-semibold text-white rounded-[10px] transition-colors ${
                state.danger
                  ? 'bg-[var(--ces-danger)] hover:bg-[#b62b4a]'
                  : 'bg-[var(--ces-gold)] hover:bg-[var(--ces-gold-700)]'
              }`}
            >
              {state.confirmText}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return { confirm, ConfirmDialog: Dialog }
}
