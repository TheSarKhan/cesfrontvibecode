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

// Telefon üçün: yalnız rəqəm və başlanğıcda + qəbul edilir
export const onlyPhone = (val) => {
  const s = String(val ?? '')
  const hasPlus = s.trimStart().startsWith('+')
  const digits = s.replace(/\D/g, '')
  return (hasPlus ? '+' : '') + digits
}

const CONTROL_KEYS = new Set([
  'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Home', 'End',
])

const isControlKey = (e) => e.ctrlKey || e.metaKey || e.altKey || CONTROL_KEYS.has(e.key)

// Yalnız tam ədəd qəbul edən sahələr üçün keyDown filtri
export const digitKeyDown = (e) => {
  if (isControlKey(e)) return
  if (!/^\d$/.test(e.key)) e.preventDefault()
}

// Onluq ədəd qəbul edən sahələr üçün keyDown filtri (vergül nöqtəyə çevrilir)
export const decimalKeyDown = (e) => {
  if (isControlKey(e)) return
  if (e.key === ',') {
    e.preventDefault()
    const el = e.target
    if (!el.value.includes('.')) {
      const start = el.selectionStart ?? el.value.length
      const end   = el.selectionEnd   ?? el.value.length
      const next  = el.value.slice(0, start) + '.' + el.value.slice(end)
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      setter.call(el, next)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    return
  }
  if (e.key === '.') {
    if (e.target.value.includes('.')) e.preventDefault()
    return
  }
  if (!/^\d$/.test(e.key)) e.preventDefault()
}

// Telefon sahəsi üçün keyDown filtri (yalnız rəqəm və başlanğıcda +)
export const phoneKeyDown = (e) => {
  if (isControlKey(e)) return
  if (e.key === '+') {
    const el = e.target
    const start = el.selectionStart ?? 0
    if (start !== 0 || el.value.includes('+')) e.preventDefault()
    return
  }
  if (!/^\d$/.test(e.key)) e.preventDefault()
}

// Paste hadisəsi üçün ümumi sanitizer
export const makePasteHandler = (sanitize) => (e) => {
  const pasted = e.clipboardData?.getData('text') ?? ''
  const el = e.target
  const start = el.selectionStart ?? el.value.length
  const end   = el.selectionEnd   ?? el.value.length
  const next  = sanitize(el.value.slice(0, start) + pasted + el.value.slice(end))
  if (next !== el.value) {
    e.preventDefault()
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, next)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
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
