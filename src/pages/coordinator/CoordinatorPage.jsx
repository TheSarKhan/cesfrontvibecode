import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Search, ClipboardList, CheckCircle, XCircle, RefreshCw, SlidersHorizontal, FileText, Send, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react'
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
  SENT_TO_COORDINATOR: { label: 'Koordinatorda',     pill: 'ces-p-solid' },
  OFFER_SENT:          { label: 'Gözdən keçirilir',  pill: 'ces-p-warn' },
  ACCEPTED:            { label: 'Qəbul edildi',      pill: 'ces-p-ok' },
  REJECTED:            { label: 'Rədd edildi',       pill: 'ces-p-danger' },
}

const PROJECT_TYPE_LABEL = { DAILY: 'Günlük', MONTHLY: 'Aylıq' }

const STAT_CARDS = [
  { id: 'ALL',                  label: 'Hamısı',         icon: FileText,     iconCls: '' },
  { id: 'SENT_TO_COORDINATOR',  label: 'Koordinatorda',  icon: Send,         iconCls: 'gold' },
  { id: 'OFFER_SENT',           label: 'Gözdən keçirilir', icon: AlertCircle, iconCls: 'warn' },
  { id: 'ACCEPTED',             label: 'Qəbul',          icon: CheckCircle,  iconCls: 'ok' },
  { id: 'REJECTED',             label: 'Rədd',           icon: XCircle,      iconCls: 'danger' },
]

const OWN_LABELS = { COMPANY: 'Şirkət', CONTRACTOR: 'Podratçı', INVESTOR: 'İnvestor' }
const OWN_PILL   = { COMPANY: 'ces-p-ok', CONTRACTOR: 'ces-p-warn', INVESTOR: 'ces-p-info' }

function SortHeader({ label, field, sortBy, sortDir, onSort, className }) {
  const active = sortBy === field
  return (
    <th
      className={className}
      style={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
          : <ArrowUpDown size={10} style={{ color: 'var(--ces-mute2)' }} />}
      </span>
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
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Təklif təsdiq edilə bilmədi')
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
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Təklif ləğv edilə bilmədi')
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

  useEffect(() => {
    coordinatorApi.getRequests().then(res => setAllRequests(res.data.data || [])).catch(() => {})
  }, [data])

  const stats = useMemo(() => {
    const s = { ALL: allRequests.length }
    Object.keys(STATUS_CONFIG).forEach(k => { s[k] = allRequests.filter(r => r.requestStatus === k).length })
    return s
  }, [allRequests])

  const uniqueRegions = useMemo(() => [...new Set(allRequests.map(r => r.region).filter(Boolean))].sort(), [allRequests])

  const activeFilterCount = [statusFilter, regionFilter, sourceFilter].filter(Boolean).length
  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setRegionFilter('')
    setSourceFilter('')
    setQuickFilter('ALL')
    setFilterOpen(false)
  }

  const filteredRows = data.content.filter(r =>
    (!regionFilter || r.region === regionFilter) &&
    (!sourceFilter || r.ownershipType === sourceFilter)
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="ces-page-title">Koordinator</h1>
          <p className="ces-page-sub">
            {data.totalElements} sorğu · {stats.OFFER_SENT || 0} gözdən keçirilir
          </p>
        </div>
      </div>

      {/* KPI cards (clickable as quick filter) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-5">
        {STAT_CARDS.map(s => {
          const Icon = s.icon
          const active = quickFilter === s.id
          return (
            <button
              key={s.id}
              onClick={() => setQuickFilter(s.id)}
              className="ces-kpi-card text-left"
              style={active ? { borderColor: 'var(--ces-graphite)', boxShadow: 'var(--ces-shadow)' } : undefined}
            >
              <div className="ces-kpi-top">
                <span className="ces-kpi-lab">{s.label}</span>
                <span className={clsx('ces-kpi-ic', s.iconCls)}>
                  <Icon size={16} />
                </span>
              </div>
              <div className="ces-kpi-val">{stats[s.id] ?? 0}</div>
            </button>
          )
        })}
      </div>

      {/* Search + Filter row */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="ces-input has-icon sm flex-1 min-w-[260px]">
          <Search size={15} />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sorğu ID, şirkət, layihə, bölgə..."
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
              <span
                className="inline-grid place-items-center rounded-full text-[10px] font-bold mono"
                style={{
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  background: 'var(--ces-gold)',
                  color: 'var(--ces-on-gold)',
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
          {filterOpen && (
            <div
              className="absolute right-0 top-full mt-2 z-30"
              style={{
                width: 320,
                background: 'var(--ces-surface)',
                border: '1px solid var(--ces-line)',
                borderRadius: 14,
                boxShadow: 'var(--ces-shadow-lg)',
                padding: 18,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="ces-sec-label m-0">Filtrlər</p>
                <button onClick={() => setFilterOpen(false)} className="ces-row-act">
                  <X size={14} />
                </button>
              </div>

              <div className="ces-field" style={{ marginBottom: 12 }}>
                <label>Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ces-select sm">
                  <option value="">Hamısı</option>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {uniqueRegions.length > 0 && (
                  <div className="ces-field" style={{ marginBottom: 12 }}>
                    <label>Bölgə</label>
                    <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="ces-select sm">
                      <option value="">Hamısı</option>
                      {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                )}
                <div className="ces-field" style={{ marginBottom: 12 }}>
                  <label>Mənbə</label>
                  <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="ces-select sm">
                    <option value="">Hamısı</option>
                    {Object.entries(OWN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--ces-line)' }}>
                {activeFilterCount > 0 ? (
                  <button onClick={clearFilters} className="ces-btn ces-btn-ghost ces-btn-xs" style={{ color: 'var(--ces-danger)' }}>
                    Təmizlə
                  </button>
                ) : <span />}
                <button onClick={() => setFilterOpen(false)} className="ces-btn ces-btn-primary ces-btn-xs">
                  Tətbiq et
                </button>
              </div>
            </div>
          )}
        </div>
        <button onClick={load} className="ces-btn ces-btn-outline ces-btn-sm" title="Yenilə">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="ces-table-wrap">
        <div className="overflow-x-auto">
          <table className="ces-tbl" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <SortHeader label="ID"              field="requestCode" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Şirkət / Layihə" field="companyName" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th>Texnika</th>
                <th>Mənbə</th>
                <SortHeader label="Müddət"          field="dayCount"    sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th>Ümumi / Xeyir</th>
                <SortHeader label="Status"          field="status"      sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="r" style={{ width: 140 }}>Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}>
                        <div className="h-3.5 rounded" style={{ background: 'var(--ces-graphite-100)' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm" style={{ color: 'var(--ces-muted)' }}>
                    {data.totalElements === 0 ? 'Koordinatora hələ sorğu gəlməyib' : 'Filtrlərə uyğun nəticə tapılmadı'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const status = r.hasPendingSubmit && r.requestStatus === 'SENT_TO_COORDINATOR'
                    ? { label: 'Təklif dəyərləndirilir', pill: 'ces-p-info' }
                    : STATUS_CONFIG[r.requestStatus] || STATUS_CONFIG.SENT_TO_COORDINATOR
                  const total = parseFloat(r.totalAmount || 0)
                  const profit = parseFloat(r.companyProfit || 0)
                  const hasPlan = !!r.planId
                  return (
                    <tr key={r.requestId}>
                      <td>
                        <span className="mono font-semibold text-xs" style={{ color: 'var(--ces-gold-700)' }}>
                          {r.requestCode}
                        </span>
                      </td>
                      <td>
                        <div className="font-semibold text-[var(--ces-ink)] truncate" style={{ maxWidth: 220 }} title={r.companyName}>
                          {r.companyName}
                        </div>
                        {r.projectName && (
                          <div className="text-xs truncate" style={{ color: 'var(--ces-muted)', maxWidth: 220 }} title={r.projectName}>
                            {r.projectName}
                          </div>
                        )}
                        {r.region && (
                          <div className="text-xs" style={{ color: 'var(--ces-mute2)' }}>{r.region}</div>
                        )}
                      </td>
                      <td>
                        {r.equipmentName ? (
                          <>
                            <div className="text-[var(--ces-ink)]">{r.equipmentName}</div>
                            {r.equipmentCode && (
                              <div className="mono text-xs" style={{ color: 'var(--ces-muted)' }}>{r.equipmentCode}</div>
                            )}
                          </>
                        ) : <span style={{ color: 'var(--ces-mute2)' }}>—</span>}
                      </td>
                      <td>
                        <span className={clsx('ces-pill sm', OWN_PILL[r.ownershipType] || 'ces-p-mute')}>
                          {r.ownershipType === 'CONTRACTOR'
                            ? (r.contractorName || 'Podratçı')
                            : (OWN_LABELS[r.ownershipType] || '—')}
                        </span>
                      </td>
                      <td style={{ color: 'var(--ces-muted)' }}>
                        {r.projectType
                          ? (r.dayCount
                              ? `${r.dayCount} ${r.projectType === 'DAILY' ? 'gün' : 'ay'}`
                              : PROJECT_TYPE_LABEL[r.projectType])
                          : '—'}
                      </td>
                      <td>
                        {hasPlan ? (
                          <>
                            <div className="num font-semibold text-[var(--ces-ink)]">
                              {total.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
                            </div>
                            <div className="num text-xs" style={{ color: profit >= 0 ? 'var(--ces-ok)' : 'var(--ces-danger)' }}>
                              Xeyir: {profit.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
                            </div>
                          </>
                        ) : <span className="text-xs" style={{ color: 'var(--ces-mute2)' }}>Plan yoxdur</span>}
                      </td>
                      <td>
                        <span className={clsx('ces-pill sm', status.pill)}>
                          <span className="d" />
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 justify-end">
                          {!['ACCEPTED', 'REJECTED'].includes(r.requestStatus) && canGet && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelected(r) }}
                              title={hasPlan ? 'Planı aç' : 'Plan yarat'}
                              className="coord-pill-btn"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                height: 28,
                                padding: '0 10px',
                                borderRadius: 999,
                                fontSize: 11.5,
                                fontWeight: 700,
                                letterSpacing: '.02em',
                                background: hasPlan ? 'var(--ces-gold-100)' : 'var(--ces-surface)',
                                color: hasPlan ? 'var(--ces-gold-700)' : 'var(--ces-graphite)',
                                border: `1px solid ${hasPlan ? 'var(--ces-gold)' : 'var(--ces-line)'}`,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all .15s',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ces-gold)'; e.currentTarget.style.borderColor = 'var(--ces-gold)'; e.currentTarget.style.color = 'var(--ces-on-gold)' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = hasPlan ? 'var(--ces-gold-100)' : 'var(--ces-surface)'; e.currentTarget.style.borderColor = hasPlan ? 'var(--ces-gold)' : 'var(--ces-line)'; e.currentTarget.style.color = hasPlan ? 'var(--ces-gold-700)' : 'var(--ces-ink)' }}
                            >
                              <ClipboardList size={12} />
                              {hasPlan ? 'Plan' : 'Yarat'}
                            </button>
                          )}

                          {r.requestStatus === 'OFFER_SENT' && canPut && (
                            <span
                              className="inline-flex"
                              style={{
                                background: 'var(--ces-surface)',
                                border: '1px solid var(--ces-line)',
                                borderRadius: 999,
                                padding: 2,
                                gap: 2,
                                boxShadow: '0 1px 3px rgba(58,58,58,.08)',
                              }}
                            >
                              <button
                                disabled={actionLoading === r.requestId}
                                onClick={(e) => handleAccept(r, e)}
                                title="Təklifi təsdiq et — Layihələrə göndər"
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 999,
                                  display: 'inline-grid',
                                  placeItems: 'center',
                                  background: 'var(--ces-ok)',
                                  color: '#fff',
                                  border: 'none',
                                  cursor: actionLoading === r.requestId ? 'not-allowed' : 'pointer',
                                  opacity: actionLoading === r.requestId ? 0.5 : 1,
                                  transition: 'transform .12s, background .15s',
                                }}
                                onMouseEnter={(e) => { if (actionLoading !== r.requestId) { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.background = '#0c855a' } }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--ces-ok)' }}
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button
                                disabled={actionLoading === r.requestId}
                                onClick={(e) => handleReject(r, e)}
                                title="Təklifi ləğv et"
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 999,
                                  display: 'inline-grid',
                                  placeItems: 'center',
                                  background: 'var(--ces-danger)',
                                  color: '#fff',
                                  border: 'none',
                                  cursor: actionLoading === r.requestId ? 'not-allowed' : 'pointer',
                                  opacity: actionLoading === r.requestId ? 0.5 : 1,
                                  transition: 'transform .12s, background .15s',
                                }}
                                onMouseEnter={(e) => { if (actionLoading !== r.requestId) { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.background = '#b62b4a' } }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--ces-danger)' }}
                              >
                                <XCircle size={14} />
                              </button>
                            </span>
                          )}

                          {r.requestStatus === 'ACCEPTED' && (
                            <span className="ces-pill ces-p-ok sm">
                              <CheckCircle size={11} />
                              Göndərildi
                            </span>
                          )}
                          {r.requestStatus === 'REJECTED' && (
                            <span className="ces-pill ces-p-danger sm">
                              <XCircle size={11} />
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
        <Pagination
          page={data.page + 1}
          pageSize={data.size}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          onPage={(p) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('page', String(p - 1)); return n }, { replace: true })}
          onPageSize={(s) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('size', String(s)); n.delete('page'); return n }, { replace: true })}
        />
      </div>

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
