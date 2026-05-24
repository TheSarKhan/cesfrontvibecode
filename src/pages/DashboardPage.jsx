import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, RefreshCw, Settings,
  TrendingUp, TrendingDown,
  AlertTriangle, ShieldCheck,
  FileText, Briefcase, UserPlus, Receipt,
  Building2, HardHat, Users, Wrench,
  Wallet, PiggyBank,
  Activity, Clock, CheckCircle2, XCircle,
  Crown, Award, Sparkles,
  Cake, Target, Edit3, AlertCircle, Info,
  Plus,
} from 'lucide-react'
import ActivityFeed from '../components/common/ActivityFeed'
import RevenueBarChart from '../components/common/RevenueBarChart'
import ProjectStatusChart from '../components/common/ProjectStatusChart'
import axiosInstance from '../api/axios'
import { fmtDate } from '../utils/date'
import { clsx } from 'clsx'

/* ─── Helpers ──────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('az-AZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n ?? 0)

const fmtMoney = (n) => `${fmt(n)} ₼`

/* ───────────────────────────────────────────────
   UI Kit `.pill` semantic colors
─────────────────────────────────────────────── */
const PILL_STYLES = {
  ok:     { bg: 'var(--ces-ok-100)',       color: 'var(--ces-ok)' },
  warn:   { bg: 'var(--ces-warn-100)',     color: 'var(--ces-warn)' },
  danger: { bg: 'var(--ces-danger-100)',   color: 'var(--ces-danger)' },
  info:   { bg: 'var(--ces-info-100)',     color: 'var(--ces-info)' },
  gold:   { bg: 'var(--ces-gold-100)',     color: 'var(--ces-gold-700)' },
  muted:  { bg: 'var(--ces-graphite-50)',  color: 'var(--ces-muted)' },
}

function Pill({ tone = 'muted', children, sm }) {
  const s = PILL_STYLES[tone] || PILL_STYLES.muted
  return (
    <span
      className={clsx('inline-flex items-center gap-1.5 rounded-full font-bold tracking-tight',
        sm ? 'px-2 py-[3px] text-[11px]' : 'px-2.5 py-1 text-[12px]'
      )}
      style={{ background: s.bg, color: s.color }}
    >
      {children}
    </span>
  )
}

/* ───────────────────────────────────────────────
   UI Kit `.kpi-card` — surface + line border
─────────────────────────────────────────────── */
function KpiCard({ label, value, unit, icon: Icon, iconTone = 'default', delta, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={clsx(
        'ces-kpi-card relative flex flex-col text-left transition-all',
        onClick && 'cursor-pointer'
      )}
      style={{
        background: 'var(--ces-surface)',
        border: '1px solid var(--ces-line)',
        borderRadius: 'var(--ces-radius-lg)',
        padding: '22px',
        boxShadow: 'var(--ces-shadow-sm)',
      }}
    >
      <div className="flex items-center justify-between mb-3.5">
        <span
          className="text-[11px] font-bold uppercase tracking-[.14em]"
          style={{ color: 'var(--ces-muted)' }}
        >
          {label}
        </span>
        {Icon && (
          <span
            className="w-9 h-9 rounded-[10px] grid place-items-center"
            style={{
              background: iconTone === 'gold' ? 'var(--ces-gold-100)' : 'var(--ces-graphite-50)',
              color: iconTone === 'gold' ? 'var(--ces-gold-700)' : 'var(--ces-graphite)',
            }}
          >
            <Icon size={18} />
          </span>
        )}
      </div>
      <div
        className="text-[34px] font-extrabold tracking-[-.025em] leading-none flex items-baseline gap-1.5 num"
        style={{ color: 'var(--ces-graphite-900)' }}
      >
        {value}
        {unit && (
          <span className="text-[16px] font-semibold" style={{ color: 'var(--ces-muted)' }}>
            {unit}
          </span>
        )}
      </div>
      {delta && (
        <div className="mt-3 flex items-center gap-2 text-[12.5px]" style={{ color: 'var(--ces-muted)' }}>
          {delta}
        </div>
      )}
    </button>
  )
}

/* ───────────────────────────────────────────────
   HERO KPI (revenue) — UI kit `.kpi-hero` pattern
─────────────────────────────────────────────── */
function KpiHero({ label, value, sub, sparklinePoints, trend }) {
  // Sparkline path — sparklinePoints = array of numbers
  const W = 320, H = 60
  let pathLine = ''
  let pathFill = ''
  if (sparklinePoints?.length > 1) {
    const max = Math.max(...sparklinePoints) || 1
    const stepX = W / (sparklinePoints.length - 1)
    const pts = sparklinePoints.map((v, i) => `${i * stepX} ${H - (v / max) * (H - 10) - 5}`)
    pathLine = `M${pts.join(' L')}`
    pathFill = `${pathLine} L${W} ${H} L0 ${H}Z`
  }
  return (
    <div
      className="ces-kpi-hero relative overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(180deg, var(--ces-gold-50), var(--ces-surface))',
        border: '1px solid var(--ces-line)',
        borderRadius: 'var(--ces-radius-lg)',
        padding: '22px',
        boxShadow: 'var(--ces-shadow-sm)',
      }}
    >
      <div
        aria-hidden
        className="ces-kpi-hero-glow absolute pointer-events-none"
        style={{
          right: '-40px',
          top: '-40px',
          width: '220px',
          height: '220px',
          background: 'radial-gradient(closest-side,rgba(200,147,42,.18),transparent 70%)',
        }}
      />
      <div className="relative flex items-center justify-between mb-3.5">
        <span
          className="text-[11px] font-bold uppercase tracking-[.14em]"
          style={{ color: 'var(--ces-muted)' }}
        >
          {label}
        </span>
        <span
          className="w-9 h-9 rounded-[10px] grid place-items-center"
          style={{ background: 'var(--ces-gold-100)', color: 'var(--ces-gold-700)' }}
        >
          <Wallet size={18} />
        </span>
      </div>
      <div
        className="relative text-[42px] font-extrabold tracking-[-.025em] leading-none num"
        style={{ color: 'var(--ces-graphite-900)' }}
      >
        {value}
      </div>
      <div className="relative mt-3 flex items-center gap-2 text-[12.5px]" style={{ color: 'var(--ces-muted)' }}>
        {trend !== null && trend !== undefined && (
          <Pill tone={trend >= 0 ? 'ok' : 'danger'} sm>
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend).toFixed(1)}%
          </Pill>
        )}
        {sub}
      </div>
      {pathLine && (
        <svg
          className="block mt-4 w-full"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="ces-spark-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--ces-gold)" stopOpacity=".25" />
              <stop offset="1" stopColor="var(--ces-gold)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={pathFill} fill="url(#ces-spark-grad)" />
          <path className="ces-spark-line" d={pathLine} fill="none" stroke="var(--ces-gold)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
    </div>
  )
}

/* ───────────────────────────────────────────────
   QUICK ACTION — UI kit `.card-action` (dashed)
─────────────────────────────────────────────── */
function QuickAction({ icon: Icon, label, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className="ces-card-action flex flex-col items-start gap-1.5 transition-all w-full text-left"
      style={{
        background: 'var(--ces-surface)',
        border: `1.5px dashed ${accent ? 'var(--ces-gold)' : 'var(--ces-line)'}`,
        borderRadius: 'var(--ces-radius-lg)',
        padding: '18px',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--ces-gold)'
        e.currentTarget.style.background = 'var(--ces-gold-50)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = accent ? 'var(--ces-gold)' : 'var(--ces-line)'
        e.currentTarget.style.background = 'var(--ces-surface)'
      }}
    >
      <span
        className="w-10 h-10 rounded-[10px] grid place-items-center mb-1"
        style={{
          background: accent ? 'var(--ces-gold)' : 'var(--ces-graphite-50)',
          color: accent ? 'var(--ces-on-gold)' : 'var(--ces-ink)',
        }}
      >
        {Icon && <Icon size={18} />}
      </span>
      <b className="text-[13.5px] font-bold leading-tight" style={{ color: 'var(--ces-ink)' }}>
        {label}
      </b>
    </button>
  )
}

/* ───────────────────────────────────────────────
   ALERT BANNER — UI kit `.alert` pattern
─────────────────────────────────────────────── */
function Alert({ icon: Icon, title, message, tone = 'info', onClick }) {
  const styles = {
    info:   { left: 'var(--ces-info)',   icBg: 'rgba(37,99,200,.12)',  ic: 'var(--ces-info)' },
    ok:     { left: 'var(--ces-ok)',     icBg: 'rgba(15,157,106,.12)', ic: 'var(--ces-ok)' },
    warn:   { left: 'var(--ces-warn)',   icBg: 'rgba(224,138,0,.12)',  ic: 'var(--ces-warn)' },
    danger: { left: 'var(--ces-danger)', icBg: 'rgba(212,56,90,.12)',  ic: 'var(--ces-danger)', bg: 'var(--ces-danger-100)' },
  }[tone] || { left: 'var(--ces-graphite)', icBg: 'var(--ces-graphite-50)', ic: 'var(--ces-graphite)' }

  return (
    <button
      onClick={onClick}
      className={clsx('ces-alert flex items-center gap-3.5 w-full text-left transition-shadow', tone === 'danger' && 'danger', tone === 'warn' && 'warn', tone === 'ok' && 'ok', tone === 'info' && 'info')}
      style={{
        background: styles.bg || 'var(--ces-surface)',
        border: '1px solid var(--ces-line)',
        borderLeft: `4px solid ${styles.left}`,
        borderRadius: '12px',
        padding: '14px 16px',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--ces-shadow-sm)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div
        className="flex-none w-9 h-9 rounded-[10px] grid place-items-center"
        style={{ background: styles.icBg, color: styles.ic }}
      >
        {Icon && <Icon size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <b className="block text-[14px] font-bold" style={{ color: 'var(--ces-ink)' }}>{title}</b>
        <span className="text-[13px]" style={{ color: 'var(--ces-muted)' }}>{message}</span>
      </div>
      <ArrowRight size={14} className="flex-none" style={{ color: 'var(--ces-muted)' }} />
    </button>
  )
}

/* ───────────────────────────────────────────────
   AR AGING — UI kit `.kpi-card` with bucket bar
─────────────────────────────────────────────── */
function ArAgingCard({ aging, navigate }) {
  if (!aging || Number(aging.totalOutstanding ?? 0) <= 0) return null
  const total = Number(aging.totalOutstanding)
  const buckets = [
    { key: 'current',       label: '0–30 gün',  color: 'var(--ces-ok)',     value: Number(aging.current ?? 0) },
    { key: 'days30to60',    label: '30–60 gün', color: 'var(--ces-warn)',   value: Number(aging.days30to60 ?? 0) },
    { key: 'days60to90',    label: '60–90 gün', color: 'var(--ces-warn)',   value: Number(aging.days60to90 ?? 0) },
    { key: 'overdue90Plus', label: '90+ gün',   color: 'var(--ces-danger)', value: Number(aging.overdue90Plus ?? 0) },
  ]
  return (
    <div
      className="ces-card"
      style={{
        background: 'var(--ces-surface)',
        border: '1px solid var(--ces-line)',
        borderRadius: 'var(--ces-radius-lg)',
        boxShadow: 'var(--ces-shadow-sm)',
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--ces-line)' }}
      >
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: 'var(--ces-muted)' }}>
            Borçlular · AR Aging
          </span>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[22px] font-extrabold tracking-[-.02em] num" style={{ color: 'var(--ces-graphite-900)' }}>
              {fmtMoney(total)}
            </p>
            {aging.overdueInvoiceCount > 0 && (
              <Pill tone="warn" sm>{aging.overdueInvoiceCount} gecikən</Pill>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate('/accounting')}
          className="text-[12.5px] font-bold transition-colors"
          style={{ color: 'var(--ces-graphite)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ces-gold)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ces-graphite)')}
        >
          Detallar →
        </button>
      </div>
      <div className="px-5 py-5">
        <div className="flex h-3 rounded-full overflow-hidden mb-4" style={{ background: 'var(--ces-graphite-50)' }}>
          {buckets.map(b => {
            const pct = total > 0 ? (b.value / total) * 100 : 0
            return pct > 0 ? (
              <div key={b.key} style={{ width: `${pct}%`, background: b.color }} title={`${b.label}: ${fmtMoney(b.value)}`} />
            ) : null
          })}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {buckets.map(b => (
            <div key={b.key}>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: b.color }} />
                <span className="text-[11px] font-semibold uppercase tracking-[.08em]" style={{ color: 'var(--ces-muted)' }}>
                  {b.label}
                </span>
              </div>
              <p className="text-[16px] font-extrabold num" style={{ color: 'var(--ces-ink)' }}>
                {fmtMoney(b.value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────────
   TOP CUSTOMERS — UI kit list card
─────────────────────────────────────────────── */
function TopCustomersCard({ customers, navigate }) {
  const isEmpty = !customers || customers.length === 0
  return (
    <div
      className="ces-card"
      style={{
        background: 'var(--ces-surface)',
        border: '1px solid var(--ces-line)',
        borderRadius: 'var(--ces-radius-lg)',
        boxShadow: 'var(--ces-shadow-sm)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--ces-line)' }}
      >
        <span className="text-[11px] font-bold uppercase tracking-[.14em] flex items-center gap-1.5" style={{ color: 'var(--ces-muted)' }}>
          <Crown size={13} style={{ color: 'var(--ces-gold)' }} /> Top 5 müştəri
        </span>
        <button
          onClick={() => navigate('/customers')}
          className="text-[12.5px] font-bold transition-colors"
          style={{ color: 'var(--ces-graphite)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ces-gold)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ces-graphite)')}
        >
          Hamısı →
        </button>
      </div>
      {isEmpty ? (
        <div
          className="flex flex-col items-center justify-center text-center"
          style={{ padding: '40px 24px', flex: 1, gap: 10 }}
        >
          <div
            style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'var(--ces-graphite-50)',
              color: 'var(--ces-mute2)',
              display: 'grid', placeItems: 'center',
            }}
          >
            <Crown size={22} />
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--ces-muted)', fontWeight: 600, margin: 0 }}>
            Hələ qaimə kəsilmiş müştəri yoxdur
          </p>
          <p style={{ fontSize: 11.5, color: 'var(--ces-mute2)', margin: 0, maxWidth: 260 }}>
            Müştərilərə qaimə kəsdikdən sonra ən mənfəətli olanlar burada görünəcək
          </p>
        </div>
      ) : (
      <div>
        {customers.map((c, i) => (
          <button
            key={c.id}
            onClick={() => navigate('/customers')}
            className="w-full flex items-center justify-between px-5 py-3 transition-colors text-left"
            style={{
              borderBottom: i < customers.length - 1 ? '1px solid var(--ces-line-2)' : 'none',
              background: 'transparent',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ces-graphite-50)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span
                className="flex-none w-7 h-7 rounded-lg grid place-items-center text-[11px] font-extrabold"
                style={{
                  background: i === 0 ? 'var(--ces-gold-100)' :
                              i === 1 ? 'var(--ces-graphite-100)' :
                              i === 2 ? 'rgba(200,147,42,.06)' : 'var(--ces-graphite-50)',
                  color: i === 0 ? 'var(--ces-gold-700)' :
                         i === 1 ? 'var(--ces-graphite)' :
                         i === 2 ? 'var(--ces-gold-700)' : 'var(--ces-muted)',
                }}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-bold truncate" style={{ color: 'var(--ces-ink)' }}>{c.name || '—'}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--ces-muted)' }}>
                  {c.invoiceCount} qaimə
                </p>
              </div>
            </div>
            <span className="text-[14px] font-extrabold num" style={{ color: 'var(--ces-ok)' }}>
              {fmtMoney(c.totalRevenue)}
            </span>
          </button>
        ))}
      </div>
      )}
    </div>
  )
}

/* ───────────────────────────────────────────────
   HR SNAPSHOT
─────────────────────────────────────────────── */
function HrSnapshotCard({ hr, navigate }) {
  if (!hr) return null
  return (
    <div
      className="ces-card"
      style={{
        background: 'var(--ces-surface)',
        border: '1px solid var(--ces-line)',
        borderRadius: 'var(--ces-radius-lg)',
        boxShadow: 'var(--ces-shadow-sm)',
        overflow: 'hidden',
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--ces-line)' }}
      >
        <span className="text-[11px] font-bold uppercase tracking-[.14em] flex items-center gap-1.5" style={{ color: 'var(--ces-muted)' }}>
          <span className="inline-grid place-items-center" style={{ width: 20, height: 20, borderRadius: 6, background: 'var(--ces-gold-100)', color: 'var(--ces-gold-700)' }}>
            <Users size={11} />
          </span>
          HR xülasəsi
        </span>
        <button
          onClick={() => navigate('/hr')}
          className="text-[12.5px] font-bold transition-colors"
          style={{ color: 'var(--ces-graphite)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ces-gold)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ces-graphite)')}
        >
          HR-ə keç →
        </button>
      </div>
      <div className="grid grid-cols-2">
        <HrStat label="Bu ay əməkhaqqı" value={fmtMoney(hr.monthlyPayrollCost)} valueColor="var(--ces-ok)" border />
        <HrStat label="Şirkət xərci (cəmi)" value={fmtMoney(hr.monthlyCompanyCost)} valueColor="var(--ces-gold-700)" />
        <HrStat label="Aktiv məzuniyyət" value={hr.activeLeaveRequests ?? 0} valueColor="var(--ces-warn)" border top />
        <HrStat label="Təsdiq gözləyən" value={hr.pendingLeaveRequests ?? 0} valueColor="var(--ces-danger)" top />
      </div>
      {hr.upcomingBirthdays && hr.upcomingBirthdays.length > 0 && (
        <div className="px-5 py-4" style={{ borderTop: '1px solid var(--ces-line)' }}>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] mb-2.5 flex items-center gap-1.5" style={{ color: 'var(--ces-muted)' }}>
            <Cake size={11} style={{ color: 'var(--ces-gold)' }} /> Yaxın ad günləri
          </p>
          <div className="space-y-1.5">
            {hr.upcomingBirthdays.slice(0, 5).map(b => (
              <div key={b.id} className="flex items-center justify-between text-[12px]">
                <span className="font-medium truncate" style={{ color: 'var(--ces-ink)' }}>{b.fullName}</span>
                <Pill tone={b.daysUntil === 0 ? 'gold' : b.daysUntil <= 2 ? 'warn' : 'muted'} sm>
                  {b.daysUntil === 0 ? 'Bu gün 🎂' : `${b.daysUntil} gün`}
                </Pill>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function HrStat({ label, value, valueColor, border, top }) {
  return (
    <div
      className="px-5 py-4"
      style={{
        borderRight: border ? '1px solid var(--ces-line)' : 'none',
        borderTop: top ? '1px solid var(--ces-line)' : 'none',
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: 'var(--ces-muted)' }}>{label}</p>
      <p className="text-[18px] font-extrabold mt-1 num" style={{ color: valueColor }}>{value}</p>
    </div>
  )
}

/* ───────────────────────────────────────────────
   EQUIPMENT — UI kit chart bar
─────────────────────────────────────────────── */
function EquipmentBar({ stats, navigate }) {
  const total = (stats.availableEquipment ?? 0) + (stats.rentedEquipment ?? 0) +
                (stats.defectiveEquipment ?? 0) + (stats.outOfServiceEquipment ?? 0)
  if (total === 0) return null
  const utilization = total > 0 ? ((stats.rentedEquipment ?? 0) / total) * 100 : 0
  const segs = [
    { key: 'availableEquipment',    label: 'Mövcud',       color: 'var(--ces-ok)' },
    { key: 'rentedEquipment',       label: 'İcarədə',      color: 'var(--ces-info)' },
    { key: 'defectiveEquipment',    label: 'Nasaz',        color: 'var(--ces-danger)' },
    { key: 'outOfServiceEquipment', label: 'Xidmət xaric', color: 'var(--ces-mute2)' },
  ]

  return (
    <div
      className="ces-card"
      style={{
        background: 'var(--ces-surface)',
        border: '1px solid var(--ces-line)',
        borderRadius: 'var(--ces-radius-lg)',
        padding: '20px',
        boxShadow: 'var(--ces-shadow-sm)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: 'var(--ces-muted)' }}>
            Texnika statusu · {total} ədəd
          </p>
          <p className="text-[14px] mt-0.5">
            <span style={{ color: 'var(--ces-muted)' }}>İcarə oranı: </span>
            <span className="font-extrabold num" style={{ color: 'var(--ces-gold-700)' }}>{utilization.toFixed(1)}%</span>
          </p>
        </div>
        <button
          onClick={() => navigate('/garage')}
          className="text-[12.5px] font-bold transition-colors"
          style={{ color: 'var(--ces-graphite)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ces-gold)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ces-graphite)')}
        >
          Detallar →
        </button>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden mb-3" style={{ background: 'var(--ces-graphite-50)' }}>
        {segs.map(({ key, color }) => {
          const pct = (stats[key] / total) * 100
          return pct > 0 ? <div key={key} style={{ width: `${pct}%`, background: color }} /> : null
        })}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {segs.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-[11px]" style={{ color: 'var(--ces-muted)' }}>{label}</span>
            <span className="text-[12px] font-extrabold num" style={{ color: 'var(--ces-ink)' }}>{stats[key] ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────────
   GOAL TRACKER — UI kit `.card-accent` style
─────────────────────────────────────────────── */
function GoalTracker({ summary }) {
  const [target, setTarget] = useState(() => {
    const stored = localStorage.getItem('dashboard_revenue_target')
    return stored ? Number(stored) : 0
  })
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(target.toString())

  const actual = Number(summary?.totalIncome ?? 0)
  const progress = target > 0 ? Math.min((actual / target) * 100, 100) : 0
  const status = progress >= 100 ? 'achieved' : progress >= 75 ? 'on-track' : progress >= 50 ? 'behind' : 'risk'
  const statusColor = status === 'achieved' ? 'var(--ces-ok)' : status === 'on-track' ? 'var(--ces-info)' :
                      status === 'behind' ? 'var(--ces-warn)' : 'var(--ces-danger)'

  const save = () => {
    const v = Number(input) || 0
    setTarget(v)
    localStorage.setItem('dashboard_revenue_target', v.toString())
    setEditing(false)
  }

  return (
    <div
      className="ces-card flex overflow-hidden"
      style={{
        background: 'var(--ces-surface)',
        border: '1px solid var(--ces-line)',
        borderRadius: 'var(--ces-radius-lg)',
        boxShadow: 'var(--ces-shadow-sm)',
      }}
    >
      <div style={{ width: '6px', background: 'var(--ces-gold)' }} />
      <div className="flex-1 p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-[.14em] flex items-center gap-1.5" style={{ color: 'var(--ces-muted)' }}>
            <Target size={12} style={{ color: 'var(--ces-gold)' }} /> Bu ilki gəlir hədəfi
          </span>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-[12px] font-bold transition-colors"
              style={{ color: 'var(--ces-graphite)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ces-gold)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ces-graphite)')}
            >
              <Edit3 size={11} /> Dəyiş
            </button>
          )}
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <div
              className="flex items-center flex-1 px-[13px]"
              style={{
                background: 'var(--ces-surface)',
                border: '1px solid var(--ces-gold)',
                borderRadius: '11px',
                minHeight: '44px',
                boxShadow: '0 0 0 3px var(--ces-gold-100)',
              }}
            >
              <input
                type="number"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Hədəf məbləğ"
                className="flex-1 border-0 outline-0 bg-transparent text-[14px] py-[11px]"
                autoFocus
              />
              <span className="text-[12px] font-bold ml-2" style={{ color: 'var(--ces-muted)' }}>₼</span>
            </div>
            <button
              onClick={save}
              className="px-4 font-bold text-[14px] transition-all"
              style={{
                height: '44px',
                background: 'var(--ces-graphite)',
                color: 'var(--ces-on-primary)',
                borderRadius: '10px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ces-graphite-900)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--ces-graphite)')}
            >
              Saxla
            </button>
            <button
              onClick={() => { setEditing(false); setInput(target.toString()) }}
              className="px-4 font-bold text-[14px] transition-all"
              style={{
                height: '44px',
                background: 'var(--ces-graphite-50)',
                color: 'var(--ces-ink)',
                borderRadius: '10px',
              }}
            >
              Ləğv
            </button>
          </div>
        ) : target === 0 ? (
          <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--ces-muted)' }}>
            <Info size={14} /> Hədəf hələ təyin edilməyib. "Dəyiş" düyməsinə basın.
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-4 mb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.1em]" style={{ color: 'var(--ces-muted)' }}>Cari nəticə</p>
                <p className="text-[26px] font-extrabold tracking-[-.02em] num" style={{ color: 'var(--ces-graphite-900)' }}>
                  {fmtMoney(actual)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold uppercase tracking-[.1em]" style={{ color: 'var(--ces-muted)' }}>Hədəf</p>
                <p className="text-[16px] font-extrabold num" style={{ color: 'var(--ces-graphite)' }}>{fmtMoney(target)}</p>
              </div>
            </div>
            <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: 'var(--ces-graphite-50)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, background: statusColor }}
              />
            </div>
            <div className="flex items-center justify-between text-[11.5px]">
              <Pill tone={status === 'achieved' ? 'ok' : status === 'on-track' ? 'info' : status === 'behind' ? 'warn' : 'danger'} sm>
                {progress.toFixed(1)}%
                {status === 'achieved' && ' · Tamamlandı'}
                {status === 'on-track' && ' · Hədəfdə'}
                {status === 'behind'   && ' · Geridə'}
                {status === 'risk'     && ' · Risk altında'}
              </Pill>
              <span style={{ color: 'var(--ces-muted)' }}>
                {target > actual ? `Qalıq: ${fmtMoney(target - actual)}` : `Üst: ${fmtMoney(actual - target)}`}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────────
   DEADLINE BADGE
─────────────────────────────────────────────── */
function DeadlineBadge({ endDate }) {
  if (!endDate) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const end   = new Date(endDate); end.setHours(0,0,0,0)
  const diff  = Math.ceil((end - today) / 86400000)
  if (diff < 0)   return <Pill tone="danger" sm>Bitib</Pill>
  if (diff === 0) return <Pill tone="danger" sm>Bu gün bitir</Pill>
  if (diff <= 7)  return <Pill tone="warn"   sm>{diff} gün qaldı</Pill>
  if (diff <= 30) return <Pill tone="info"   sm>{diff} gün qaldı</Pill>
  return null
}

/* ───────────────────────────────────────────────
   REQUEST STATUS PILL — UI kit semantic colors
─────────────────────────────────────────────── */
function StatusPill({ status }) {
  const map = {
    DRAFT:               { label: 'Qaralama',          tone: 'muted' },
    PENDING:             { label: 'Gözləmədə',         tone: 'warn' },
    SUBMITTED:           { label: 'Göndərildi',        tone: 'info' },
    SENT_TO_COORDINATOR: { label: 'Koordinatorda',     tone: 'gold' },
    OFFER_SENT:          { label: 'Təklif göndərildi', tone: 'info' },
    ACCEPTED:            { label: 'Qəbul edilib',      tone: 'ok' },
    REJECTED:            { label: 'Rədd edildi',       tone: 'danger' },
  }
  const cfg = map[status] || { label: status, tone: 'muted' }
  return <Pill tone={cfg.tone} sm>{cfg.label}</Pill>
}

/* ───────────────────────────────────────────────
   WIDGET SETTINGS
─────────────────────────────────────────────── */
const DEFAULT_WIDGETS = {
  alerts: true, goal: true, actions: true, finance: true, kpis: true,
  charts: true, top: true, projects: true, requests: true,
  equipment: true, activity: true,
  arAging: true, topCustomers: true, hrSnapshot: true,
}

/* ═══════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════ */
export default function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [projects, setProjects]     = useState([])
  const [summary, setSummary]       = useState(null)
  const [requests, setRequests]     = useState([])
  const [stats, setStats]           = useState(null)
  const [now, setNow]               = useState(new Date())
  const [widgets, setWidgets]       = useState(() => {
    try { return { ...DEFAULT_WIDGETS, ...JSON.parse(localStorage.getItem('dashboard_widgets') || '{}') } }
    catch { return DEFAULT_WIDGETS }
  })
  const [showSettings, setShowSettings] = useState(false)

  const toggleWidget = (key) => {
    setWidgets(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem('dashboard_widgets', JSON.stringify(next))
      return next
    })
  }

  const load = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true)
    try {
      const res  = await axiosInstance.get('/dashboard/stats')
      const data = res.data.data || res.data
      setStats(data)
      setProjects(data.projects || [])
      setSummary(data.accountingSummary || null)
      setRequests(data.requests || [])
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  /* ─── Derived ─── */
  const activeProjects    = projects.filter(p => p.status === 'ACTIVE')
  const completedProjects = projects.filter(p => p.status === 'COMPLETED')
  const pendingRequests   = requests.filter(r => ['DRAFT','PENDING','SENT_TO_COORDINATOR'].includes(r.status))

  const urgentProjects = useMemo(() => activeProjects.filter(p => {
    if (!p.endDate) return false
    const diff = Math.ceil((new Date(p.endDate) - new Date()) / 86400000)
    return diff >= 0 && diff <= 7
  }), [activeProjects])

  const overdueProjects = useMemo(() => activeProjects.filter(p => {
    if (!p.endDate) return false
    return new Date(p.endDate) < new Date()
  }), [activeProjects])

  const topProjects = useMemo(() => {
    return [...completedProjects]
      .filter(p => p.netProfit != null && Number(p.netProfit) > 0)
      .sort((a, b) => Number(b.netProfit ?? 0) - Number(a.netProfit ?? 0))
      .slice(0, 5)
  }, [completedProjects])

  const profitMargin = useMemo(() => {
    if (!summary || !summary.totalIncome || Number(summary.totalIncome) <= 0) return null
    return (Number(summary.netProfit) / Number(summary.totalIncome)) * 100
  }, [summary])

  const equipUtil = useMemo(() => {
    if (!stats) return null
    const total = (stats.availableEquipment ?? 0) + (stats.rentedEquipment ?? 0) +
                  (stats.defectiveEquipment ?? 0) + (stats.outOfServiceEquipment ?? 0)
    return total > 0 ? ((stats.rentedEquipment ?? 0) / total) * 100 : 0
  }, [stats])

  // Last 6 months income for sparkline
  const sparklinePoints = useMemo(() => {
    if (!stats?.invoices) return null
    const now = new Date()
    const buckets = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      buckets.push({ key, total: 0 })
    }
    stats.invoices.forEach(inv => {
      if (!inv.issueDate || !inv.amount) return
      const d = new Date(inv.issueDate)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const b = buckets.find(x => x.key === key)
      if (b) b.total += Number(inv.amount)
    })
    return buckets.map(b => b.total)
  }, [stats])

  const todayStr = now.toLocaleDateString('az-AZ', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
  const timeStr = now.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })

  if (loading) {
    return (
      <div className="ces-font flex items-center justify-center h-64 gap-2" style={{ color: 'var(--ces-muted)' }}>
        <RefreshCw size={18} className="animate-spin" />
        <span className="text-[14px] font-medium">İdarə paneli yüklənir...</span>
      </div>
    )
  }

  /* ─── Alerts (real data) ─── */
  const alerts = []
  if (overdueProjects.length > 0) alerts.push({
    icon: XCircle, tone: 'danger',
    title: `${overdueProjects.length} layihənin müddəti bitib`,
    message: 'Bu layihələr hələ aktivdir — vəziyyəti yoxlayın.',
    onClick: () => navigate('/projects'),
  })
  if (urgentProjects.length > 0) alerts.push({
    icon: AlertTriangle, tone: 'warn',
    title: `${urgentProjects.length} layihənin müddəti 7 gün ərzində bitir`,
    message: 'Tamamlama planını nəzərdən keçirin.',
    onClick: () => navigate('/projects'),
  })
  if (stats?.pendingApprovals > 0) alerts.push({
    icon: ShieldCheck, tone: 'info',
    title: `${stats.pendingApprovals} əməliyyat təsdiqini gözləyir`,
    message: 'Təsdiq növbəsində baxmalı sənədlər var.',
    onClick: () => navigate('/approval'),
  })
  if ((stats?.defectiveEquipment ?? 0) > 0) alerts.push({
    icon: Wrench, tone: 'warn',
    title: `${stats.defectiveEquipment} texnika nasazdır`,
    message: 'Təmir cədvəlinə əlavə edin.',
    onClick: () => navigate('/garage'),
  })

  return (
    <div className="ces-font" style={{ color: 'var(--ces-ink)' }}>

      {/* ══ HEADER ══════════════════════════════════════ */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-[32px] font-extrabold tracking-[-.022em] leading-[1.05]" style={{ color: 'var(--ces-graphite-900)' }}>
            İdarə Paneli
          </h1>
          <p className="text-[13px] mt-1.5 capitalize" style={{ color: 'var(--ces-muted)' }}>
            {todayStr} <span style={{ color: 'var(--ces-mute2)' }}>·</span> {timeStr}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 font-semibold text-[13px] transition-colors disabled:opacity-50"
            style={{
              height: '40px',
              background: 'var(--ces-surface)',
              border: '1px solid var(--ces-line)',
              borderRadius: '10px',
              color: 'var(--ces-graphite)',
            }}
            onMouseEnter={(e) => !refreshing && (e.currentTarget.style.borderColor = 'var(--ces-graphite)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--ces-line)')}
          >
            <RefreshCw size={14} className={clsx(refreshing && 'animate-spin')} />
            Yenilə
          </button>
          <div className="relative">
            <button
              onClick={() => setShowSettings(s => !s)}
              className="grid place-items-center transition-colors"
              style={{
                width: '40px',
                height: '40px',
                background: 'var(--ces-surface)',
                border: '1px solid var(--ces-line)',
                borderRadius: '10px',
                color: 'var(--ces-graphite)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--ces-graphite)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--ces-line)')}
            >
              <Settings size={15} />
            </button>
            {showSettings && (
              <div
                className="ces-card absolute right-0 top-12 z-50 w-[240px] p-3"
                style={{
                  background: 'var(--ces-surface)',
                  border: '1px solid var(--ces-line)',
                  borderRadius: '14px',
                  boxShadow: 'var(--ces-shadow)',
                  maxHeight: '420px',
                  overflowY: 'auto',
                }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[.16em] mb-2" style={{ color: 'var(--ces-muted)' }}>
                  Bölmələr
                </p>
                {[
                  ['alerts',       'Kritik xəbərdarlıqlar'],
                  ['goal',         'Gəlir hədəfi'],
                  ['actions',      'Sürətli əməliyyatlar'],
                  ['finance',      'Maliyyə KPI'],
                  ['kpis',         'Əməliyyat KPI'],
                  ['arAging',      'Borçlular (AR Aging)'],
                  ['charts',       'Qrafiklər'],
                  ['topCustomers', 'Top 5 müştəri'],
                  ['hrSnapshot',   'HR xülasəsi'],
                  ['top',          'Top layihələr'],
                  ['projects',     'Aktiv layihələr'],
                  ['requests',     'Son sorğular'],
                  ['equipment',    'Texnika statusu'],
                  ['activity',     'Son fəaliyyətlər'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 py-1.5 cursor-pointer rounded-lg px-1 transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ces-graphite-50)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <input
                      type="checkbox"
                      checked={widgets[key]}
                      onChange={() => toggleWidget(key)}
                      className="w-3.5 h-3.5"
                      style={{ accentColor: 'var(--ces-gold)' }}
                    />
                    <span className="text-[12.5px]" style={{ color: 'var(--ces-ink)' }}>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ ALERTS ══════════════════════════════════════ */}
      {widgets.alerts && alerts.length > 0 && (
        <div className="flex flex-col gap-2 mb-6">
          {alerts.map((a, i) => <Alert key={i} {...a} />)}
        </div>
      )}

      {/* ══ GOAL TRACKER ════════════════════════════════ */}
      {widgets.goal && <div className="mb-6"><GoalTracker summary={summary} /></div>}

      {/* ══ FINANCE KPIs (UI kit `.kpi-grid` 1.4-1-1-1) ═ */}
      {widgets.finance && summary && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[.16em]" style={{ color: 'var(--ces-muted)' }}>
              Maliyyə göstəriciləri
            </h3>
            <button
              onClick={() => navigate('/accounting')}
              className="text-[12.5px] font-bold transition-colors"
              style={{ color: 'var(--ces-graphite)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ces-gold)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ces-graphite)')}
            >
              Mühasibatlığa keç →
            </button>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr' }}>
            <KpiHero
              label="Ümumi gəlir"
              value={fmtMoney(summary.totalIncome)}
              sub={`${summary.incomeCount ?? 0} qaimə · son 6 ay`}
              sparklinePoints={sparklinePoints}
              trend={stats?.trends?.incomeTrend}
            />
            <KpiCard
              label="Podratçı xərcləri"
              value={fmtMoney(summary.totalContractorExpense)}
              icon={Wallet}
              delta={<span>{summary.contractorExpenseCount ?? 0} qaimə</span>}
            />
            <KpiCard
              label="Şirkət xərcləri"
              value={fmtMoney(summary.totalCompanyExpense)}
              icon={Receipt}
              delta={<span>{summary.companyExpenseCount ?? 0} qaimə</span>}
            />
            <KpiCard
              label="Xalis mənfəət"
              value={fmtMoney(summary.netProfit)}
              icon={PiggyBank}
              iconTone="gold"
              delta={
                <>
                  {stats?.trends?.profitTrend !== null && stats?.trends?.profitTrend !== undefined && (
                    <Pill tone={stats.trends.profitTrend >= 0 ? 'ok' : 'danger'} sm>
                      {stats.trends.profitTrend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {Math.abs(stats.trends.profitTrend).toFixed(1)}%
                    </Pill>
                  )}
                  {profitMargin !== null && (
                    <span style={{ color: 'var(--ces-muted)' }}>marja {profitMargin.toFixed(1)}%</span>
                  )}
                </>
              }
            />
          </div>
        </div>
      )}

      {/* ══ AR AGING ════════════════════════════════════ */}
      {widgets.arAging && stats?.arAging && <div className="mb-6"><ArAgingCard aging={stats.arAging} navigate={navigate} /></div>}

      {/* ══ OPERATIONS KPIs ═════════════════════════════ */}
      {widgets.kpis && stats && (
        <div className="mb-6">
          <h3 className="text-[11px] font-bold uppercase tracking-[.16em] mb-3" style={{ color: 'var(--ces-muted)' }}>
            Əməliyyat göstəriciləri
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Aktiv layihələr" value={stats.activeProjects ?? activeProjects.length} icon={Briefcase} onClick={() => navigate('/projects')} />
            <KpiCard label="Aktiv sorğular" value={stats.activeRequests ?? pendingRequests.length} icon={FileText} onClick={() => navigate('/requests')} />
            <KpiCard label="Təsdiq gözləyən" value={stats.pendingApprovals ?? 0} icon={ShieldCheck} iconTone={stats.pendingApprovals > 0 ? 'gold' : 'default'} onClick={() => navigate('/approval')} />
            <KpiCard label="Aktiv işçilər" value={stats.totalEmployees ?? 0} icon={Users} onClick={() => navigate('/hr')} />
            <KpiCard label="Texnika icarə" value={equipUtil !== null ? `${equipUtil.toFixed(0)}` : '—'} unit="%" icon={Wrench} onClick={() => navigate('/garage')} />
            <KpiCard label="Bitmiş layihələr" value={completedProjects.length} icon={CheckCircle2} onClick={() => navigate('/projects')} />
          </div>
        </div>
      )}

      {/* ══ BUSINESS ENTITIES ═══════════════════════════ */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <KpiCard label="Müştərilər"  value={stats.totalCustomers}   icon={UserPlus}  onClick={() => navigate('/customers')} />
          <KpiCard label="Podratçılar" value={stats.totalContractors} icon={Building2} onClick={() => navigate('/contractors')} />
          <KpiCard label="İnvestorlar" value={stats.totalInvestors}   icon={Crown}     iconTone="gold" onClick={() => navigate('/investors')} />
          <KpiCard label="Operatorlar" value={stats.totalOperators}   icon={HardHat}   onClick={() => navigate('/operators')} />
        </div>
      )}

      {/* ══ QUICK ACTIONS (.card-action dashed) ════════ */}
      {widgets.actions && (
        <div className="mb-6">
          <h3 className="text-[11px] font-bold uppercase tracking-[.16em] mb-3 flex items-center gap-1.5" style={{ color: 'var(--ces-muted)' }}>
            <Sparkles size={12} style={{ color: 'var(--ces-gold)' }} /> Sürətli əməliyyatlar
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <QuickAction icon={Plus} label="Yeni layihə" accent onClick={() => navigate('/projects')} />
            <QuickAction icon={FileText} label="Yeni sorğu" onClick={() => navigate('/requests')} />
            <QuickAction icon={UserPlus} label="Yeni müştəri" onClick={() => navigate('/customers')} />
            <QuickAction icon={Building2} label="Podratçı" onClick={() => navigate('/contractors')} />
            <QuickAction icon={HardHat} label="Operator" onClick={() => navigate('/operators')} />
            <QuickAction icon={Receipt} label="Sənəd" onClick={() => navigate('/accounting')} />
            <QuickAction icon={Users} label="HR" onClick={() => navigate('/hr')} />
            <QuickAction icon={Wrench} label="Texnika" onClick={() => navigate('/garage')} />
          </div>
        </div>
      )}

      {/* ══ EQUIPMENT ═══════════════════════════════════ */}
      {widgets.equipment && stats && <div className="mb-6"><EquipmentBar stats={stats} navigate={navigate} /></div>}

      {/* ══ CHARTS ══════════════════════════════════════ */}
      {widgets.charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div
            className="ces-card"
            style={{
              background: 'var(--ces-surface)',
              border: '1px solid var(--ces-line)',
              borderRadius: 'var(--ces-radius-lg)',
              padding: '20px',
              boxShadow: 'var(--ces-shadow-sm)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: 'var(--ces-muted)' }}>
                Aylıq gəlir (son 6 ay)
              </span>
              <span className="text-[10.5px] font-mono" style={{ color: 'var(--ces-mute2)' }}>AZN</span>
            </div>
            <RevenueBarChart invoices={stats?.invoices} />
          </div>
          <div
            className="ces-card"
            style={{
              background: 'var(--ces-surface)',
              border: '1px solid var(--ces-line)',
              borderRadius: 'var(--ces-radius-lg)',
              padding: '20px',
              boxShadow: 'var(--ces-shadow-sm)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: 'var(--ces-muted)' }}>
                Layihə statusu
              </span>
              <span className="text-[10.5px] font-mono" style={{ color: 'var(--ces-mute2)' }}>{projects.length} layihə</span>
            </div>
            <ProjectStatusChart projects={projects} />
          </div>
        </div>
      )}

      {/* ══ TOP CUSTOMERS + HR SNAPSHOT ═════════════════ */}
      {(widgets.topCustomers || widgets.hrSnapshot) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {widgets.topCustomers && <TopCustomersCard customers={stats?.topCustomers} navigate={navigate} />}
          {widgets.hrSnapshot   && <HrSnapshotCard hr={stats?.hrSnapshot} navigate={navigate} />}
        </div>
      )}

      {/* ══ TOP PROJECTS — UI kit `.tbl` ════════════════ */}
      {widgets.top && topProjects.length > 0 && (
        <div
          className="ces-card overflow-hidden mb-6"
          style={{
            background: 'var(--ces-surface)',
            border: '1px solid var(--ces-line)',
            borderRadius: 'var(--ces-radius-lg)',
            boxShadow: 'var(--ces-shadow-sm)',
          }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--ces-line)' }}>
            <span className="text-[11px] font-bold uppercase tracking-[.14em] flex items-center gap-1.5" style={{ color: 'var(--ces-muted)' }}>
              <Award size={13} style={{ color: 'var(--ces-gold)' }} /> Ən mənfəətli layihələr
            </span>
            <button
              onClick={() => navigate('/projects')}
              className="text-[12.5px] font-bold transition-colors"
              style={{ color: 'var(--ces-graphite)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ces-gold)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ces-graphite)')}
            >
              Hamısı →
            </button>
          </div>
          <table className="w-full text-[13.5px]">
            <thead>
              <tr>
                {['#', 'Kod', 'Müştəri', 'Xalis gəlir'].map((h, i) => (
                  <th
                    key={h}
                    className="text-[11.5px] font-bold uppercase tracking-[.1em] px-5 py-3"
                    style={{
                      color: 'var(--ces-muted)',
                      borderBottom: '1px solid var(--ces-line)',
                      textAlign: i === 3 ? 'right' : 'left',
                      width: i === 0 ? '60px' : 'auto',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProjects.map((p, i) => (
                <tr
                  key={p.id}
                  className="cursor-pointer transition-colors"
                  onClick={() => navigate('/projects')}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ces-graphite-50)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="px-5 py-3.5" style={{ borderBottom: i < topProjects.length - 1 ? '1px solid var(--ces-line-2)' : 'none' }}>
                    <span
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-extrabold"
                      style={{
                        background: i === 0 ? 'var(--ces-gold-100)' : i === 1 ? 'var(--ces-graphite-100)' : i === 2 ? 'rgba(200,147,42,.06)' : 'var(--ces-graphite-50)',
                        color: i === 0 ? 'var(--ces-gold-700)' : i === 1 ? 'var(--ces-graphite)' : i === 2 ? 'var(--ces-gold-700)' : 'var(--ces-muted)',
                      }}
                    >{i + 1}</span>
                  </td>
                  <td className="px-5 py-3.5" style={{ borderBottom: i < topProjects.length - 1 ? '1px solid var(--ces-line-2)' : 'none' }}>
                    <span className="font-mono font-extrabold text-[12.5px]" style={{ color: 'var(--ces-graphite)' }}>
                      {p.projectCode || `PRJ-${String(p.id).padStart(3, '0')}`}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--ces-ink)', borderBottom: i < topProjects.length - 1 ? '1px solid var(--ces-line-2)' : 'none' }}>
                    {p.companyName || '—'}
                  </td>
                  <td
                    className="px-5 py-3.5 text-right num font-extrabold"
                    style={{
                      color: Number(p.netProfit ?? 0) >= 0 ? 'var(--ces-ok)' : 'var(--ces-danger)',
                      borderBottom: i < topProjects.length - 1 ? '1px solid var(--ces-line-2)' : 'none',
                    }}
                  >
                    {Number(p.netProfit ?? 0) >= 0 ? '+' : ''}{fmt(p.netProfit)} ₼
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ══ PROJECTS + REQUESTS ═════════════════════════ */}
      {(widgets.projects || widgets.requests) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {widgets.projects && (
            <ListCard
              title="Aktiv layihələr"
              icon={Briefcase}
              iconColor="var(--ces-gold-700)"
              iconBg="var(--ces-gold-100)"
              count={activeProjects.length}
              emptyIcon={Briefcase}
              emptyText="Aktiv layihə yoxdur"
              onSeeAll={() => navigate('/projects')}
              items={activeProjects.slice(0, 5).map(p => ({
                id: p.id,
                title: p.companyName || '—',
                subtitle: p.projectCode || `PRJ-${String(p.id).padStart(3,'0')}`,
                right: (
                  <div className="text-right">
                    <p className="text-[11.5px]" style={{ color: 'var(--ces-muted)' }}>{fmtDate(p.endDate)}</p>
                    <div className="mt-0.5"><DeadlineBadge endDate={p.endDate} /></div>
                  </div>
                ),
                onClick: () => navigate('/projects'),
              }))}
            />
          )}
          {widgets.requests && (
            <ListCard
              title="Gözləmədə olan sorğular"
              icon={Clock}
              iconColor="var(--ces-warn)"
              iconBg="var(--ces-warn-100)"
              count={pendingRequests.length}
              emptyIcon={Clock}
              emptyText="Gözləmədə sorğu yoxdur"
              onSeeAll={() => navigate('/requests')}
              items={pendingRequests.slice(0, 5).map(r => ({
                id: r.id,
                title: r.companyName || '—',
                subtitle: `REQ-${String(r.id).padStart(3,'0')}`,
                right: <StatusPill status={r.status} />,
                onClick: () => navigate('/requests'),
              }))}
            />
          )}
        </div>
      )}

      {/* ══ ACTIVITY FEED ═══════════════════════════════ */}
      {widgets.activity && (
        <div
          className="ces-card"
          style={{
            background: 'var(--ces-surface)',
            border: '1px solid var(--ces-line)',
            borderRadius: 'var(--ces-radius-lg)',
            padding: '20px',
            boxShadow: 'var(--ces-shadow-sm)',
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[.14em] mb-3 flex items-center gap-2" style={{ color: 'var(--ces-muted)' }}>
            <span className="inline-grid place-items-center" style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--ces-gold-100)', color: 'var(--ces-gold-700)' }}>
              <Activity size={12} />
            </span>
            Son fəaliyyətlər
          </p>
          <ActivityFeed />
        </div>
      )}

    </div>
  )
}

/* ───────────────────────────────────────────────
   LIST CARD — Active projects + Pending requests
─────────────────────────────────────────────── */
function ListCard({ title, icon: Icon, iconColor = 'var(--ces-graphite)', iconBg = 'var(--ces-graphite-50)', count, emptyIcon: EmptyIcon, emptyText, items, onSeeAll }) {
  return (
    <div
      className="ces-card overflow-hidden"
      style={{
        background: 'var(--ces-surface)',
        border: '1px solid var(--ces-line)',
        borderRadius: 'var(--ces-radius-lg)',
        boxShadow: 'var(--ces-shadow-sm)',
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--ces-line)' }}
      >
        <span className="text-[11px] font-bold uppercase tracking-[.14em] flex items-center gap-2" style={{ color: 'var(--ces-muted)' }}>
          {Icon && (
            <span className="inline-grid place-items-center" style={{ width: 22, height: 22, borderRadius: 7, background: iconBg, color: iconColor }}>
              <Icon size={12} />
            </span>
          )}
          {title}
        </span>
        <span
          className="inline-flex items-center justify-center text-[11px] font-bold num"
          style={{
            minWidth: 22,
            height: 22,
            padding: '0 8px',
            borderRadius: 999,
            background: count > 0 ? 'var(--ces-graphite)' : 'var(--ces-graphite-100)',
            color: count > 0 ? 'var(--ces-gold)' : 'var(--ces-muted)',
          }}
        >
          {count}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="py-12 px-4 text-center">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-3 grid place-items-center"
            style={{ background: iconBg, color: iconColor }}
          >
            {EmptyIcon && <EmptyIcon size={22} />}
          </div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--ces-ink)' }}>{emptyText}</p>
        </div>
      ) : (
        <>
          {items.map((it, i) => (
            <button
              key={it.id}
              onClick={it.onClick}
              className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors"
              style={{
                borderBottom: i < items.length - 1 ? '1px solid var(--ces-line-2)' : 'none',
                background: 'transparent',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ces-graphite-50)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-bold truncate" style={{ color: 'var(--ces-ink)' }}>{it.title}</p>
                <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--ces-mute2)' }}>{it.subtitle}</p>
              </div>
              <div className="shrink-0 ml-3">{it.right}</div>
            </button>
          ))}
          <button
            onClick={onSeeAll}
            className="w-full py-3 text-[12px] font-bold transition-colors"
            style={{
              borderTop: '1px solid var(--ces-line)',
              background: 'var(--ces-graphite-50)',
              color: 'var(--ces-muted)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ces-graphite-100)'
              e.currentTarget.style.color = 'var(--ces-graphite)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--ces-graphite-50)'
              e.currentTarget.style.color = 'var(--ces-muted)'
            }}
          >
            Hamısına bax →
          </button>
        </>
      )}
    </div>
  )
}
