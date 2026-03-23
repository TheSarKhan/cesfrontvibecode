import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Upload, Trash2, Download, FileText, CheckCircle, Search, Wrench, Building2, Phone, MapPin, User, Calendar, DollarSign, ShieldCheck, StickyNote, ChevronRight, Save, Send } from 'lucide-react'
import { coordinatorApi } from '../../api/coordinator'
import { garageApi } from '../../api/garage'
import { operatorsApi } from '../../api/operators'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'

const DOC_TYPES = [
  { value: 'REGISTRATION_CERT', label: 'Qeydiyyat şəhadətnaməsi' },
  { value: 'THIRD_PARTY_INSPECTION', label: '3-cü tərəf texniki baxış sənədi' },
  { value: 'TECHNICAL_INSPECTION', label: 'Texniki baxış sənədi' },
  { value: 'OTHER', label: 'Digər' },
]
const MANDATORY_DOC_TYPES = ['REGISTRATION_CERT', 'THIRD_PARTY_INSPECTION', 'TECHNICAL_INSPECTION']

const TABS = [
  { key: 'request', label: 'Sorğu', icon: Building2 },
  { key: 'resources', label: 'Texnika & Operator', icon: Wrench },
  { key: 'finance', label: 'Maliyyə', icon: DollarSign },
  { key: 'docs', label: 'Sənədlər', icon: FileText },
]

function fmt(val) {
  if (val == null || val === '') return '—'
  return parseFloat(val).toLocaleString('az-AZ', { minimumFractionDigits: 2 })
}

// ─── Equipment Picker Popup ───────────────────────────────────────────────────
const EQ_OWNERSHIP_LABEL = { COMPANY: 'Şirkət', INVESTOR: 'İnvestor', CONTRACTOR: 'Podratçı' }
const EQ_OWNERSHIP_CLS = {
  COMPANY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  INVESTOR: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CONTRACTOR: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}
const EQ_STATUS_LABEL = { AVAILABLE: 'Mövcuddur', IN_USE: 'İstifadədə', UNDER_REPAIR: 'Təmirdə', DECOMMISSIONED: 'Xaric edilib' }
const EQ_STATUS_CLS = {
  AVAILABLE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  IN_USE: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  UNDER_REPAIR: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  DECOMMISSIONED: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
}

function EquipmentPicker({ requestId, onSelected, onClose }) {
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selecting, setSelecting] = useState(false)

  useEffect(() => {
    garageApi.getAll()
      .then((r) => setEquipment(r.data.data || r.data || []))
      .catch(() => toast.error('Texnikalar yüklənmədi'))
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
      onSelected(res.data.data)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Seçim uğursuz oldu')
    } finally {
      setSelecting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Qarajdan texnika seç</h2>
            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} texnika</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-purple-500 hover:bg-purple-600 flex items-center justify-center transition-colors">
            <X size={14} className="text-white" />
          </button>
        </div>
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Ad, kod, növ, marka, qeydiyyat nömrəsi, sahibkar..." autoFocus
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {loading ? (
            <p className="py-10 text-center text-sm text-gray-400">Yüklənir...</p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">Texnika tapılmadı</p>
          ) : (
            filtered.map((eq) => (
              <button key={eq.id} onClick={() => handleSelect(eq)} disabled={selecting}
                className="w-full text-left p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all disabled:opacity-50 group">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                      {eq.name}
                    </span>
                    <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0', EQ_OWNERSHIP_CLS[eq.ownershipType])}>
                      {EQ_OWNERSHIP_LABEL[eq.ownershipType]}
                    </span>
                  </div>
                  {eq.status && (
                    <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0', EQ_STATUS_CLS[eq.status] || 'bg-gray-100 text-gray-500')}>
                      {EQ_STATUS_LABEL[eq.status] || eq.status}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">{eq.equipmentCode}</span>
                  <span>{eq.type}</span>
                  {(eq.brand || eq.model) && <span>{[eq.brand, eq.model].filter(Boolean).join(' ')}</span>}
                  {eq.manufactureYear && <span>{eq.manufactureYear} il</span>}
                  {eq.plateNumber && <span className="font-medium text-gray-700 dark:text-gray-300">{eq.plateNumber}</span>}
                  {eq.serialNumber && <span>S/N: {eq.serialNumber}</span>}
                  {eq.weightTon && <span>{eq.weightTon} ton</span>}
                  {eq.storageLocation && <span>{eq.storageLocation}</span>}
                </div>
                {eq.ownershipType === 'INVESTOR' && eq.ownerInvestorName && (
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg px-3 py-1.5 mb-2">
                    <span className="font-semibold">{eq.ownerInvestorName}</span>
                    {eq.ownerInvestorVoen && <span>VÖEN: {eq.ownerInvestorVoen}</span>}
                    {eq.ownerInvestorPhone && <span>{eq.ownerInvestorPhone}</span>}
                  </div>
                )}
                {eq.ownershipType === 'CONTRACTOR' && eq.ownerContractorName && (
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-lg px-3 py-1.5 mb-2">
                    <span className="font-semibold">{eq.ownerContractorName}</span>
                    {eq.ownerContractorVoen && <span>VÖEN: {eq.ownerContractorVoen}</span>}
                    {eq.ownerContractorPhone && <span>{eq.ownerContractorPhone}</span>}
                    {eq.ownerContractorContact && <span>Əlaqədar: {eq.ownerContractorContact}</span>}
                  </div>
                )}
                {(eq.lastInspectionDate || eq.nextInspectionDate || eq.technicalReadinessStatus || eq.motoHours != null || eq.hourKmCounter != null) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400 dark:text-gray-500">
                    {eq.technicalReadinessStatus && (
                      <span>Texniki hazırlıq: <span className="text-gray-600 dark:text-gray-300">{eq.technicalReadinessStatus}</span></span>
                    )}
                    {eq.lastInspectionDate && <span>Son baxış: {eq.lastInspectionDate}</span>}
                    {eq.nextInspectionDate && <span>Növbəti baxış: {eq.nextInspectionDate}</span>}
                    {eq.motoHours != null && <span>Moto saat: {parseFloat(eq.motoHours).toLocaleString('az-AZ')}</span>}
                    {eq.hourKmCounter != null && <span>Sayğac: {parseFloat(eq.hourKmCounter).toLocaleString('az-AZ')}</span>}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
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

  useEffect(() => {
    operatorsApi.getAll()
      .then(r => setOperators(r.data.data || r.data || []))
      .catch(() => {})
  }, [])

  const [form, setForm] = useState({
    operatorId: '',
    equipmentPrice: '',
    dayCount: '',
    contractorPayment: '',
    operatorPayment: '',
    transportationPrice: '',
    startDate: '',
    endDate: '',
    hasFlashingLights: false,
    hasFireExtinguisher: false,
    hasFirstAid: false,
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
            contractorPayment: p.contractorPayment ?? '',
            operatorPayment: p.operatorPayment ?? '',
            transportationPrice: p.transportationPrice ?? '',
            startDate: p.startDate || '',
            endDate: p.endDate || '',
            hasFlashingLights: p.hasFlashingLights || false,
            hasFireExtinguisher: p.hasFireExtinguisher || false,
            hasFirstAid: p.hasFirstAid || false,
            notes: p.notes || '',
          })
        }
      })
      .catch(() => toast.error('Plan yüklənmədi'))
      .finally(() => setLoading(false))

  useEffect(() => { loadPlan() }, [request.requestId])

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const unitPrice = parseFloat(form.equipmentPrice) || 0
  const transPrice = parseFloat(form.transportationPrice) || 0
  const contrPayment = parseFloat(form.contractorPayment) || 0
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
    if (projectType === 'MONTHLY') {
      if (!autoDayCount) return unitPrice
      return (unitPrice / 26) * autoDayCount
    }
    return autoDayCount ? autoDayCount * unitPrice : unitPrice
  }
  const equipmentTotal = calcEquipmentTotal()
  const totalAmount = equipmentTotal + transPrice
  const companyProfit = totalAmount - contrPayment - opPayment

  const isReadonly = request.requestStatus !== 'SENT_TO_COORDINATOR'

  const doSave = async () => {
    const payload = {
      operatorId: form.operatorId ? parseInt(form.operatorId) : null,
      equipmentPrice: parseFloat(form.equipmentPrice) || null,
      dayCount: autoDayCount || null,
      totalAmount: equipmentTotal + transPrice || null,
      contractorPayment: parseFloat(form.contractorPayment) || null,
      operatorPayment: parseFloat(form.operatorPayment) || null,
      transportationPrice: parseFloat(form.transportationPrice) || null,
      companyProfit: companyProfit || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      hasFlashingLights: form.hasFlashingLights,
      hasFireExtinguisher: form.hasFireExtinguisher,
      hasFirstAid: form.hasFirstAid,
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
      toast.error(err?.response?.data?.message || 'Yadda saxlama uğursuz oldu')
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
      toast.error(err?.response?.data?.message || 'Göndərmə uğursuz oldu')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
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
      toast.error(err?.response?.data?.message || 'Yükləmə uğursuz oldu')
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
    } catch {
      toast.error('Silmə uğursuz oldu')
    }
  }

  const handleEquipmentSelected = (updatedPlan) => {
    setPlan(updatedPlan)
    setEqPicker(false)
    onSaved()
  }

  const uploadedTypes = (plan?.documents || []).map((d) => d.documentType)
  const mandatoryComplete = MANDATORY_DOC_TYPES.every(t =>
    uploadedTypes.includes(t) || (plan?.equipmentDocumentTypes || []).includes(t)
  )

  // Tab completion indicators
  const tabStatus = useMemo(() => ({
    request: true, // always complete (readonly)
    resources: !!(plan?.equipmentId && form.operatorId),
    finance: !!(form.equipmentPrice && form.startDate && form.endDate),
    docs: mandatoryComplete,
  }), [plan?.equipmentId, form.operatorId, form.equipmentPrice, form.startDate, form.endDate, mandatoryComplete])

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 shadow-2xl">
          <p className="text-sm text-gray-400">Yüklənir...</p>
        </div>
      </div>
    )
  }

  const OWNERSHIP_LABEL = { COMPANY: 'Şirkət texnikası', INVESTOR: 'İnvestor texnikası', CONTRACTOR: 'Podratçı texnikası' }
  const OWNERSHIP_CLS = { COMPANY: 'text-green-600', INVESTOR: 'text-blue-600', CONTRACTOR: 'text-orange-600' }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl relative flex flex-col max-h-[92vh]">

          {/* ═══ Header ═══ */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                <Wrench size={18} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 truncate">
                  {request.requestCode}
                  <span className="font-normal text-gray-400 ml-2">·</span>
                  <span className="font-medium text-gray-500 dark:text-gray-400 ml-2">{request.companyName}</span>
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                  <span>{request.projectName}</span>
                  <span>·</span>
                  <span>{request.region}</span>
                  <span>·</span>
                  <span className={clsx('font-medium px-1.5 py-0.5 rounded',
                    request.projectType === 'DAILY' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                  )}>
                    {request.projectType === 'DAILY' ? 'Günlük' : request.projectType === 'MONTHLY' ? 'Aylıq' : '—'}
                    {request.dayCount ? ` · ${request.dayCount} ${request.projectType === 'MONTHLY' ? 'ay' : 'gün'}` : ''}
                  </span>
                  {request.transportationRequired && (
                    <span className="bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 font-medium px-1.5 py-0.5 rounded">Daşınma</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-purple-500 hover:bg-purple-600 flex items-center justify-center transition-colors shrink-0 ml-3">
              <X size={15} className="text-white" />
            </button>
          </div>

          {/* ═══ Tabs ═══ */}
          <div className="flex border-b border-gray-100 dark:border-gray-700 shrink-0 px-2 gap-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative border-b-2 -mb-px',
                  tab === key
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                )}>
                <Icon size={15} />
                {label}
                {tabStatus[key] && key !== 'request' && (
                  <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* ═══ Tab Content ═══ */}
          <div className="overflow-y-auto flex-1 scrollbar-thin">

            {/* ── TAB: Sorğu ── */}
            {tab === 'request' && (
              <div className="p-6 space-y-4">
                {/* Müştəri */}
                <div className="bg-blue-50/70 dark:bg-blue-900/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 size={14} className="text-blue-500 shrink-0" />
                    <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Müştəri</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">{request.companyName}</p>
                  {request.customerVoen && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">VÖEN: <span className="font-medium text-gray-700 dark:text-gray-300">{request.customerVoen}</span></p>
                  )}
                  {request.customerAddress && (
                    <div className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
                      <MapPin size={12} className="shrink-0 mt-0.5" />
                      <span>{request.customerAddress}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-blue-100 dark:border-blue-800">
                    {(request.contactPerson || request.contactPhone) && (
                      <div className="bg-white/60 dark:bg-gray-800/40 rounded-lg p-2.5">
                        <p className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Əlaqə şəxsi</p>
                        {request.contactPerson && (
                          <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                            <User size={10} className="text-gray-400 shrink-0" />
                            {request.contactPerson}
                          </div>
                        )}
                        {request.contactPhone && (
                          <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 mt-1">
                            <Phone size={10} className="text-gray-400 shrink-0" />
                            {request.contactPhone}
                          </div>
                        )}
                      </div>
                    )}
                    {(request.customerSupplierPerson || request.customerSupplierPhone) && (
                      <div className="bg-white/60 dark:bg-gray-800/40 rounded-lg p-2.5">
                        <p className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Təchizatçı</p>
                        {request.customerSupplierPerson && (
                          <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                            <User size={10} className="text-gray-400 shrink-0" />
                            {request.customerSupplierPerson}
                          </div>
                        )}
                        {request.customerSupplierPhone && (
                          <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 mt-1">
                            <Phone size={10} className="text-gray-400 shrink-0" />
                            {request.customerSupplierPhone}
                          </div>
                        )}
                      </div>
                    )}
                    {(request.customerOfficeContactPerson || request.customerOfficeContactPhone) && (
                      <div className="bg-white/60 dark:bg-gray-800/40 rounded-lg p-2.5">
                        <p className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Ofis əlaqəsi</p>
                        {request.customerOfficeContactPerson && (
                          <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                            <User size={10} className="text-gray-400 shrink-0" />
                            {request.customerOfficeContactPerson}
                          </div>
                        )}
                        {request.customerOfficeContactPhone && (
                          <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 mt-1">
                            <Phone size={10} className="text-gray-400 shrink-0" />
                            {request.customerOfficeContactPhone}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Texniki parametrlər */}
                {request.params?.length > 0 && (
                  <div className="bg-amber-50/70 dark:bg-amber-900/20 rounded-xl p-4">
                    <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3">
                      Texniki tələblər
                    </p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                      {request.params.map((p, i) => (
                        <div key={i} className="flex items-baseline gap-2 text-sm">
                          <span className="text-gray-400 dark:text-gray-500 shrink-0 text-xs">{p.paramKey}</span>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">{p.paramValue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: Texnika & Operator ── */}
            {tab === 'resources' && (
              <div className="p-6 space-y-5">
                {/* Texnika */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench size={14} className="text-purple-500" />
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Texnika</p>
                  </div>
                  {plan?.equipmentId ? (
                    <div className="flex items-center gap-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-5 py-4 border border-purple-100 dark:border-purple-800/50">
                      <div className="w-11 h-11 rounded-lg bg-purple-200 dark:bg-purple-800 flex items-center justify-center shrink-0">
                        <Wrench size={20} className="text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{plan.equipmentName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-purple-600 dark:text-purple-400">{plan.equipmentCode}</span>
                          {plan.ownershipType && (
                            <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded-full', EQ_OWNERSHIP_CLS[plan.ownershipType])}>
                              {EQ_OWNERSHIP_LABEL[plan.ownershipType]}
                              {plan.ownershipType === 'CONTRACTOR' && plan.contractorName ? ` · ${plan.contractorName}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      {!isReadonly && (
                        <button onClick={() => setEqPicker(true)}
                          className="text-xs text-purple-600 hover:text-purple-700 font-semibold px-3 py-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors shrink-0 border border-purple-200 dark:border-purple-700">
                          Dəyiş
                        </button>
                      )}
                    </div>
                  ) : (
                    !isReadonly ? (
                      <button onClick={() => setEqPicker(true)}
                        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-xl py-5 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                        <Wrench size={16} />
                        Qarajdan texnika seç
                      </button>
                    ) : (
                      <p className="text-sm text-gray-400 px-1">Texnika seçilməyib</p>
                    )
                  )}
                </div>

                {/* Operator */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User size={14} className="text-purple-500" />
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Operator</p>
                  </div>
                  <select
                    value={form.operatorId}
                    onChange={(e) => set('operatorId', e.target.value)}
                    className={inputCls}
                    disabled={isReadonly}
                  >
                    <option value="">Operator seçin</option>
                    {operators.map(op => (
                      <option key={op.id} value={op.id}>
                        {op.fullName}{op.specialization ? ` — ${op.specialization}` : ''}
                      </option>
                    ))}
                  </select>

                  {/* Operator details card */}
                  {form.operatorId && (() => {
                    const op = operators.find(o => String(o.id) === String(form.operatorId))
                    if (!op) return null
                    const OP_DOC_TYPES = [
                      { key: 'DRIVING_LICENSE',    label: 'Sürücülük vəsiqəsi' },
                      { key: 'CRIMINAL_RECORD',    label: 'Məhkumluq arayışı' },
                      { key: 'HEALTH_CERTIFICATE', label: 'Sağlamlıq arayışı' },
                      { key: 'CERTIFICATE',        label: 'Sertifikat' },
                      { key: 'ID_CARD',            label: 'Şəxsiyyət vəsiqəsi' },
                      { key: 'POWER_OF_ATTORNEY',  label: 'Etibarnamə sənədi' },
                    ]
                    const uploaded = new Set(op.uploadedDocumentTypes || [])
                    return (
                      <div className="mt-3 rounded-xl border border-purple-100 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/60 to-white dark:from-purple-900/10 dark:to-gray-800 overflow-hidden">
                        {/* Operator info header */}
                        <div className="px-4 py-3 flex items-center gap-3 border-b border-purple-100/50 dark:border-purple-800/30">
                          <div className="w-9 h-9 rounded-lg bg-purple-200 dark:bg-purple-800 flex items-center justify-center shrink-0">
                            <User size={16} className="text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{op.fullName}</p>
                            {op.specialization && <p className="text-xs text-gray-400">{op.specialization}</p>}
                          </div>
                          <span className={clsx(
                            'text-[10px] font-semibold px-2 py-1 rounded-lg',
                            op.documentsComplete
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          )}>
                            {uploaded.size}/{OP_DOC_TYPES.length} sənəd
                          </span>
                        </div>

                        <div className="px-4 py-3 space-y-3">
                          {/* Contact grid */}
                          <div className="grid grid-cols-3 gap-2">
                            {op.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                                <Phone size={11} className="text-gray-400 shrink-0" />
                                {op.phone}
                              </div>
                            )}
                            {op.email && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 col-span-2">
                                <span className="text-gray-400 shrink-0 text-[10px]">@</span>
                                {op.email}
                              </div>
                            )}
                            {op.address && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 col-span-3">
                                <MapPin size={11} className="text-gray-400 shrink-0" />
                                {op.address}
                              </div>
                            )}
                          </div>

                          {/* Documents grid */}
                          <div className="grid grid-cols-3 gap-1.5">
                            {OP_DOC_TYPES.map(({ key, label }) => {
                              const doc = (op.documents || []).find(d => d.documentType === key)
                              return (
                                <div key={key} className={clsx(
                                  'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px]',
                                  doc ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700/50'
                                )}>
                                  {doc
                                    ? <CheckCircle size={11} className="text-green-500 shrink-0" />
                                    : <span className="w-[11px] h-[11px] rounded-full border-2 border-gray-300 dark:border-gray-500 shrink-0" />
                                  }
                                  {doc ? (
                                    <button type="button"
                                      onClick={() => operatorsApi.previewDocument(op.id, doc.id, doc.fileName)}
                                      className="text-purple-600 dark:text-purple-400 hover:underline text-left truncate font-medium">
                                      {label}
                                    </button>
                                  ) : (
                                    <span className="text-gray-400 truncate">{label}</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {op.notes && (
                            <div className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-purple-100/50 dark:border-purple-800/30">
                              <StickyNote size={11} className="text-gray-400 shrink-0 mt-0.5" />
                              <span className="whitespace-pre-wrap">{op.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}

            {/* ── TAB: Maliyyə ── */}
            {tab === 'finance' && (
              <div className="p-6 space-y-5">
                {/* Tarixlər */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar size={14} className="text-purple-500" />
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tarixlər</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>Başlama</label>
                      <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className={inputCls} disabled={isReadonly} />
                    </div>
                    <div>
                      <label className={labelCls}>Bitmə</label>
                      <input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className={inputCls} disabled={isReadonly} />
                    </div>
                    <div>
                      <label className={labelCls}>Müddət</label>
                      <div className={clsx(
                        'px-3 py-2 text-sm border rounded-lg font-bold text-center',
                        autoDayCount > 0
                          ? 'border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                          : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-750 text-gray-400'
                      )}>
                        {autoDayCount > 0 ? `${autoDayCount} gün` : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Qiymətləndirmə */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign size={14} className="text-purple-500" />
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qiymətləndirmə</p>
                  </div>

                  {/* Unit price + Equipment total */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className={labelCls}>
                        {projectType === 'MONTHLY' ? 'Aylıq qiymət (AZN)' : 'Günlük qiymət (AZN)'}
                      </label>
                      <input type="number" min="0" step="0.01" value={form.equipmentPrice}
                        onChange={(e) => set('equipmentPrice', e.target.value)}
                        placeholder="0.00" className={inputCls} disabled={isReadonly} />
                    </div>
                    <div>
                      <label className={labelCls}>Texnika cəmi (AZN)</label>
                      <div className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-750 text-gray-800 dark:text-gray-200 font-bold">
                        {fmt(equipmentTotal)}
                      </div>
                    </div>
                  </div>

                  {/* Formula breakdown */}
                  {unitPrice > 0 && (
                    <div className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30 rounded-lg px-3 py-2 text-xs text-purple-600 dark:text-purple-400 mb-3 flex items-center gap-2">
                      <span className="font-mono text-purple-400">f(x)</span>
                      <span className="text-purple-300 dark:text-purple-600">|</span>
                      {projectType === 'DAILY' && autoDayCount > 0 && (
                        <span>{autoDayCount} gün × {fmt(unitPrice)} AZN/gün = <span className="font-bold">{fmt(equipmentTotal)} AZN</span></span>
                      )}
                      {projectType === 'DAILY' && !autoDayCount && (
                        <span className="text-gray-400">Tarixləri seçin</span>
                      )}
                      {projectType === 'MONTHLY' && !autoDayCount && (
                        <span>Sabit aylıq: <span className="font-bold">{fmt(unitPrice)} AZN</span></span>
                      )}
                      {projectType === 'MONTHLY' && autoDayCount > 0 && (
                        <span>{fmt(unitPrice)} ÷ 26 × {autoDayCount} = <span className="font-bold">{fmt(equipmentTotal)} AZN</span></span>
                      )}
                      {!projectType && autoDayCount > 0 && (
                        <span>{autoDayCount} × {fmt(unitPrice)} = <span className="font-bold">{fmt(equipmentTotal)} AZN</span></span>
                      )}
                      {!projectType && !autoDayCount && (
                        <span className="text-gray-400">Tarixləri seçin</span>
                      )}
                    </div>
                  )}

                  {/* Expenses row */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {plan?.ownershipType === 'CONTRACTOR' && (
                      <div>
                        <label className={labelCls}>Podratçı ödənişi</label>
                        <input type="number" min="0" step="0.01" value={form.contractorPayment}
                          onChange={(e) => set('contractorPayment', e.target.value)}
                          placeholder="0.00" className={inputCls} disabled={isReadonly} />
                      </div>
                    )}
                    <div>
                      <label className={labelCls}>Operator ödənişi</label>
                      <input type="number" min="0" step="0.01" value={form.operatorPayment}
                        onChange={(e) => set('operatorPayment', e.target.value)}
                        placeholder="0.00" className={inputCls} disabled={isReadonly} />
                    </div>
                    {request.transportationRequired && (
                      <div>
                        <label className={labelCls}>Daşınma</label>
                        <input type="number" min="0" step="0.01" value={form.transportationPrice}
                          onChange={(e) => set('transportationPrice', e.target.value)}
                          placeholder="0.00" className={inputCls} disabled={isReadonly} />
                      </div>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800/40">
                      <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-1">Ümumi gəlir</p>
                      <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{fmt(totalAmount)} <span className="text-sm font-medium">AZN</span></p>
                      {transPrice > 0 && (
                        <p className="text-[10px] text-purple-400 mt-1">Texnika {fmt(equipmentTotal)} + Daşınma {fmt(transPrice)}</p>
                      )}
                    </div>
                    <div className={clsx(
                      'rounded-xl p-4 border',
                      companyProfit >= 0
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/40'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/40'
                    )}>
                      <p className={clsx('text-[10px] font-semibold uppercase tracking-wider mb-1',
                        companyProfit >= 0 ? 'text-green-400' : 'text-red-400')}>
                        Şirkət xeyri
                      </p>
                      <p className={clsx('text-xl font-bold', companyProfit >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400')}>
                        {fmt(companyProfit)} <span className="text-sm font-medium">AZN</span>
                      </p>
                      {(contrPayment > 0 || opPayment > 0) && (
                        <p className={clsx('text-[10px] mt-1', companyProfit >= 0 ? 'text-green-400' : 'text-red-400')}>
                          {fmt(totalAmount)} − {[contrPayment > 0 && `${fmt(contrPayment)}`, opPayment > 0 && `${fmt(opPayment)}`].filter(Boolean).join(' − ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Qeyd */}
                <div>
                  <label className={labelCls}>Qeyd</label>
                  <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
                    rows={3} placeholder="Əlavə qeydlər..." className={`${inputCls} resize-none`} disabled={isReadonly} />
                </div>
              </div>
            )}

            {/* ── TAB: Sənədlər ── */}
            {tab === 'docs' && (
              <div className="p-6 space-y-5">
                {/* Məcburi sənədlər */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={14} className="text-purple-500" />
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Məcburi sənədlər</p>
                    </div>
                    <span className={clsx(
                      'text-[10px] font-bold px-2 py-1 rounded-lg',
                      mandatoryComplete
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    )}>
                      {MANDATORY_DOC_TYPES.filter(t => uploadedTypes.includes(t) || (plan?.equipmentDocumentTypes || []).includes(t)).length}/{MANDATORY_DOC_TYPES.length}
                      {mandatoryComplete ? ' Tam' : ' Natamam'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {MANDATORY_DOC_TYPES.map((type) => {
                      const docLabel = DOC_TYPES.find((d) => d.value === type)?.label
                      const uploadedInPlan = uploadedTypes.includes(type)
                      const existsInEquipment = (plan?.equipmentDocumentTypes || []).includes(type)
                      const available = uploadedInPlan || existsInEquipment
                      return (
                        <div key={type} className={clsx(
                          'rounded-xl p-3 border text-center transition-all',
                          available
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50'
                            : 'bg-gray-50 dark:bg-gray-750 border-gray-200 dark:border-gray-600 border-dashed'
                        )}>
                          <CheckCircle size={20} className={clsx(
                            'mx-auto mb-2',
                            available ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'
                          )} />
                          <p className={clsx('text-[11px] font-medium leading-tight',
                            available ? 'text-green-700 dark:text-green-300' : 'text-gray-400')}>
                            {docLabel}
                          </p>
                          {existsInEquipment && !uploadedInPlan && (
                            <p className="text-[9px] text-green-500 mt-1 font-medium">texnikada var</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Təhlükəsizlik */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck size={14} className="text-purple-500" />
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Təhlükəsizlik avadanlıqları</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'hasFlashingLights', label: 'Sayrışan işıqlar' },
                      { key: 'hasFireExtinguisher', label: 'Yanğınsöndürən' },
                      { key: 'hasFirstAid', label: 'Apteçka' },
                    ].map(({ key, label }) => (
                      <label key={key} className={clsx(
                        'flex items-center gap-2.5 cursor-pointer rounded-xl border p-3 transition-all',
                        form[key]
                          ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800/50'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      )}>
                        <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)}
                          className="accent-green-600 w-4 h-4" disabled={isReadonly} />
                        <span className={clsx('text-sm', form[key] ? 'text-green-700 dark:text-green-300 font-medium' : 'text-gray-600 dark:text-gray-400')}>
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sənəd yüklə */}
                {!isReadonly && (
                  <div className="border border-dashed border-purple-200 dark:border-purple-700 rounded-xl p-4 bg-purple-50/30 dark:bg-purple-900/10">
                    <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-3">Sənəd yüklə</p>
                    <div className="grid grid-cols-5 gap-3 items-end">
                      <div className="col-span-2">
                        <label className={labelCls}>Sənəd tipi</label>
                        <select value={docForm.documentType} onChange={(e) => setDocForm((d) => ({ ...d, documentType: e.target.value }))} className={inputCls}>
                          {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className={labelCls}>Ad (opsional)</label>
                        <input type="text" value={docForm.documentName}
                          onChange={(e) => setDocForm((d) => ({ ...d, documentName: e.target.value }))}
                          placeholder="Avtomatik" className={inputCls} />
                      </div>
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors h-[38px]">
                        <Upload size={14} />
                        {uploading ? '...' : 'Yüklə'}
                      </button>
                    </div>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
                  </div>
                )}

                {/* Yüklənmiş sənədlər */}
                {plan?.documents?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Yüklənmiş sənədlər ({plan.documents.length})
                    </p>
                    <div className="space-y-1.5">
                      {plan.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-100 dark:border-gray-700 group hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
                          <FileText size={15} className="text-purple-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 dark:text-gray-200 truncate font-medium">{doc.documentName}</p>
                            <p className="text-[10px] text-gray-400">
                              {DOC_TYPES.find((d) => d.value === doc.documentType)?.label}
                              {doc.uploadedByName && ` · ${doc.uploadedByName}`}
                            </p>
                          </div>
                          <span className="text-[10px] text-gray-300 dark:text-gray-600 font-mono uppercase">{doc.fileType}</span>
                          <a href={coordinatorApi.getDocumentDownloadUrl(request.requestId, doc.id)}
                            target="_blank" rel="noreferrer"
                            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100">
                            <Download size={14} />
                          </a>
                          {!isReadonly && (
                            <button onClick={() => handleDeleteDoc(doc.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ═══ Sticky Summary + Footer ═══ */}
          <div className="shrink-0 border-t border-gray-100 dark:border-gray-700">
            {/* Mini finance summary — always visible */}
            <div className="px-6 py-2.5 bg-gray-50/80 dark:bg-gray-750/80 flex items-center gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Texnika:</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {plan?.equipmentName || '—'}
                </span>
              </div>
              <span className="text-gray-200 dark:text-gray-700">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Müddət:</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {autoDayCount > 0 ? `${autoDayCount} gün` : '—'}
                </span>
              </div>
              <span className="text-gray-200 dark:text-gray-700">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Ümumi:</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {totalAmount > 0 ? `${fmt(totalAmount)} AZN` : '—'}
                </span>
              </div>
              <span className="text-gray-200 dark:text-gray-700">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Xeyir:</span>
                <span className={clsx('font-bold', companyProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
                  {totalAmount > 0 ? `${fmt(companyProfit)} AZN` : '—'}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            {!isReadonly && (
              <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-800">
                <button onClick={handleSave} disabled={saving || submitting}
                  className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors">
                  {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={15} />}
                  Yadda saxla
                </button>
                {hasPermission('COORDINATOR', 'canSubmitOffer') && (
                  <button onClick={handleSubmit} disabled={saving || submitting}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors">
                    {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={15} />}
                    Layihə kimi göndər
                  </button>
                )}
                <div className="flex-1" />
                <button type="button" onClick={onClose}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  Bağla
                </button>
              </div>
            )}
          </div>
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
