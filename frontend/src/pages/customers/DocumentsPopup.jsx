import { useState, useRef } from 'react'
import { X, Upload, Download, Trash2, FileText, Loader2 } from 'lucide-react'
import { customersApi } from '../../api/customers'
import toast from 'react-hot-toast'

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function DocumentsPopup({ customer, onClose, onUpdated }) {
  const [docs, setDocs] = useState(customer.documents || [])
  const [uploading, setUploading] = useState(false)
  const [docName, setDocName] = useState('')
  const fileRef = useRef()

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await customersApi.uploadDocument(customer.id, file, docName.trim() || file.name)
      setDocs((prev) => [...prev, res.data.data])
      setDocName('')
      toast.success('Sənəd yükləndi')
      onUpdated?.()
    } catch {
      toast.error('Yükləmə uğursuz oldu')
    } finally {
      setUploading(false)
      fileRef.current.value = ''
    }
  }

  const handleDelete = async (docId) => {
    if (!window.confirm('Sənədi silmək istəyirsiniz?')) return
    try {
      await customersApi.deleteDocument(customer.id, docId)
      setDocs((prev) => prev.filter((d) => d.id !== docId))
      toast.success('Sənəd silindi')
      onUpdated?.()
    } catch {
      toast.error('Silmə uğursuz oldu')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Sənədlər</h2>
            <p className="text-xs text-gray-400 mt-0.5">{customer.companyName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors"
          >
            <X size={14} className="text-white" />
          </button>
        </div>

        {/* Upload */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 space-y-2">
          <input
            type="text"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder="Sənəd adı (ixtiyari)"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 w-full justify-center px-4 py-2 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:border-amber-400 hover:text-amber-600 transition-colors disabled:opacity-60"
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? 'Yüklənir...' : 'Fayl seç və yüklə'}
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
        </div>

        {/* Doc list */}
        <div className="max-h-64 overflow-y-auto">
          {docs.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Hələ sənəd yoxdur</p>
          ) : (
            docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                <FileText size={16} className="text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{doc.documentName || '—'}</p>
                  <p className="text-xs text-gray-400">{doc.fileType} · {formatDate(doc.createdAt)}</p>
                </div>
                <a
                  href={customersApi.getDocumentDownloadUrl(customer.id, doc.id)}
                  download
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
                  title="Yüklə"
                >
                  <Download size={15} />
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"
                  title="Sil"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
