import { useState, useEffect } from 'react'
import {
  X, Star, TrendingDown, FileText, History,
  Building2, Pencil, Trash2, Truck, ChevronDown, ChevronUp,
  FolderKanban, Calendar, Banknote, CheckCircle2, Clock, AlertCircle,
} from 'lucide-react'
import { garageApi } from '../../api/garage'
import { contractorsApi } from '../../api/contractors'
import { clsx } from 'clsx'
import ActivityFeed from '../../components/common/ActivityFeed'
import { useEscapeKey } from '../../hooks/useEscapeKey'

import { fmtDate } from '../../utils/date'
const fmt = fmtDate
const fmtMoney = (v) => v != null
  ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼'
  : '—'

const RISK_CONFIG = {
  LOW:    { label: 'Aşağı',   cls: 'bg-[var(--ces-ok-100)] text-[var(--ces-ok)]' },
  MEDIUM: { label: 'Orta',    cls: 'bg-[var(--ces-gold-100)] text-[var(--ces-gold-700)]' },
  HIGH:   { label: 'Yüksək', cls: 'bg-[var(--ces-danger-100)] text-[var(--ces-danger)]' },
}
const STATUS_CONFIG = {
  ACTIVE:   { label: 'Aktiv',   cls: 'bg-[var(--ces-ok-100)] text-[var(--ces-ok)]' },
  INACTIVE: { label: 'Deaktiv', cls: 'bg-[var(--ces-graphite-100)] text-[var(--ces-muted)]' },
}
const PAYMENT_LABEL = { CASH: 'Nağd', TRANSFER: 'Köçürmə' }

function Field({ label, value, alwaysShow = false }) {
  if (!value && !alwaysShow) return null
  return (
    <div>
      <p className="text-[10.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.12em] mb-1">{label}</p>
      <p className="text-sm font-medium text-[var(--ces-ink)]">{value || '—'}</p>
    </div>
  )
}

const EQUIPMENT_STATUS = {
  AVAILABLE:     { label: 'Mövcud',      cls: 'bg-[var(--ces-ok-100)] text-[var(--ces-ok)]' },
  IN_USE:        { label: 'İstifadədə',  cls: 'bg-[var(--ces-info-100)] text-[var(--ces-info)]' },
  UNDER_REPAIR:  { label: 'Təmirdə',     cls: 'bg-[var(--ces-warn-100)] text-[var(--ces-warn)]' },
  DECOMMISSIONED:{ label: 'Silinmiş',    cls: 'bg-[var(--ces-graphite-100)] text-[var(--ces-muted)]' },
}

const PROJECT_STATUS = {
  PENDING:   { label: 'Gözləmədə',  cls: 'bg-[var(--ces-warn-100)] text-[var(--ces-warn)]' },
  ACTIVE:    { label: 'Aktiv',      cls: 'bg-[var(--ces-info-100)] text-[var(--ces-info)]' },
  COMPLETED: { label: 'Tamamlandı', cls: 'bg-[var(--ces-ok-100)] text-[var(--ces-ok)]' },
  CANCELLED: { label: 'Ləğv edildi',cls: 'bg-[var(--ces-graphite-100)] text-[var(--ces-muted)]' },
}

const TABS = [
  { id: 'info',      label: 'Məlumat',         icon: Building2 },
  { id: 'equipment', label: 'Texnikalar',       icon: Truck },
  { id: 'invoices',  label: 'Qaimələr',         icon: TrendingDown },
  { id: 'payments',  label: 'Ödənişlər',        icon: Banknote },
  { id: 'projects',  label: 'Layihə Tarixçəsi', icon: FolderKanban },
  { id: 'history',   label: 'Tarixçə',          icon: History },
]

export default function ContractorSlideOver({ contractor, onClose, onEdit, onDelete }) {
  const [tab, setTab] = useState('info')
  const [invoices, setInvoices] = useState([])
  const [invLoading, setInvLoading] = useState(false)
  const [payables, setPayables] = useState([])
  const [payLoading, setPayLoading] = useState(false)
  const [equipment, setEquipment] = useState([])
  const [expandedEq, setExpandedEq] = useState(null)
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  useEscapeKey(onClose)

  const risk   = RISK_CONFIG[contractor.riskLevel]  || RISK_CONFIG.LOW
  const status = STATUS_CONFIG[contractor.status]    || STATUS_CONFIG.ACTIVE

  useEffect(() => {
    if (tab !== 'invoices') return
    setInvLoading(true)
    contractorsApi.getInvoices(contractor.id)
      .then(r => setInvoices(r.data.data || r.data || []))
      .catch(() => {})
      .finally(() => setInvLoading(false))
  }, [tab, contractor.id])

  useEffect(() => {
    if (tab !== 'payments') return
    setPayLoading(true)
    contractorsApi.getPayables(contractor.id)
      .then(r => setPayables(r.data.data || r.data || []))
      .catch(() => {})
      .finally(() => setPayLoading(false))
  }, [tab, contractor.id])

  useEffect(() => {
    if (tab !== 'equipment') return
    setLoading(true)
    garageApi.getByContractor(contractor.id)
      .then(r => setEquipment(r.data.data || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tab, contractor.id])

  useEffect(() => {
    if (tab !== 'projects') return
    setProjectsLoading(true)
    contractorsApi.getProjectHistory(contractor.id)
      .then(r => setProjects(r.data.data || r.data || []))
      .catch(() => {})
      .finally(() => setProjectsLoading(false))
  }, [tab, contractor.id])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[rgba(58,58,58,0.45)] backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-[var(--ces-surface)] shadow-[0_24px_48px_-20px_rgba(58,58,58,0.28),0_6px_14px_rgba(58,58,58,0.08)] flex flex-col ces-font">

        {/* Header */}
        <div className="flex items-start gap-3.5 px-6 py-5 border-b border-[var(--ces-line)] shrink-0 bg-white">
          <div className="w-11 h-11 rounded-[12px] grid place-items-center bg-[var(--ces-gold-100)] text-[var(--ces-gold-700)] shrink-0">
            <Building2 size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[17px] font-extrabold text-[var(--ces-ink)] truncate tracking-tight">{contractor.companyName}</h2>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold', status.cls)}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {status.label}
              </span>
              <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold', risk.cls)}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {risk.label} risk
              </span>
              {contractor.rating != null && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--ces-gold-50)]">
                  <Star size={11} className="fill-[var(--ces-gold)] text-[var(--ces-gold)]" />
                  <span className="text-[11px] font-bold text-[var(--ces-gold-700)]">{parseFloat(contractor.rating).toFixed(1)}</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <button onClick={onEdit} className="w-9 h-9 grid place-items-center rounded-[8px] text-[var(--ces-muted)] hover:text-[var(--ces-gold-700)] hover:bg-[var(--ces-gold-100)] transition-colors" title="Redaktə et">
                <Pencil size={16} />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="w-9 h-9 grid place-items-center rounded-[8px] text-[var(--ces-muted)] hover:text-[var(--ces-danger)] hover:bg-[var(--ces-danger-100)] transition-colors" title="Sil">
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-[8px] text-[var(--ces-muted)] hover:text-[var(--ces-graphite)] hover:bg-[var(--ces-graphite-50)] transition-colors ml-1">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 border-b border-[var(--ces-line)] shrink-0 overflow-x-auto bg-white">
          {TABS.map(t => {
            const Icon = t.icon
            const on = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3.5 py-3 text-[13px] font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors',
                  on
                    ? 'text-[var(--ces-graphite)] border-[var(--ces-gold)]'
                    : 'text-[var(--ces-muted)] border-transparent hover:text-[var(--ces-graphite)]'
                )}
              >
                <Icon size={14} />{t.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-[var(--ces-bg)]">

          {/* ── Məlumat ── */}
          {tab === 'info' && (
            <div className="p-5 space-y-4">
              <div className="bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[16px] p-5 shadow-[0_1px_2px_rgba(58,58,58,0.06)]">
                <h3 className="text-[11px] tracking-[0.16em] uppercase font-bold text-[var(--ces-muted)] mb-4">Şirkət məlumatları</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Şirkət adı" value={contractor.companyName} />
                  <Field label="VÖEN" value={contractor.voen} />
                </div>
              </div>

              <div className="bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[16px] p-5 shadow-[0_1px_2px_rgba(58,58,58,0.06)]">
                <h3 className="text-[11px] tracking-[0.16em] uppercase font-bold text-[var(--ces-muted)] mb-4">Əlaqə</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Əlaqə şəxsi" value={contractor.contactPerson} />
                  <Field label="Telefon" value={contractor.phone} />
                  <Field label="E-poçt" value={contractor.email} />
                  <div>
                    <p className="text-[10.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.12em] mb-1">Ödəniş növü</p>
                    {contractor.paymentType
                      ? <div className="flex flex-wrap gap-1 mt-0.5">
                          {contractor.paymentType.split(',').filter(Boolean).map(pt => (
                            <span key={pt} className="px-2 py-0.5 rounded-[6px] text-[11.5px] font-semibold bg-[var(--ces-graphite-50)] text-[var(--ces-graphite)]">
                              {PAYMENT_LABEL[pt] || pt}
                            </span>
                          ))}
                        </div>
                      : <p className="text-sm font-medium text-[var(--ces-ink)]">—</p>}
                  </div>
                </div>
              </div>

              <div className="bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[16px] p-5 shadow-[0_1px_2px_rgba(58,58,58,0.06)]">
                <h3 className="text-[11px] tracking-[0.16em] uppercase font-bold text-[var(--ces-muted)] mb-4">Bank</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Bank adı" value={contractor.bankName} />
                  <Field label="Hesab nömrəsi" value={contractor.bankAccount} />
                </div>
              </div>

              {contractor.notes && (
                <div className="bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[16px] p-5 shadow-[0_1px_2px_rgba(58,58,58,0.06)]">
                  <h3 className="text-[11px] tracking-[0.16em] uppercase font-bold text-[var(--ces-muted)] mb-3">Qeyd</h3>
                  <p className="text-sm text-[var(--ces-ink)] whitespace-pre-wrap leading-relaxed">{contractor.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Texnikalar ── */}
          {tab === 'equipment' && (
            <div className="p-5">
              {loading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-14 bg-[var(--ces-graphite-100)] rounded-[12px] animate-pulse" />)}
                </div>
              ) : equipment.length === 0 ? (
                <div className="text-center py-16 bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[16px]">
                  <Truck size={32} className="mx-auto mb-3 text-[var(--ces-mute2)] opacity-50" />
                  <p className="text-sm font-semibold text-[var(--ces-muted)]">Bu podratçıya aid texnika tapılmadı</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-[var(--ces-muted)]">{equipment.length} texnika</p>
                  {equipment.map(eq => {
                    const st = EQUIPMENT_STATUS[eq.status] || EQUIPMENT_STATUS.AVAILABLE
                    const isOpen = expandedEq === eq.id
                    return (
                      <div key={eq.id} className="rounded-[14px] border border-[var(--ces-line)] overflow-hidden bg-[var(--ces-surface)] shadow-[0_1px_2px_rgba(58,58,58,0.06)]">
                        <div
                          onClick={() => setExpandedEq(isOpen ? null : eq.id)}
                          className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-[var(--ces-graphite-50)] transition-colors"
                        >
                          <div className="w-9 h-9 rounded-[10px] bg-[var(--ces-gold-100)] grid place-items-center shrink-0">
                            <Truck size={15} className="text-[var(--ces-gold-700)]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[var(--ces-ink)] truncate">{eq.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] font-mono font-semibold text-[var(--ces-mute2)]">{eq.equipmentCode}</span>
                              {eq.type && <span className="text-[11px] text-[var(--ces-muted)]">· {eq.type}</span>}
                            </div>
                          </div>
                          <span className={clsx('px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0', st.cls)}>{st.label}</span>
                          {isOpen ? <ChevronUp size={14} className="text-[var(--ces-muted)] shrink-0" /> : <ChevronDown size={14} className="text-[var(--ces-muted)] shrink-0" />}
                        </div>

                        {isOpen && (
                          <div className="p-4 border-t border-[var(--ces-line)] bg-[var(--ces-graphite-50)]">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                              {[
                                { label: 'Növ', value: eq.type },
                                { label: 'Brend / Model', value: [eq.brand, eq.model].filter(Boolean).join(' / ') || null },
                                { label: 'Seriya nömrəsi', value: eq.serialNumber },
                                { label: 'İstehsal ili', value: eq.manufactureYear ? String(eq.manufactureYear) : null },
                                { label: 'Qeydiyyat nişanı', value: eq.plateNumber },
                                { label: 'Çəki (ton)', value: eq.weightTon != null ? String(eq.weightTon) : null },
                                { label: 'Saat/KM göstəricisi', value: eq.hourKmCounter != null ? String(eq.hourKmCounter) : null },
                                { label: 'Moto saatlar', value: eq.motoHours != null ? String(eq.motoHours) : null },
                                { label: 'Alınma tarixi', value: eq.purchaseDate ? fmt(eq.purchaseDate) : null },
                                { label: 'Alış qiyməti', value: eq.purchasePrice != null ? fmtMoney(eq.purchasePrice) : null },
                                { label: 'Bazar dəyəri', value: eq.currentMarketValue != null ? fmtMoney(eq.currentMarketValue) : null },
                                { label: 'Amortizasiya (%)', value: eq.depreciationRate != null ? String(eq.depreciationRate) : null },
                                { label: 'Saxlanma yeri', value: eq.storageLocation },
                                { label: 'Məsul şəxs', value: eq.responsibleUserName },
                                { label: 'Texniki hazırlıq', value: eq.technicalReadinessStatus },
                                { label: 'Təmir statusu', value: eq.repairStatus },
                                { label: 'Son baxış', value: eq.lastInspectionDate ? fmt(eq.lastInspectionDate) : null },
                                { label: 'Növbəti baxış', value: eq.nextInspectionDate ? fmt(eq.nextInspectionDate) : null },
                              ].filter(f => f.value).map(f => (
                                <div key={f.label}>
                                  <p className="text-[9.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.12em]">{f.label}</p>
                                  <p className="text-xs font-semibold text-[var(--ces-ink)] mt-0.5">{f.value}</p>
                                </div>
                              ))}
                            </div>
                            {eq.notes && (
                              <div className="mt-3 pt-3 border-t border-[var(--ces-line)]">
                                <p className="text-[9.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.12em] mb-1">Qeyd</p>
                                <p className="text-xs text-[var(--ces-ink)] whitespace-pre-wrap">{eq.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Qaimələr ── */}
          {tab === 'invoices' && (
            <div className="p-5">
              {invLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-[var(--ces-graphite-100)] rounded-[12px] animate-pulse" />)}</div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-16 bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[16px]">
                  <FileText size={32} className="mx-auto mb-3 text-[var(--ces-mute2)] opacity-50" />
                  <p className="text-sm font-semibold text-[var(--ces-muted)]">Bu podratçı üçün hələ qaimə yoxdur</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-[var(--ces-muted)]">{invoices.length} qaimə</p>
                    <p className="text-sm font-bold text-[var(--ces-gold-700)] tabular-nums">{fmtMoney(invoices.reduce((s, i) => s + parseFloat(i.amount || 0), 0))}</p>
                  </div>
                  {invoices.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3 p-3 rounded-[12px] bg-[var(--ces-surface)] border border-[var(--ces-line)] hover:border-[var(--ces-gold-100)] transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12.5px] font-mono font-bold text-[var(--ces-ink)]">{inv.invoiceNumber || inv.accountingId || '—'}</span>
                          <span className="text-[11px] text-[var(--ces-muted)]">{fmt(inv.invoiceDate)}</span>
                          {inv.status === 'APPROVED' && <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-[var(--ces-ok-100)] text-[var(--ces-ok)]">Təsdiqləndi</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {inv.equipmentName && <span className="text-[11px] text-[var(--ces-muted)] truncate">{inv.equipmentName}</span>}
                          {inv.projectCode && <span className="text-[11px] font-mono font-semibold text-[var(--ces-info)]">{inv.projectCode}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-extrabold text-[var(--ces-ink)] tabular-nums">{fmtMoney(inv.amount)}</p>
                        {inv.paidAmount != null && parseFloat(inv.paidAmount) > 0 && (
                          <p className="text-[10.5px] font-semibold text-[var(--ces-ok)]">ödəndi: {fmtMoney(inv.paidAmount)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Ödənişlər ── */}
          {tab === 'payments' && (
            <div className="p-5">
              {payLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-[var(--ces-graphite-100)] rounded-[14px] animate-pulse" />)}</div>
              ) : payables.length === 0 ? (
                <div className="text-center py-16 bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[16px]">
                  <Banknote size={32} className="mx-auto mb-3 text-[var(--ces-mute2)] opacity-50" />
                  <p className="text-sm font-semibold text-[var(--ces-muted)]">Bu podratçı üçün hələ ödəniş yoxdur</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-[var(--ces-muted)]">{payables.length} ödəniş</p>
                    <p className="text-sm font-bold text-[var(--ces-ok)] tabular-nums">ödəndi: {fmtMoney(payables.reduce((s, p) => s + parseFloat(p.paidAmount || 0), 0))}</p>
                  </div>
                  {payables.map(p => {
                    const remaining = parseFloat(p.totalAmount || 0) - parseFloat(p.paidAmount || 0)
                    const statusCfg = {
                      PENDING:   { icon: Clock,         cls: 'text-[var(--ces-warn)] bg-[var(--ces-warn-100)]',     label: 'Gözləyir' },
                      PARTIAL:   { icon: AlertCircle,   cls: 'text-[var(--ces-info)] bg-[var(--ces-info-100)]',     label: 'Qismən' },
                      COMPLETED: { icon: CheckCircle2,  cls: 'text-[var(--ces-ok)] bg-[var(--ces-ok-100)]',         label: 'Tamamlandı' },
                      OVERDUE:   { icon: AlertCircle,   cls: 'text-[var(--ces-danger)] bg-[var(--ces-danger-100)]', label: 'Gecikmiş' },
                    }[p.status] || { icon: Clock, cls: 'text-[var(--ces-muted)] bg-[var(--ces-graphite-100)]', label: p.status }
                    const StatusIcon = statusCfg.icon
                    return (
                      <div key={p.id} className="rounded-[14px] border border-[var(--ces-line)] p-4 space-y-3 bg-[var(--ces-surface)] shadow-[0_1px_2px_rgba(58,58,58,0.06)]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {p.projectCode && <p className="text-[12.5px] font-mono font-bold text-[var(--ces-ink)]">{p.projectCode}</p>}
                            {p.projectName && <p className="text-[11px] text-[var(--ces-muted)] truncate mt-0.5">{p.projectName}</p>}
                            {p.equipmentName && <p className="text-[11px] text-[var(--ces-muted)] mt-0.5">{p.equipmentName}</p>}
                          </div>
                          <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0', statusCfg.cls)}>
                            <StatusIcon size={11} />{statusCfg.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-[var(--ces-graphite-50)] rounded-[8px] p-2">
                            <p className="text-[9.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.12em]">Cəmi</p>
                            <p className="font-bold text-[var(--ces-ink)] tabular-nums mt-0.5">{fmtMoney(p.totalAmount)}</p>
                          </div>
                          <div className="bg-[var(--ces-ok-100)] rounded-[8px] p-2">
                            <p className="text-[9.5px] font-bold text-[var(--ces-ok)] uppercase tracking-[0.12em]">Ödənildi</p>
                            <p className="font-bold text-[var(--ces-ok)] tabular-nums mt-0.5">{fmtMoney(p.paidAmount)}</p>
                          </div>
                          {remaining > 0.01 ? (
                            <div className="bg-[var(--ces-danger-100)] rounded-[8px] p-2">
                              <p className="text-[9.5px] font-bold text-[var(--ces-danger)] uppercase tracking-[0.12em]">Qalıq</p>
                              <p className="font-bold text-[var(--ces-danger)] tabular-nums mt-0.5">{fmtMoney(remaining)}</p>
                            </div>
                          ) : <div />}
                        </div>
                        {p.payments && p.payments.length > 0 && (
                          <div className="pt-2.5 border-t border-dashed border-[var(--ces-line)] space-y-1">
                            {p.payments.map((pay, pi) => (
                              <div key={pi} className="flex items-center justify-between text-[11px]">
                                <span className="text-[var(--ces-muted)]">{pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString('az-AZ') : '—'}{pay.note ? ` · ${pay.note}` : ''}</span>
                                <span className="font-bold text-[var(--ces-ok)] tabular-nums">{fmtMoney(pay.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Layihə Tarixçəsi ── */}
          {tab === 'projects' && (
            <div className="p-5">
              {projectsLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-24 bg-[var(--ces-graphite-100)] rounded-[14px] animate-pulse" />)}
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-16 bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[16px]">
                  <FolderKanban size={32} className="mx-auto mb-3 text-[var(--ces-mute2)] opacity-50" />
                  <p className="text-sm font-semibold text-[var(--ces-muted)]">Bu podratçının texnikaları heç bir layihədə iştirak etməyib</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-[var(--ces-muted)]">{projects.length} layihə</p>
                  {projects.map((p, i) => {
                    const ps = PROJECT_STATUS[p.status] || PROJECT_STATUS.PENDING
                    return (
                      <div key={i} className="rounded-[14px] border border-[var(--ces-line)] p-4 space-y-2.5 bg-[var(--ces-surface)] shadow-[0_1px_2px_rgba(58,58,58,0.06)]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[var(--ces-ink)] truncate">{p.companyName || '—'}</p>
                            {p.projectName && <p className="text-xs text-[var(--ces-muted)] truncate mt-0.5">{p.projectName}</p>}
                          </div>
                          <span className={clsx('px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0', ps.cls)}>{ps.label}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                          {p.projectCode && <span className="font-mono font-bold text-[var(--ces-graphite)]">{p.projectCode}</span>}
                          {p.requestCode && <span className="font-mono text-[var(--ces-muted)]">{p.requestCode}</span>}
                          {p.region && <span className="text-[var(--ces-muted)]">· {p.region}</span>}
                        </div>
                        {(p.equipmentName || p.equipmentCode) && (
                          <div className="flex items-center gap-1.5 text-xs text-[var(--ces-ink)]">
                            <Truck size={12} className="text-[var(--ces-gold-700)] shrink-0" />
                            <span className="font-semibold truncate">{p.equipmentName}</span>
                            {p.equipmentCode && <span className="text-[10.5px] font-mono text-[var(--ces-muted)]">({p.equipmentCode})</span>}
                            {p.equipmentType && <span className="text-[10.5px] text-[var(--ces-muted)]">· {p.equipmentType}</span>}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t border-dashed border-[var(--ces-line)]">
                          {(p.startDate || p.endDate) && (
                            <div className="flex items-center gap-1.5 text-[11px] text-[var(--ces-muted)]">
                              <Calendar size={11} />
                              <span>{p.startDate ? new Date(p.startDate).toLocaleDateString('az-AZ') : '?'} — {p.endDate ? new Date(p.endDate).toLocaleDateString('az-AZ') : '?'}</span>
                              {p.dayCount && <span className="ml-0.5">({p.dayCount} gün)</span>}
                            </div>
                          )}
                          {p.contractorPayment != null && (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--ces-gold-700)] tabular-nums">
                              <Banknote size={11} />
                              <span>{parseFloat(p.contractorPayment).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Tarixçə ── */}
          {tab === 'history' && (
            <div className="p-5">
              <ActivityFeed entityType="PODRATÇI" entityId={contractor.id} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
