import { useState, useEffect } from 'react'
import { X, Check, XCircle, Clock, Trash2, Pencil } from 'lucide-react'
import { approvalApi } from '../../api/approval'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const FIELD_LABELS = {
  // Ümumi
  createdAt: 'Yaradılma tarixi', updatedAt: 'Yenilənmə tarixi',
  // Şirkət/Müştəri/Podratçı/İnvestor
  companyName: 'Şirkət adı', voen: 'VÖEN', contactPerson: 'Əlaqə şəxsi',
  phone: 'Telefon', address: 'Ünvan', notes: 'Qeydlər',
  status: 'Status', riskLevel: 'Risk səviyyəsi', rating: 'Reytinq',
  paymentType: 'Ödəniş növü', email: 'E-poçt',
  investmentAmount: 'İnvestisiya məbləği', sharePercent: 'Pay faizi',
  // Operator
  firstName: 'Ad', lastName: 'Soyad', specialization: 'İxtisas', busy: 'Məşğul',
  // Texnika
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
  // Koordinator planı
  equipmentPrice: 'Texnika qiyməti', transportationPrice: 'Nəqliyyat qiyməti',
  operatorPayment: 'Operator haqqı', contractorDailyRate: 'Podratçı/İnvestor günlük', contractorPayment: 'Podratçı/İnvestor cəmi',
  dayCount: 'Gün sayı', startDate: 'Başlanğıc tarixi', endDate: 'Bitmə tarixi',
  operatorName: 'Operator', selectedEquipmentCode: 'Seçilmiş texnika',
  // Faktura
  invoiceNumber: 'Faktura nömrəsi', amount: 'Məbləğ', invoiceDate: 'Faktura tarixi',
  equipmentName: 'Texnika adı', serviceDescription: 'Xidmət təsviri',
  etaxesId: 'ETaxes ID', invoiceType: 'Faktura növü',
  projectCode: 'Layihə kodu', contractorName: 'Podratçı',
  // Sorğu
  requestCode: 'Sorğu kodu', requestType: 'Sorğu növü', projectType: 'Layihə növü',
  location: 'Yer', description: 'Təsvir', requestDate: 'Sorğu tarixi',
}

// ID, texniki daxili sahələr — diff-də göstərilməsin
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

const STATUS_CLS = {
  PENDING:  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  APPROVED: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  REJECTED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
}
const STATUS_LABEL = { PENDING: 'Gözləyir', APPROVED: 'Təsdiqləndi', REJECTED: 'Rədd edildi' }

function formatValue(val) {
  if (val === null || val === undefined) return <span className="text-gray-400 italic text-xs">—</span>
  if (typeof val === 'boolean') return val ? 'Bəli' : 'Xeyr'
  if (Array.isArray(val)) {
    if (val.length === 0) return <span className="text-gray-400 italic text-xs">Boş</span>
    // safetyEquipment kimi {id, name} array-ları
    if (val[0] && typeof val[0] === 'object' && val[0].name) {
      return <span className="text-xs text-gray-600">{val.map(v => v.name).join(', ')}</span>
    }
    return <span className="text-xs text-gray-500">{val.join(', ')}</span>
  }
  if (typeof val === 'object') {
    if (val.name) return String(val.name)
    return <span className="text-xs text-gray-500">{JSON.stringify(val)}</span>
  }
  return String(val)
}

function DiffTable({ oldSnap, newSnap, isDelete, moduleCode }) {
  if (!oldSnap) return <p className="text-sm text-gray-400 py-4 text-center">Köhnə məlumat yoxdur</p>

  // Submit əməliyyatı: newSnap yoxdur, amma delete deyil (status keçidi)
  if (!isDelete && !newSnap) {
    const keys = Object.keys(oldSnap).filter(k => !FIELD_EXCLUDE.has(k) && oldSnap[k] != null && oldSnap[k] !== '' && !(Array.isArray(oldSnap[k]) && oldSnap[k].length === 0))
    return (
      <div>
        <div className="mb-4 px-3 py-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
            Bu plan təsdiqləndikdən sonra <span className="font-bold">layihə kimi göndəriləcək</span> — status "Gözdən keçirilir" olaraq dəyişəcək.
          </p>
        </div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Planın cari vəziyyəti</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {keys.map(key => (
                <tr key={key} className="border-b border-gray-50 dark:border-gray-700/50">
                  <td className="py-2 px-3 text-xs text-gray-400 dark:text-gray-500 w-1/3 font-medium">{FIELD_LABELS[key] || key}</td>
                  <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{formatValue(oldSnap[key])}</td>
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-1/3">Sahə</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-red-500">Silinəcək dəyər</th>
            </tr>
          </thead>
          <tbody>
            {allKeys.map(key => (
              <tr key={key} className="border-b border-gray-50 dark:border-gray-700/50">
                <td className="py-2 px-3 text-xs text-gray-500 dark:text-gray-400 font-medium">{FIELD_LABELS[key] || key}</td>
                <td className="py-2 px-3 bg-red-50/50 dark:bg-red-900/10 text-red-700 dark:text-red-400">
                  {formatValue(oldSnap[key])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const changedKeys = allKeys.filter(k => JSON.stringify(oldSnap?.[k]) !== JSON.stringify(newSnap?.[k]))
  const unchangedKeys = allKeys.filter(k => JSON.stringify(oldSnap?.[k]) === JSON.stringify(newSnap?.[k]))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-700">
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-1/4">Sahə</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-red-500 w-[37.5%]">Köhnə dəyər</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-green-600 w-[37.5%]">Yeni dəyər</th>
          </tr>
        </thead>
        <tbody>
          {changedKeys.map(key => (
            <tr key={key} className="border-b border-gray-50 dark:border-gray-700/50 bg-amber-50/30 dark:bg-amber-900/5">
              <td className="py-2 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300">{FIELD_LABELS[key] || key}</td>
              <td className="py-2 px-3 bg-red-50/60 dark:bg-red-900/10 text-red-700 dark:text-red-400 line-through decoration-red-400">
                {formatValue(oldSnap?.[key])}
              </td>
              <td className="py-2 px-3 bg-green-50/60 dark:bg-green-900/10 text-green-700 dark:text-green-400 font-medium">
                {formatValue(newSnap?.[key])}
              </td>
            </tr>
          ))}
          {unchangedKeys.map(key => (
            <tr key={key} className="border-b border-gray-50 dark:border-gray-700/50">
              <td className="py-2 px-3 text-xs text-gray-400 dark:text-gray-500">{FIELD_LABELS[key] || key}</td>
              <td className="py-2 px-3 text-gray-500 dark:text-gray-400 text-xs">{formatValue(oldSnap?.[key])}</td>
              <td className="py-2 px-3 text-gray-400 dark:text-gray-500 text-xs">—</td>
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
    } catch {
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
    } catch {
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="h-5 w-40 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              <>
                <span className={clsx(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border',
                  detail?.operationType === 'DELETE'
                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                    : detail?.moduleCode === 'COORDINATOR'
                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800'
                      : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                )}>
                  {detail?.operationType === 'DELETE' ? <Trash2 size={10} /> : <Pencil size={10} />}
                  {detail?.operationType === 'DELETE'
                    ? 'Silmə'
                    : detail?.moduleCode === 'COORDINATOR'
                      ? 'Təklif hazırlanması'
                      : 'Redaktə'}
                </span>
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                  {detail?.entityLabel || '—'}
                </h2>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {MODULE_LABEL[detail?.moduleCode] || detail?.moduleCode}
                </span>
              </>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Meta */}
        {!loading && detail && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>
              <span className="font-medium text-gray-700 dark:text-gray-300">Edən: </span>
              {detail.performedByName || '—'}
            </span>
            <span>
              <span className="font-medium text-gray-700 dark:text-gray-300">Şöbə: </span>
              {detail.performerDepartmentName || '—'}
            </span>
            <span>
              <span className="font-medium text-gray-700 dark:text-gray-300">Tarix: </span>
              {detail.createdAt ? new Date(detail.createdAt).toLocaleString('az-AZ') : '—'}
            </span>
            <span className={clsx('px-2 py-0.5 rounded-full border font-semibold', STATUS_CLS[detail.status])}>
              {STATUS_LABEL[detail.status]}
            </span>
            {detail.status === 'REJECTED' && detail.rejectReason && (
              <span className="text-red-600 dark:text-red-400">
                <span className="font-medium">Səbəb: </span>{detail.rejectReason}
              </span>
            )}
          </div>
        )}

        {/* Diff */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
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
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
            {rejectMode ? (
              <div className="space-y-3">
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Rədd etmə səbəbini yazın..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setRejectMode(false); setRejectReason('') }}
                    className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Ləğv et
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={acting}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
                  >
                    <XCircle size={14} />
                    {acting ? 'Göndərilir...' : 'Rədd et'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setRejectMode(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold rounded-lg transition-colors"
                >
                  <XCircle size={14} />
                  Rədd et
                </button>
                <button
                  onClick={handleApprove}
                  disabled={acting}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
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
