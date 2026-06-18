import { useState, useRef, useEffect } from 'react'
import { Upload, Download, Trash2, FileText, Loader2, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { useConfirm } from './ConfirmDialog'
import { validateFileUpload } from '../../utils/fileValidation'

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Kateqoriya sırası (UI-da bu ardıcıllıqla göstərilir)
const CATEGORY_ORDER = [
  'Əl ilə yüklənən',
  'Müqavilələr',
  'Təhvil-təslim aktları',
  'Texnika sənədləri',
  'Qaimələr / Fakturalar',
  'Qaimə aktları',
]

/**
 * Sənəd mərkəzi — bir tərəfin (müştəri/podratçı/investor) bütün sənədlərini
 * mənbələrdən toplayıb kateqoriyalara bölərək göstərir. Yalnız əl ilə yüklənənlər
 * silinə bilir; qalanları oxu-rejimi (endirmə) ilə göstərilir.
 *
 * Props:
 *  - docsApi: makePartyDocsApi(base) nəticəsi (getAllDocuments/uploadDocument/deleteDocument/downloadDocument)
 *  - partyId, partyName
 *  - canEdit (upload), canDelete
 */
export default function PartyDocumentsHub({ docsApi, partyId, partyName, canEdit = true, canDelete = true }) {
  const { confirm, ConfirmDialog } = useConfirm()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [busyKey, setBusyKey] = useState(null)
  const [docName, setDocName] = useState('')
  const fileRef = useRef()

  const load = async () => {
    try {
      const res = await docsApi.getAllDocuments(partyId)
      setDocs(res.data.data || [])
    } catch (err) {
      if (!err._toasted) toast.error('Sənədlər yüklənə bilmədi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (partyId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fileError = validateFileUpload(file)
    if (fileError) { toast.error(fileError); fileRef.current.value = ''; return }
    setUploading(true)
    try {
      await docsApi.uploadDocument(partyId, file, docName.trim() || file.name)
      setDocName('')
      toast.success('Sənəd yükləndi')
      await load()
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Sənəd yüklənə bilmədi')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDownload = async (doc) => {
    const key = doc.sourceType + ':' + doc.sourceId
    setBusyKey(key)
    try {
      await docsApi.downloadDocument(partyId, doc.sourceType, doc.sourceId, doc.name)
    } catch {
      toast.error('Fayl açıla bilmədi')
    } finally {
      setBusyKey(null)
    }
  }

  const handleDelete = async (doc) => {
    if (!(await confirm({ title: 'Sənədi sil', message: 'Bu sənədi silmək istəyirsiniz?' }))) return
    try {
      await docsApi.deleteDocument(partyId, doc.sourceId)
      toast.success('Sənəd silindi')
      await load()
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Sənəd silinə bilmədi')
    }
  }

  // Kateqoriyalara qrupla
  const groups = {}
  for (const d of docs) {
    const cat = d.category || 'Digər'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(d)
  }
  const orderedCats = [
    ...CATEGORY_ORDER.filter((c) => groups[c]),
    ...Object.keys(groups).filter((c) => !CATEGORY_ORDER.includes(c)),
  ]

  return (
    <div className="space-y-4">
      {/* Yükləmə */}
      {canEdit && (
        <div className="space-y-2" style={{ padding: 14, borderRadius: 12, border: '1px solid var(--ces-line)', background: 'var(--ces-surface)' }}>
          <div className="ces-input sm">
            <input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Sənəd adı (ixtiyari)" />
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2"
            style={{
              padding: '10px 16px', borderRadius: 12,
              border: '2px dashed var(--ces-line)', background: 'var(--ces-bg)',
              fontSize: 14, fontWeight: 600, color: 'var(--ces-muted)',
              cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? 'Yüklənir...' : 'Fayl seç və yüklə'}
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10" style={{ color: 'var(--ces-mute2)' }}>
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10" style={{ color: 'var(--ces-mute2)' }}>
          <FolderOpen size={28} />
          <p className="text-sm">Hələ sənəd yoxdur</p>
        </div>
      ) : (
        orderedCats.map((cat) => (
          <div key={cat}>
            <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ces-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>{cat}</span>
              <span style={{ fontSize: 11, color: 'var(--ces-mute2)' }}>({groups[cat].length})</span>
            </div>
            <div style={{ borderRadius: 12, border: '1px solid var(--ces-line)', overflow: 'hidden' }}>
              {groups[cat].map((doc) => {
                const key = doc.sourceType + ':' + doc.sourceId
                return (
                  <div key={key} className="flex items-center gap-3" style={{ padding: '12px 14px', borderBottom: '1px solid var(--ces-line-2)' }}>
                    <div className="ces-m-ic gold" style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0 }}>
                      <FileText size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ces-ink)' }}>{doc.name}</p>
                      <p className="truncate" style={{ fontSize: 11.5, color: 'var(--ces-muted)' }}>
                        {[doc.fileType, doc.context, formatDate(doc.date)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <button onClick={() => handleDownload(doc)} className="ces-row-act gold" title="Endir" disabled={busyKey === key}>
                      {busyKey === key ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                    </button>
                    {doc.manual && canDelete && (
                      <button onClick={() => handleDelete(doc)} className="ces-row-act danger" title="Sil">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
      <ConfirmDialog />
    </div>
  )
}
