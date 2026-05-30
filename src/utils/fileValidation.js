/**
 * Fayl yükləmə validasiyası — bütün modullar üçün ortaq utility
 */

export const FILE_LIMITS = {
  // Backend (application.yml: max-file-size 50MB) və CLAUDE.md ilə uyğun.
  MAX_SIZE_MB: 50,
  MAX_SIZE_BYTES: 50 * 1024 * 1024,
  ALLOWED_DOC_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOC_EXT: '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx',
  ALLOWED_IMAGE_EXT: '.jpg,.jpeg,.png,.gif,.webp',
}

const TYPE_LABELS = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/gif': 'GIF',
  'image/webp': 'WebP',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
}

/**
 * Fayl yükləmə validasiyası
 * @param {File} file - Yüklənəcək fayl
 * @param {'document'|'image'} type - Fayl tipi
 * @returns {string|null} - Xəta mesajı və ya null (keçərli)
 */
export function validateFileUpload(file, type = 'document') {
  if (!file) return null

  // Ölçü yoxlaması
  if (file.size > FILE_LIMITS.MAX_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return `Fayl həcmi çox böyükdür (${sizeMB}MB). Maksimum ${FILE_LIMITS.MAX_SIZE_MB}MB ola bilər.`
  }

  // Format yoxlaması
  const allowed = type === 'image' ? FILE_LIMITS.ALLOWED_IMAGE_TYPES : FILE_LIMITS.ALLOWED_DOC_TYPES
  if (!allowed.includes(file.type)) {
    const allowedLabels = allowed.map(t => TYPE_LABELS[t] || t).join(', ')
    return type === 'image'
      ? `Yalnız şəkil formatları qəbul olunur (${allowedLabels}). Seçilən fayl: ${file.type || 'naməlum format'}`
      : `İcazə verilməyən fayl formatı. Qəbul olunan formatlar: ${allowedLabels}. Seçilən: ${file.name?.split('.').pop()?.toUpperCase() || 'naməlum'}`
  }

  return null
}
