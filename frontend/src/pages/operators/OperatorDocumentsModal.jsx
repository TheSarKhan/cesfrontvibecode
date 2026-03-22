import { useState, useRef } from 'react'
import { X, Upload, Trash2, CheckCircle, AlertCircle, Download, Eye } from 'lucide-react'
import { operatorsApi } from '../../api/operators'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'

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
  const [operator, setOperator] = useState(initial)
  const [loading, setLoading] = useState(null) // docType key
  const [deleting, setDeleting] = useState(null)
  const fileRefs = useRef({})

  const uploaded = new Set((operator.documents || []).map((d) => d.documentType))

  const getDoc = (type) => (operator.documents || []).find((d) => d.documentType === type)

  const handleUpload = async (type, file) => {
    if (!file) return
    setLoading(type)
    try {
      const res = await operatorsApi.uploadDocument(operator.id, type, file)
      const updated = res.data.data || res.data
      setOperator(updated)
      onUpdated(updated)
      toast.success('Sənəd yükləndi')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Yükləmə uğursuz oldu')
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
    } catch {
      toast.error('Silmə uğursuz oldu')
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">{operator.fullName}</h2>
            <div className="flex items-center gap-2 mt-1">
              {operator.documentsComplete ? (
                <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                  <CheckCircle size={12} /> Sənədlər tam ({completedCount}/{totalCount})
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                  <AlertCircle size={12} /> Natamam ({completedCount}/{totalCount})
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center shrink-0">
            <X size={14} className="text-white" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-5 pt-3 shrink-0">
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className={clsx('h-1.5 rounded-full transition-all', completedCount === totalCount ? 'bg-green-500' : 'bg-amber-500')}
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {DOC_TYPES.map(({ key, label }) => {
            const doc = getDoc(key)
            const isUploaded = !!doc
            const isLoading = loading === key
            const isDeleting = deleting === key

            return (
              <div key={key} className={clsx(
                'flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors',
                isUploaded
                  ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                  : 'bg-gray-50 dark:bg-gray-750 border-gray-200 dark:border-gray-700'
              )}>
                <div className="flex items-center gap-2.5 min-w-0">
                  {isUploaded
                    ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                    : <AlertCircle size={16} className="text-amber-400 shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
                    {doc && (
                      <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{doc.fileName}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isUploaded && (
                    <>
                      <button
                        onClick={() => handleView(doc)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Bax"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                        title="Endir"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(key)}
                        disabled={isDeleting}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        title="Sil"
                      >
                        {isDeleting
                          ? <span className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin block" />
                          : <Trash2 size={14} />
                        }
                      </button>
                    </>
                  )}

                  <label className={clsx(
                    'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors',
                    isUploaded
                      ? 'text-gray-500 border-gray-200 dark:border-gray-600 hover:border-amber-300 hover:text-amber-600'
                      : 'text-amber-600 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100',
                    isLoading && 'opacity-60 pointer-events-none'
                  )}>
                    {isLoading
                      ? <span className="w-3 h-3 border border-amber-600 border-t-transparent rounded-full animate-spin" />
                      : <Upload size={12} />
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
      </div>
      <ConfirmDialog />
    </div>
  )
}
