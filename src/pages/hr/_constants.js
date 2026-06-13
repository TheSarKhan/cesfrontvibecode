import { enumLabel } from '../../utils/enumLabel'

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

/* ─── Status mappings ─── (etiketlər mərkəzi enum mənbəsindən; stil/short lokal) */
export const EMPLOYEE_STATUS = {
  ACTIVE:     { get label() { return enumLabel('EmployeeStatus', 'ACTIVE') },     tone: 'ok' },
  ON_LEAVE:   { get label() { return enumLabel('EmployeeStatus', 'ON_LEAVE') },   tone: 'info' },
  TERMINATED: { get label() { return enumLabel('EmployeeStatus', 'TERMINATED') }, tone: 'muted' },
}

export const PAYROLL_STATUS = {
  DRAFT:    { get label() { return enumLabel('PayrollStatus', 'DRAFT') },    tone: 'warn' },
  APPROVED: { get label() { return enumLabel('PayrollStatus', 'APPROVED') }, tone: 'info' },
  PAID:     { get label() { return enumLabel('PayrollStatus', 'PAID') },     tone: 'ok' },
}

export const LEAVE_STATUS = {
  PENDING:   { get label() { return enumLabel('LeaveStatus', 'PENDING') },   tone: 'warn' },
  APPROVED:  { get label() { return enumLabel('LeaveStatus', 'APPROVED') },  tone: 'ok' },
  REJECTED:  { get label() { return enumLabel('LeaveStatus', 'REJECTED') },  tone: 'danger' },
  CANCELLED: { get label() { return enumLabel('LeaveStatus', 'CANCELLED') }, tone: 'muted' },
}

export const LEAVE_TYPES = [
  { v: 'ANNUAL',        get label() { return enumLabel('LeaveType', 'ANNUAL') } },
  { v: 'SICK',          get label() { return enumLabel('LeaveType', 'SICK') } },
  { v: 'UNPAID',        get label() { return enumLabel('LeaveType', 'UNPAID') } },
  { v: 'MATERNITY',     get label() { return enumLabel('LeaveType', 'MATERNITY') } },
  { v: 'BUSINESS_TRIP', get label() { return enumLabel('LeaveType', 'BUSINESS_TRIP') } },
]

export const ATTENDANCE_STATUSES = [
  { v: 'PRESENT',       get label() { return enumLabel('AttendanceStatus', 'PRESENT') },       tone: 'ok',     short: 'İ' },
  { v: 'ABSENT',        get label() { return enumLabel('AttendanceStatus', 'ABSENT') },        tone: 'danger', short: 'Y' },
  { v: 'LEAVE',         get label() { return enumLabel('AttendanceStatus', 'LEAVE') },         tone: 'info',   short: 'M' },
  { v: 'SICK',          get label() { return enumLabel('AttendanceStatus', 'SICK') },          tone: 'warn',   short: 'X' },
  { v: 'HOLIDAY',       get label() { return enumLabel('AttendanceStatus', 'HOLIDAY') },       tone: 'gold',   short: 'B' },
  { v: 'BUSINESS_TRIP', get label() { return enumLabel('AttendanceStatus', 'BUSINESS_TRIP') }, tone: 'info',   short: 'E' },
]

export const AZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']
