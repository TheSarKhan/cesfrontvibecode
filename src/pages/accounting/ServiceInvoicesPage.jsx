import { useState, useEffect, useMemo, useRef } from 'react'
import { Search, Printer, Eye, Wrench, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { serviceApi } from '../../api/service'
import ServiceInvoicePrintModal from '../service/ServiceInvoicePrintModal'
import { clsx } from 'clsx'
import { useAuthStore } from '../../store/authStore'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'

const fmt      = (d) => d ? new Date(d).toLocaleDateString('az-AZ') : '—'
const fmtMoney = (v) => v != null
  ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼'
  : '—'

const STATUS_LABELS = {
  AVAILABLE:     'Hazırdır',
  DEFECTIVE:     'Nasaz',
  IN_REPAIR:     'Təmirdə',
  IN_INSPECTION: 'Servisdədir',
  IN_TRANSIT:    'Yoldadır',
  RENTED:        'Layihədə',
}
const STATUS_COLORS = {
  AVAILABLE:     'bg-green-100 text-green-700 border-green-200',
  DEFECTIVE:     'bg-red-100 text-red-700 border-red-200',
  IN_REPAIR:     'bg-orange-100 text-orange-700 border-orange-200',
  IN_INSPECTION: 'bg-amber-100 text-amber-700 border-amber-200',
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

export default function ServiceInvoicesPage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore(s => s.hasPermission)
  const canView = hasPermission('SERVICE_MANAGEMENT', 'canGet')

  const [records, setRecords]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [printModal, setPrintModal] = useState(null)

  const [search, setSearch]           = useState('')
  const [typeFilter, setTypeFilter]   = useState('')   // 'INSPECTION' | 'REPAIR' | ''
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const searchRef = useRef(null)

  usePageShortcuts({ searchRef })

  const load = async () => {
    setLoading(true)
    try {
      const res = await serviceApi.getAll()
      const all = res.data.data || res.data || []
      // Yalnız tamamlanmış və xərci olan qeydlər
      setRecords(all.filter(r => r.completed && r.cost != null && parseFloat(r.cost) > 0))
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return records.filter(r => {
      if (q && !r.equipmentName?.toLowerCase().includes(q) && !r.serviceType?.toLowerCase().includes(q)) return false
      if (typeFilter && r.recordType !== typeFilter) return false
      if (dateFrom && r.serviceDate < dateFrom) return false
      if (dateTo   && r.serviceDate > dateTo)   return false
      return true
    })
  }, [records, search, typeFilter, dateFrom, dateTo])

  const totalCost  = filtered.reduce((s, r) => s + parseFloat(r.cost || 0), 0)
  const inspCount  = filtered.filter(r => r.recordType === 'INSPECTION').length
  const repairCount = filtered.filter(r => r.recordType !== 'INSPECTION').length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/accounting')}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Servis Qaimələri</h1>
            <p className="text-xs text-gray-400 mt-0.5">Tamamlanmış baxış və servis xərcləri</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard icon={Printer}      label="Cəmi Qaimə"    value={filtered.length}    color="bg-amber-500" />
        <StatCard icon={CheckCircle}  label="Cəmi Xərc"     value={fmtMoney(totalCost)} color="bg-red-500" />
        <StatCard icon={Eye}          label="Baxış Qaimələri" value={inspCount}         color="bg-amber-400" />
        <StatCard icon={Wrench}       label="Servis Qaimələri" value={repairCount}      color="bg-orange-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Texnika, növ..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Bütün növlər</option>
          <option value="INSPECTION">Texniki Baxış</option>
          <option value="REPAIR">Texniki Servis</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">№</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Texnika</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Növ</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarix</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kateqoriya</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nəticə</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Xərc</th>
                <th className="py-3 px-4 w-12" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={8} rows={6} />
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={Printer}
                  title="Servis qaiməsi yoxdur"
                  description={records.length === 0 ? 'Xərci olan tamamlanmış servis qeydi tapılmadı' : 'Axtarış şərtlərini dəyişin'}
                />
              ) : (
                filtered.map((rec, idx) => {
                  const isInspection = rec.recordType === 'INSPECTION'
                  const isAvailable  = rec.statusAfter === 'AVAILABLE'
                  return (
                    <tr key={rec.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="py-3 px-4 text-xs text-gray-400 font-mono">
                        SRV-{String(rec.id).padStart(5, '0')}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{rec.equipmentName || '—'}</p>
                        {rec.plateNumber && <p className="text-[10px] text-gray-400">{rec.plateNumber}</p>}
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
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {isInspection
                            ? <Eye size={12} className="text-amber-500 shrink-0" />
                            : <Wrench size={12} className="text-orange-500 shrink-0" />
                          }
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            {isInspection ? 'Texniki Baxış' : 'Texniki Servis'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {rec.statusAfter && (
                          <div className="flex items-center gap-1">
                            {isAvailable
                              ? <CheckCircle size={11} className="text-green-500 shrink-0" />
                              : <AlertTriangle size={11} className="text-red-500 shrink-0" />
                            }
                            <span className={clsx(
                              "text-[10px] font-bold",
                              isAvailable ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            )}>
                              {STATUS_LABELS[rec.statusAfter] || rec.statusAfter}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-bold text-red-500">−{fmtMoney(rec.cost)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setPrintModal(rec)}
                          className="p-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20 text-gray-400 hover:text-amber-600 transition-colors"
                          title="Qaiməni çap et"
                        >
                          <Printer size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            <span className="text-xs text-gray-500">{filtered.length} qaimə</span>
            <span className="text-sm font-bold text-red-500">Cəmi: −{fmtMoney(totalCost)}</span>
          </div>
        )}
      </div>

      {printModal && (
        <ServiceInvoicePrintModal
          record={printModal}
          onClose={() => setPrintModal(null)}
        />
      )}
    </div>
  )
}
