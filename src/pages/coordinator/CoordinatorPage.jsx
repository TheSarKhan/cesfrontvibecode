import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Search, ClipboardList, CheckCircle, XCircle, RefreshCw, SlidersHorizontal, FileText, Send, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { coordinatorApi } from '../../api/coordinator'
import { useAuthStore } from '../../store/authStore'
import CoordinatorPlanModal from './CoordinatorPlanModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'
import Pagination from '../../components/common/Pagination'
import { useSearchParams } from 'react-router-dom'

const STATUS_CONFIG = {
  SENT_TO_COORDINATOR: { label: 'Koordinatorda', cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' },
  OFFER_SENT:          { label: 'Gözdən keçirilir', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  ACCEPTED:            { label: 'Qəbul edildi', cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  REJECTED:            { label: 'Rədd edildi', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
}

const PROJECT_TYPE_LABEL = { DAILY: 'Günlük', MONTHLY: 'Aylıq' }

const STAT_CARDS = [
  { id: 'ALL', label: 'Hamısı', icon: FileText, color: 'text-gray-500' },
  { id: 'SENT_TO_COORDINATOR', label: 'Koordinatorda', icon: Send, color: 'text-purple-500' },
  { id: 'OFFER_SENT', label: 'Gözdən keçirilir', icon: AlertCircle, color: 'text-amber-500' },
  { id: 'ACCEPTED', label: 'Qəbul', icon: CheckCircle, color: 'text-green-500' },
  { id: 'REJECTED', label: 'Rədd', icon: XCircle, color: 'text-red-500' },
]

const OWN_LABELS = { COMPANY: 'Şirkət', CONTRACTOR: 'Podratçı', INVESTOR: 'İnvestor' }

function SortHeader({ label, field, sortBy, sortDir, onSort, className = '' }) {
  const active = sortBy === field
  return (
    <th
      className={clsx('text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300 transition-colors', className)}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active
          ? sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
          : <ArrowUpDown size={11} className="text-gray-300" />}
      </div>
    </th>
  )
}

export default function CoordinatorPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canGet = hasPermission('COORDINATOR', 'canGet')
  const canPut = hasPermission('COORDINATOR', 'canPut')
  const { confirm, ConfirmDialog } = useConfirm()

  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [allRequests, setAllRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [quickFilter, setQuickFilter] = useState('ALL')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const filterRef = useRef(null)
  const searchRef = useRef(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const page = parseInt(searchParams.get('page') || '0')
  const pageSize = parseInt(searchParams.get('size') || '15')
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortDir = searchParams.get('sortDir') || 'desc'

  const handleSort = (field) => {
    setSearchParams(prev => {
      const n = new URLSearchParams(prev)
      if (sortBy === field) {
        n.set('sortDir', sortDir === 'asc' ? 'desc' : 'asc')
      } else {
        n.set('sortBy', field)
        n.set('sortDir', 'asc')
      }
      n.delete('page')
      return n
    }, { replace: true })
  }

  usePageShortcuts({ searchRef })

  // Click outside filter
  useEffect(() => {
    if (!filterOpen) return
    const handler = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen])

  const handleAccept = async (r, e) => {
    e.stopPropagation()
    if (!(await confirm({ title: 'Təklifi təsdiq et', message: `"${r.companyName}" üçün təklif təsdiq edilsin? Layihələr moduluna göndəriləcək.`, danger: false }))) return
    setActionLoading(r.requestId)
    try {
      await coordinatorApi.acceptOffer(r.requestId)
      toast.success('Təklif təsdiq edildi — layihə yaradıldı')
      load()
    } catch {
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (r, e) => {
    e.stopPropagation()
    if (!(await confirm({ title: 'Təklifi ləğv et', message: `"${r.companyName}" üçün təklif ləğv edilsin?` }))) return
    setActionLoading(r.requestId)
    try {
      await coordinatorApi.rejectOffer(r.requestId)
      toast.success('Təklif ləğv edildi')
      load()
    } catch {
    } finally {
      setActionLoading(null)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const effectiveStatus = quickFilter !== 'ALL' ? quickFilter : (statusFilter || undefined)
      const params = { page, size: pageSize, sortBy, sortDir }
      if (search) params.q = search
      if (effectiveStatus) params.status = effectiveStatus
      const res = await coordinatorApi.getRequestsPaged(params)
      setData(res.data.data || res.data)
    } catch {
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, statusFilter, quickFilter, sortBy, sortDir])

  useEffect(() => { load() }, [load])

  // Load all requests for stats + region filter
  useEffect(() => {
    coordinatorApi.getRequests().then(res => setAllRequests(res.data.data || [])).catch(() => {})
  }, [data])

  // Stats
  const stats = useMemo(() => {
    const s = { ALL: allRequests.length }
    Object.keys(STATUS_CONFIG).forEach(k => { s[k] = allRequests.filter(r => r.requestStatus === k).length })
    return s
  }, [allRequests])

  // Unique values for filters (from all requests)
  const uniqueRegions = useMemo(() => [...new Set(allRequests.map(r => r.region).filter(Boolean))].sort(), [allRequests])

  // Filter helpers
  const activeFilterCount = [statusFilter, regionFilter, sourceFilter].filter(Boolean).length
  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setRegionFilter('')
    setSourceFilter('')
    setQuickFilter('ALL')
    setFilterOpen(false)
  }

  const selectCls = "w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
  const filterLabelCls = "block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1"

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Koordinator</h1>
          <p className="text-xs text-gray-400 mt-0.5">{data.totalElements} sorğu</p>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none">
        {STAT_CARDS.map(s => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => setQuickFilter(s.id)}
              className={clsx(
                'rounded-xl border px-3 py-2 text-left transition-colors shrink-0 min-w-[90px]',
                quickFilter === s.id
                  ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-700'
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

      {/* ── Search + Filter popover ── */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1 min-w-0">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sorğu ID, şirkət, layihə, bölgə..."
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(p => !p)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs border rounded-lg transition-colors',
              activeFilterCount > 0
                ? 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
          >
            <SlidersHorizontal size={13} />
            Filtrlər
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 flex items-center justify-center rounded-full bg-purple-600 text-white text-[9px] font-bold">{activeFilterCount}</span>
            )}
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-30 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 space-y-3">
              {/* Status */}
              <div>
                <label className={filterLabelCls}>Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
                  <option value="">Hamısı</option>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              {/* Bölgə + Mənbə */}
              <div className="grid grid-cols-2 gap-2">
                {uniqueRegions.length > 0 && (
                  <div>
                    <label className={filterLabelCls}>Bölgə</label>
                    <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className={selectCls}>
                      <option value="">Hamısı</option>
                      {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className={filterLabelCls}>Mənbə</label>
                  <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className={selectCls}>
                    <option value="">Hamısı</option>
                    {Object.entries(OWN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                {activeFilterCount > 0 ? (
                  <button onClick={clearFilters} className="text-[11px] text-red-500 hover:text-red-600 font-medium transition-colors">
                    Filtrləri təmizlə
                  </button>
                ) : <span />}
                <button onClick={() => setFilterOpen(false)} className="text-[11px] text-purple-600 hover:text-purple-700 font-semibold transition-colors">
                  Bağla
                </button>
              </div>
            </div>
          )}
        </div>
        <button onClick={load} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 hover:text-purple-600 transition-colors" title="Yenilə">
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
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Texnika</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Mənbə</th>
                <SortHeader label="Müddət" field="dayCount" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ümumi / Xeyir</th>
                <SortHeader label="Status" field="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
                      ) : data.content.filter(r => (!regionFilter || r.region === regionFilter) && (!sourceFilter || r.ownershipType === sourceFilter)).length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-gray-400">
                    {data.totalElements === 0 ? 'Koordinatora hələ sorğu gəlməyib' : 'Filtrlərə uyğun nəticə tapılmadı'}
                  </td>
                </tr>
              ) : (
                data.content.filter(r => (!regionFilter || r.region === regionFilter) && (!sourceFilter || r.ownershipType === sourceFilter)).map((r) => {
                  const status = r.hasPendingSubmit && r.requestStatus === 'SENT_TO_COORDINATOR'
                    ? { label: 'Təklif dəyərləndirilir', cls: 'bg-violet-50 text-violet-700 border-violet-200' }
                    : STATUS_CONFIG[r.requestStatus] || STATUS_CONFIG.SENT_TO_COORDINATOR
                  const total = parseFloat(r.totalAmount || 0)
                  const profit = parseFloat(r.companyProfit || 0)
                  const hasPlan = !!r.planId
                  return (
                    <tr key={r.requestId} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="py-3 px-4">
                        <span className="text-xs font-mono font-semibold text-purple-600 dark:text-purple-400">{r.requestCode}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.companyName}</p>
                        {r.projectName && <p className="text-xs text-gray-400">{r.projectName}</p>}
                        {r.region && <p className="text-xs text-gray-400">{r.region}</p>}
                      </td>
                      <td className="py-3 px-4">
                        {r.equipmentName ? (
                          <div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{r.equipmentName}</p>
                            <p className="text-xs text-gray-400">{r.equipmentCode}</p>
                          </div>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                        {r.ownershipType === 'CONTRACTOR' ? (
                          <span className="text-xs text-orange-600">{r.contractorName || 'Podratçı'}</span>
                        ) : r.ownershipType === 'INVESTOR' ? (
                          <span className="text-xs text-blue-600">İnvestor</span>
                        ) : (
                          <span className="text-xs text-green-600">Şirkət</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                        {r.projectType ? `${r.dayCount ? `${r.dayCount} ${r.projectType === 'DAILY' ? 'gün' : 'ay'}` : PROJECT_TYPE_LABEL[r.projectType]}` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {hasPlan ? (
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{total.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼</p>
                            <p className={clsx('text-xs', profit >= 0 ? 'text-green-600' : 'text-red-500')}>
                              Xeyir: {profit.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
                            </p>
                          </div>
                        ) : <span className="text-xs text-gray-400">Plan yoxdur</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={clsx('px-2 py-0.5 rounded-md text-xs font-medium border', status.cls)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 justify-end flex-wrap">
                          {!['ACCEPTED', 'REJECTED'].includes(r.requestStatus) && canGet && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelected(r) }}
                              className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 px-2.5 py-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors whitespace-nowrap"
                            >
                              <ClipboardList size={13} />
                              {hasPlan ? 'Planı aç' : 'Plan yarat'}
                            </button>
                          )}

                          {r.requestStatus === 'OFFER_SENT' && canPut && (
                            <>
                              <button
                                disabled={actionLoading === r.requestId}
                                onClick={(e) => handleAccept(r, e)}
                                className="flex items-center gap-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                                title="Təklifi təsdiq et — Layihələrə göndər"
                              >
                                <CheckCircle size={13} />
                                Təsdiq
                              </button>
                              <button
                                disabled={actionLoading === r.requestId}
                                onClick={(e) => handleReject(r, e)}
                                className="flex items-center gap-1 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                                title="Təklifi ləğv et"
                              >
                                <XCircle size={13} />
                                Ləğv et
                              </button>
                            </>
                          )}

                          {r.requestStatus === 'ACCEPTED' && (
                            <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                              <CheckCircle size={13} />
                              Layihəyə göndərildi
                            </span>
                          )}
                          {r.requestStatus === 'REJECTED' && (
                            <span className="flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400">
                              <XCircle size={13} />
                              Rədd edildi
                            </span>
                          )}
                        </div>
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

      {selected && (
        <CoordinatorPlanModal
          request={selected}
          onClose={() => setSelected(null)}
          onSaved={load}
        />
      )}
      <ConfirmDialog />
    </div>
  )
}
