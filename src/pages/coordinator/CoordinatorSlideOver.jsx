import { useState, useEffect, useMemo, useRef } from 'react'
import {
  X, Info, FileText, MessageSquare, ClipboardList, Building2, MapPin,
  Calendar, CheckCircle, XCircle, AlertTriangle, Send, Save, Truck,
  Phone, User, Trophy, DollarSign,
  PackageCheck, UserPlus, FileCheck, ShieldCheck, Plus, CornerUpLeft,
  Upload, Download, Trash2, FileSignature, Image as ImageIcon, ImagePlus,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { coordinatorApi } from '../../api/coordinator'
import { operatorsApi } from '../../api/operators'
import { STATUS_CFG, PROJECT_TYPES, fmtDate, dash } from '../../constants/requests'
import { fmtDateTime } from '../../utils/date'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import ReasonPromptModal from '../../components/common/ReasonPromptModal'
import NumberInput from '../../components/common/NumberInput'
import { useAuthStore } from '../../store/authStore'
import EquipmentDetailsModal from '../../components/common/EquipmentDetailsModal'

const PHASE_A_STATUS = 'COORDINATOR_NEGOTIATING'
const PHASE_B_STATUSES = ['EXECUTION_READY', 'OPERATOR_ASSIGNED', 'EQUIPMENT_DISPATCHED', 'DELIVERED']

const TABS = [
  { id: 'info', label: 'Sorğu', icon: Info },
  { id: 'negotiate', label: 'Danışıq', icon: MessageSquare },
  { id: 'execute', label: 'İcra', icon: PackageCheck },
  { id: 'params', label: 'Parametrlər', icon: FileText },
]

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500'
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'

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

/* ═════════════════════════ Negotiate tab — Mərhələ A ═════════════════════════ */
function NegotiateTab({ data, requestId, editable, onSaved, onShowEquipmentDetails }) {
  // Shortlist sətirləri (sahib + texnika + ödəyəcəyimiz qiymət)
  const [rows, setRows] = useState([])
  // Seçilmiş xətlər: shortlistItemId → {id, selected, customerPrice, transport, dayCount}
  const [lines, setLines] = useState({})
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const projectTypeLabel = data?.projectType === 'MONTHLY' ? 'Aylıq' : data?.projectType === 'DAILY' ? 'Günlük' : '—'
  const unitLabel = data?.projectType === 'MONTHLY' ? 'ay' : 'gün'
  const defaultUnits = data?.dayCount && data.dayCount > 0 ? data.dayCount : ''

  useEffect(() => {
    const items = data?.shortlistItems || []
    setRows(items.map((it) => ({
      itemId: it.id,
      partyType: it.partyType,
      negotiatedPrice: it.negotiatedPrice ?? '',
      contractorName: it.contractorName,
      contractorPhone: it.contractorPhone,
      contractorContactPerson: it.contractorContactPerson,
      contractorAddress: it.contractorAddress,
      investorName: it.investorName,
      investorPhone: it.investorPhone,
      investorContactPerson: it.investorContactPerson,
      investorAddress: it.investorAddress,
      equipmentId: it.equipmentId,
      equipmentName: it.equipmentName,
      equipmentCode: it.equipmentCode,
      equipmentBrand: it.equipmentBrand,
      equipmentModel: it.equipmentModel,
      equipmentYear: it.equipmentYear,
    })))
    // Mövcud plan xətlərindən seçimi bərpa et
    const map = {}
    for (const pi of (data?.items || [])) {
      if (pi.shortlistItemId != null) {
        map[pi.shortlistItemId] = {
          id: pi.id,
          selected: true,
          customerPrice: pi.customerEquipmentPrice ?? '',
          transport: pi.transportationPrice ?? '',
          dayCount: pi.dayCount ?? '',
        }
      }
    }
    setLines(map)
    setNotes(data?.notes ?? '')
  }, [data?.shortlistItems, data?.items, data?.notes])

  const updateRowCost = (idx, value) => {
    setRows((r) => r.map((row, i) => i === idx ? { ...row, negotiatedPrice: value } : row))
  }

  const toggleSelect = (itemId) => {
    setLines((prev) => {
      const cur = prev[itemId]
      if (cur?.selected) {
        return { ...prev, [itemId]: { ...cur, selected: false } }
      }
      return {
        ...prev,
        [itemId]: {
          id: cur?.id ?? null,
          selected: true,
          customerPrice: cur?.customerPrice ?? '',
          transport: cur?.transport ?? '',
          dayCount: cur?.dayCount ?? defaultUnits,
        },
      }
    })
  }

  const updateLine = (itemId, field, value) => {
    setLines((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }))
  }

  const fmt = (v) => Number(v || 0).toLocaleString('az-AZ', { minimumFractionDigits: 2 })

  // Hər xəttin hesablanmış məbləğləri + cəmlər
  const lineCalc = (row) => {
    const ln = lines[row.itemId]
    const isCompany = row.partyType === 'COMPANY'
    const costUnit = isCompany ? 0 : Number(row.negotiatedPrice || 0)
    const custUnit = Number(ln?.customerPrice || 0)
    const transport = Number(ln?.transport || 0)
    const units = Number(ln?.dayCount || 0) > 0 ? Number(ln.dayCount) : (Number(defaultUnits) || 1)
    const costTotal = costUnit * units
    const revTotal = custUnit * units + transport
    return { costUnit, custUnit, transport, units, costTotal, revTotal, profit: revTotal - costTotal }
  }

  const selectedRows = rows.filter((r) => lines[r.itemId]?.selected)
  const totals = selectedRows.reduce((acc, r) => {
    const c = lineCalc(r)
    acc.cost += c.costTotal; acc.rev += c.revTotal; acc.transport += c.transport
    return acc
  }, { cost: 0, rev: 0, transport: 0 })
  totals.profit = totals.rev - totals.cost

  const buildPayload = () => ({
    notes: notes || null,
    shortlistRows: rows.map((r) => ({
      itemId: r.itemId,
      negotiatedPrice: r.partyType === 'COMPANY'
        ? null
        : (r.negotiatedPrice !== '' ? Number(r.negotiatedPrice) : null),
    })),
    items: selectedRows.map((r) => {
      const ln = lines[r.itemId]
      const isCompany = r.partyType === 'COMPANY'
      return {
        id: ln.id || null,
        shortlistItemId: r.itemId,
        equipmentPrice: isCompany ? 0 : (r.negotiatedPrice !== '' ? Number(r.negotiatedPrice) : null),
        customerEquipmentPrice: ln.customerPrice !== '' ? Number(ln.customerPrice) : null,
        transportationPrice: ln.transport !== '' ? Number(ln.transport) : null,
        dayCount: ln.dayCount !== '' ? Number(ln.dayCount) : null,
      }
    }),
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      await coordinatorApi.savePlan(requestId, buildPayload())
      toast.success('Plan saxlandı')
      onSaved?.()
    } catch {} finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (selectedRows.length === 0) return toast.error('Ən azı bir texnika seçilməlidir')
    for (const r of selectedRows) {
      const ln = lines[r.itemId]
      if (r.partyType !== 'COMPANY' && (r.negotiatedPrice === '' || Number(r.negotiatedPrice) <= 0)) {
        return toast.error(`${r.equipmentName || 'Texnika'}: ödəyəcəyimiz qiymət daxil edilməlidir`)
      }
      if (ln.customerPrice === '' || Number(ln.customerPrice) <= 0) {
        return toast.error(`${r.equipmentName || 'Texnika'}: müştəri qiyməti daxil edilməlidir`)
      }
    }

    setSubmitting(true)
    try {
      await coordinatorApi.savePlan(requestId, buildPayload())
      await coordinatorApi.submitPlan(requestId)
      toast.success('Təklif PM-ə göndərildi')
      onSaved?.()
    } catch (err) {
      if (err?.isPending) onSaved?.()
    } finally {
      setSubmitting(false)
    }
  }

  if (!data?.shortlistItems) return <Spinner />

  if (rows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 24px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'var(--ces-graphite-50)', color: 'var(--ces-mute2)',
          display: 'inline-grid', placeItems: 'center', marginBottom: 12,
        }}>
          <MessageSquare size={26} />
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--ces-muted)' }}>PM-dən shortlist gəlməyib</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Project type banner */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 px-3 py-2 flex items-center gap-3">
        <Calendar size={13} className="text-blue-600 shrink-0" />
        <div className="flex-1 text-xs">
          <span className="font-bold text-blue-700 dark:text-blue-300">{projectTypeLabel}</span>
          {data?.dayCount && <span className="text-blue-600/80 dark:text-blue-400/80"> · {data.dayCount} {unitLabel}</span>}
          <span className="ml-2 text-gray-500">layihəyə bir neçə texnika seçə bilərsiniz</span>
        </div>
      </div>

      {/* Shortlist rows */}
      <div>
        <p className="ces-sec-label mb-2 inline-flex items-center gap-1.5">
          <ClipboardList size={11} /> Shortlist ({rows.length}) — layihəyə daxil ediləcək texnikaları seç
        </p>
        <div className="flex flex-col gap-2.5">
          {rows.map((row, idx) => {
            const isContractor = row.partyType === 'CONTRACTOR'
            const isInvestor = row.partyType === 'INVESTOR'
            const isCompany = row.partyType === 'COMPANY'
            const ln = lines[row.itemId]
            const selected = !!ln?.selected
            const partyName = isContractor ? row.contractorName : isInvestor ? row.investorName : 'Şirkət'
            const partyPhone = isContractor ? row.contractorPhone : isInvestor ? row.investorPhone : null
            const partyContact = isContractor ? row.contractorContactPerson : isInvestor ? row.investorContactPerson : null
            const c = lineCalc(row)

            return (
              <div
                key={row.itemId}
                className={clsx(
                  'rounded-xl border p-3 transition-all',
                  selected
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10 ring-2 ring-purple-200 dark:ring-purple-800'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-purple-600 dark:text-purple-400">#{idx + 1}</span>
                    <span className={clsx(
                      'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                      isCompany ? 'bg-blue-100 text-blue-700'
                        : isContractor ? 'bg-amber-100 text-amber-700'
                          : 'bg-purple-100 text-purple-700',
                    )}>
                      {isCompany ? 'Şirkət' : isContractor ? 'Podratçı' : 'İnvestor'}
                    </span>
                    {selected && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-600 text-white text-[10px] font-bold">
                        <CheckCircle size={10} /> Seçildi
                      </span>
                    )}
                  </div>
                  {editable && (
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelect(row.itemId)}
                        className="accent-purple-600 w-4 h-4"
                      />
                      Layihəyə daxil et
                    </label>
                  )}
                </div>

                {/* Party + equipment */}
                <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Ad</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{partyName || '—'}</p>
                  </div>
                  {partyContact && (
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide flex items-center gap-1"><User size={9} /> Əlaqə</p>
                      <p className="font-medium text-gray-700 dark:text-gray-300">{partyContact}</p>
                    </div>
                  )}
                  {partyPhone && (
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide flex items-center gap-1"><Phone size={9} /> Telefon</p>
                      <p className="font-medium mono text-gray-700 dark:text-gray-300">
                        <a href={`tel:${partyPhone}`} className="hover:text-purple-600">{partyPhone}</a>
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        {row.equipmentName || '—'} <span className="font-mono text-gray-400">({row.equipmentCode})</span>
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {[row.equipmentBrand, row.equipmentModel, row.equipmentYear].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {row.equipmentId && (
                      <button
                        onClick={() => onShowEquipmentDetails(row.equipmentId)}
                        className="text-[10px] font-semibold px-2 py-1 rounded-md hover:bg-purple-100 text-purple-700"
                      >
                        Haqqında
                      </button>
                    )}
                  </div>
                </div>

                {/* Ödəyəcəyimiz qiymət (cost) */}
                {isCompany ? (
                  <div className="mt-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
                    <Info size={11} className="inline mr-1" />
                    Şirkət texnikası — ödəniş yoxdur (xərc 0)
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 shrink-0 flex items-center gap-1">
                      <DollarSign size={11} /> Ödəyəcəyimiz/{unitLabel}:
                    </label>
                    <NumberInput
                      decimal min="0" value={row.negotiatedPrice}
                      onChange={(e) => updateRowCost(idx, e.target.value)}
                      placeholder="0.00" disabled={!editable}
                      className={`${inputCls} flex-1`}
                    />
                    <span className="text-xs text-gray-500">₼</span>
                  </div>
                )}

                {/* Seçildikdə: müştəri qiyməti + daşınma + müddət (hər texnika ayrı) */}
                {selected && (
                  <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800 grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Müştəri/{unitLabel} (₼)</label>
                      <NumberInput
                        decimal min="0" value={ln.customerPrice}
                        onChange={(e) => updateLine(row.itemId, 'customerPrice', e.target.value)}
                        placeholder="0.00" disabled={!editable} className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Müddət ({unitLabel})</label>
                      <NumberInput
                        min="0" value={ln.dayCount}
                        onChange={(e) => updateLine(row.itemId, 'dayCount', e.target.value)}
                        placeholder={String(defaultUnits || '')} disabled={!editable} className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1 flex items-center gap-0.5"><Truck size={9} /> Daşınma (₼)</label>
                      <NumberInput
                        decimal min="0" value={ln.transport}
                        onChange={(e) => updateLine(row.itemId, 'transport', e.target.value)}
                        placeholder="0.00" disabled={!editable} className={inputCls}
                      />
                    </div>
                    <div className="col-span-3 flex items-center justify-between text-[11px] pt-1">
                      <span className="text-gray-500">
                        {c.units} {unitLabel} · ödəniləcək <span className="mono text-red-600">{fmt(c.costTotal)} ₼</span> · alınacaq <span className="mono text-emerald-700">{fmt(c.revTotal)} ₼</span>
                      </span>
                      <span className={clsx('mono font-bold', c.profit >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                        xeyir {fmt(c.profit)} ₼
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Totals — bütün seçilmiş texnikalar üzrə cəm */}
      {selectedRows.length > 0 && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10 p-3.5">
          <p className="ces-sec-label mb-2 inline-flex items-center gap-1.5" style={{ color: 'var(--ces-ok)' }}>
            <DollarSign size={11} /> Cəm ({selectedRows.length} texnika)
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Ödəyəcəyimiz</p>
              <p className="text-sm font-bold mono text-red-600">{fmt(totals.cost)} ₼</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Sifarişçidən</p>
              <p className="text-sm font-bold mono text-emerald-700">{fmt(totals.rev)} ₼</p>
              {totals.transport > 0 && <p className="text-[10px] text-gray-400">daşınma {fmt(totals.transport)} ₼ daxil</p>}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Cəm xeyir</p>
              <p className={clsx('text-sm font-bold mono', totals.profit >= 0 ? 'text-emerald-700' : 'text-red-600')}>{fmt(totals.profit)} ₼</p>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className={labelCls}>Koordinator qeydi</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Danışıq detalları, əlavə şərtlər..."
          rows={3}
          disabled={!editable}
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Actions */}
      {editable && (
        <div className="flex gap-2 justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={saving || submitting}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
          >
            <Save size={14} />
            {saving ? 'Saxlanılır...' : 'Saxla'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || submitting}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
          >
            <Send size={14} />
            {submitting ? 'Göndərilir...' : 'PM-ə göndər'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ═════════════════════════ Execute tab — Mərhələ B ═════════════════════════ */
function StepCard({ num, title, active, done, children }) {
  const stateCls = done
    ? 'border-green-300 bg-green-50 dark:bg-green-900/10'
    : active
      ? 'border-purple-300 bg-purple-50 dark:bg-purple-900/10 ring-2 ring-purple-200 dark:ring-purple-800'
      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
  const numCls = done
    ? 'bg-green-600 text-white'
    : active
      ? 'bg-purple-600 text-white'
      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
  return (
    <div className={clsx('rounded-xl border p-3.5 transition-all', stateCls)}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={clsx('w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0', numCls)}>
          {done ? <CheckCircle size={14} /> : num}
        </div>
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">{title}</h3>
      </div>
      <div className="pl-9">{children}</div>
    </div>
  )
}

/* ─── İcra: tək texnika xətti kartı (çoxlu model) ─── */
const AGREEMENT_DOC_LABELS = {
  CONTRACT: 'Müştəri müqaviləsi',
  PRICE_PROTOCOL: 'Müştəri qiymət protokolu',
  OWNER_CONTRACT: 'Sahib müqaviləsi',
  OWNER_PRICE_PROTOCOL: 'Sahib qiymət protokolu',
}

function ItemExecuteCard({ item, requestId, operators, canPut, canDispatch, canDeliver, canPost, canDelete, onSaved, onOpenDoc, onOpenEquipmentDoc, onOpenRequestDoc }) {
  const [selectedOperatorId, setSelectedOperatorId] = useState('')
  const [busy, setBusy] = useState(false)
  const actRef = useRef(null)

  const reqDocs = item.requiredDocuments || []
  const eqDocs = item.equipmentDocuments || []
  const agDocs = item.agreementDocuments || []
  const allChecked = reqDocs.length === 0 || reqDocs.every((d) => d.checked)
  const hasOperator = !!item.operatorId
  // Seçilmiş və ya təyin olunmuş operatorun sənədləri (operators siyahısından)
  const opForDocs = (operators || []).find((o) => o.id === (item.operatorId || (selectedOperatorId ? Number(selectedOperatorId) : null)))
  const operatorDocs = opForDocs?.documents || []
  const docsVerified = !!item.equipmentDocsVerified
  const dispatched = !!item.dispatchedAt
  const delivered = !!item.deliveredAt
  const hasAct = !!item.actDocumentId

  const run = async (fn, okMsg) => {
    setBusy(true)
    try { await fn(); if (okMsg) toast.success(okMsg); onSaved?.() } catch {} finally { setBusy(false) }
  }

  const stepBadge = delivered ? { t: 'Təhvil verildi', c: 'bg-green-100 text-green-700' }
    : dispatched ? { t: 'Göndərildi', c: 'bg-blue-100 text-blue-700' }
    : docsVerified ? { t: 'Sənəd OK', c: 'bg-amber-100 text-amber-700' }
    : hasOperator ? { t: 'Operator təyin', c: 'bg-purple-100 text-purple-700' }
    : { t: 'Gözləyir', c: 'bg-gray-100 text-gray-600' }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">
            {item.equipmentName} <span className="font-mono text-gray-400 text-xs">({item.equipmentCode})</span>
          </p>
          <p className="text-[10px] text-gray-500">
            {item.partyType === 'CONTRACTOR' ? 'Podratçı' : item.partyType === 'INVESTOR' ? 'İnvestor' : 'Şirkət'} · {item.partyName}
          </p>
        </div>
        <span className={clsx('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0', stepBadge.c)}>{stepBadge.t}</span>
      </div>

      {delivered ? (
        <div className="flex items-center gap-2 text-xs text-green-700">
          <CheckCircle size={14} /> Təhvil-təslim tamamlandı{item.deliveredAt && ` · ${fmtDateTime(item.deliveredAt)}`}
          {item.operatorName && <span className="text-gray-500">· {item.operatorName}</span>}
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* 1. Operator */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">1 · Operator</p>
            {hasOperator ? (
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-gray-800 dark:text-gray-200"><UserPlus size={13} className="text-green-600" /> {item.operatorName}</span>
                {!dispatched && canPut && (
                  <button onClick={() => run(() => coordinatorApi.resetOperatorItem(requestId, item.id, 'Dəyişdirilir'), 'Sıfırlandı')}
                    disabled={busy} className="text-[11px] text-amber-700 hover:underline inline-flex items-center gap-1"><CornerUpLeft size={11} /> Dəyiş</button>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <select value={selectedOperatorId} onChange={(e) => setSelectedOperatorId(e.target.value)} disabled={!canPut || busy} className={inputCls}>
                  <option value="">— Operator seç —</option>
                  {operators.map((o) => <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>)}
                </select>
                <button onClick={() => selectedOperatorId && run(() => coordinatorApi.assignOperatorItem(requestId, item.id, Number(selectedOperatorId)), 'Təyin edildi')}
                  disabled={!canPut || busy || !selectedOperatorId}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 shrink-0 inline-flex items-center gap-1"><CheckCircle size={13} /> Təyin</button>
              </div>
            )}
            {/* Operatorun sənədləri (seçilən/təyin olunan) — baxış üçün */}
            {operatorDocs.length > 0 && (
              <div className="mt-1.5 space-y-1">
                <p className="text-[9px] text-gray-400 uppercase tracking-wide">Operator sənədləri</p>
                {operatorDocs.map((d) => (
                  <button key={d.id} type="button"
                    onClick={() => operatorsApi.previewDocument(opForDocs.id, d.id, d.fileName)}
                    className="flex items-center gap-1.5 w-full text-[11px] text-gray-600 dark:text-gray-300 hover:text-purple-600 rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1">
                    <FileText size={11} className="text-purple-500 shrink-0" />
                    <span className="truncate">{d.fileName || d.documentType}</span>
                    {d.documentType && <span className="text-gray-400 shrink-0">· {d.documentType}</span>}
                    <Download size={10} className="ml-auto shrink-0 text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Müqavilə sənədləri — oxu rejimi (müştəri + sahib) */}
          {agDocs.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Müqavilə sənədləri</p>
              <div className="space-y-1">
                {agDocs.map((d) => (
                  <button key={d.id} type="button" onClick={() => onOpenRequestDoc(d)}
                    className="flex items-center gap-1.5 w-full text-[11px] text-gray-600 dark:text-gray-300 hover:text-purple-600 rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1">
                    <FileText size={11} className="text-amber-500 shrink-0" />
                    <span className="truncate">{AGREEMENT_DOC_LABELS[d.docType] || d.fileName}</span>
                    <Download size={10} className="ml-auto shrink-0 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. Sənəd yoxlaması */}
          {hasOperator && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                2 · Sənədlər {reqDocs.length > 0 && `(${reqDocs.filter((d) => d.checked).length}/${reqDocs.length})`}
              </p>

              {/* Texnikanın qarajdakı faktiki sənədləri — baxış üçün (məcburi + digər) */}
              {eqDocs.length > 0 && (
                <div className="mb-2 space-y-1">
                  {eqDocs.map((d) => (
                    <button key={d.id} type="button" onClick={() => onOpenEquipmentDoc(d)}
                      className="flex items-center gap-1.5 w-full text-[11px] text-gray-600 dark:text-gray-300 hover:text-purple-600 rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1">
                      <FileText size={11} className="text-purple-500 shrink-0" />
                      <span className="truncate">{d.name}</span>
                      {d.type && <span className="text-gray-400 shrink-0">· {d.type}</span>}
                      <Download size={10} className="ml-auto shrink-0 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}

              {docsVerified ? (
                <div className="flex items-center gap-1.5 text-xs text-green-700"><ShieldCheck size={13} /> Yoxlanıldı</div>
              ) : (
                <div className="space-y-1.5">
                  {reqDocs.length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic">
                      {eqDocs.length > 0 ? 'Məcburi sənəd siyahısı yoxdur — yuxarıdakı sənədləri yoxlayın' : 'Məcburi sənəd təyin edilməyib'}
                    </p>
                  ) : reqDocs.map((d) => (
                    <label key={d.id} className={clsx('flex items-center gap-2 rounded-md border px-2 py-1 text-xs',
                      d.checked ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600')}>
                      <input type="checkbox" checked={d.checked} disabled={!canPut || busy}
                        onChange={(e) => run(() => coordinatorApi.toggleDocCheckItem(requestId, item.id, d.id, e.target.checked))}
                        className="accent-green-600 w-3.5 h-3.5" />
                      {d.name}
                    </label>
                  ))}
                  <button onClick={() => run(() => coordinatorApi.verifyDocsItem(requestId, item.id), 'Yoxlanıldı')}
                    disabled={!canPut || busy || !allChecked}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 inline-flex items-center gap-1"><ShieldCheck size={12} /> Sənədlər yoxlandı</button>
                </div>
              )}
            </div>
          )}

          {/* 3. Göndərmə */}
          {docsVerified && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">3 · Göndərmə</p>
              {dispatched ? (
                <div className="flex items-center gap-1.5 text-xs text-blue-700"><Truck size={13} /> Göndərildi{item.dispatchedAt && ` · ${fmtDateTime(item.dispatchedAt)}`}</div>
              ) : (
                <button onClick={() => run(() => coordinatorApi.dispatchItem(requestId, item.id), 'Göndərildi')}
                  disabled={!canDispatch || busy}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 inline-flex items-center gap-1"><Truck size={12} /> Texnika göndərildi</button>
              )}
            </div>
          )}

          {/* 4. Təhvil-təslim + akt */}
          {dispatched && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">4 · Təhvil-təslim</p>
              <div className="flex items-center gap-2 mb-1.5">
                {hasAct ? (
                  <div className="flex items-center gap-1.5 text-xs flex-1 min-w-0">
                    <FileSignature size={13} className="text-purple-600 shrink-0" />
                    <button onClick={() => onOpenDoc({ id: item.actDocumentId })} className="truncate text-gray-700 hover:text-purple-600">{item.actFileName}</button>
                    {canDelete && <button onClick={() => run(() => coordinatorApi.deleteDocument(requestId, item.actDocumentId), 'Akt silindi')} disabled={busy} className="text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>}
                  </div>
                ) : (
                  <>
                    <input ref={actRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
                      disabled={!canPost || busy}
                      onChange={(e) => e.target.files?.[0] && run(() => coordinatorApi.uploadItemDocument(requestId, item.id, e.target.files[0]), 'Akt yükləndi')} />
                    <button onClick={() => actRef.current?.click()} disabled={!canPost || busy}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-dashed border-gray-200 text-gray-500 hover:border-purple-400 hover:text-purple-600 disabled:opacity-50 inline-flex items-center gap-1"><Upload size={12} /> Aktı yüklə</button>
                  </>
                )}
              </div>
              <button onClick={() => run(() => coordinatorApi.deliverItem(requestId, item.id, null), 'Təhvil-təslim tamamlandı')}
                disabled={!canDeliver || busy || !hasAct}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 inline-flex items-center gap-1"><CheckCircle size={12} /> Təhvil-təslim tamamla</button>
              {!hasAct && <p className="text-[10px] text-amber-600 mt-1 inline-flex items-center gap-1"><AlertTriangle size={10} /> Əvvəlcə aktı yükləyin</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ExecuteTab({ data, requestId, canPut, canDispatch, canDeliver, canPost, canDelete, onSaved }) {
  const status = data?.requestStatus

  const operatorAssigned = !!data?.operatorId || ['OPERATOR_ASSIGNED', 'EQUIPMENT_DISPATCHED', 'DELIVERED'].includes(status)
  const docsVerified = !!data?.equipmentDocsVerified
  const dispatched = !!data?.dispatchedAt || ['EQUIPMENT_DISPATCHED', 'DELIVERED'].includes(status)
  const delivered = !!data?.deliveredAt || status === 'DELIVERED'

  // Aktiv addım = ilk bitməmiş
  const activeStep = !operatorAssigned ? 1
    : !docsVerified ? 2
    : !dispatched ? 3
    : !delivered ? 4
    : 5

  // ── Step 1: operator ──
  const [operators, setOperators] = useState([])
  const [operatorsLoading, setOperatorsLoading] = useState(false)
  const [selectedOperatorId, setSelectedOperatorId] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Çoxlu model: xətlər varsa operatorları həmişə yüklə (operator sənədlərini göstərmək üçün)
  const hasItems = data?.items?.length > 0
  useEffect(() => {
    if (operatorAssigned && !hasItems) return
    setOperatorsLoading(true)
    operatorsApi.getAll()
      .then((r) => setOperators(r.data.data || r.data || []))
      .catch(() => {})
      .finally(() => setOperatorsLoading(false))
  }, [operatorAssigned, hasItems])

  const handleAssignOperator = async () => {
    if (!selectedOperatorId) return toast.error('Operator seçin')
    setAssigning(true)
    try {
      await coordinatorApi.assignOperator(requestId, Number(selectedOperatorId))
      toast.success('Operator təyin edildi')
      onSaved?.()
    } catch {} finally {
      setAssigning(false)
    }
  }

  // Operatoru dəyişmək üçün geri qaytarma (OPERATOR_ASSIGNED → EXECUTION_READY)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const handleResetOperator = async (reason) => {
    setResetting(true)
    try {
      await coordinatorApi.resetOperator(requestId, reason)
      toast.success('Operator təyini sıfırlandı')
      setResetOpen(false)
      onSaved?.()
    } catch { /* xəta interceptor-də göstərilir */ } finally {
      setResetting(false)
    }
  }

  // ── Step 2: docs verify ──
  const [verifying, setVerifying] = useState(false)
  const [togglingDocId, setTogglingDocId] = useState(null)
  const requiredDocs = data?.requiredDocuments || []
  const allDocsChecked = requiredDocs.length === 0 || requiredDocs.every((d) => d.checked)

  const handleVerify = async () => {
    setVerifying(true)
    try {
      await coordinatorApi.verifyEquipmentDocs(requestId)
      toast.success('Texnika sənədləri yoxlanıldı')
      onSaved?.()
    } catch {} finally {
      setVerifying(false)
    }
  }

  const handleToggleDoc = async (configItemId, checked) => {
    setTogglingDocId(configItemId)
    try {
      await coordinatorApi.toggleDocCheck(requestId, configItemId, checked)
      onSaved?.()
    } catch {} finally {
      setTogglingDocId(null)
    }
  }

  // ── Step 3: dispatch ──
  const [dispatching, setDispatching] = useState(false)
  const handleDispatch = async () => {
    setDispatching(true)
    try {
      await coordinatorApi.dispatch(requestId)
      toast.success('Texnika göndərildi')
      onSaved?.()
    } catch {} finally {
      setDispatching(false)
    }
  }

  // ── Step 4: deliver ──
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [delivering, setDelivering] = useState(false)
  const handleDeliver = async () => {
    setDelivering(true)
    try {
      await coordinatorApi.deliver(requestId, deliveryNotes.trim() || null)
      toast.success('Təhvil-təslim tamamlandı — layihə aktivdir')
      onSaved?.()
    } catch {} finally {
      setDelivering(false)
    }
  }

  // ── Step 4: təhvil-təslim aktı (sənəd) ──
  const actDoc = (data?.documents || []).find((d) => d.documentType === 'HANDOVER_ACT')
  const actFileRef = useRef(null)
  const [uploadingAct, setUploadingAct] = useState(false)
  const [deletingAct, setDeletingAct] = useState(false)

  const handleUploadAct = async (file) => {
    if (!file) return
    setUploadingAct(true)
    try {
      await coordinatorApi.uploadDocument(requestId, file, 'HANDOVER_ACT')
      toast.success('Təhvil-təslim aktı yükləndi')
      onSaved?.()
    } catch {} finally {
      setUploadingAct(false)
      if (actFileRef.current) actFileRef.current.value = ''
    }
  }

  const handleDeleteAct = async () => {
    if (!actDoc) return
    if (!window.confirm('Təhvil-təslim aktını silmək istədiyinizə əminsiniz?')) return
    setDeletingAct(true)
    try {
      await coordinatorApi.deleteDocument(requestId, actDoc.id)
      toast.success('Akt silindi')
      onSaved?.()
    } catch {} finally {
      setDeletingAct(false)
    }
  }

  // Sənədi blob olaraq endir/aç (JWT header axios ilə getsin deyə — düz <a href> token daşımır)
  const handleOpenDoc = async (doc) => {
    try {
      const res = await coordinatorApi.downloadDocument(requestId, doc.id)
      const url = URL.createObjectURL(
        new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' })
      )
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      toast.error('Fayl açıla bilmədi')
    }
  }

  // Texnikanın qarajdakı sənədini aç (koordinator yoxlaması üçün)
  const handleOpenEquipmentDoc = async (doc) => {
    try {
      const res = await coordinatorApi.downloadEquipmentDocument(requestId, doc.id)
      const url = URL.createObjectURL(
        new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' })
      )
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      toast.error('Fayl açıla bilmədi')
    }
  }

  // Müqavilə sənədini (müştəri/sahib) oxu-rejimi üçün aç
  const handleOpenRequestDoc = async (doc) => {
    try {
      const res = await coordinatorApi.downloadRequestDocument(requestId, doc.id)
      const url = URL.createObjectURL(
        new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' })
      )
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      toast.error('Fayl açıla bilmədi')
    }
  }

  // ── Step 3: yükləmə şəkilləri ──
  const dispatchPhotos = (data?.documents || []).filter((d) => d.documentType === 'DISPATCH_PHOTO')
  const photoRef = useRef(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [deletingPhotoId, setDeletingPhotoId] = useState(null)

  const handleUploadPhotos = async (files) => {
    const list = files ? Array.from(files) : []
    if (!list.length) return
    setUploadingPhoto(true)
    try {
      for (const f of list) {
        await coordinatorApi.uploadDocument(requestId, f, 'DISPATCH_PHOTO')
      }
      toast.success(list.length > 1 ? 'Şəkillər yükləndi' : 'Şəkil yükləndi')
      onSaved?.()
    } catch {} finally {
      setUploadingPhoto(false)
      if (photoRef.current) photoRef.current.value = ''
    }
  }

  const handleDeletePhoto = async (docId) => {
    setDeletingPhotoId(docId)
    try {
      await coordinatorApi.deleteDocument(requestId, docId)
      toast.success('Şəkil silindi')
      onSaved?.()
    } catch {} finally {
      setDeletingPhotoId(null)
    }
  }

  // ─── Çoxlu texnika modeli: hər xətt ayrı icra olunur ───
  const execItems = data?.items || []
  if (execItems.length > 0) {
    const deliveredCount = execItems.filter((it) => it.deliveredAt).length
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 px-3 py-2 flex items-center gap-2 text-xs">
          <PackageCheck size={14} className="text-blue-600 shrink-0" />
          <span className="text-gray-700 dark:text-gray-300">
            {execItems.length} texnika ayrıca icra olunur · <span className="font-bold text-green-700">{deliveredCount}</span>/{execItems.length} təhvil verildi
          </span>
        </div>
        {execItems.map((it) => (
          <ItemExecuteCard
            key={it.id}
            item={it}
            requestId={requestId}
            operators={operators}
            canPut={canPut}
            canDispatch={canDispatch}
            canDeliver={canDeliver}
            canPost={canPost}
            canDelete={canDelete}
            onSaved={onSaved}
            onOpenDoc={handleOpenDoc}
            onOpenEquipmentDoc={handleOpenEquipmentDoc}
            onOpenRequestDoc={handleOpenRequestDoc}
          />
        ))}
        {status === 'DELIVERED' && (
          <div className="rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 p-4 text-center">
            <CheckCircle size={28} className="text-green-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-green-800 dark:text-green-300">Bütün texnikalar təhvil verildi</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Step 1 — Operator təyini */}
      <StepCard num={1} title="Operator təyini" active={activeStep === 1} done={operatorAssigned}>
        {operatorAssigned ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <UserPlus size={14} className="text-green-600" />
              <span className="font-semibold text-gray-800 dark:text-gray-200">{data?.operatorName || '—'}</span>
            </div>
            {status === 'OPERATOR_ASSIGNED' && canPut && (
              <button
                onClick={() => setResetOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors inline-flex items-center gap-1.5"
              >
                <CornerUpLeft size={13} />
                Operatoru dəyiş
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={selectedOperatorId}
                onChange={(e) => setSelectedOperatorId(e.target.value)}
                disabled={!canPut || operatorsLoading}
                className={inputCls}
              >
                <option value="">{operatorsLoading ? 'Yüklənir...' : '— Operator seç —'}</option>
                {operators.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.firstName} {o.lastName}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAssignOperator}
                disabled={!canPut || assigning || !selectedOperatorId}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 shrink-0"
              >
                <CheckCircle size={13} />
                {assigning ? 'Təyin edilir...' : 'Təyin et'}
              </button>
            </div>
            <a
              href="/operators"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-700 font-medium"
            >
              <Plus size={11} />
              Operatorlar siyahısında yeni yarat
            </a>
          </div>
        )}
      </StepCard>

      {/* Step 2 — Texnika sənədləri */}
      <StepCard num={2} title="Texnika sənədlərini yoxla" active={activeStep === 2} done={docsVerified}>
        {docsVerified ? (
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck size={13} className="text-green-600" />
            <span className="text-gray-700 dark:text-gray-300">
              Yoxlanıldı
              {data?.equipmentDocsCheckedAt && ` · ${fmtDateTime(data.equipmentDocsCheckedAt)}`}
            </span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Tələb olunan sənədlər — yoxlama checklist-i (hamısı işarələnməlidir) */}
            {requiredDocs.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Tələb olunan sənədlər ({requiredDocs.filter((d) => d.checked).length}/{requiredDocs.length})
                </p>
                {requiredDocs.map((d) => (
                  <label
                    key={d.id}
                    className={clsx(
                      'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors',
                      canPut && operatorAssigned ? 'cursor-pointer' : 'cursor-default opacity-80',
                      d.checked
                        ? 'border-green-300 bg-green-50 dark:bg-green-900/10 text-green-700'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={d.checked}
                      disabled={!canPut || !operatorAssigned || togglingDocId === d.id}
                      onChange={(e) => handleToggleDoc(d.id, e.target.checked)}
                      className="accent-green-600 w-4 h-4"
                    />
                    <span className="flex-1">{d.name}</span>
                    {d.checked && <CheckCircle size={13} className="text-green-600" />}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 italic">Bu texnika üçün məcburi sənəd tipi təyin edilməyib</p>
            )}

            {/* Texnikaya yüklənmiş sənəd tipləri (informativ) */}
            {data?.equipmentDocumentTypes && data.equipmentDocumentTypes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {data.equipmentDocumentTypes.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                    <FileCheck size={9} />
                    {t}
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={!canPut || verifying || !operatorAssigned || !allDocsChecked}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
            >
              <ShieldCheck size={13} />
              {verifying ? 'Təsdiqlənir...' : 'Sənədlər yoxlandı'}
            </button>
            {!allDocsChecked && operatorAssigned && (
              <p className="text-[10px] text-amber-600 inline-flex items-center gap-1">
                <AlertTriangle size={10} /> Bütün məcburi sənədlər işarələnməlidir
              </p>
            )}
          </div>
        )}
      </StepCard>

      {/* Step 3 — Yükləmə + Göndərmə */}
      <StepCard num={3} title="Yükləmə və göndərmə" active={activeStep === 3} done={dispatched}>
        {dispatched ? (
          <div className="flex items-center gap-2 text-xs">
            <Truck size={13} className="text-green-600" />
            <span className="text-gray-700 dark:text-gray-300">
              Göndərildi
              {data?.dispatchedAt && ` · ${fmtDateTime(data.dispatchedAt)}`}
            </span>
          </div>
        ) : (
          <button
            onClick={handleDispatch}
            disabled={!canDispatch || dispatching || !docsVerified}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
          >
            <Truck size={13} />
            {dispatching ? 'Göndərilir...' : 'Texnika göndərildi'}
          </button>
        )}
        {!canDispatch && !dispatched && (
          <p className="text-[10px] text-amber-600 mt-1 inline-flex items-center gap-1">
            <AlertTriangle size={10} /> "Texnika göndər" icazəsi yoxdur
          </p>
        )}

        {/* Yükləmə şəkilləri */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 inline-flex items-center gap-1.5">
            <ImageIcon size={13} className="text-purple-600" />
            Yükləmə şəkilləri
            {dispatchPhotos.length > 0 && (
              <span className="text-[10px] font-normal text-gray-400">({dispatchPhotos.length})</span>
            )}
          </p>
          {dispatchPhotos.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {dispatchPhotos.map((doc) => (
                <div
                  key={doc.id}
                  className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                  <button
                    onClick={() => handleOpenDoc(doc)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 max-w-[140px]"
                    title={doc.documentName}
                  >
                    <ImageIcon size={12} className="shrink-0 text-purple-500" />
                    <span className="truncate">{doc.documentName}</span>
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDeletePhoto(doc.id)}
                      disabled={deletingPhotoId === doc.id}
                      className="p-0.5 rounded text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
                      title="Sil"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleUploadPhotos(e.target.files)}
            disabled={!canPost || uploadingPhoto || !docsVerified}
            className="hidden"
          />
          <button
            onClick={() => photoRef.current?.click()}
            disabled={!canPost || uploadingPhoto || !docsVerified}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 text-gray-500 hover:border-purple-400 hover:text-purple-600 disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:text-gray-500 transition-colors inline-flex items-center gap-1.5"
          >
            <ImagePlus size={13} />
            {uploadingPhoto ? 'Yüklənir...' : 'Şəkil yüklə'}
          </button>
          {!docsVerified ? (
            <p className="text-[10px] text-gray-400 mt-1 inline-flex items-center gap-1">
              <Info size={10} /> Sənədlər yoxlandıqdan sonra şəkil yükləyə bilərsiniz
            </p>
          ) : !canPost ? (
            <p className="text-[10px] text-amber-600 mt-1 inline-flex items-center gap-1">
              <AlertTriangle size={10} /> Şəkil yükləmə icazəsi yoxdur
            </p>
          ) : null}
        </div>
      </StepCard>

      {/* Step 4 — Təhvil-təslim */}
      <StepCard num={4} title="Təhvil-təslim" active={activeStep === 4} done={delivered}>
        {delivered ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle size={13} className="text-green-600" />
              <span className="text-gray-700 dark:text-gray-300">
                Tamamlandı
                {data?.deliveredAt && ` · ${fmtDateTime(data.deliveredAt)}`}
              </span>
            </div>
            {data?.deliveryNotes && (
              <p className="text-xs text-gray-600 dark:text-gray-400 italic">"{data.deliveryNotes}"</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Təhvil-təslim qeydi (opsional)..."
              rows={2}
              disabled={!canDeliver || !dispatched}
              className={`${inputCls} resize-none`}
            />
            <button
              onClick={handleDeliver}
              disabled={!canDeliver || delivering || !dispatched || !actDoc}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
            >
              <CheckCircle size={13} />
              {delivering ? 'Tamamlanır...' : 'Təhvil-təslim tamamla'}
            </button>
            {!canDeliver ? (
              <p className="text-[10px] text-amber-600 inline-flex items-center gap-1">
                <AlertTriangle size={10} /> "Təhvil-təslim" icazəsi yoxdur
              </p>
            ) : dispatched && !actDoc ? (
              <p className="text-[10px] text-amber-600 inline-flex items-center gap-1">
                <AlertTriangle size={10} /> Tamamlamaq üçün əvvəlcə təhvil-təslim aktını yükləyin (aşağıda)
              </p>
            ) : null}
          </div>
        )}

        {/* Təhvil-təslim aktı — flowun ən sonunda yüklənir */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 inline-flex items-center gap-1.5">
            <FileSignature size={13} className="text-purple-600" />
            Təhvil-təslim aktı
          </p>
          {actDoc ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={15} className="text-purple-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{actDoc.documentName}</p>
                  <p className="text-[10px] text-gray-400">
                    {actDoc.uploadedByName || '—'}
                    {actDoc.uploadedAt && ` · ${fmtDateTime(actDoc.uploadedAt)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleOpenDoc(actDoc)}
                  className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-purple-600 transition-colors"
                  title="Aç / Yüklə"
                >
                  <Download size={14} />
                </button>
                {canDelete && (
                  <button
                    onClick={handleDeleteAct}
                    disabled={deletingAct}
                    className="p-1.5 rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
                    title="Sil"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <input
                ref={actFileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => handleUploadAct(e.target.files?.[0])}
                disabled={!canPost || uploadingAct || !dispatched}
                className="hidden"
              />
              <button
                onClick={() => actFileRef.current?.click()}
                disabled={!canPost || uploadingAct || !dispatched}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 text-gray-500 hover:border-purple-400 hover:text-purple-600 disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:text-gray-500 transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Upload size={13} />
                {uploadingAct ? 'Yüklənir...' : 'Aktı yüklə'}
              </button>
              {!dispatched ? (
                <p className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                  <Info size={10} /> Texnika göndərildikdən sonra aktı yükləyə bilərsiniz
                </p>
              ) : !canPost ? (
                <p className="text-[10px] text-amber-600 inline-flex items-center gap-1">
                  <AlertTriangle size={10} /> Sənəd yükləmə icazəsi yoxdur
                </p>
              ) : null}
            </div>
          )}
        </div>
      </StepCard>

      {delivered && (
        <div className="rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 p-4 text-center">
          <CheckCircle size={28} className="text-green-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-green-800 dark:text-green-300">Layihə aktivdir</p>
          <p className="text-xs text-green-700/80 dark:text-green-400/80 mt-1">
            Bütün addımlar tamamlandı. Layihə icra mərhələsindədir.
          </p>
        </div>
      )}

      {resetOpen && (
        <ReasonPromptModal
          title="Operatoru dəyiş"
          message="Sorğu icra hazırlığına qaytarılır və yeni operator təyin etmək mümkün olur."
          confirmLabel="Geri qaytar"
          loading={resetting}
          onConfirm={handleResetOperator}
          onClose={() => setResetOpen(false)}
        />
      )}
    </div>
  )
}

/* ═════════════════════════ Main slide-over ═════════════════════════ */
export default function CoordinatorSlideOver({ requestId, onClose, onChanged }) {
  useEscapeKey(onClose)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canPut = hasPermission('COORDINATOR', 'canPut')
  const canPostPerm = hasPermission('COORDINATOR', 'canPost')
  const canDeletePerm = hasPermission('COORDINATOR', 'canDelete')
  const canDispatchPerm = hasPermission('COORDINATOR', 'canDispatch')
  const canDeliverPerm = hasPermission('COORDINATOR', 'canDeliver')

  const [tab, setTab] = useState('negotiate')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailsEqId, setDetailsEqId] = useState(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)

  const refresh = () => {
    if (!requestId) return
    setLoading(true)
    coordinatorApi.getPlan(requestId)
      .then((res) => setData(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [requestId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Status dəyişdikdə uyğun tab'a keç
  useEffect(() => {
    if (!data) return
    const s = data.requestStatus
    if (tab === 'negotiate' && PHASE_B_STATUSES.includes(s)) {
      setTab('execute')
    }
    if (tab === 'execute' && !PHASE_B_STATUSES.includes(s)) {
      setTab(s === PHASE_A_STATUS ? 'negotiate' : 'info')
    }
  }, [data?.requestStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleReject = async () => {
    setRejecting(true)
    try {
      await coordinatorApi.rejectRequest(requestId)
      toast.success('Sorğu rədd edildi')
      setRejectOpen(false)
      refresh()
      onChanged?.()
    } catch {} finally {
      setRejecting(false)
    }
  }

  const handleWithdrawOffer = async (reason) => {
    setWithdrawing(true)
    try {
      await coordinatorApi.withdrawOffer(requestId, reason)
      toast.success('Təklif geri alındı — yenidən danışıq')
      setWithdrawOpen(false)
      refresh()
      onChanged?.()
    } catch { /* xəta interceptor-də göstərilir */ } finally {
      setWithdrawing(false)
    }
  }

  if (!requestId) return null

  const status = data ? (STATUS_CFG[data.requestStatus] || STATUS_CFG.COORDINATOR_NEGOTIATING) : null
  const projectType = data ? PROJECT_TYPES.find((t) => t.value === data.projectType) : null
  const code = data?.requestCode || '...'
  const editablePhaseA = data?.requestStatus === PHASE_A_STATUS && canPut
  const canReject = canPut && data && ['COORDINATOR_NEGOTIATING'].includes(data.requestStatus)
  const canWithdraw = canPut && data?.requestStatus === 'COORDINATOR_PROPOSED'

  return (
    <>
      <div className="ces-drawer-backdrop" onClick={onClose} />
      <div className="ces-drawer">
        {/* Header */}
        <div className="ces-drawer-head">
          <div className="ces-m-ic" style={{ background: 'var(--ces-purple, #9333ea)', color: 'white' }}>
            <ClipboardList size={20} />
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
              {data?.hasPendingSubmit && (
                <span className="ces-pill sm ces-p-warn">
                  <span className="d"></span>
                  Təsdiq gözləyir
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="ces-row-act" title="Bağla">
            <X size={16} />
          </button>
        </div>

        {/* Tabs — mərhələyə görə filtrlənir */}
        <div className="ces-tabs" style={{ padding: '0 12px', overflowX: 'auto', flexWrap: 'nowrap' }}>
          {TABS
            .filter((t) => {
              if (t.id === 'negotiate') return data?.requestStatus === PHASE_A_STATUS
              if (t.id === 'execute') return PHASE_B_STATUSES.includes(data?.requestStatus)
              return true
            })
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
                  {t.id === 'negotiate' && data?.shortlistItems?.length > 0 && (
                    <span className="ml-1 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full px-1.5 py-0.5">
                      {data.shortlistItems.length}
                    </span>
                  )}
                  {t.id === 'execute' && data?.requestStatus === 'DELIVERED' && (
                    <span className="ml-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full px-1.5 py-0.5">
                      ✓
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
                <p className="ces-sec-label mb-3 inline-flex items-center gap-1.5">
                  <Building2 size={11} /> Müştəri
                </p>
                <div className="grid grid-cols-2 gap-3.5">
                  <InfoField label="Şirkət" value={data.companyName} />
                  <InfoField label="VÖEN" value={data.customerVoen} mono />
                  <InfoField label="Əlaqə şəxsi" value={dash(data.contactPerson)} />
                  <InfoField label="Telefon" value={dash(data.contactPhone)} mono />
                  <InfoField label="Ünvan" value={dash(data.customerAddress)} />
                </div>
              </div>

              {/* Sifarişçi ofis əlaqəsi */}
              {(data.customerOfficeContactPerson || data.customerOfficeContactPhone) && (
                <div>
                  <p className="ces-sec-label mb-3 inline-flex items-center gap-1.5">
                    <User size={11} /> Sifarişçi ofisi
                  </p>
                  <div className="grid grid-cols-2 gap-3.5">
                    <InfoField label="Əlaqə şəxsi" value={dash(data.customerOfficeContactPerson)} />
                    <InfoField label="Telefon" value={dash(data.customerOfficeContactPhone)} mono />
                  </div>
                </div>
              )}

              {/* Layihə */}
              <div>
                <p className="ces-sec-label mb-3 inline-flex items-center gap-1.5">
                  <MapPin size={11} /> Layihə
                </p>
                <div className="grid grid-cols-2 gap-3.5">
                  <InfoField label="Layihə adı" value={dash(data.projectName)} />
                  <InfoField label="Bölgə" value={dash(data.region)} />
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
            </div>
          ) : tab === 'negotiate' ? (
            <div style={{ padding: 22 }}>
              <NegotiateTab
                data={data}
                requestId={requestId}
                editable={editablePhaseA}
                onSaved={() => { refresh(); onChanged?.() }}
                onShowEquipmentDetails={setDetailsEqId}
              />
            </div>
          ) : tab === 'execute' ? (
            <div style={{ padding: 22 }}>
              <ExecuteTab
                data={data}
                requestId={requestId}
                canPut={canPut}
                canDispatch={canDispatchPerm}
                canDeliver={canDeliverPerm}
                canPost={canPostPerm}
                canDelete={canDeletePerm}
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

        {/* Footer — reject */}
        {!loading && data && canReject && !rejectOpen && tab === 'info' && (
          <div className="ces-drawer-foot">
            <button
              onClick={() => setRejectOpen(true)}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors inline-flex items-center gap-1.5"
            >
              <XCircle size={14} />
              Rədd et
            </button>
          </div>
        )}

        {/* Footer — təklifi geri al (COORDINATOR_PROPOSED) */}
        {!loading && data && canWithdraw && (
          <div className="ces-drawer-foot">
            <button
              onClick={() => setWithdrawOpen(true)}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors inline-flex items-center gap-1.5"
            >
              <CornerUpLeft size={14} />
              Təklifi geri al
            </button>
          </div>
        )}

        {withdrawOpen && (
          <ReasonPromptModal
            title="Təklifi geri al"
            message="Təklif geri alınır və sorğu yenidən danışığa qayıdır. Seçilmiş texnika sərbəstləşir."
            confirmLabel="Geri al"
            loading={withdrawing}
            onConfirm={handleWithdrawOffer}
            onClose={() => setWithdrawOpen(false)}
          />
        )}

        {rejectOpen && (
          <div className="ces-drawer-foot" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--ces-danger)' }}>
              <AlertTriangle size={14} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Sorğunu rədd etmək istədiyinizə əminsiniz?</span>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRejectOpen(false)}
                disabled={rejecting}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Ləğv
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
              >
                <XCircle size={14} />
                {rejecting ? 'Gözləyin...' : 'Təsdiqlə'}
              </button>
            </div>
          </div>
        )}

        {detailsEqId && (
          <EquipmentDetailsModal
            equipmentId={detailsEqId}
            onClose={() => setDetailsEqId(null)}
          />
        )}
      </div>
    </>
  )
}
