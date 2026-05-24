/* ─── Sorğular modulu sabitləri ─────────────────────────────────────────── */

export const STATUS_CFG = {
  DRAFT:               { label: 'Qaralama',            pill: 'ces-p-mute' },
  PENDING:             { label: 'Göndərməyə hazırdır', pill: 'ces-p-info' },
  SENT_TO_COORDINATOR: { label: 'Kordinatorda',        pill: 'ces-p-solid' },
  OFFER_SENT:          { label: 'Gözdən keçirilir',    pill: 'ces-p-warn' },
  ACCEPTED:            { label: 'Qəbul edildi',        pill: 'ces-p-ok' },
  REJECTED:            { label: 'Rədd edildi',         pill: 'ces-p-danger' },
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

export { fmtDate } from '../utils/date'
export const dash = (v) => (v != null && v !== '') ? v : '—'

export const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500'
export const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'
