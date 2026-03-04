import { useState, useEffect, useRef } from 'react'
import { X, Plus, Upload, FileText, ClipboardCheck, History, Info } from 'lucide-react'
import { garageApi } from '../../api/garage'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const STATUS_CONFIG = {
  AVAILABLE: { label: 'Mövcud', cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  RENTED: { label: 'İcarədə', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  DEFECTIVE: { label: 'Nasaz', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
  OUT_OF_SERVICE: { label: 'Xidmətdən kənarda', cls: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
}

const OWNERSHIP_LABELS = {
  COMPANY: 'Şirkət',
  INVESTOR: 'İnvestor',
  CONTRACTOR: 'Podratçı',
}

const TABS = [
  { id: 'info', label: 'Məlumat', icon: Info },
  { id: 'inspections', label: 'Baxışlar', icon: ClipboardCheck },
  { id: 'documents', label: 'Sənədlər', icon: FileText },
  { id: 'history', label: 'Tarixçə', icon: History },
]

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-xs font-medium text-gray-800 dark:text-gray-200 text-right max-w-[60%]">{value || '—'}</span>
    </div>
  )
}

function InspectionsTab({ equipmentId }) {
  const [inspections, setInspections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ inspectionDate: '', description: '' })
  const [file, setFile] = useState(null)
  const [downloading, setDownloading] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    garageApi.getById(equipmentId)
      .then((res) => {
        const eq = res.data.data || res.data
        setInspections(eq.inspections || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [equipmentId])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.inspectionDate) return toast.error('Tarix tələb olunur')
    setSaving(true)
    try {
      const res = await garageApi.addInspection(equipmentId, {
        inspectionDate: form.inspectionDate,
        description: form.description || null,
      })
      const inspection = res.data.data || res.data
      if (file) {
        const updated = await garageApi.uploadInspectionDocument(equipmentId, inspection.id, file)
        setInspections((prev) => [...prev, updated.data.data || updated.data])
      } else {
        setInspections((prev) => [...prev, inspection])
      }
      setForm({ inspectionDate: '', description: '' })
      setFile(null)
      setShowForm(false)
      toast.success('Baxış əlavə edildi')
    } catch {
      toast.error('Əlavə uğursuz oldu')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async (ins) => {
    setDownloading(ins.id)
    try {
      await garageApi.downloadInspectionDoc(equipmentId, ins.id, ins.documentName || `baxis-${ins.id}`)
    } catch {
      toast.error('Yükləmə uğursuz oldu')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) return <div className="py-8 text-center text-sm text-gray-400">Yüklənir...</div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">{inspections.length} baxış</span>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
        >
          <Plus size={13} />
          Yeni baxış
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-3 bg-amber-50/40 dark:bg-amber-900/10">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tarix *</label>
            <input
              type="date"
              value={form.inspectionDate}
              onChange={(e) => setForm((f) => ({ ...f, inspectionDate: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Açıqlama</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Baxış qeydləri..."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sənəd (istəyə bağlı)</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-amber-400 transition-colors"
            >
              <Upload size={14} className="text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {file ? file.name : 'Fayl seçin...'}
              </span>
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files[0] || null)} />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Əlavə et
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFile(null) }}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Ləğv et
            </button>
          </div>
        </form>
      )}

      {inspections.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-6">Hələ baxış yoxdur</p>
      ) : (
        <div className="space-y-2">
          {inspections.map((ins) => (
            <div key={ins.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3.5 bg-white dark:bg-gray-800">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                    <ClipboardCheck size={14} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {ins.inspectionDate ? new Date(ins.inspectionDate).toLocaleDateString('az-AZ') : '—'}
                    </p>
                    {ins.performedByUserName && (
                      <p className="text-[10px] text-gray-400">{ins.performedByUserName}</p>
                    )}
                  </div>
                </div>
                {ins.documentPath && (
                  <button
                    onClick={() => handleDownload(ins)}
                    disabled={downloading === ins.id}
                    className="flex items-center gap-1 text-[10px] font-medium text-amber-600 hover:text-amber-700 disabled:opacity-50 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors shrink-0"
                  >
                    {downloading === ins.id
                      ? <span className="w-3 h-3 border border-amber-600 border-t-transparent rounded-full animate-spin" />
                      : <FileText size={10} />
                    }
                    Sənəd
                  </button>
                )}
              </div>
              {ins.description && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 pl-10">{ins.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DocumentsTab({ equipmentId }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [docName, setDocName] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [downloading, setDownloading] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    garageApi.getById(equipmentId)
      .then((res) => {
        const eq = res.data.data || res.data
        setDocuments(eq.documents || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [equipmentId])

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setSelectedFile(f)
    if (!docName) setDocName(f.name.replace(/\.[^/.]+$/, ''))
    setShowForm(true)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile) return toast.error('Fayl seçin')
    setUploading(true)
    try {
      const res = await garageApi.addDocument(equipmentId, selectedFile, docName || selectedFile.name)
      setDocuments((prev) => [...prev, res.data.data || res.data])
      toast.success('Sənəd yükləndi')
      setShowForm(false)
      setDocName('')
      setSelectedFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      toast.error('Yükləmə uğursuz oldu')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (doc) => {
    setDownloading(doc.id)
    try {
      await garageApi.downloadDocument(equipmentId, doc.id, doc.documentName || `sened-${doc.id}`)
    } catch {
      toast.error('Yükləmə uğursuz oldu')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) return <div className="py-8 text-center text-sm text-gray-400">Yüklənir...</div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">{documents.length} sənəd</span>
        <label className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 cursor-pointer transition-colors">
          <Upload size={13} />
          Fayl seç
          <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />
        </label>
      </div>

      {showForm && selectedFile && (
        <form onSubmit={handleUpload} className="border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-3 bg-amber-50/40 dark:bg-amber-900/10">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <FileText size={13} className="text-amber-500 shrink-0" />
            <span className="truncate">{selectedFile.name}</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sənədin adı</label>
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Müqavilə, Texniki pasport..."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={uploading}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {uploading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Yüklə
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setSelectedFile(null); setDocName(''); if (fileRef.current) fileRef.current.value = '' }}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Ləğv et
            </button>
          </div>
        </form>
      )}

      {documents.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-6">Hələ sənəd yoxdur</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-3 border border-gray-100 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                <FileText size={14} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                  {doc.documentName || `Sənəd ${doc.id}`}
                </p>
                <p className="text-[10px] text-gray-400">
                  {doc.uploadedByUserName && `${doc.uploadedByUserName} · `}
                  {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('az-AZ') : ''}
                </p>
              </div>
              <button
                onClick={() => handleDownload(doc)}
                disabled={downloading === doc.id}
                className="flex items-center gap-1 text-[10px] font-medium text-amber-600 hover:text-amber-700 disabled:opacity-50 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors shrink-0"
              >
                {downloading === doc.id
                  ? <span className="w-3 h-3 border border-amber-600 border-t-transparent rounded-full animate-spin" />
                  : <Upload size={10} className="rotate-180" />
                }
                Endir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HistoryTab({ equipmentId }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    garageApi.getProjectHistory(equipmentId)
      .then((res) => setHistory(res.data.data || res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [equipmentId])

  if (loading) return <div className="py-8 text-center text-sm text-gray-400">Yüklənir...</div>

  if (history.length === 0) {
    return <p className="text-center text-sm text-gray-400 py-6">Layihə tarixçəsi yoxdur</p>
  }

  return (
    <div className="space-y-2">
      {history.map((h, i) => (
        <div key={h.id || i} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{h.projectName || h.project?.name || '—'}</span>
            <span className="text-[10px] text-gray-400">{h.startDate} — {h.endDate || 'davam edir'}</span>
          </div>
          {h.notes && <p className="text-xs text-gray-500 dark:text-gray-400">{h.notes}</p>}
        </div>
      ))}
    </div>
  )
}

export default function EquipmentSlideOver({ equipment, onClose, onEdit }) {
  const [activeTab, setActiveTab] = useState('info')

  const status = STATUS_CONFIG[equipment.status] || STATUS_CONFIG.AVAILABLE

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 truncate">{equipment.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              {equipment.brand && (
                <span className="text-xs text-gray-400">{equipment.brand} {equipment.model}</span>
              )}
              <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-medium border', status.cls)}>
                {status.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onEdit}
              className="text-xs font-medium text-amber-600 hover:text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              Redaktə et
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors"
            >
              <X size={14} className="text-white" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2',
                activeTab === id
                  ? 'border-amber-600 text-amber-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          {activeTab === 'info' && (
            <div>
              <InfoRow label="Texnika kodu" value={equipment.equipmentCode} />
              <InfoRow label="Növ" value={equipment.type} />
              <InfoRow label="Mülkiyyət növü" value={OWNERSHIP_LABELS[equipment.ownershipType]} />
              <InfoRow label="Seriya nömrəsi" value={equipment.serialNumber} />
              <InfoRow label="İstehsal ili" value={equipment.year} />
              <InfoRow label="Günlük tarif" value={equipment.dailyRate ? `${equipment.dailyRate} AZN` : null} />
              {equipment.ownershipType === 'INVESTOR' && (
                <>
                  <InfoRow label="İnvestorun adı" value={equipment.investorName} />
                  <InfoRow label="İnvestor VÖEN" value={equipment.investorVoen} />
                  <InfoRow label="İnvestor telefon" value={equipment.investorPhone} />
                </>
              )}
              {equipment.ownershipType === 'CONTRACTOR' && (
                <InfoRow label="Podratçı" value={equipment.contractor?.companyName} />
              )}
              {equipment.description && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Qeydlər</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{equipment.description}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'inspections' && <InspectionsTab equipmentId={equipment.id} />}
          {activeTab === 'documents' && <DocumentsTab equipmentId={equipment.id} />}
          {activeTab === 'history' && <HistoryTab equipmentId={equipment.id} />}
        </div>
      </div>
    </>
  )
}
