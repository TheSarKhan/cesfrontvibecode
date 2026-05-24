import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, Send, ClipboardList, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Eye, Edit3, SlidersHorizontal, FileText, Clock, CheckCircle, XCircle, Send as SendIcon, AlertCircle } from 'lucide-react'
import { requestsApi } from '../../api/requests'
import { useAuthStore } from '../../store/authStore'
import { STATUS_CFG, PROJECT_TYPES, fmtDate } from '../../constants/requests'
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

// PM flow stat kartları — həm UI kit iconCls, həm Tailwind color
const STAT_CARDS = [
  { id: 'ALL',                      label: 'Hamısı',              icon: FileText,    iconCls: '',       color: 'text-gray-500' },
  { id: 'DRAFT',                    label: 'Qaralama',            icon: FileText,    iconCls: '',       color: 'text-gray-400' },
  { id: 'PENDING',                  label: 'PM-ə yönləndirildi',  icon: SendIcon,    iconCls: '',       color: 'text-blue-500' },
  { id: 'PM_REVIEW',                label: 'PM nəzərdə',          icon: Clock,       iconCls: '',       color: 'text-sky-500' },
  { id: 'COORDINATOR_NEGOTIATING',  label: 'Koordinatorda',       icon: SendIcon,    iconCls: 'gold',   color: 'text-purple-500' },
  { id: 'PM_PRICE_NEGOTIATION',     label: 'Sifarişçi ilə',       icon: AlertCircle, iconCls: 'gold',   color: 'text-amber-500' },
  { id: 'DELIVERED',                label: 'Tamamlandı',          icon: CheckCircle, iconCls: 'ok',     color: 'text-green-500' },
  { id: 'REJECTED',                 label: 'Rədd',                icon: XCircle,     iconCls: 'danger', color: 'text-red-500' },
]

function SortHeader({ label, field, sortBy, sortDir, onSort, align }) {
  const active = sortBy === field
  return (
    <th
      onClick={() => onSort(field)}
      className={align === 'right' ? 'r' : undefined}
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        {active ? (
          sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
        ) : (
          <ArrowUpDown size={11} style={{ opacity: 0.3 }} />
        )}
      </span>
    </th>
  )
}

export default function RequestsPage() {
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
      const keep = ['page', 'size', 'sortBy', 'sortDir']
      const result = new URLSearchParams()
      keep.forEach(k => { if (n.has(k)) result.set(k, n.get(k)) })
      Object.entries(p).forEach(([k, v]) => result.set(k, v))
      return result
    }, { replace: true })
  }, [search, statusFilter, regionFilter, projectTypeFilter, transportFilter, quickFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!filterOpen) return
    const handler = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen])

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

  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId) return
    requestsApi.getById(Number(openId))
      .then(res => setSlideOver(res.data.data || res.data))
      .catch(() => {})
    setSearchParams(p => { const n = new URLSearchParams(p); n.delete('open'); return n }, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    requestsApi.getAll().then(res => setAllRequests(res.data.data || res.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    requestsApi.getAll().then(res => setAllRequests(res.data.data || res.data || [])).catch(() => {})
  }, [data])

  useRequestsWebSocket(() => load())

  usePageShortcuts({
    onNew: canCreate ? () => setModal({ open: true, editing: null }) : undefined,
    searchRef,
  })

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

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleAll = () => {
    if (selectedIds.length === data.content.length) setSelectedIds([])
    else setSelectedIds(data.content.map(r => r.id))
  }

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
      if (request.status === 'DRAFT') {
        await requestsApi.submit(request.id)
      }
      await requestsApi.sendToCoordinator(request.id)
      toast.success('Kordinatora göndərildi')
      load()
    } catch {
    }
  }

  const stats = useMemo(() => {
    const s = { ALL: allRequests.length }
    Object.keys(STATUS_CFG).forEach(k => { s[k] = allRequests.filter(r => r.status === k).length })
    return s
  }, [allRequests])

  const uniqueRegions = useMemo(() => [...new Set(allRequests.map(r => r.region).filter(Boolean))].sort(), [allRequests])

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

  useEffect(() => { setPage(0) }, [search, statusFilter, regionFilter, projectTypeFilter, transportFilter, quickFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-7 gap-4 flex-wrap">
        <div>
          <h1 className="ces-page-title">Sorğular</h1>
          <p className="ces-page-sub">{data.totalElements} sorğu qeydiyyatda</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && canEditPerm && (
            <button onClick={() => setBulkModal(true)} className="ces-btn ces-btn-outline">
              <Edit3 size={15} />
              Toplu ({selectedIds.length})
            </button>
          )}
          {canCreate && (
            <button onClick={() => setModal({ open: true, editing: null })} className="ces-btn ces-btn-primary">
              <Plus size={16} />
              Yeni sorğu
            </button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
        {STAT_CARDS.map(s => {
          const Icon = s.icon
          const active = quickFilter === s.id
          return (
            <button
              key={s.id}
              onClick={() => setQuickFilter(s.id)}
              className="ces-kpi-card"
              style={{
                padding: 14,
                textAlign: 'left',
                cursor: 'pointer',
                borderColor: active ? 'var(--ces-gold)' : 'var(--ces-line)',
                background: active ? 'var(--ces-gold-50)' : 'var(--ces-surface)',
              }}
            >
              <div className="ces-kpi-top" style={{ marginBottom: 8 }}>
                <span className="ces-kpi-lab" style={{ fontSize: 10 }}>{s.label}</span>
                <span className={clsx('ces-kpi-ic', s.iconCls)} style={{ width: 28, height: 28, borderRadius: 8 }}>
                  <Icon size={14} />
                </span>
              </div>
              <div className="ces-kpi-val" style={{ fontSize: 22 }}>{stats[s.id] ?? 0}</div>
            </button>
          )
        })}
      </div>

      {/* Search + filter + refresh */}
      <div className="flex flex-wrap gap-2 mb-5 items-center">
        <div className="ces-input has-icon sm flex-1 min-w-[240px]">
          <Search size={15} />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sorğu kodu, şirkət, layihə, bölgə..."
          />
        </div>

        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(p => !p)}
            className={clsx('ces-btn ces-btn-sm', activeFilterCount > 0 ? 'ces-btn-primary' : 'ces-btn-outline')}
          >
            <SlidersHorizontal size={14} />
            Filtrlər
            {activeFilterCount > 0 && (
              <span style={{ marginLeft: 4, padding: '0 6px', minWidth: 18, height: 18, borderRadius: 999, background: 'var(--ces-surface)', color: 'var(--ces-graphite)', fontSize: 11, fontWeight: 700, display: 'inline-grid', placeItems: 'center' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          {filterOpen && (
            <div
              style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 30,
                width: 320, background: 'var(--ces-surface)',
                border: '1px solid var(--ces-line)', borderRadius: 14,
                boxShadow: 'var(--ces-shadow-lg)', padding: 16,
                display: 'flex', flexDirection: 'column', gap: 12,
              }}
            >
              <div className="ces-field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ces-muted)', fontWeight: 700, marginBottom: 6 }}>Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ces-select sm" style={{ width: '100%' }}>
                  <option value="">Hamısı</option>
                  {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              {uniqueRegions.length > 0 && (
                <div className="ces-field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ces-muted)', fontWeight: 700, marginBottom: 6 }}>Bölgə</label>
                  <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="ces-select sm" style={{ width: '100%' }}>
                    <option value="">Hamısı</option>
                    {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="ces-field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ces-muted)', fontWeight: 700, marginBottom: 6 }}>Layihə tipi</label>
                  <select value={projectTypeFilter} onChange={(e) => setProjectTypeFilter(e.target.value)} className="ces-select sm" style={{ width: '100%' }}>
                    <option value="">Hamısı</option>
                    {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="ces-field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ces-muted)', fontWeight: 700, marginBottom: 6 }}>Daşınma</label>
                  <select value={transportFilter} onChange={(e) => setTransportFilter(e.target.value)} className="ces-select sm" style={{ width: '100%' }}>
                    <option value="">Hamısı</option>
                    <option value="YES">Bəli</option>
                    <option value="NO">Xeyr</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--ces-line)' }}>
                {activeFilterCount > 0 ? (
                  <button onClick={clearFilters} className="ces-btn ces-btn-xs ces-btn-ghost" style={{ color: 'var(--ces-danger)' }}>
                    Filtrləri təmizlə
                  </button>
                ) : <span />}
                <button onClick={() => setFilterOpen(false)} className="ces-btn ces-btn-xs ces-btn-ghost">
                  Bağla
                </button>
              </div>
            </div>
          )}
        </div>

        <button onClick={load} className="ces-btn ces-btn-icon ces-btn-sm ces-btn-outline" title="Yenilə">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="ces-table-wrap">
        <div className="overflow-x-auto">
          <table className="ces-tbl" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th className="w-chk">
                  <label className="ces-chk">
                    <input
                      type="checkbox"
                      checked={data.content.length > 0 && selectedIds.length === data.content.length}
                      onChange={toggleAll}
                    />
                    <span className="ces-cb"></span>
                  </label>
                </th>
                <SortHeader label="Kod" field="id" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Şirkət / Layihə" field="companyName" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Bölgə" field="region" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th>Daşınma</th>
                <SortHeader label="Status" field="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Tarix" field="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="r">Əməliyyat</th>
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
                      onClick={() => setSlideOver(r)}
                      style={{
                        cursor: 'pointer',
                        background: selectedIds.includes(r.id) ? 'var(--ces-gold-50)' : undefined,
                      }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <label className="ces-chk">
                          <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} />
                          <span className="ces-cb"></span>
                        </label>
                      </td>
                      <td className="mono" style={{ color: 'var(--ces-gold-700)', fontWeight: 700, fontSize: 12.5 }}>
                        {r.requestCode || `REQ-${String(r.id).padStart(4, '0')}`}
                      </td>
                      <td>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ces-ink)' }}>{r.companyName}</div>
                        {r.projectName && <div style={{ fontSize: 12, color: 'var(--ces-muted)' }}>{r.projectName}</div>}
                      </td>
                      <td style={{ color: 'var(--ces-ink)' }}>{r.region || <span style={{ color: 'var(--ces-mute2)' }}>—</span>}</td>
                      <td>
                        {r.transportationRequired ? (
                          <span className="ces-pill ces-p-ok sm">Bəli</span>
                        ) : (
                          <span style={{ color: 'var(--ces-mute2)', fontSize: 13 }}>Xeyr</span>
                        )}
                      </td>
                      <td>
                        <span className={clsx('ces-pill sm', status.pill)}>
                          <span className="d"></span>
                          {status.label}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: 12.5, color: 'var(--ces-muted)' }}>{fmtDate(r.createdAt)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => setSlideOver(r)} className="ces-row-act info" title="Ətraflı bax">
                            <Eye size={15} />
                          </button>
                          {canEdit && (
                            <button onClick={() => setModal({ open: true, editing: r })} className="ces-row-act gold" title="Redaktə et">
                              <Pencil size={15} />
                            </button>
                          )}
                          {['DRAFT', 'PENDING'].includes(r.status) && canSendToCoordinator && (
                            <button onClick={() => doSendCoordinator(r)} className="ces-row-act" title="Kordinatora göndər">
                              <Send size={15} />
                            </button>
                          )}
                          {['DRAFT', 'PENDING'].includes(r.status) && canDeletePerm && (
                            <button onClick={() => handleDelete(r)} className="ces-row-act danger" title="Sil">
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

        {!loading && data.totalPages > 0 && (
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 22px', borderTop: '1px solid var(--ces-line)',
              background: 'var(--ces-surface)', fontSize: 13,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ces-muted)' }}>
              <span>{data.totalElements} nəticədən {page * size + 1}–{Math.min((page + 1) * size, data.totalElements)} göstərilir</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
                className="ces-row-act"
                style={{ opacity: page === 0 ? 0.3 : 1 }}
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
                    className="ces-row-act"
                    style={{
                      width: 30, height: 30,
                      background: p === page ? 'var(--ces-graphite)' : 'transparent',
                      color: p === page ? 'var(--ces-on-primary)' : 'var(--ces-muted)',
                      fontWeight: p === page ? 700 : 500,
                      fontSize: 12.5,
                    }}
                  >
                    {p + 1}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= data.totalPages - 1}
                className="ces-row-act"
                style={{ opacity: page >= data.totalPages - 1 ? 0.3 : 1 }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ces-muted)' }}>
              <span>Səhifədə</span>
              <select
                value={size}
                onChange={(e) => setSearchParams(p => { const n = new URLSearchParams(p); n.set('size', e.target.value); n.delete('page'); return n }, { replace: true })}
                className="ces-select sm"
                style={{ minWidth: 70 }}
              >
                {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
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
