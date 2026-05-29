import { enumLabel } from '../../utils/enumLabel'

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

/* ─── Invoice types ─── (etiket: mərkəzi InvoiceType; stil/desc lokal) */
export const INVOICE_TYPES = {
  INCOME:             { get label() { return enumLabel('InvoiceType', 'INCOME') },             desc: 'Layihədən qazanılan gəlir',   tone: 'ok' },
  CONTRACTOR_EXPENSE: { get label() { return enumLabel('InvoiceType', 'CONTRACTOR_EXPENSE') }, desc: 'İnvestor / Podratçı ödənişi', tone: 'warn' },
  COMPANY_EXPENSE:    { get label() { return enumLabel('InvoiceType', 'COMPANY_EXPENSE') },    desc: 'Şirkət daxili xərclər',       tone: 'danger' },
  INVESTOR_EXPENSE:   { get label() { return enumLabel('InvoiceType', 'INVESTOR_EXPENSE') },   desc: 'İnvestor ödənişi',            tone: 'warn' },
}

/* ─── Invoice statuses ─── (etiket: mərkəzi InvoiceStatus) */
export const INVOICE_STATUS = {
  DRAFT:    { get label() { return enumLabel('InvoiceStatus', 'DRAFT') },    tone: 'muted' },
  SENT:     { get label() { return enumLabel('InvoiceStatus', 'SENT') },     tone: 'info' },
  APPROVED: { get label() { return enumLabel('InvoiceStatus', 'APPROVED') }, tone: 'ok' },
  RETURNED: { get label() { return enumLabel('InvoiceStatus', 'RETURNED') }, tone: 'danger' },
}

/* ─── Payment statuses ─── (etiket: mərkəzi PayableStatus = ReceivableStatus) */
export const PAYMENT_STATUS = {
  PENDING:   { get label() { return enumLabel('PayableStatus', 'PENDING') },   tone: 'warn' },
  PARTIAL:   { get label() { return enumLabel('PayableStatus', 'PARTIAL') },   tone: 'info' },
  COMPLETED: { get label() { return enumLabel('PayableStatus', 'COMPLETED') }, tone: 'ok' },
  OVERDUE:   { get label() { return enumLabel('PayableStatus', 'OVERDUE') },   tone: 'danger' },
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
