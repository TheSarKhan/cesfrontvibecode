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

const fmt = (d) => d ? new Date(d).toLocaleDateString('az-AZ') : '—'
const fmtMoney = (v) => v != null
  ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼'
  : '—'

const RISK_CONFIG = {
  LOW:    { label: 'Aşağı',   cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  MEDIUM: { label: 'Orta',    cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  HIGH:   { label: 'Yüksək', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
}
const STATUS_CONFIG = {
  ACTIVE:   { label: 'Aktiv',   cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  INACTIVE: { label: 'Deaktiv', cls: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
}
const PAYMENT_LABEL = { CASH: 'Nağd', TRANSFER: 'Köçürmə' }

function Field({ label, value, alwaysShow = false }) {
  if (!value && !alwaysShow) return null
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-gray-700 dark:text-gray-200">{value || '—'}</p>
    </div>
  )
}

const EQUIPMENT_STATUS = {
  AVAILABLE:     { label: 'Mövcud',      cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  IN_USE:        { label: 'İstifadədə',  cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  UNDER_REPAIR:  { label: 'Təmirdə',     cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  DECOMMISSIONED:{ label: 'Silinmiş',    cls: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
}

const PROJECT_STATUS = {
  PENDING:   { label: 'Gözləmədə', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  ACTIVE:    { label: 'Aktiv',     cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  COMPLETED: { label: 'Tamamlandı',cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  CANCELLED: { label: 'Ləğv edildi',cls:'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
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

  const totalInvoiced = invoices.reduce((s, inv) => s + parseFloat(inv.amount || 0), 0)
  const totalPaid = payables.reduce((s, p) => s + parseFloat(p.paidAmount || 0), 0)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
            <Building2 size={18} className="text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 truncate">{contractor.companyName}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-semibold border', status.cls)}>{status.label}</span>
              <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-semibold border', risk.cls)}>{risk.label} risk</span>
              {contractor.rating != null && (
                <span className="flex items-center gap-0.5 ml-1">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">{parseFloat(contractor.rating).toFixed(1)}</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Redaktə et">
                <Pencil size={15} />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Sil">
                <Trash2 size={15} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-1">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 px-4 pt-3 border-b border-gray-100 dark:border-gray-800 shrink-0 overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2',
                  tab === t.id
                    ? 'text-amber-600 border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                    : 'text-gray-400 dark:text-gray-500 border-transparent hover:text-gray-600 dark:hover:text-gray-300'
                )}
              >
                <Icon size={13} />{t.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Məlumat ── */}
          {tab === 'info' && (
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Şirkət adı" value={contractor.companyName} />
                <Field label="VÖEN" value={contractor.voen} />
              </div>
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Əlaqə</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Əlaqə şəxsi" value={contractor.contactPerson} />
                  <Field label="Telefon" value={contractor.phone} />
                  <Field label="E-poçt" value={contractor.email} />
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Ödəniş növü</p>
                    {contractor.paymentType
                      ? <div className="flex flex-wrap gap-1 mt-1">
                          {contractor.paymentType.split(',').filter(Boolean).map(pt => (
                            <span key={pt} className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                              {PAYMENT_LABEL[pt] || pt}
                            </span>
                          ))}
                        </div>
                      : <p className="text-sm text-gray-700 dark:text-gray-200">—</p>}
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Bank</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Bank adı" value={contractor.bankName} />
                  <Field label="Hesab nömrəsi" value={contractor.bankAccount} />
                </div>
              </div>
              {contractor.notes && (
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Qeyd</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{contractor.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Texnikalar ── */}
          {tab === 'equipment' && (
            <div className="p-4">
              {loading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />)}
                </div>
              ) : equipment.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Truck size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Bu podratçıya aid texnika tapılmadı</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{equipment.length} texnika</p>
                  {equipment.map(eq => {
                    const st = EQUIPMENT_STATUS[eq.status] || EQUIPMENT_STATUS.AVAILABLE
                    const isOpen = expandedEq === eq.id
                    return (
                      <div key={eq.id} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {/* Header row */}
                        <div
                          onClick={() => setExpandedEq(isOpen ? null : eq.id)}
                          className="flex items-center gap-3 p-3 cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                            <Truck size={14} className="text-orange-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{eq.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono text-gray-400">{eq.equipmentCode}</span>
                              {eq.type && <span className="text-[10px] text-gray-400">· {eq.type}</span>}
                            </div>
                          </div>
                          <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0', st.cls)}>{st.label}</span>
                          {isOpen ? <ChevronUp size={13} className="text-gray-400 shrink-0" /> : <ChevronDown size={13} className="text-gray-400 shrink-0" />}
                        </div>

                        {/* Expanded details */}
                        {isOpen && (
                          <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/50">
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
                                  <p className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{f.label}</p>
                                  <p className="text-xs text-gray-700 dark:text-gray-200 font-medium mt-0.5">{f.value}</p>
                                </div>
                              ))}
                            </div>
                            {eq.notes && (
                              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Qeyd</p>
                                <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{eq.notes}</p>
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
            <div className="p-4">
              {invLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />)}</div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FileText size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Bu podratçı üçün hələ qaimə yoxdur</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    {invoices.length} qaimə · {fmtMoney(invoices.reduce((s, i) => s + parseFloat(i.amount || 0), 0))}
                  </p>
                  {invoices.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">{inv.invoiceNumber || inv.accountingId || '—'}</span>
                          <span className="text-[10px] text-gray-400">{fmt(inv.invoiceDate)}</span>
                          {inv.status === 'APPROVED' && <span className="text-[10px] font-medium text-green-600 dark:text-green-400">Təsdiqləndi</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {inv.equipmentName && <span className="text-[10px] text-gray-400 truncate">{inv.equipmentName}</span>}
                          {inv.projectCode && <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">{inv.projectCode}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{fmtMoney(inv.amount)}</p>
                        {inv.paidAmount != null && parseFloat(inv.paidAmount) > 0 && (
                          <p className="text-[10px] text-green-600 dark:text-green-400">ödəndi: {fmtMoney(inv.paidAmount)}</p>
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
            <div className="p-4">
              {payLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}</div>
              ) : payables.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Banknote size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Bu podratçı üçün hələ ödəniş yoxdur</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    {payables.length} ödəniş · ödəndi: {fmtMoney(payables.reduce((s, p) => s + parseFloat(p.paidAmount || 0), 0))}
                  </p>
                  {payables.map(p => {
                    const remaining = parseFloat(p.totalAmount || 0) - parseFloat(p.paidAmount || 0)
                    const statusCfg = {
                      PENDING:   { icon: Clock,         cls: 'text-amber-500', label: 'Gözləyir' },
                      PARTIAL:   { icon: AlertCircle,   cls: 'text-blue-500',  label: 'Qismən' },
                      COMPLETED: { icon: CheckCircle2,  cls: 'text-green-500', label: 'Tamamlandı' },
                      OVERDUE:   { icon: AlertCircle,   cls: 'text-red-500',   label: 'Gecikmiş' },
                    }[p.status] || { icon: Clock, cls: 'text-gray-400', label: p.status }
                    const StatusIcon = statusCfg.icon
                    return (
                      <div key={p.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {p.projectCode && <p className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">{p.projectCode}</p>}
                            {p.projectName && <p className="text-[10px] text-gray-400 truncate">{p.projectName}</p>}
                            {p.equipmentName && <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{p.equipmentName}</p>}
                          </div>
                          <div className={clsx('flex items-center gap-1 text-[10px] font-medium shrink-0', statusCfg.cls)}>
                            <StatusIcon size={11} />{statusCfg.label}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <div><p className="text-[9px] text-gray-400 uppercase tracking-wider">Cəmi</p><p className="font-semibold text-gray-700 dark:text-gray-300">{fmtMoney(p.totalAmount)}</p></div>
                          <div><p className="text-[9px] text-gray-400 uppercase tracking-wider">Ödənildi</p><p className="font-semibold text-green-600 dark:text-green-400">{fmtMoney(p.paidAmount)}</p></div>
                          {remaining > 0.01 && <div><p className="text-[9px] text-gray-400 uppercase tracking-wider">Qalıq</p><p className="font-semibold text-red-500">{fmtMoney(remaining)}</p></div>}
                        </div>
                        {p.payments && p.payments.length > 0 && (
                          <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
                            {p.payments.map((pay, pi) => (
                              <div key={pi} className="flex items-center justify-between text-[10px]">
                                <span className="text-gray-400">{pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString('az-AZ') : '—'}{pay.note ? ` · ${pay.note}` : ''}</span>
                                <span className="font-semibold text-green-600 dark:text-green-400">{fmtMoney(pay.amount)}</span>
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
            <div className="p-4">
              {projectsLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FolderKanban size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Bu podratçının texnikaları heç bir layihədə iştirak etməyib</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{projects.length} layihə</p>
                  {projects.map((p, i) => {
                    const ps = PROJECT_STATUS[p.status] || PROJECT_STATUS.PENDING
                    return (
                      <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{p.companyName || '—'}</p>
                            {p.projectName && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.projectName}</p>}
                          </div>
                          <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0', ps.cls)}>{ps.label}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400">
                          {p.projectCode && <span className="font-mono font-semibold text-gray-600 dark:text-gray-300">{p.projectCode}</span>}
                          {p.requestCode && <span className="font-mono">{p.requestCode}</span>}
                          {p.region && <span>{p.region}</span>}
                        </div>
                        {(p.equipmentName || p.equipmentCode) && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                            <Truck size={11} className="text-orange-500 shrink-0" />
                            <span className="font-medium truncate">{p.equipmentName}</span>
                            {p.equipmentCode && <span className="text-[10px] font-mono text-gray-400">({p.equipmentCode})</span>}
                            {p.equipmentType && <span className="text-[10px] text-gray-400">· {p.equipmentType}</span>}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 border-t border-gray-100 dark:border-gray-700">
                          {(p.startDate || p.endDate) && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-400">
                              <Calendar size={10} />
                              <span>{p.startDate ? new Date(p.startDate).toLocaleDateString('az-AZ') : '?'} — {p.endDate ? new Date(p.endDate).toLocaleDateString('az-AZ') : '?'}</span>
                              {p.dayCount && <span className="ml-0.5">({p.dayCount} gün)</span>}
                            </div>
                          )}
                          {p.contractorPayment != null && (
                            <div className="flex items-center gap-1 text-[10px] text-orange-600 dark:text-orange-400 font-semibold">
                              <Banknote size={10} />
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
            <div className="p-4">
              <ActivityFeed entityType="PODRATÇI" entityId={contractor.id} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
