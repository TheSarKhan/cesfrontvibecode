/* ─── Money / Number formatting ─── */
export const fmt = (n) => Number(n ?? 0).toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmtMoney = (n) => `${fmt(n)} ₼`
export const fmtInt = (n) => Number(n ?? 0).toLocaleString('az-AZ')
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

/* ─── Invoice types ─── */
export const INVOICE_TYPES = {
  INCOME:             { label: 'Gəlir',  desc: 'Layihədən qazanılan gəlir',     tone: 'ok' },
  CONTRACTOR_EXPENSE: { label: 'Ödəmə',  desc: 'İnvestor / Podratçı ödənişi',   tone: 'warn' },
  COMPANY_EXPENSE:    { label: 'Xərc',   desc: 'Şirkət daxili xərclər',         tone: 'danger' },
}

/* ─── Invoice statuses ─── */
export const INVOICE_STATUS = {
  DRAFT:    { label: 'Qaralama',     tone: 'muted' },
  SENT:     { label: 'Göndərilib',    tone: 'info' },
  APPROVED: { label: 'Təsdiqlənib',  tone: 'ok' },
  REJECTED: { label: 'Rədd edilib',  tone: 'danger' },
  CANCELLED:{ label: 'Ləğv edilib',  tone: 'muted' },
}

/* ─── Payment statuses ─── */
export const PAYMENT_STATUS = {
  PENDING:   { label: 'Gözləyir',    tone: 'warn' },
  PARTIAL:   { label: 'Qismən',      tone: 'info' },
  COMPLETED: { label: 'Tamamlandı',  tone: 'ok' },
  OVERDUE:   { label: 'Gecikmiş',    tone: 'danger' },
}

/* ─── Document statuses ─── */
export const DOCUMENT_STATUS = {
  DRAFT:     { label: 'Qaralama',     tone: 'muted' },
  GENERATED: { label: 'Yaradılıb',    tone: 'info' },
  SENT:      { label: 'Göndərilib',   tone: 'ok' },
}

/* ─── Months ─── */
export const AZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']

/* ─── Currency ─── */
export const CURRENCY = '₼'
