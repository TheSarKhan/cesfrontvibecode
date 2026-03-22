import { useState } from 'react'
import { SlidersHorizontal, RotateCcw } from 'lucide-react'
import { useColumnStore, COLUMN_LABELS } from '../../store/columnStore'
import { clsx } from 'clsx'

export default function ColumnToggle({ page }) {
  const [open, setOpen] = useState(false)
  const { isVisible, toggle, reset } = useColumnStore()
  const labels = COLUMN_LABELS[page] ?? {}

  if (Object.keys(labels).length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title="Sütunları idarə et"
      >
        <SlidersHorizontal size={13} />
        Sütunlar
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-600 dark:text-gray-400">Sütunlar</p>
              <button
                onClick={() => reset(page)}
                className="text-[10px] text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                <RotateCcw size={10} /> Sıfırla
              </button>
            </div>
            {Object.entries(labels).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 py-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isVisible(page, key)}
                  onChange={() => toggle(page, key)}
                  className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
                />
                <span className="text-xs text-gray-600 dark:text-gray-300">{label}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
