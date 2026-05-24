// Mərkəzi tarix/vaxt formatlaşdırma utiliti
// Backend UTC vaxt göndərir ('Z' suffix olmadan), biz Asia/Baku timezone-a çeviririk

const TZ = 'Asia/Baku'

/** Backend-dən gələn tarixi UTC kimi parse et */
export const parseUTC = (d) => {
  if (!d) return null
  return new Date(d.includes('Z') || d.includes('+') ? d : d + 'Z')
}

/** Tarix hissələrini Asia/Baku saat qurşağı ilə çıxar */
const partsInTZ = (date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date)
  const get = (t) => parts.find(p => p.type === t)?.value || ''
  return { day: get('day'), month: get('month'), year: get('year'), hour: get('hour'), minute: get('minute') }
}

/** Yalnız tarix: 19.05.2026 */
export const fmtDate = (d) => {
  const date = parseUTC(d)
  if (!date) return '—'
  const { day, month, year } = partsInTZ(date)
  return `${day}.${month}.${year}`
}

/** Tarix + saat: 19.05.2026 14:30 */
export const fmtDateTime = (d) => {
  const date = parseUTC(d)
  if (!date) return '—'
  const { day, month, year, hour, minute } = partsInTZ(date)
  return `${day}.${month}.${year} ${hour}:${minute}`
}

/** Yalnız saat: 14:30 */
export const fmtTime = (d) => {
  const date = parseUTC(d)
  if (!date) return ''
  const { hour, minute } = partsInTZ(date)
  return `${hour}:${minute}`
}

/** Period (ay + il): 05.2026 */
export const fmtPeriod = (year, month) => {
  if (year == null || month == null) return '—'
  return `${String(month).padStart(2, '0')}.${year}`
}

/** "5 dəqiqə əvvəl" formatı */
export const timeAgo = (dateStr) => {
  const date = parseUTC(dateStr)
  if (!date) return ''
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'İndicə'
  if (mins < 60) return `${mins} dəq əvvəl`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} saat əvvəl`
  const days = Math.floor(hrs / 24)
  return `${days} gün əvvəl`
}
