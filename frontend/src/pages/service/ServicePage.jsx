import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2, Wrench, CalendarClock, AlertTriangle, CheckCircle } from 'lucide-react'
import { serviceApi } from '../../api/service'
import { garageApi } from '../../api/garage'
import ServiceModal from './ServiceModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useAuthStore } from '../../store/authStore'

const fmt = (d) => d ? new Date(d).toLocaleDateString('az-AZ') : '—'
const fmtMoney = (v) => v != null
  ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼'
  : '—'

function NextServiceBadge({ date }) {
  if (!date) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const next  = new Date(date); next.setHours(0, 0, 0, 0)
  const diff  = Math.ceil((next - today) / 86400000)

  if (diff < 0)
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">Gecikib</span>
  if (diff <= 7)
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">{diff}g qalıb</span>
  return <span className="text-[10px] text-gray-400">{fmt(date)}</span>
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3.5 flex items-center gap-3">
      <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon size={16} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-gray-400 truncate">{sub}</p>}
      </div>
    </div>
  )
}

export default function ServicePage() {
  const hasPermission = useAuthStore(s => s.hasPermission)
  const canCreate = hasPermission('SERVICE_MANAGEMENT', 'canPost')
  const canEdit   = hasPermission('SERVICE_MANAGEMENT', 'canPut')
  const canDelete = hasPermission('SERVICE_MANAGEMENT', 'canDelete')

  const [records, setRecords] = useState([])
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, editing: null })
  const [search, setSearch] = useState('')
  const [eqFilter, setEqFilter] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [recRes, eqRes] = await Promise.allSettled([
        serviceApi.getAll(),
        garageApi.getAll(),
      ])
      if (recRes.status === 'fulfilled') setRecords(recRes.value.data.data || recRes.value.data || [])
      if (eqRes.status === 'fulfilled') setEquipment(eqRes.value.data.data || eqRes.value.data || [])
    } catch {
      toast.error('Servis məlumatları yüklənmədi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return records.filter(r => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        r.equipmentName?.toLowerCase().includes(q) ||
        r.serviceType?.toLowerCase().includes(q) ||
        r.contractorName?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      const matchEq = !eqFilter || String(r.equipmentId) === eqFilter
      return matchSearch && matchEq
    })
  }, [records, search, eqFilter])

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0)
    const overdue = records.filter(r => r.nextServiceDate && new Date(r.nextServiceDate) < today).length
    const upcoming = records.filter(r => {
      if (!r.nextServiceDate) return false
      const d = new Date(r.nextServiceDate); d.setHours(0,0,0,0)
      const diff = Math.ceil((d - today) / 86400000)
      return diff >= 0 && diff <= 7
    }).length
    const totalCost = records.reduce((s, r) => s + parseFloat(r.cost || 0), 0)
    return { total: records.length, overdue, upcoming, totalCost }
  }, [records])

  const handleDelete = async (rec) => {
    if (!window.confirm(`"${rec.serviceType} — ${rec.equipmentName}" servis qeydi silinsin?`)) return
    try {
      await serviceApi.delete(rec.id)
      toast.success('Servis qeydi silindi')
      load()
    } catch {
      toast.error('Silmə uğursuz oldu')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Texniki Servis</h1>
          <p className="text-xs text-gray-400 mt-0.5">{records.length} servis qeydi</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setModal({ open: true, editing: null })}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Yeni Servis
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard icon={Wrench}       label="Ümumi Qeyd"      value={stats.total}     sub="bütün servis qeydləri"  color="bg-blue-500" />
        <StatCard icon={AlertTriangle} label="Gecikmiş Servis" value={stats.overdue}   sub="vaxtı keçib"            color="bg-red-500" />
        <StatCard icon={CalendarClock} label="7 Gün İçində"   value={stats.upcoming}  sub="yaxınlaşan servis"      color="bg-yellow-500" />
        <StatCard icon={CheckCircle}   label="Ümumi Xərc"     value={fmtMoney(stats.totalCost)} sub="bütün servis xərcləri" color="bg-green-500" />
      </div>

      {/* Xəbərdarlıq */}
      {stats.overdue > 0 && (
        <div className="flex items-start gap-2 mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
          <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">
            {stats.overdue} texnikanın növbəti servis tarixi keçmişdir. Dərhal nəzərə alın.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Texnika, servis növü, podratçı, təsvir..."
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
            <option key={eq.id} value={eq.id}>
              {eq.name} {eq.plateNumber ? `(${eq.plateNumber})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Texnika</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Servis növü</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Servis tarixi</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Növbəti servis</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Xərc</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Podratçı</th>
                <th className="py-3 px-4 w-8" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="py-3 px-4">
                        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <Wrench size={32} className="mx-auto text-gray-200 dark:text-gray-700 mb-2" />
                    <p className="text-sm text-gray-400">
                      {records.length === 0
                        ? 'Hələ servis qeydi yoxdur. İlk servis qeydini əlavə edin.'
                        : 'Filtrlərə uyğun nəticə tapılmadı'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(rec => (
                  <tr key={rec.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{rec.equipmentName || '—'}</p>
                      {rec.odometer && <p className="text-[10px] text-gray-400">{rec.odometer.toLocaleString()} km</p>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                        {rec.serviceType}
                      </span>
                      {rec.description && (
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[180px]">{rec.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-300">{fmt(rec.serviceDate)}</td>
                    <td className="py-3 px-4">
                      <NextServiceBadge date={rec.nextServiceDate} />
                      {!rec.nextServiceDate && <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      {rec.cost ? (
                        <span className="text-xs font-semibold text-red-500">−{fmtMoney(rec.cost)}</span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">{rec.contractorName || '—'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 justify-end">
                        {canEdit && (
                          <button
                            onClick={() => setModal({ open: true, editing: rec })}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
                            title="Redaktə et"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(rec)}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            <span className="text-xs text-gray-500">{filtered.length} qeyd</span>
            <span className="text-xs font-semibold text-red-500">
              Cəmi xərc: −{fmtMoney(filtered.reduce((s, r) => s + parseFloat(r.cost || 0), 0))}
            </span>
          </div>
        )}
      </div>

      {modal.open && (
        <ServiceModal
          editing={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => { setModal({ open: false, editing: null }); load() }}
        />
      )}
    </div>
  )
}
