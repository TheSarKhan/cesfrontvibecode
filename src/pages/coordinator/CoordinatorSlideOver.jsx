import { useState, useEffect, useMemo } from 'react'
import {
  X, Info, FileText, MessageSquare, ClipboardList, Building2, MapPin,
  Calendar, CheckCircle, XCircle, AlertTriangle, Send, Save, Truck,
  Phone, User, Trophy, DollarSign,
  PackageCheck, UserPlus, FileCheck, ShieldCheck, Plus, CornerUpLeft,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { coordinatorApi } from '../../api/coordinator'
import { operatorsApi } from '../../api/operators'
import { STATUS_CFG, PROJECT_TYPES, fmtDate, dash } from '../../constants/requests'
import { fmtDateTime } from '../../utils/date'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import ReasonPromptModal from '../../components/common/ReasonPromptModal'
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
  // Local form state
  const [rows, setRows] = useState([])      // {itemId, partyType, contractorId, investorId, equipmentId, negotiatedPrice}
  const [winnerItemId, setWinnerItemId] = useState(null)
  const [customerEquipmentPrice, setCustomerEquipmentPrice] = useState('')   // sifarişçiyə təklif
  const [transportationPrice, setTransportationPrice] = useState('')
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const items = data?.shortlistItems || []
    setRows(items.map((it) => ({
      itemId: it.id,
      partyType: it.partyType,
      contractorId: it.contractorId,
      investorId: it.investorId,
      equipmentId: it.equipmentId,
      negotiatedPrice: it.negotiatedPrice ?? '',
      // display data
      contractorName: it.contractorName,
      contractorPhone: it.contractorPhone,
      contractorContactPerson: it.contractorContactPerson,
      contractorAddress: it.contractorAddress,
      investorName: it.investorName,
      investorPhone: it.investorPhone,
      investorContactPerson: it.investorContactPerson,
      investorAddress: it.investorAddress,
      equipmentName: it.equipmentName,
      equipmentCode: it.equipmentCode,
      equipmentType: it.equipmentType,
      equipmentBrand: it.equipmentBrand,
      equipmentModel: it.equipmentModel,
      equipmentYear: it.equipmentYear,
    })))
    setWinnerItemId(data?.winnerItemId ?? null)
    setCustomerEquipmentPrice(data?.customerEquipmentPrice ?? '')
    setTransportationPrice(data?.transportationPrice ?? '')
    setNotes(data?.notes ?? '')
  }, [data?.shortlistItems, data?.winnerItemId, data?.customerEquipmentPrice, data?.transportationPrice, data?.notes])

  const updateRowPrice = (idx, value) => {
    setRows((r) => r.map((row, i) => i === idx ? { ...row, negotiatedPrice: value } : row))
  }

  const buildPayload = () => {
    const winnerRow = rows.find((r) => r.itemId === winnerItemId)
    // equipmentPrice = bizim ödəyəcəyimiz (cost). Şirkət texnikasında 0.
    let equipmentPrice = null
    if (winnerRow) {
      if (winnerRow.partyType === 'COMPANY') {
        equipmentPrice = 0
      } else if (winnerRow.negotiatedPrice !== '') {
        equipmentPrice = Number(winnerRow.negotiatedPrice)
      }
    }
    return {
      winnerItemId: winnerItemId,
      equipmentPrice,
      customerEquipmentPrice: customerEquipmentPrice !== '' ? Number(customerEquipmentPrice) : null,
      transportationPrice: transportationPrice !== '' ? Number(transportationPrice) : null,
      notes: notes || null,
      shortlistRows: rows.map((r) => ({
        itemId: r.itemId,
        // Şirkət sətrində negotiatedPrice yoxdur
        negotiatedPrice: r.partyType === 'COMPANY'
          ? null
          : (r.negotiatedPrice !== '' ? Number(r.negotiatedPrice) : null),
      })),
    }
  }

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
    if (!winnerItemId) return toast.error('Qalib sətr seçilməyib')
    const winnerRow = rows.find((r) => r.itemId === winnerItemId)
    if (!winnerRow) return toast.error('Qalib sətr tapılmadı')
    // Şirkət texnikasında ödəniş tələb olunmur
    if (winnerRow.partyType !== 'COMPANY') {
      if (winnerRow.negotiatedPrice === '' || Number(winnerRow.negotiatedPrice) <= 0) {
        return toast.error('Qalibə ödəniləcək qiymət daxil edilməlidir')
      }
    }
    if (customerEquipmentPrice === '' || Number(customerEquipmentPrice) <= 0) {
      return toast.error('Sifarişçiyə təklif edilən qiymət daxil edilməlidir')
    }

    setSubmitting(true)
    try {
      // Save before submit (sync)
      await coordinatorApi.savePlan(requestId, buildPayload())
      await coordinatorApi.submitPlan(requestId)
      toast.success('Təklif PM-ə göndərildi')
      onSaved?.()
    } catch (err) {
      if (err?.isPending) {
        onSaved?.()
      }
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

  const projectTypeLabel = data?.projectType === 'MONTHLY' ? 'Aylıq' : data?.projectType === 'DAILY' ? 'Günlük' : '—'
  const unitLabel = data?.projectType === 'MONTHLY' ? 'ay' : 'gün'
  const units = data?.dayCount && data.dayCount > 0 ? data.dayCount : 1

  const winnerRow = rows.find((r) => r.itemId === winnerItemId)
  // Şirkət texnikasında ödəniş yoxdur — xərc 0
  const winnerCostUnit = winnerRow
    ? (winnerRow.partyType === 'COMPANY' ? 0 : (winnerRow.negotiatedPrice !== '' ? Number(winnerRow.negotiatedPrice) : 0))
    : 0
  const customerPriceUnit = customerEquipmentPrice !== '' ? Number(customerEquipmentPrice) : 0
  const transportNum = transportationPrice !== '' ? Number(transportationPrice) : 0

  // Per-unit (gün/ay) və cəm məbləğlər
  const profitPerUnit = customerPriceUnit - winnerCostUnit
  const costTotal = winnerCostUnit * units
  const revenueTotal = customerPriceUnit * units + transportNum
  const profitTotal = revenueTotal - costTotal

  const fmt = (v) => Number(v || 0).toLocaleString('az-AZ', { minimumFractionDigits: 2 })

  return (
    <div className="flex flex-col gap-4">
      {/* Project type banner */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 px-3 py-2 flex items-center gap-3">
        <Calendar size={13} className="text-blue-600 shrink-0" />
        <div className="flex-1 text-xs">
          <span className="font-bold text-blue-700 dark:text-blue-300">{projectTypeLabel}</span>
          {data?.dayCount && <span className="text-blue-600/80 dark:text-blue-400/80"> · {data.dayCount} {data.projectType === 'MONTHLY' ? 'ay' : 'gün'}</span>}
          <span className="ml-2 text-gray-500">qiymətləri buna uyğun təyin edin</span>
        </div>
      </div>

      {/* Shortlist rows */}
      <div>
        <p className="ces-sec-label mb-2 inline-flex items-center gap-1.5">
          <ClipboardList size={11} /> Shortlist ({rows.length}) — ödəyəcəyimiz qiymət
        </p>
        <div className="flex flex-col gap-2.5">
          {rows.map((row, idx) => {
            const isWinner = row.itemId === winnerItemId
            const isContractor = row.partyType === 'CONTRACTOR'
            const isInvestor = row.partyType === 'INVESTOR'
            const isCompany = row.partyType === 'COMPANY'
            const partyName = isContractor ? row.contractorName
              : isInvestor ? row.investorName
                : 'Şirkət'
            const partyPhone = isContractor ? row.contractorPhone
              : isInvestor ? row.investorPhone
                : null
            const partyContact = isContractor ? row.contractorContactPerson
              : isInvestor ? row.investorContactPerson
                : null
            const partyAddress = isContractor ? row.contractorAddress
              : isInvestor ? row.investorAddress
                : null

            return (
              <div
                key={row.itemId}
                className={clsx(
                  'rounded-xl border p-3 transition-all',
                  isWinner
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
                    {isWinner && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-600 text-white text-[10px] font-bold">
                        <Trophy size={10} /> Qalib
                      </span>
                    )}
                  </div>
                  {editable && (
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-gray-600 dark:text-gray-300">
                      <input
                        type="radio"
                        name="winner"
                        checked={isWinner}
                        onChange={() => setWinnerItemId(row.itemId)}
                        className="accent-purple-600"
                      />
                      Qalib seç
                    </label>
                  )}
                </div>

                {/* Party info */}
                <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Ad</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{partyName || '—'}</p>
                  </div>
                  {partyContact && (
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide flex items-center gap-1"><User size={9} /> Əlaqə şəxsi</p>
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
                  {partyAddress && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Ünvan</p>
                      <p className="text-gray-600 dark:text-gray-400">{partyAddress}</p>
                    </div>
                  )}
                </div>

                {/* Equipment */}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
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

                {/* Şirkət texnikasında ödəyəcəyimiz qiymət yoxdur */}
                {row.partyType === 'COMPANY' ? (
                  <div className="mt-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
                    <Info size={11} className="inline mr-1" />
                    Şirkət texnikası — heç kimə ödəniş yoxdur (xərc 0)
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 shrink-0 flex items-center gap-1">
                      <DollarSign size={11} /> Ödəyəcəyimiz qiymət/{unitLabel}:
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.negotiatedPrice}
                      onChange={(e) => updateRowPrice(idx, e.target.value)}
                      placeholder="0.00"
                      disabled={!editable}
                      className={`${inputCls} flex-1`}
                    />
                    <span className="text-xs text-gray-500">₼/{unitLabel}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Sifarişçi təklifi (revenue) */}
      <div>
        <p className="ces-sec-label mb-2 inline-flex items-center gap-1.5">
          <DollarSign size={11} /> Sifarişçiyə təklif (xidmət qiyməti)
        </p>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10 p-3.5">
          <label className={labelCls}>
            Texnika qiyməti/{unitLabel} — sifarişçiyə təklif (₼)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={customerEquipmentPrice}
            onChange={(e) => setCustomerEquipmentPrice(e.target.value)}
            placeholder="0.00"
            disabled={!editable}
            className={inputCls}
          />

          {data?.transportationRequired && (
            <div className="mt-3">
              <label className={labelCls}>
                <Truck size={10} className="inline mr-0.5" />
                Daşınma qiyməti — birdəfəlik (₼)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={transportationPrice}
                onChange={(e) => setTransportationPrice(e.target.value)}
                placeholder="0.00"
                disabled={!editable}
                className={inputCls}
              />
            </div>
          )}

          {/* Profit özeti — per-unit + transport, ayrıca cəm */}
          {(winnerCostUnit > 0 || customerPriceUnit > 0) && (
            <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800 space-y-2">
              {/* Per-unit + transport detallı sətr */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400 font-semibold">Şirkət xeyri</span>
                <span className="mono font-bold">
                  <span className={clsx(profitPerUnit >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                    {fmt(profitPerUnit)} ₼/{unitLabel}
                  </span>
                  {transportNum > 0 && (
                    <>
                      <span className="text-gray-500"> + </span>
                      <span className="text-emerald-700">{fmt(transportNum)} ₼ daşınma</span>
                    </>
                  )}
                </span>
              </div>

              {/* 3 sütun cəm */}
              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-emerald-100 dark:border-emerald-900">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">Ödəyəcəyimiz</p>
                  <p className="text-sm font-bold mono text-red-600">{fmt(costTotal)} ₼</p>
                  <p className="text-[10px] text-gray-400">{units} {unitLabel} × {fmt(winnerCostUnit)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">Sifarişçidən</p>
                  <p className="text-sm font-bold mono text-emerald-700">{fmt(revenueTotal)} ₼</p>
                  <p className="text-[10px] text-gray-400">{units} {unitLabel} × {fmt(customerPriceUnit)} {transportNum > 0 ? ` + ${fmt(transportNum)}` : ''}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">Cəm xeyir</p>
                  <p className={clsx('text-sm font-bold mono', profitTotal >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                    {fmt(profitPerUnit)}/{unitLabel}{transportNum > 0 ? ` + ${fmt(transportNum)} ₼` : ''}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelCls}>Koordinator qeydi</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Danışıq detalları, müddət, əlavə şərtlər..."
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

function ExecuteTab({ data, requestId, canPut, canDispatch, canDeliver, onSaved }) {
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

  useEffect(() => {
    if (operatorAssigned) return
    setOperatorsLoading(true)
    operatorsApi.getAll()
      .then((r) => setOperators(r.data.data || r.data || []))
      .catch(() => {})
      .finally(() => setOperatorsLoading(false))
  }, [operatorAssigned])

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
          <div className="space-y-2">
            {data?.equipmentDocumentTypes && data.equipmentDocumentTypes.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {data.equipmentDocumentTypes.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                    <FileCheck size={9} />
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 italic">Texnikada yüklənmiş sənəd siyahısı yoxdur</p>
            )}
            <button
              onClick={handleVerify}
              disabled={!canPut || verifying || !operatorAssigned}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
            >
              <ShieldCheck size={13} />
              {verifying ? 'Təsdiqlənir...' : 'Sənədlər yoxlandı'}
            </button>
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
              disabled={!canDeliver || delivering || !dispatched}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
            >
              <CheckCircle size={13} />
              {delivering ? 'Tamamlanır...' : 'Təhvil-təslim tamamla'}
            </button>
            {!canDeliver && (
              <p className="text-[10px] text-amber-600 inline-flex items-center gap-1">
                <AlertTriangle size={10} /> "Təhvil-təslim" icazəsi yoxdur
              </p>
            )}
          </div>
        )}
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
