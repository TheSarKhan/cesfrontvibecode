import { Printer } from 'lucide-react'

export default function PrintButton({ label = 'Çap et', className = '' }) {
  return (
    <button
      onClick={() => window.print()}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 ${className} print:hidden`}
    >
      <Printer size={13} />
      {label}
    </button>
  )
}
