/* ─── Qaraj modulu sabitləri ───────────────────────────────────────────── */

export const STATUS_CFG = {
  AVAILABLE:      { label: 'Hazırdır',           cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
  RENTED:         { label: 'İcarədə',           cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  IN_TRANSIT:     { label: 'Yolda',             cls: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' },
  IN_INSPECTION:  { label: 'Qəbulda',           cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' },
  UNDER_CHECK:    { label: 'Baxışda',           cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800' },
  IN_REPAIR:      { label: 'Təmirdə',           cls: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' },
  DEFECTIVE:      { label: 'Nasaz',             cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
  OUT_OF_SERVICE: { label: 'Xidmətdən kənarda', cls: 'bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
}

export const OWN_LABEL = {
  COMPANY: 'Şirkət',
  INVESTOR: 'İnvestor',
  CONTRACTOR: 'Podratçı',
}

export const ALLOWED_TRANSITIONS = {
  AVAILABLE:      ['RENTED', 'DEFECTIVE', 'OUT_OF_SERVICE', 'IN_INSPECTION'],
  RENTED:         ['IN_TRANSIT'],
  IN_TRANSIT:     ['IN_INSPECTION'],
  IN_INSPECTION:  ['UNDER_CHECK', 'DEFECTIVE', 'IN_REPAIR'],
  UNDER_CHECK:    ['AVAILABLE', 'IN_REPAIR'],
  IN_REPAIR:      ['AVAILABLE', 'DEFECTIVE', 'UNDER_CHECK'],
  DEFECTIVE:      ['IN_REPAIR', 'OUT_OF_SERVICE', 'AVAILABLE'],
  OUT_OF_SERVICE: ['AVAILABLE', 'DEFECTIVE'],
}

export const INSPECTION_THRESHOLDS = {
  OVERDUE: 0,
  URGENT: 7,
  WARNING: 30,
}

export const FILE_UPLOAD = {
  MAX_SIZE_MB: 50,
  MAX_SIZE_BYTES: 50 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOC_TYPES: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ALLOWED_IMAGE_EXT: '.jpg,.jpeg,.png,.gif,.webp',
  ALLOWED_DOC_EXT: '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx',
}

export const fmtMoney = (v) => v != null ? `${Number(v).toLocaleString()} ₼` : '—'
export const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
export const dash     = (v) => (v != null && v !== '') ? v : '—'

export function inspectionCountdown(nextDate) {
  if (!nextDate) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const next = new Date(nextDate); next.setHours(0, 0, 0, 0)
  const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { days: diff, label: `${Math.abs(diff)} gün gecikib`, cls: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' }
  if (diff === 0) return { days: 0, label: 'Bu gün', cls: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' }
  if (diff <= INSPECTION_THRESHOLDS.URGENT) return { days: diff, label: `${diff} gün qalıb`, cls: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' }
  if (diff <= INSPECTION_THRESHOLDS.WARNING) return { days: diff, label: `${diff} gün qalıb`, cls: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' }
  return { days: diff, label: `${diff} gün qalıb`, cls: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' }
}

export function validateFileUpload(file, type = 'document') {
  if (!file) return null
  if (file.size > FILE_UPLOAD.MAX_SIZE_BYTES) {
    return `Fayl çox böyükdür (max ${FILE_UPLOAD.MAX_SIZE_MB}MB)`
  }
  const allowed = type === 'image' ? FILE_UPLOAD.ALLOWED_IMAGE_TYPES : FILE_UPLOAD.ALLOWED_DOC_TYPES
  if (!allowed.includes(file.type)) {
    return type === 'image'
      ? 'Yalnız şəkil faylları (JPG, PNG, GIF, WebP) yüklənə bilər'
      : 'İcazə verilməyən fayl formatı'
  }
  return null
}
