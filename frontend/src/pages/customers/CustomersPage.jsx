import { useState, useEffect, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Plus, Pencil, Trash2, Search, Building2, Download, Eye } from 'lucide-react'
import { customersApi } from '../../api/customers'
import { useAuthStore } from '../../store/authStore'
import CustomerModal from './CustomerModal'
import CustomerSlideOver from './CustomerSlideOver'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useSearchParams } from 'react-router-dom'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'
import ColumnToggle from '../../components/common/ColumnToggle'
import { useColumnStore } from '../../store/columnStore'
import Pagination from '../../components/common/Pagination'

const RISK_CONFIG = {
  LOW:    { label: 'Aşağı',   cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  MEDIUM: { label: 'Orta',    cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  HIGH:   { label: 'Yüksək', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
}

const STATUS_CONFIG = {
  ACTIVE:   { label: 'Aktiv',     cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  PASSIVE:  { label: 'Passiv',    cls: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
  VARIABLE: { label: 'Dəyişkən', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
}

const PAYMENT_LABEL = { CASH: 'Nağd', TRANSFER: 'Köçürmə' }

function PaymentBadges({ types }) {
  if (!types || types.length === 0) return <span className="text-gray-400 text-xs">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {[...types].map((t) => (
        <span key={t} className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
          {PAYMENT_LABEL[t] || t}
        </span>
      ))}
    </div>
  )
}

export default function CustomersPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('CUSTOMER_MANAGEMENT', 'canPost')
  const canEdit   = hasPermission('CUSTOMER_MANAGEMENT', 'canPut')
  const canDelete = hasPermission('CUSTOMER_MANAGEMENT', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()
  const isVisible = useColumnStore(s => s.isVisible)

  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, editing: null })
  const [slideOver, setSlideOver] = useState(null)
  const searchRef = useRef(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  usePageShortcuts({
    onNew: canCreate ? () => setModal({ open: true, editing: null }) : undefined,
    searchRef,
  })

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
      const res = await customersApi.getAllPaged(params)
      setData(res.data.data || res.data)
      setSelectedIds(new Set())
    } catch {
      toast.error('Müştərilər yüklənmədi')
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
      await Promise.all([...selectedIds].map(id => customersApi.delete(id)))
      toast.success(`${selectedIds.size} element silindi`)
      setSelectedIds(new Set())
      load()
    } catch {
      toast.error('Silinmə zamanı xəta baş verdi')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleDelete = async (c) => {
    if (!(await confirm({ title: 'Müştərini sil', message: `"${c.companyName}" müştərisini silmək istəyirsiniz?` }))) return
    try {
      await customersApi.delete(c.id)
      toast.success('Müştəri silindi')
      load()
    } catch (err) {
      if (err?.isPending) return
      toast.error('Silmə uğursuz oldu')
    }
  }

  const refreshCustomer = async (id) => {
    try {
      const res = await customersApi.getById(id)
      const updated = res.data.data || res.data
      setData(prev => ({ ...prev, content: prev.content.map(c => c.id === id ? updated : c) }))
      if (slideOver?.id === id) setSlideOver(updated)
    } catch { /* silent */ }
  }

  const exportExcel = () => {
    const RISK_LABELS   = { LOW: 'Aşağı', MEDIUM: 'Orta', HIGH: 'Yüksək' }
    const STATUS_LABELS = { ACTIVE: 'Aktiv', PASSIVE: 'Passiv', VARIABLE: 'Dəyişkən' }
    const rows = data.content.map(c => ({
      'Şirkət adı':    c.companyName || '',
      'VÖEN':          c.voen || '',
      'Ünvan':         c.address || '',
      'Təchizatçı':    c.supplierPerson || '',
      'Telefon':       c.supplierPhone || '',
      'Ofis məsul':    c.officeContactPerson || '',
      'Ofis tel.':     c.officeContactPhone || '',
      'Ödəniş':        (c.paymentTypes || []).map(t => t === 'CASH' ? 'Nağd' : 'Köçürmə').join(' / '),
      'Risk':          RISK_LABELS[c.riskLevel] || c.riskLevel || '',
      'Status':        STATUS_LABELS[c.status] || c.status || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [20,15,25,20,15,20,15,15,12,12].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Müştərilər')
    XLSX.writeFile(wb, 'musteriler.xlsx')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Müştərilər</h1>
          <p className="text-xs text-gray-400 mt-0.5">{data.totalElements} müştəri</p>
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
              Yeni müştəri
            </button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Cəmi',        value: data.totalElements, color: 'bg-gray-500' },
          { label: 'Aktiv',       value: data.content.filter(c => c.status === 'ACTIVE').length,   color: 'bg-green-500' },
          { label: 'Passiv',      value: data.content.filter(c => c.status === 'PASSIVE').length,  color: 'bg-gray-400' },
          { label: 'Yüksək risk', value: data.content.filter(c => c.riskLevel === 'HIGH').length,  color: 'bg-red-500' },
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
          { label: 'Hamısı', status: '', risk: '' },
          { label: 'Aktiv',  status: 'ACTIVE', risk: '' },
          { label: 'Passiv', status: 'PASSIVE', risk: '' },
          { label: 'Yüksək risk', status: '', risk: 'HIGH' },
          { label: 'Orta risk',   status: '', risk: 'MEDIUM' },
        ].map(chip => {
          const active = statusFilter === chip.status && riskFilter === chip.risk
          return (
            <button
              key={chip.label}
              onClick={() => { setStatusFilter(chip.status); setRiskFilter(chip.risk) }}
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
            placeholder="Şirkət adı, VÖEN, məsul şəxs..."
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
          <option value="PASSIVE">Passiv</option>
          <option value="VARIABLE">Dəyişkən</option>
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
        <ColumnToggle page="customers" />
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="w-4 h-4 accent-amber-500 cursor-pointer" />
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Şirkət adı
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  VÖEN
                </th>
                {isVisible('customers', 'phone') && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Təchizatçı</th>}
                {isVisible('customers', 'contactPerson') && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ofis məsul</th>}
                {isVisible('customers', 'address') && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ödəniş</th>}
                {isVisible('customers', 'risk') && (
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Risk
                  </th>
                )}
                {isVisible('customers', 'status') && (
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Status
                  </th>
                )}
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={9} rows={6} />
              ) : data.content.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="Müştəri tapılmadı"
                  description="Axtarış şərtlərini dəyişin və ya yeni müştəri əlavə edin"
                  action={canCreate ? () => setModal({ open: true, editing: null }) : undefined}
                  actionLabel={canCreate ? 'Yeni Müştəri' : undefined}
                />
              ) : (
                data.content.map((c) => {
                  const risk = RISK_CONFIG[c.riskLevel] || RISK_CONFIG.LOW
                  const status = STATUS_CONFIG[c.status] || STATUS_CONFIG.ACTIVE
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSlideOver(c)}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-amber-50/40 dark:hover:bg-amber-900/10 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)}
                          className="w-4 h-4 accent-amber-500 cursor-pointer" />
                      </td>
                      <td className="py-3 px-4" title={c.companyName}>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.companyName}</p>
                        {c.address && <p className="text-xs text-gray-400 truncate max-w-[160px]" title={c.address}>{c.address}</p>}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{c.voen || '—'}</td>
                      {isVisible('customers', 'phone') && (
                        <td className="py-3 px-4" title={[c.supplierPerson, c.supplierPhone].filter(Boolean).join(' · ')}>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{c.supplierPerson || '—'}</p>
                          {c.supplierPhone && <p className="text-xs text-gray-400">{c.supplierPhone}</p>}
                        </td>
                      )}
                      {isVisible('customers', 'contactPerson') && (
                        <td className="py-3 px-4" title={[c.officeContactPerson, c.officeContactPhone].filter(Boolean).join(' · ')}>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{c.officeContactPerson || '—'}</p>
                          {c.officeContactPhone && <p className="text-xs text-gray-400">{c.officeContactPhone}</p>}
                        </td>
                      )}
                      {isVisible('customers', 'address') && (
                        <td className="py-3 px-4">
                          <PaymentBadges types={c.paymentTypes} />
                        </td>
                      )}
                      {isVisible('customers', 'risk') && (
                        <td className="py-3 px-4">
                          <span className={clsx('px-2 py-0.5 rounded-md text-xs font-medium border', risk.cls)}>
                            {risk.label}
                          </span>
                        </td>
                      )}
                      {isVisible('customers', 'status') && (
                        <td className="py-3 px-4">
                          <span className={clsx('px-2 py-0.5 rounded-md text-xs font-medium border', status.cls)}>
                            {status.label}
                          </span>
                        </td>
                      )}
                      <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setSlideOver(c)}
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
        </div>
        <Pagination
          page={data.page + 1}
          pageSize={data.size}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          onPage={(p) => setPage(p - 1)}
          onPageSize={(s) => setPageSize(s)}
        />
      </div>

      {/* Modals */}
      {modal.open && (
        <CustomerModal
          editing={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => { setModal({ open: false, editing: null }); load() }}
        />
      )}

      {slideOver && (
        <CustomerSlideOver
          customer={slideOver}
          onClose={() => setSlideOver(null)}
          onEdit={canEdit ? () => { setModal({ open: true, editing: slideOver }); setSlideOver(null) } : undefined}
          onDelete={canDelete ? () => { handleDelete(slideOver); setSlideOver(null) } : undefined}
          onUpdated={() => refreshCustomer(slideOver.id)}
        />
      )}

      <ConfirmDialog />
    </div>
  )
}
