/* ─── Sorğular modulu sabitləri ─────────────────────────────────────────── */

export const STATUS_CFG = {
  DRAFT:               { label: 'Qaralama',            cls: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
  PENDING:             { label: 'Göndərməyə hazırdır', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  SENT_TO_COORDINATOR: { label: 'Kordinatorda',        cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' },
  OFFER_SENT:          { label: 'Gözdən keçirilir',    cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  ACCEPTED:            { label: 'Qəbul edildi',        cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  REJECTED:            { label: 'Rədd edildi',         cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
}

export const ALLOWED_TRANSITIONS = {
  DRAFT:               ['PENDING'],
  PENDING:             ['SENT_TO_COORDINATOR'],
  SENT_TO_COORDINATOR: ['OFFER_SENT', 'REJECTED'],
  OFFER_SENT:          ['ACCEPTED', 'REJECTED'],
  ACCEPTED:            [],
  REJECTED:            [],
}

export const PROJECT_TYPES = [
  { value: 'DAILY', label: 'Günlük' },
  { value: 'MONTHLY', label: 'Aylıq' },
]

export const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
export const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'
export const sectionCls = 'text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-1'

export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
export const dash = (v) => (v != null && v !== '') ? v : '—'
