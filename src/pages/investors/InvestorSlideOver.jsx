import { useState, useEffect } from 'react'
import {
  X, Pencil, Trash2, Building2, History, FileText, Truck,
  ChevronDown, ChevronUp, FolderKanban, Calendar, Banknote,
  TrendingDown, CheckCircle2, Clock, AlertCircle, Star,
} from 'lucide-react'
import { clsx } from 'clsx'
import ActivityFeed from '../../components/common/ActivityFeed'
import { garageApi } from '../../api/garage'
import { investorsApi } from '../../api/investors'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { fmtDate } from '../../utils/date'

/* ─── Helpers ─── */
const fmt = (d) => fmtDate(d) === '—' ? null : fmtDate(d)
const fmtMoney = (v) => v != null ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼' : null

/* ─── UI kit `.pill` semantic ─── */
const PILL_STYLES = {
  ok:     { bg: 'var(--ces-ok-100)',                color: 'var(--ces-ok)' },
  warn:   { bg: 'var(--ces-warn-100)',                color: 'var(--ces-warn)' },
  danger: { bg: 'var(--ces-danger-100)',                color: 'var(--ces-danger)' },
  info:   { bg: 'var(--ces-info-100)',                color: 'var(--ces-info)' },
  gold:   { bg: 'var(--ces-gold-100)',    color: 'var(--ces-gold-700)' },
  muted:  { bg: 'var(--ces-graphite-100)',color: 'var(--ces-muted)' },
}

function Pill({ tone = 'muted', children, dot, sm }) {
  const s = PILL_STYLES[tone] || PILL_STYLES.muted
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-bold tracking-tight',
        sm ? 'px-2 py-[3px] text-[11px]' : 'px-2.5 py-1 text-[12px]'
      )}
      style={{ background: s.bg, color: s.color }}
    >
      {children}
    </span>
  )
}

const RISK_CONFIG = {
  LOW:    { label: 'Aşağı',  tone: 'ok' },
  MEDIUM: { label: 'Orta',   tone: 'warn' },
  HIGH:   { label: 'Yüksək', tone: 'danger' },
}
const STATUS_CONFIG = {
  ACTIVE:   { label: 'Aktiv',   tone: 'ok' },
  INACTIVE: { label: 'Deaktiv', tone: 'muted' },
}
const PAYMENT_LABEL = { CASH: 'Nağd', TRANSFER: 'Köçürmə' }

const EQUIPMENT_STATUS = {
  AVAILABLE:      { label: 'Mövcud',      tone: 'ok' },
  IN_USE:         { label: 'İstifadədə',  tone: 'info' },
  UNDER_REPAIR:   { label: 'Təmirdə',     tone: 'warn' },
  DECOMMISSIONED: { label: 'Silinmiş',    tone: 'muted' },
}

const PROJECT_STATUS = {
  PENDING:   { label: 'Gözləmədə',   tone: 'warn' },
  ACTIVE:    { label: 'Aktiv',       tone: 'info' },
  COMPLETED: { label: 'Tamamlandı',  tone: 'ok' },
  CANCELLED: { label: 'Ləğv edildi', tone: 'muted' },
}

const TABS = [
  { id: 'info',      label: 'Məlumat',         icon: Building2 },
  { id: 'equipment', label: 'Texnikalar',      icon: Truck },
  { id: 'invoices',  label: 'Qaimələr',        icon: TrendingDown },
  { id: 'payments',  label: 'Ödənişlər',       icon: Banknote },
  { id: 'projects',  label: 'Layihə tarixçəsi', icon: FolderKanban },
  { id: 'history',   label: 'Audit',            icon: History },
]

/* ─── Reusable building blocks ─── */
function Field({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[.14em] mb-1" style={{ color: 'var(--ces-muted)' }}>{label}</p>
      <p className="text-[13.5px] font-medium" style={{ color: 'var(--ces-ink)' }}>{value}</p>
    </div>
  )
}

function RatingStars({ rating }) {
  if (rating == null) return null
  const val = parseFloat(rating)
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={16}
          style={{
            fill: i <= Math.round(val) ? 'var(--ces-gold)' : 'var(--ces-graphite-100)',
            color: i <= Math.round(val) ? 'var(--ces-gold)' : 'var(--ces-graphite-100)',
          }}
        />
      ))}
      <span className="text-[13px] font-extrabold num ml-1" style={{ color: 'var(--ces-ink)' }}>
        {val.toFixed(1)}
      </span>
    </div>
  )
}

function EmptyTab({ icon: Icon, message }) {
  return (
    <div className="text-center py-14 px-4">
      <div
        className="w-12 h-12 rounded-2xl mx-auto mb-3 grid place-items-center"
        style={{ background: 'var(--ces-graphite-50)' }}
      >
        {Icon && <Icon size={20} style={{ color: 'var(--ces-mute2)' }} />}
      </div>
      <p className="text-[13px] font-semibold" style={{ color: 'var(--ces-ink)' }}>{message}</p>
    </div>
  )
}

function LoadingSkeleton({ rows = 3, h = 56 }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl animate-pulse"
          style={{ height: `${h}px`, background: 'var(--ces-graphite-50)' }}
        />
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════ */
export default function InvestorSlideOver({ investor, onClose, onEdit, onDelete }) {
  const [tab, setTab] = useState('info')
  const [equipment, setEquipment] = useState([])
  const [eqLoading, setEqLoading] = useState(false)
  const [expandedEq, setExpandedEq] = useState(null)
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [invoices, setInvoices] = useState([])
  const [invLoading, setInvLoading] = useState(false)
  const [payables, setPayables] = useState([])
  const [payLoading, setPayLoading] = useState(false)
  useEscapeKey(onClose)

  const risk   = RISK_CONFIG[investor.riskLevel] || RISK_CONFIG.LOW
  const status = STATUS_CONFIG[investor.status]  || STATUS_CONFIG.ACTIVE

  useEffect(() => {
    if (tab !== 'equipment') return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEqLoading(true)
    garageApi.getByInvestor({ voen: investor.voen || undefined, name: investor.companyName || undefined })
      .then(r => { if (!cancelled) setEquipment(r.data.data || r.data || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setEqLoading(false) })
    return () => { cancelled = true }
  }, [tab, investor.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab !== 'projects') return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjectsLoading(true)
    investorsApi.getProjectHistory(investor.id)
      .then(r => { if (!cancelled) setProjects(r.data.data || r.data || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setProjectsLoading(false) })
    return () => { cancelled = true }
  }, [tab, investor.id])

  useEffect(() => {
    if (tab !== 'invoices') return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInvLoading(true)
    investorsApi.getInvoices(investor.id)
      .then(r => { if (!cancelled) setInvoices(r.data.data || r.data || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setInvLoading(false) })
    return () => { cancelled = true }
  }, [tab, investor.id])

  useEffect(() => {
    if (tab !== 'payments') return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPayLoading(true)
    investorsApi.getPayables(investor.id)
      .then(r => { if (!cancelled) setPayables(r.data.data || r.data || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setPayLoading(false) })
    return () => { cancelled = true }
  }, [tab, investor.id])

  const initial = (investor.companyName || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(26,26,26,.4)', backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />

      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[560px] flex flex-col"
        style={{
          background: 'var(--ces-surface)',
          boxShadow: 'var(--ces-shadow-lg)',
        }}
      >
        {/* ═══════ HEADER ═══════ */}
        <div
          className="flex items-start gap-3 px-6 py-5 shrink-0"
          style={{ borderBottom: '1px solid var(--ces-line)' }}
        >
          <div
            className="w-12 h-12 rounded-[12px] grid place-items-center flex-none font-extrabold text-[16px]"
            style={{ background: 'var(--ces-graphite)', color: 'var(--ces-gold)' }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] mb-1" style={{ color: 'var(--ces-gold)' }}>
              İnvestor
            </p>
            <h2 className="text-[18px] font-extrabold leading-tight truncate" style={{ color: 'var(--ces-ink)' }}>
              {investor.companyName}
            </h2>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Pill tone={status.tone} sm dot>{status.label}</Pill>
              <Pill tone={risk.tone} sm dot>{risk.label} risk</Pill>
              {investor.voen && (
                <span className="text-[11px] font-mono" style={{ color: 'var(--ces-muted)' }}>
                  VÖEN {investor.voen}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <button onClick={onEdit} className="ces-row-act gold" title="Redaktə et">
                <Pencil size={15} />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="ces-row-act danger" title="Sil">
                <Trash2 size={15} />
              </button>
            )}
            <button onClick={onClose} className="ces-row-act" title="Bağla">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ═══════ TABS — UI kit `.tabs` ═══════ */}
        <div
          className="flex gap-0 px-4 shrink-0 overflow-x-auto scrollbar-thin"
          style={{ borderBottom: '1px solid var(--ces-line)' }}
        >
          {TABS.map(t => {
            const Icon = t.icon
            const on = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 text-[13px] font-semibold transition-colors whitespace-nowrap"
                style={{
                  padding: '12px 14px',
                  marginBottom: '-1px',
                  color: on ? 'var(--ces-graphite)' : 'var(--ces-muted)',
                  borderBottom: `2px solid ${on ? 'var(--ces-gold)' : 'transparent'}`,
                }}
                onMouseEnter={(e) => { if (!on) e.currentTarget.style.color = 'var(--ces-graphite)' }}
                onMouseLeave={(e) => { if (!on) e.currentTarget.style.color = 'var(--ces-muted)' }}
              >
                <Icon size={13} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* ═══════ TAB CONTENT ═══════ */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">

          {/* ── INFO ── */}
          {tab === 'info' && (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <Field label="Şirkət adı" value={investor.companyName} />
                <Field label="VÖEN" value={investor.voen} />
                <Field label="Əlaqə şəxsi" value={investor.contactPerson} />
                <Field label="Telefon" value={investor.contactPhone} />
                <div className="col-span-2">
                  <Field label="Ünvan" value={investor.address} />
                </div>
                {investor.paymentType && (
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-[.14em] mb-2" style={{ color: 'var(--ces-muted)' }}>
                      Ödəniş növləri
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {investor.paymentType.split(',').filter(Boolean).map(pt => (
                        <span
                          key={pt}
                          className="text-[12px] font-semibold"
                          style={{
                            padding: '5px 12px',
                            borderRadius: '7px',
                            background: 'var(--ces-graphite-50)',
                            color: 'var(--ces-graphite)',
                            border: '1px solid var(--ces-line)',
                          }}
                        >
                          {PAYMENT_LABEL[pt] || pt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {investor.rating != null && (
                <div
                  className="flex items-center justify-between"
                  style={{ borderTop: '1px solid var(--ces-line)', paddingTop: '20px' }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: 'var(--ces-muted)' }}>
                    Reytinq
                  </p>
                  <RatingStars rating={investor.rating} />
                </div>
              )}

              {investor.notes && (
                <div style={{ borderTop: '1px solid var(--ces-line)', paddingTop: '20px' }}>
                  <p className="text-[10px] font-bold uppercase tracking-[.14em] mb-2" style={{ color: 'var(--ces-muted)' }}>
                    Qeyd
                  </p>
                  <p
                    className="text-[13px] leading-relaxed whitespace-pre-wrap"
                    style={{ color: 'var(--ces-ink)' }}
                  >
                    {investor.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── EQUIPMENT ── */}
          {tab === 'equipment' && (
            eqLoading ? <LoadingSkeleton rows={3} h={64} /> :
            equipment.length === 0 ? <EmptyTab icon={Truck} message="Bu investora aid texnika tapılmadı" /> :
            <div className="p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[.14em] mb-2 px-1" style={{ color: 'var(--ces-muted)' }}>
                {equipment.length} texnika
              </p>
              {equipment.map(eq => {
                const st = EQUIPMENT_STATUS[eq.status] || EQUIPMENT_STATUS.AVAILABLE
                const isOpen = expandedEq === eq.id
                return (
                  <div
                    key={eq.id}
                    className="overflow-hidden"
                    style={{
                      borderRadius: '12px',
                      border: '1px solid var(--ces-line)',
                      background: 'var(--ces-surface)',
                    }}
                  >
                    <div
                      onClick={() => setExpandedEq(isOpen ? null : eq.id)}
                      className="flex items-center gap-3 p-3 cursor-pointer transition-colors"
                      style={{ background: isOpen ? 'var(--ces-graphite-50)' : 'var(--ces-surface)' }}
                      onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = 'var(--ces-graphite-50)' }}
                      onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.background = 'var(--ces-surface)' }}
                    >
                      <div
                        className="w-8 h-8 rounded-[8px] grid place-items-center flex-none"
                        style={{ background: 'var(--ces-gold-100)', color: 'var(--ces-gold-700)' }}
                      >
                        <Truck size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-bold truncate" style={{ color: 'var(--ces-ink)' }}>{eq.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-mono" style={{ color: 'var(--ces-muted)' }}>{eq.equipmentCode}</span>
                          {eq.type && <span className="text-[11px]" style={{ color: 'var(--ces-mute2)' }}>· {eq.type}</span>}
                        </div>
                      </div>
                      <Pill tone={st.tone} sm dot>{st.label}</Pill>
                      {isOpen
                        ? <ChevronUp size={14} style={{ color: 'var(--ces-mute2)' }} />
                        : <ChevronDown size={14} style={{ color: 'var(--ces-mute2)' }} />}
                    </div>

                    {isOpen && (
                      <div
                        className="p-4 grid grid-cols-2 gap-x-4 gap-y-3"
                        style={{ borderTop: '1px solid var(--ces-line)', background: 'var(--ces-surface)' }}
                      >
                        {[
                          ['Növ', eq.type],
                          ['Brend / Model', [eq.brand, eq.model].filter(Boolean).join(' / ') || null],
                          ['Seriya', eq.serialNumber],
                          ['İstehsal ili', eq.manufactureYear ? String(eq.manufactureYear) : null],
                          ['Qeydiyyat', eq.plateNumber],
                          ['Çəki (ton)', eq.weightTon != null ? String(eq.weightTon) : null],
                          ['Saat/KM', eq.hourKmCounter != null ? String(eq.hourKmCounter) : null],
                          ['Moto saatlar', eq.motoHours != null ? String(eq.motoHours) : null],
                          ['Alınma tarixi', eq.purchaseDate ? fmt(eq.purchaseDate) : null],
                          ['Alış qiyməti', eq.purchasePrice != null ? fmtMoney(eq.purchasePrice) : null],
                          ['Bazar dəyəri', eq.currentMarketValue != null ? fmtMoney(eq.currentMarketValue) : null],
                          ['Saxlanma yeri', eq.storageLocation],
                          ['Məsul şəxs', eq.responsibleUserName],
                          ['Son baxış', eq.lastInspectionDate ? fmt(eq.lastInspectionDate) : null],
                          ['Növbəti baxış', eq.nextInspectionDate ? fmt(eq.nextInspectionDate) : null],
                        ].filter((p) => p[1]).map(([label, val]) => (
                          <div key={label}>
                            <p className="text-[9px] font-bold uppercase tracking-[.14em]" style={{ color: 'var(--ces-muted)' }}>{label}</p>
                            <p className="text-[12px] font-semibold mt-0.5" style={{ color: 'var(--ces-ink)' }}>{val}</p>
                          </div>
                        ))}
                        {eq.notes && (
                          <div className="col-span-2 pt-3" style={{ borderTop: '1px solid var(--ces-line)' }}>
                            <p className="text-[9px] font-bold uppercase tracking-[.14em] mb-1" style={{ color: 'var(--ces-muted)' }}>Qeyd</p>
                            <p className="text-[12px] whitespace-pre-wrap" style={{ color: 'var(--ces-ink)' }}>{eq.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── INVOICES ── */}
          {tab === 'invoices' && (
            invLoading ? <LoadingSkeleton rows={3} h={52} /> :
            invoices.length === 0 ? <EmptyTab icon={FileText} message="Bu investor üçün hələ qaimə yoxdur" /> :
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: 'var(--ces-muted)' }}>
                  {invoices.length} qaimə
                </span>
                <span className="text-[12.5px] font-extrabold num" style={{ color: 'var(--ces-gold-700)' }}>
                  {fmtMoney(invoices.reduce((s, i) => s + parseFloat(i.amount || 0), 0))}
                </span>
              </div>
              {invoices.map(inv => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 p-3"
                  style={{
                    borderRadius: '12px',
                    background: 'var(--ces-gold-50)',
                    border: '1px solid var(--ces-gold-100)',
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12.5px] font-mono font-bold" style={{ color: 'var(--ces-ink)' }}>
                        {inv.invoiceNumber || inv.accountingId || '—'}
                      </span>
                      <span className="text-[11px]" style={{ color: 'var(--ces-muted)' }}>
                        {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('az-AZ') : '—'}
                      </span>
                      {inv.status === 'APPROVED' && <Pill tone="ok" sm>Təsdiqləndi</Pill>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {inv.equipmentName && <span className="text-[11px] truncate" style={{ color: 'var(--ces-mute2)' }}>{inv.equipmentName}</span>}
                      {inv.projectCode && <span className="text-[11px] font-mono font-semibold" style={{ color: 'var(--ces-info)' }}>{inv.projectCode}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[14px] font-extrabold num" style={{ color: 'var(--ces-gold-700)' }}>{fmtMoney(inv.amount)}</p>
                    {inv.paidAmount != null && parseFloat(inv.paidAmount) > 0 && (
                      <p className="text-[10.5px] font-semibold num" style={{ color: 'var(--ces-ok)' }}>
                        ödəndi: {fmtMoney(inv.paidAmount)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── PAYMENTS ── */}
          {tab === 'payments' && (
            payLoading ? <LoadingSkeleton rows={3} h={88} /> :
            payables.length === 0 ? <EmptyTab icon={Banknote} message="Bu investor üçün hələ ödəniş yoxdur" /> :
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: 'var(--ces-muted)' }}>
                  {payables.length} ödəniş
                </span>
                <span className="text-[12.5px] font-extrabold num" style={{ color: 'var(--ces-ok)' }}>
                  ödəndi: {fmtMoney(payables.reduce((s, p) => s + parseFloat(p.paidAmount || 0), 0))}
                </span>
              </div>
              {payables.map(p => {
                const remaining = parseFloat(p.totalAmount || 0) - parseFloat(p.paidAmount || 0)
                const statusCfg = {
                  PENDING:   { icon: Clock,        tone: 'warn',   label: 'Gözləyir' },
                  PARTIAL:   { icon: AlertCircle,  tone: 'info',   label: 'Qismən' },
                  COMPLETED: { icon: CheckCircle2, tone: 'ok',     label: 'Tamamlandı' },
                  OVERDUE:   { icon: AlertCircle,  tone: 'danger', label: 'Gecikmiş' },
                }[p.status] || { icon: Clock, tone: 'muted', label: p.status }
                const StatusIcon = statusCfg.icon
                return (
                  <div
                    key={p.id}
                    className="p-3.5 space-y-2.5"
                    style={{
                      borderRadius: '12px',
                      border: '1px solid var(--ces-line)',
                      background: 'var(--ces-surface)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {p.projectCode && <p className="text-[12.5px] font-mono font-bold" style={{ color: 'var(--ces-ink)' }}>{p.projectCode}</p>}
                        {p.projectName && <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--ces-muted)' }}>{p.projectName}</p>}
                        {p.equipmentName && <p className="text-[11px] mt-0.5" style={{ color: 'var(--ces-mute2)' }}>{p.equipmentName}</p>}
                      </div>
                      <Pill tone={statusCfg.tone} sm>
                        <StatusIcon size={11} /> {statusCfg.label}
                      </Pill>
                    </div>
                    <div className="flex items-center gap-5 flex-wrap">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[.14em]" style={{ color: 'var(--ces-muted)' }}>Cəmi</p>
                        <p className="text-[13px] font-extrabold num mt-0.5" style={{ color: 'var(--ces-ink)' }}>{fmtMoney(p.totalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[.14em]" style={{ color: 'var(--ces-muted)' }}>Ödənilib</p>
                        <p className="text-[13px] font-extrabold num mt-0.5" style={{ color: 'var(--ces-ok)' }}>{fmtMoney(p.paidAmount)}</p>
                      </div>
                      {remaining > 0.01 && (
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-[.14em]" style={{ color: 'var(--ces-muted)' }}>Qalıq</p>
                          <p className="text-[13px] font-extrabold num mt-0.5" style={{ color: 'var(--ces-danger)' }}>{fmtMoney(remaining)}</p>
                        </div>
                      )}
                    </div>
                    {p.payments && p.payments.length > 0 && (
                      <div className="pt-2 space-y-1" style={{ borderTop: '1px solid var(--ces-line)' }}>
                        {p.payments.map((pay, pi) => (
                          <div key={pi} className="flex items-center justify-between text-[11px]">
                            <span style={{ color: 'var(--ces-mute2)' }}>
                              {pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString('az-AZ') : '—'}
                              {pay.note ? ` · ${pay.note}` : ''}
                            </span>
                            <span className="font-extrabold num" style={{ color: 'var(--ces-ok)' }}>{fmtMoney(pay.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── PROJECTS ── */}
          {tab === 'projects' && (
            projectsLoading ? <LoadingSkeleton rows={3} h={120} /> :
            projects.length === 0 ? <EmptyTab icon={FolderKanban} message="Bu investorun texnikaları heç bir layihədə iştirak etməyib" /> :
            <div className="p-4 space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[.14em] mb-1 px-1" style={{ color: 'var(--ces-muted)' }}>
                {projects.length} layihə
              </p>
              {projects.map((p, i) => {
                const ps = PROJECT_STATUS[p.status] || PROJECT_STATUS.PENDING
                return (
                  <div
                    key={i}
                    className="p-3.5 space-y-2.5"
                    style={{
                      borderRadius: '12px',
                      border: '1px solid var(--ces-line)',
                      background: 'var(--ces-surface)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-bold truncate" style={{ color: 'var(--ces-ink)' }}>{p.companyName || '—'}</p>
                        {p.projectName && <p className="text-[12px] truncate" style={{ color: 'var(--ces-muted)' }}>{p.projectName}</p>}
                      </div>
                      <Pill tone={ps.tone} sm dot>{ps.label}</Pill>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {p.projectCode && <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--ces-graphite)' }}>{p.projectCode}</span>}
                      {p.requestCode && <span className="text-[11px] font-mono" style={{ color: 'var(--ces-muted)' }}>{p.requestCode}</span>}
                      {p.region && <span className="text-[11px]" style={{ color: 'var(--ces-mute2)' }}>· {p.region}</span>}
                    </div>
                    {(p.equipmentName || p.equipmentCode) && (
                      <div className="flex items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--ces-ink)' }}>
                        <Truck size={12} style={{ color: 'var(--ces-gold)' }} />
                        <span className="font-medium truncate">{p.equipmentName}</span>
                        {p.equipmentCode && <span className="text-[11px] font-mono" style={{ color: 'var(--ces-mute2)' }}>({p.equipmentCode})</span>}
                      </div>
                    )}
                    <div
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2"
                      style={{ borderTop: '1px solid var(--ces-line)' }}
                    >
                      {(p.startDate || p.endDate) && (
                        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ces-muted)' }}>
                          <Calendar size={11} />
                          <span>
                            {p.startDate ? new Date(p.startDate).toLocaleDateString('az-AZ') : '?'} — {p.endDate ? new Date(p.endDate).toLocaleDateString('az-AZ') : '?'}
                          </span>
                          {p.dayCount && <span style={{ color: 'var(--ces-mute2)' }}>({p.dayCount} gün)</span>}
                        </div>
                      )}
                      {p.equipmentPriceTotal != null && (
                        <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold num" style={{ color: 'var(--ces-gold-700)' }}>
                          <Banknote size={11} />
                          {parseFloat(p.equipmentPriceTotal).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
                        </div>
                      )}
                      {p.operatorName && (
                        <span className="text-[11px]" style={{ color: 'var(--ces-muted)' }}>Operator: <span className="font-semibold" style={{ color: 'var(--ces-ink)' }}>{p.operatorName}</span></span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── HISTORY ── */}
          {tab === 'history' && (
            <div className="p-4">
              <ActivityFeed entityType="İNVESTOR" entityId={investor.id} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
