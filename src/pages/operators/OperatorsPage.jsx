import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, CheckCircle, AlertCircle, Phone, MapPin, UserCheck, Eye,
         Download, Lock } from 'lucide-react'
import * as XLSX from 'xlsx'
import { operatorsApi } from '../../api/operators'
import { useAuthStore } from '../../store/authStore'
import OperatorModal from './OperatorModal'
import OperatorSlideOver from './OperatorSlideOver'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useSearchParams } from 'react-router-dom'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'
import Pagination from '../../components/common/Pagination'

export default function OperatorsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('OPERATORS', 'canPost')
  const canEdit   = hasPermission('OPERATORS', 'canPut')
  const canDelete = hasPermission('OPERATORS', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [data, setData]               = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState({ open: false, editing: null })
  const [selected, setSelected]       = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const searchRef = useRef(null)

  // URL-based filters
  const [searchParams, setSearchParams] = useSearchParams()
  const search    = searchParams.get('q')    || ''
  const docFilter = searchParams.get('doc')  || ''
  const page = Number(searchParams.get('page') || '0')
  const size = Number(searchParams.get('size') || '15')

  const setSearch    = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('q', v) : n.delete('q'); n.delete('page'); return n }, { replace: true })
  const setDocFilter = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('doc', v) : n.delete('doc'); return n }, { replace: true })
  const setPage = (p) => setSearchParams(prev => { const n = new URLSearchParams(prev); p > 0 ? n.set('page', String(p)) : n.delete('page'); return n }, { replace: true })
  const setPageSize = (s) => setSearchParams(prev => { const n = new URLSearchParams(prev); s !== 15 ? n.set('size', String(s)) : n.delete('size'); n.delete('page'); return n }, { replace: true })

  usePageShortcuts({
    onNew: canCreate ? () => setModal({ open: true, editing: null }) : undefined,
    searchRef,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, size, ...(search && { q: search }) }
      const res = await operatorsApi.getAllPaged(params)
      setData(res.data.data || res.data)
      setSelectedIds(new Set())
    } catch {
      toast.error('Operatorlar yüklənmədi')
    } finally {
      setLoading(false)
    }
  }, [page, size, search])

  useEffect(() => { load() }, [load])

  // Client-side docFilter applied on data.content
  const filtered = data.content.filter(o => {
    return docFilter === 'complete'   ? o.documentsComplete :
           docFilter === 'incomplete' ? !o.documentsComplete :
           docFilter === 'busy'       ? o.busy : true
  })

  // Bulk selection
  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allSelected  = filtered.length > 0 && filtered.every(x => selectedIds.has(x.id))
  const someSelected = !allSelected && filtered.some(x => selectedIds.has(x.id))
  const toggleAll    = () => setSelectedIds(allSelected ? new Set() : new Set(filtered.map(x => x.id)))

  const handleBulkDelete = async () => {
    if (!window.confirm(`${selectedIds.size} operator silinsin?`)) return
    setBulkLoading(true)
    try {
      await operatorsApi.deleteAll([...selectedIds])
      toast.success(`${selectedIds.size} operator silindi`)
      setSelectedIds(new Set())
      load()
    } catch (err) {
      if (err?.isPending) return
      toast.error('Silinmə zamanı xəta baş verdi')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleDelete = async (o) => {
    if (!(await confirm({ title: 'Operatoru sil', message: `"${o.fullName}" operatorunu silmək istəyirsiniz?` }))) return
    try {
      await operatorsApi.delete(o.id)
      toast.success('Operator silindi')
      if (selected?.id === o.id) setSelected(null)
      load()
    } catch (err) {
      if (err?.isPending) return
      toast.error('Silmə uğursuz oldu')
    }
  }

  const handleUpdated = (updated) => {
    setData(prev => ({ ...prev, content: prev.content.map(o => o.id === updated.id ? updated : o) }))
    setSelected(updated)
  }

  const exportExcel = () => {
    const rows = filtered.map(o => ({
      'Ad Soyad':   o.fullName || '',
      'Ünvan':      o.address || '',
      'Telefon':    o.phone || '',
      'E-mail':     o.email || '',
      'İxtisas':    o.specialization || '',
      'Sənədlər':   o.documentsComplete ? 'Tam' : `Natamam (${(o.documents || []).length}/6)`,
      'Statusu':    o.busy ? 'Məşğul' : 'Boş',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [28, 28, 18, 28, 24, 18, 12].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Operatorlar')
    XLSX.writeFile(wb, 'operatorlar.xlsx')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Operatorlar</h1>
          <p className="text-xs text-gray-400 mt-0.5">{data.totalElements} operator</p>
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
              Yeni operator
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Cəmi',         value: data.totalElements,                                           color: 'bg-gray-500' },
          { label: 'Sənədlər tam', value: data.content.filter(o => o.documentsComplete).length,         color: 'bg-green-500' },
          { label: 'Natamam',      value: data.content.filter(o => !o.documentsComplete).length,        color: 'bg-amber-500' },
          { label: 'Məşğul',       value: data.content.filter(o => o.busy).length,                     color: 'bg-blue-500' },
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
          { label: 'Hamısı',       key: '' },
          { label: 'Sənədlər tam', key: 'complete' },
          { label: 'Natamam',      key: 'incomplete' },
          { label: 'Məşğul',       key: 'busy' },
        ].map(chip => (
          <button
            key={chip.key}
            onClick={() => setDocFilter(chip.key)}
            className={clsx(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              docFilter === chip.key
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-amber-400 hover:text-amber-600'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ad, soyad, ünvan, ixtisas, telefon..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
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
            {bulkLoading
              ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Trash2 size={13} />}
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
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected }}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </th>
                {['Ad Soyad', 'Ünvan', 'Əlaqə', 'İxtisas', 'Sənədlər', 'Status'].map(label => (
                  <th
                    key={label}
                    className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                  >
                    {label}
                  </th>
                ))}
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={8} rows={6} />
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={UserCheck}
                  title="Operator tapılmadı"
                  description="Axtarış şərtlərini dəyişin və ya yeni operator əlavə edin"
                  action={canCreate ? () => setModal({ open: true, editing: null }) : undefined}
                  actionLabel={canCreate ? 'Yeni Operator' : undefined}
                />
              ) : (
                filtered.map(o => {
                  const uploadedCount = (o.documents || []).length
                  const isSelected = selected?.id === o.id
                  return (
                    <tr
                      key={o.id}
                      onClick={() => setSelected(o)}
                      className={clsx(
                        'border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-amber-50 dark:bg-amber-900/10'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                      )}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(o.id)}
                          onChange={() => toggleSelect(o.id)}
                          className="w-4 h-4 accent-amber-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{o.fullName}</p>
                        {o.notes && <p className="text-xs text-gray-400 truncate max-w-[160px]">{o.notes}</p>}
                      </td>
                      <td className="py-3 px-4">
                        {o.address
                          ? <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                              <MapPin size={11} className="text-gray-400 shrink-0" />{o.address}
                            </span>
                          : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        {o.phone && (
                          <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                            <Phone size={11} className="text-gray-400 shrink-0" />{o.phone}
                          </span>
                        )}
                        {o.email && <p className="text-xs text-gray-400 mt-0.5">{o.email}</p>}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{o.specialization || '—'}</td>
                      <td className="py-3 px-4">
                        {o.documentsComplete ? (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-xs font-medium text-green-700 dark:text-green-400 w-fit">
                            <CheckCircle size={11} /> Tam ({uploadedCount}/6)
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs font-medium text-amber-700 dark:text-amber-400 w-fit">
                            <AlertCircle size={11} /> Natamam ({uploadedCount}/6)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {o.busy ? (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs font-medium text-blue-700 dark:text-blue-400 w-fit">
                            <Lock size={10} /> Məşğul
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-500 dark:text-gray-400 w-fit">
                            Boş
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setSelected(o)}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors"
                            title="Bax"
                          >
                            <Eye size={15} />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => setModal({ open: true, editing: o })}
                              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
                              title="Redaktə et"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(o)}
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

      {modal.open && (
        <OperatorModal
          editing={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => { setModal({ open: false, editing: null }); load() }}
        />
      )}

      {selected && (
        <OperatorSlideOver
          operator={selected}
          onClose={() => setSelected(null)}
          onEdit={canEdit ? () => { setSelected(null); setModal({ open: true, editing: selected }) } : undefined}
          onDelete={canDelete ? () => { handleDelete(selected); setSelected(null) } : undefined}
          onUpdated={handleUpdated}
        />
      )}

      <ConfirmDialog />
    </div>
  )
}
