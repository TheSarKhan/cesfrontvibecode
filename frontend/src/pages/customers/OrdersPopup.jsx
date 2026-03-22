import { useState } from 'react'
import { X, ClipboardList } from 'lucide-react'
import { clsx } from 'clsx'

const STATUS_TABS = [
  { value: '', label: 'Hamısı' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Aktiv' },
  { value: 'COMPLETED', label: 'Tamamlanmış' },
]

export default function OrdersPopup({ customer, onClose }) {
  const [tab, setTab] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Sifarişlər</h2>
            <p className="text-xs text-gray-400 mt-0.5">{customer.companyName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors"
          >
            <X size={14} className="text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                tab === t.value
                  ? 'bg-amber-500 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Empty state — Sorğular modulu hələ qurulmayıb */}
        <div className="py-14 flex flex-col items-center gap-3 text-center px-6">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <ClipboardList size={22} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sorğu tapılmadı</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
            Sorğular modulu qurulduqdan sonra bu müştəriyə aid aktiv layihələr və sifarişlər burada görünəcək.
          </p>
        </div>
      </div>
    </div>
  )
}
