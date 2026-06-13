import { useState, useRef } from 'react'
import { X, Upload, Trash2, CheckCircle, AlertCircle, Download, Eye, FileText } from 'lucide-react'
import { operatorsApi } from '../../api/operators'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { validateFileUpload } from '../../utils/fileValidation'

const DOC_TYPES = [
  { key: 'DRIVING_LICENSE',    label: 'Sürücülük vəsiqəsi' },
  { key: 'CRIMINAL_RECORD',    label: 'Məhkumluq arayışı' },
  { key: 'HEALTH_CERTIFICATE', label: 'Sağlamlıq arayışı' },
  { key: 'CERTIFICATE',        label: 'Sertifikat' },
  { key: 'ID_CARD',            label: 'Şəxsiyyət vəsiqəsi' },
  { key: 'POWER_OF_ATTORNEY',  label: 'Etibarnamə sənədi' },
]

export default function OperatorDocumentsModal({ operator: initial, onClose, onUpdated }) {
  const { confirm, ConfirmDialog } = useConfirm()
  useEscapeKey(onClose)
  const [operator, setOperator] = useState(initial)
  const [loading, setLoading] = useState(null) // docType key
  const [deleting, setDeleting] = useState(null)
  const fileRefs = useRef({})

  const uploaded = new Set((operator.documents || []).map((d) => d.documentType))
  const getDoc = (type) => (operator.documents || []).find((d) => d.documentType === type)

  const handleUpload = async (type, file) => {
    if (!file) return
    const fileError = validateFileUpload(file)
    if (fileError) { toast.error(fileError); if (fileRefs.current[type]) fileRefs.current[type].value = ''; return }
    setLoading(type)
    try {
      const res = await operatorsApi.uploadDocument(operator.id, type, file)
      const updated = res.data.data || res.data
      setOperator(updated)
      onUpdated(updated)
      toast.success('Sənəd yükləndi')
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Sənəd yüklənə bilmədi')
    } finally {
      setLoading(null)
      if (fileRefs.current[type]) fileRefs.current[type].value = ''
    }
  }

  const handleDelete = async (type) => {
    const doc = getDoc(type)
    if (!doc) return
    if (!(await confirm({ title: 'Sənədi sil', message: `"${DOC_TYPES.find(d => d.key === type)?.label}" sənədini silmək istəyirsiniz?` }))) return
    setDeleting(type)
    try {
      const res = await operatorsApi.deleteDocument(operator.id, doc.id)
      const updated = res.data.data || res.data
      setOperator(updated)
      onUpdated(updated)
      toast.success('Sənəd silindi')
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Sənəd silinə bilmədi')
    } finally {
      setDeleting(null)
    }
  }

  const handleDownload = (doc) => {
    const url = operatorsApi.getDownloadUrl(operator.id, doc.id)
    const a = document.createElement('a')
    a.href = url
    a.download = doc.fileName || 'sened'
    a.click()
  }

  const handleView = (doc) => {
    const url = operatorsApi.getDownloadUrl(operator.id, doc.id)
    window.open(url, '_blank')
  }

  const completedCount = uploaded.size
  const totalCount = DOC_TYPES.length
  const percent = Math.round((completedCount / totalCount) * 100)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(58,58,58,0.45)] backdrop-blur-sm p-4 ces-font">
      <div className="bg-[var(--ces-surface)] rounded-[18px] shadow-[0_24px_48px_-20px_rgba(58,58,58,0.28),0_6px_14px_rgba(58,58,58,0.08)] w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3.5 px-6 pt-6 pb-5 border-b border-[var(--ces-line)] shrink-0">
          <div className="w-11 h-11 rounded-[12px] grid place-items-center bg-[var(--ces-gold-100)] text-[var(--ces-gold-700)] shrink-0">
            <FileText size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-[var(--ces-ink)] leading-tight truncate">{operator.fullName}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              {operator.documentsComplete ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--ces-ok-100)] text-[var(--ces-ok)]">
                  <CheckCircle size={11} /> Sənədlər tam
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--ces-warn-100)] text-[var(--ces-warn)]">
                  <AlertCircle size={11} /> Natamam
                </span>
              )}
              <span className="text-[12.5px] font-bold text-[var(--ces-ink)] tabular-nums">{completedCount}/{totalCount}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[8px] grid place-items-center text-[var(--ces-muted)] hover:bg-[var(--ces-graphite-50)] hover:text-[var(--ces-graphite)] transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4 shrink-0">
          <div className="w-full bg-[var(--ces-graphite-100)] rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${percent}%`,
                background: completedCount === totalCount ? 'var(--ces-ok)' : 'var(--ces-gold)',
              }}
            />
          </div>
          <p className="text-[11px] font-bold text-[var(--ces-muted)] mt-1.5 text-right tabular-nums">{percent}%</p>
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 scrollbar-thin">
          {DOC_TYPES.map(({ key, label }) => {
            const doc = getDoc(key)
            const isUploaded = !!doc
            const isLoading = loading === key
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
                    {doc && (
                      <p className="text-[11px] text-[var(--ces-muted)] truncate max-w-[200px] mt-0.5 font-mono">{doc.fileName}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isUploaded && (
                    <>
                      <button
                        onClick={() => handleView(doc)}
                        className="w-8 h-8 grid place-items-center rounded-[7px] text-[var(--ces-muted)] hover:text-[var(--ces-info)] hover:bg-[var(--ces-info-100)] transition-colors"
                        title="Bax"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="w-8 h-8 grid place-items-center rounded-[7px] text-[var(--ces-muted)] hover:text-[var(--ces-gold-700)] hover:bg-[var(--ces-gold-100)] transition-colors"
                        title="Endir"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(key)}
                        disabled={isDeleting}
                        className="w-8 h-8 grid place-items-center rounded-[7px] text-[var(--ces-muted)] hover:text-[var(--ces-danger)] hover:bg-[var(--ces-danger-100)] transition-colors disabled:opacity-50"
                        title="Sil"
                      >
                        {isDeleting
                          ? <span className="w-3.5 h-3.5 border-2 border-[var(--ces-danger)] border-t-transparent rounded-full animate-spin block" />
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
                    isLoading && 'opacity-60 pointer-events-none'
                  )}>
                    {isLoading
                      ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      : <Upload size={11} />
                    }
                    {isUploaded ? 'Dəyişdir' : 'Yüklə'}
                    <input
                      ref={(el) => { fileRefs.current[key] = el }}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.heic"
                      className="hidden"
                      onChange={(e) => handleUpload(key, e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-6 py-4 border-t border-[var(--ces-line)] bg-[var(--ces-graphite-50)] justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-[10px] text-sm font-semibold text-[var(--ces-graphite)] bg-white border border-[var(--ces-line)] hover:border-[var(--ces-graphite)] transition-colors"
          >
            Bağla
          </button>
        </div>
      </div>
      <ConfirmDialog />
    </div>
  )
}
