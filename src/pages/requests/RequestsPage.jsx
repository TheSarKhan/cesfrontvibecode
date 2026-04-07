import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, Send, ClipboardList, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Eye, Edit3, SlidersHorizontal, FileText, Clock, CheckCircle, XCircle, Send as SendIcon, AlertCircle } from 'lucide-react'
import { requestsApi } from '../../api/requests'
import { useAuthStore } from '../../store/authStore'
import { STATUS_CFG, PROJECT_TYPES, fmtDate, dash } from '../../constants/requests'
import RequestModal from './RequestModal'
import RequestSlideOver from './RequestSlideOver'
import BulkEditModal from './BulkEditModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useSearchParams } from 'react-router-dom'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'
import { useRequestsWebSocket } from '../../hooks/useRequestsWebSocket'

const PAGE_SIZES = [15, 25, 50, 100]

const STAT_CARDS = [
  { id: 'ALL', label: 'Hamısı', icon: FileText, color: 'text-gray-500' },
  { id: 'DRAFT', label: 'Qaralama', icon: FileText, color: 'text-gray-400' },
  { id: 'PENDING', label: 'Hazırdır', icon: Clock, color: 'text-blue-500' },
  { id: 'SENT_TO_COORDINATOR', label: 'Kordinatorda', icon: SendIcon, color: 'text-purple-500' },
  { id: 'OFFER_SENT', label: 'Gözdən keçirilir', icon: AlertCircle, color: 'text-amber-500' },
  { id: 'ACCEPTED', label: 'Qəbul', icon: CheckCircle, color: 'text-green-500' },
  { id: 'REJECTED', label: 'Rədd', icon: XCircle, color: 'text-red-500' },
]

function SortHeader({ label, field, sortBy, sortDir, onSort }) {
  const active = sortBy === field
  return (
    <th
      className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (
          sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
        ) : (
          <ArrowUpDown size={11} className="text-gray-300" />
        )}
      </div>
    </th>
  )
}

export default function RequestsPage() {
  // ─── State ──────────────────────────────────────────
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 25 })
  const [allRequests, setAllRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, editing: null })
  const [slideOver, setSlideOver] = useState(null)
  const [bulkModal, setBulkModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef(null)
  const searchRef = useRef(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // Filter state
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [regionFilter, setRegionFilter] = useState(searchParams.get('region') || '')
  const [projectTypeFilter, setProjectTypeFilter] = useState(searchParams.get('projectType') || '')
  const [transportFilter, setTransportFilter] = useState(searchParams.get('transport') || '')
  const [quickFilter, setQuickFilter] = useState(searchParams.get('quick') || 'ALL')

  const page = parseInt(searchParams.get('page') || '0')
  const size = parseInt(searchParams.get('size') || '25')
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortDir = searchParams.get('sortDir') || 'desc'

  const setParam = (key, val) => setSearchParams(p => { const n = new URLSearchParams(p); val ? n.set(key, val) : n.delete(key); return n }, { replace: true })
  const setPage = (p) => setParam('page', p > 0 ? String(p) : '')

  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('REQUESTS', 'canPost')
  const canEditPerm = hasPermission('REQUESTS', 'canPut')
  const canDeletePerm = hasPermission('REQUESTS', 'canDelete')
  const canSendToCoordinator = hasPermission('REQUESTS', 'canSendToCoordinator')
  const { confirm, ConfirmDialog } = useConfirm()

  // ─── Sync filters → URL ─────────────────────────────
  useEffect(() => {
    const p = {}
    if (search) p.q = search
    if (statusFilter) p.status = statusFilter
    if (regionFilter) p.region = regionFilter
    if (projectTypeFilter) p.projectType = projectTypeFilter
    if (transportFilter) p.transport = transportFilter
    if (quickFilter !== 'ALL') p.quick = quickFilter
    setSearchParams(prev => {
      const n = new URLSearchParams(prev)
      // preserve page/size/sort
      const keep = ['page', 'size', 'sortBy', 'sortDir']
      const result = new URLSearchParams()
      keep.forEach(k => { if (n.has(k)) result.set(k, n.get(k)) })
      Object.entries(p).forEach(([k, v]) => result.set(k, v))
      return result
    }, { replace: true })
  }, [search, statusFilter, regionFilter, projectTypeFilter, transportFilter, quickFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Click outside filter ─────────────────────────────
  useEffect(() => {
    if (!filterOpen) return
    const handler = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen])

  // ─── Data loading ───────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const effectiveStatus = quickFilter !== 'ALL' ? quickFilter : (statusFilter || undefined)
      const params = { page, size, sortBy, sortDir }
      if (search) params.search = search
      if (effectiveStatus) params.status = effectiveStatus
      if (regionFilter) params.region = regionFilter
      if (projectTypeFilter) params.projectType = projectTypeFilter
      if (transportFilter) params.transportationRequired = transportFilter === 'YES'
      const res = await requestsApi.getAllPaged(params)
      setData(res.data.data || res.data)
    } catch {
    } finally {
      setLoading(false)
    }
  }, [page, size, sortBy, sortDir, search, statusFilter, regionFilter, projectTypeFilter, transportFilter, quickFilter])

  useEffect(() => { load() }, [load])

  // Load all for stats
  useEffect(() => {
    requestsApi.getAll().then(res => setAllRequests(res.data.data || res.data || [])).catch(() => {})
  }, [])

  // Reload stats when data changes
  useEffect(() => {
    requestsApi.getAll().then(res => setAllRequests(res.data.data || res.data || [])).catch(() => {})
  }, [data])

  // ─── WebSocket ──────────────────────────────────────
  useRequestsWebSocket(() => load())

  // ─── Shortcuts ──────────────────────────────────────
  usePageShortcuts({
    onNew: canCreate ? () => setModal({ open: true, editing: null }) : undefined,
    searchRef,
  })

  // ─── Sorting ────────────────────────────────────────
  const handleSort = (field) => {
    setSearchParams(p => {
      const n = new URLSearchParams(p)
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

  // ─── Selection ──────────────────────────────────────
  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleAll = () => {
    if (selectedIds.length === data.content.length) setSelectedIds([])
    else setSelectedIds(data.content.map(r => r.id))
  }

  // ─── Actions ────────────────────────────────────────
  const handleDelete = async (r) => {
    if (!(await confirm({ title: 'Sorğunu sil', message: `"${r.requestCode || r.companyName}" sorğusunu silmək istəyirsiniz?` }))) return
    try {
      await requestsApi.delete(r.id)
      toast.success('Sorğu silindi')
      load()
    } catch (err) {
      if (err?.isPending) return
    }
  }

  const doSendCoordinator = async (request) => {
    if (!(await confirm({ title: 'Kordinatora göndər', message: `"${request.requestCode || request.companyName}" sorğusunu kordinatora göndərmək istəyirsiniz?` }))) return
    try {
      await requestsApi.sendToCoordinator(request.id)
      toast.success('Kordinatora göndərildi')
      load()
    } catch {
    }
  }

  // ─── Stats ─────────────────────────────────────────
  const stats = useMemo(() => {
    const s = { ALL: allRequests.length }
    Object.keys(STATUS_CFG).forEach(k => { s[k] = allRequests.filter(r => r.status === k).length })
    return s
  }, [allRequests])

  // ─── Unique values for filter dropdowns ─────────────
  const uniqueRegions = useMemo(() => [...new Set(allRequests.map(r => r.region).filter(Boolean))].sort(), [allRequests])

  // ─── Filter helpers ─────────────────────────────────
  const activeFilterCount = [statusFilter, regionFilter, projectTypeFilter, transportFilter].filter(Boolean).length
  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setRegionFilter('')
    setProjectTypeFilter('')
    setTransportFilter('')
    setQuickFilter('ALL')
    setFilterOpen(false)
  }

  // Reset page on filter change
  useEffect(() => { setPage(0) }, [search, statusFilter, regionFilter, projectTypeFilter, transportFilter, quickFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectCls = "w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
  const filterLabelCls = "block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1"

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Sorğular</h1>
          <p className="text-xs text-gray-400 mt-0.5">{data.totalElements} sorğu</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && canEditPerm && (
            <button
              onClick={() => setBulkModal(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
            >
              <Edit3 size={14} />
              Toplu ({selectedIds.length})
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => setModal({ open: true, editing: null })}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
            >
              <Plus size={14} />
              Yeni sorğu
            </button>
          )}
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
                  ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-700'
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
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(p => !p)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs border rounded-lg transition-colors',
              activeFilterCount > 0
                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
          >
            <SlidersHorizontal size={13} />
            Filtrlər
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 flex items-center justify-center rounded-full bg-amber-600 text-white text-[9px] font-bold">{activeFilterCount}</span>
            )}
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-30 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 space-y-3">
              {/* Status */}
              <div>
                <label className={filterLabelCls}>Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
                  <option value="">Hamısı</option>
                  {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              {/* Bölgə */}
              {uniqueRegions.length > 0 && (
                <div>
                  <label className={filterLabelCls}>Bölgə</label>
                  <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className={selectCls}>
                    <option value="">Hamısı</option>
                    {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
              {/* Layihə tipi + Daşınma */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={filterLabelCls}>Layihə tipi</label>
                  <select value={projectTypeFilter} onChange={(e) => setProjectTypeFilter(e.target.value)} className={selectCls}>
                    <option value="">Hamısı</option>
                    {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={filterLabelCls}>Daşınma</label>
                  <select value={transportFilter} onChange={(e) => setTransportFilter(e.target.value)} className={selectCls}>
                    <option value="">Hamısı</option>
                    <option value="YES">Bəli</option>
                    <option value="NO">Xeyr</option>
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
                <button onClick={() => setFilterOpen(false)} className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold transition-colors">
                  Bağla
                </button>
              </div>
            </div>
          )}
        </div>
        <button onClick={load} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors" title="Yenilə">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="py-3 px-4 w-8">
                  <input type="checkbox" checked={data.content.length > 0 && selectedIds.length === data.content.length} onChange={toggleAll} className="accent-amber-600 w-3.5 h-3.5" />
                </th>
                <SortHeader label="ID" field="id" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Şirkət / Layihə" field="companyName" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Bölgə" field="region" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Daşınma</th>
                <SortHeader label="Status" field="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Tarix" field="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={8} rows={6} />
              ) : data.content.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Sorğu tapılmadı"
                  description="Axtarış şərtlərini dəyişin və ya yeni sorğu əlavə edin"
                  action={canCreate ? () => setModal({ open: true, editing: null }) : undefined}
                  actionLabel={canCreate ? 'Yeni Sorğu' : undefined}
                />
              ) : (
                data.content.map((r) => {
                  const status = STATUS_CFG[r.status] || STATUS_CFG.DRAFT
                  const canEdit = ['DRAFT', 'PENDING'].includes(r.status) && canEditPerm
                  return (
                    <tr
                      key={r.id}
                      className={clsx(
                        'border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer',
                        selectedIds.includes(r.id) && 'bg-amber-50/50 dark:bg-amber-900/10'
                      )}
                      onClick={() => setSlideOver(r)}
                    >
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} className="accent-amber-600 w-3.5 h-3.5" />
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">
                          {r.requestCode || `REQ-${String(r.id).padStart(4, '0')}`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.companyName}</p>
                        {r.projectName && <p className="text-xs text-gray-400">{r.projectName}</p>}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{r.region || '—'}</td>
                      <td className="py-3 px-4">
                        {r.transportationRequired ? (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">Bəli</span>
                        ) : (
                          <span className="text-xs text-gray-400">Xeyr</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={clsx('px-2 py-0.5 rounded-md text-xs font-medium border', status.cls)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400">{fmtDate(r.createdAt)}</td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setSlideOver(r)}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors"
                            title="Ətraflı bax"
                          >
                            <Eye size={15} />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => setModal({ open: true, editing: r })}
                              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
                              title="Redaktə et"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {r.status === 'PENDING' && canSendToCoordinator && (
                            <button
                              onClick={() => doSendCoordinator(r)}
                              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-purple-500 transition-colors"
                              title="Kordinatora göndər"
                            >
                              <Send size={15} />
                            </button>
                          )}
                          {['DRAFT', 'PENDING'].includes(r.status) && canDeletePerm && (
                            <button
                              onClick={() => handleDelete(r)}
                              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"
                              title="Sil"
                            >
                              <Trash2 size={15} />
                            </button>
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

        {/* Pagination */}
        {!loading && data.totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Səhifə {page + 1} / {data.totalPages}</span>
              <span className="text-gray-300">|</span>
              <span>{data.totalElements} nəticə</span>
              <select
                value={size}
                onChange={(e) => setSearchParams(p => { const n = new URLSearchParams(p); n.set('size', e.target.value); n.delete('page'); return n }, { replace: true })}
                className="ml-2 px-1.5 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              >
                {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(data.totalPages, 5) }, (_, i) => {
                const start = Math.max(0, Math.min(page - 2, data.totalPages - 5))
                const p = start + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={clsx(
                      'w-7 h-7 text-xs rounded-md transition-colors',
                      p === page ? 'bg-amber-600 text-white font-semibold' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                  >
                    {p + 1}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= data.totalPages - 1}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal.open && (
        <RequestModal
          editing={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => { setModal({ open: false, editing: null }); load() }}
        />
      )}
      {slideOver && (
        <RequestSlideOver
          request={slideOver}
          onClose={() => setSlideOver(null)}
        />
      )}
      {bulkModal && (
        <BulkEditModal
          selectedIds={selectedIds}
          onClose={() => setBulkModal(false)}
          onSaved={() => { setBulkModal(false); setSelectedIds([]); load() }}
        />
      )}
      <ConfirmDialog />
    </div>
  )
}
