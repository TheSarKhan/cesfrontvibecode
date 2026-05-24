import { useState, useEffect } from 'react'
import { X, CheckCircle, Truck, PackageCheck, UserPlus, FileText, Eye } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { coordinatorApi } from '../../api/coordinator'
import { operatorsApi } from '../../api/operators'
import { useConfirm } from '../../components/common/ConfirmDialog'
import CoordinatorPlanModal from './CoordinatorPlanModal'

/**
 * Status-aware koordinator modal wrapper.
 *  - COORDINATOR_NEGOTIATING / COORDINATOR_PROPOSED: tam plan modal (CoordinatorPlanModal)
 *  - EXECUTION_READY: operator təyin modal
 *  - OPERATOR_ASSIGNED: sənəd verify + yükləmə modal
 *  - EQUIPMENT_DISPATCHED: təhvil-təslim modal (qeyd ilə)
 *  - DELIVERED / REJECTED: read-only summary modal
 */
export default function CoordinatorStageModal({ request, onClose, onSaved }) {
  const status = request.requestStatus

  // Danışıq mərhələsi (A) — mövcud tam modal
  if (status === 'COORDINATOR_NEGOTIATING' || status === 'COORDINATOR_PROPOSED') {
    return <CoordinatorPlanModal request={request} onClose={onClose} onSaved={onSaved} />
  }

  // İcra mərhələsi (B) — status-a görə spesifik modal
  if (status === 'EXECUTION_READY') {
    return <AssignOperatorModal request={request} onClose={onClose} onSaved={onSaved} />
  }
  if (status === 'OPERATOR_ASSIGNED') {
    return <DispatchModal request={request} onClose={onClose} onSaved={onSaved} />
  }
  if (status === 'EQUIPMENT_DISPATCHED') {
    return <DeliverModal request={request} onClose={onClose} onSaved={onSaved} />
  }

  // DELIVERED / REJECTED — yalnız oxu (təhvil-təslim qeydləri)
  return <ReadonlyModal request={request} onClose={onClose} />
}

// ─────────────────────────────────────────────────────────────────────────────

const overlayCls = 'fixed inset-0 z-50 flex items-center justify-center p-4'
const backdropStyle = { background: 'rgba(0,0,0,0.08)' }
const modalCls = 'relative z-10 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden'

function ModalHeader({ title, subtitle, code, onClose }) {
  return (
    <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
      <div>
        <span className="text-xs font-mono font-semibold text-purple-600 dark:text-purple-400">{code}</span>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mt-0.5">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <button onClick={onClose} className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 p-1.5 transition-colors">
        <X size={16} />
      </button>
    </div>
  )
}

// ─── EXECUTION_READY → OPERATOR_ASSIGNED ─────────────────────────────────────

function AssignOperatorModal({ request, onClose, onSaved }) {
  const [operators, setOperators] = useState([])
  const [operatorId, setOperatorId] = useState(request.operatorId || '')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    operatorsApi.getAll()
      .then(r => setOperators(r.data.data || []))
      .catch(() => {})
  }, [])

  const submit = async () => {
    if (!operatorId) {
      toast.error('Operator seçin')
      return
    }
    setBusy(true)
    try {
      await coordinatorApi.assignOperator(request.requestId, operatorId)
      toast.success('Operator təyin edildi')
      onSaved?.()
      onClose()
    } catch {} finally {
      setBusy(false)
    }
  }

  return (
    <div className={overlayCls}>
      <div className="absolute inset-0" style={backdropStyle} />
      <div className={modalCls}>
        <ModalHeader
          title="Operator təyin et"
          subtitle={request.companyName}
          code={request.requestCode}
          onClose={onClose}
        />
        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500">İcra üçün operator seçin. Operator təyin edildikdə sorğu OPERATOR_ASSIGNED statusuna keçəcək.</p>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Operator</label>
            <select
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Seçin...</option>
              {operators.map(o => (
                <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">İmtina</button>
          <button
            onClick={submit}
            disabled={busy || !operatorId}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg"
          >
            <UserPlus size={13} /> Təyin et
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── OPERATOR_ASSIGNED → EQUIPMENT_DISPATCHED ────────────────────────────────

function DispatchModal({ request, onClose, onSaved }) {
  const [docsVerified, setDocsVerified] = useState(request.equipmentDocsVerified || false)
  const [busy, setBusy] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  const verifyDocs = async () => {
    setBusy(true)
    try {
      await coordinatorApi.verifyEquipmentDocs(request.requestId)
      setDocsVerified(true)
      toast.success('Texnika sənədləri yoxlanıldı')
      onSaved?.()
    } catch {} finally {
      setBusy(false)
    }
  }

  const dispatch = async () => {
    if (!docsVerified) {
      toast.error('Əvvəlcə texnika sənədlərini yoxlayın')
      return
    }
    if (!(await confirm({
      title: 'Yükləmə və göndərmə',
      message: `"${request.companyName}" üçün texnika yüklənib göndərildi?`,
    }))) return

    setBusy(true)
    try {
      await coordinatorApi.dispatch(request.requestId)
      toast.success('Texnika göndərildi')
      onSaved?.()
      onClose()
    } catch {} finally {
      setBusy(false)
    }
  }

  return (
    <div className={overlayCls}>
      <div className="absolute inset-0" style={backdropStyle} />
      <div className={modalCls}>
        <ModalHeader
          title="Yükləmə və göndərmə"
          subtitle={request.companyName}
          code={request.requestCode}
          onClose={onClose}
        />
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Texnika sənədləri</p>
              <p className="text-xs text-gray-500 mt-0.5">Texniki pasport, sığorta və s. sənədlər yoxlanmalıdır</p>
            </div>
            {docsVerified ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                <CheckCircle size={13} /> Yoxlanılıb
              </span>
            ) : (
              <button
                onClick={verifyDocs}
                disabled={busy}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
              >
                <PackageCheck size={13} /> Yoxlanıldı
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300">
            <Truck size={14} />
            Yükləmə təsdiqi: texnika sifarişçiyə göndərildiyini təsdiqləyirsiniz.
          </div>

          {request.operatorName && (
            <div className="text-xs">
              <span className="text-gray-500">Təyin edilmiş operator: </span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{request.operatorName}</span>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">İmtina</button>
          <button
            onClick={dispatch}
            disabled={busy || !docsVerified}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg"
          >
            <Truck size={13} /> Yüklə və göndər
          </button>
        </div>
      </div>
      <ConfirmDialog />
    </div>
  )
}

// ─── EQUIPMENT_DISPATCHED → DELIVERED ────────────────────────────────────────

function DeliverModal({ request, onClose, onSaved }) {
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  const deliver = async () => {
    if (!(await confirm({
      title: 'Təhvil-təslim',
      message: `"${request.companyName}" üçün təhvil-təslim tamamlandı? Layihə aktiv ediləcək.`,
    }))) return

    setBusy(true)
    try {
      await coordinatorApi.deliver(request.requestId, notes || null)
      toast.success('Təhvil-təslim tamamlandı — layihə aktivdir')
      onSaved?.()
      onClose()
    } catch {} finally {
      setBusy(false)
    }
  }

  return (
    <div className={overlayCls}>
      <div className="absolute inset-0" style={backdropStyle} />
      <div className={modalCls}>
        <ModalHeader
          title="Təhvil-təslim"
          subtitle={request.companyName}
          code={request.requestCode}
          onClose={onClose}
        />
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-xs text-green-700 dark:text-green-300">
            <CheckCircle size={14} />
            Təhvil-təslim təsdiqlədiyiniz an layihə ACTIVE statusuna keçəcək.
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Təhvil-təslim qeydi (opsional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sifarişçinin qəbul qeydləri, yaranan problemlər və s..."
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
            />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">İmtina</button>
          <button
            onClick={deliver}
            disabled={busy}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg"
          >
            <CheckCircle size={13} /> Təhvil-təslim et
          </button>
        </div>
      </div>
      <ConfirmDialog />
    </div>
  )
}

// ─── DELIVERED / REJECTED ────────────────────────────────────────────────────

function ReadonlyModal({ request, onClose }) {
  const isDelivered = request.requestStatus === 'DELIVERED'
  return (
    <div className={overlayCls}>
      <div className="absolute inset-0" style={backdropStyle} />
      <div className={modalCls}>
        <ModalHeader
          title={isDelivered ? 'Layihə tamamlandı' : 'Sorğu rədd edildi'}
          subtitle={request.companyName}
          code={request.requestCode}
          onClose={onClose}
        />
        <div className="p-5 space-y-3">
          <div className={clsx(
            'flex items-center gap-2 rounded-lg p-3 text-xs',
            isDelivered
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
          )}>
            {isDelivered ? <CheckCircle size={14} /> : <X size={14} />}
            {isDelivered
              ? 'Bu sorğu təhvil-təslim olub və layihə aktivdir.'
              : 'Bu sorğu rədd edilib. Yeni əməliyyat mümkün deyil.'
            }
          </div>
          {request.operatorName && (
            <div className="text-xs">
              <span className="text-gray-500">Operator: </span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{request.operatorName}</span>
            </div>
          )}
          {request.equipmentName && (
            <div className="text-xs">
              <span className="text-gray-500">Texnika: </span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{request.equipmentName} ({request.equipmentCode})</span>
            </div>
          )}
          {request.totalAmount && (
            <div className="text-xs">
              <span className="text-gray-500">Cəm: </span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {parseFloat(request.totalAmount).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
              </span>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Bağla</button>
        </div>
      </div>
    </div>
  )
}
