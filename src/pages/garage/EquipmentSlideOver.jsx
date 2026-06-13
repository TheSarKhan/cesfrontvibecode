import DateInput from '../../components/common/DateInput'
import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Plus, Upload, FileText, ClipboardCheck, History, Info, Image as ImageIcon, Trash2, CalendarClock, Pencil, Download, ZoomIn, Wrench, DollarSign, User, Building2, CheckCircle, ShieldCheck, Save, Copy } from 'lucide-react'
import { garageApi } from '../../api/garage'
import { configApi } from '../../api/config'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { STATUS_CFG, OWN_LABEL, inspectionCountdown } from '../../constants/garage'
import { validateFileUpload } from '../../utils/fileValidation'

const TABS = [
  { id: 'info', label: 'Məlumat', icon: Info },
  { id: 'inspections', label: 'Baxışlar', icon: ClipboardCheck },
  { id: 'documents', label: 'Sənədlər', icon: FileText },
  { id: 'images', label: 'Şəkillər', icon: ImageIcon },
  { id: 'history', label: 'Tarixçə', icon: History },
]

function InfoCard({ title, icon: Icon, children, className }) {
  return (
    <div className={clsx('bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[16px] p-5 shadow-[0_1px_2px_rgba(58,58,58,0.06)]', className)}>
      <div className="flex items-center gap-1.5 mb-3.5">
        {Icon && <Icon size={13} className="text-[var(--ces-gold-700)]" />}
        <p className="text-[11px] tracking-[0.16em] uppercase font-bold text-[var(--ces-muted)]">{title}</p>
      </div>
      {children}
    </div>
  )
}

function InfoField({ label, value, mono }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.12em]">{label}</span>
      <span className={clsx('text-[13px] font-semibold text-[var(--ces-ink)]', mono && 'font-mono tabular-nums')}>{value || '—'}</span>
    </div>
  )
}

/* ─── InspectionsTab ───────────────────────────────────────────────── */
function InspectionsTab({ equipmentId }) {
  const { confirm, ConfirmDialog } = useConfirm()
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
    if (file) {
      const fileError = validateFileUpload(file, 'document')
      if (fileError) return toast.error(fileError)
    }
    setSaving(true)
    try {
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
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Baxış əlavə edilə bilmədi')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async (ins) => {
    setDownloading(ins.id)
    try {
      await garageApi.downloadInspectionDoc(equipmentId, ins.id, ins.documentName || `baxis-${ins.id}`)
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Sənəd endirilə bilmədi')
    } finally {
      setDownloading(null)
    }
  }

  const handleDelete = async (ins) => {
    if (!(await confirm({ title: 'Baxışı sil', message: `${ins.inspectionDate || ''} tarixli baxışı silmək istəyirsiniz?` }))) return
    setDeleting(ins.id)
    try {
      await garageApi.deleteInspection(equipmentId, ins.id)
      setInspections((prev) => prev.filter((i) => i.id !== ins.id))
      toast.success('Baxış silindi')
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Baxış silinə bilmədi')
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

  if (loading) return <div className="py-10 text-center text-sm font-semibold text-[var(--ces-muted)]">Yüklənir...</div>

  const dateInputCls = 'w-full px-3.5 py-2.5 text-sm bg-white border border-[var(--ces-line)] rounded-[11px] text-[var(--ces-ink)] focus:outline-none focus:border-[var(--ces-graphite)] focus:ring-[3px] focus:ring-[rgba(58,58,58,0.1)] transition-all'

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-[14px] border border-[var(--ces-line)] bg-[var(--ces-surface)]">
          <p className="text-[10.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.12em] mb-1.5">Son baxış</p>
          <p className="text-[14px] font-bold text-[var(--ces-ink)] tabular-nums">
            {latestInspection?.inspectionDate
              ? new Date(latestInspection.inspectionDate).toLocaleDateString('az-AZ')
              : '—'}
          </p>
        </div>
        <div className={clsx(
          'p-3.5 rounded-[14px] border',
          nextInsp ? nextInsp.cls + ' border-transparent' : 'border-[var(--ces-line)] bg-[var(--ces-surface)]'
        )}>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] mb-1.5 opacity-80">Növbəti baxış</p>
          <p className="text-[14px] font-bold tabular-nums">
            {nextInsp ? nextInsp.label : (nextInspectionDate ? new Date(nextInspectionDate).toLocaleDateString('az-AZ') : '—')}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] tracking-[0.14em] uppercase font-bold text-[var(--ces-muted)]">{inspections.length} baxış</span>
        <button
          onClick={() => { cancelForm(); setShowForm((v) => !v) }}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--ces-gold-700)] hover:text-[var(--ces-graphite)] transition-colors"
        >
          <Plus size={14} />
          Yeni baxış
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="border border-[var(--ces-gold-100)] rounded-[14px] p-4 space-y-3 bg-[var(--ces-gold-50)]">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[12px] font-semibold text-[var(--ces-ink)] mb-1.5">Baxış tarixi *</label>
              <DateInput
                value={form.inspectionDate}
                onChange={(e) => setForm((f) => ({ ...f, inspectionDate: e.target.value }))}
                className={dateInputCls}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[var(--ces-ink)] mb-1.5">Növbəti baxış</label>
              <DateInput
                value={form.nextDate}
                onChange={(e) => setForm((f) => ({ ...f, nextDate: e.target.value }))}
                className={dateInputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--ces-ink)] mb-1.5">Açıqlama</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Baxış qeydləri..."
              className={clsx(dateInputCls, 'resize-none')}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--ces-ink)] mb-1.5">Sənəd (istəyə bağlı)</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2.5 border-2 border-dashed border-[var(--ces-line)] rounded-[11px] cursor-pointer hover:border-[var(--ces-gold)] transition-colors bg-white"
            >
              <Upload size={14} className="text-[var(--ces-mute2)]" />
              <span className="text-[12.5px] text-[var(--ces-muted)] truncate">
                {file ? file.name : 'Fayl seçin...'}
              </span>
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files[0] || null)} />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={cancelForm}
              className="text-[12px] font-semibold text-[var(--ces-graphite)] bg-white border border-[var(--ces-line)] hover:border-[var(--ces-graphite)] px-3 py-2 rounded-[8px] transition-colors"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-[var(--ces-gold)] hover:bg-[var(--ces-gold-700)] disabled:opacity-60 text-[var(--ces-on-gold)] text-[12px] font-bold px-4 py-2 rounded-[8px] transition-colors"
            >
              {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editingIns ? 'Yadda saxla' : 'Əlavə et'}
            </button>
          </div>
        </form>
      )}

      {inspections.length === 0 ? (
        <div className="text-center py-12 bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[14px]">
          <ClipboardCheck size={28} className="mx-auto mb-3 text-[var(--ces-mute2)] opacity-50" />
          <p className="text-sm font-semibold text-[var(--ces-muted)]">Hələ baxış yoxdur</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...inspections].sort((a, b) => (b.inspectionDate || '').localeCompare(a.inspectionDate || '')).map((ins) => (
            <div key={ins.id} className="border border-[var(--ces-line)] rounded-[14px] p-3.5 bg-[var(--ces-surface)] shadow-[0_1px_2px_rgba(58,58,58,0.06)]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-[10px] bg-[var(--ces-gold-100)] grid place-items-center shrink-0">
                    <ClipboardCheck size={15} className="text-[var(--ces-gold-700)]" />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-bold text-[var(--ces-ink)] tabular-nums">
                      {ins.inspectionDate ? new Date(ins.inspectionDate).toLocaleDateString('az-AZ') : '—'}
                    </p>
                    {ins.performedByUserName && (
                      <p className="text-[11px] text-[var(--ces-muted)] mt-0.5">{ins.performedByUserName}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {ins.documentPath && (
                    <button
                      onClick={() => handleDownload(ins)}
                      disabled={downloading === ins.id}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--ces-gold-700)] bg-white border border-[var(--ces-gold-100)] hover:border-[var(--ces-gold-700)] disabled:opacity-50 px-2.5 py-1.5 rounded-[8px] transition-colors"
                    >
                      {downloading === ins.id
                        ? <span className="w-3 h-3 border-2 border-[var(--ces-gold-700)] border-t-transparent rounded-full animate-spin" />
                        : <Download size={11} />
                      }
                      Sənəd
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(ins)}
                    className="w-8 h-8 grid place-items-center rounded-[7px] text-[var(--ces-muted)] hover:text-[var(--ces-gold-700)] hover:bg-[var(--ces-gold-100)] transition-colors"
                    title="Redaktə"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(ins)}
                    disabled={deleting === ins.id}
                    className="w-8 h-8 grid place-items-center rounded-[7px] text-[var(--ces-muted)] hover:text-[var(--ces-danger)] hover:bg-[var(--ces-danger-100)] transition-colors disabled:opacity-50"
                    title="Sil"
                  >
                    {deleting === ins.id
                      ? <span className="w-3 h-3 border-2 border-[var(--ces-danger)] border-t-transparent rounded-full animate-spin" />
                      : <Trash2 size={13} />
                    }
                  </button>
                </div>
              </div>
              {ins.description && (
                <p className="mt-2.5 text-[12.5px] text-[var(--ces-muted)] pl-11 leading-relaxed">{ins.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog />
    </div>
  )
}

const MANDATORY_DOCS = [
  { value: 'REGISTRATION_CERT', label: 'Qeydiyyat şəhadətnaməsi' },
  { value: 'THIRD_PARTY_INSPECTION', label: '3-cü tərəf texniki baxış sənədi' },
  { value: 'TECHNICAL_INSPECTION', label: 'Texniki baxış sənədi' },
]

/* ─── DocumentsTab ─────────────────────────────────────────────────── */
function DocumentsTab({ equipmentId }) {
  const { confirm, ConfirmDialog } = useConfirm()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(null)
  const [extraForm, setExtraForm] = useState(false)
  const [docName, setDocName] = useState('')
  const [downloading, setDownloading] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const mandatoryRefs = useRef({})
  const extraRef = useRef()

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
    if (!(await confirm({ title: 'Sənədi sil', message: `"${doc.documentName || 'Sənəd'}" silmək istəyirsiniz?` }))) return
    setDeleting(doc.id)
    try {
      await garageApi.deleteDocument(equipmentId, doc.id)
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      toast.success('Sənəd silindi')
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Sənəd silinə bilmədi')
    } finally {
      setDeleting(null)
    }
  }

  const handleMandatoryUpload = async (e, docType) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fileError = validateFileUpload(file, 'document')
    if (fileError) { toast.error(fileError); e.target.value = ''; return }
    const label = MANDATORY_DOCS.find(d => d.value === docType)?.label || docType
    setUploading(docType)
    try {
      const res = await garageApi.addDocument(equipmentId, file, label, docType)
      setDocuments((prev) => [...prev, res.data.data || res.data])
      toast.success('Sənəd yükləndi')
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Sənəd yüklənə bilmədi')
    } finally {
      setUploading(null)
      e.target.value = ''
    }
  }

  const handleExtraFileSelect = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setSelectedFile(f)
    if (!docName) setDocName(f.name.replace(/\.[^/.]+$/, ''))
    setExtraForm(true)
  }

  const handleExtraUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile) return toast.error('Fayl seçin')
    const fileError = validateFileUpload(selectedFile, 'document')
    if (fileError) return toast.error(fileError)
    setUploading('extra')
    try {
      const res = await garageApi.addDocument(equipmentId, selectedFile, docName || selectedFile.name)
      setDocuments((prev) => [...prev, res.data.data || res.data])
      toast.success('Sənəd yükləndi')
      setExtraForm(false)
      setDocName('')
      setSelectedFile(null)
      if (extraRef.current) extraRef.current.value = ''
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Sənəd yüklənə bilmədi')
    } finally {
      setUploading(null)
    }
  }

  const handleDownload = async (doc) => {
    setDownloading(doc.id)
    try {
      await garageApi.downloadDocument(equipmentId, doc.id, doc.documentName || `sened-${doc.id}`)
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Sənəd endirilə bilmədi')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) return <div className="py-10 text-center text-sm font-semibold text-[var(--ces-muted)]">Yüklənir...</div>

  const uploadedTypes = documents.map(d => d.documentType).filter(Boolean)
  const extraDocs = documents.filter(d => !MANDATORY_DOCS.some(m => m.value === d.documentType))
  const completedCount = MANDATORY_DOCS.filter(m => uploadedTypes.includes(m.value)).length

  return (
    <div className="space-y-5">
      {/* Məcburi sənədlər */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] tracking-[0.14em] uppercase font-bold text-[var(--ces-muted)]">Məcburi sənədlər</p>
          <span className={clsx(
            'inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full',
            completedCount === MANDATORY_DOCS.length
              ? 'bg-[var(--ces-ok-100)] text-[var(--ces-ok)]'
              : 'bg-[var(--ces-warn-100)] text-[var(--ces-warn)]'
          )}>
            {completedCount}/{MANDATORY_DOCS.length} {completedCount === MANDATORY_DOCS.length && '✓ Tam'}
          </span>
        </div>
        <div className="space-y-2">
          {MANDATORY_DOCS.map((mDoc) => {
            const doc = documents.find(d => d.documentType === mDoc.value)
            const isUploading = uploading === mDoc.value
            return (
              <div key={mDoc.value} className={clsx(
                'flex items-center gap-3 px-3.5 py-3 rounded-[14px] border bg-[var(--ces-surface)]',
                doc ? 'border-[var(--ces-ok-100)]' : 'border-[var(--ces-line)]'
              )}>
                <div className={clsx(
                  'w-9 h-9 rounded-[10px] grid place-items-center shrink-0',
                  doc ? 'bg-[var(--ces-ok-100)] text-[var(--ces-ok)]' : 'bg-[var(--ces-graphite-100)] text-[var(--ces-mute2)]'
                )}>
                  <CheckCircle size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[var(--ces-ink)]">{mDoc.label}</p>
                  {doc && (
                    <p className="text-[11px] text-[var(--ces-muted)] truncate mt-0.5 font-mono">
                      {doc.documentName}{doc.uploadedByUserName ? ` · ${doc.uploadedByUserName}` : ''}{doc.createdAt ? ` · ${new Date(doc.createdAt).toLocaleDateString('az-AZ')}` : ''}
                    </p>
                  )}
                </div>
                {doc ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleDownload(doc)} disabled={downloading === doc.id}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--ces-ok)] hover:bg-[var(--ces-ok-100)] px-2.5 py-1.5 rounded-[8px] transition-colors">
                      {downloading === doc.id
                        ? <span className="w-3 h-3 border-2 border-[var(--ces-ok)] border-t-transparent rounded-full animate-spin" />
                        : <Download size={11} />}
                      Endir
                    </button>
                    <button onClick={() => handleDelete(doc)} disabled={deleting === doc.id}
                      className="w-8 h-8 grid place-items-center rounded-[7px] text-[var(--ces-muted)] hover:text-[var(--ces-danger)] hover:bg-[var(--ces-danger-100)] transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <label className={clsx(
                    'inline-flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1.5 rounded-[8px] cursor-pointer transition-colors shrink-0',
                    isUploading ? 'opacity-50 cursor-wait bg-[var(--ces-gold-100)] text-[var(--ces-gold-700)]' : 'bg-[var(--ces-gold)] text-[var(--ces-on-gold)] hover:bg-[var(--ces-gold-700)]'
                  )}>
                    {isUploading
                      ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      : <Upload size={11} />}
                    {isUploading ? 'Yüklənir...' : 'Yüklə'}
                    <input
                      ref={el => mandatoryRefs.current[mDoc.value] = el}
                      type="file" className="hidden" disabled={isUploading}
                      onChange={(e) => handleMandatoryUpload(e, mDoc.value)}
                    />
                  </label>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Əlavə sənədlər */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] tracking-[0.14em] uppercase font-bold text-[var(--ces-muted)]">Əlavə sənədlər</p>
          <label className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--ces-gold-700)] hover:text-[var(--ces-graphite)] cursor-pointer transition-colors">
            <Upload size={12} />
            Fayl seç
            <input ref={extraRef} type="file" className="hidden" onChange={handleExtraFileSelect} />
          </label>
        </div>

        {extraForm && selectedFile && (
          <form onSubmit={handleExtraUpload} className="border border-[var(--ces-gold-100)] rounded-[14px] p-3.5 space-y-2.5 bg-[var(--ces-gold-50)] mb-2">
            <div className="flex items-center gap-2 text-[12px]">
              <FileText size={12} className="text-[var(--ces-gold-700)] shrink-0" />
              <span className="truncate text-[12px] font-mono text-[var(--ces-ink)]">{selectedFile.name}</span>
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-[var(--ces-ink)] mb-1">Sənədin adı</label>
              <input type="text" value={docName} onChange={(e) => setDocName(e.target.value)}
                placeholder="Avtomatik"
                className="w-full px-3 py-2 text-[12.5px] border border-[var(--ces-line)] rounded-[8px] bg-white text-[var(--ces-ink)] placeholder-[var(--ces-mute2)] focus:outline-none focus:border-[var(--ces-graphite)] focus:ring-[3px] focus:ring-[rgba(58,58,58,0.1)]" />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button"
                onClick={() => { setExtraForm(false); setSelectedFile(null); setDocName(''); if (extraRef.current) extraRef.current.value = '' }}
                className="text-[11.5px] font-semibold text-[var(--ces-graphite)] bg-white border border-[var(--ces-line)] hover:border-[var(--ces-graphite)] px-3 py-1.5 rounded-[8px] transition-colors">
                Ləğv et
              </button>
              <button type="submit" disabled={uploading === 'extra'}
                className="inline-flex items-center gap-1.5 bg-[var(--ces-gold)] hover:bg-[var(--ces-gold-700)] disabled:opacity-60 text-[var(--ces-on-gold)] text-[11.5px] font-bold px-3 py-1.5 rounded-[8px] transition-colors">
                {uploading === 'extra' && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Yüklə
              </button>
            </div>
          </form>
        )}

        {extraDocs.length === 0 ? (
          <p className="text-center text-[12px] font-semibold text-[var(--ces-muted)] py-6">Əlavə sənəd yoxdur</p>
        ) : (
          <div className="space-y-2">
            {extraDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 border border-[var(--ces-line)] rounded-[12px] bg-[var(--ces-surface)] hover:bg-[var(--ces-graphite-50)] transition-colors">
                <div className="w-9 h-9 rounded-[10px] bg-[var(--ces-gold-100)] grid place-items-center shrink-0">
                  <FileText size={14} className="text-[var(--ces-gold-700)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold text-[var(--ces-ink)] truncate">{doc.documentName || `Sənəd ${doc.id}`}</p>
                  <p className="text-[11px] text-[var(--ces-muted)] mt-0.5">
                    {doc.uploadedByUserName && `${doc.uploadedByUserName} · `}
                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('az-AZ') : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleDownload(doc)} disabled={downloading === doc.id}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--ces-gold-700)] bg-white border border-[var(--ces-gold-100)] hover:border-[var(--ces-gold-700)] disabled:opacity-50 px-2.5 py-1.5 rounded-[8px] transition-colors">
                    {downloading === doc.id
                      ? <span className="w-3 h-3 border-2 border-[var(--ces-gold-700)] border-t-transparent rounded-full animate-spin" />
                      : <Download size={11} />}
                    Endir
                  </button>
                  <button onClick={() => handleDelete(doc)} disabled={deleting === doc.id}
                    className="w-8 h-8 grid place-items-center rounded-[7px] text-[var(--ces-muted)] hover:text-[var(--ces-danger)] hover:bg-[var(--ces-danger-100)] transition-colors disabled:opacity-50" title="Sil">
                    {deleting === doc.id
                      ? <span className="w-3 h-3 border-2 border-[var(--ces-danger)] border-t-transparent rounded-full animate-spin" />
                      : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog />
    </div>
  )
}

/* ─── AuthImage ────────────────────────────────────────────────────── */
export function AuthImage({ equipmentId, imageId, alt, className, lazy = true }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [inView, setInView] = useState(!lazy)
  const imgRef = useRef(null)

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

  if (!blobUrl) return <div ref={imgRef} className={clsx(className, 'animate-pulse bg-[var(--ces-graphite-100)]')} />
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
        <img src={blobUrl} alt={name} className="max-w-full max-h-[85vh] rounded-[14px] object-contain" />
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            onClick={handleDownload}
            className="w-9 h-9 grid place-items-center rounded-[10px] bg-black/60 hover:bg-black/80 text-white transition-colors"
            title="Yüklə"
          >
            <Download size={16} />
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 grid place-items-center rounded-[10px] bg-black/60 hover:bg-black/80 text-white transition-colors"
            title="Bağla"
          >
            <X size={16} />
          </button>
        </div>
        {name && (
          <p className="absolute bottom-3 left-3 text-[12px] text-white bg-black/50 px-2.5 py-1 rounded-[6px] font-mono">{name}</p>
        )}
      </div>
    </div>
  )
}

/* ─── ImagesTab ────────────────────────────────────────────────────── */
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
    const error = validateFileUpload(file, 'image')
    if (error) return toast.error(error)
    setUploading(true)
    try {
      const res = await garageApi.addImage(equipmentId, file)
      setImages((prev) => [...prev, res.data.data || res.data])
      toast.success('Şəkil yükləndi')
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Şəkil yüklənə bilmədi')
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
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Şəkil silinə bilmədi')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <div className="py-10 text-center text-sm font-semibold text-[var(--ces-muted)]">Yüklənir...</div>

  return (
    <div
      className="space-y-3"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] tracking-[0.14em] uppercase font-bold text-[var(--ces-muted)]">{images.length} şəkil</span>
        <label className={clsx(
          'inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--ces-gold-700)] hover:text-[var(--ces-graphite)] cursor-pointer transition-colors',
          uploading && 'opacity-50 pointer-events-none'
        )}>
          {uploading
            ? <span className="w-3 h-3 border-2 border-[var(--ces-gold-700)] border-t-transparent rounded-full animate-spin" />
            : <Upload size={13} />
          }
          Şəkil yüklə
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </label>
      </div>

      {dragging && (
        <div className="border-2 border-dashed border-[var(--ces-gold)] rounded-[14px] p-8 text-center bg-[var(--ces-gold-50)]">
          <Upload size={28} className="mx-auto text-[var(--ces-gold)] mb-2" />
          <p className="text-[13px] text-[var(--ces-gold-700)] font-bold">Şəkili bura buraxın</p>
        </div>
      )}

      {!dragging && images.length === 0 ? (
        <div className="border-2 border-dashed border-[var(--ces-line)] rounded-[14px] p-8 text-center cursor-pointer hover:border-[var(--ces-gold)] transition-colors bg-[var(--ces-surface)]"
          onClick={() => fileRef.current?.click()}>
          <Upload size={28} className="mx-auto text-[var(--ces-mute2)] mb-2" />
          <p className="text-[13px] font-semibold text-[var(--ces-muted)]">Şəkil sürükləyin və ya klikləyin</p>
        </div>
      ) : !dragging && (
        <div className="grid grid-cols-2 gap-2.5">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative group rounded-[14px] overflow-hidden border border-[var(--ces-line)] bg-[var(--ces-graphite-50)] aspect-video cursor-pointer"
              onClick={() => {
                garageApi.fetchImageBlob(equipmentId, img.id)
                  .then((url) => setLightbox({ url, name: img.imageName || `Şəkil ${img.id}` }))
                  .catch(() => {})
              }}
            >
              <AuthImage
                equipmentId={equipmentId}
                imageId={img.id}
                alt={img.imageName || 'Şəkil'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <span className="w-8 h-8 grid place-items-center rounded-full bg-white text-[var(--ces-graphite)]">
                  <ZoomIn size={14} />
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(img) }}
                  disabled={deleting === img.id}
                  className="w-8 h-8 grid place-items-center rounded-full bg-[var(--ces-danger)] hover:bg-[#b62b4a] text-white transition-colors"
                >
                  {deleting === img.id
                    ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                    : <Trash2 size={13} />
                  }
                </button>
              </div>
              <p className="absolute bottom-0 left-0 right-0 text-[10px] text-white bg-black/50 px-2 py-1 truncate font-mono">
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

/* ─── HistoryTab ───────────────────────────────────────────────────── */
function HistoryTab({ equipmentId }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    garageApi.getProjectHistory(equipmentId)
      .then((res) => setHistory(res.data.data || res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [equipmentId])

  if (loading) return <div className="py-10 text-center text-sm font-semibold text-[var(--ces-muted)]">Yüklənir...</div>

  if (history.length === 0) {
    return (
      <div className="text-center py-12 bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[14px]">
        <History size={28} className="mx-auto mb-3 text-[var(--ces-mute2)] opacity-50" />
        <p className="text-sm font-semibold text-[var(--ces-muted)]">Layihə tarixçəsi yoxdur</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] tracking-[0.14em] uppercase font-bold text-[var(--ces-muted)] mb-1">{history.length} layihə</p>
      {history.map((h, i) => (
        <div key={h.id || i} className="border border-[var(--ces-line)] rounded-[14px] p-4 bg-[var(--ces-surface)] shadow-[0_1px_2px_rgba(58,58,58,0.06)]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-[var(--ces-ink)] truncate">{h.projectName || '—'}</p>
              {h.notes && <p className="text-[11.5px] text-[var(--ces-muted)] mt-1 leading-relaxed">{h.notes}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] text-[var(--ces-muted)] tabular-nums">{h.startDate || '—'} → {h.endDate || 'davam edir'}</p>
              {h.contractorRevenue > 0 && (
                <p className="text-[12px] font-bold text-[var(--ces-gold-700)] tabular-nums mt-1">{parseFloat(h.contractorRevenue).toLocaleString('az-AZ')} ₼</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── EquipmentSlideOver main ──────────────────────────────────────── */
export default function EquipmentSlideOver({ equipment, onClose, onEdit, onClone, onSaved }) {
  const [activeTab, setActiveTab] = useState('info')
  const [depreciatedValue, setDepreciatedValue] = useState(null)
  const [safetyTypes, setSafetyTypes] = useState([])
  const [safetyIds, setSafetyIds] = useState(equipment.safetyEquipment?.map(s => s.id) || [])
  const [savingSafety, setSavingSafety] = useState(false)
  const safetyDirty = JSON.stringify([...safetyIds].sort()) !== JSON.stringify([...(equipment.safetyEquipment?.map(s => s.id) || [])].sort())

  const status = STATUS_CFG[equipment.status] || STATUS_CFG.AVAILABLE
  const nextInsp = useMemo(() => inspectionCountdown(equipment.nextInspectionDate), [equipment.nextInspectionDate])

  useEffect(() => {
    configApi.getActiveByCategory('SAFETY_EQUIPMENT')
      .then(r => setSafetyTypes(r.data.data || []))
      .catch(() => {})
    if (equipment.depreciationRate != null && equipment.purchasePrice != null) {
      garageApi.getDepreciatedValue(equipment.id)
        .then(res => setDepreciatedValue(res.data.data ?? res.data))
        .catch(() => {})
    }
  }, [equipment.id, equipment.depreciationRate, equipment.purchasePrice])

  const handleSaveSafety = async () => {
    setSavingSafety(true)
    try {
      await garageApi.update(equipment.id, {
        equipmentCode: equipment.equipmentCode,
        name: equipment.name,
        type: equipment.type,
        serialNumber: equipment.serialNumber || null,
        brand: equipment.brand || null,
        model: equipment.model || null,
        manufactureYear: equipment.manufactureYear || null,
        purchaseDate: equipment.purchaseDate || null,
        purchasePrice: equipment.purchasePrice || null,
        currentMarketValue: equipment.currentMarketValue || null,
        depreciationRate: equipment.depreciationRate || null,
        hourKmCounter: equipment.hourKmCounter || null,
        motoHours: equipment.motoHours || null,
        storageLocation: equipment.storageLocation || null,
        responsibleUserId: equipment.responsibleUserId || null,
        ownershipType: equipment.ownershipType,
        ownerContractorId: equipment.ownerContractorId || null,
        ownerInvestorName: equipment.ownerInvestorName || null,
        ownerInvestorVoen: equipment.ownerInvestorVoen || null,
        ownerInvestorPhone: equipment.ownerInvestorPhone || null,
        lastInspectionDate: equipment.lastInspectionDate || null,
        nextInspectionDate: equipment.nextInspectionDate || null,
        technicalReadinessStatus: equipment.technicalReadinessStatus || null,
        status: equipment.status,
        repairStatus: equipment.repairStatus || null,
        notes: equipment.notes || null,
        safetyEquipmentIds: safetyIds,
      })
      toast.success('Təhlükəsizlik avadanlıqları yadda saxlandı')
      onSaved?.()
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Yadda saxlanıla bilmədi')
    } finally {
      setSavingSafety(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[rgba(58,58,58,0.45)] backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-[var(--ces-surface)] shadow-[0_24px_48px_-20px_rgba(58,58,58,0.28),0_6px_14px_rgba(58,58,58,0.08)] flex flex-col ces-font">
        {/* Header */}
        <div className="flex items-start gap-3.5 px-6 py-5 border-b border-[var(--ces-line)] shrink-0 bg-white">
          <div className="w-11 h-11 rounded-[12px] grid place-items-center bg-[var(--ces-gold-100)] text-[var(--ces-gold-700)] shrink-0">
            <Wrench size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[17px] font-extrabold text-[var(--ces-ink)] truncate tracking-tight">{equipment.name}</h2>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold', status.cls)}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {status.label}
              </span>
              {nextInsp && (
                <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold', nextInsp.cls)}>
                  <CalendarClock size={10} />
                  {nextInsp.label}
                </span>
              )}
              {equipment.brand && (
                <span className="text-[11.5px] font-semibold text-[var(--ces-muted)] truncate">{equipment.brand} {equipment.model}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onClone && (
              <button onClick={onClone}
                className="w-9 h-9 grid place-items-center rounded-[8px] text-[var(--ces-muted)] hover:text-[var(--ces-info)] hover:bg-[var(--ces-info-100)] transition-colors"
                title="Kopyala"
              >
                <Copy size={16} />
              </button>
            )}
            <button onClick={onEdit}
              className="w-9 h-9 grid place-items-center rounded-[8px] text-[var(--ces-muted)] hover:text-[var(--ces-gold-700)] hover:bg-[var(--ces-gold-100)] transition-colors"
              title="Redaktə et"
            >
              <Pencil size={16} />
            </button>
            <button onClick={onClose}
              className="w-9 h-9 grid place-items-center rounded-[8px] text-[var(--ces-muted)] hover:text-[var(--ces-graphite)] hover:bg-[var(--ces-graphite-50)] transition-colors ml-1"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 border-b border-[var(--ces-line)] shrink-0 overflow-x-auto bg-white">
          {TABS.map(({ id, label, icon: Icon }) => {
            const on = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3.5 py-3 text-[13px] font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors',
                  on
                    ? 'text-[var(--ces-graphite)] border-[var(--ces-gold)]'
                    : 'text-[var(--ces-muted)] border-transparent hover:text-[var(--ces-graphite)]'
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 scrollbar-thin bg-[var(--ces-bg)]">
          {activeTab === 'info' && (
            <div className="space-y-3">
              <InfoCard title="Ümumi məlumatlar" icon={Info}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <InfoField label="Texnika kodu" value={equipment.equipmentCode} mono />
                  <InfoField label="Seriya nömrəsi" value={equipment.serialNumber} mono />
                  <InfoField label="Növ / Kateqoriya" value={equipment.type} />
                  <InfoField label="Brend" value={equipment.brand} />
                  <InfoField label="Model" value={equipment.model} />
                  <InfoField label="İstehsal ili" value={equipment.manufactureYear} />
                </div>
              </InfoCard>

              <InfoCard title="Maliyyə" icon={DollarSign}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <InfoField label="Alınma tarixi" value={equipment.purchaseDate ? new Date(equipment.purchaseDate).toLocaleDateString('az-AZ') : null} />
                  <InfoField label="Alış qiyməti" value={equipment.purchasePrice != null ? `${Number(equipment.purchasePrice).toLocaleString()} ₼` : null} mono />
                  <InfoField label="Cari bazar dəyəri" value={equipment.currentMarketValue != null ? `${Number(equipment.currentMarketValue).toLocaleString()} ₼` : null} mono />
                  <InfoField label="Amortizasiya" value={equipment.depreciationRate != null ? `${equipment.depreciationRate}%` : null} />
                  {depreciatedValue != null && (
                    <InfoField label="Amortizasiya dəyəri" value={`${Number(depreciatedValue).toLocaleString()} ₼`} mono />
                  )}
                </div>
              </InfoCard>

              <InfoCard title="Texniki göstəricilər" icon={Wrench}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <InfoField label="Saat / KM" value={equipment.hourKmCounter} mono />
                  <InfoField label="Moto saatlar" value={equipment.motoHours != null ? `${Number(equipment.motoHours).toLocaleString()} s` : null} mono />
                  <InfoField label="Saxlanma yeri" value={equipment.storageLocation} />
                  <InfoField label="Məsul şəxs" value={equipment.responsibleUserName} />
                </div>
              </InfoCard>

              <InfoCard title="Texniki baxış" icon={ClipboardCheck}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <InfoField label="Son texniki baxış" value={equipment.lastInspectionDate ? new Date(equipment.lastInspectionDate).toLocaleDateString('az-AZ') : null} />
                  <InfoField label="Növbəti texniki baxış" value={equipment.nextInspectionDate ? new Date(equipment.nextInspectionDate).toLocaleDateString('az-AZ') : null} />
                </div>
                {nextInsp && (
                  <div className={clsx('mt-3 px-3 py-1.5 rounded-full text-[11.5px] font-bold inline-flex items-center gap-1.5', nextInsp.cls)}>
                    <CalendarClock size={11} />
                    {nextInsp.label}
                  </div>
                )}
              </InfoCard>

              <InfoCard title="Status və mülkiyyət" icon={Building2}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.12em]">Status</span>
                    <span className={clsx('inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold', status.cls)}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {status.label}
                    </span>
                  </div>
                  <InfoField label="Mülkiyyət növü" value={OWN_LABEL[equipment.ownershipType]} />
                </div>
              </InfoCard>

              {equipment.ownershipType === 'INVESTOR' && (
                <InfoCard title="İnvestor məlumatları" icon={User}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <InfoField label="Ad, soyad" value={equipment.ownerInvestorName} />
                    <InfoField label="VÖEN" value={equipment.ownerInvestorVoen} mono />
                    <InfoField label="Əlaqə nömrəsi" value={equipment.ownerInvestorPhone} mono />
                  </div>
                </InfoCard>
              )}

              {equipment.ownershipType === 'CONTRACTOR' && (
                <InfoCard title="Podratçı məlumatları" icon={Building2}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <InfoField label="Podratçı adı" value={equipment.ownerContractorName} />
                    <InfoField label="VÖEN" value={equipment.ownerContractorVoen} mono />
                    <InfoField label="Əlaqə nömrəsi" value={equipment.ownerContractorPhone} mono />
                    <InfoField label="Əlaqədar şəxs" value={equipment.ownerContractorContact} />
                  </div>
                </InfoCard>
              )}

              {safetyTypes.length > 0 && (
                <InfoCard title="Təhlükəsizlik avadanlıqları" icon={ShieldCheck}>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {safetyTypes.map((st) => {
                      const checked = safetyIds.includes(st.id)
                      return (
                        <label key={st.id} className={clsx(
                          'flex items-center gap-2 cursor-pointer rounded-[10px] border p-2.5 transition-all text-[12px]',
                          checked
                            ? 'border-[var(--ces-ok)] bg-[var(--ces-ok-100)] text-[var(--ces-ok)] font-bold'
                            : 'border-[var(--ces-line)] bg-white text-[var(--ces-muted)] hover:border-[var(--ces-graphite)]'
                        )}>
                          <input type="checkbox" checked={checked}
                            onChange={() => setSafetyIds(prev =>
                              checked ? prev.filter(id => id !== st.id) : [...prev, st.id]
                            )}
                            className="accent-[var(--ces-ok)] w-3.5 h-3.5 shrink-0" />
                          {st.key}
                        </label>
                      )
                    })}
                  </div>
                  {safetyDirty && (
                    <button
                      onClick={handleSaveSafety}
                      disabled={savingSafety}
                      className="inline-flex items-center gap-1.5 text-[12px] font-bold text-white bg-[var(--ces-ok)] hover:bg-[#0c855a] disabled:opacity-60 px-3 py-1.5 rounded-[8px] transition-colors"
                    >
                      <Save size={12} />
                      {savingSafety ? 'Saxlanılır...' : 'Yadda saxla'}
                    </button>
                  )}
                </InfoCard>
              )}

              {equipment.notes && (
                <InfoCard title="Qeydlər" icon={FileText}>
                  <p className="text-[13px] text-[var(--ces-ink)] leading-relaxed whitespace-pre-wrap">{equipment.notes}</p>
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
