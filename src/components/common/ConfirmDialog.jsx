import { useEffect, useRef } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'

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

  const confirm = useCallback(({ title = 'Təsdiq', message, confirmText = 'Təsdiq et', danger = true } = {}) => {
    return new Promise((resolve) => {
      setState({ title, message, confirmText, danger, resolve })
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
      <div className="fixed inset-0 z-[200] flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={handleCancel}
        />

        {/* Dialog */}
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-in fade-in zoom-in-95 duration-150">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
            state.danger ? 'bg-red-50 dark:bg-red-900/30' : 'bg-amber-50 dark:bg-amber-900/30'
          }`}>
            {state.danger
              ? <Trash2 size={22} className="text-red-500" />
              : <AlertTriangle size={22} className="text-amber-500" />
            }
          </div>

          {/* Title */}
          <h3 className="text-center text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
            {state.title}
          </h3>

          {/* Message */}
          {state.message && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              {state.message}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              ref={cancelRef}
              onClick={handleCancel}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
            >
              Ləğv et
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors ${
                state.danger
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-amber-600 hover:bg-amber-700'
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
