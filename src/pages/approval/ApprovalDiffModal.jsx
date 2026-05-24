import { useState, useEffect } from 'react'
import { X, Check, XCircle, Trash2, Pencil } from 'lucide-react'
import { approvalApi } from '../../api/approval'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const FIELD_LABELS = {
  createdAt: 'Yaradılma tarixi', updatedAt: 'Yenilənmə tarixi',
  companyName: 'Şirkət adı', voen: 'VÖEN', contactPerson: 'Əlaqə şəxsi',
  phone: 'Telefon', address: 'Ünvan', notes: 'Qeydlər',
  status: 'Status', riskLevel: 'Risk səviyyəsi', rating: 'Reytinq',
  paymentType: 'Ödəniş növü', email: 'E-poçt',
  investmentAmount: 'İnvestisiya məbləği', sharePercent: 'Pay faizi',
  firstName: 'Ad', lastName: 'Soyad', specialization: 'İxtisas', busy: 'Məşğul',
  equipmentCode: 'Texnika kodu', name: 'Adı', type: 'Növ', brand: 'Marka', model: 'Model',
  serialNumber: 'Seriya nömrəsi', plateNumber: 'Qeydiyyat nişanı',
  yearOfManufacture: 'İstehsal ili', manufactureYear: 'İstehsal ili',
  ownershipType: 'Mülkiyyət növü',
  dailyRate: 'Günlük tarif', monthlyRate: 'Aylıq tarif',
  purchaseDate: 'Alış tarixi', purchasePrice: 'Alış qiyməti',
  currentMarketValue: 'Cari bazar dəyəri', depreciationRate: 'Amortizasiya faizi (%)',
  hourKmCounter: 'Saat/Km sayğacı', motoHours: 'Moto saatlar',
  weightTon: 'Çəki (ton)', storageLocation: 'Saxlanma yeri',
  responsibleUserName: 'Məsul şəxs',
  ownerContractorName: 'Sahibi (podratçı)', ownerContractorVoen: 'Sahibi VÖEN',
  ownerContractorPhone: 'Sahibi telefon', ownerContractorContact: 'Sahibi əlaqə şəxsi',
  ownerInvestorName: 'Sahibi (investor)', ownerInvestorVoen: 'Sahibi VÖEN',
  ownerInvestorPhone: 'Sahibi telefon',
  lastInspectionDate: 'Son texniki baxış', nextInspectionDate: 'Növbəti texniki baxış',
  technicalReadinessStatus: 'Texniki hazırlıq', repairStatus: 'Təmir statusu',
  safetyEquipment: 'Təhlükəsizlik avadanlığı',
  equipmentPrice: 'Texnika qiyməti', transportationPrice: 'Nəqliyyat qiyməti',
  operatorPayment: 'Operator haqqı', contractorDailyRate: 'Podratçı/İnvestor günlük', contractorPayment: 'Podratçı/İnvestor cəmi',
  dayCount: 'Gün sayı', startDate: 'Başlanğıc tarixi', endDate: 'Bitmə tarixi',
  operatorName: 'Operator', selectedEquipmentCode: 'Seçilmiş texnika',
  invoiceNumber: 'Faktura nömrəsi', amount: 'Məbləğ', invoiceDate: 'Faktura tarixi',
  equipmentName: 'Texnika adı', serviceDescription: 'Xidmət təsviri',
  etaxesId: 'ETaxes ID', invoiceType: 'Faktura növü',
  projectCode: 'Layihə kodu', contractorName: 'Podratçı',
  requestCode: 'Sorğu kodu', requestType: 'Sorğu növü', projectType: 'Layihə növü',
  location: 'Yer', description: 'Təsvir', requestDate: 'Sorğu tarixi',
}

const FIELD_EXCLUDE = new Set([
  'id', 'deleted', 'deletedAt', 'documents', 'images', 'inspections',
  'projectHistory', 'params', 'responsibleUserId',
  'ownerContractorId', 'ownerInvestorId', 'selectedEquipmentId', 'operatorId',
])

const MODULE_LABEL = {
  CUSTOMER_MANAGEMENT: 'Müştərilər',
  CONTRACTOR_MANAGEMENT: 'Podratçılar',
  INVESTORS: 'İnvestorlar',
  OPERATORS: 'Operatorlar',
  EMPLOYEE_MANAGEMENT: 'İşçilər',
  GARAGE: 'Qaraj',
  REQUESTS: 'Sorğular',
  COORDINATOR: 'Koordinator',
  PROJECTS: 'Layihələr',
  ACCOUNTING: 'Mühasibatlıq',
  SERVICE_MANAGEMENT: 'Texniki Servis',
}

const STATUS_CFG = {
  PENDING:  { pill: 'ces-p-warn',   label: 'Gözləyir' },
  APPROVED: { pill: 'ces-p-ok',     label: 'Təsdiqləndi' },
  REJECTED: { pill: 'ces-p-danger', label: 'Rədd edildi' },
}

function formatValue(val) {
  if (val === null || val === undefined) return <span style={{ color: 'var(--ces-mute2)', fontStyle: 'italic', fontSize: 12 }}>—</span>
  if (typeof val === 'boolean') return val ? 'Bəli' : 'Xeyr'
  if (Array.isArray(val)) {
    if (val.length === 0) return <span style={{ color: 'var(--ces-mute2)', fontStyle: 'italic', fontSize: 12 }}>Boş</span>
    if (val[0] && typeof val[0] === 'object' && val[0].name) {
      return <span style={{ fontSize: 12, color: 'var(--ces-muted)' }}>{val.map(v => v.name).join(', ')}</span>
    }
    return <span style={{ fontSize: 12, color: 'var(--ces-muted)' }}>{val.join(', ')}</span>
  }
  if (typeof val === 'object') {
    if (val.name) return String(val.name)
    return <span style={{ fontSize: 12, color: 'var(--ces-muted)' }}>{JSON.stringify(val)}</span>
  }
  return String(val)
}

const diffStyles = {
  th: { textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ces-muted)', borderBottom: '1px solid var(--ces-line)' },
  tr: { borderBottom: '1px solid var(--ces-line-2)' },
  fieldTd: { padding: '10px 14px', fontSize: 12.5, color: 'var(--ces-muted)', fontWeight: 600 },
  valTd: { padding: '10px 14px', fontSize: 13, color: 'var(--ces-ink)' },
  oldVal: { background: 'rgba(212, 56, 90, .05)', color: 'var(--ces-danger)' },
  newVal: { background: 'rgba(15, 157, 106, .06)', color: 'var(--ces-ok)', fontWeight: 600 },
}

function DiffTable({ oldSnap, newSnap, isDelete }) {
  if (!oldSnap) return <p className="text-sm py-4 text-center" style={{ color: 'var(--ces-mute2)' }}>Köhnə məlumat yoxdur</p>

  if (!isDelete && !newSnap) {
    const keys = Object.keys(oldSnap).filter(k => !FIELD_EXCLUDE.has(k) && oldSnap[k] != null && oldSnap[k] !== '' && !(Array.isArray(oldSnap[k]) && oldSnap[k].length === 0))
    return (
      <div>
        <div className="ces-alert gold mb-4">
          <div className="ces-al-ic"><Check size={18} /></div>
          <div style={{ fontSize: 13, color: 'var(--ces-graphite)' }}>
            Bu plan təsdiqləndikdən sonra <b>layihə kimi göndəriləcək</b> — status "Gözdən keçirilir" olaraq dəyişəcək.
          </div>
        </div>
        <p className="ces-sec-label mb-3">Planın cari vəziyyəti</p>
        <div className="overflow-x-auto" style={{ border: '1px solid var(--ces-line)', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {keys.map(key => (
                <tr key={key} style={diffStyles.tr}>
                  <td style={{ ...diffStyles.fieldTd, width: '32%' }}>{FIELD_LABELS[key] || key}</td>
                  <td style={diffStyles.valTd}>{formatValue(oldSnap[key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const allKeys = Array.from(new Set([
    ...Object.keys(oldSnap || {}),
    ...Object.keys(newSnap || {}),
  ])).filter(k => !FIELD_EXCLUDE.has(k))

  if (isDelete) {
    return (
      <div className="overflow-x-auto" style={{ border: '1px solid var(--ces-line)', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...diffStyles.th, width: '32%' }}>Sahə</th>
              <th style={{ ...diffStyles.th, color: 'var(--ces-danger)' }}>Silinəcək dəyər</th>
            </tr>
          </thead>
          <tbody>
            {allKeys.map(key => (
              <tr key={key} style={diffStyles.tr}>
                <td style={diffStyles.fieldTd}>{FIELD_LABELS[key] || key}</td>
                <td style={{ ...diffStyles.valTd, ...diffStyles.oldVal }}>
                  {formatValue(oldSnap[key])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const changedKeys   = allKeys.filter(k => JSON.stringify(oldSnap?.[k]) !== JSON.stringify(newSnap?.[k]))
  const unchangedKeys = allKeys.filter(k => JSON.stringify(oldSnap?.[k]) === JSON.stringify(newSnap?.[k]))

  return (
    <div className="overflow-x-auto" style={{ border: '1px solid var(--ces-line)', borderRadius: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...diffStyles.th, width: '24%' }}>Sahə</th>
            <th style={{ ...diffStyles.th, color: 'var(--ces-danger)', width: '38%' }}>Köhnə dəyər</th>
            <th style={{ ...diffStyles.th, color: 'var(--ces-ok)', width: '38%' }}>Yeni dəyər</th>
          </tr>
        </thead>
        <tbody>
          {changedKeys.map(key => (
            <tr key={key} style={{ ...diffStyles.tr, background: 'rgba(255, 244, 220, .35)' }}>
              <td style={{ ...diffStyles.fieldTd, color: 'var(--ces-ink)', fontWeight: 700 }}>{FIELD_LABELS[key] || key}</td>
              <td style={{ ...diffStyles.valTd, ...diffStyles.oldVal, textDecoration: 'line-through', textDecorationColor: 'rgba(212,56,90,.45)' }}>
                {formatValue(oldSnap?.[key])}
              </td>
              <td style={{ ...diffStyles.valTd, ...diffStyles.newVal }}>
                {formatValue(newSnap?.[key])}
              </td>
            </tr>
          ))}
          {unchangedKeys.map(key => (
            <tr key={key} style={diffStyles.tr}>
              <td style={diffStyles.fieldTd}>{FIELD_LABELS[key] || key}</td>
              <td style={{ ...diffStyles.valTd, color: 'var(--ces-muted)', fontSize: 12.5 }}>{formatValue(oldSnap?.[key])}</td>
              <td style={{ ...diffStyles.valTd, color: 'var(--ces-mute2)', fontSize: 12.5 }}>—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ApprovalDiffModal({ operationId, onClose, onActionDone }) {
  useEscapeKey(onClose)
  const { user } = useAuthStore()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [acting, setActing] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await approvalApi.getDetail(operationId)
        setDetail(res.data.data || res.data)
      } catch {
        onClose()
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [operationId])

  const canAct = user?.hasApproval && detail?.status === 'PENDING'

  const handleApprove = async () => {
    setActing(true)
    try {
      await approvalApi.approve(detail.id)
      toast.success('Əməliyyat təsdiqləndi')
      onActionDone()
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Təsdiq edilə bilmədi')
    } finally {
      setActing(false)
    }
  }

  const handleReject = async () => {
    setActing(true)
    try {
      await approvalApi.reject(detail.id, rejectReason.trim())
      toast.success('Əməliyyat rədd edildi')
      onActionDone()
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Rədd edilə bilmədi')
    } finally {
      setActing(false)
    }
  }

  const opType = detail?.operationType === 'DELETE'
    ? { pill: 'ces-p-danger', label: 'Silmə', Icon: Trash2 }
    : detail?.moduleCode === 'COORDINATOR'
      ? { pill: 'ces-p-gold', label: 'Təklif hazırlanması', Icon: Pencil }
      : { pill: 'ces-p-info', label: 'Redaktə', Icon: Pencil }
  const OpIcon = opType.Icon

  const statusCfg = detail ? STATUS_CFG[detail.status] : null

  return (
    <div className="ces-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="ces-modal" style={{ maxWidth: 880 }}>
        {/* Header */}
        <div className="ces-m-head">
          {loading ? (
            <div className="animate-pulse" style={{ height: 20, width: 240, borderRadius: 6, background: 'var(--ces-graphite-50)' }} />
          ) : (
            <>
              <div className="ces-m-ic gold">
                <OpIcon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="flex items-center gap-2 flex-wrap">
                  <span className={clsx('ces-pill sm', opType.pill)}>
                    <OpIcon size={11} />
                    {opType.label}
                  </span>
                  <span className="truncate">{detail?.entityLabel || '—'}</span>
                </h3>
                <p>{MODULE_LABEL[detail?.moduleCode] || detail?.moduleCode}</p>
              </div>
            </>
          )}
          <button onClick={onClose} className="ces-modal-x" type="button" aria-label="Bağla">
            <X size={16} />
          </button>
        </div>

        {/* Meta */}
        {!loading && detail && (
          <div
            className="flex flex-wrap gap-4 items-center"
            style={{
              padding: '14px 26px',
              borderBottom: '1px solid var(--ces-line)',
              background: '#fbfaf6',
              fontSize: 12.5,
            }}
          >
            <span style={{ color: 'var(--ces-muted)' }}>
              <b style={{ color: 'var(--ces-ink)', fontWeight: 600 }}>Edən:</b> {detail.performedByName || '—'}
            </span>
            <span style={{ color: 'var(--ces-muted)' }}>
              <b style={{ color: 'var(--ces-ink)', fontWeight: 600 }}>Şöbə:</b> {detail.performerDepartmentName || '—'}
            </span>
            <span className="mono" style={{ color: 'var(--ces-muted)' }}>
              <b style={{ color: 'var(--ces-ink)', fontWeight: 600 }}>Tarix:</b>{' '}
              {detail.createdAt ? new Date(detail.createdAt).toLocaleString('az-AZ') : '—'}
            </span>
            {statusCfg && (
              <span className={clsx('ces-pill sm', statusCfg.pill)}>
                <span className="d"></span>{statusCfg.label}
              </span>
            )}
            {detail.status === 'REJECTED' && detail.rejectReason && (
              <span style={{ color: 'var(--ces-danger)' }}>
                <b style={{ fontWeight: 600 }}>Səbəb:</b> {detail.rejectReason}
              </span>
            )}
          </div>
        )}

        {/* Diff */}
        <div className="ces-m-body">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse" style={{ height: 32, borderRadius: 8, background: 'var(--ces-graphite-50)' }} />
              ))}
            </div>
          ) : (
            <DiffTable
              oldSnap={detail?.oldSnapshot}
              newSnap={detail?.newSnapshot}
              isDelete={detail?.operationType === 'DELETE'}
              moduleCode={detail?.moduleCode}
            />
          )}
        </div>

        {/* Footer */}
        {canAct && !loading && (
          <div className="ces-m-foot" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
            {rejectMode ? (
              <>
                <div className="ces-input is-error" style={{ alignItems: 'flex-start', paddingTop: 4, paddingBottom: 4 }}>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Rədd etmə səbəbini yazın..."
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setRejectMode(false); setRejectReason('') }}
                    className="ces-btn ces-btn-ghost"
                  >
                    Ləğv et
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={acting}
                    className="ces-btn ces-btn-danger"
                  >
                    <XCircle size={14} />
                    {acting ? 'Göndərilir...' : 'Rədd et'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setRejectMode(true)}
                  className="ces-btn ces-btn-outline"
                  style={{ color: 'var(--ces-danger)', borderColor: 'rgba(212,56,90,.35)' }}
                >
                  <XCircle size={14} />
                  Rədd et
                </button>
                <button
                  onClick={handleApprove}
                  disabled={acting}
                  className="ces-btn"
                  style={{ background: 'var(--ces-ok)', color: '#fff' }}
                >
                  <Check size={14} />
                  {acting ? 'Göndərilir...' : 'Təsdiq et'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
