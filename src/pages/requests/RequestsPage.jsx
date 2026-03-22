import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronLeft, ChevronRight, Send, ClipboardList, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Save, Bookmark, X, Eye, CheckSquare, Edit3 } from 'lucide-react'
import { requestsApi } from '../../api/requests'
import { useAuthStore } from '../../store/authStore'
import { STATUS_CFG, PROJECT_TYPES, fmtDate, dash } from '../../constants/requests'
import RequestModal from './RequestModal'
import StatusChangeModal from './StatusChangeModal'
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
const PRESET_KEY = 'requests_filter_presets'

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
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, editing: null })
  const [statusModal, setStatusModal] = useState({ open: false, request: null })
  const [slideOver, setSlideOver] = useState(null)
  const [bulkModal, setBulkModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const searchRef = useRef(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // Filter state from URL
  const search = searchParams.get('q') || ''
  const statusFilter = searchParams.get('status') || ''
  const regionFilter = searchParams.get('region') || ''
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

  // ─── Presets ────────────────────────────────────────
  const [presets, setPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PRESET_KEY)) || [] } catch { return [] }
  })
  const savePresets = (p) => { setPresets(p); localStorage.setItem(PRESET_KEY, JSON.stringify(p)) }

  const handleSavePreset = () => {
    const name = prompt('Preset adı:')
    if (!name?.trim()) return
    const preset = { name: name.trim(), search, status: statusFilter, region: regionFilter, sortBy, sortDir }
    savePresets([...presets, preset])
    toast.success('Preset saxlanıldı')
  }

  const handleLoadPreset = (preset) => {
    setSearchParams(p => {
      const n = new URLSearchParams(p)
      preset.search ? n.set('q', preset.search) : n.delete('q')
      preset.status ? n.set('status', preset.status) : n.delete('status')
      preset.region ? n.set('region', preset.region) : n.delete('region')
      preset.sortBy ? n.set('sortBy', preset.sortBy) : n.delete('sortBy')
      preset.sortDir ? n.set('sortDir', preset.sortDir) : n.delete('sortDir')
      n.delete('page')
      return n
    }, { replace: true })
  }

  const handleDeletePreset = (index) => {
    savePresets(presets.filter((_, i) => i !== index))
    toast.success('Preset silindi')
  }

  // ─── Data loading ───────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, size, sortBy, sortDir }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (regionFilter) params.region = regionFilter
      const res = await requestsApi.getAllPaged(params)
      setData(res.data.data || res.data)
    } catch {
      toast.error('Sorğular yüklənmədi')
    } finally {
      setLoading(false)
    }
  }, [page, size, sortBy, sortDir, search, statusFilter, regionFilter])

  useEffect(() => { load() }, [load])

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
      toast.error('Silmə uğursuz oldu')
    }
  }

  const doSendCoordinator = async (request) => {
    if (!(await confirm({ title: 'Kordinatora göndər', message: `"${request.requestCode || request.companyName}" sorğusunu kordinatora göndərmək istəyirsiniz?` }))) return
    try {
      await requestsApi.sendToCoordinator(request.id)
      toast.success('Kordinatora göndərildi')
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Uğursuz oldu')
    }
  }

  // ─── Unique regions for filter ──────────────────────
  const regions = [...new Set(data.content.map(r => r.region).filter(Boolean))]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Sorğular</h1>
          <p className="text-xs text-gray-400 mt-0.5">{data.totalElements} sorğu</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && canEditPerm && (
            <button
              onClick={() => setBulkModal(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Edit3 size={14} />
              Toplu ({selectedIds.length})
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => setModal({ open: true, editing: null })}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Yeni sorğu
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => { setParam('q', e.target.value); setParam('page', '') }}
            placeholder="Sorğu ID, şirkət, layihə, bölgə..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setParam('status', e.target.value); setParam('page', '') }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Bütün statuslar</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={regionFilter}
          onChange={(e) => { setParam('region', e.target.value); setParam('page', '') }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Bütün bölgələr</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        {/* Presets */}
        <div className="flex items-center gap-1">
          <button onClick={handleSavePreset} className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors" title="Preset saxla">
            <Save size={14} />
          </button>
          {presets.map((p, i) => (
            <div key={i} className="flex items-center">
              <button onClick={() => handleLoadPreset(p)} className="px-2 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-amber-600 border border-gray-200 dark:border-gray-600 rounded-l-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" title={`Preset: ${p.name}`}>
                <Bookmark size={11} className="inline mr-1" />{p.name}
              </button>
              <button onClick={() => handleDeletePreset(i)} className="px-1 py-1.5 text-xs text-gray-400 hover:text-red-500 border border-l-0 border-gray-200 dark:border-gray-600 rounded-r-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>

        <button onClick={load} className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors" title="Yenilə">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="py-3 px-4 w-8">
                  <input type="checkbox" checked={data.content.length > 0 && selectedIds.length === data.content.length} onChange={toggleAll} className="accent-amber-600 w-3.5 h-3.5" />
                </th>
                <SortHeader label="ID" field="id" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Şirkət / Layihə" field="companyName" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Bölgə" field="region" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Daşınma</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Texnika</th>
                <SortHeader label="Status" field="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Tarix" field="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={9} rows={6} />
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
                        {r.selectedEquipmentName ? (
                          <div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{r.selectedEquipmentName}</p>
                            <p className="text-xs text-gray-400">{r.selectedEquipmentCode}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Seçilməyib</span>
                        )}
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setStatusModal({ open: true, request: r })}
                          className="group"
                          title="Status dəyiş"
                        >
                          <span className={clsx('px-2 py-0.5 rounded-md text-xs font-medium border group-hover:ring-2 group-hover:ring-amber-300 transition-all', status.cls)}>
                            {status.label}
                          </span>
                        </button>
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
                onChange={(e) => { setParam('size', e.target.value); setParam('page', '') }}
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
      {statusModal.open && (
        <StatusChangeModal
          request={statusModal.request}
          onClose={() => setStatusModal({ open: false, request: null })}
          onSaved={() => { setStatusModal({ open: false, request: null }); load() }}
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
