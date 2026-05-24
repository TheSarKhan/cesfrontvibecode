/* ─── Money / Number formatting ─── */
export const fmt = (n) => Number(n ?? 0).toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmtMoney = (n) => `${fmt(n)} ₼`
export const pct = (v) => `${(Number(v) * 100).toFixed(2).replace(/\.?0+$/, '')}%`

/* ─── UI kit `.pill` semantic styles ─── */
export const PILL_STYLES = {
  ok:     { bg: 'var(--ces-ok-100)',       color: 'var(--ces-ok)' },
  warn:   { bg: 'var(--ces-warn-100)',     color: 'var(--ces-warn)' },
  danger: { bg: 'var(--ces-danger-100)',   color: 'var(--ces-danger)' },
  info:   { bg: 'var(--ces-info-100)',     color: 'var(--ces-info)' },
  gold:   { bg: 'var(--ces-gold-100)',     color: 'var(--ces-gold-700)' },
  muted:  { bg: 'var(--ces-graphite-100)', color: 'var(--ces-muted)' },
  solid:  { bg: 'var(--ces-graphite)',     color: 'var(--ces-on-primary)' },
}

/* ─── Status mappings ─── */
export const EMPLOYEE_STATUS = {
  ACTIVE:     { label: 'Aktiv',         tone: 'ok' },
  ON_LEAVE:   { label: 'Məzuniyyətdə',  tone: 'info' },
  TERMINATED: { label: 'İşdən çıxıb',   tone: 'muted' },
}

export const PAYROLL_STATUS = {
  DRAFT:    { label: 'Layihə',      tone: 'warn' },
  APPROVED: { label: 'Təsdiqlənib', tone: 'info' },
  PAID:     { label: 'Ödənilib',    tone: 'ok' },
}

export const LEAVE_STATUS = {
  PENDING:   { label: 'Gözləyir',    tone: 'warn' },
  APPROVED:  { label: 'Təsdiqlənib', tone: 'ok' },
  REJECTED:  { label: 'Rədd edilib', tone: 'danger' },
  CANCELLED: { label: 'Ləğv edilib', tone: 'muted' },
}

export const LEAVE_TYPES = [
  { v: 'ANNUAL',        label: 'İllik' },
  { v: 'SICK',          label: 'Xəstəlik' },
  { v: 'UNPAID',        label: 'Ödənişsiz' },
  { v: 'MATERNITY',     label: 'Dekret' },
  { v: 'BUSINESS_TRIP', label: 'Ezamiyyət' },
]

export const ATTENDANCE_STATUSES = [
  { v: 'PRESENT',       label: 'İşdə',       tone: 'ok',     short: 'İ' },
  { v: 'ABSENT',        label: 'Yoxdur',     tone: 'danger', short: 'Y' },
  { v: 'LEAVE',         label: 'Məzuniyyət', tone: 'info',   short: 'M' },
  { v: 'SICK',          label: 'Xəstə',      tone: 'warn',   short: 'X' },
  { v: 'HOLIDAY',       label: 'Bayram',     tone: 'gold',   short: 'B' },
  { v: 'BUSINESS_TRIP', label: 'Ezamiyyət',  tone: 'info',   short: 'E' },
]

export const AZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']
