/* ─── Qaraj modulu sabitləri ───────────────────────────────────────────── */
/* Status / countdown sinifləri UI kit tokenlərindən istifadə edir */

export const STATUS_CFG = {
  AVAILABLE:      { label: 'Hazırdır',           cls: 'bg-[var(--ces-ok-100)] text-[var(--ces-ok)]' },
  RENTED:         { label: 'İcarədə',           cls: 'bg-[var(--ces-info-100)] text-[var(--ces-info)]' },
  IN_TRANSIT:     { label: 'Yolda',             cls: 'bg-[var(--ces-warn-100)] text-[var(--ces-warn)]' },
  IN_INSPECTION:  { label: 'Qəbulda',           cls: 'bg-[var(--ces-gold-100)] text-[var(--ces-gold-700)]' },
  UNDER_CHECK:    { label: 'Baxışda',           cls: 'bg-[#ece4ff] text-[#5e3bbf]' },
  IN_REPAIR:      { label: 'Təmirdə',           cls: 'bg-[var(--ces-warn-100)] text-[var(--ces-warn)]' },
  DEFECTIVE:      { label: 'Nasaz',             cls: 'bg-[var(--ces-danger-100)] text-[var(--ces-danger)]' },
  OUT_OF_SERVICE: { label: 'Xidmətdən kənarda', cls: 'bg-[var(--ces-graphite-100)] text-[var(--ces-muted)]' },
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
  MAX_SIZE_MB: 1,
  MAX_SIZE_BYTES: 1 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOC_TYPES: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ALLOWED_IMAGE_EXT: '.jpg,.jpeg,.png,.gif,.webp',
  ALLOWED_DOC_EXT: '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx',
}

export const fmtMoney = (v) => v != null ? `${Number(v).toLocaleString()} ₼` : '—'
export { fmtDate } from '../utils/date'
export const dash     = (v) => (v != null && v !== '') ? v : '—'

export function inspectionCountdown(nextDate) {
  if (!nextDate) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const next = new Date(nextDate); next.setHours(0, 0, 0, 0)
  const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { days: diff, label: `${Math.abs(diff)} gün gecikib`, cls: 'bg-[var(--ces-danger-100)] text-[var(--ces-danger)]' }
  if (diff === 0) return { days: 0, label: 'Bu gün', cls: 'bg-[var(--ces-warn-100)] text-[var(--ces-warn)]' }
  if (diff <= INSPECTION_THRESHOLDS.URGENT) return { days: diff, label: `${diff} gün qalıb`, cls: 'bg-[var(--ces-danger-100)] text-[var(--ces-danger)]' }
  if (diff <= INSPECTION_THRESHOLDS.WARNING) return { days: diff, label: `${diff} gün qalıb`, cls: 'bg-[var(--ces-warn-100)] text-[var(--ces-warn)]' }
  return { days: diff, label: `${diff} gün qalıb`, cls: 'bg-[var(--ces-ok-100)] text-[var(--ces-ok)]' }
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
