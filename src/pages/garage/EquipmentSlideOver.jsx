import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Plus, Upload, FileText, ClipboardCheck, History, Info, Image, Trash2, ArrowRight, RefreshCw, CalendarClock, Pencil, Download, ZoomIn, Wrench, DollarSign, MapPin, User, Building2, Clock } from 'lucide-react'
import { garageApi } from '../../api/garage'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'

const STATUS_CONFIG = {
  AVAILABLE: { label: 'Mövcud', cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  RENTED: { label: 'İcarədə', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  IN_TRANSIT: { label: 'Yolda', cls: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' },
  IN_INSPECTION: { label: 'Baxışdadır', cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' },
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
  { id: 'images', label: 'Şəkillər', icon: Image },
  { id: 'history', label: 'Tarixçə', icon: History },
]

function inspectionCountdown(nextDate) {
  if (!nextDate) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const next = new Date(nextDate); next.setHours(0, 0, 0, 0)
  const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { days: diff, label: `${Math.abs(diff)} gün gecikib`, cls: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' }
  if (diff === 0) return { days: 0, label: 'Bu gün', cls: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' }
  if (diff <= 7) return { days: diff, label: `${diff} gün qalıb`, cls: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' }
  if (diff <= 30) return { days: diff, label: `${diff} gün qalıb`, cls: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' }
  return { days: diff, label: `${diff} gün qalıb`, cls: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' }
}

function InfoCard({ title, icon: Icon, children, className }) {
  return (
    <div className={clsx('bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700 p-3.5', className)}>
      <div className="flex items-center gap-1.5 mb-2.5">
        {Icon && <Icon size={13} className="text-amber-500" />}
        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{title}</p>
      </div>
      {children}
    </div>
  )
}

function InfoField({ label, value, mono }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-gray-400 dark:text-gray-500">{label}</span>
      <span className={clsx('text-xs font-medium text-gray-800 dark:text-gray-200', mono && 'font-mono')}>{value || '—'}</span>
    </div>
  )
}

function InspectionsTab({ equipmentId }) {
  const [inspections, setInspections] = useState([])
  const [nextInspectionDate, setNextInspectionDate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingIns, setEditingIns] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState({ inspectionDate: '', nextDate: '', description: '' })
  const [file, setFile] = useState(null)
  const [downloading, setDownloading] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    garageApi.getById(equipmentId)
      .then((res) => {
        const eq = res.data.data || res.data
        setInspections(eq.inspections || [])
        setNextInspectionDate(eq.nextInspectionDate || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [equipmentId])

  // Derive last inspection date from inspections list (handles historical entries)
  const latestInspection = useMemo(() => {
    if (!inspections.length) return null
    return inspections.reduce((latest, ins) => {
      if (!ins.inspectionDate) return latest
      if (!latest) return ins
      return new Date(ins.inspectionDate) > new Date(latest.inspectionDate) ? ins : latest
    }, null)
  }, [inspections])

  const nextInsp = useMemo(() => inspectionCountdown(nextInspectionDate), [nextInspectionDate])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.inspectionDate) return toast.error('Tarix tələb olunur')
    setSaving(true)
    try {
      // If editing, delete the old inspection first
      if (editingIns) {
        await garageApi.deleteInspection(equipmentId, editingIns.id)
        setInspections((prev) => prev.filter((i) => i.id !== editingIns.id))
      }

      const res = await garageApi.addInspection(equipmentId, {
        inspectionDate: form.inspectionDate,
        description: form.description || null,
      })
      let inspection = res.data.data || res.data
      if (file) {
        const updated = await garageApi.uploadInspectionDocument(equipmentId, inspection.id, file)
        inspection = updated.data.data || updated.data
      }
      setInspections((prev) => [...prev, inspection])

      // Update lastInspectionDate if this inspection is newer than all existing ones
      const currentList = editingIns
        ? inspections.filter((i) => i.id !== editingIns.id)
        : inspections
      const isNewest = currentList.every((i) =>
        !i.inspectionDate || form.inspectionDate >= i.inspectionDate
      )
      const updatePayload = {}
      if (isNewest) updatePayload.lastInspectionDate = form.inspectionDate
      if (form.nextDate) {
        updatePayload.nextInspectionDate = form.nextDate
        setNextInspectionDate(form.nextDate)
      }
      if (Object.keys(updatePayload).length > 0) {
        garageApi.update(equipmentId, updatePayload).catch(() => {})
      }

      cancelForm()
      toast.success(editingIns ? 'Baxış yeniləndi' : 'Baxış əlavə edildi')
    } catch {
      toast.error(editingIns ? 'Yeniləmə uğursuz oldu' : 'Əlavə uğursuz oldu')
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

  const handleDelete = async (ins) => {
    if (!window.confirm(`${ins.inspectionDate || ''} tarixli baxışı silmək istəyirsiniz?`)) return
    setDeleting(ins.id)
    try {
      await garageApi.deleteInspection(equipmentId, ins.id)
      setInspections((prev) => prev.filter((i) => i.id !== ins.id))
      toast.success('Baxış silindi')
    } catch {
      toast.error('Silmə uğursuz oldu')
    } finally {
      setDeleting(null)
    }
  }

  const startEdit = (ins) => {
    setEditingIns(ins)
    setForm({
      inspectionDate: ins.inspectionDate || '',
      nextDate: '',
      description: ins.description || '',
    })
    setFile(null)
    setShowForm(true)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingIns(null)
    setFile(null)
    setForm({ inspectionDate: '', nextDate: '', description: '' })
  }

  if (loading) return <div className="py-8 text-center text-sm text-gray-400">Yüklənir...</div>

  return (
    <div className="space-y-3">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-[10px] text-gray-400 mb-0.5">Son baxış</p>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
            {latestInspection?.inspectionDate
              ? new Date(latestInspection.inspectionDate).toLocaleDateString('az-AZ')
              : '—'}
          </p>
        </div>
        <div className={clsx(
          'p-2.5 rounded-lg border',
          nextInsp ? nextInsp.cls : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
        )}>
          <p className="text-[10px] opacity-70 mb-0.5">Növbəti baxış</p>
          <p className="text-xs font-semibold">
            {nextInsp ? nextInsp.label : (nextInspectionDate ? new Date(nextInspectionDate).toLocaleDateString('az-AZ') : '—')}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">{inspections.length} baxış</span>
        <button
          onClick={() => { cancelForm(); setShowForm((v) => !v) }}
          className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
        >
          <Plus size={13} />
          Yeni baxış
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-3 bg-amber-50/40 dark:bg-amber-900/10">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Baxış tarixi *</label>
              <input
                type="date"
                value={form.inspectionDate}
                onChange={(e) => setForm((f) => ({ ...f, inspectionDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Növbəti baxış</label>
              <input
                type="date"
                value={form.nextDate}
                onChange={(e) => setForm((f) => ({ ...f, nextDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
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
              {editingIns ? 'Yadda saxla' : 'Əlavə et'}
            </button>
            <button
              type="button"
              onClick={cancelForm}
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
          {[...inspections].sort((a, b) => (b.inspectionDate || '').localeCompare(a.inspectionDate || '')).map((ins) => (
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
                <div className="flex items-center gap-1 shrink-0">
                  {ins.documentPath && (
                    <button
                      onClick={() => handleDownload(ins)}
                      disabled={downloading === ins.id}
                      className="flex items-center gap-1 text-[10px] font-medium text-amber-600 hover:text-amber-700 disabled:opacity-50 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                    >
                      {downloading === ins.id
                        ? <span className="w-3 h-3 border border-amber-600 border-t-transparent rounded-full animate-spin" />
                        : <FileText size={10} />
                      }
                      Sənəd
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(ins)}
                    className="p-1.5 rounded text-gray-400 hover:text-amber-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Redaktə"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(ins)}
                    disabled={deleting === ins.id}
                    className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    title="Sil"
                  >
                    {deleting === ins.id
                      ? <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      : <Trash2 size={12} />
                    }
                  </button>
                </div>
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
  const [deleting, setDeleting] = useState(null)
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

  const handleDelete = async (doc) => {
    if (!window.confirm(`"${doc.documentName || 'Sənəd'}" silmək istəyirsiniz?`)) return
    setDeleting(doc.id)
    try {
      await garageApi.deleteDocument(equipmentId, doc.id)
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      toast.success('Sənəd silindi')
    } catch {
      toast.error('Silmə uğursuz oldu')
    } finally {
      setDeleting(null)
    }
  }

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
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleDownload(doc)}
                  disabled={downloading === doc.id}
                  className="flex items-center gap-1 text-[10px] font-medium text-amber-600 hover:text-amber-700 disabled:opacity-50 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                >
                  {downloading === doc.id
                    ? <span className="w-3 h-3 border border-amber-600 border-t-transparent rounded-full animate-spin" />
                    : <Upload size={10} className="rotate-180" />
                  }
                  Endir
                </button>
                <button
                  onClick={() => handleDelete(doc)}
                  disabled={deleting === doc.id}
                  className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  title="Sil"
                >
                  {deleting === doc.id
                    ? <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    : <Trash2 size={12} />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function AuthImage({ equipmentId, imageId, alt, className, lazy = true }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [inView, setInView] = useState(!lazy)
  const imgRef = useRef(null)

  // Lazy load via IntersectionObserver
  useEffect(() => {
    if (!lazy || inView) return
    const el = imgRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect() }
    }, { rootMargin: '100px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [lazy, inView])

  useEffect(() => {
    if (!inView) return
    let cancelled = false
    let url = null
    garageApi.fetchImageBlob(equipmentId, imageId)
      .then((u) => { url = u; if (!cancelled) setBlobUrl(u) })
      .catch(() => {})
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
  }, [equipmentId, imageId, inView])

  if (!blobUrl) return <div ref={imgRef} className={clsx(className, 'animate-pulse bg-gray-200 dark:bg-gray-700')} />
  return <img src={blobUrl} alt={alt} className={className} />
}

function ImageLightbox({ blobUrl, name, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = name || 'şəkil'
    a.click()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <img src={blobUrl} alt={name} className="max-w-full max-h-[85vh] rounded-lg object-contain" />
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <button
            onClick={handleDownload}
            className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
            title="Yüklə"
          >
            <Download size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
            title="Bağla"
          >
            <X size={16} />
          </button>
        </div>
        {name && (
          <p className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">{name}</p>
        )}
      </div>
    </div>
  )
}

function ImagesTab({ equipmentId }) {
  const { confirm, ConfirmDialog } = useConfirm()
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    garageApi.getById(equipmentId)
      .then((res) => {
        const eq = res.data.data || res.data
        setImages(eq.images || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [equipmentId])

  const uploadFile = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Yalnız şəkil faylları yüklənə bilər')
    setUploading(true)
    try {
      const res = await garageApi.addImage(equipmentId, file)
      setImages((prev) => [...prev, res.data.data || res.data])
      toast.success('Şəkil yükləndi')
    } catch {
      toast.error('Yükləmə uğursuz oldu')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleFileSelect = (e) => uploadFile(e.target.files?.[0])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) uploadFile(file)
  }
  const handleDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  const handleDelete = async (img) => {
    if (!(await confirm({ title: 'Şəkili sil', message: 'Şəkili silmək istəyirsiniz?' }))) return
    setDeleting(img.id)
    try {
      await garageApi.deleteImage(equipmentId, img.id)
      setImages((prev) => prev.filter((i) => i.id !== img.id))
      toast.success('Şəkil silindi')
    } catch {
      toast.error('Silmə uğursuz oldu')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <div className="py-8 text-center text-sm text-gray-400">Yüklənir...</div>

  return (
    <div
      className="space-y-3"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">{images.length} şəkil</span>
        <label className={clsx(
          'flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 cursor-pointer transition-colors',
          uploading && 'opacity-50 pointer-events-none'
        )}>
          {uploading
            ? <span className="w-3 h-3 border border-amber-600 border-t-transparent rounded-full animate-spin" />
            : <Upload size={13} />
          }
          Şəkil yüklə
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </label>
      </div>

      {/* Drop zone indicator */}
      {dragging && (
        <div className="border-2 border-dashed border-amber-400 rounded-xl p-6 text-center bg-amber-50/50 dark:bg-amber-900/10">
          <Upload size={24} className="mx-auto text-amber-500 mb-1" />
          <p className="text-xs text-amber-600 font-medium">Şəkili bura buraxın</p>
        </div>
      )}

      {!dragging && images.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-amber-300 transition-colors"
          onClick={() => fileRef.current?.click()}>
          <Upload size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-1" />
          <p className="text-xs text-gray-400">Şəkil sürükləyin və ya klikləyin</p>
        </div>
      ) : !dragging && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative group rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 aspect-video cursor-pointer"
              onClick={() => {
                garageApi.fetchImageBlob(equipmentId, img.id)
                  .then((url) => setLightbox({ url, name: img.imageName || `Şəkil ${img.id}` }))
                  .catch(() => toast.error('Şəkil yüklənmədi'))
              }}
            >
              <AuthImage
                equipmentId={equipmentId}
                imageId={img.id}
                alt={img.imageName || 'Şəkil'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <span className="p-1.5 rounded-full bg-white/80 text-gray-700">
                  <ZoomIn size={14} />
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(img) }}
                  disabled={deleting === img.id}
                  className="p-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                >
                  {deleting === img.id
                    ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                    : <Trash2 size={13} />
                  }
                </button>
              </div>
              <p className="absolute bottom-0 left-0 right-0 text-[9px] text-white bg-black/40 px-1.5 py-0.5 truncate">
                {img.imageName || `Şəkil ${img.id}`}
              </p>
            </div>
          ))}
        </div>
      )}
      {lightbox && (
        <ImageLightbox
          blobUrl={lightbox.url}
          name={lightbox.name}
          onClose={() => { URL.revokeObjectURL(lightbox.url); setLightbox(null) }}
        />
      )}
      <ConfirmDialog />
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
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{h.projectName || '—'}</p>
              {h.notes && <p className="text-[10px] text-gray-400 mt-0.5">{h.notes}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-gray-400">{h.startDate || '—'} → {h.endDate || 'davam edir'}</p>
              {h.contractorRevenue > 0 && (
                <p className="text-[10px] font-medium text-orange-500">{parseFloat(h.contractorRevenue).toLocaleString('az-AZ')} ₼</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const STATUS_LABELS = {
  AVAILABLE: { label: 'Mövcud', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
  RENTED: { label: 'İcarədə', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
  IN_TRANSIT: { label: 'Yolda', cls: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' },
  IN_INSPECTION: { label: 'Baxışdadır', cls: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' },
  DEFECTIVE: { label: 'Nasaz', cls: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
  OUT_OF_SERVICE: { label: 'Xidmətdən kənarda', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
}

export default function EquipmentSlideOver({ equipment, onClose, onEdit, onClone }) {
  const [activeTab, setActiveTab] = useState('info')

  const status = STATUS_CONFIG[equipment.status] || STATUS_CONFIG.AVAILABLE
  const nextInsp = useMemo(() => inspectionCountdown(equipment.nextInspectionDate), [equipment.nextInspectionDate])

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
              {nextInsp && (
                <span className={clsx('flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border', nextInsp.cls)}>
                  <CalendarClock size={10} />
                  {nextInsp.label}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onClone && (
              <button
                onClick={onClone}
                className="text-xs font-medium text-purple-600 hover:text-purple-700 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
              >
                Kopyala
              </button>
            )}
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
                'flex-1 flex items-center justify-center gap-1 py-2.5 px-1 text-[11px] font-medium transition-colors border-b-2',
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 scrollbar-thin">
          {activeTab === 'info' && (
            <div className="space-y-3">
              {/* General Info */}
              <InfoCard title="Ümumi məlumatlar" icon={Info}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <InfoField label="Texnika kodu" value={equipment.equipmentCode} mono />
                  <InfoField label="Seriya nömrəsi" value={equipment.serialNumber} mono />
                  <InfoField label="Növ / Kateqoriya" value={equipment.type} />
                  <InfoField label="Brend" value={equipment.brand} />
                  <InfoField label="Model" value={equipment.model} />
                  <InfoField label="İstehsal ili" value={equipment.manufactureYear} />
                </div>
              </InfoCard>

              {/* Financial */}
              <InfoCard title="Maliyyə" icon={DollarSign}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <InfoField label="Alınma tarixi" value={equipment.purchaseDate ? new Date(equipment.purchaseDate).toLocaleDateString('az-AZ') : null} />
                  <InfoField label="Alış qiyməti" value={equipment.purchasePrice != null ? `${Number(equipment.purchasePrice).toLocaleString()} ₼` : null} />
                  <InfoField label="Cari bazar dəyəri" value={equipment.currentMarketValue != null ? `${Number(equipment.currentMarketValue).toLocaleString()} ₼` : null} />
                  <InfoField label="Amortizasiya" value={equipment.depreciationRate != null ? `${equipment.depreciationRate}%` : null} />
                </div>
              </InfoCard>

              {/* Technical */}
              <InfoCard title="Texniki göstəricilər" icon={Wrench}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <InfoField label="Saat / KM" value={equipment.hourKmCounter} />
                  <InfoField label="Moto saatlar" value={equipment.motoHours != null ? `${Number(equipment.motoHours).toLocaleString()} s` : null} />
                  <InfoField label="Saxlanma yeri" value={equipment.storageLocation} />
                  <InfoField label="Məsul şəxs" value={equipment.responsibleUserName} />
                </div>
              </InfoCard>

              {/* Inspection */}
              <InfoCard title="Texniki baxış" icon={ClipboardCheck}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <InfoField label="Son texniki baxış" value={equipment.lastInspectionDate ? new Date(equipment.lastInspectionDate).toLocaleDateString('az-AZ') : null} />
                  <InfoField label="Növbəti texniki baxış" value={equipment.nextInspectionDate ? new Date(equipment.nextInspectionDate).toLocaleDateString('az-AZ') : null} />
                </div>
                {nextInsp && (
                  <div className={clsx('mt-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium inline-block', nextInsp.cls)}>
                    {nextInsp.label}
                  </div>
                )}
              </InfoCard>

              {/* Status & Ownership */}
              <InfoCard title="Status və mülkiyyət" icon={Building2}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">Status</span>
                    <span className={clsx('inline-flex self-start px-2 py-0.5 rounded text-[10px] font-semibold border', status.cls)}>
                      {status.label}
                    </span>
                  </div>
                  <InfoField label="Mülkiyyət növü" value={OWNERSHIP_LABELS[equipment.ownershipType]} />
                </div>
              </InfoCard>

              {/* Investor details */}
              {equipment.ownershipType === 'INVESTOR' && (
                <InfoCard title="İnvestor məlumatları" icon={User}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <InfoField label="Ad, soyad" value={equipment.ownerInvestorName} />
                    <InfoField label="VÖEN" value={equipment.ownerInvestorVoen} mono />
                    <InfoField label="Əlaqə nömrəsi" value={equipment.ownerInvestorPhone} />
                  </div>
                </InfoCard>
              )}

              {/* Contractor details */}
              {equipment.ownershipType === 'CONTRACTOR' && (
                <InfoCard title="Podratçı məlumatları" icon={Building2}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <InfoField label="Podratçı adı" value={equipment.ownerContractorName} />
                    <InfoField label="VÖEN" value={equipment.ownerContractorVoen} mono />
                    <InfoField label="Əlaqə nömrəsi" value={equipment.ownerContractorPhone} />
                    <InfoField label="Əlaqədar şəxs" value={equipment.ownerContractorContact} />
                  </div>
                </InfoCard>
              )}

              {/* Notes */}
              {equipment.notes && (
                <InfoCard title="Qeydlər" icon={FileText}>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{equipment.notes}</p>
                </InfoCard>
              )}
            </div>
          )}

          {activeTab === 'inspections' && <InspectionsTab equipmentId={equipment.id} />}
          {activeTab === 'documents' && <DocumentsTab equipmentId={equipment.id} />}
          {activeTab === 'images' && <ImagesTab equipmentId={equipment.id} />}
          {activeTab === 'history' && <HistoryTab equipmentId={equipment.id} />}
        </div>
      </div>
    </>
  )
}
