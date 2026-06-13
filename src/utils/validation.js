// Ortaq validasiya utiliti

const PHONE_REGEX = /^(\+994|0)(10|12|50|51|55|60|70|77|99)\d{7}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VOEN_REGEX  = /^\d{10}$/

// Yalnız nöqtə, boşluq, xüsusi simvoldan ibarət deyilmi?
const hasRealContent = (str) => str && str.trim().replace(/[^a-zA-ZÀ-žА-яёƏəÇçĞğİıÖöŞşÜü0-9]/g, '').length > 0

// Rəqəm sahələri üçün filtr köməkçiləri
export const onlyDigits = (val) => String(val ?? '').replace(/[^\d]/g, '')

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
    !val?.trim() ? msg : null,

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

  // Bir neçə qaydanı ardıcıl yoxla, ilk xətanı qaytar
  chain: (val, ...rules) => {
    for (const rule of rules) {
      const err = rule(val)
      if (err) return err
    }
    return null
  },
}
