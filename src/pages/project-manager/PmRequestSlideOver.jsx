import { useState, useEffect, useMemo, useRef } from 'react'
import {
  X, Info, FileText, Building2, MapPin, Calendar, ClipboardCheck,
  CheckCircle, XCircle, AlertTriangle, ListChecks, Plus, Save, Send,
  Trash2, Phone, User, Handshake, Trophy, DollarSign, Truck, Upload, Download, CornerUpLeft,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { projectManagerApi } from '../../api/projectManager'
import { garageApi } from '../../api/garage'
import { contractorsApi } from '../../api/contractors'
import { investorsApi } from '../../api/investors'
import { STATUS_CFG, PROJECT_TYPES, fmtDate, dash } from '../../constants/requests'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import ReasonPromptModal from '../../components/common/ReasonPromptModal'
import { useAuthStore } from '../../store/authStore'
import EquipmentCard from '../../components/common/EquipmentCard'
import EquipmentDetailsModal from '../../components/common/EquipmentDetailsModal'

const TERMINAL_STATUSES = ['REJECTED', 'PM_APPROVED', 'ACCOUNTING_DOCS_CHECK', 'EXECUTION_READY',
  'OPERATOR_ASSIGNED', 'EQUIPMENT_DISPATCHED', 'DELIVERED']

const PM_EDITABLE_STATUSES = ['PM_REVIEW', 'PM_SHORTLIST_READY']

// Razılaşma tabının göründüyü statuslar (koordinator təklifindən sonra)
const AGREEMENT_VISIBLE_STATUSES = ['COORDINATOR_PROPOSED', 'PM_PRICE_NEGOTIATION', 'PM_APPROVED',
  'ACCOUNTING_DOCS_CHECK', 'EXECUTION_READY', 'OPERATOR_ASSIGNED', 'EQUIPMENT_DISPATCHED', 'DELIVERED']

const PARTY_OPTIONS = [
  { value: 'COMPANY', label: 'Şirkət' },
  { value: 'CONTRACTOR', label: 'Podratçı' },
  { value: 'INVESTOR', label: 'İnvestor' },
]

// Unified dropdown value helpers — COMPANY | "C:<id>" | "I:<id>"
const encodeParty = (row) => {
  if (!row.partyType) return ''
  if (row.partyType === 'COMPANY') return 'COMPANY'
  if (row.partyType === 'CONTRACTOR' && row.contractorId) return `C:${row.contractorId}`
  if (row.partyType === 'INVESTOR' && row.investorId) return `I:${row.investorId}`
  return ''
}
const decodeParty = (val) => {
  if (val === 'COMPANY') return { partyType: 'COMPANY', contractorId: null, investorId: null }
  if (val?.startsWith('C:')) return { partyType: 'CONTRACTOR', contractorId: Number(val.slice(2)), investorId: null }
  if (val?.startsWith('I:')) return { partyType: 'INVESTOR', investorId: Number(val.slice(2)), contractorId: null }
  return { partyType: null, contractorId: null, investorId: null }
}

const TABS = [
  { id: 'info', label: 'Məlumat', icon: Info },
  { id: 'shortlist', label: 'Shortlist', icon: ListChecks },
  { id: 'agreement', label: 'Razılaşma', icon: Handshake },
  { id: 'params', label: 'Parametrlər', icon: FileText },
]

function InfoField({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span className="ces-sec-label" style={{ fontSize: 10 }}>{label}</span>
      <span
        className={mono ? 'mono' : undefined}
        style={{ fontSize: 13.5, color: 'var(--ces-ink)', fontWeight: 500 }}
      >
        {value || <span style={{ color: 'var(--ces-mute2)' }}>—</span>}
      </span>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 36 }}>
      <span style={{
        width: 22, height: 22,
        border: '2px solid var(--ces-line)',
        borderTopColor: 'var(--ces-gold)',
        borderRadius: 999,
        animation: 'ces-spin .8s linear infinite',
      }} />
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500'
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'

/* ═════════════════════════ Customer office contact ═════════════════════════ */
function CustomerContactSection({ data, editable, requestId, onSaved }) {
  const [name, setName] = useState(data?.customerOfficeContact || '')
  const [phone, setPhone] = useState(data?.customerOfficePhone || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(data?.customerOfficeContact || '')
    setPhone(data?.customerOfficePhone || '')
  }, [data?.customerOfficeContact, data?.customerOfficePhone])

  const dirty = name !== (data?.customerOfficeContact || '') || phone !== (data?.customerOfficePhone || '')

  const handleSave = async () => {
    setSaving(true)
    try {
      await projectManagerApi.saveCustomerContact(requestId, {
        customerOfficeContact: name.trim() || null,
        customerOfficePhone: phone.trim() || null,
      })
      toast.success('Əlaqə məlumatı saxlandı')
      onSaved?.()
    } catch {} finally {
      setSaving(false)
    }
  }

  if (!editable) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <InfoField label="Sifarişçi ofis əlaqəsi" value={dash(data?.customerOfficeContact)} />
        <InfoField label="Ofis telefonu" value={dash(data?.customerOfficePhone)} mono />
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className={labelCls}>Sifarişçi ofis əlaqə şəxsi</label>
          <div className="relative">
            <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ad Soyad"
              className={`${inputCls} pl-7`}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Ofis telefonu</label>
          <div className="relative">
            <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+994 ..."
              className={`${inputCls} pl-7 mono`}
            />
          </div>
        </div>
      </div>
      {dirty && (
        <div className="flex justify-end mt-2.5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
          >
            <Save size={12} />
            {saving ? 'Saxlanılır...' : 'Saxla'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ═════════════════════════ Shortlist tab ═════════════════════════ */
function ShortlistTab({ data, editable, requestId, onSaved }) {
  // Reference data
  const [contractors, setContractors] = useState([])
  const [investors, setInvestors] = useState([])
  const [equipments, setEquipments] = useState([])
  const [refLoading, setRefLoading] = useState(true)

  // Editable rows state (local; saved as bulk POST)
  const [rows, setRows] = useState([])
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [detailsEqId, setDetailsEqId] = useState(null)

  useEffect(() => {
    setRefLoading(true)
    Promise.all([
      contractorsApi.getAll().catch(() => ({ data: { data: [] } })),
      investorsApi.getAll().catch(() => ({ data: { data: [] } })),
      garageApi.getAll().catch(() => ({ data: { data: [] } })),
    ]).then(([cRes, iRes, eRes]) => {
      setContractors(cRes.data.data || cRes.data || [])
      setInvestors(iRes.data.data || iRes.data || [])
      setEquipments(eRes.data.data || eRes.data || [])
    }).finally(() => setRefLoading(false))
  }, [])

  useEffect(() => {
    // shortlistItems → editable rows (tempId for new rows)
    const items = data?.shortlistItems || []
    setRows(items.map((it) => ({
      id: it.id,
      partyType: it.partyType,
      contractorId: it.contractorId,
      investorId: it.investorId,
      equipmentId: it.equipmentId,
      notes: it.notes || '',
    })))
  }, [data?.shortlistItems])

  const investorVoenById = useMemo(() => {
    const m = new Map()
    investors.forEach((i) => m.set(i.id, i.voen))
    return m
  }, [investors])

  const filterEquipmentsForRow = (row) => {
    if (!row.partyType) return []
    if (row.partyType === 'COMPANY') {
      return equipments.filter((e) => e.ownershipType === 'COMPANY')
    }
    if (row.partyType === 'CONTRACTOR') {
      if (!row.contractorId) return []
      return equipments.filter((e) =>
        e.ownershipType === 'CONTRACTOR' && e.ownerContractorId === row.contractorId
      )
    }
    if (row.partyType === 'INVESTOR') {
      if (!row.investorId) return []
      const voen = investorVoenById.get(row.investorId)
      if (!voen) return []
      return equipments.filter((e) =>
        e.ownershipType === 'INVESTOR' && e.ownerInvestorVoen === voen
      )
    }
    return []
  }

  const addRow = () => {
    setRows((r) => [...r, {
      id: null,
      partyType: null,
      contractorId: null,
      investorId: null,
      equipmentId: null,
      notes: '',
    }])
  }

  const updateRow = (idx, patch) => {
    setRows((r) => r.map((row, i) => {
      if (i !== idx) return row
      const next = { ...row, ...patch }
      // partyType/contractor/investor dəyişəndə equipment-i sıfırla
      const partyChanged = patch.partyType !== undefined && patch.partyType !== row.partyType
      const contractorChanged = patch.contractorId !== undefined && patch.contractorId !== row.contractorId
      const investorChanged = patch.investorId !== undefined && patch.investorId !== row.investorId
      if (partyChanged || contractorChanged || investorChanged) {
        next.equipmentId = null
      }
      return next
    }))
  }

  const removeRow = async (idx) => {
    const row = rows[idx]
    if (row.id) {
      // Mevcut DB satırı — soft-delete et
      setDeletingId(row.id)
      try {
        await projectManagerApi.deleteShortlistItem(requestId, row.id)
        toast.success('Sətir silindi')
        onSaved?.()
      } catch {
        setDeletingId(null)
        return
      } finally {
        setDeletingId(null)
      }
    }
    setRows((r) => r.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    // Validation
    for (const [i, row] of rows.entries()) {
      if (!row.partyType) return toast.error(`Sətir ${i + 1}: Mənbə seçilməyib`)
      if (row.partyType === 'CONTRACTOR' && !row.contractorId) return toast.error(`Sətir ${i + 1}: Podratçı seçilməyib`)
      if (row.partyType === 'INVESTOR' && !row.investorId) return toast.error(`Sətir ${i + 1}: Investor seçilməyib`)
      if (!row.equipmentId) return toast.error(`Sətir ${i + 1}: Texnika seçilməyib`)
    }

    setSaving(true)
    try {
      await projectManagerApi.saveShortlist(requestId, {
        notes: null,
        items: rows.map((r) => ({
          id: r.id,
          partyType: r.partyType,
          contractorId: r.partyType === 'CONTRACTOR' ? r.contractorId : null,
          investorId: r.partyType === 'INVESTOR' ? r.investorId : null,
          equipmentId: r.equipmentId,
          negotiatedPrice: null,
          rank: null,
          notes: r.notes || null,
        })),
      })
      toast.success('Shortlist saxlandı')
      onSaved?.()
    } catch {} finally {
      setSaving(false)
    }
  }

  if (refLoading) return <Spinner />

  if (!editable) {
    // Read-only görünüm
    if (!rows.length) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'var(--ces-graphite-50)', color: 'var(--ces-mute2)',
            display: 'inline-grid', placeItems: 'center', marginBottom: 12,
          }}>
            <ListChecks size={26} />
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--ces-muted)' }}>Shortlist boşdur</p>
        </div>
      )
    }
    return (
      <>
        <div className="flex flex-col gap-2.5">
          {rows.map((row, i) => {
            const eq = equipments.find((e) => e.id === row.equipmentId)
            const partyLabel = PARTY_OPTIONS.find((p) => p.value === row.partyType)?.label || row.partyType
            const partyName = row.partyType === 'CONTRACTOR'
              ? contractors.find((c) => c.id === row.contractorId)?.companyName
              : row.partyType === 'INVESTOR'
                ? investors.find((iv) => iv.id === row.investorId)?.companyName
                : 'Şirkət'
            return (
              <div key={row.id || i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono text-amber-600 dark:text-amber-400">#{i + 1}</span>
                  <span className="text-xs text-gray-500">{partyLabel}</span>
                </div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{partyName}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-gray-500">{eq?.name || '—'} ({eq?.equipmentCode || '—'})</p>
                  {eq?.id && (
                    <button
                      onClick={() => setDetailsEqId(eq.id)}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors hover:bg-amber-100 text-amber-700"
                    >
                      Haqqında
                    </button>
                  )}
                </div>
                {row.notes && <p className="text-xs text-gray-400 mt-1">{row.notes}</p>}
              </div>
            )
          })}
        </div>
        {detailsEqId && (
          <EquipmentDetailsModal
            equipmentId={detailsEqId}
            onClose={() => setDetailsEqId(null)}
          />
        )}
      </>
    )
  }

  // Editable view
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, idx) => {
        const filteredEquipments = filterEquipmentsForRow(row)
        return (
          <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Sətir #{idx + 1}</span>
              <button
                onClick={() => removeRow(idx)}
                disabled={deletingId === row.id}
                className="text-xs text-red-500 hover:text-red-600 inline-flex items-center gap-1 disabled:opacity-50"
              >
                <Trash2 size={12} />
                Sil
              </button>
            </div>

            <div className="mb-2">
              <label className={labelCls}>Mənbə</label>
              <select
                value={encodeParty(row)}
                onChange={(e) => updateRow(idx, decodeParty(e.target.value))}
                className={inputCls}
              >
                <option value="">— Mənbə seç —</option>
                <option value="COMPANY">Şirkət</option>
                {contractors.length > 0 && (
                  <optgroup label="Podratçılar">
                    {contractors.map((c) => (
                      <option key={`C:${c.id}`} value={`C:${c.id}`}>{c.companyName}</option>
                    ))}
                  </optgroup>
                )}
                {investors.length > 0 && (
                  <optgroup label="İnvestorlar">
                    {investors.map((iv) => (
                      <option key={`I:${iv.id}`} value={`I:${iv.id}`}>{iv.companyName}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="mb-2">
              <label className={labelCls}>
                Texnika
                {row.partyType && filteredEquipments.length > 0 && (
                  <span className="ml-2 text-[10px] text-gray-400 font-normal">
                    ({filteredEquipments.length} ədəd mövcuddur)
                  </span>
                )}
              </label>
              {!row.partyType ? (
                <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-600 px-3 py-4 text-center text-xs text-gray-400">
                  Əvvəlcə mənbə seçin
                </div>
              ) : filteredEquipments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-600 px-3 py-4 text-center text-xs text-gray-400">
                  {row.partyType === 'COMPANY' ? 'Şirkət' : (row.partyType === 'CONTRACTOR' ? 'Bu podratçı' : 'Bu investor')}da texnika yoxdur
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredEquipments.map((eq) => (
                    <EquipmentCard
                      key={eq.id}
                      eq={eq}
                      selected={row.equipmentId === eq.id}
                      onSelect={() => updateRow(idx, { equipmentId: eq.id })}
                      onShowDetails={() => setDetailsEqId(eq.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={labelCls}>Qeyd</label>
              <input
                value={row.notes}
                onChange={(e) => updateRow(idx, { notes: e.target.value })}
                placeholder="Opsional qeyd..."
                className={inputCls}
              />
            </div>
          </div>
        )
      })}

      <button
        onClick={addRow}
        className="border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-amber-400 dark:hover:border-amber-600 text-gray-500 hover:text-amber-600 rounded-lg py-3 inline-flex items-center justify-center gap-1.5 text-sm font-medium transition-colors"
      >
        <Plus size={14} />
        Yeni sətr əlavə et
      </button>

      {rows.length > 0 && (
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
          >
            <Save size={14} />
            {saving ? 'Saxlanılır...' : 'Shortlist saxla'}
          </button>
        </div>
      )}

      {detailsEqId && (
        <EquipmentDetailsModal
          equipmentId={detailsEqId}
          onClose={() => setDetailsEqId(null)}
        />
      )}
    </div>
  )
}

/* ═════════════════════════ Document upload section ═════════════════════════ */
function PmDocumentSection({ data, requestId, editable, canDelete, onSaved }) {
  const contractRef = useRef(null)
  const protocolRef = useRef(null)
  const [uploading, setUploading] = useState(null) // 'CONTRACT' | 'PRICE_PROTOCOL' | null

  const contractDoc = (data?.documents || []).find((d) => d.docType === 'CONTRACT')
  const protocolDoc = (data?.documents || []).find((d) => d.docType === 'PRICE_PROTOCOL')

  const handleUpload = async (type, file) => {
    if (!file) return
    setUploading(type)
    try {
      if (type === 'CONTRACT') {
        await projectManagerApi.uploadContract(requestId, file)
      } else {
        await projectManagerApi.uploadPriceProtocol(requestId, file)
      }
      toast.success(type === 'CONTRACT' ? 'Müqavilə yükləndi' : 'Protokol yükləndi')
      onSaved?.()
    } catch {} finally {
      setUploading(null)
    }
  }

  const handleDelete = async (doc) => {
    if (!confirm(`"${doc.fileName}" silinsin?`)) return
    try {
      await projectManagerApi.deleteDocument(requestId, doc.id)
      toast.success('Sənəd silindi')
      onSaved?.()
    } catch {}
  }

  const renderDocBlock = (label, type, doc, ref) => (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
        {doc
          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-green-50 text-green-700 border-green-200"><CheckCircle size={10} /> Yükləndi</span>
          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-gray-50 text-gray-500 border-gray-200">Yoxdur</span>}
      </div>
      {doc ? (
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 rounded px-2.5 py-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={12} className="text-amber-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{doc.fileName}</p>
              <p className="text-[10px] text-gray-400 truncate">
                {doc.uploadedByName || '—'}
                {doc.uploadedAt && ` · ${new Date(doc.uploadedAt).toLocaleString('az-AZ')}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={projectManagerApi.getDocumentDownloadUrl(requestId, doc.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
              title="Yüklə"
            >
              <Download size={12} />
            </a>
            {editable && canDelete && (
              <button
                onClick={() => handleDelete(doc)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Sil"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-gray-400 mb-2">Hələ yüklənməyib</p>
      )}
      {editable && (
        <>
          <input
            ref={ref}
            type="file"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleUpload(type, e.target.files[0])
                e.target.value = ''
              }
            }}
          />
          <button
            onClick={() => ref.current?.click()}
            disabled={uploading === type}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-dashed border-amber-300 hover:border-amber-500 hover:bg-amber-50 text-amber-700 disabled:opacity-50 transition-colors"
          >
            <Upload size={11} />
            {uploading === type ? 'Yüklənir...' : (doc ? 'Yenidən yüklə' : 'Yüklə')}
          </button>
        </>
      )}
    </div>
  )

  return (
    <div>
      <p className="ces-sec-label mb-2 inline-flex items-center gap-1.5">
        <FileText size={11} /> Sənədlər
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {renderDocBlock('Müqavilə', 'CONTRACT', contractDoc, contractRef)}
        {renderDocBlock('Qiymət razılaşma protokolu', 'PRICE_PROTOCOL', protocolDoc, protocolRef)}
      </div>
    </div>
  )
}

/* ═════════════════════════ Agreement tab — Mərhələ B ═════════════════════════ */
function AgreementTab({ data, requestId, editable, canDeleteDoc, canApproveByPm, onSaved }) {
  const offer = data?.coordinatorOffer
  const [agreedEquipmentPrice, setAgreedEquipmentPrice] = useState('')
  const [agreedTransportPrice, setAgreedTransportPrice] = useState('')
  const [agreementNote, setAgreementNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)

  const handleApprove = async () => {
    setApproving(true)
    try {
      await projectManagerApi.approve(requestId)
      toast.success('Sorğu təsdiqləndi — Layihə yaradıldı və mühasibatlığa göndərildi')
      onSaved?.()
    } catch (err) {
      if (err?.isPending) onSaved?.()
    } finally {
      setApproving(false)
    }
  }

  const isPriceNegotiation = data?.status === 'PM_PRICE_NEGOTIATION'
  const agreementSaved = data?.agreedTotalPrice != null
  const showApproveButton = isPriceNegotiation && agreementSaved

  useEffect(() => {
    setAgreedEquipmentPrice(data?.agreedEquipmentPrice ?? '')
    setAgreedTransportPrice(data?.agreedTransportPrice ?? '')
    setAgreementNote('')
  }, [data?.agreedEquipmentPrice, data?.agreedTransportPrice])

  const eqNum = agreedEquipmentPrice !== '' ? Number(agreedEquipmentPrice) : 0
  const trNum = agreedTransportPrice !== '' ? Number(agreedTransportPrice) : 0
  // Razılaşdırılmış qiymət per-unit (gün/ay başına). Cəm = vahid × dövr + birdəfəlik daşınma
  const agreedUnitLabel = data?.projectType === 'MONTHLY' ? 'ay' : 'gün'
  const agreedUnits = data?.dayCount && data.dayCount > 0 ? data.dayCount : 1
  const eqValid = Number.isFinite(eqNum) ? eqNum : 0
  const trValid = Number.isFinite(trNum) ? trNum : 0
  const computedTotal = eqValid * agreedUnits + trValid

  const handleSave = async () => {
    if (agreedEquipmentPrice === '' || Number(agreedEquipmentPrice) <= 0) {
      return toast.error('Texnika qiyməti daxil edilməlidir')
    }
    setSaving(true)
    try {
      await projectManagerApi.saveCustomerAgreement(requestId, {
        agreedEquipmentPrice: Number(agreedEquipmentPrice),
        agreedTransportPrice: agreedTransportPrice !== '' ? Number(agreedTransportPrice) : null,
        agreedTotalPrice: computedTotal,
        agreementNote: agreementNote.trim() || null,
      })
      toast.success('Razılaşma saxlandı')
      onSaved?.()
    } catch {} finally {
      setSaving(false)
    }
  }

  if (!offer) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 24px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'var(--ces-graphite-50)', color: 'var(--ces-mute2)',
          display: 'inline-grid', placeItems: 'center', marginBottom: 12,
        }}>
          <Handshake size={26} />
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--ces-muted)' }}>Koordinatordan təklif gözlənilir</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Koordinator təklifi (read-only) */}
      <div>
        <p className="ces-sec-label mb-2 inline-flex items-center gap-1.5">
          <Trophy size={11} /> Koordinator təklifi
        </p>
        <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10 p-3.5">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <InfoField label="Qalib mənbə" value={offer.winnerPartyName} />
            <InfoField
              label="Tip"
              value={offer.winnerPartyType === 'CONTRACTOR' ? 'Podratçı' : offer.winnerPartyType === 'INVESTOR' ? 'İnvestor' : 'Şirkət'}
            />
            <InfoField label="Texnika" value={offer.winnerEquipmentName} />
            <InfoField label="Texnika kodu" value={offer.winnerEquipmentCode} mono />
          </div>

          {/* Maliyyə xülasəsi: ödəyəcəyimiz / sifarişçiyə təklif / xeyir */}
          {(() => {
            const unitLabel = offer.projectType === 'MONTHLY' ? 'ay' : 'gün'
            const units = offer.dayCount && offer.dayCount > 0 ? offer.dayCount : 1
            const eqCostUnit = Number(offer.equipmentPrice || 0)
            const eqRevenueUnit = Number(offer.customerEquipmentPrice || 0)
            const transport = Number(offer.transportationPrice || 0)
            const fmtN = (v) => Number(v || 0).toLocaleString('az-AZ', { minimumFractionDigits: 2 })

            return (
              <div className="border-t border-purple-200 dark:border-purple-800 pt-3 space-y-2.5">
                {/* Bizim ödəyəcəyimiz (şirkət texnikası olduqda fərqli göstər) */}
                {offer.winnerPartyType === 'COMPANY' ? (
                  <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wide font-bold text-blue-700 dark:text-blue-400">
                        Şirkət texnikası — ödəniş yoxdur
                      </span>
                      <span className="text-sm font-bold mono text-blue-700 dark:text-blue-400">
                        0,00 ₼
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 rounded-lg px-3 py-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wide font-bold text-red-700 dark:text-red-400">
                        Bizim ödəyəcəyimiz
                      </span>
                      <span className="text-sm font-bold mono text-red-700 dark:text-red-400">
                        {fmtN(eqCostUnit)} ₼/{unitLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-red-600/80 dark:text-red-400/80">
                      <span>Cəm ({units} {unitLabel})</span>
                      <span className="mono font-semibold">{fmtN(eqCostUnit * units)} ₼</span>
                    </div>
                  </div>
                )}

            {/* Sifarişçiyə təklif */}
            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900 rounded-lg px-3 py-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wide font-bold text-emerald-700 dark:text-emerald-400">
                  Sifarişçiyə təklif — texnika
                </span>
                <span className="text-sm font-bold mono text-emerald-700 dark:text-emerald-400">
                  {fmtN(eqRevenueUnit)} ₼/{unitLabel}
                </span>
              </div>
              {transport > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-600 dark:text-emerald-500">Daşınma (birdəfəlik)</span>
                  <span className="font-semibold mono text-emerald-700 dark:text-emerald-400">
                    {fmtN(transport)} ₼
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-emerald-200 dark:border-emerald-800 pt-1.5">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  Cəm ({units} {unitLabel}{transport > 0 ? ' + daşınma' : ''})
                </span>
                <span className="text-sm font-bold mono text-emerald-700 dark:text-emerald-400">
                  {fmtN(eqRevenueUnit * units + transport)} ₼
                </span>
              </div>
            </div>

            {/* Şirkət xeyri — per-unit + transport formatında */}
            {offer.companyProfit != null && (
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wide font-bold text-amber-700 dark:text-amber-400">
                    Cəm xeyir
                  </span>
                  <span className={clsx(
                    'text-sm font-bold mono',
                    (eqRevenueUnit - eqCostUnit) >= 0 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400',
                  )}>
                    {fmtN(eqRevenueUnit - eqCostUnit)}/{unitLabel}
                    {transport > 0 && ` + ${fmtN(transport)} ₼`}
                  </span>
                </div>
              </div>
            )}
              </div>
            )
          })()}

          {offer.notes && (
            <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
              <p className="text-[10px] text-purple-700 dark:text-purple-300 uppercase tracking-wide font-bold mb-1">Koordinator qeydi</p>
              <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{offer.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sifarişçi ilə razılaşma */}
      <div>
        <p className="ces-sec-label mb-2 inline-flex items-center gap-1.5">
          <Handshake size={11} /> Sifarişçi ilə razılaşma
        </p>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3.5">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={labelCls}>
                <DollarSign size={10} className="inline mr-0.5" />
                Razılaşdırılmış texnika qiyməti/{agreedUnitLabel} (₼)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={agreedEquipmentPrice}
                onChange={(e) => setAgreedEquipmentPrice(e.target.value)}
                placeholder={offer.customerEquipmentPrice != null ? String(offer.customerEquipmentPrice) : '0.00'}
                disabled={!editable}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                <Truck size={10} className="inline mr-0.5" />
                Daşınma qiyməti — birdəfəlik (₼)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={agreedTransportPrice}
                onChange={(e) => setAgreedTransportPrice(e.target.value)}
                placeholder={offer.transportationPrice != null ? String(offer.transportationPrice) : '0.00'}
                disabled={!editable}
                className={inputCls}
              />
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Razılaşdırılmış məbləğ</span>
            <span className="text-sm font-bold mono text-amber-700 dark:text-amber-400">
              {eqValid.toLocaleString('az-AZ', { minimumFractionDigits: 2 })}/{agreedUnitLabel}
              {trValid > 0 && ` + ${trValid.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼`}
            </span>
          </div>

          {editable && (
            <>
              <label className={labelCls}>Razılaşma qeydi (opsional)</label>
              <textarea
                value={agreementNote}
                onChange={(e) => setAgreementNote(e.target.value)}
                placeholder="Sifarişçi ilə razılaşma detalları, şərtlər..."
                rows={3}
                className={`${inputCls} resize-none mb-3`}
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                >
                  <Save size={14} />
                  {saving ? 'Saxlanılır...' : 'Razılaşmanı saxla'}
                </button>
              </div>
            </>
          )}

          {/* Saved agreement note display (read-only) */}
          {!editable && data?.agreedTotalPrice != null && (
            <div className="text-[11px] text-gray-500 dark:text-gray-400 italic">
              Razılaşma təsdiqlənib
            </div>
          )}
        </div>
      </div>

      {/* Sənədlər — razılaşma sonrası yüklənə bilər */}
      {(editable || (data?.documents && data.documents.length > 0)) && (
        <PmDocumentSection
          data={data}
          requestId={requestId}
          editable={editable}
          canDelete={canDeleteDoc}
          onSaved={onSaved}
        />
      )}

      {/* Inline təsdiq düyməsi — PM_PRICE_NEGOTIATION + razılaşma saxlanılıb */}
      {showApproveButton && (
        <div className="rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-bold text-green-800 dark:text-green-300 inline-flex items-center gap-1.5">
                <CheckCircle size={14} /> Mühasibatlığa göndərməyə hazır
              </p>
              <p className="text-xs text-green-700/80 dark:text-green-400/80 mt-0.5">
                Sifarişçi ilə razılaşma təsdiqləndi. Təsdiqlə düyməsini basın — layihə yaranacaq və sənədlər mühasibatlığa göndəriləcək.
              </p>
            </div>
          </div>
          {canApproveByPm ? (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="w-full px-4 py-2.5 text-sm font-bold rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} />
              {approving ? 'Təsdiqlənir...' : 'Təsdiqlə və mühasibatlığa göndər'}
            </button>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-400 inline-flex items-center gap-2">
              <AlertTriangle size={13} />
              <span>Təsdiq icazəniz yoxdur. Roller bölməsindən "PM təsdiqi" icazəsini açın.</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ═════════════════════════ Main slide-over ═════════════════════════ */
export default function PmRequestSlideOver({ requestId, onClose, onChanged }) {
  useEscapeKey(onClose)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canPut = hasPermission('PROJECT_MANAGER', 'canPut')
  const canPost = hasPermission('PROJECT_MANAGER', 'canPost')

  const [tab, setTab] = useState('info')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [sendBackOpen, setSendBackOpen] = useState(false)

  const refresh = () => {
    if (!requestId) return
    setLoading(true)
    projectManagerApi.getRequest(requestId)
      .then((res) => setData(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [requestId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Aktiv tab status dəyişikliyindən sonra gizlənsə, info tab'ına qayıt
  useEffect(() => {
    if (!data) return
    if (tab === 'shortlist' && !PM_EDITABLE_STATUSES.includes(data.status)) {
      setTab(AGREEMENT_VISIBLE_STATUSES.includes(data.status) ? 'agreement' : 'info')
    }
    if (tab === 'agreement' && !AGREEMENT_VISIBLE_STATUSES.includes(data.status)) {
      setTab('info')
    }
  }, [data?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept = async () => {
    setActionLoading(true)
    try {
      await projectManagerApi.accept(requestId)
      toast.success('Sorğu qəbul edildi')
      refresh()
      onChanged?.()
    } catch {} finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Səbəb daxil edin')
      return
    }
    setActionLoading(true)
    try {
      await projectManagerApi.reject(requestId, rejectReason.trim())
      toast.success('Sorğu rədd edildi')
      setRejectOpen(false)
      setRejectReason('')
      refresh()
      onChanged?.()
    } catch {} finally {
      setActionLoading(false)
    }
  }

  const handleSendToCoordinator = async () => {
    setActionLoading(true)
    try {
      await projectManagerApi.sendToCoordinator(requestId)
      toast.success('Koordinatora göndərildi')
      refresh()
      onChanged?.()
    } catch {} finally {
      setActionLoading(false)
    }
  }

  const handleSendBackToCoordinator = async (reason) => {
    setActionLoading(true)
    try {
      await projectManagerApi.sendBackToCoordinator(requestId, reason)
      toast.success('Koordinatora geri qaytarıldı')
      setSendBackOpen(false)
      refresh()
      onChanged?.()
    } catch { /* xəta interceptor-də göstərilir */ } finally {
      setActionLoading(false)
    }
  }

  if (!requestId) return null

  const status = data ? (STATUS_CFG[data.status] || STATUS_CFG.PENDING) : null
  const projectType = data ? PROJECT_TYPES.find((t) => t.value === data.projectType) : null
  const code = data?.requestCode || (data?.requestId ? `REQ-${String(data.requestId).padStart(4, '0')}` : '...')

  const canApproveByPm = hasPermission('PROJECT_MANAGER', 'canApproveByPm')

  const editable = data && PM_EDITABLE_STATUSES.includes(data.status) && canPut
  const editableShortlist = editable && canPost
  const hasShortlistItems = (data?.shortlistItems || []).length > 0
  const editableAgreement = canPut && data && ['COORDINATOR_PROPOSED', 'PM_PRICE_NEGOTIATION'].includes(data.status)
  const showAgreementTab = data && AGREEMENT_VISIBLE_STATUSES.includes(data.status)
  // Shortlist tab yalnız PM mərhələsində görünür — koordinator alandan sonra gizlənir
  const showShortlistTab = data && PM_EDITABLE_STATUSES.includes(data.status)

  const canAccept = canPut && data?.status === 'PENDING'
  const canReject = canPut && data && !TERMINAL_STATUSES.includes(data.status)
  const canSendToCoord = canPut && data && PM_EDITABLE_STATUSES.includes(data.status) && hasShortlistItems
  const canApprove = canApproveByPm && data?.status === 'PM_PRICE_NEGOTIATION' && data?.agreedTotalPrice != null
  const canSendBack = canPut && data?.status === 'PM_PRICE_NEGOTIATION'
  const showFooter = canAccept || canReject || canSendToCoord || canApprove || canSendBack

  const handleApprove = async () => {
    setActionLoading(true)
    try {
      await projectManagerApi.approve(requestId)
      toast.success('Sorğu təsdiqləndi — Layihə yaradıldı və mühasibatlığa göndərildi')
      refresh()
      onChanged?.()
    } catch (err) {
      if (err?.isPending) {
        // 202 approval pending — interceptor already showed toast
        refresh()
        onChanged?.()
      }
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      <div className="ces-drawer-backdrop" onClick={onClose} />
      <div className="ces-drawer">
        {/* Header */}
        <div className="ces-drawer-head">
          <div className="ces-m-ic gold">
            <ClipboardCheck size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className="mono truncate"
              style={{ fontSize: 17, fontWeight: 800, color: 'var(--ces-ink)', letterSpacing: '-.01em', margin: 0 }}
            >
              {code}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {status && (
                <span className={clsx('ces-pill sm', status.pill)}>
                  <span className="d"></span>
                  {status.label}
                </span>
              )}
              {data?.companyName && (
                <span style={{ fontSize: 12.5, color: 'var(--ces-muted)' }}>{data.companyName}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="ces-row-act" title="Bağla">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="ces-tabs" style={{ padding: '0 12px', overflowX: 'auto', flexWrap: 'nowrap' }}>
          {TABS
            .filter((t) => t.id !== 'agreement' || showAgreementTab)
            .filter((t) => t.id !== 'shortlist' || showShortlistTab)
            .map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx('ces-tab', tab === t.id && 'on')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 14px', fontSize: 13 }}
              >
                <Icon size={14} />
                {t.label}
                {t.id === 'shortlist' && data?.shortlistItems?.length > 0 && (
                  <span className="ml-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full px-1.5 py-0.5">
                    {data.shortlistItems.length}
                  </span>
                )}
                {t.id === 'agreement' && data?.status === 'COORDINATOR_PROPOSED' && (
                  <span className="ml-1 bg-fuchsia-100 text-fuchsia-700 text-[10px] font-bold rounded-full px-1.5 py-0.5">
                    yeni
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div className="ces-drawer-body" style={{ padding: 0 }}>
          {loading || !data ? (
            <Spinner />
          ) : tab === 'info' ? (
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Müştəri */}
              <div>
                <p className="ces-sec-label" style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={11} /> Müştəri
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <InfoField label="Şirkət" value={data.companyName} />
                  <InfoField label="Müştəri ID" value={data.customerId} mono />
                  <InfoField label="Əlaqə şəxsi" value={dash(data.contactPerson)} />
                  <InfoField label="Telefon" value={dash(data.contactPhone)} mono />
                </div>
              </div>

              {/* Sifarişçi ofis əlaqəsi — PM əlavə etdiyi */}
              <div>
                <p className="ces-sec-label" style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <User size={11} /> Sifarişçi ofisi (PM)
                </p>
                <CustomerContactSection
                  data={data}
                  editable={editable}
                  requestId={requestId}
                  onSaved={() => { refresh(); onChanged?.() }}
                />
              </div>

              {/* Layihə */}
              <div>
                <p className="ces-sec-label" style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={11} /> Layihə
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <InfoField label="Layihə adı" value={dash(data.projectName)} />
                  <InfoField label="Bölgə" value={dash(data.region)} />
                  <InfoField label="Sorğu tarixi" value={fmtDate(data.requestDate)} mono />
                  <InfoField label="Layihə tipi" value={projectType?.label || dash(data.projectType)} />
                  <InfoField
                    label="Müddət"
                    value={data.dayCount ? `${data.dayCount} ${data.projectType === 'MONTHLY' ? 'ay' : 'gün'}` : '—'}
                  />
                  <div>
                    <span className="ces-sec-label" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>Daşınma</span>
                    {data.transportationRequired
                      ? <span className="ces-pill ces-p-ok sm">Bəli</span>
                      : <span className="ces-pill ces-p-mute sm">Xeyr</span>}
                  </div>
                </div>
              </div>

              {/* Əlavə */}
              <div>
                <p className="ces-sec-label" style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={11} /> Əlavə məlumat
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <InfoField label="Daxil oldu" value={fmtDate(data.createdAt)} mono />
                  <InfoField label="Sorğu kodu" value={data.requestCode} mono />
                </div>
                {data.notes && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--ces-line)' }}>
                    <InfoField label="Qeyd" value={data.notes} />
                  </div>
                )}
              </div>
            </div>
          ) : tab === 'shortlist' ? (
            <div style={{ padding: 22 }}>
              <ShortlistTab
                data={data}
                editable={editableShortlist}
                requestId={requestId}
                onSaved={() => { refresh(); onChanged?.() }}
              />
            </div>
          ) : tab === 'agreement' ? (
            <div style={{ padding: 22 }}>
              <AgreementTab
                data={data}
                requestId={requestId}
                editable={editableAgreement}
                canDeleteDoc={hasPermission('PROJECT_MANAGER', 'canDelete')}
                canApproveByPm={canApproveByPm}
                onSaved={() => { refresh(); onChanged?.() }}
              />
            </div>
          ) : tab === 'params' ? (
            <div style={{ padding: 22 }}>
              {(!data.params || data.params.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: 'var(--ces-graphite-50)', color: 'var(--ces-mute2)',
                    display: 'inline-grid', placeItems: 'center', marginBottom: 12,
                  }}>
                    <FileText size={26} />
                  </div>
                  <p style={{ fontSize: 13.5, color: 'var(--ces-muted)' }}>Texniki parametr yoxdur</p>
                </div>
              ) : (
                <div className="ces-table-wrap" style={{ boxShadow: 'none' }}>
                  <table className="ces-tbl">
                    <thead>
                      <tr>
                        <th>Parametr</th>
                        <th className="r">Dəyər</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.params.map((p, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--ces-ink)' }}>{p.paramKey}</td>
                          <td className="r mono" style={{ fontSize: 13, color: 'var(--ces-muted)' }}>{p.paramValue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {!loading && data && showFooter && !rejectOpen && (
          <div className="ces-drawer-foot">
            {canReject && (
              <button
                onClick={() => setRejectOpen(true)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
              >
                <XCircle size={14} />
                Rədd et
              </button>
            )}
            {canAccept && (
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
              >
                <CheckCircle size={14} />
                {actionLoading ? 'Gözləyin...' : 'Qəbul et'}
              </button>
            )}
            {canSendToCoord && (
              <button
                onClick={handleSendToCoordinator}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
              >
                <Send size={14} />
                {actionLoading ? 'Göndərilir...' : 'Koordinatora göndər'}
              </button>
            )}
            {canSendBack && (
              <button
                onClick={() => setSendBackOpen(true)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
              >
                <CornerUpLeft size={14} />
                Koordinatora geri qaytar
              </button>
            )}
            {canApprove && (
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
              >
                <CheckCircle size={14} />
                {actionLoading ? 'Təsdiqlənir...' : 'Təsdiqlə'}
              </button>
            )}
          </div>
        )}

        {sendBackOpen && (
          <ReasonPromptModal
            title="Koordinatora geri qaytar"
            message="Müştəri ilə qiymət razılaşmadı — koordinatordan yeni təklif istənilir. Seçilmiş texnika sərbəstləşir."
            confirmLabel="Geri qaytar"
            loading={actionLoading}
            onConfirm={handleSendBackToCoordinator}
            onClose={() => setSendBackOpen(false)}
          />
        )}

        {rejectOpen && (
          <div className="ces-drawer-foot" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--ces-danger)' }}>
              <AlertTriangle size={14} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Rədd səbəbi</span>
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Sorğunun rədd səbəbini qeyd edin..."
              rows={3}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setRejectOpen(false); setRejectReason('') }}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Ləğv
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
              >
                <XCircle size={14} />
                {actionLoading ? 'Gözləyin...' : 'Təsdiqlə'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
