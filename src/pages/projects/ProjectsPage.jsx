import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Search, Clock, Zap, CheckCircle, TrendingUp, ChevronRight, FileText, FolderKanban } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import ProjectSlideOver from './ProjectSlideOver'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'
import Pagination from '../../components/common/Pagination'
import { useSearchParams } from 'react-router-dom'

const STATUS_CONFIG = {
  PENDING:   { label: 'Gözləmədə', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  ACTIVE:    { label: 'Aktiv',      cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  COMPLETED: { label: 'Bağlanmış',  cls: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
}

const PROJ_TYPE = { DAILY: 'Günlük', MONTHLY: 'Aylıq' }

function calcDuration(p) {
  const s = p.startDate ?? p.planStartDate
  const e = p.endDate ?? p.planEndDate
  if (s && e) {
    const days = Math.ceil((new Date(e) - new Date(s)) / 86400000)
    return p.projectType === 'MONTHLY' ? `${Math.round(days / 30)} ay` : `${days} gün`
  }
  const n = p.planDayCount ?? p.dayCount
  if (!n) return '—'
  return p.projectType === 'MONTHLY' ? `${n} ay` : `${n} gün`
}
const OWNERSHIP = { COMPANY: 'Şirkət', INVESTOR: 'İnvestor', CONTRACTOR: 'Podratçı' }

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

export default function ProjectsPage() {
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [allProjects, setAllProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const searchRef = useRef(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('q') || ''
  const statusFilter = searchParams.get('status') || ''
  const page = parseInt(searchParams.get('page') || '0')
  const pageSize = parseInt(searchParams.get('size') || '15')

  const setSearch = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('q', v) : n.delete('q'); n.delete('page'); return n }, { replace: true })
  const setStatusFilter = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('status', v) : n.delete('status'); n.delete('page'); return n }, { replace: true })

  usePageShortcuts({ searchRef })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, size: pageSize }
      if (search) params.q = search
      if (statusFilter) params.status = statusFilter
      const res = await projectsApi.getAllPaged(params)
      const paged = res.data.data || res.data
      setData(paged)
      setSelected(prev => prev ? (paged.content.find(p => p.id === prev.id) ?? prev) : null)
    } catch {
      toast.error('Layihələr yüklənmədi')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, statusFilter])

  useEffect(() => { load() }, [load])

  // Load all projects for stats cards
  useEffect(() => {
    projectsApi.getAll().then(res => setAllProjects(res.data.data || res.data || [])).catch(() => {})
  }, [data])

  const stats = useMemo(() => {
    const pending   = allProjects.filter(p => p.status === 'PENDING').length
    const active    = allProjects.filter(p => p.status === 'ACTIVE').length
    const completed = allProjects.filter(p => p.status === 'COMPLETED').length
    const totalNet = allProjects
      .filter(p => ['ACTIVE', 'COMPLETED'].includes(p.status))
      .reduce((s, p) => {
        const rev = parseFloat(p.totalRevenue || 0)
        const exp = parseFloat(p.totalExpense || 0)
                  + parseFloat(p.planTransportationPrice || 0)
                  + parseFloat(p.planOperatorPayment || 0)
        return s + (rev - exp)
      }, 0)
    return { pending, active, completed, totalNet }
  }, [allProjects])

  const fmtMoney = (v) => parseFloat(v || 0).toLocaleString('az-AZ', { minimumFractionDigits: 2 })
  const fmt = (d) => d ? new Date(d).toLocaleDateString('az-AZ') : '—'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Layihələr</h1>
          <p className="text-xs text-gray-400 mt-0.5">{data.totalElements} layihə</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard icon={Clock}        label="Gözləmədə"       value={stats.pending}   sub="müqavilə gözlənilir"           color="bg-blue-500" />
        <StatCard icon={Zap}          label="Aktiv"            value={stats.active}    sub="icra mərhələsində"              color="bg-green-500" />
        <StatCard icon={CheckCircle}  label="Bağlanmış"        value={stats.completed} sub="mühasibatlığa göndərildi"       color="bg-gray-400" />
        <StatCard
          icon={TrendingUp}
          label="Ümumi Xalis Gəlir"
          value={`${fmtMoney(stats.totalNet)} ₼`}
          sub="aktiv + bağlanmış"
          color={stats.totalNet >= 0 ? 'bg-amber-500' : 'bg-red-500'}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kod, şirkət, layihə, texnika, bölgə, podratçı..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Bütün statuslar</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kod</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Şirkət / Layihə</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Texnika</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarixlər</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Müqavilə</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Maliyyə</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="py-3 px-4 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={8} rows={6} />
              ) : data.content.length === 0 ? (
                <EmptyState
                  icon={FolderKanban}
                  title="Layihə tapılmadı"
                  description={data.totalElements === 0 ? 'Koordinator sorğu qəbul etdikdən sonra layihələr burada görünəcək' : 'Axtarış şərtlərini dəyişin'}
                />
              ) : (
                data.content.map((p) => {
                  const status = STATUS_CONFIG[p.status] || STATUS_CONFIG.PENDING
                  const totalRevAll = parseFloat(p.totalRevenue || 0)
                  const totalExpAll = parseFloat(p.totalExpense || 0)
                                    + parseFloat(p.planTransportationPrice || 0)
                                    + parseFloat(p.planOperatorPayment || 0)
                  const net         = totalRevAll - totalExpAll
                  const isSelected = selected?.id === p.id

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className={clsx(
                        'border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-amber-50 dark:bg-amber-900/10'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                      )}
                    >
                      {/* Kod */}
                      <td className="py-3 px-4">
                        <p className="text-xs font-mono font-bold text-green-600 dark:text-green-400">
                          {p.projectCode || `PRJ-${String(p.id).padStart(4, '0')}`}
                        </p>
                        {p.requestCode && (
                          <p className="text-[10px] font-mono text-gray-400">{p.requestCode}</p>
                        )}
                      </td>

                      {/* Şirkət / Layihə */}
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.companyName}</p>
                        {p.projectName && (
                          <p className="text-xs text-gray-400 truncate max-w-[160px]">{p.projectName}</p>
                        )}
                        {p.region && <p className="text-xs text-gray-400">{p.region}</p>}
                      </td>

                      {/* Texnika */}
                      <td className="py-3 px-4">
                        {p.equipmentName ? (
                          <div>
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{p.equipmentName}</p>
                            <p className="text-[10px] text-gray-400">
                              {[p.equipmentCode, p.equipmentBrand, p.equipmentModel].filter(Boolean).join(' · ')}
                            </p>
                            {p.equipmentType && (
                              <p className="text-[10px] text-gray-400">{p.equipmentType}</p>
                            )}
                            <span className={clsx('text-[10px] font-medium',
                              p.ownershipType === 'CONTRACTOR' ? 'text-orange-500' :
                              p.ownershipType === 'INVESTOR'   ? 'text-blue-500' : 'text-green-500'
                            )}>
                              {OWNERSHIP[p.ownershipType] || p.ownershipType}
                            </span>
                            {p.ownershipType === 'CONTRACTOR' && p.contractorName && (
                              <p className="text-[10px] text-orange-400">{p.contractorName}</p>
                            )}
                            {p.ownershipType === 'INVESTOR' && p.investorName && (
                              <p className="text-[10px] text-blue-400">{p.investorName}</p>
                            )}
                          </div>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>

                      {/* Tarixlər */}
                      <td className="py-3 px-4">
                        {p.projectType && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {PROJ_TYPE[p.projectType]} · {calcDuration(p)}
                          </p>
                        )}
                        {(p.startDate ?? p.planStartDate) && <p className="text-[10px] text-gray-400">{fmt(p.startDate ?? p.planStartDate)}</p>}
                        {(p.endDate ?? p.planEndDate) && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[10px] text-gray-400">→ {fmt(p.endDate ?? p.planEndDate)}</p>
                            {p.status === 'ACTIVE' && (() => {
                              const today = new Date(); today.setHours(0,0,0,0)
                              const end = new Date(p.endDate ?? p.planEndDate); end.setHours(0,0,0,0)
                              const diff = Math.ceil((end - today) / 86400000)
                              if (diff < 0) return <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 border border-red-200 whitespace-nowrap">Vaxtı keçib</span>
                              if (diff <= 3) return <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 whitespace-nowrap">{diff}g qalıb</span>
                              return null
                            })()}
                          </div>
                        )}
                      </td>

                      {/* Müqavilə */}
                      <td className="py-3 px-4">
                        {p.hasContract ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                            <FileText size={11} />
                            Yüklənib
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 dark:text-amber-400">Gözlənilir</span>
                        )}
                      </td>

                      {/* Maliyyə */}
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-[10px] text-green-600">+{fmtMoney(totalRevAll)} ₼</p>
                          <p className="text-[10px] text-red-500">−{fmtMoney(totalExpAll)} ₼</p>
                          <p className={clsx('text-xs font-bold border-t border-gray-100 dark:border-gray-700 pt-0.5 mt-0.5',
                            net >= 0 ? 'text-green-600' : 'text-red-500')}>
                            {net >= 0 ? '+' : ''}{fmtMoney(net)} ₼
                          </p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={clsx('px-2 py-0.5 rounded-md text-xs font-medium border whitespace-nowrap', status.cls)}>
                          {status.label}
                        </span>
                      </td>

                      {/* Arrow */}
                      <td className="py-3 px-4 text-right">
                        <ChevronRight size={15} className={clsx(
                          'transition-colors',
                          isSelected ? 'text-amber-600' : 'text-gray-300'
                        )} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={data.page + 1}
        pageSize={data.size}
        totalPages={data.totalPages}
        totalElements={data.totalElements}
        onPage={(p) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('page', String(p - 1)); return n }, { replace: true })}
        onPageSize={(s) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('size', String(s)); n.delete('page'); return n }, { replace: true })}
      />

      {/* SlideOver */}
      {selected && (
        <ProjectSlideOver
          project={selected}
          onClose={() => setSelected(null)}
          onSaved={() => load()}
        />
      )}
    </div>
  )
}
