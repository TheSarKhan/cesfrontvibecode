// Ortaq validasiya utiliti

const PHONE_REGEX = /^(\+994|0)(10|12|50|51|55|60|70|77|99)\d{7}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VOEN_REGEX  = /^\d{10}$/
const INT_REGEX     = /^\d+$/
const DECIMAL_REGEX = /^\d+(\.\d+)?$/

// Yalnız nöqtə, boşluq, xüsusi simvoldan ibarət deyilmi?
const hasRealContent = (str) => str && str.trim().replace(/[^a-zA-ZÀ-žА-яёƏəÇçĞğİıÖöŞşÜü0-9]/g, '').length > 0

// ───── Rəqəm filtrləri (sahənin daxilindəki dəyəri təmizləmək üçün) ─────

// Yalnız rəqəmləri saxla, qalan bütün simvolları sil
export const onlyDigits = (val) => String(val ?? '').replace(/[^\d]/g, '')

// Rəqəmləri və bir dənə nöqtəni saxla; vergülü nöqtəyə çevir
export const onlyDecimal = (val) => {
  let t = String(val ?? '').replace(/,/g, '.').replace(/[^\d.]/g, '')
  const idx = t.indexOf('.')
  if (idx !== -1) {
    t = t.slice(0, idx + 1) + t.slice(idx + 1).replace(/\./g, '')
  }
  return t
}

export const v = {
  required: (val, msg = 'Bu sahə tələb olunur') =>
    !val?.toString().trim() ? msg : null,

  minLen: (val, min, msg) =>
    val?.trim() && val.trim().length < min ? (msg || `Minimum ${min} simvol olmalıdır`) : null,

  maxLen: (val, max, msg) =>
    val?.trim() && val.trim().length > max ? (msg || `Maksimum ${max} simvol ola bilər`) : null,

  realContent: (val, msg = 'Yalnız xüsusi simvol qəbul edilmir') =>
    val?.trim() && !hasRealContent(val) ? msg : null,

  phone: (val, msg = 'Düzgün telefon nömrəsi daxil edin (+994XXXXXXXXX və ya 0XXXXXXXXX)') =>
    val?.trim() && !PHONE_REGEX.test(val.trim()) ? msg : null,

  email: (val, msg = 'Düzgün email formatı daxil edin') =>
    val?.trim() && !EMAIL_REGEX.test(val.trim()) ? msg : null,

  voen: (val, msg = 'VÖEN 10 rəqəmdən ibarət olmalıdır') =>
    val?.trim() && !VOEN_REGEX.test(val.trim()) ? msg : null,

  // Yalnız tam ədəd (rəqəm) — nöqtə, vergül, hərf qəbul etmir
  integer: (val, msg = 'Yalnız tam ədəd daxil edin') => {
    const s = String(val ?? '').trim()
    if (!s) return null
    return !INT_REGEX.test(s) ? msg : null
  },

  // Onluq ədəd (bir nöqtə icazəlidir) — hərf qəbul etmir
  decimal: (val, msg = 'Düzgün rəqəm daxil edin') => {
    const s = String(val ?? '').trim()
    if (!s) return null
    return !DECIMAL_REGEX.test(s) ? msg : null
  },

  // Ədəd diapazonu (inclusive). Boş dəyər keçirilir.
  range: (val, min, max, msg) => {
    const s = String(val ?? '').trim()
    if (!s) return null
    const n = Number(s)
    if (Number.isNaN(n)) return msg || 'Düzgün rəqəm daxil edin'
    if (min != null && n < min) return msg || `Minimum ${min} olmalıdır`
    if (max != null && n > max) return msg || `Maksimum ${max} ola bilər`
    return null
  },

  // Müsbət tam ədəd ( ≥ 1 )
  positiveInt: (val, msg = 'Müsbət tam ədəd daxil edin') => {
    const s = String(val ?? '').trim()
    if (!s) return null
    if (!INT_REGEX.test(s)) return msg
    return Number(s) >= 1 ? null : msg
  },

  // Bir neçə qaydanı ardıcıl yoxla, ilk xətanı qaytar
  chain: (val, ...rules) => {
    for (const rule of rules) {
      const err = rule(val)
      if (err) return err
    }
    return null
  },
}
