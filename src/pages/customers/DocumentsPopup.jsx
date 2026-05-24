import { useState, useRef } from 'react'
import { X, Upload, Download, Trash2, FileText, Loader2 } from 'lucide-react'
import { customersApi } from '../../api/customers'
import toast from 'react-hot-toast'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { validateFileUpload } from '../../utils/fileValidation'

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function DocumentsPopup({ customer, onClose, onUpdated }) {
  const { confirm, ConfirmDialog } = useConfirm()
  const [docs, setDocs] = useState(customer.documents || [])
  const [uploading, setUploading] = useState(false)
  const [docName, setDocName] = useState('')
  const fileRef = useRef()

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fileError = validateFileUpload(file)
    if (fileError) { toast.error(fileError); fileRef.current.value = ''; return }
    setUploading(true)
    try {
      const res = await customersApi.uploadDocument(customer.id, file, docName.trim() || file.name)
      setDocs((prev) => [...prev, res.data.data])
      setDocName('')
      toast.success('Sənəd yükləndi')
      onUpdated?.()
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Sənəd yüklənə bilmədi')
    } finally {
      setUploading(false)
      fileRef.current.value = ''
    }
  }

  const handleDelete = async (docId) => {
    if (!(await confirm({ title: 'Sənədi sil', message: 'Sənədi silmək istəyirsiniz?' }))) return
    try {
      await customersApi.deleteDocument(customer.id, docId)
      setDocs((prev) => prev.filter((d) => d.id !== docId))
      toast.success('Sənəd silindi')
      onUpdated?.()
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Sənəd silinə bilmədi')
    }
  }

  return (
    <div className="ces-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="ces-modal" style={{ maxWidth: 520 }}>
        <div className="ces-m-head">
          <div className="ces-m-ic gold"><FileText size={20} /></div>
          <div className="flex-1 min-w-0">
            <h3>Sənədlər</h3>
            <p className="truncate">{customer.companyName}</p>
          </div>
          <button onClick={onClose} className="ces-modal-x" type="button" aria-label="Bağla">
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 22, borderBottom: '1px solid var(--ces-line)' }} className="space-y-3">
          <div className="ces-input sm">
            <input
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Sənəd adı (ixtiyari)"
            />
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2"
            style={{
              padding: '12px 16px', borderRadius: 12,
              border: '2px dashed var(--ces-line)', background: 'var(--ces-surface)',
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

        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {docs.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--ces-mute2)' }}>Hələ sənəd yoxdur</p>
          ) : (
            docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3" style={{ padding: '14px 22px', borderBottom: '1px solid var(--ces-line-2)' }}>
                <div className="ces-m-ic gold" style={{ width: 36, height: 36, borderRadius: 10 }}>
                  <FileText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ces-ink)' }}>{doc.documentName || '—'}</p>
                  <p style={{ fontSize: 12, color: 'var(--ces-muted)' }}>{doc.fileType} · {formatDate(doc.createdAt)}</p>
                </div>
                <a
                  href={customersApi.getDocumentDownloadUrl(customer.id, doc.id)}
                  download
                  className="ces-row-act gold"
                  title="Yüklə"
                >
                  <Download size={15} />
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="ces-row-act danger"
                  title="Sil"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      <ConfirmDialog />
    </div>
  )
}
