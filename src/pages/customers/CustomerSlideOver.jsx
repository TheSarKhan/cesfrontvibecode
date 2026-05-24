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
  LOW:    { label: 'Aşağı',  pill: 'ces-p-ok' },
  MEDIUM: { label: 'Orta',   pill: 'ces-p-warn' },
  HIGH:   { label: 'Yüksək', pill: 'ces-p-danger' },
}
const STATUS_CONFIG = {
  ACTIVE:   { label: 'Aktiv',     pill: 'ces-p-ok' },
  PASSIVE:  { label: 'Passiv',    pill: 'ces-p-mute' },
  VARIABLE: { label: 'Dəyişkən',  pill: 'ces-p-info' },
}
const PAYMENT_LABEL = { CASH: 'Nağd', TRANSFER: 'Köçürmə' }

const PROJECT_STATUS_CONFIG = {
  PENDING:   { label: 'Gözləyir',     icon: Clock,       pill: 'ces-p-warn' },
  ACTIVE:    { label: 'Aktiv',        icon: PlayCircle,  pill: 'ces-p-ok' },
  COMPLETED: { label: 'Tamamlandı',   icon: CheckCircle, pill: 'ces-p-info' },
  CANCELLED: { label: 'Ləğv edildi',  icon: XCircle,     pill: 'ces-p-danger' },
  ON_HOLD:   { label: 'Dayandırıldı', icon: AlertCircle, pill: 'ces-p-mute' },
}
const PROJECT_TYPE_LABEL = { DAILY: 'Günlük', MONTHLY: 'Aylıq' }

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="ces-sec-label" style={{ fontSize: 10, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 14, color: 'var(--ces-ink)' }}>{value}</p>
    </div>
  )
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

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
      <div className="ces-drawer-backdrop" onClick={onClose} />

      <div className="ces-drawer">
        {/* Header */}
        <div className="ces-drawer-head">
          <div className="ces-m-ic gold">
            <Building2 size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="truncate" style={{ fontSize: 18, fontWeight: 800, color: 'var(--ces-ink)', letterSpacing: '-.01em' }}>
              {customer.companyName}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={clsx('ces-pill sm', status.pill)}>
                <span className="d"></span>{status.label}
              </span>
              <span className={clsx('ces-pill sm', risk.pill)}>
                <span className="d"></span>{risk.label} risk
              </span>
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

        {/* Tabs */}
        <div className="ces-tabs" style={{ padding: '0 12px', overflowX: 'auto', flexWrap: 'nowrap' }}>
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx('ces-tab', tab === t.id && 'on')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 14px', fontSize: 13 }}
              >
                <Icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="ces-drawer-body" style={{ padding: 0 }}>
          {/* ── Info tab ── */}
          {tab === 'info' && (
            <div style={{ padding: 22 }}>
              <p className="ces-sec-label" style={{ marginBottom: 14 }}>Şirkət</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <InfoRow label="ID" value={String(customer.id)} />
                <InfoRow label="VÖEN" value={customer.voen} />
                <InfoRow label="Ünvan" value={customer.address} />
                <InfoRow label="Direktor" value={customer.directorName} />
                <div>
                  <p className="ces-sec-label" style={{ fontSize: 10, marginBottom: 4 }}>Ödəniş növü</p>
                  <div className="flex flex-wrap gap-1">
                    {(customer.paymentTypes || []).length === 0
                      ? <span style={{ fontSize: 14, color: 'var(--ces-mute2)' }}>—</span>
                      : customer.paymentTypes.map(t => (
                          <span key={t} className="ces-pill ces-p-mute sm">
                            {PAYMENT_LABEL[t] || t}
                          </span>
                        ))
                    }
                  </div>
                </div>
              </div>

              <p className="ces-sec-label" style={{ marginBottom: 14 }}>Təchizatçı</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <InfoRow label="Məsul şəxs" value={customer.supplierPerson} />
                <InfoRow label="Telefon" value={customer.supplierPhone} />
              </div>

              <p className="ces-sec-label" style={{ marginBottom: 14 }}>Ofis</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <InfoRow label="Məsul şəxs" value={customer.officeContactPerson} />
                <InfoRow label="Telefon" value={customer.officeContactPhone} />
              </div>

              {customer.notes && (
                <>
                  <p className="ces-sec-label" style={{ marginBottom: 10 }}>Qeyd</p>
                  <p style={{ fontSize: 14, color: 'var(--ces-ink)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{customer.notes}</p>
                </>
              )}
            </div>
          )}

          {/* ── Projects tab ── */}
          {tab === 'projects' && (
            <div>
              {projectsLoading ? (
                <div className="flex items-center justify-center py-16 gap-2" style={{ color: 'var(--ces-muted)' }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Yüklənir...</span>
                </div>
              ) : projects.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--ces-graphite-50)', display: 'grid', placeItems: 'center' }}>
                    <FolderOpen size={24} style={{ color: 'var(--ces-mute2)' }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ces-ink)' }}>Layihə tapılmadı</p>
                  <p className="text-xs max-w-xs" style={{ color: 'var(--ces-muted)' }}>Bu müştəriyə aid aktiv layihə yoxdur.</p>
                </div>
              ) : (
                <div>
                  {projects.map(p => {
                    const sc = PROJECT_STATUS_CONFIG[p.status] || PROJECT_STATUS_CONFIG.PENDING
                    const StatusIcon = sc.icon
                    return (
                      <div key={p.id} style={{ padding: '16px 22px', borderBottom: '1px solid var(--ces-line-2)' }}>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ces-ink)' }}>{p.projectCode}</span>
                            {p.requestCode && (
                              <span className="mono" style={{ fontSize: 12, color: 'var(--ces-mute2)' }}>· {p.requestCode}</span>
                            )}
                          </div>
                          <span className={clsx('ces-pill sm', sc.pill)} style={{ flex: 'none' }}>
                            <StatusIcon size={11} />
                            {sc.label}
                          </span>
                        </div>

                        {(p.projectName || p.region) && (
                          <p className="truncate" style={{ fontSize: 13, color: 'var(--ces-muted)', marginBottom: 8 }}>
                            {[p.projectName, p.region].filter(Boolean).join(' — ')}
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1" style={{ fontSize: 12 }}>
                          {p.projectType && (
                            <span style={{ color: 'var(--ces-muted)' }}>Növ: <b style={{ color: 'var(--ces-ink)', fontWeight: 600 }}>{PROJECT_TYPE_LABEL[p.projectType] || p.projectType}</b></span>
                          )}
                          {p.equipmentName && (
                            <span className="truncate" style={{ color: 'var(--ces-muted)' }}>Texnika: <b style={{ color: 'var(--ces-ink)', fontWeight: 600 }}>{p.equipmentCode ? `${p.equipmentCode} – ${p.equipmentName}` : p.equipmentName}</b></span>
                          )}
                          {p.operatorName && (
                            <span style={{ color: 'var(--ces-muted)' }}>Operator: <b style={{ color: 'var(--ces-ink)', fontWeight: 600 }}>{p.operatorName}</b></span>
                          )}
                          {(p.planStartDate || p.startDate) && (
                            <span style={{ color: 'var(--ces-muted)' }}>Başlanğıc: <b style={{ color: 'var(--ces-ink)', fontWeight: 600 }}>{formatDate(p.startDate || p.planStartDate)}</b></span>
                          )}
                          {(p.planEndDate || p.endDate) && (
                            <span style={{ color: 'var(--ces-muted)' }}>Bitmə: <b style={{ color: 'var(--ces-ink)', fontWeight: 600 }}>{formatDate(p.endDate || p.planEndDate)}</b></span>
                          )}
                          {p.planDayCount != null && (
                            <span style={{ color: 'var(--ces-muted)' }}>Gün sayı: <b style={{ color: 'var(--ces-ink)', fontWeight: 600 }}>{p.planDayCount}</b></span>
                          )}
                        </div>

                        {(p.planEquipmentTotal != null || p.netProfit != null) && (
                          <div className="flex items-center gap-4 mt-3 pt-3" style={{ fontSize: 12, borderTop: '1px dashed var(--ces-line)' }}>
                            {p.planEquipmentTotal != null && (
                              <span style={{ color: 'var(--ces-muted)' }}>Müqavilə: <b style={{ color: 'var(--ces-ink)', fontWeight: 700 }}>{Number(p.planEquipmentTotal).toLocaleString()} ₼</b></span>
                            )}
                            {p.netProfit != null && (
                              <span style={{ color: 'var(--ces-muted)' }}>Mənfəət: <b style={{ fontWeight: 700, color: Number(p.netProfit) >= 0 ? 'var(--ces-ok)' : 'var(--ces-danger)' }}>{Number(p.netProfit).toLocaleString()} ₼</b></span>
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

          {/* ── Invoices tab ── */}
          {tab === 'invoices' && (
            <div style={{ padding: 22 }}>
              {invLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--ces-graphite-50)' }} />)}</div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'var(--ces-mute2)' }}>
                  <FileText size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Bu müştəri üçün hələ qaimə yoxdur</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="ces-sec-label" style={{ marginBottom: 10 }}>
                    {invoices.length} qaimə · {fmtMoney(invoices.reduce((s, i) => s + parseFloat(i.amount || 0), 0))}
                  </p>
                  {invoices.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3" style={{ padding: 12, borderRadius: 12, border: '1px solid var(--ces-line)', background: '#fbfaf6' }}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ces-ink)' }}>{inv.invoiceNumber || inv.accountingId || '—'}</span>
                          <span style={{ fontSize: 11, color: 'var(--ces-mute2)' }}>{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('az-AZ') : '—'}</span>
                          {inv.status === 'APPROVED' && <span className="ces-pill ces-p-ok sm">Təsdiqləndi</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {inv.equipmentName && <span className="truncate" style={{ fontSize: 11, color: 'var(--ces-muted)' }}>{inv.equipmentName}</span>}
                          {inv.projectCode && <span className="mono" style={{ fontSize: 11, color: 'var(--ces-info)' }}>{inv.projectCode}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="mono" style={{ fontSize: 14, fontWeight: 800, color: 'var(--ces-ok)' }}>{fmtMoney(inv.amount)}</p>
                        {inv.paidAmount != null && parseFloat(inv.paidAmount) > 0 && (
                          <p style={{ fontSize: 10, color: 'var(--ces-muted)' }}>daxil oldu: {fmtMoney(inv.paidAmount)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Receivables tab ── */}
          {tab === 'payments' && (
            <div style={{ padding: 22 }}>
              {recLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--ces-graphite-50)' }} />)}</div>
              ) : receivables.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'var(--ces-mute2)' }}>
                  <Banknote size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Bu müştəri üçün hələ alacaq yoxdur</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="ces-sec-label" style={{ marginBottom: 10 }}>
                    {receivables.length} alacaq · daxil oldu: {fmtMoney(receivables.reduce((s, r) => s + parseFloat(r.paidAmount || 0), 0))}
                  </p>
                  {receivables.map(r => {
                    const remaining = parseFloat(r.totalAmount || 0) - parseFloat(r.paidAmount || 0)
                    const statusCfg = {
                      PENDING:   { icon: Clock,         pill: 'ces-p-warn',   label: 'Gözləyir' },
                      PARTIAL:   { icon: AlertCircle,   pill: 'ces-p-info',   label: 'Qismən' },
                      COMPLETED: { icon: CheckCircle2,  pill: 'ces-p-ok',     label: 'Tamamlandı' },
                      OVERDUE:   { icon: AlertCircle,   pill: 'ces-p-danger', label: 'Gecikmiş' },
                    }[r.status] || { icon: Clock, pill: 'ces-p-mute', label: r.status }
                    const StatusIcon = statusCfg.icon
                    return (
                      <div key={r.id} style={{ padding: 14, borderRadius: 14, border: '1px solid var(--ces-line)', background: 'var(--ces-surface)' }} className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {r.projectCode && <p className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ces-ink)' }}>{r.projectCode}</p>}
                            {r.projectName && <p className="truncate" style={{ fontSize: 11, color: 'var(--ces-muted)' }}>{r.projectName}</p>}
                            {r.equipmentName && <p style={{ fontSize: 11, color: 'var(--ces-muted)', marginTop: 2 }}>{r.equipmentName}</p>}
                            {r.region && <p style={{ fontSize: 11, color: 'var(--ces-mute2)' }}>{r.region}</p>}
                          </div>
                          <span className={clsx('ces-pill sm', statusCfg.pill)} style={{ flex: 'none' }}>
                            <StatusIcon size={11} />{statusCfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4" style={{ fontSize: 12 }}>
                          <div>
                            <p className="ces-sec-label" style={{ fontSize: 9, marginBottom: 2 }}>Cəmi</p>
                            <p className="mono" style={{ fontWeight: 700, color: 'var(--ces-ink)' }}>{fmtMoney(r.totalAmount)}</p>
                          </div>
                          <div>
                            <p className="ces-sec-label" style={{ fontSize: 9, marginBottom: 2 }}>Daxil oldu</p>
                            <p className="mono" style={{ fontWeight: 700, color: 'var(--ces-ok)' }}>{fmtMoney(r.paidAmount)}</p>
                          </div>
                          {remaining > 0.01 && (
                            <div>
                              <p className="ces-sec-label" style={{ fontSize: 9, marginBottom: 2 }}>Qalıq</p>
                              <p className="mono" style={{ fontWeight: 700, color: 'var(--ces-danger)' }}>{fmtMoney(remaining)}</p>
                            </div>
                          )}
                        </div>
                        {r.payments && r.payments.length > 0 && (
                          <div className="pt-2 space-y-1" style={{ borderTop: '1px dashed var(--ces-line)' }}>
                            {r.payments.map((pay, pi) => (
                              <div key={pi} className="flex items-center justify-between" style={{ fontSize: 11 }}>
                                <span style={{ color: 'var(--ces-muted)' }}>{pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString('az-AZ') : '—'}{pay.note ? ` · ${pay.note}` : ''}</span>
                                <span className="mono" style={{ fontWeight: 700, color: 'var(--ces-ok)' }}>{fmtMoney(pay.amount)}</span>
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
              <div style={{ padding: 18, borderBottom: '1px solid var(--ces-line)' }} className="space-y-3 shrink-0">
                <div className="grid grid-cols-2 gap-2">
                  <div className="ces-input sm">
                    <input
                      value={docName}
                      onChange={e => setDocName(e.target.value)}
                      placeholder="Sənəd adı (ixtiyari)"
                    />
                  </div>
                  <div className="ces-input sm">
                    <DateInput
                      value={docDate}
                      onChange={e => setDocDate(e.target.value)}
                      className="w-full border-0 outline-0 bg-transparent text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2"
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '2px dashed var(--ces-line)',
                    background: 'var(--ces-surface)',
                    fontSize: 14, fontWeight: 600,
                    color: 'var(--ces-muted)',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    opacity: uploading ? .6 : 1,
                  }}
                >
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                  {uploading ? 'Yüklənir...' : 'Fayl seç və yüklə'}
                </button>
                <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
              </div>
              <div className="flex-1 overflow-y-auto">
                {docs.length === 0 ? (
                  <p className="py-10 text-center text-sm" style={{ color: 'var(--ces-mute2)' }}>Hələ sənəd yoxdur</p>
                ) : docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3" style={{ padding: '14px 22px', borderBottom: '1px solid var(--ces-line-2)' }}>
                    <div className="ces-m-ic gold" style={{ width: 36, height: 36, borderRadius: 10 }}>
                      <FileText size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ces-ink)' }}>{doc.documentName || '—'}</p>
                      <p style={{ fontSize: 12, color: 'var(--ces-muted)' }}>{doc.fileType} · {formatDate(doc.documentDate || doc.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => customersApi.downloadDocument(customer.id, doc.id, doc.documentName)}
                      className="ces-row-act gold"
                      title="Yüklə"
                    >
                      <Download size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="ces-row-act danger"
                      title="Sil"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── History tab ── */}
          {tab === 'history' && (
            <div style={{ padding: 22 }}>
              <ActivityFeed entityType="MÜŞTƏRİ" entityId={customer.id} />
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog />
    </>
  )
}
