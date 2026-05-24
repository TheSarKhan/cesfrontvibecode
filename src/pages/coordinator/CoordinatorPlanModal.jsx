import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Upload, Trash2, Download, FileText, CheckCircle, Search, Wrench, Building2, Phone, MapPin, User, Calendar, DollarSign, ShieldCheck, StickyNote, Save, Send } from 'lucide-react'
import { coordinatorApi } from '../../api/coordinator'
import axiosInstance from '../../api/axios'
import { configApi } from '../../api/config'
import { garageApi } from '../../api/garage'
import { operatorsApi } from '../../api/operators'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { validateFileUpload } from '../../utils/fileValidation'

const DOC_TYPES = [
  { value: 'REGISTRATION_CERT',      label: 'Qeydiyyat şəhadətnaməsi' },
  { value: 'THIRD_PARTY_INSPECTION', label: '3-cü tərəf texniki baxış sənədi' },
  { value: 'TECHNICAL_INSPECTION',   label: 'Texniki baxış sənədi' },
  { value: 'OTHER',                  label: 'Digər' },
]
const MANDATORY_DOC_TYPES = ['REGISTRATION_CERT', 'THIRD_PARTY_INSPECTION', 'TECHNICAL_INSPECTION']

const TABS = [
  { key: 'request',   label: 'Sorğu',                icon: Building2 },
  { key: 'resources', label: 'Texnika & Operator',   icon: Wrench },
  { key: 'finance',   label: 'Maliyyə',              icon: DollarSign },
  { key: 'docs',      label: 'Sənədlər',             icon: FileText },
]

const EQ_OWNERSHIP_LABEL = { COMPANY: 'Şirkət', INVESTOR: 'İnvestor', CONTRACTOR: 'Podratçı' }
const EQ_OWNERSHIP_PILL  = { COMPANY: 'ces-p-ok', INVESTOR: 'ces-p-info', CONTRACTOR: 'ces-p-warn' }
const EQ_STATUS_LABEL    = { AVAILABLE: 'Mövcuddur', IN_USE: 'İstifadədə', UNDER_REPAIR: 'Təmirdə', DECOMMISSIONED: 'Xaric edilib' }
const EQ_STATUS_PILL     = { AVAILABLE: 'ces-p-ok', IN_USE: 'ces-p-info', UNDER_REPAIR: 'ces-p-danger', DECOMMISSIONED: 'ces-p-mute' }

function fmt(val) {
  if (val == null || val === '') return '—'
  return parseFloat(val).toLocaleString('az-AZ', { minimumFractionDigits: 2 })
}

/* ─── Equipment Picker (nested modal) ──────────────────────────────────── */
function EquipmentPicker({ requestId, onSelected, onClose }) {
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selecting, setSelecting] = useState(false)

  useEffect(() => {
    garageApi.getAll()
      .then((r) => setEquipment(r.data.data || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return equipment.filter((e) =>
      !q ||
      e.name?.toLowerCase().includes(q) ||
      e.equipmentCode?.toLowerCase().includes(q) ||
      e.type?.toLowerCase().includes(q) ||
      e.brand?.toLowerCase().includes(q) ||
      e.plateNumber?.toLowerCase().includes(q) ||
      e.serialNumber?.toLowerCase().includes(q) ||
      e.ownerContractorName?.toLowerCase().includes(q) ||
      e.ownerInvestorName?.toLowerCase().includes(q)
    )
  }, [equipment, search])

  const handleSelect = async (eq) => {
    setSelecting(true)
    try {
      const res = await coordinatorApi.selectEquipment(requestId, eq.id)
      toast.success(`${eq.name} seçildi`)
      onSelected(res.data.data, eq)
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Texnika seçilə bilmədi')
    } finally {
      setSelecting(false)
    }
  }

  return (
    <div className="ces-modal-backdrop" style={{ zIndex: 60 }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ces-modal" style={{ maxWidth: 760 }}>
        <div className="ces-m-head">
          <div className="ces-m-ic gold">
            <Wrench size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3>Qarajdan texnika seç</h3>
            <p>{filtered.length} texnika</p>
          </div>
          <button onClick={onClose} className="ces-modal-x" type="button" aria-label="Bağla">
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '14px 26px', borderBottom: '1px solid var(--ces-line)' }}>
          <div className="ces-input has-icon sm">
            <Search size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ad, kod, növ, marka, qeydiyyat nömrəsi, sahibkar..."
              autoFocus
            />
          </div>
        </div>

        <div className="ces-m-body" style={{ paddingTop: 14, paddingBottom: 14 }}>
          {loading ? (
            <p className="py-10 text-center text-sm" style={{ color: 'var(--ces-muted)' }}>Yüklənir...</p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm" style={{ color: 'var(--ces-muted)' }}>Texnika tapılmadı</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((eq) => {
                const isAvailable = eq.status === 'AVAILABLE'
                return (
                  <button
                    key={eq.id}
                    onClick={() => isAvailable && handleSelect(eq)}
                    disabled={selecting || !isAvailable}
                    className="w-full text-left transition-all"
                    style={{
                      padding: 14,
                      background: 'var(--ces-surface)',
                      border: '1px solid var(--ces-line)',
                      borderRadius: 14,
                      cursor: isAvailable ? 'pointer' : 'not-allowed',
                      opacity: isAvailable ? 1 : 0.55,
                    }}
                    onMouseEnter={(e) => { if (isAvailable) { e.currentTarget.style.borderColor = 'var(--ces-gold)'; e.currentTarget.style.background = 'var(--ces-gold-50)' } }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ces-line)'; e.currentTarget.style.background = 'var(--ces-surface)' }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="text-sm font-bold text-[var(--ces-ink)]">{eq.name}</span>
                        <span className={clsx('ces-pill sm', EQ_OWNERSHIP_PILL[eq.ownershipType])}>
                          {EQ_OWNERSHIP_LABEL[eq.ownershipType]}
                        </span>
                      </div>
                      {eq.status && (
                        <span className={clsx('ces-pill sm', EQ_STATUS_PILL[eq.status] || 'ces-p-mute')}>
                          <span className="d" />
                          {EQ_STATUS_LABEL[eq.status] || eq.status}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs mb-2" style={{ color: 'var(--ces-muted)' }}>
                      <span className="mono font-semibold" style={{ color: 'var(--ces-gold-700)' }}>{eq.equipmentCode}</span>
                      <span>{eq.type}</span>
                      {(eq.brand || eq.model) && <span>{[eq.brand, eq.model].filter(Boolean).join(' ')}</span>}
                      {eq.manufactureYear && <span>{eq.manufactureYear} il</span>}
                      {eq.plateNumber && <span className="font-medium text-[var(--ces-ink)]">{eq.plateNumber}</span>}
                      {eq.serialNumber && <span>S/N: {eq.serialNumber}</span>}
                      {eq.weightTon && <span>{eq.weightTon} ton</span>}
                      {eq.storageLocation && <span>{eq.storageLocation}</span>}
                    </div>
                    {eq.ownershipType === 'INVESTOR' && eq.ownerInvestorName && (
                      <div className="ces-pill ces-p-info sm" style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 10, maxWidth: '100%' }}>
                        <span className="font-semibold">{eq.ownerInvestorName}</span>
                        {eq.ownerInvestorVoen && <span>VÖEN: {eq.ownerInvestorVoen}</span>}
                        {eq.ownerInvestorPhone && <span>{eq.ownerInvestorPhone}</span>}
                      </div>
                    )}
                    {eq.ownershipType === 'CONTRACTOR' && eq.ownerContractorName && (
                      <div className="ces-pill ces-p-warn sm" style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 10, maxWidth: '100%' }}>
                        <span className="font-semibold">{eq.ownerContractorName}</span>
                        {eq.ownerContractorVoen && <span>VÖEN: {eq.ownerContractorVoen}</span>}
                        {eq.ownerContractorPhone && <span>{eq.ownerContractorPhone}</span>}
                        {eq.ownerContractorContact && <span>Əlaqədar: {eq.ownerContractorContact}</span>}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Main Modal ──────────────────────────────────────────────────────── */
export default function CoordinatorPlanModal({ request, onClose, onSaved }) {
  useEscapeKey(onClose)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const { confirm, ConfirmDialog } = useConfirm()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [eqPicker, setEqPicker] = useState(false)
  const [tab, setTab] = useState('resources')
  const fileInputRef = useRef()

  const [operators, setOperators] = useState([])
  const [safetyTypes, setSafetyTypes] = useState([])

  useEffect(() => {
    operatorsApi.getAll().then(r => setOperators(r.data.data || r.data || [])).catch(() => {})
    configApi.getActiveByCategory('SAFETY_EQUIPMENT').then(r => setSafetyTypes(r.data.data || [])).catch(() => {})
  }, [])

  const [form, setForm] = useState({
    operatorId: '',
    equipmentPrice: '',
    dayCount: '',
    contractorDailyRate: '',
    operatorPayment: '',
    transportationPrice: '',
    startDate: '',
    endDate: '',
    safetyEquipmentIds: [],
    notes: '',
  })
  const [docForm, setDocForm] = useState({ documentType: 'REGISTRATION_CERT', documentName: '' })

  const loadPlan = () =>
    coordinatorApi.getPlan(request.requestId)
      .then((r) => {
        const p = r.data.data
        setPlan(p)
        if (p.planId) {
          setForm({
            operatorId: p.operatorId ? String(p.operatorId) : '',
            equipmentPrice: p.equipmentPrice ?? '',
            dayCount: p.dayCount ?? '',
            contractorDailyRate: p.contractorDailyRate ?? '',
            operatorPayment: p.operatorPayment ?? '',
            transportationPrice: p.transportationPrice ?? '',
            startDate: p.startDate || '',
            endDate: p.endDate || '',
            safetyEquipmentIds: p.safetyEquipment?.map(s => s.id) || [],
            notes: p.notes || '',
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))

  useEffect(() => { loadPlan() }, [request.requestId])

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const unitPrice = parseFloat(form.equipmentPrice) || 0
  const transPrice = parseFloat(form.transportationPrice) || 0
  const contrDailyRate = parseFloat(form.contractorDailyRate) || 0
  const opPayment = parseFloat(form.operatorPayment) || 0
  const projectType = request.projectType

  const autoDayCount = (() => {
    if (!form.startDate || !form.endDate) return 0
    const start = new Date(form.startDate)
    const end = new Date(form.endDate)
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  })()

  const calcEquipmentTotal = () => {
    if (!unitPrice) return 0
    if (projectType === 'DAILY') return autoDayCount * unitPrice
    if (projectType === 'MONTHLY') return unitPrice
    return autoDayCount ? autoDayCount * unitPrice : unitPrice
  }
  const equipmentTotal = calcEquipmentTotal()
  const totalAmount = equipmentTotal + transPrice
  const contrPaymentTotal = projectType === 'MONTHLY'
    ? contrDailyRate
    : contrDailyRate * (autoDayCount || 0)
  const companyProfit = totalAmount - contrPaymentTotal - opPayment

  // Yalnız danışıq mərhələsində (COORDINATOR_NEGOTIATING) plan redaktə edilə bilər
  const isReadonly = request.requestStatus !== 'COORDINATOR_NEGOTIATING'

  const doSave = async () => {
    const payload = {
      operatorId: form.operatorId ? parseInt(form.operatorId) : null,
      equipmentPrice: parseFloat(form.equipmentPrice) || null,
      dayCount: autoDayCount || null,
      totalAmount: equipmentTotal + transPrice || null,
      contractorDailyRate: contrDailyRate || null,
      operatorPayment: parseFloat(form.operatorPayment) || null,
      transportationPrice: parseFloat(form.transportationPrice) || null,
      companyProfit: companyProfit || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      safetyEquipmentIds: form.safetyEquipmentIds || [],
      notes: form.notes || null,
    }
    const res = await coordinatorApi.savePlan(request.requestId, payload)
    setPlan(res.data.data)
    return res.data.data
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await doSave()
      toast.success('Plan yadda saxlandı')
      onSaved()
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Plan yadda saxlanıla bilmədi')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!(await confirm({ title: 'Planı göndər', message: 'Planı bitirmək və təklifi göndərmək istəyirsiniz?', danger: false, confirmText: 'Göndər' }))) return
    setSubmitting(true)
    try {
      await doSave()
      await coordinatorApi.submitPlan(request.requestId)
      toast.success('Layihə göndərildi — sorğu gözdən keçirilir')
      onSaved()
      onClose()
    } catch (err) {
      if (err?.isPending) { onSaved(); onClose(); return }
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fileError = validateFileUpload(file)
    if (fileError) { toast.error(fileError); e.target.value = ''; return }
    if (!plan?.planId) {
      toast.error('Əvvəlcə planı yadda saxlayın')
      e.target.value = ''
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('documentType', docForm.documentType)
      if (docForm.documentName.trim()) fd.append('documentName', docForm.documentName)
      const res = await coordinatorApi.uploadDocument(request.requestId, fd)
      setPlan((prev) => ({ ...prev, documents: [...(prev.documents || []), res.data.data] }))
      toast.success('Sənəd əlavə edildi')
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Sənəd yüklənə bilmədi')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDeleteDoc = async (docId) => {
    if (!(await confirm({ title: 'Sənədi sil', message: 'Sənədi silmək istəyirsiniz?' }))) return
    try {
      await coordinatorApi.deleteDocument(request.requestId, docId)
      setPlan((prev) => ({ ...prev, documents: prev.documents.filter((d) => d.id !== docId) }))
      toast.success('Sənəd silindi')
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Sənəd silinə bilmədi')
    }
  }

  const handleDownload = async (doc) => {
    try {
      const url = coordinatorApi.getDocumentDownloadUrl(request.requestId, doc.id)
      const res = await axiosInstance.get(url, { responseType: 'blob' })
      const baseName = doc.documentName || doc.fileName || `document_${doc.id}`
      const cd = res.headers['content-disposition'] || ''
      const match = cd.match(/filename="?([^";\s]+)"?/)
      const serverExt = match ? match[1].substring(match[1].lastIndexOf('.')) : ''
      const fileName = serverExt && !baseName.toLowerCase().endsWith(serverExt.toLowerCase())
        ? baseName + serverExt : baseName
      const link = document.createElement('a')
      link.href = URL.createObjectURL(res.data)
      link.download = fileName
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Fayl yüklənə bilmədi')
    }
  }

  const handleEquipmentSelected = (updatedPlan, selectedEq) => {
    setPlan(updatedPlan)
    setEqPicker(false)
    if (selectedEq?.safetyEquipment?.length > 0) {
      set('safetyEquipmentIds', selectedEq.safetyEquipment.map(s => s.id))
    }
    onSaved()
  }

  const uploadedTypes = (plan?.documents || []).map((d) => d.documentType)
  const mandatoryComplete = MANDATORY_DOC_TYPES.every(t =>
    uploadedTypes.includes(t) || (plan?.equipmentDocumentTypes || []).includes(t)
  )

  const tabStatus = useMemo(() => ({
    request: true,
    resources: !!(plan?.equipmentId && form.operatorId),
    finance: !!(form.equipmentPrice && form.startDate && form.endDate),
    docs: mandatoryComplete,
  }), [plan?.equipmentId, form.operatorId, form.equipmentPrice, form.startDate, form.endDate, mandatoryComplete])

  if (loading) {
    return (
      <div className="ces-modal-backdrop">
        <div className="ces-modal" style={{ maxWidth: 320, padding: 40 }}>
          <p className="text-sm text-center m-0" style={{ color: 'var(--ces-muted)' }}>Yüklənir...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="ces-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="ces-modal" style={{ maxWidth: 920, maxHeight: '92vh' }}>
          {/* Header */}
          <div className="ces-m-head">
            <div className="ces-m-ic gold">
              <Wrench size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h3>
                <span className="mono" style={{ color: 'var(--ces-gold-700)' }}>{request.requestCode}</span>
                <span style={{ color: 'var(--ces-mute2)', margin: '0 8px' }}>·</span>
                <span style={{ color: 'var(--ces-ink)' }}>{request.companyName}</span>
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {request.projectName && (
                  <span className="text-xs" style={{ color: 'var(--ces-muted)' }}>{request.projectName}</span>
                )}
                {request.region && (
                  <>
                    <span style={{ color: 'var(--ces-mute2)' }}>·</span>
                    <span className="text-xs" style={{ color: 'var(--ces-muted)' }}>{request.region}</span>
                  </>
                )}
                {request.projectType && (
                  <span className="ces-pill ces-p-mute sm">
                    {request.projectType === 'DAILY' ? 'Günlük' : 'Aylıq'}
                    {request.dayCount ? ` · ${request.dayCount} ${request.projectType === 'MONTHLY' ? 'ay' : 'gün'}` : ''}
                  </span>
                )}
                {request.transportationRequired && (
                  <span className="ces-pill ces-p-warn sm">Daşınma</span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="ces-modal-x" type="button" aria-label="Bağla">
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="ces-tabs" style={{ paddingLeft: 26, paddingRight: 26 }}>
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={clsx('ces-tab', tab === key && 'on')}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon size={14} />
                  {label}
                  {tabStatus[key] && key !== 'request' && (
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--ces-ok)' }} />
                  )}
                </span>
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="ces-m-body" style={{ paddingTop: 22, paddingBottom: 22 }}>
            {tab === 'request' && <TabRequest request={request} />}
            {tab === 'resources' && (
              <TabResources
                plan={plan}
                form={form}
                set={set}
                operators={operators}
                isReadonly={isReadonly}
                onPickEquipment={() => setEqPicker(true)}
              />
            )}
            {tab === 'finance' && (
              <TabFinance
                form={form}
                set={set}
                plan={plan}
                request={request}
                isReadonly={isReadonly}
                autoDayCount={autoDayCount}
                unitPrice={unitPrice}
                equipmentTotal={equipmentTotal}
                totalAmount={totalAmount}
                contrDailyRate={contrDailyRate}
                contrPaymentTotal={contrPaymentTotal}
                opPayment={opPayment}
                transPrice={transPrice}
                companyProfit={companyProfit}
                projectType={projectType}
              />
            )}
            {tab === 'docs' && (
              <TabDocs
                plan={plan}
                form={form}
                set={set}
                docForm={docForm}
                setDocForm={setDocForm}
                fileInputRef={fileInputRef}
                handleUpload={handleUpload}
                handleDownload={handleDownload}
                handleDeleteDoc={handleDeleteDoc}
                uploading={uploading}
                isReadonly={isReadonly}
                safetyTypes={safetyTypes}
                uploadedTypes={uploadedTypes}
                mandatoryComplete={mandatoryComplete}
              />
            )}
          </div>

          {/* Summary bar */}
          <div
            className="flex items-center gap-5 text-xs"
            style={{
              padding: '10px 26px',
              borderTop: '1px solid var(--ces-line)',
              background: 'var(--ces-graphite-50)',
            }}
          >
            <SummaryItem label="Texnika" value={plan?.equipmentName || '—'} />
            <Sep />
            <SummaryItem label="Müddət" value={autoDayCount > 0 ? `${autoDayCount} gün` : '—'} />
            <Sep />
            <SummaryItem label="Ümumi" value={totalAmount > 0 ? `${fmt(totalAmount)} ₼` : '—'} accent="gold" />
            <Sep />
            <SummaryItem
              label="Xeyir"
              value={totalAmount > 0 ? `${fmt(companyProfit)} ₼` : '—'}
              accent={companyProfit >= 0 ? 'ok' : 'danger'}
            />
          </div>

          {/* Footer actions */}
          {!isReadonly && (
            <div className="ces-m-foot">
              <button
                onClick={handleSave}
                disabled={saving || submitting}
                className="ces-btn ces-btn-outline"
              >
                {saving ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Save size={15} />}
                Yadda saxla
              </button>
              {hasPermission('COORDINATOR', 'canSubmitOffer') && (
                <button
                  onClick={handleSubmit}
                  disabled={saving || submitting}
                  className="ces-btn ces-btn-primary"
                >
                  {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={15} />}
                  Təklif kimi göndər
                </button>
              )}
              <div className="flex-1" />
              <button type="button" onClick={onClose} className="ces-btn ces-btn-ghost">
                Bağla
              </button>
            </div>
          )}
        </div>
      </div>

      {eqPicker && (
        <EquipmentPicker
          requestId={request.requestId}
          onSelected={handleEquipmentSelected}
          onClose={() => setEqPicker(false)}
        />
      )}
      <ConfirmDialog />
    </>
  )
}

/* ─── Helpers ──────────────────────────────────────────────────────── */

function Sep() {
  return <span style={{ width: 1, height: 16, background: 'var(--ces-line)' }} />
}

function SummaryItem({ label, value, accent }) {
  const color = accent === 'gold' ? 'var(--ces-gold-700)'
    : accent === 'ok' ? 'var(--ces-ok)'
    : accent === 'danger' ? 'var(--ces-danger)'
    : 'var(--ces-ink)'
  return (
    <span className="inline-flex items-center gap-1.5">
      <span style={{ color: 'var(--ces-muted)' }}>{label}:</span>
      <span className="font-bold num" style={{ color }}>{value}</span>
    </span>
  )
}

/* ─── Tab: Request ─── */
function TabRequest({ request }) {
  return (
    <div className="space-y-4">
      <div className="ces-card" style={{ borderLeft: '4px solid var(--ces-info)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={14} style={{ color: 'var(--ces-info)' }} />
          <p className="ces-sec-label m-0">Müştəri</p>
        </div>
        <p className="text-base font-bold text-[var(--ces-ink)] m-0 mb-1">{request.companyName}</p>
        {request.customerVoen && (
          <p className="text-xs m-0 mb-1" style={{ color: 'var(--ces-muted)' }}>
            VÖEN: <span className="mono font-semibold text-[var(--ces-ink)]">{request.customerVoen}</span>
          </p>
        )}
        {request.customerAddress && (
          <div className="flex items-start gap-1.5 text-xs mb-3" style={{ color: 'var(--ces-muted)' }}>
            <MapPin size={12} className="shrink-0 mt-0.5" />
            <span>{request.customerAddress}</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3" style={{ borderTop: '1px solid var(--ces-line)' }}>
          <ContactBox
            label="Əlaqə şəxsi"
            person={request.contactPerson}
            phone={request.contactPhone}
          />
          <ContactBox
            label="Təchizatçı"
            person={request.customerSupplierPerson}
            phone={request.customerSupplierPhone}
          />
          <ContactBox
            label="Ofis əlaqəsi"
            person={request.customerOfficeContactPerson}
            phone={request.customerOfficeContactPhone}
          />
        </div>
      </div>

      {request.params?.length > 0 && (
        <div className="ces-card" style={{ borderLeft: '4px solid var(--ces-gold)' }}>
          <p className="ces-sec-label mb-3" style={{ color: 'var(--ces-gold-700)' }}>Texniki tələblər</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {request.params.map((p, i) => (
              <div key={i} className="flex items-baseline gap-2 text-sm">
                <span className="text-xs" style={{ color: 'var(--ces-muted)' }}>{p.paramKey}</span>
                <span style={{ color: 'var(--ces-mute2)' }}>·</span>
                <span className="font-semibold text-[var(--ces-ink)]">{p.paramValue}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ContactBox({ label, person, phone }) {
  if (!person && !phone) return null
  return (
    <div style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: 10, padding: 10 }}>
      <p className="text-[10px] font-bold m-0 mb-1.5" style={{ color: 'var(--ces-mute2)', letterSpacing: '.1em', textTransform: 'uppercase' }}>{label}</p>
      {person && (
        <div className="flex items-center gap-1 text-xs mb-1" style={{ color: 'var(--ces-ink)' }}>
          <User size={11} style={{ color: 'var(--ces-mute2)' }} />
          {person}
        </div>
      )}
      {phone && (
        <div className="flex items-center gap-1 text-xs mono" style={{ color: 'var(--ces-muted)' }}>
          <Phone size={11} style={{ color: 'var(--ces-mute2)' }} />
          {phone}
        </div>
      )}
    </div>
  )
}

/* ─── Tab: Resources ─── */
function TabResources({ plan, form, set, operators, isReadonly, onPickEquipment }) {
  const OP_DOC_TYPES = [
    { key: 'DRIVING_LICENSE',    label: 'Sürücülük vəsiqəsi' },
    { key: 'CRIMINAL_RECORD',    label: 'Məhkumluq arayışı' },
    { key: 'HEALTH_CERTIFICATE', label: 'Sağlamlıq arayışı' },
    { key: 'CERTIFICATE',        label: 'Sertifikat' },
    { key: 'ID_CARD',            label: 'Şəxsiyyət vəsiqəsi' },
    { key: 'POWER_OF_ATTORNEY',  label: 'Etibarnamə sənədi' },
  ]
  const op = operators.find(o => String(o.id) === String(form.operatorId))
  const uploaded = new Set(op?.uploadedDocumentTypes || [])

  return (
    <div className="space-y-5">
      {/* Equipment */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Wrench size={14} style={{ color: 'var(--ces-gold-700)' }} />
          <p className="ces-sec-label m-0">Texnika</p>
        </div>
        {plan?.equipmentId ? (
          <div className="ces-card flex items-center gap-4" style={{ padding: 16, background: 'var(--ces-gold-50)', borderColor: 'var(--ces-gold)' }}>
            <div className="ces-m-ic gold" style={{ width: 44, height: 44 }}>
              <Wrench size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--ces-ink)] m-0">{plan.equipmentName}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="mono text-xs font-semibold" style={{ color: 'var(--ces-gold-700)' }}>{plan.equipmentCode}</span>
                {plan.ownershipType && (
                  <span className={clsx('ces-pill sm', EQ_OWNERSHIP_PILL[plan.ownershipType])}>
                    {EQ_OWNERSHIP_LABEL[plan.ownershipType]}
                    {plan.ownershipType === 'CONTRACTOR' && plan.contractorName ? ` · ${plan.contractorName}` : ''}
                  </span>
                )}
              </div>
            </div>
            {!isReadonly && (
              <button onClick={onPickEquipment} className="ces-btn ces-btn-outline ces-btn-sm">
                Dəyiş
              </button>
            )}
          </div>
        ) : !isReadonly ? (
          <button
            onClick={onPickEquipment}
            className="w-full flex items-center justify-center gap-2 transition-all"
            style={{
              border: '2px dashed var(--ces-line)',
              borderRadius: 14,
              padding: '20px',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ces-muted)',
              background: 'var(--ces-surface)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ces-gold)'; e.currentTarget.style.background = 'var(--ces-gold-50)'; e.currentTarget.style.color = 'var(--ces-gold-700)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ces-line)'; e.currentTarget.style.background = 'var(--ces-surface)'; e.currentTarget.style.color = 'var(--ces-muted)' }}
          >
            <Wrench size={16} />
            Qarajdan texnika seç
          </button>
        ) : (
          <p className="text-sm" style={{ color: 'var(--ces-muted)' }}>Texnika seçilməyib</p>
        )}
      </div>

      {/* Operator */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <User size={14} style={{ color: 'var(--ces-gold-700)' }} />
          <p className="ces-sec-label m-0">Operator</p>
        </div>
        <select
          value={form.operatorId}
          onChange={(e) => set('operatorId', e.target.value)}
          className="ces-select"
          disabled={isReadonly}
        >
          <option value="">Operator seçin</option>
          {operators.map(o => {
            const isCurrent = String(o.id) === String(form.operatorId)
            const busyOther = o.busy && !isCurrent
            return (
              <option key={o.id} value={o.id} disabled={busyOther}>
                {busyOther ? '🔒 ' : ''}{o.fullName}{o.specialization ? ` — ${o.specialization}` : ''}{busyOther ? ' (Məşğuldur)' : ''}
              </option>
            )
          })}
        </select>

        {op && (
          <div className="ces-card mt-3" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--ces-line)', background: 'var(--ces-graphite-50)' }}>
              <div className="ces-m-ic" style={{ width: 38, height: 38, background: 'var(--ces-graphite)', color: 'var(--ces-gold)' }}>
                <User size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--ces-ink)] m-0">{op.fullName}</p>
                {op.specialization && (
                  <p className="text-xs m-0" style={{ color: 'var(--ces-muted)' }}>{op.specialization}</p>
                )}
              </div>
              <span className={clsx('ces-pill sm', op.documentsComplete ? 'ces-p-ok' : 'ces-p-warn')}>
                {uploaded.size}/{OP_DOC_TYPES.length} sənəd
              </span>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {op.phone && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ces-ink)' }}>
                    <Phone size={11} style={{ color: 'var(--ces-mute2)' }} />
                    <span className="mono">{op.phone}</span>
                  </div>
                )}
                {op.email && (
                  <div className="flex items-center gap-1.5 text-xs col-span-1 sm:col-span-2" style={{ color: 'var(--ces-ink)' }}>
                    <span style={{ color: 'var(--ces-mute2)', fontSize: 10 }}>@</span>
                    {op.email}
                  </div>
                )}
                {op.address && (
                  <div className="flex items-center gap-1.5 text-xs col-span-1 sm:col-span-3" style={{ color: 'var(--ces-ink)' }}>
                    <MapPin size={11} style={{ color: 'var(--ces-mute2)' }} />
                    {op.address}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {OP_DOC_TYPES.map(({ key, label }) => {
                  const doc = (op.documents || []).find(d => d.documentType === key)
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px]"
                      style={{ background: doc ? 'var(--ces-ok-100)' : 'var(--ces-graphite-50)' }}
                    >
                      {doc ? (
                        <CheckCircle size={11} style={{ color: 'var(--ces-ok)', flexShrink: 0 }} />
                      ) : (
                        <span style={{ width: 11, height: 11, borderRadius: 999, border: '2px solid var(--ces-mute2)', flexShrink: 0 }} />
                      )}
                      {doc ? (
                        <button
                          type="button"
                          onClick={() => operatorsApi.previewDocument(op.id, doc.id, doc.fileName)}
                          className="text-left truncate font-semibold"
                          style={{ color: 'var(--ces-ok)' }}
                        >
                          {label}
                        </button>
                      ) : (
                        <span className="truncate" style={{ color: 'var(--ces-mute2)' }}>{label}</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {op.notes && (
                <div className="flex items-start gap-1.5 text-xs pt-2" style={{ borderTop: '1px solid var(--ces-line)', color: 'var(--ces-muted)' }}>
                  <StickyNote size={11} style={{ color: 'var(--ces-mute2)', flexShrink: 0, marginTop: 2 }} />
                  <span className="whitespace-pre-wrap">{op.notes}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Tab: Finance ─── */
function TabFinance({
  form, set, plan, request, isReadonly, autoDayCount, unitPrice,
  equipmentTotal, totalAmount, contrDailyRate, contrPaymentTotal,
  opPayment, transPrice, companyProfit, projectType,
}) {
  return (
    <div className="space-y-5">
      {/* Dates */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} style={{ color: 'var(--ces-gold-700)' }} />
          <p className="ces-sec-label m-0">Tarixlər</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-0">
          <div className="ces-field">
            <label>Başlama</label>
            <div className="ces-input">
              <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} disabled={isReadonly} />
            </div>
          </div>
          <div className="ces-field">
            <label>Bitmə</label>
            <div className="ces-input">
              <input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} disabled={isReadonly} />
            </div>
          </div>
          <div className="ces-field">
            <label>Müddət</label>
            <div
              style={{
                padding: '11px 13px',
                fontSize: 14,
                borderRadius: 11,
                fontWeight: 700,
                textAlign: 'center',
                border: '1px solid',
                background: autoDayCount > 0 ? 'var(--ces-gold-50)' : 'var(--ces-graphite-50)',
                borderColor: autoDayCount > 0 ? 'var(--ces-gold)' : 'var(--ces-line)',
                color: autoDayCount > 0 ? 'var(--ces-gold-700)' : 'var(--ces-mute2)',
                minHeight: 44,
              }}
            >
              {autoDayCount > 0 ? `${autoDayCount} gün` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={14} style={{ color: 'var(--ces-gold-700)' }} />
          <p className="ces-sec-label m-0">Qiymətləndirmə</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
          <div className="ces-field">
            <label>{projectType === 'MONTHLY' ? 'Aylıq qiymət (AZN)' : 'Günlük qiymət (AZN)'}</label>
            <div className="ces-input">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.equipmentPrice}
                onChange={(e) => set('equipmentPrice', e.target.value)}
                placeholder="0.00"
                className="num"
                disabled={isReadonly}
              />
            </div>
          </div>
          <div className="ces-field">
            <label>Texnika cəmi (AZN)</label>
            <div
              style={{
                padding: '11px 13px',
                fontSize: 14,
                borderRadius: 11,
                fontWeight: 700,
                border: '1px solid var(--ces-line)',
                background: 'var(--ces-graphite-50)',
                color: 'var(--ces-ink)',
                minHeight: 44,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {fmt(equipmentTotal)}
            </div>
          </div>
        </div>

        {unitPrice > 0 && (
          <div
            className="flex items-center gap-2 text-xs mb-3"
            style={{
              padding: '8px 12px',
              background: 'var(--ces-gold-50)',
              border: '1px solid var(--ces-gold-100)',
              borderRadius: 10,
              color: 'var(--ces-gold-700)',
            }}
          >
            <span className="mono" style={{ color: 'var(--ces-gold)' }}>f(x)</span>
            <span style={{ color: 'var(--ces-line)' }}>|</span>
            {projectType === 'DAILY' && autoDayCount > 0 && (
              <span>{autoDayCount} gün × {fmt(unitPrice)} AZN = <span className="font-bold">{fmt(equipmentTotal)} AZN</span></span>
            )}
            {projectType === 'DAILY' && !autoDayCount && (
              <span style={{ color: 'var(--ces-mute2)' }}>Tarixləri seçin</span>
            )}
            {projectType === 'MONTHLY' && (
              <span>Sabit aylıq: <span className="font-bold">{fmt(unitPrice)} AZN</span></span>
            )}
            {!projectType && autoDayCount > 0 && (
              <span>{autoDayCount} × {fmt(unitPrice)} = <span className="font-bold">{fmt(equipmentTotal)} AZN</span></span>
            )}
            {!projectType && !autoDayCount && (
              <span style={{ color: 'var(--ces-mute2)' }}>Tarixləri seçin</span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-0">
          {(plan?.ownershipType === 'CONTRACTOR' || plan?.ownershipType === 'INVESTOR') && (
            <div className="ces-field">
              <label>
                {plan?.ownershipType === 'INVESTOR' ? 'İnvestor' : 'Podratçı'}{' '}
                {projectType === 'MONTHLY' ? 'aylıq' : 'günlük'} ödənişi
              </label>
              <div className="ces-input">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.contractorDailyRate}
                  onChange={(e) => set('contractorDailyRate', e.target.value)}
                  placeholder="0.00"
                  className="num"
                  disabled={isReadonly}
                />
              </div>
              {contrDailyRate > 0 && autoDayCount > 0 && projectType === 'DAILY' && (
                <span className="ces-hint" style={{ color: 'var(--ces-warn)' }}>
                  {autoDayCount} × {contrDailyRate} = <b>{contrPaymentTotal.toFixed(2)} AZN</b>
                </span>
              )}
              {contrDailyRate > 0 && projectType === 'MONTHLY' && (
                <span className="ces-hint" style={{ color: 'var(--ces-warn)' }}>
                  Sabit aylıq: <b>{contrDailyRate.toFixed(2)} AZN</b>
                </span>
              )}
            </div>
          )}
          <div className="ces-field">
            <label>Operator ödənişi</label>
            <div className="ces-input">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.operatorPayment}
                onChange={(e) => set('operatorPayment', e.target.value)}
                placeholder="0.00"
                className="num"
                disabled={isReadonly}
              />
            </div>
          </div>
          {request.transportationRequired && (
            <div className="ces-field">
              <label>Daşınma</label>
              <div className="ces-input">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.transportationPrice}
                  onChange={(e) => set('transportationPrice', e.target.value)}
                  placeholder="0.00"
                  className="num"
                  disabled={isReadonly}
                />
              </div>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div
            style={{
              padding: 16,
              background: 'var(--ces-gold-50)',
              border: '1px solid var(--ces-gold)',
              borderRadius: 14,
            }}
          >
            <p className="ces-sec-label m-0 mb-1" style={{ color: 'var(--ces-gold-700)' }}>Ümumi gəlir</p>
            <p className="num font-bold m-0" style={{ fontSize: 22, color: 'var(--ces-gold-700)' }}>
              {fmt(totalAmount)} <span style={{ fontSize: 14, fontWeight: 600 }}>AZN</span>
            </p>
            {transPrice > 0 && (
              <p className="text-xs m-0 mt-1" style={{ color: 'var(--ces-muted)' }}>
                Texnika {fmt(equipmentTotal)} + Daşınma {fmt(transPrice)}
              </p>
            )}
          </div>
          <div
            style={{
              padding: 16,
              background: companyProfit >= 0 ? 'var(--ces-ok-100)' : 'var(--ces-danger-100)',
              border: `1px solid ${companyProfit >= 0 ? 'var(--ces-ok)' : 'var(--ces-danger)'}`,
              borderRadius: 14,
            }}
          >
            <p className="ces-sec-label m-0 mb-1" style={{ color: companyProfit >= 0 ? 'var(--ces-ok)' : 'var(--ces-danger)' }}>
              Şirkət xeyri
            </p>
            <p className="num font-bold m-0" style={{ fontSize: 22, color: companyProfit >= 0 ? 'var(--ces-ok)' : 'var(--ces-danger)' }}>
              {fmt(companyProfit)} <span style={{ fontSize: 14, fontWeight: 600 }}>AZN</span>
            </p>
            {(contrPaymentTotal > 0 || opPayment > 0) && (
              <p className="text-xs m-0 mt-1" style={{ color: 'var(--ces-muted)' }}>
                {fmt(totalAmount)} − {[contrPaymentTotal > 0 && fmt(contrPaymentTotal), opPayment > 0 && fmt(opPayment)].filter(Boolean).join(' − ')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="ces-field">
        <label>Qeyd</label>
        <div className="ces-input" style={{ alignItems: 'flex-start', paddingTop: 4, paddingBottom: 4 }}>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            placeholder="Əlavə qeydlər..."
            disabled={isReadonly}
          />
        </div>
      </div>
    </div>
  )
}

/* ─── Tab: Docs ─── */
function TabDocs({
  plan, form, set, docForm, setDocForm, fileInputRef, handleUpload, handleDownload,
  handleDeleteDoc, uploading, isReadonly, safetyTypes, uploadedTypes, mandatoryComplete,
}) {
  return (
    <div className="space-y-5">
      {/* Mandatory docs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} style={{ color: 'var(--ces-gold-700)' }} />
            <p className="ces-sec-label m-0">Məcburi sənədlər</p>
          </div>
          <span className={clsx('ces-pill sm', mandatoryComplete ? 'ces-p-ok' : 'ces-p-warn')}>
            <span className="d" />
            {MANDATORY_DOC_TYPES.filter(t => uploadedTypes.includes(t) || (plan?.equipmentDocumentTypes || []).includes(t)).length}/{MANDATORY_DOC_TYPES.length}
            {mandatoryComplete ? ' Tam' : ' Natamam'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {MANDATORY_DOC_TYPES.map((type) => {
            const docLabel = DOC_TYPES.find((d) => d.value === type)?.label
            const uploadedInPlan = uploadedTypes.includes(type)
            const existsInEquipment = (plan?.equipmentDocumentTypes || []).includes(type)
            const available = uploadedInPlan || existsInEquipment
            return (
              <div
                key={type}
                className="text-center transition-all"
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: available ? 'var(--ces-ok-100)' : 'var(--ces-graphite-50)',
                  border: available ? '1px solid var(--ces-ok)' : '1px dashed var(--ces-line)',
                }}
              >
                <CheckCircle
                  size={20}
                  className="mx-auto mb-2"
                  style={{ color: available ? 'var(--ces-ok)' : 'var(--ces-mute2)' }}
                />
                <p className="text-xs font-semibold leading-tight m-0" style={{ color: available ? 'var(--ces-ok)' : 'var(--ces-mute2)' }}>
                  {docLabel}
                </p>
                {existsInEquipment && !uploadedInPlan && (
                  <p className="text-[10px] font-bold m-0 mt-1" style={{ color: 'var(--ces-ok)' }}>texnikada var</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Safety */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={14} style={{ color: 'var(--ces-gold-700)' }} />
          <p className="ces-sec-label m-0">Təhlükəsizlik avadanlıqları</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {safetyTypes.map((st) => {
            const checked = (form.safetyEquipmentIds || []).includes(st.id)
            return (
              <label
                key={st.id}
                className="cursor-pointer transition-all"
                style={{
                  padding: 12,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: checked ? 'var(--ces-gold-50)' : 'var(--ces-surface)',
                  border: checked ? '1px solid var(--ces-gold)' : '1px solid var(--ces-line)',
                  opacity: isReadonly ? 0.7 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const ids = form.safetyEquipmentIds || []
                    set('safetyEquipmentIds', checked ? ids.filter(id => id !== st.id) : [...ids, st.id])
                  }}
                  style={{ display: 'none' }}
                  disabled={isReadonly}
                />
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    border: checked ? '0' : '1.6px solid #cdcdcd',
                    background: checked ? 'var(--ces-gold)' : 'var(--ces-surface)',
                    display: 'inline-grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {checked && (
                    <span
                      style={{
                        width: 10,
                        height: 6,
                        borderLeft: '2px solid #fff',
                        borderBottom: '2px solid #fff',
                        transform: 'rotate(-45deg) translate(1px, -1px)',
                      }}
                    />
                  )}
                </span>
                <span className="text-sm" style={{ color: checked ? 'var(--ces-gold-700)' : 'var(--ces-ink)', fontWeight: checked ? 600 : 500 }}>
                  {st.key}
                </span>
              </label>
            )
          })}
          {safetyTypes.length === 0 && (
            <p className="col-span-3 text-xs italic" style={{ color: 'var(--ces-mute2)' }}>
              Konfiqurasiyada təhlükəsizlik avadanlığı yoxdur
            </p>
          )}
        </div>
      </div>

      {/* Upload */}
      {!isReadonly && (
        <div
          style={{
            border: '1px dashed var(--ces-gold)',
            borderRadius: 14,
            padding: 16,
            background: 'var(--ces-gold-50)',
          }}
        >
          <p className="ces-sec-label mb-3" style={{ color: 'var(--ces-gold-700)' }}>Sənəd yüklə</p>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <div className="ces-field sm:col-span-2" style={{ marginBottom: 0 }}>
              <label>Sənəd tipi</label>
              <select
                value={docForm.documentType}
                onChange={(e) => setDocForm((d) => ({ ...d, documentType: e.target.value }))}
                className="ces-select"
              >
                {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="ces-field sm:col-span-2" style={{ marginBottom: 0 }}>
              <label>Ad (opsional)</label>
              <div className="ces-input">
                <input
                  type="text"
                  value={docForm.documentName}
                  onChange={(e) => setDocForm((d) => ({ ...d, documentName: e.target.value }))}
                  placeholder="Avtomatik"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="ces-btn ces-btn-primary"
              style={{ height: 44 }}
            >
              <Upload size={15} />
              {uploading ? '...' : 'Yüklə'}
            </button>
          </div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
        </div>
      )}

      {/* Uploaded docs */}
      {plan?.documents?.length > 0 && (
        <div>
          <p className="ces-sec-label mb-2">Yüklənmiş sənədlər ({plan.documents.length})</p>
          <div className="space-y-2">
            {plan.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 group"
                style={{
                  padding: '10px 12px',
                  background: 'var(--ces-surface)',
                  border: '1px solid var(--ces-line)',
                  borderRadius: 12,
                }}
              >
                <FileText size={16} style={{ color: 'var(--ces-gold)', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--ces-ink)] truncate m-0">{doc.documentName}</p>
                  <p className="text-xs m-0" style={{ color: 'var(--ces-muted)' }}>
                    {DOC_TYPES.find((d) => d.value === doc.documentType)?.label}
                    {doc.uploadedByName && ` · ${doc.uploadedByName}`}
                  </p>
                </div>
                <span className="mono text-[10px] uppercase" style={{ color: 'var(--ces-mute2)' }}>{doc.fileType}</span>
                <button onClick={() => handleDownload(doc)} className="ces-row-act gold" title="Yüklə">
                  <Download size={14} />
                </button>
                {!isReadonly && (
                  <button onClick={() => handleDeleteDoc(doc.id)} className="ces-row-act danger" title="Sil">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
