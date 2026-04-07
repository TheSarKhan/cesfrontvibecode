import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, Star, HardHat, Eye, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { contractorsApi } from '../../api/contractors'
import ContractorModal from './ContractorModal'
import ContractorSlideOver from './ContractorSlideOver'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useSearchParams } from 'react-router-dom'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'
import Pagination from '../../components/common/Pagination'

const RISK_CONFIG = {
  LOW: { label: 'Aşağı', cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  MEDIUM: { label: 'Orta', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  HIGH: { label: 'Yüksək', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
}

const STATUS_CONFIG = {
  ACTIVE: { label: 'Aktiv', cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  INACTIVE: { label: 'Deaktiv', cls: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
}
const PAYMENT_LABEL = { CASH: 'Nağd', TRANSFER: 'Köçürmə' }

function RatingStars({ rating }) {
  if (rating == null || rating === '') return <span className="text-gray-400 text-xs">—</span>
  const val = parseFloat(rating)
  return (
    <div className="flex items-center gap-1">
      <Star size={13} className="fill-amber-400 text-amber-400" />
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{val.toFixed(1)}</span>
    </div>
  )
}

export default function ContractorsPage() {
  const hasPermission = useAuthStore(s => s.hasPermission)
  const canCreate = hasPermission('CONTRACTOR_MANAGEMENT', 'canPost')
  const canEdit   = hasPermission('CONTRACTOR_MANAGEMENT', 'canPut')
  const canDelete = hasPermission('CONTRACTOR_MANAGEMENT', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, editing: null })
  const [selected, setSelected] = useState(null)
  const searchRef = useRef(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  usePageShortcuts({
    onNew: canCreate ? () => setModal({ open: true, editing: null }) : undefined,
    searchRef,
  })

  // Filters
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') || ''
  const statusFilter = searchParams.get('status') || ''
  const riskFilter = searchParams.get('risk') || ''
  const page = Number(searchParams.get('page') || '0')
  const size = Number(searchParams.get('size') || '15')

  const setSearch = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('q', v) : n.delete('q'); n.delete('page'); return n }, { replace: true })
  const setStatusFilter = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('status', v) : n.delete('status'); n.delete('page'); return n }, { replace: true })
  const setRiskFilter = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('risk', v) : n.delete('risk'); n.delete('page'); return n }, { replace: true })
  const setPage = (p) => setSearchParams(prev => { const n = new URLSearchParams(prev); p > 0 ? n.set('page', String(p)) : n.delete('page'); return n }, { replace: true })
  const setPageSize = (s) => setSearchParams(prev => { const n = new URLSearchParams(prev); s !== 15 ? n.set('size', String(s)) : n.delete('size'); n.delete('page'); return n }, { replace: true })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, size, ...(search && { q: search }), ...(statusFilter && { status: statusFilter }), ...(riskFilter && { risk: riskFilter }) }
      const res = await contractorsApi.getAllPaged(params)
      setData(res.data.data || res.data)
      setSelectedIds(new Set())
    } catch {
    } finally {
      setLoading(false)
    }
  }, [page, size, search, statusFilter, riskFilter])

  useEffect(() => { load() }, [load])

  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allSelected = data.content.length > 0 && data.content.every(x => selectedIds.has(x.id))
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(data.content.map(x => x.id)))

  const handleBulkDelete = async () => {
    if (!window.confirm(`${selectedIds.size} element silinsin?`)) return
    setBulkLoading(true)
    try {
      await Promise.all([...selectedIds].map(id => contractorsApi.delete(id)))
      toast.success(`${selectedIds.size} element silindi`)
      setSelectedIds(new Set())
      load()
    } catch {
    } finally {
      setBulkLoading(false)
    }
  }

  const handleDelete = async (c) => {
    if (!(await confirm({ title: 'Podratçını sil', message: `"${c.companyName}" podratçısını silmək istəyirsiniz?` }))) return
    try {
      await contractorsApi.delete(c.id)
      toast.success('Podratçı silindi')
      load()
    } catch (err) {
      if (err?.isPending) return
    }
  }

  const exportExcel = () => {
    const RISK_LABELS   = { LOW: 'Aşağı', MEDIUM: 'Orta', HIGH: 'Yüksək' }
    const STATUS_LABELS = { ACTIVE: 'Aktiv', INACTIVE: 'Deaktiv' }
    const rows = data.content.map(c => ({
      'Şirkət adı':    c.companyName || '',
      'VÖEN':          c.voen || '',
      'Əlaqə şəxsi':   c.contactPerson || '',
      'Telefon':        c.phone || '',
      'E-poçt':         c.email || '',
      'Ödəniş növü':   PAYMENT_LABEL[c.paymentType] || c.paymentType || '',
      'Bank':           c.bankName || '',
      'Reytinq':        c.rating != null ? parseFloat(c.rating).toFixed(1) : '',
      'Risk':           RISK_LABELS[c.riskLevel] || c.riskLevel || '',
      'Status':         STATUS_LABELS[c.status] || c.status || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [22,15,20,15,22,14,18,10,12,12].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Podratçılar')
    XLSX.writeFile(wb, 'podratcilar.xlsx')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Podratçılar</h1>
          <p className="text-xs text-gray-400 mt-0.5">{data.totalElements} podratçı</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download size={13} />
            Excel
          </button>
          {canCreate && (
            <button
              onClick={() => setModal({ open: true, editing: null })}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Yeni podratçı
            </button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Cəmi',        value: data.totalElements,                                                color: 'bg-gray-500' },
          { label: 'Aktiv',       value: data.content.filter(c => c.status === 'ACTIVE').length,           color: 'bg-green-500' },
          { label: 'Deaktiv',     value: data.content.filter(c => c.status === 'INACTIVE').length,         color: 'bg-gray-400' },
          { label: 'Yüksək risk', value: data.content.filter(c => c.riskLevel === 'HIGH').length,          color: 'bg-red-500' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${stat.color}`} />
            <div>
              <p className="text-[11px] text-gray-400">{stat.label}</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick filter chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        {[
          { label: 'Hamısı',       status: '', risk: '' },
          { label: 'Aktiv',        status: 'ACTIVE',   risk: '' },
          { label: 'Deaktiv',      status: 'INACTIVE', risk: '' },
          { label: 'Yüksək risk',  status: '', risk: 'HIGH' },
          { label: 'Orta risk',    status: '', risk: 'MEDIUM' },
        ].map(chip => {
          const active = statusFilter === chip.status && riskFilter === chip.risk
          return (
            <button
              key={chip.label}
              onClick={() => setSearchParams(p => {
                const n = new URLSearchParams(p)
                chip.status ? n.set('status', chip.status) : n.delete('status')
                chip.risk   ? n.set('risk',   chip.risk)   : n.delete('risk')
                n.delete('page')
                return n
              }, { replace: true })}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                active
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-amber-400 hover:text-amber-600'
              )}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Şirkət adı, VÖEN, əlaqə şəxsi..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Bütün statuslar</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="INACTIVE">Deaktiv</option>
        </select>
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Bütün risklər</option>
          <option value="LOW">Aşağı risk</option>
          <option value="MEDIUM">Orta risk</option>
          <option value="HIGH">Yüksək risk</option>
        </select>
      </div>

      {/* Bulk action toolbar */}
      {canDelete && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl mb-3">
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            {selectedIds.size} element seçildi
          </span>
          <div className="flex-1" />
          <button
            onClick={handleBulkDelete}
            disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
          >
            {bulkLoading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 size={13} />}
            Seçilənləri sil ({selectedIds.size})
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Ləğv et
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 accent-amber-500 cursor-pointer" />
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Şirkət adı</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">VÖEN</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Əlaqə şəxsi</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ödəniş növü</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Risk</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reytinq</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">Əməliyyat</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton cols={9} rows={6} />
            ) : data.content.length === 0 ? (
              <EmptyState
                icon={HardHat}
                title="Podratçı tapılmadı"
                description="Yeni podratçı əlavə edin"
                action={canCreate ? () => setModal({ open: true, editing: null }) : undefined}
                actionLabel={canCreate ? 'Yeni Podratçı' : undefined}
              />
            ) : (
              data.content.map((c) => {
                const risk = RISK_CONFIG[c.riskLevel] || RISK_CONFIG.LOW
                const status = STATUS_CONFIG[c.status] || STATUS_CONFIG.ACTIVE
                const isSelected = selected?.id === c.id
                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={clsx(
                      'border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors',
                      isSelected ? 'bg-amber-50 dark:bg-amber-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                    )}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)}
                        className="w-4 h-4 accent-amber-500 cursor-pointer" />
                    </td>
                    <td className="py-3 px-4" title={c.companyName}>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.companyName}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{c.voen || '—'}</td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400" title={c.contactPerson || ''}>{c.contactPerson || '—'}</td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                      {c.paymentType
                        ? <div className="flex flex-wrap gap-1">
                            {c.paymentType.split(',').filter(Boolean).map(pt => (
                              <span key={pt} className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                {PAYMENT_LABEL[pt] || pt}
                              </span>
                            ))}
                          </div>
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx('px-2 py-0.5 rounded-md text-xs font-medium border', risk.cls)}>
                        {risk.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx('px-2 py-0.5 rounded-md text-xs font-medium border', status.cls)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <RatingStars rating={c.rating} />
                    </td>
                    <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setSelected(c)}
                          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors"
                          title="Bax"
                        >
                          <Eye size={15} />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => setModal({ open: true, editing: c })}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
                            title="Redaktə et"
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(c)}
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
        <Pagination
          page={data.page + 1}
          pageSize={data.size}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          onPage={(p) => setPage(p - 1)}
          onPageSize={(s) => setPageSize(s)}
        />
      </div>

      {modal.open && (
        <ContractorModal
          editing={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => { setModal({ open: false, editing: null }); load() }}
        />
      )}

      {selected && (
        <ContractorSlideOver
          contractor={selected}
          onClose={() => setSelected(null)}
          onEdit={canEdit ? () => { setModal({ open: true, editing: selected }); setSelected(null) } : undefined}
          onDelete={canDelete ? () => { handleDelete(selected); setSelected(null) } : undefined}
        />
      )}
      <ConfirmDialog />
    </div>
  )
}
