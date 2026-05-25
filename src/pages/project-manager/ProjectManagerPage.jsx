import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Search, RefreshCw, FileText, Send, ClipboardCheck, ListChecks,
  AlertCircle, MessageSquare, CheckCircle, XCircle,
  ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import { projectManagerApi } from '../../api/projectManager'
import { STATUS_CFG } from '../../constants/requests'
import Pagination from '../../components/common/Pagination'
import { fmtDate } from '../../utils/date'
import PmRequestSlideOver from './PmRequestSlideOver'

const STAT_CARDS = [
  { id: 'ALL',                  label: 'Hamısı',           icon: FileText,       color: 'text-gray-500' },
  { id: 'PENDING',              label: 'Yeni gəldi',        icon: Send,           color: 'text-blue-500' },
  { id: 'PM_REVIEW',            label: 'Nəzərdən keçirir',  icon: ClipboardCheck, color: 'text-sky-500' },
  { id: 'PM_SHORTLIST_READY',   label: 'Shortlist hazır',   icon: ListChecks,     color: 'text-indigo-500' },
  { id: 'COORDINATOR_PROPOSED', label: 'Təklif gəldi',      icon: AlertCircle,    color: 'text-fuchsia-500' },
  { id: 'PM_PRICE_NEGOTIATION', label: 'Sifarişçi ilə',     icon: MessageSquare,  color: 'text-amber-500' },
  { id: 'PM_APPROVED',          label: 'Təsdiqləndi',       icon: CheckCircle,    color: 'text-green-500' },
  { id: 'REJECTED',             label: 'Rədd',              icon: XCircle,        color: 'text-red-500' },
]

const PROJECT_TYPE_LABEL = { DAILY: 'Günlük', MONTHLY: 'Aylıq' }

function SortHeader({ label, field, sortBy, sortDir, onSort, className = '' }) {
  const active = sortBy === field
  return (
    <th
      onClick={() => onSort(field)}
      className={clsx(
        'text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300 transition-colors',
        className,
      )}
    >
      <div className="flex items-center gap-1">
        {label}
        {active
          ? (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)
          : <ArrowUpDown size={11} className="text-gray-300" />}
      </div>
    </th>
  )
}

export default function ProjectManagerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchRef = useRef(null)

  const [stats, setStats] = useState({ ALL: 0 })
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const quickFilter = searchParams.get('status') || 'ALL'
  const page = parseInt(searchParams.get('page') || '0')
  const pageSize = parseInt(searchParams.get('size') || '15')
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortDir = searchParams.get('sortDir') || 'desc'

  const updateParams = useCallback((updater) => {
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev)
      updater(n)
      return n
    }, { replace: true })
  }, [setSearchParams])

  const handleSort = (field) => {
    updateParams((n) => {
      if (sortBy === field) {
        n.set('sortDir', sortDir === 'asc' ? 'desc' : 'asc')
      } else {
        n.set('sortBy', field)
        n.set('sortDir', 'asc')
      }
      n.delete('page')
    })
  }

  const handleQuickFilter = (id) => {
    updateParams((n) => {
      if (id === 'ALL') n.delete('status')
      else n.set('status', id)
      n.delete('page')
    })
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, size: pageSize, sortBy, sortDir }
      if (search) params.search = search
      if (quickFilter !== 'ALL') params.status = quickFilter
      const res = await projectManagerApi.getRequestsPaged(params)
      setData(res.data.data || res.data)
    } catch (err) {
      console.error('PM list fetch failed', err)
      const msg = err?.response?.status === 403
        ? 'İcazəniz yoxdur (PROJECT_MANAGER:GET)'
        : err?.response?.data?.message || 'Sorğular yüklənmədi'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, quickFilter, sortBy, sortDir])

  const loadStats = useCallback(async () => {
    try {
      const res = await projectManagerApi.getStats()
      const counts = res.data.data || {}
      const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0)
      setStats({ ALL: total, ...counts })
    } catch (err) {
      console.error('PM stats fetch failed', err)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadStats() }, [loadStats, data.totalElements])

  // Window focus / tab visible olanda avtomatik yenilə — başqa yerdə sorğu
  // yaradıldıqda istifadəçinin manual yeniləməsinə ehtiyac qalmasın
  useEffect(() => {
    const refresh = () => { load(); loadStats() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refresh()
    })
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [load, loadStats])

  const totalActive = useMemo(() => stats.ALL ?? 0, [stats])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Layihə Meneceri</h1>
          <p className="text-xs text-gray-400 mt-0.5">{totalActive} sorğu</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none">
        {STAT_CARDS.map((s) => {
          const Icon = s.icon
          const active = quickFilter === s.id
          return (
            <button
              key={s.id}
              onClick={() => handleQuickFilter(s.id)}
              className={clsx(
                'rounded-xl border px-3 py-2 text-left transition-colors shrink-0 min-w-[110px]',
                active
                  ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-700',
              )}
            >
              <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Icon size={10} className={s.color} />
                {s.label}
              </p>
              <p className={clsx('text-lg font-bold mt-0.5', s.color)}>{stats[s.id] ?? 0}</p>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1 min-w-0">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              updateParams((n) => n.delete('page'))
            }}
            placeholder="Sorğu ID, şirkət, layihə, bölgə..."
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <button
          onClick={() => { load(); loadStats() }}
          className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
          title="Yenilə"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <SortHeader label="ID" field="requestCode" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Şirkət / Layihə" field="companyName" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bölgə</th>
                <SortHeader label="Müddət" field="dayCount" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Daxil oldu" field="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Status" field="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="py-3 px-4">
                        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.content.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                    {totalActive === 0 ? 'PM-ə hələ sorğu gəlməyib' : 'Filtrlərə uyğun nəticə tapılmadı'}
                  </td>
                </tr>
              ) : (
                data.content.map((r) => {
                  const status = STATUS_CFG[r.status] || { label: r.status, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
                  return (
                    <tr
                      key={r.requestId}
                      onClick={() => setSelectedId(r.requestId)}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">{r.requestCode}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.companyName}</p>
                        {r.projectName && <p className="text-xs text-gray-400">{r.projectName}</p>}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{r.region || '—'}</td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                        {r.projectType
                          ? (r.dayCount ? `${r.dayCount} ${r.projectType === 'DAILY' ? 'gün' : 'ay'}` : PROJECT_TYPE_LABEL[r.projectType])
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{fmtDate(r.createdAt) || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={clsx('px-2 py-0.5 rounded-md text-xs font-medium border', status.cls)}>
                          {status.label}
                        </span>
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
        onPage={(p) => updateParams((n) => n.set('page', String(p - 1)))}
        onPageSize={(s) => updateParams((n) => { n.set('size', String(s)); n.delete('page') })}
      />

      {selectedId && (
        <PmRequestSlideOver
          requestId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => { load(); loadStats() }}
        />
      )}
    </div>
  )
}
