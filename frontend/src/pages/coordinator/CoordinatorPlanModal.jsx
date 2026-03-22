import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Upload, Trash2, Download, FileText, CheckCircle, Search, Wrench, Building2, Phone, Mail, MapPin, User } from 'lucide-react'
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
const sectionCls = 'text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-2 pb-1 border-t border-gray-100 dark:border-gray-700 mt-1'

const DOC_TYPES = [
  { value: 'REGISTRATION_CERT', label: 'Qeydiyyat şəhadətnaməsi' },
  { value: 'THIRD_PARTY_INSPECTION', label: '3-cü tərəf texniki baxış sənədi' },
  { value: 'TECHNICAL_INSPECTION', label: 'Texniki baxış sənədi' },
  { value: 'OTHER', label: 'Digər' },
]
const MANDATORY_DOC_TYPES = ['REGISTRATION_CERT', 'THIRD_PARTY_INSPECTION', 'TECHNICAL_INSPECTION']

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
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Qarajdan texnika seç</h2>
            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} texnika</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-purple-500 hover:bg-purple-600 flex items-center justify-center transition-colors">
            <X size={14} className="text-white" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Ad, kod, növ, marka, qeydiyyat nömrəsi, sahibkar..." autoFocus
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {loading ? (
            <p className="py-10 text-center text-sm text-gray-400">Yüklənir...</p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">Texnika tapılmadı</p>
          ) : (
            filtered.map((eq) => (
              <button key={eq.id} onClick={() => handleSelect(eq)} disabled={selecting}
                className="w-full text-left p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all disabled:opacity-50 group">

                {/* Row 1: name + badges */}
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

                {/* Row 2: technical specs */}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">{eq.equipmentCode}</span>
                  <span>{eq.type}</span>
                  {(eq.brand || eq.model) && <span>{[eq.brand, eq.model].filter(Boolean).join(' ')}</span>}
                  {eq.manufactureYear && <span>{eq.manufactureYear} il</span>}
                  {eq.plateNumber && <span className="font-medium text-gray-700 dark:text-gray-300">🚗 {eq.plateNumber}</span>}
                  {eq.serialNumber && <span>S/N: {eq.serialNumber}</span>}
                  {eq.weightTon && <span>{eq.weightTon} ton</span>}
                  {eq.storageLocation && <span>📍 {eq.storageLocation}</span>}
                </div>

                {/* Row 3: owner contact info */}
                {eq.ownershipType === 'INVESTOR' && eq.ownerInvestorName && (
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg px-3 py-1.5 mb-2">
                    <span className="font-semibold">{eq.ownerInvestorName}</span>
                    {eq.ownerInvestorVoen && <span>VÖEN: {eq.ownerInvestorVoen}</span>}
                    {eq.ownerInvestorPhone && <span>📞 {eq.ownerInvestorPhone}</span>}
                  </div>
                )}
                {eq.ownershipType === 'CONTRACTOR' && eq.ownerContractorName && (
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-lg px-3 py-1.5 mb-2">
                    <span className="font-semibold">{eq.ownerContractorName}</span>
                    {eq.ownerContractorVoen && <span>VÖEN: {eq.ownerContractorVoen}</span>}
                    {eq.ownerContractorPhone && <span>📞 {eq.ownerContractorPhone}</span>}
                    {eq.ownerContractorContact && <span>Əlaqədar: {eq.ownerContractorContact}</span>}
                  </div>
                )}

                {/* Row 4: inspection & operational data */}
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
    contractorPayment: '',
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
            contractorPayment: p.contractorPayment ?? '',
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

  const eqPrice = parseFloat(form.equipmentPrice) || 0
  const transPrice = parseFloat(form.transportationPrice) || 0
  const contrPayment = parseFloat(form.contractorPayment) || 0
  const totalAmount = eqPrice + transPrice
  const companyProfit = totalAmount - contrPayment

  // Current equipment from plan or request
  const currentEq = plan?.equipmentId ? plan : null

  const isReadonly = request.requestStatus !== 'SENT_TO_COORDINATOR'

  const doSave = async () => {
    const payload = {
      operatorId: form.operatorId ? parseInt(form.operatorId) : null,
      equipmentPrice: parseFloat(form.equipmentPrice) || null,
      contractorPayment: parseFloat(form.contractorPayment) || null,
      transportationPrice: parseFloat(form.transportationPrice) || null,
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl relative flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                Koordinator Planı — {request.requestCode}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">{request.companyName} · {request.projectName}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-purple-500 hover:bg-purple-600 flex items-center justify-center transition-colors shrink-0">
              <X size={14} className="text-white" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-4 scrollbar-thin">

            {/* ─── Müştəri məlumatları ─── */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={14} className="text-blue-500 shrink-0" />
                <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Müştəri məlumatları
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{request.companyName}</p>
                {request.customerVoen && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">VÖEN: <span className="font-medium text-gray-700 dark:text-gray-300">{request.customerVoen}</span></p>
                )}
                {request.customerAddress && (
                  <div className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <MapPin size={12} className="shrink-0 mt-0.5" />
                    <span>{request.customerAddress}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 pt-2 border-t border-blue-100 dark:border-blue-800">
                  {(request.contactPerson || request.contactPhone) && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Əlaqə şəxsi</p>
                      {request.contactPerson && (
                        <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                          <User size={11} className="text-gray-400 shrink-0" />
                          {request.contactPerson}
                        </div>
                      )}
                      {request.contactPhone && (
                        <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                          <Phone size={11} className="text-gray-400 shrink-0" />
                          {request.contactPhone}
                        </div>
                      )}
                    </div>
                  )}
                  {(request.customerSupplierPerson || request.customerSupplierPhone) && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Təchizatçı</p>
                      {request.customerSupplierPerson && (
                        <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                          <User size={11} className="text-gray-400 shrink-0" />
                          {request.customerSupplierPerson}
                        </div>
                      )}
                      {request.customerSupplierPhone && (
                        <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                          <Phone size={11} className="text-gray-400 shrink-0" />
                          {request.customerSupplierPhone}
                        </div>
                      )}
                    </div>
                  )}
                  {(request.customerOfficeContactPerson || request.customerOfficeContactPhone) && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Ofis əlaqəsi</p>
                      {request.customerOfficeContactPerson && (
                        <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                          <User size={11} className="text-gray-400 shrink-0" />
                          {request.customerOfficeContactPerson}
                        </div>
                      )}
                      {request.customerOfficeContactPhone && (
                        <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                          <Phone size={11} className="text-gray-400 shrink-0" />
                          {request.customerOfficeContactPhone}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Texniki parametrlər (sorğudan) ─── */}
            {request.params?.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
                  Sorğunun texniki tələbləri
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {request.params.map((p, i) => (
                    <div key={i} className="flex items-baseline gap-1.5 text-sm">
                      <span className="text-gray-500 dark:text-gray-400 shrink-0">{p.paramKey}:</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{p.paramValue}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-2 pt-2 border-t border-amber-200 dark:border-amber-700 text-xs text-amber-700 dark:text-amber-400">
                  <span>{request.projectType === 'DAILY' ? 'Günlük' : request.projectType === 'MONTHLY' ? 'Aylıq' : '—'}{request.dayCount ? ` · ${request.dayCount} ${request.projectType === 'MONTHLY' ? 'ay' : 'gün'}` : ''}</span>
                  {request.transportationRequired && <span>Daşınma tələb olunur</span>}
                  <span>{request.region}</span>
                </div>
              </div>
            )}

            {/* ─── Texnika seçimi ─── */}
            <p className={sectionCls}>Texnika seçimi</p>
            {plan?.equipmentId ? (
              <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-4 py-3">
                <Wrench size={18} className="text-purple-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{plan.equipmentName}</p>
                  <p className="text-xs text-gray-400">{plan.equipmentCode}</p>
                  {plan.ownershipType && (
                    <p className={clsx('text-xs font-medium mt-0.5', OWNERSHIP_CLS[plan.ownershipType])}>
                      {OWNERSHIP_LABEL[plan.ownershipType]}
                      {plan.ownershipType === 'CONTRACTOR' && plan.contractorName ? ` — ${plan.contractorName}` : ''}
                    </p>
                  )}
                </div>
                {!isReadonly && (
                  <button onClick={() => setEqPicker(true)}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium px-3 py-1.5 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors shrink-0">
                    Dəyiş
                  </button>
                )}
              </div>
            ) : (
              !isReadonly ? (
                <button onClick={() => setEqPicker(true)}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-xl py-4 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                  <Wrench size={16} />
                  Qarajdan texnika seç
                </button>
              ) : (
                <p className="text-sm text-gray-400">Texnika seçilməyib</p>
              )
            )}

            {/* ─── Operator ─── */}
            <p className={sectionCls}>Operator</p>
            <div>
              <label className={labelCls}>Operator</label>
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
              {form.operatorId && (() => {
                const op = operators.find(o => String(o.id) === String(form.operatorId))
                if (!op) return null
                const DOC_TYPES = [
                  { key: 'DRIVING_LICENSE',    label: 'Sürücülük vəsiqəsi' },
                  { key: 'CRIMINAL_RECORD',    label: 'Məhkumluq arayışı' },
                  { key: 'HEALTH_CERTIFICATE', label: 'Sağlamlıq arayışı' },
                  { key: 'CERTIFICATE',        label: 'Sertifikat' },
                  { key: 'ID_CARD',            label: 'Şəxsiyyət vəsiqəsi' },
                  { key: 'POWER_OF_ATTORNEY',  label: 'Etibarnamə sənədi' },
                ]
                const uploaded = new Set(op.uploadedDocumentTypes || [])
                return (
                  <div className="mt-2 rounded-xl border border-purple-100 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-900/10 p-3 space-y-3">
                    {/* Əlaqə məlumatları */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {op.phone && (
                        <div>
                          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Telefon</p>
                          <p className="text-xs text-gray-700 dark:text-gray-200 font-medium">{op.phone}</p>
                        </div>
                      )}
                      {op.email && (
                        <div>
                          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">E-poçt</p>
                          <p className="text-xs text-gray-700 dark:text-gray-200 font-medium">{op.email}</p>
                        </div>
                      )}
                      {op.address && (
                        <div className="col-span-2">
                          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Ünvan</p>
                          <p className="text-xs text-gray-700 dark:text-gray-200 font-medium">{op.address}</p>
                        </div>
                      )}
                      {op.specialization && (
                        <div className="col-span-2">
                          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">İxtisas</p>
                          <p className="text-xs text-gray-700 dark:text-gray-200 font-medium">{op.specialization}</p>
                        </div>
                      )}
                    </div>
                    {/* Sənədlər */}
                    <div className="border-t border-purple-100 dark:border-purple-800/50 pt-2.5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Sənədlər</p>
                        <span className={clsx(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                          op.documentsComplete
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        )}>
                          {uploaded.size}/{DOC_TYPES.length} {op.documentsComplete ? '✓ Tam' : 'Natamam'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {DOC_TYPES.map(({ key, label }) => {
                          const doc = (op.documents || []).find(d => d.documentType === key)
                          return (
                            <div key={key} className="flex items-center gap-1.5">
                              {doc
                                ? <span className="w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center shrink-0"><svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/></svg></span>
                                : <span className="w-3.5 h-3.5 rounded-full bg-gray-200 dark:bg-gray-600 shrink-0" />
                              }
                              {doc
                                ? (
                                  <button
                                    type="button"
                                    onClick={() => operatorsApi.previewDocument(op.id, doc.id, doc.fileName)}
                                    className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline text-left truncate"
                                    title={doc.fileName}
                                  >
                                    {label}
                                  </button>
                                )
                                : <span className="text-[10px] text-gray-400">{label}</span>
                              }
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    {/* Qeyd */}
                    {op.notes && (
                      <div className="border-t border-purple-100 dark:border-purple-800/50 pt-2">
                        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Qeyd</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{op.notes}</p>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* ─── Maliyyə ─── */}
            <p className={sectionCls}>Maliyyə məlumatları</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Texnikanın qiyməti (AZN)</label>
                <input type="number" min="0" step="0.01" value={form.equipmentPrice}
                  onChange={(e) => set('equipmentPrice', e.target.value)}
                  placeholder="0.00" className={inputCls} disabled={isReadonly} />
              </div>
              {plan?.ownershipType === 'CONTRACTOR' && (
                <div>
                  <label className={labelCls}>Podratçıya veriləcək məbləğ (AZN)</label>
                  <input type="number" min="0" step="0.01" value={form.contractorPayment}
                    onChange={(e) => set('contractorPayment', e.target.value)}
                    placeholder="0.00" className={inputCls} disabled={isReadonly} />
                </div>
              )}
              {request.transportationRequired && (
                <div>
                  <label className={labelCls}>Daşınma qiyməti (AZN)</label>
                  <input type="number" min="0" step="0.01" value={form.transportationPrice}
                    onChange={(e) => set('transportationPrice', e.target.value)}
                    placeholder="0.00" className={inputCls} disabled={isReadonly} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                <p className="text-xs text-purple-500 mb-0.5">Ümumi məbləğ</p>
                <p className="text-base font-bold text-purple-700 dark:text-purple-300">{fmt(totalAmount)} AZN</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="text-xs text-green-500 mb-0.5">Şirkətə qalan xeyir</p>
                <p className={clsx('text-base font-bold', companyProfit >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-600')}>
                  {fmt(companyProfit)} AZN
                </p>
              </div>
            </div>

            {/* ─── Tarixlər ─── */}
            <p className={sectionCls}>Layihə tarixi</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Başlama tarixi</label>
                <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className={inputCls} disabled={isReadonly} />
              </div>
              <div>
                <label className={labelCls}>Bitmə tarixi</label>
                <input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className={inputCls} disabled={isReadonly} />
              </div>
            </div>

            {/* ─── Təhlükəsizlik ─── */}
            <p className={sectionCls}>Əlavə təhlükəsizlik avadanlıqları</p>
            <div className="flex flex-wrap gap-4">
              {[
                { key: 'hasFlashingLights', label: 'Sayrışan işıqlar' },
                { key: 'hasFireExtinguisher', label: 'Yanğınsöndürən balon' },
                { key: 'hasFirstAid', label: 'Apteçka' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)}
                    className="accent-purple-600 w-4 h-4" disabled={isReadonly} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>

            {/* ─── Sənədlər ─── */}
            <p className={sectionCls}>Məcburi sənədlər</p>
            <div className="space-y-1 mb-2">
              {MANDATORY_DOC_TYPES.map((type) => {
                const docLabel = DOC_TYPES.find((d) => d.value === type)?.label
                const uploaded = uploadedTypes.includes(type)
                return (
                  <div key={type} className={clsx('flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg',
                    uploaded ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                             : 'bg-gray-50 dark:bg-gray-750 text-gray-500')}>
                    <CheckCircle size={14} className={uploaded ? 'text-green-500' : 'text-gray-300'} />
                    {docLabel}
                  </div>
                )
              })}
            </div>

            {!isReadonly && (
              <div className="border border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Sənəd tipi</label>
                    <select value={docForm.documentType} onChange={(e) => setDocForm((d) => ({ ...d, documentType: e.target.value }))} className={inputCls}>
                      {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Sənəd adı (opsional)</label>
                    <input type="text" value={docForm.documentName}
                      onChange={(e) => setDocForm((d) => ({ ...d, documentName: e.target.value }))}
                      placeholder="Avtomatik" className={inputCls} />
                  </div>
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors disabled:opacity-50">
                  <Upload size={15} />
                  {uploading ? 'Yüklənir...' : 'Fayl seç və yüklə'}
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
              </div>
            )}

            {plan?.documents?.length > 0 && (
              <div className="space-y-2">
                {plan.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
                    <FileText size={15} className="text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-200 truncate">{doc.documentName}</p>
                      <p className="text-xs text-gray-400">{DOC_TYPES.find((d) => d.value === doc.documentType)?.label} · {doc.fileType}</p>
                    </div>
                    <a href={coordinatorApi.getDocumentDownloadUrl(request.requestId, doc.id)}
                      target="_blank" rel="noreferrer"
                      className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 transition-colors">
                      <Download size={14} />
                    </a>
                    {!isReadonly && (
                      <button onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ─── Qeyd ─── */}
            <div>
              <label className={labelCls}>Qeyd</label>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
                rows={2} placeholder="Əlavə qeydlər..." className={`${inputCls} resize-none`} disabled={isReadonly} />
            </div>
          </div>

          {/* Footer */}
          {!isReadonly && (
            <div className="flex gap-3 p-4 border-t border-gray-100 dark:border-gray-700 shrink-0">
              <button onClick={handleSave} disabled={saving || submitting}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors">
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Yadda saxla
              </button>
              {hasPermission('COORDINATOR', 'canSubmitOffer') && (
                <button onClick={handleSubmit} disabled={saving || submitting}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors">
                  {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Layihə kimi göndər
                </button>
              )}
              <button type="button" onClick={onClose}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                Ləğv et
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
