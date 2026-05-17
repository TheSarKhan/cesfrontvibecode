// Mərkəzi tarix/vaxt formatlaşdırma utiliti
// Backend UTC vaxt göndərir ('Z' suffix olmadan), biz Asia/Baku timezone-a çeviririk

const TZ = 'Asia/Baku'

/** Backend-dən gələn tarixi UTC kimi parse et */
export const parseUTC = (d) => {
  if (!d) return null
  return new Date(d.includes('Z') || d.includes('+') ? d : d + 'Z')
}

/** Yalnız tarix: 01.05.2026 */
export const fmtDate = (d) => {
  const date = parseUTC(d)
  return date ? date.toLocaleDateString('az-AZ', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
}

/** Tarix + saat: 01.05.2026 14:30 */
export const fmtDateTime = (d) => {
  const date = parseUTC(d)
  return date ? date.toLocaleString('az-AZ', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
}

/** Yalnız saat: 14:30 */
export const fmtTime = (d) => {
  const date = parseUTC(d)
  return date ? date.toLocaleTimeString('az-AZ', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) : ''
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
