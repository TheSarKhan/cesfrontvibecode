import { useState, useRef, useEffect } from 'react'
import { X, Pencil, Trash2, User, FileText, History, Phone, Mail, MapPin, CheckCircle, AlertCircle, Upload, Download, Eye, FolderKanban, Calendar, Banknote, Truck } from 'lucide-react'
import { clsx } from 'clsx'
import { operatorsApi } from '../../api/operators'
import ActivityFeed from '../../components/common/ActivityFeed'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import toast from 'react-hot-toast'
import { validateFileUpload } from '../../utils/fileValidation'

const DOC_TYPES = [
  { key: 'DRIVING_LICENSE',    label: 'Sürücülük vəsiqəsi' },
  { key: 'CRIMINAL_RECORD',    label: 'Məhkumluq arayışı' },
  { key: 'HEALTH_CERTIFICATE', label: 'Sağlamlıq arayışı' },
  { key: 'CERTIFICATE',        label: 'Sertifikat' },
  { key: 'ID_CARD',            label: 'Şəxsiyyət vəsiqəsi' },
  { key: 'POWER_OF_ATTORNEY',  label: 'Etibarnamə sənədi' },
]

const TABS = [
  { id: 'info',     label: 'Məlumat',          icon: User },
  { id: 'documents', label: 'Sənədlər',        icon: FileText },
  { id: 'projects', label: 'Layihə Tarixçəsi', icon: FolderKanban },
  { id: 'history',  label: 'Tarixçə',          icon: History },
]

const PROJECT_STATUS = {
  PENDING:   { label: 'Gözləyir',     cls: 'bg-[var(--ces-warn-100)] text-[var(--ces-warn)]' },
  ACTIVE:    { label: 'Aktiv',        cls: 'bg-[var(--ces-info-100)] text-[var(--ces-info)]' },
  COMPLETED: { label: 'Tamamlandı',   cls: 'bg-[var(--ces-ok-100)] text-[var(--ces-ok)]' },
  CANCELLED: { label: 'Ləğv edildi',  cls: 'bg-[var(--ces-graphite-100)] text-[var(--ces-muted)]' },
  ON_HOLD:   { label: 'Dayandırıldı', cls: 'bg-[var(--ces-danger-100)] text-[var(--ces-danger)]' },
}

export default function OperatorSlideOver({ operator: initial, onClose, onEdit, onDelete, onUpdated }) {
  const [tab, setTab] = useState('info')
  const [operator, setOperator] = useState(initial)
  const [uploading, setUploading] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const fileRefs = useRef({})
  const { confirm, ConfirmDialog } = useConfirm()
  useEscapeKey(onClose)

  useEffect(() => {
    if (tab !== 'projects') return
    setProjectsLoading(true)
    operatorsApi.getProjectHistory(operator.id)
      .then(r => setProjects(r.data?.data ?? r.data ?? []))
      .catch(() => toast.error('Layihə tarixçəsi yüklənmədi'))
      .finally(() => setProjectsLoading(false))
  }, [tab, operator.id])

  const uploadedTypes = new Set((operator.documents || []).map(d => d.documentType))
  const getDoc = (type) => (operator.documents || []).find(d => d.documentType === type)
  const completedCount = uploadedTypes.size
  const totalCount = DOC_TYPES.length

  const handleUpload = async (type, file) => {
    if (!file) return
    const fileError = validateFileUpload(file)
    if (fileError) { toast.error(fileError); if (fileRefs.current[type]) fileRefs.current[type].value = ''; return }
    setUploading(type)
    try {
      const res = await operatorsApi.uploadDocument(operator.id, type, file)
      const updated = res.data.data || res.data
      setOperator(updated)
      onUpdated?.(updated)
      toast.success('Sənəd yükləndi')
    } catch {
      // error toast handled by axios interceptor
    } finally {
      setUploading(null)
      if (fileRefs.current[type]) fileRefs.current[type].value = ''
    }
  }

  const handleDeleteDoc = async (type) => {
    const doc = getDoc(type)
    if (!doc) return
    if (!(await confirm({ title: 'Sənədi sil', message: `"${DOC_TYPES.find(d => d.key === type)?.label}" sənədini silmək istəyirsiniz?` }))) return
    setDeleting(type)
    try {
      const res = await operatorsApi.deleteDocument(operator.id, doc.id)
      const updated = res.data.data || res.data
      setOperator(updated)
      onUpdated?.(updated)
      toast.success('Sənəd silindi')
    } catch {
      // error toast handled by axios interceptor
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[rgba(58,58,58,0.45)] backdrop-blur-sm" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-[var(--ces-surface)] shadow-[0_24px_48px_-20px_rgba(58,58,58,0.28),0_6px_14px_rgba(58,58,58,0.08)] flex flex-col ces-font">

        {/* Header */}
        <div className="flex items-start gap-3.5 px-6 py-5 border-b border-[var(--ces-line)] shrink-0 bg-white">
          <div className="w-11 h-11 rounded-[12px] grid place-items-center bg-[var(--ces-gold-100)] text-[var(--ces-gold-700)] shrink-0">
            <User size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[17px] font-extrabold text-[var(--ces-ink)] truncate tracking-tight">{operator.fullName}</h2>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {operator.documentsComplete ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--ces-ok-100)] text-[var(--ces-ok)]">
                  <CheckCircle size={10} /> Sənədlər tam
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--ces-warn-100)] text-[var(--ces-warn)]">
                  <AlertCircle size={10} /> Natamam ({completedCount}/{totalCount})
                </span>
              )}
              {operator.specialization && (
                <span className="text-[11.5px] font-semibold text-[var(--ces-muted)] truncate">{operator.specialization}</span>
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
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3.5 py-3 text-[13px] font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors',
                  on
                    ? 'text-[var(--ces-graphite)] border-[var(--ces-gold)]'
                    : 'text-[var(--ces-muted)] border-transparent hover:text-[var(--ces-graphite)]'
                )}
              >
                <Icon size={14} />
                {t.label}
                {t.id === 'documents' && (
                  <span className={clsx(
                    'text-[10.5px] font-bold px-1.5 py-0.5 rounded-full ml-1',
                    operator.documentsComplete
                      ? 'bg-[var(--ces-ok-100)] text-[var(--ces-ok)]'
                      : 'bg-[var(--ces-warn-100)] text-[var(--ces-warn)]'
                  )}>
                    {completedCount}/{totalCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto bg-[var(--ces-bg)]">

          {/* ── Məlumat tab ── */}
          {tab === 'info' && (
            <div className="p-5 space-y-4">
              <div className="bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[16px] p-5 shadow-[0_1px_2px_rgba(58,58,58,0.06)]">
                <h3 className="text-[11px] tracking-[0.16em] uppercase font-bold text-[var(--ces-muted)] mb-4">Əlaqə</h3>
                <div className="space-y-3">
                  {operator.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-8 h-8 rounded-[8px] bg-[var(--ces-graphite-50)] grid place-items-center shrink-0">
                        <Phone size={14} className="text-[var(--ces-muted)]" />
                      </span>
                      <span className="font-semibold text-[var(--ces-ink)] font-mono tabular-nums">{operator.phone}</span>
                    </div>
                  )}
                  {operator.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-8 h-8 rounded-[8px] bg-[var(--ces-graphite-50)] grid place-items-center shrink-0">
                        <Mail size={14} className="text-[var(--ces-muted)]" />
                      </span>
                      <span className="font-medium text-[var(--ces-ink)] break-all">{operator.email}</span>
                    </div>
                  )}
                  {operator.address && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-8 h-8 rounded-[8px] bg-[var(--ces-graphite-50)] grid place-items-center shrink-0">
                        <MapPin size={14} className="text-[var(--ces-muted)]" />
                      </span>
                      <span className="font-medium text-[var(--ces-ink)]">{operator.address}</span>
                    </div>
                  )}
                  {!operator.phone && !operator.email && !operator.address && (
                    <p className="text-[13px] text-[var(--ces-muted)] italic">Əlaqə məlumatı yoxdur</p>
                  )}
                </div>
              </div>

              {operator.specialization && (
                <div className="bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[16px] p-5 shadow-[0_1px_2px_rgba(58,58,58,0.06)]">
                  <h3 className="text-[11px] tracking-[0.16em] uppercase font-bold text-[var(--ces-muted)] mb-2">İxtisas</h3>
                  <p className="text-sm font-semibold text-[var(--ces-ink)]">{operator.specialization}</p>
                </div>
              )}

              {operator.notes && (
                <div className="bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[16px] p-5 shadow-[0_1px_2px_rgba(58,58,58,0.06)]">
                  <h3 className="text-[11px] tracking-[0.16em] uppercase font-bold text-[var(--ces-muted)] mb-2">Qeyd</h3>
                  <p className="text-sm text-[var(--ces-ink)] whitespace-pre-wrap leading-relaxed">{operator.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Sənədlər tab ── */}
          {tab === 'documents' && (
            <div className="p-5 space-y-4">
              {/* Progress card */}
              <div className="bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[16px] p-5 shadow-[0_1px_2px_rgba(58,58,58,0.06)]">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[11px] tracking-[0.16em] uppercase font-bold text-[var(--ces-muted)]">Tamamlanma</span>
                  <span className="text-[15px] font-extrabold text-[var(--ces-ink)] tabular-nums">{completedCount}/{totalCount}</span>
                </div>
                <div className="w-full bg-[var(--ces-graphite-100)] rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${(completedCount / totalCount) * 100}%`,
                      background: completedCount === totalCount ? 'var(--ces-ok)' : 'var(--ces-gold)',
                    }}
                  />
                </div>
              </div>

              {/* Doc list */}
              <div className="space-y-2">
                {DOC_TYPES.map(({ key, label }) => {
                  const doc = getDoc(key)
                  const isUploaded = !!doc
                  const isUploading = uploading === key
                  const isDeleting = deleting === key

                  return (
                    <div key={key} className={clsx(
                      'flex items-center justify-between gap-3 p-3.5 rounded-[14px] border transition-colors',
                      isUploaded
                        ? 'bg-[var(--ces-surface)] border-[var(--ces-ok-100)]'
                        : 'bg-[var(--ces-surface)] border-[var(--ces-line)]'
                    )}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={clsx(
                          'w-9 h-9 rounded-[10px] grid place-items-center shrink-0',
                          isUploaded
                            ? 'bg-[var(--ces-ok-100)] text-[var(--ces-ok)]'
                            : 'bg-[var(--ces-warn-100)] text-[var(--ces-warn)]'
                        )}>
                          {isUploaded ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[var(--ces-ink)]">{label}</p>
                          {doc && <p className="text-[11px] text-[var(--ces-muted)] truncate max-w-[180px] mt-0.5 font-mono">{doc.fileName}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isUploaded && (
                          <>
                            <button
                              onClick={() => operatorsApi.previewDocument(operator.id, doc.id, doc.fileName)}
                              className="w-8 h-8 grid place-items-center rounded-[7px] text-[var(--ces-muted)] hover:text-[var(--ces-info)] hover:bg-[var(--ces-info-100)] transition-colors"
                              title="Bax"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => operatorsApi.downloadDocument(operator.id, doc.id, doc.fileName)}
                              className="w-8 h-8 grid place-items-center rounded-[7px] text-[var(--ces-muted)] hover:text-[var(--ces-gold-700)] hover:bg-[var(--ces-gold-100)] transition-colors"
                              title="Endir"
                            >
                              <Download size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteDoc(key)}
                              disabled={isDeleting}
                              className="w-8 h-8 grid place-items-center rounded-[7px] text-[var(--ces-muted)] hover:text-[var(--ces-danger)] hover:bg-[var(--ces-danger-100)] transition-colors disabled:opacity-50"
                              title="Sil"
                            >
                              {isDeleting
                                ? <span className="w-3 h-3 border-2 border-[var(--ces-danger)] border-t-transparent rounded-full animate-spin block" />
                                : <Trash2 size={14} />
                              }
                            </button>
                          </>
                        )}
                        <label className={clsx(
                          'inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1.5 rounded-[8px] cursor-pointer transition-colors ml-1',
                          isUploaded
                            ? 'text-[var(--ces-graphite)] bg-white border border-[var(--ces-line)] hover:border-[var(--ces-graphite)]'
                            : 'text-[var(--ces-on-gold)] bg-[var(--ces-gold)] hover:bg-[var(--ces-gold-700)]',
                          isUploading && 'opacity-60 pointer-events-none'
                        )}>
                          {isUploading
                            ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            : <Upload size={11} />
                          }
                          {isUploaded ? 'Dəyişdir' : 'Yüklə'}
                          <input
                            ref={el => { fileRefs.current[key] = el }}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.heic"
                            className="hidden"
                            onChange={e => handleUpload(key, e.target.files?.[0])}
                          />
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Layihə Tarixçəsi tab ── */}
          {tab === 'projects' && (
            <div className="p-5">
              {projectsLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-24 bg-[var(--ces-graphite-100)] rounded-[14px] animate-pulse" />)}
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-16 bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[16px]">
                  <FolderKanban size={32} className="mx-auto mb-3 text-[var(--ces-mute2)] opacity-50" />
                  <p className="text-sm font-semibold text-[var(--ces-muted)]">Bu operator heç bir layihəyə təyin edilməyib</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-[var(--ces-muted)]">{projects.length} layihə</p>
                  {projects.map(p => {
                    const s = PROJECT_STATUS[p.status] || { label: p.status, cls: 'bg-[var(--ces-graphite-100)] text-[var(--ces-muted)]' }
                    return (
                      <div key={p.projectId} className="rounded-[14px] border border-[var(--ces-line)] p-4 space-y-2.5 bg-[var(--ces-surface)] shadow-[0_1px_2px_rgba(58,58,58,0.06)]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[var(--ces-ink)] truncate">{p.companyName || '—'}</p>
                            {p.projectName && <p className="text-xs text-[var(--ces-muted)] truncate mt-0.5">{p.projectName}</p>}
                          </div>
                          <span className={clsx('px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0', s.cls)}>{s.label}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                          {p.projectCode && <span className="font-mono font-bold text-[var(--ces-graphite)]">{p.projectCode}</span>}
                          {p.requestCode && <span className="font-mono text-[var(--ces-muted)]">{p.requestCode}</span>}
                          {p.region && (
                            <span className="inline-flex items-center gap-1 text-[var(--ces-muted)]">
                              <MapPin size={10} /> {p.region}
                            </span>
                          )}
                        </div>

                        {p.equipmentName && (
                          <div className="flex items-center gap-1.5 text-xs text-[var(--ces-ink)]">
                            <Truck size={12} className="text-[var(--ces-gold-700)] shrink-0" />
                            <span className="font-semibold truncate">{p.equipmentName}</span>
                            {p.equipmentCode && <span className="text-[10.5px] font-mono text-[var(--ces-muted)]">({p.equipmentCode})</span>}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t border-dashed border-[var(--ces-line)]">
                          {(p.startDate || p.endDate) && (
                            <div className="flex items-center gap-1.5 text-[11px] text-[var(--ces-muted)]">
                              <Calendar size={11} />
                              <span>{p.startDate || '?'} — {p.endDate || '?'}</span>
                              {p.dayCount && <span className="ml-0.5">({p.dayCount} gün)</span>}
                            </div>
                          )}
                          {p.operatorPayment != null && (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--ces-gold-700)] tabular-nums">
                              <Banknote size={11} />
                              <span>{Number(p.operatorPayment).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼</span>
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

          {/* ── Tarixçə tab ── */}
          {tab === 'history' && (
            <div className="p-5">
              <ActivityFeed entityType="OPERATOR" entityId={operator.id} />
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog />
    </>
  )
}
