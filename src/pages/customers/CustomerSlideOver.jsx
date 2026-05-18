import DateInput from '../../components/common/DateInput'
import { useState, useRef, useEffect } from 'react'
import {
  X, Pencil, Trash2, Building2,
  FileText, History, Upload, Download, Loader2, FolderOpen,
  CheckCircle, Clock, XCircle, PlayCircle, AlertCircle,
  TrendingUp, Banknote, CheckCircle2,
} from 'lucide-react'
import { clsx } from 'clsx'
import { customersApi } from '../../api/customers'
import ActivityFeed from '../../components/common/ActivityFeed'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import toast from 'react-hot-toast'
import { validateFileUpload } from '../../utils/fileValidation'

const RISK_CONFIG = {
  LOW:    { label: 'Aşağı',   cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  MEDIUM: { label: 'Orta',    cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  HIGH:   { label: 'Yüksək', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
}
const STATUS_CONFIG = {
  ACTIVE:   { label: 'Aktiv',     cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  PASSIVE:  { label: 'Passiv',    cls: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
  VARIABLE: { label: 'Dəyişkən', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
}
const PAYMENT_LABEL = { CASH: 'Nağd', TRANSFER: 'Köçürmə' }

function Field({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-gray-700 dark:text-gray-200">{value}</p>
    </div>
  )
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const PROJECT_STATUS_CONFIG = {
  PENDING:   { label: 'Gözləyir',   icon: Clock,         cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  ACTIVE:    { label: 'Aktiv',      icon: PlayCircle,    cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  COMPLETED: { label: 'Tamamlandı', icon: CheckCircle,   cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  CANCELLED: { label: 'Ləğv edildi',icon: XCircle,       cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
  ON_HOLD:   { label: 'Dayandırıldı',icon: AlertCircle,  cls: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
}

const PROJECT_TYPE_LABEL = { DAILY: 'Günlük', MONTHLY: 'Aylıq' }

const TABS = [
  { id: 'info',      label: 'Məlumat',   icon: Building2 },
  { id: 'projects',  label: 'Layihələr', icon: FolderOpen },
  { id: 'invoices',  label: 'Qaimələr',  icon: TrendingUp },
  { id: 'payments',  label: 'Alacaqlar', icon: Banknote },
  { id: 'documents', label: 'Sənədlər',  icon: FileText },
  { id: 'history',   label: 'Tarixçə',   icon: History },
]

export default function CustomerSlideOver({ customer, onClose, onEdit, onDelete, onUpdated }) {
  const [tab, setTab] = useState('info')
  const [docs, setDocs] = useState(customer.documents || [])
  const [uploading, setUploading] = useState(false)
  const [docName, setDocName] = useState('')
  const [docDate, setDocDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [invoices, setInvoices] = useState([])
  const [invLoading, setInvLoading] = useState(false)
  const [receivables, setReceivables] = useState([])
  const [recLoading, setRecLoading] = useState(false)
  const fileRef = useRef()
  const { confirm, ConfirmDialog } = useConfirm()
  useEscapeKey(onClose)

  useEffect(() => {
    if (tab !== 'projects') return
    setProjectsLoading(true)
    customersApi.getProjects(customer.id)
      .then(r => setProjects(r.data?.data || []))
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoading(false))
  }, [tab, customer.id])

  useEffect(() => {
    if (tab !== 'invoices') return
    setInvLoading(true)
    customersApi.getInvoices(customer.id)
      .then(r => setInvoices(r.data?.data || []))
      .catch(() => {})
      .finally(() => setInvLoading(false))
  }, [tab, customer.id])

  useEffect(() => {
    if (tab !== 'payments') return
    setRecLoading(true)
    customersApi.getReceivables(customer.id)
      .then(r => setReceivables(r.data?.data || []))
      .catch(() => {})
      .finally(() => setRecLoading(false))
  }, [tab, customer.id])

  const fmtMoney = (v) => v != null ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼' : '—'

  const risk   = RISK_CONFIG[customer.riskLevel]   || RISK_CONFIG.LOW
  const status = STATUS_CONFIG[customer.status]     || STATUS_CONFIG.ACTIVE

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fileError = validateFileUpload(file)
    if (fileError) { toast.error(fileError); fileRef.current.value = ''; return }
    setUploading(true)
    try {
      const res = await customersApi.uploadDocument(customer.id, file, docName.trim() || file.name, docDate)
      setDocs(prev => [...prev, res.data.data])
      setDocName('')
      setDocDate(new Date().toISOString().slice(0, 10))
      toast.success('Sənəd yükləndi')
      onUpdated?.()
    } catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Sənəd yüklənə bilmədi') }
    finally { setUploading(false); fileRef.current.value = '' }
  }

  const handleDeleteDoc = async (docId) => {
    if (!(await confirm({ title: 'Sənədi sil', message: 'Sənədi silmək istəyirsiniz?' }))) return
    try {
      await customersApi.deleteDocument(customer.id, docId)
      setDocs(prev => prev.filter(d => d.id !== docId))
      toast.success('Sənəd silindi')
      onUpdated?.()
    } catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Sənəd silinə bilmədi') }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <Building2 size={18} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 truncate">{customer.companyName}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-semibold border', status.cls)}>{status.label}</span>
              <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-semibold border', risk.cls)}>{risk.label} risk</span>
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
        <div className="flex gap-0.5 px-4 pt-3 pb-0 border-b border-gray-100 dark:border-gray-800 shrink-0 overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2',
                  tab === t.id
                    ? 'text-amber-600 border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                    : 'text-gray-400 dark:text-gray-500 border-transparent hover:text-gray-600 dark:hover:text-gray-300'
                )}
              >
                <Icon size={13} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Info tab ── */}
          {tab === 'info' && (
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="ID" value={String(customer.id)} />
                <Field label="Şirkət adı" value={customer.companyName} />
                <Field label="VÖEN" value={customer.voen} />
                <Field label="Ünvan" value={customer.address} />
                <Field label="Direktor" value={customer.directorName} />
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Ödəniş növü</p>
                  <div className="flex flex-wrap gap-1">
                    {(customer.paymentTypes || []).length === 0
                      ? <span className="text-sm text-gray-400">—</span>
                      : customer.paymentTypes.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                            {PAYMENT_LABEL[t] || t}
                          </span>
                        ))
                    }
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Təchizatçı</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Məsul şəxs" value={customer.supplierPerson} />
                  <Field label="Telefon" value={customer.supplierPhone} />
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Ofis</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Məsul şəxs" value={customer.officeContactPerson} />
                  <Field label="Telefon" value={customer.officeContactPhone} />
                </div>
              </div>

              {customer.notes && (
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Qeyd</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{customer.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Projects tab ── */}
          {tab === 'projects' && (
            <div className="flex flex-col h-full">
              {projectsLoading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Yüklənir...</span>
                </div>
              ) : projects.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <FolderOpen size={22} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Layihə tapılmadı</p>
                  <p className="text-xs text-gray-400 max-w-xs">Bu müştəriyə aid aktiv layihə yoxdur.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {projects.map(p => {
                    const sc = PROJECT_STATUS_CONFIG[p.status] || PROJECT_STATUS_CONFIG.PENDING
                    const StatusIcon = sc.icon
                    return (
                      <div key={p.id} className="px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        {/* Header row */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-100 shrink-0">{p.projectCode}</span>
                            {p.requestCode && (
                              <span className="text-xs text-gray-400">· {p.requestCode}</span>
                            )}
                          </div>
                          <span className={clsx('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0', sc.cls)}>
                            <StatusIcon size={10} />
                            {sc.label}
                          </span>
                        </div>

                        {/* Project name & region */}
                        {(p.projectName || p.region) && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 truncate">
                            {[p.projectName, p.region].filter(Boolean).join(' — ')}
                          </p>
                        )}

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                          {p.projectType && (
                            <span className="text-gray-400">Növ: <span className="text-gray-600 dark:text-gray-300">{PROJECT_TYPE_LABEL[p.projectType] || p.projectType}</span></span>
                          )}
                          {p.equipmentName && (
                            <span className="text-gray-400 truncate">Texnika: <span className="text-gray-600 dark:text-gray-300">{p.equipmentCode ? `${p.equipmentCode} – ${p.equipmentName}` : p.equipmentName}</span></span>
                          )}
                          {p.operatorName && (
                            <span className="text-gray-400">Operator: <span className="text-gray-600 dark:text-gray-300">{p.operatorName}</span></span>
                          )}
                          {(p.planStartDate || p.startDate) && (
                            <span className="text-gray-400">Başlanğıc: <span className="text-gray-600 dark:text-gray-300">{formatDate(p.startDate || p.planStartDate)}</span></span>
                          )}
                          {(p.planEndDate || p.endDate) && (
                            <span className="text-gray-400">Bitmə: <span className="text-gray-600 dark:text-gray-300">{formatDate(p.endDate || p.planEndDate)}</span></span>
                          )}
                          {p.planDayCount != null && (
                            <span className="text-gray-400">Gün sayı: <span className="text-gray-600 dark:text-gray-300">{p.planDayCount}</span></span>
                          )}
                        </div>

                        {/* Finance row */}
                        {(p.planEquipmentTotal != null || p.totalRevenue != null) && (
                          <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px]">
                            {p.planEquipmentTotal != null && (
                              <span className="text-gray-400">Müqavilə məbləği: <span className="font-semibold text-gray-700 dark:text-gray-200">{Number(p.planEquipmentTotal).toLocaleString()} ₼</span></span>
                            )}
                            {p.netProfit != null && (
                              <span className="text-gray-400">Mənfəət: <span className={clsx('font-semibold', Number(p.netProfit) >= 0 ? 'text-green-600' : 'text-red-500')}>{Number(p.netProfit).toLocaleString()} ₼</span></span>
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

          {/* ── Qaimələr tab ── */}
          {tab === 'invoices' && (
            <div className="p-4">
              {invLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />)}</div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FileText size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Bu müştəri üçün hələ qaimə yoxdur</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    {invoices.length} qaimə · {fmtMoney(invoices.reduce((s, i) => s + parseFloat(i.amount || 0), 0))}
                  </p>
                  {invoices.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">{inv.invoiceNumber || inv.accountingId || '—'}</span>
                          <span className="text-[10px] text-gray-400">{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('az-AZ') : '—'}</span>
                          {inv.status === 'APPROVED' && <span className="text-[10px] font-medium text-green-600 dark:text-green-400">Təsdiqləndi</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {inv.equipmentName && <span className="text-[10px] text-gray-400 truncate">{inv.equipmentName}</span>}
                          {inv.projectCode && <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">{inv.projectCode}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-green-600 dark:text-green-400">{fmtMoney(inv.amount)}</p>
                        {inv.paidAmount != null && parseFloat(inv.paidAmount) > 0 && (
                          <p className="text-[10px] text-gray-400">daxil oldu: {fmtMoney(inv.paidAmount)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Alacaqlar tab ── */}
          {tab === 'payments' && (
            <div className="p-4">
              {recLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}</div>
              ) : receivables.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Banknote size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Bu müştəri üçün hələ alacaq yoxdur</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    {receivables.length} alacaq · daxil oldu: {fmtMoney(receivables.reduce((s, r) => s + parseFloat(r.paidAmount || 0), 0))}
                  </p>
                  {receivables.map(r => {
                    const remaining = parseFloat(r.totalAmount || 0) - parseFloat(r.paidAmount || 0)
                    const statusCfg = {
                      PENDING:   { icon: Clock,         cls: 'text-amber-500', label: 'Gözləyir' },
                      PARTIAL:   { icon: AlertCircle,   cls: 'text-blue-500',  label: 'Qismən' },
                      COMPLETED: { icon: CheckCircle2,  cls: 'text-green-500', label: 'Tamamlandı' },
                      OVERDUE:   { icon: AlertCircle,   cls: 'text-red-500',   label: 'Gecikmiş' },
                    }[r.status] || { icon: Clock, cls: 'text-gray-400', label: r.status }
                    const StatusIcon = statusCfg.icon
                    return (
                      <div key={r.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {r.projectCode && <p className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">{r.projectCode}</p>}
                            {r.projectName && <p className="text-[10px] text-gray-400 truncate">{r.projectName}</p>}
                            {r.equipmentName && <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{r.equipmentName}</p>}
                            {r.region && <p className="text-[10px] text-gray-400">{r.region}</p>}
                          </div>
                          <div className={clsx('flex items-center gap-1 text-[10px] font-medium shrink-0', statusCfg.cls)}>
                            <StatusIcon size={11} />{statusCfg.label}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <div><p className="text-[9px] text-gray-400 uppercase tracking-wider">Cəmi</p><p className="font-semibold text-gray-700 dark:text-gray-300">{fmtMoney(r.totalAmount)}</p></div>
                          <div><p className="text-[9px] text-gray-400 uppercase tracking-wider">Daxil oldu</p><p className="font-semibold text-green-600 dark:text-green-400">{fmtMoney(r.paidAmount)}</p></div>
                          {remaining > 0.01 && <div><p className="text-[9px] text-gray-400 uppercase tracking-wider">Qalıq</p><p className="font-semibold text-red-500">{fmtMoney(remaining)}</p></div>}
                        </div>
                        {r.payments && r.payments.length > 0 && (
                          <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
                            {r.payments.map((pay, pi) => (
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

          {/* ── Documents tab ── */}
          {tab === 'documents' && (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-2 shrink-0">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={docName}
                    onChange={e => setDocName(e.target.value)}
                    placeholder="Sənəd adı (ixtiyari)"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <DateInput
                    value={docDate}
                    onChange={e => setDocDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 w-full justify-center px-4 py-2 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:border-amber-400 hover:text-amber-600 transition-colors disabled:opacity-60"
                >
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                  {uploading ? 'Yüklənir...' : 'Fayl seç və yüklə'}
                </button>
                <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
              </div>
              <div className="flex-1 overflow-y-auto">
                {docs.length === 0 ? (
                  <p className="py-10 text-center text-sm text-gray-400">Hələ sənəd yoxdur</p>
                ) : docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <FileText size={15} className="text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{doc.documentName || '—'}</p>
                      <p className="text-xs text-gray-400">{doc.fileType} · {formatDate(doc.documentDate || doc.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => customersApi.downloadDocument(customer.id, doc.id, doc.documentName)}
                      className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
                      title="Yüklə"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"
                      title="Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── History tab ── */}
          {tab === 'history' && (
            <div className="p-4">
              <ActivityFeed entityType="MÜŞTƏRİ" entityId={customer.id} />
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog />
    </>
  )
}
