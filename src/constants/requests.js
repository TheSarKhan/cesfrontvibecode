/* ─── Sorğular modulu sabitləri ─────────────────────────────────────────── */

import { enumLabel } from '../utils/enumLabel'

// PM flow: 14 status. Stil (pill + Tailwind cls) burada; etiket mərkəzi enum
// mənbəsindən (RequestStatus) `label` getter-i ilə oxunur — vahid adlandırma.
export const STATUS_CFG = {
  DRAFT:                    { get label() { return enumLabel('RequestStatus', 'DRAFT') },                    pill: 'ces-p-mute',   cls: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
  PENDING:                  { get label() { return enumLabel('RequestStatus', 'PENDING') },                  pill: 'ces-p-info',   cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  PM_REVIEW:                { get label() { return enumLabel('RequestStatus', 'PM_REVIEW') },                pill: 'ces-p-info',   cls: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800' },
  PM_SHORTLIST_READY:       { get label() { return enumLabel('RequestStatus', 'PM_SHORTLIST_READY') },       pill: 'ces-p-solid',  cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800' },
  COORDINATOR_NEGOTIATING:  { get label() { return enumLabel('RequestStatus', 'COORDINATOR_NEGOTIATING') },  pill: 'ces-p-solid',  cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' },
  COORDINATOR_PROPOSED:     { get label() { return enumLabel('RequestStatus', 'COORDINATOR_PROPOSED') },     pill: 'ces-p-warn',   cls: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-900/20 dark:text-fuchsia-400 dark:border-fuchsia-800' },
  PM_PRICE_NEGOTIATION:     { get label() { return enumLabel('RequestStatus', 'PM_PRICE_NEGOTIATION') },     pill: 'ces-p-warn',   cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  PM_APPROVED:              { get label() { return enumLabel('RequestStatus', 'PM_APPROVED') },              pill: 'ces-p-ok',     cls: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800' },
  ACCOUNTING_DOCS_CHECK:    { get label() { return enumLabel('RequestStatus', 'ACCOUNTING_DOCS_CHECK') },    pill: 'ces-p-info',   cls: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800' },
  EXECUTION_READY:          { get label() { return enumLabel('RequestStatus', 'EXECUTION_READY') },          pill: 'ces-p-solid',  cls: 'bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-900/20 dark:text-lime-400 dark:border-lime-800' },
  OPERATOR_ASSIGNED:        { get label() { return enumLabel('RequestStatus', 'OPERATOR_ASSIGNED') },        pill: 'ces-p-solid',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
  EQUIPMENT_DISPATCHED:     { get label() { return enumLabel('RequestStatus', 'EQUIPMENT_DISPATCHED') },     pill: 'ces-p-ok',     cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  DELIVERED:                { get label() { return enumLabel('RequestStatus', 'DELIVERED') },                pill: 'ces-p-ok',     cls: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' },
  REJECTED:                 { get label() { return enumLabel('RequestStatus', 'REJECTED') },                 pill: 'ces-p-danger', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
}

// Backend RequestTransitionService.ALLOWED_TRANSITIONS ilə sinxron (irəli + 4 geri keçid).
export const ALLOWED_TRANSITIONS = {
  DRAFT:                    ['PENDING', 'REJECTED'],
  PENDING:                  ['PM_REVIEW', 'REJECTED'],
  PM_REVIEW:                ['PM_SHORTLIST_READY', 'REJECTED'],
  PM_SHORTLIST_READY:       ['COORDINATOR_NEGOTIATING', 'REJECTED'],
  COORDINATOR_NEGOTIATING:  ['COORDINATOR_PROPOSED', 'REJECTED'],
  COORDINATOR_PROPOSED:     ['PM_PRICE_NEGOTIATION', 'REJECTED', 'COORDINATOR_NEGOTIATING'],
  PM_PRICE_NEGOTIATION:     ['PM_APPROVED', 'REJECTED', 'COORDINATOR_NEGOTIATING'],
  PM_APPROVED:              ['ACCOUNTING_DOCS_CHECK', 'REJECTED'],
  ACCOUNTING_DOCS_CHECK:    ['EXECUTION_READY', 'REJECTED', 'PM_PRICE_NEGOTIATION'],
  EXECUTION_READY:          ['OPERATOR_ASSIGNED', 'REJECTED'],
  OPERATOR_ASSIGNED:        ['EQUIPMENT_DISPATCHED', 'REJECTED', 'EXECUTION_READY'],
  EQUIPMENT_DISPATCHED:     ['DELIVERED', 'REJECTED'],
  DELIVERED:                [],
  REJECTED:                 [],
}

// Geri qaytarma keçidləri ("from->to") — bunlarda səbəb məcburidir.
export const SEND_BACK = new Set([
  'PM_PRICE_NEGOTIATION->COORDINATOR_NEGOTIATING',
  'COORDINATOR_PROPOSED->COORDINATOR_NEGOTIATING',
  'ACCOUNTING_DOCS_CHECK->PM_PRICE_NEGOTIATION',
  'OPERATOR_ASSIGNED->EXECUTION_READY',
])

export const isSendBack = (from, to) => SEND_BACK.has(`${from}->${to}`)

export const PROJECT_TYPES = [
  { value: 'DAILY', get label() { return enumLabel('ProjectType', 'DAILY') } },
  { value: 'MONTHLY', get label() { return enumLabel('ProjectType', 'MONTHLY') } },
]

export { fmtDate } from '../utils/date'
export const dash = (v) => (v != null && v !== '') ? v : '—'

export const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500'
export const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'
