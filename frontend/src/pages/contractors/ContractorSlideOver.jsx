import { useState, useEffect } from 'react'
import {
  X, Star, TrendingDown, FileText, History,
  Building2, Pencil, Trash2, Phone, Mail, CreditCard, Landmark, Truck, ChevronDown, ChevronUp,
} from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import { garageApi } from '../../api/garage'
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

const TABS = [
  { id: 'info',      label: 'Məlumat',   icon: Building2 },
  { id: 'equipment', label: 'Texnikalar', icon: Truck },
  { id: 'invoices',  label: 'Qaimələr',  icon: TrendingDown },
  { id: 'history',   label: 'Tarixçə',   icon: History },
]

export default function ContractorSlideOver({ contractor, onClose, onEdit, onDelete }) {
  const [tab, setTab] = useState('info')
  const [invoices, setInvoices] = useState([])
  const [equipment, setEquipment] = useState([])
  const [expandedEq, setExpandedEq] = useState(null)
  const [loading, setLoading] = useState(false)
  useEscapeKey(onClose)

  const risk   = RISK_CONFIG[contractor.riskLevel]  || RISK_CONFIG.LOW
  const status = STATUS_CONFIG[contractor.status]    || STATUS_CONFIG.ACTIVE

  useEffect(() => {
    if (tab !== 'invoices') return
    setLoading(true)
    accountingApi.getAll({ type: 'CONTRACTOR_EXPENSE' })
      .then(r => {
        const all = r.data.data || r.data || []
        setInvoices(all.filter(inv => inv.contractorId === contractor.id))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tab, contractor.id])

  useEffect(() => {
    if (tab !== 'equipment') return
    setLoading(true)
    garageApi.getByContractor(contractor.id)
      .then(r => setEquipment(r.data.data || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tab, contractor.id])

  const totalPaid = invoices.reduce((s, inv) => s + parseFloat(inv.amount || 0), 0)

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
        <div className="flex gap-0.5 px-4 pt-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
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
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Podratçı Qaimələri (B1)</p>
                {invoices.length > 0 && (
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400">−{fmtMoney(totalPaid)}</span>
                )}
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />)}
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FileText size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Bu podratçı üçün hələ qaimə yoxdur</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invoices.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">{inv.invoiceNumber || '—'}</span>
                          <span className="text-[10px] text-gray-400">{fmt(inv.invoiceDate)}</span>
                        </div>
                        {inv.equipmentName && <p className="text-[10px] text-gray-400 truncate">{inv.equipmentName}</p>}
                        {inv.projectCode && <p className="text-[10px] font-mono text-green-600 dark:text-green-400">{inv.projectCode}</p>}
                      </div>
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400 shrink-0">−{fmtMoney(inv.amount)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-orange-200 dark:border-orange-800/50 mt-2">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{invoices.length} qaimə</span>
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">−{fmtMoney(totalPaid)}</span>
                  </div>
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
