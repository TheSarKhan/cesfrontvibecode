/* ─── Sorğular modulu sabitləri ─────────────────────────────────────────── */

export const STATUS_CFG = {
  DRAFT:                    { label: 'Qaralama',           cls: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
  PENDING:                  { label: 'PM-ə yönləndirildi', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  PM_REVIEW:                { label: 'PM nəzərdən keçirir', cls: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800' },
  PM_SHORTLIST_READY:       { label: 'Shortlist hazır',    cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800' },
  COORDINATOR_NEGOTIATING:  { label: 'Koordinator danışır', cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' },
  COORDINATOR_PROPOSED:     { label: 'Təklif PM-ə gəldi',  cls: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-900/20 dark:text-fuchsia-400 dark:border-fuchsia-800' },
  PM_PRICE_NEGOTIATION:     { label: 'Sifarişçi ilə danışıq', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  PM_APPROVED:              { label: 'PM təsdiqlədi',      cls: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800' },
  ACCOUNTING_DOCS_CHECK:    { label: 'Mühasibat sənədi',    cls: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800' },
  EXECUTION_READY:          { label: 'İcraya hazır',       cls: 'bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-900/20 dark:text-lime-400 dark:border-lime-800' },
  OPERATOR_ASSIGNED:        { label: 'Operator təyin',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
  EQUIPMENT_DISPATCHED:     { label: 'Yüklənib göndərildi', cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  DELIVERED:                { label: 'Təhvil-təslim',      cls: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' },
  REJECTED:                 { label: 'Rədd edildi',        cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
}

export const ALLOWED_TRANSITIONS = {
  DRAFT:                    ['PENDING', 'REJECTED'],
  PENDING:                  ['PM_REVIEW', 'REJECTED'],
  PM_REVIEW:                ['PM_SHORTLIST_READY', 'REJECTED'],
  PM_SHORTLIST_READY:       ['COORDINATOR_NEGOTIATING', 'REJECTED'],
  COORDINATOR_NEGOTIATING:  ['COORDINATOR_PROPOSED', 'REJECTED'],
  COORDINATOR_PROPOSED:     ['PM_PRICE_NEGOTIATION', 'REJECTED'],
  PM_PRICE_NEGOTIATION:     ['PM_APPROVED', 'REJECTED'],
  PM_APPROVED:              ['ACCOUNTING_DOCS_CHECK', 'REJECTED'],
  ACCOUNTING_DOCS_CHECK:    ['EXECUTION_READY', 'REJECTED'],
  EXECUTION_READY:          ['OPERATOR_ASSIGNED', 'REJECTED'],
  OPERATOR_ASSIGNED:        ['EQUIPMENT_DISPATCHED', 'REJECTED'],
  EQUIPMENT_DISPATCHED:     ['DELIVERED', 'REJECTED'],
  DELIVERED:                [],
  REJECTED:                 [],
}

export const PROJECT_TYPES = [
  { value: 'DAILY', label: 'Günlük' },
  { value: 'MONTHLY', label: 'Aylıq' },
]

export const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
export const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'
export const sectionCls = 'text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-1'

export { fmtDate } from '../utils/date'
export const dash = (v) => (v != null && v !== '') ? v : '—'
