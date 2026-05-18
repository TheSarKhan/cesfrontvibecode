import { useState, useRef, useEffect } from 'react'
import { X, Pencil, Trash2, User, FileText, History, Phone, Mail, MapPin, CheckCircle, AlertCircle, Upload, Download, Eye, FolderKanban, Calendar, Banknote } from 'lucide-react'
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
  PENDING:   { label: 'Gözləyir',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  ACTIVE:    { label: 'Aktiv',       cls: 'bg-green-50 text-green-700 border-green-200' },
  COMPLETED: { label: 'Tamamlandı',  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  CANCELLED: { label: 'Ləğv edildi', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  ON_HOLD:   { label: 'Dayandırıldı',cls: 'bg-red-50 text-red-600 border-red-200' },
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
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <User size={18} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 truncate">{operator.fullName}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              {operator.documentsComplete ? (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                  <CheckCircle size={9} /> Sənədlər tam
                </span>
              ) : (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                  <AlertCircle size={9} /> Natamam ({completedCount}/{totalCount})
                </span>
              )}
              {operator.specialization && (
                <span className="text-[11px] text-gray-400 truncate">{operator.specialization}</span>
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
        <div className="flex gap-0.5 px-4 pt-3 pb-0 border-b border-gray-100 dark:border-gray-800 shrink-0">
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
                {t.id === 'documents' && (
                  <span className={clsx(
                    'text-[10px] font-bold px-1 rounded',
                    operator.documentsComplete ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  )}>
                    {completedCount}/{totalCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Məlumat tab ── */}
          {tab === 'info' && (
            <div className="p-5 space-y-4">
              {operator.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <Phone size={14} className="text-gray-400 shrink-0" />
                  {operator.phone}
                </div>
              )}
              {operator.email && (
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <Mail size={14} className="text-gray-400 shrink-0" />
                  {operator.email}
                </div>
              )}
              {operator.address && (
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <MapPin size={14} className="text-gray-400 shrink-0" />
                  {operator.address}
                </div>
              )}
              {operator.specialization && (
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">İxtisas</p>
                  <p className="text-sm text-gray-700 dark:text-gray-200">{operator.specialization}</p>
                </div>
              )}
              {operator.notes && (
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Qeyd</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{operator.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Sənədlər tab ── */}
          {tab === 'documents' && (
            <div className="p-4">
              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Sənədlərin tamamlanma faizi</span>
                  <span className="font-medium">{completedCount}/{totalCount}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className={clsx('h-1.5 rounded-full transition-all', completedCount === totalCount ? 'bg-green-500' : 'bg-amber-500')}
                    style={{ width: `${(completedCount / totalCount) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {DOC_TYPES.map(({ key, label }) => {
                  const doc = getDoc(key)
                  const isUploaded = !!doc
                  const isUploading = uploading === key
                  const isDeleting = deleting === key

                  return (
                    <div key={key} className={clsx(
                      'flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors',
                      isUploaded
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    )}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isUploaded
                          ? <CheckCircle size={15} className="text-green-500 shrink-0" />
                          : <AlertCircle size={15} className="text-amber-400 shrink-0" />
                        }
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
                          {doc && <p className="text-[10px] text-gray-400 truncate max-w-[180px]">{doc.fileName}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isUploaded && (
                          <>
                            <button
                              onClick={() => operatorsApi.previewDocument(operator.id, doc.id, doc.fileName)}
                              className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              title="Bax"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => operatorsApi.downloadDocument(operator.id, doc.id, doc.fileName)}
                              className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                              title="Endir"
                            >
                              <Download size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteDoc(key)}
                              disabled={isDeleting}
                              className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                              title="Sil"
                            >
                              {isDeleting
                                ? <span className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin block" />
                                : <Trash2 size={13} />
                              }
                            </button>
                          </>
                        )}
                        <label className={clsx(
                          'flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg border cursor-pointer transition-colors',
                          isUploaded
                            ? 'text-gray-500 border-gray-200 dark:border-gray-600 hover:border-amber-300 hover:text-amber-600'
                            : 'text-amber-600 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100',
                          isUploading && 'opacity-60 pointer-events-none'
                        )}>
                          {isUploading
                            ? <span className="w-3 h-3 border border-amber-600 border-t-transparent rounded-full animate-spin" />
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
            <div className="p-4">
              {projectsLoading ? (
                <p className="text-center text-sm text-gray-400 py-8">Yüklənir...</p>
              ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <FolderKanban size={32} className="mb-2 opacity-30" />
                  <p className="text-sm">Bu operator heç bir layihəyə təyin edilməyib</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    {projects.length} layihə tapıldı
                  </p>
                  {projects.map(p => {
                    const s = PROJECT_STATUS[p.status] || { label: p.status, cls: 'bg-gray-100 text-gray-500 border-gray-200' }
                    return (
                      <div key={p.projectId} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">
                              {p.companyName || '—'}
                            </p>
                            {p.projectName && (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{p.projectName}</p>
                            )}
                          </div>
                          <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${s.cls}`}>
                            {s.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                          {p.projectCode && (
                            <span className="flex items-center gap-1 col-span-2">
                              <span className="font-medium text-gray-700 dark:text-gray-300">{p.projectCode}</span>
                              {p.requestCode && <span className="text-gray-400">· {p.requestCode}</span>}
                            </span>
                          )}
                          {p.equipmentName && (
                            <span className="flex items-center gap-1 col-span-2 truncate">
                              🔧 {p.equipmentName}
                              {p.equipmentCode && <span className="text-gray-400">({p.equipmentCode})</span>}
                            </span>
                          )}
                          {p.region && (
                            <span className="flex items-center gap-1">
                              <MapPin size={10} /> {p.region}
                            </span>
                          )}
                          {p.dayCount && (
                            <span className="flex items-center gap-1">
                              <Calendar size={10} /> {p.dayCount} gün
                            </span>
                          )}
                          {(p.startDate || p.endDate) && (
                            <span className="flex items-center gap-1 col-span-2">
                              <Calendar size={10} />
                              {p.startDate || '?'} → {p.endDate || '?'}
                            </span>
                          )}
                          {p.operatorPayment != null && (
                            <span className="flex items-center gap-1 col-span-2 font-semibold text-amber-700 dark:text-amber-400">
                              <Banknote size={10} />
                              Operator haqqı: {Number(p.operatorPayment).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
                            </span>
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
            <div className="p-4">
              <ActivityFeed entityType="OPERATOR" entityId={operator.id} />
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog />
    </>
  )
}
