import { useState, useEffect, useMemo, useRef, Fragment } from 'react'
import { Plus, Search, Pencil, Trash2, CheckCircle, AlertTriangle, Printer, Eye, Wrench } from 'lucide-react'
import { serviceApi } from '../../api/service'
import { garageApi } from '../../api/garage'
import ServiceModal from './ServiceModal'
import ServiceCompleteModal from './ServiceCompleteModal'
import ServiceInvoicePrintModal from './ServiceInvoicePrintModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'

const fmt      = (d) => d ? new Date(d).toLocaleDateString('az-AZ') : '—'
const fmtMoney = (v) => v != null
  ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼'
  : '—'

const STATUS_COLORS = {
  AVAILABLE:      'bg-green-100 text-green-700 border-green-200',
  RENTED:         'bg-blue-100 text-blue-700 border-blue-200',
  IN_TRANSIT:     'bg-purple-100 text-purple-700 border-purple-200',
  IN_INSPECTION:  'bg-amber-100 text-amber-700 border-amber-200',
  UNDER_CHECK:    'bg-indigo-100 text-indigo-700 border-indigo-200',
  IN_REPAIR:      'bg-orange-100 text-orange-700 border-orange-200',
  DEFECTIVE:      'bg-red-100 text-red-700 border-red-200',
  OUT_OF_SERVICE: 'bg-gray-100 text-gray-700 border-gray-200',
}
const STATUS_LABELS = {
  AVAILABLE:      'Hazırdır',
  RENTED:         'Layihədə',
  IN_TRANSIT:     'Yoldadır',
  IN_INSPECTION:  'Servisdədir',
  UNDER_CHECK:    'Baxışda',
  IN_REPAIR:      'Təmirdə',
  DEFECTIVE:      'Nasaz',
  OUT_OF_SERVICE: 'İstismardan kənar',
}

function StatusBadge({ status }) {
  if (!status) return null
  return (
    <span className={clsx("px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-tighter", STATUS_COLORS[status] || 'bg-gray-100 text-gray-600 border-gray-200')}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
      <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon size={14} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className="text-base font-bold text-gray-800 dark:text-gray-100 leading-tight">{value}</p>
      </div>
    </div>
  )
}

// ─── Records Table (shared by both tabs) ──────────────────────────────────────
function RecordsTable({
  records, loading, search, setSearch, equipment, eqFilter, setEqFilter,
  expandedId, setExpandedId, canEdit, canDelete,
  onEdit, onDelete, onComplete, onPrint,
  checklistLoading, onToggleChecklist,
  tabType, // 'inspection' | 'repair'
}) {
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return records.filter(r => {
      const matchSearch = !q || r.equipmentName?.toLowerCase().includes(q) || r.serviceType?.toLowerCase().includes(q)
      const matchEq = !eqFilter || String(r.equipmentId) === eqFilter
      return matchSearch && matchEq
    })
  }, [records, search, eqFilter])

  const isInspection = tabType === 'inspection'

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Texnika, növ..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <select
          value={eqFilter}
          onChange={e => setEqFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Bütün texnikalar</option>
          {equipment.map(eq => (
            <option key={eq.id} value={eq.id}>{eq.name} {eq.plateNumber ? `(${eq.plateNumber})` : ''}</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Texnika</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">{isInspection ? 'Baxış növü' : 'Servis növü'}</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarix</th>
                {!isInspection && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Xərc</th>}
                <th className="py-3 px-4 w-8" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={isInspection ? 4 : 5} rows={5} />
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={isInspection ? Eye : Wrench}
                  title={isInspection ? 'Baxış qeydi yoxdur' : 'Servis qeydi yoxdur'}
                  description={records.length === 0 ? (isInspection ? 'Texnikanı baxışa qəbul edin' : 'Texnikanı servisə alın') : 'Axtarış şərtlərini dəyişin'}
                />
              ) : (
                filtered.map(rec => (
                  <Fragment key={rec.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                      className={clsx(
                        "border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer",
                        rec.completed && "opacity-70"
                      )}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {rec.completed
                            ? <CheckCircle size={13} className="text-green-500 shrink-0" />
                            : <div className={clsx("w-3 h-3 border-2 rounded-full shrink-0", isInspection ? "border-amber-400" : "border-orange-400")} />
                          }
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{rec.equipmentName || '—'}</p>
                            {rec.plateNumber && <p className="text-[10px] text-gray-400">{rec.plateNumber}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={clsx(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold border",
                          isInspection
                            ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
                            : "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800"
                        )}>
                          {rec.serviceType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-gray-600 dark:text-gray-300">{fmt(rec.serviceDate)}</td>
                      {!isInspection && (
                        <td className="py-3 px-4">
                          {rec.cost
                            ? <span className="text-xs font-semibold text-red-500">−{fmtMoney(rec.cost)}</span>
                            : <span className="text-xs text-gray-400">—</span>}
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 justify-end">
                          {rec.completed && rec.cost != null && parseFloat(rec.cost) > 0 && (
                            <button onClick={e => { e.stopPropagation(); onPrint(rec) }}
                              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors" title="Qaimə">
                              <Printer size={13} />
                            </button>
                          )}
                          {!rec.completed && canEdit && (
                            <button onClick={e => { e.stopPropagation(); onEdit(rec) }}
                              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors" title="Redaktə">
                              <Pencil size={13} />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={e => { e.stopPropagation(); onDelete(rec) }}
                              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors" title="Sil">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {expandedId === rec.id && (
                      <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                        <td colSpan={isInspection ? 4 : 5} className="px-6 py-4">
                          <div className="flex flex-col md:flex-row gap-6">
                            {/* Sol: Detallar */}
                            <div className="flex-1 space-y-3">
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Təfərrüatlar</h4>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <p className="text-gray-400 mb-1">Status</p>
                                  <div className="flex items-center gap-2">
                                    <StatusBadge status={rec.statusBefore} />
                                    <span className="text-gray-400">→</span>
                                    <StatusBadge status={rec.statusAfter ?? (isInspection ? 'IN_INSPECTION' : 'IN_REPAIR')} />
                                  </div>
                                </div>
                                <div>
                                  <p className="text-gray-400 mb-1">Motosaat</p>
                                  <p className="font-semibold text-gray-700 dark:text-gray-200">
                                    {rec.odometer ? rec.odometer.toLocaleString() : '—'}
                                  </p>
                                </div>
                                <div className="col-span-2">
                                  <p className="text-gray-400 mb-1">Qeydlər</p>
                                  <p className="text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 p-2 rounded-lg border border-gray-100 dark:border-gray-800 text-xs">
                                    {rec.notes || 'Qeyd yoxdur'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Orta: İnteraktiv Checklist */}
                            {rec.checklistItems?.length > 0 && (
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Checklist</h4>
                                  <span className="text-[10px] text-gray-400">
                                    {rec.checklistItems.filter(i => i.checked).length}/{rec.checklistItems.length}
                                  </span>
                                </div>
                                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-green-500 rounded-full transition-all"
                                    style={{ width: `${(rec.checklistItems.filter(i => i.checked).length / rec.checklistItems.length) * 100}%` }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  {rec.checklistItems.map(item => (
                                    <button
                                      key={item.id}
                                      disabled={rec.completed || checklistLoading[item.id]}
                                      onClick={e => { e.stopPropagation(); onToggleChecklist(rec, item) }}
                                      className={clsx(
                                        "w-full flex items-center gap-2.5 py-1.5 px-2 rounded-lg text-left transition-all",
                                        rec.completed ? "cursor-default" : "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer",
                                        checklistLoading[item.id] && "opacity-50"
                                      )}
                                    >
                                      <div className={clsx(
                                        "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                        item.checked ? "bg-green-500 border-green-500" : "border-gray-300 dark:border-gray-600"
                                      )}>
                                        {item.checked && (
                                          <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
                                            <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        )}
                                      </div>
                                      <span className={clsx(
                                        "text-xs font-medium",
                                        item.checked ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-200"
                                      )}>
                                        {item.itemName}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Sağ: Tamamla paneli */}
                            {!rec.completed && canEdit && (
                              <div className="w-full md:w-48 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col gap-3">
                                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                  <CheckCircle size={13} className="text-green-500" />
                                  {isInspection ? 'Baxışı Tamamla' : 'Servisi Tamamla'}
                                </h4>
                                {isInspection ? (
                                  <div className="space-y-2">
                                    <button
                                      onClick={e => { e.stopPropagation(); onComplete(rec) }}
                                      className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                    >
                                      <CheckCircle size={12} /> Nəticə seç
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={e => { e.stopPropagation(); onComplete(rec) }}
                                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                                  >
                                    <CheckCircle size={13} /> Okay
                                  </button>
                                )}
                              </div>
                            )}

                            {rec.completed && (
                              <div className="w-full md:w-48 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 gap-2
                                border-green-100 dark:border-green-900/30 bg-green-50/30 dark:bg-green-900/10">
                                <CheckCircle size={22} className="text-green-500" />
                                <p className="text-xs font-bold text-green-700 dark:text-green-400">Tamamlanıb</p>
                                {!isInspection && rec.cost && (
                                  <p className="text-[10px] text-red-500 font-semibold">−{fmtMoney(rec.cost)}</p>
                                )}
                                {rec.statusAfter === 'DEFECTIVE' && (
                                  <p className="text-[10px] font-bold text-red-600">Nasaz → Servisə</p>
                                )}
                                {!isInspection && (
                                  <button
                                    onClick={e => { e.stopPropagation(); onPrint(rec) }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 rounded-lg text-[11px] font-semibold hover:bg-amber-100 transition-colors"
                                  >
                                    <Printer size={11} /> Qaimə
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            <span className="text-xs text-gray-500">{filtered.length} qeyd</span>
            {!isInspection && (
              <span className="text-xs font-semibold text-red-500">
                Cəmi: −{fmtMoney(filtered.reduce((s, r) => s + parseFloat(r.cost || 0), 0))}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ServicePage() {
  const hasPermission = useAuthStore(s => s.hasPermission)
  const canCreate = hasPermission('SERVICE_MANAGEMENT', 'canPost')
  const canEdit   = hasPermission('SERVICE_MANAGEMENT', 'canPut')
  const canDelete = hasPermission('SERVICE_MANAGEMENT', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [activeTab, setActiveTab] = useState('inspection')

  const [inspectionRecords, setInspectionRecords] = useState([])
  const [repairRecords, setRepairRecords]         = useState([])
  const [equipment, setEquipment]                 = useState([])
  const [pendingTransit, setPendingTransit]       = useState([])   // Tab 1: IN_TRANSIT
  const [pendingDefective, setPendingDefective]   = useState([])   // Tab 2: DEFECTIVE
  const [loading, setLoading]                     = useState(true)

  const [modal, setModal]               = useState({ open: false, editing: null, initialEquipmentId: null, recordType: 'INSPECTION' })
  const [completeModal, setCompleteModal] = useState(null) // { record, mode }
  const [printModal, setPrintModal]     = useState(null)

  const [iSearch, setISearch] = useState('')
  const [rSearch, setRSearch] = useState('')
  const [iEqFilter, setIEqFilter] = useState('')
  const [rEqFilter, setREqFilter] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [checklistLoading, setChecklistLoading] = useState({})

  const searchRef = useRef(null)

  usePageShortcuts({
    onNew: canCreate ? () => setModal({ open: true, editing: null, initialEquipmentId: null, recordType: activeTab === 'inspection' ? 'INSPECTION' : 'REPAIR' }) : undefined,
    searchRef,
  })

  const load = async () => {
    setLoading(true)
    try {
      const [allRes, eqRes, transitRes, defRes, inRepairRes] = await Promise.allSettled([
        serviceApi.getAll(),                                    // bütün qeydlər (tip filtersiz)
        garageApi.getAll(),
        garageApi.getAllPaged({ status: 'IN_TRANSIT' }),
        garageApi.getAllPaged({ status: 'DEFECTIVE' }),
        garageApi.getAllPaged({ status: 'IN_REPAIR' }),         // Təmirdə olanlar da göstərilsin
      ])

      if (allRes.status === 'fulfilled') {
        const all = allRes.value.data.data || allRes.value.data || []
        // INSPECTION tipli qeydlər → Tab 1
        // REPAIR tipli VƏ köhnə (null) qeydlər → Tab 2
        setInspectionRecords(all.filter(r => r.recordType === 'INSPECTION'))
        setRepairRecords(all.filter(r => r.recordType === 'REPAIR' || r.recordType === null))
      }

      if (eqRes.status === 'fulfilled')      setEquipment(eqRes.value.data.data || eqRes.value.data || [])

      if (transitRes.status === 'fulfilled') {
        const p = transitRes.value.data.data || transitRes.value.data
        setPendingTransit(p.content || p || [])
      }

      if (defRes.status === 'fulfilled' || inRepairRes.status === 'fulfilled') {
        const def     = defRes.status === 'fulfilled'     ? (defRes.value.data.data || defRes.value.data)         : null
        const inRep   = inRepairRes.status === 'fulfilled' ? (inRepairRes.value.data.data || inRepairRes.value.data) : null
        const defList    = def?.content    || def    || []
        const inRepList  = inRep?.content  || inRep  || []
        // Birləşdir, dublikatları at
        const combined = [...defList, ...inRepList.filter(e => !defList.some(d => d.id === e.id))]
        setPendingDefective(combined)
      }
    } catch {
      toast.error('Məlumatlar yüklənmədi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Tab 2 intake: DEFECTIVE/IN_REPAIR texnikalar — açıq servis qeydi olmayanlar
  const repairQueue = useMemo(() =>
    pendingDefective.filter(eq =>
      !repairRecords.some(r => !r.completed && r.equipmentId === eq.id)
    ),
    [pendingDefective, repairRecords]
  )

  const handleDelete = async (rec) => {
    if (!(await confirm({ title: 'Qeydi sil', message: `"${rec.serviceType} — ${rec.equipmentName}" qeydi silinsin?` }))) return
    try {
      await serviceApi.delete(rec.id)
      toast.success('Qeyd silindi')
      load()
    } catch {
      toast.error('Silmə uğursuz oldu')
    }
  }

  const handleToggleChecklist = async (rec, item) => {
    if (rec.completed) return
    const itemId = item.id
    setChecklistLoading(prev => ({ ...prev, [itemId]: true }))
    try {
      const res = await serviceApi.updateChecklistItem(rec.id, itemId, { checked: !item.checked, note: item.note || null })
      const updated = res.data.data || res.data
      if (rec.recordType === 'INSPECTION') {
        setInspectionRecords(prev => prev.map(r => r.id === rec.id ? updated : r))
      } else {
        // REPAIR və ya köhnə (null) qeydlər → Tab 2
        setRepairRecords(prev => prev.map(r => r.id === rec.id ? updated : r))
      }
    } catch {
      toast.error('Yeniləmə uğursuz oldu')
    } finally {
      setChecklistLoading(prev => ({ ...prev, [itemId]: false }))
    }
  }

  const handleCompleted = (updatedRecord) => {
    setCompleteModal(null)
    load()
    const hasCost = updatedRecord?.cost != null && parseFloat(updatedRecord.cost) > 0
    if (updatedRecord && hasCost) {
      setPrintModal(updatedRecord)
    }
    // If inspection completed as DEFECTIVE, switch to repair tab to show the queue
    if (updatedRecord && completeModal?.mode === 'inspection' && updatedRecord.statusAfter === 'DEFECTIVE') {
      setTimeout(() => setActiveTab('repair'), 800)
    }
  }

  const activeInspectionCount = inspectionRecords.filter(r => !r.completed).length
  const activeRepairCount     = repairRecords.filter(r => !r.completed).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Texniki Xidmət</h1>
          <p className="text-xs text-gray-400 mt-0.5">Baxış və Servis idarəetməsi</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setModal({ open: true, editing: null, initialEquipmentId: null, recordType: activeTab === 'inspection' ? 'INSPECTION' : 'REPAIR' })}
            className={clsx(
              "flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors",
              activeTab === 'inspection' ? "bg-amber-600 hover:bg-amber-700" : "bg-orange-600 hover:bg-orange-700"
            )}
          >
            <Plus size={15} />
            {activeTab === 'inspection' ? 'Baxışa Qəbul' : 'Servisə Al'}
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-5">
        <button
          onClick={() => setActiveTab('inspection')}
          className={clsx(
            "flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors",
            activeTab === 'inspection'
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          )}
        >
          <Eye size={15} />
          Texniki Baxış
          {activeInspectionCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {activeInspectionCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('repair')}
          className={clsx(
            "flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors",
            activeTab === 'repair'
              ? "border-orange-500 text-orange-600 dark:text-orange-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          )}
        >
          <Wrench size={15} />
          Texniki Servis
          {activeRepairCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              {activeRepairCount}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: Texniki Baxış ── */}
      {activeTab === 'inspection' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <StatCard icon={Eye}         label="Aktiv Baxış"      value={activeInspectionCount}                          color="bg-amber-500" />
            <StatCard icon={CheckCircle} label="Tamamlanmış"       value={inspectionRecords.filter(r => r.completed).length} color="bg-green-500" />
          </div>

          {/* Pending: IN_TRANSIT texnikalar */}
          {pendingTransit.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Gözləyən Texnikalar (Yoldadır)</h2>
                <span className="text-[10px] text-gray-400">— baxışa qəbul edilməyi gözləyir</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {pendingTransit.map(eq => (
                  <div key={eq.id} className="min-w-[220px] p-3 rounded-xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 flex items-center justify-between gap-3 hover:border-purple-300 transition-all">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{eq.name}</p>
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">{eq.plateNumber || eq.equipmentCode}</p>
                    </div>
                    {canCreate && (
                      <button
                        onClick={() => setModal({ open: true, editing: null, initialEquipmentId: eq.id, recordType: 'INSPECTION' })}
                        className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-lg transition-colors whitespace-nowrap"
                      >
                        Qəbul et
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <RecordsTable
            records={inspectionRecords}
            loading={loading}
            search={iSearch} setSearch={setISearch}
            equipment={equipment}
            eqFilter={iEqFilter} setEqFilter={setIEqFilter}
            expandedId={expandedId} setExpandedId={setExpandedId}
            canEdit={canEdit} canDelete={canDelete}
            onEdit={rec => setModal({ open: true, editing: rec, initialEquipmentId: null, recordType: 'INSPECTION' })}
            onDelete={handleDelete}
            onComplete={rec => setCompleteModal({ record: rec, mode: 'inspection' })}
            onPrint={rec => setPrintModal(rec)}
            checklistLoading={checklistLoading}
            onToggleChecklist={handleToggleChecklist}
            tabType="inspection"
          />
        </>
      )}

      {/* ── TAB 2: Texniki Servis ── */}
      {activeTab === 'repair' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <StatCard icon={Wrench}       label="Aktiv Servis"   value={activeRepairCount}                              color="bg-orange-500" />
            <StatCard icon={CheckCircle}  label="Ümumi Xərc"     value={fmtMoney(repairRecords.reduce((s, r) => s + parseFloat(r.cost || 0), 0))} color="bg-green-500" />
          </div>

          {/* Pending: DEFECTIVE texnikalar */}
          {repairQueue.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Servis Gözləyən Texnikalar (Nasaz)</h2>
                <span className="text-[10px] text-gray-400">— servisə alınmağı gözləyir</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {repairQueue.map(eq => {
                  const isInRep = eq.status === 'IN_REPAIR'
                  return (
                    <div key={eq.id} className={clsx(
                      "min-w-[220px] p-3 rounded-xl flex items-center justify-between gap-3 transition-all border",
                      isInRep
                        ? "bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800 hover:border-orange-300"
                        : "bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-800 hover:border-red-300"
                    )}>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{eq.name}</p>
                        <p className={clsx("text-[10px] font-semibold", isInRep ? "text-orange-500" : "text-red-500")}>{eq.plateNumber || eq.equipmentCode}</p>
                        <span className={clsx(
                          "inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold border",
                          isInRep
                            ? "bg-orange-100 text-orange-700 border-orange-200"
                            : "bg-red-100 text-red-700 border-red-200"
                        )}>
                          {isInRep ? 'TƏMİRDƏ' : 'NASAZ'}
                        </span>
                      </div>
                      {canCreate && !isInRep && (
                        <button
                          onClick={() => setModal({ open: true, editing: null, initialEquipmentId: eq.id, recordType: 'REPAIR' })}
                          className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold rounded-lg transition-colors whitespace-nowrap"
                        >
                          Servisə al
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <RecordsTable
            records={repairRecords}
            loading={loading}
            search={rSearch} setSearch={setRSearch}
            equipment={equipment}
            eqFilter={rEqFilter} setEqFilter={setREqFilter}
            expandedId={expandedId} setExpandedId={setExpandedId}
            canEdit={canEdit} canDelete={canDelete}
            onEdit={rec => setModal({ open: true, editing: rec, initialEquipmentId: null, recordType: 'REPAIR' })}
            onDelete={handleDelete}
            onComplete={rec => setCompleteModal({ record: rec, mode: 'repair' })}
            onPrint={rec => setPrintModal(rec)}
            checklistLoading={checklistLoading}
            onToggleChecklist={handleToggleChecklist}
            tabType="repair"
          />
        </>
      )}

      {/* Modals */}
      {modal.open && (
        <ServiceModal
          editing={modal.editing}
          initialEquipmentId={modal.initialEquipmentId}
          recordType={modal.recordType}
          onClose={() => setModal({ open: false, editing: null, initialEquipmentId: null, recordType: 'INSPECTION' })}
          onSaved={() => { setModal({ open: false, editing: null, initialEquipmentId: null, recordType: 'INSPECTION' }); load() }}
        />
      )}

      {completeModal && (
        <ServiceCompleteModal
          record={completeModal.record}
          mode={completeModal.mode}
          onClose={() => setCompleteModal(null)}
          onCompleted={handleCompleted}
        />
      )}

      {printModal && (
        <ServiceInvoicePrintModal
          record={printModal}
          onClose={() => setPrintModal(null)}
        />
      )}

      <ConfirmDialog />
    </div>
  )
}
