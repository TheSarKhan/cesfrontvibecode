import { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, CheckCircle, AlertCircle, Phone, MapPin, UserCheck, Eye, ChevronUp, ChevronDown, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { operatorsApi } from '../../api/operators'
import { useAuthStore } from '../../store/authStore'
import OperatorModal from './OperatorModal'
import OperatorSlideOver from './OperatorSlideOver'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronUp size={12} className="text-gray-300 dark:text-gray-600" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-amber-500" />
    : <ChevronDown size={12} className="text-amber-500" />
}

export default function OperatorsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('OPERATORS', 'canPost')
  const canEdit   = hasPermission('OPERATORS', 'canPut')
  const canDelete = hasPermission('OPERATORS', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [operators, setOperators] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, editing: null })
  const [slideOver, setSlideOver] = useState(null)

  const [search, setSearch] = useState('')
  const [quickFilter, setQuickFilter] = useState('ALL')
  const [sortField, setSortField] = useState('fullName')
  const [sortDir, setSortDir] = useState('asc')
  const searchRef = useRef(null)

  usePageShortcuts({
    onNew: canCreate ? () => setModal({ open: true, editing: null }) : undefined,
    searchRef,
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await operatorsApi.getAll()
      setOperators(res.data.data || res.data || [])
    } catch {
      toast.error('Operatorlar yüklənmədi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const stats = useMemo(() => ({
    total:      operators.length,
    complete:   operators.filter(o => o.documentsComplete).length,
    incomplete: operators.filter(o => !o.documentsComplete).length,
  }), [operators])

  const QUICK_FILTERS = [
    { id: 'ALL',        label: 'Hamısı',        count: stats.total },
    { id: 'complete',   label: 'Sənədlər tam',  count: stats.complete },
    { id: 'incomplete', label: 'Natamam',        count: stats.incomplete },
  ]

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return operators.filter(o => {
      const matchSearch = !q ||
        o.fullName?.toLowerCase().includes(q) ||
        o.address?.toLowerCase().includes(q) ||
        o.phone?.toLowerCase().includes(q) ||
        o.specialization?.toLowerCase().includes(q)
      const matchQuick =
        quickFilter === 'ALL'        ? true :
        quickFilter === 'complete'   ? o.documentsComplete :
        quickFilter === 'incomplete' ? !o.documentsComplete : true
      return matchSearch && matchQuick
    })
  }, [operators, search, quickFilter])

  const handleSort = (field) => {
    setSortDir(prev => sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'asc')
    setSortField(field)
  }

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortField] ?? ''
      const bv = b[sortField] ?? ''
      const cmp = String(av).localeCompare(String(bv), 'az')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortField, sortDir])

  const handleDelete = async (o) => {
    if (!(await confirm({ title: 'Operatoru sil', message: `"${o.fullName}" operatorunu silmək istəyirsiniz?` }))) return
    try {
      await operatorsApi.delete(o.id)
      toast.success('Operator silindi')
      load()
    } catch (err) {
      if (err?.isPending) return
      toast.error('Silmə uğursuz oldu')
    }
  }

  const handleUpdated = (updated) => {
    setOperators(prev => prev.map(o => o.id === updated.id ? updated : o))
    setSlideOver(updated)
  }

  const exportExcel = () => {
    const rows = sorted.map(o => ({
      'Ad Soyad':      o.fullName || '',
      'Ünvan':         o.address || '',
      'Telefon':       o.phone || '',
      'E-mail':        o.email || '',
      'İxtisas':       o.specialization || '',
      'Sənədlər':      o.documentsComplete ? 'Tam' : `Natamam (${(o.documents || []).length}/6)`,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [28, 28, 18, 28, 24, 18].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Operatorlar')
    XLSX.writeFile(wb, 'operatorlar.xlsx')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Operatorlar</h1>
          <p className="text-xs text-gray-400 mt-0.5">{stats.total} operator</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download size={15} />
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
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { id: 'ALL',        label: 'Cəmi',          value: stats.total,      color: 'text-gray-700 dark:text-gray-200',       icon: null },
          { id: 'complete',   label: 'Sənədlər tam',  value: stats.complete,   color: 'text-green-600 dark:text-green-400',     icon: CheckCircle },
          { id: 'incomplete', label: 'Natamam',        value: stats.incomplete, color: 'text-amber-600 dark:text-amber-400',     icon: AlertCircle },
        ].map(s => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => setQuickFilter(s.id)}
              className={clsx(
                'rounded-xl border px-4 py-3 text-left transition-colors',
                quickFilter === s.id
                  ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-700'
              )}
            >
              <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                {Icon && <Icon size={10} className={s.color} />}
                {s.label}
              </p>
              <p className={clsx('text-2xl font-bold mt-0.5', s.color)}>{s.value}</p>
            </button>
          )
        })}
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

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                {[
                  { label: 'Ad Soyad',  field: 'fullName' },
                  { label: 'Ünvan',     field: 'address' },
                  { label: 'Əlaqə',     field: null },
                  { label: 'İxtisas',   field: 'specialization' },
                  { label: 'Sənədlər',  field: null },
                ].map(col => (
                  <th
                    key={col.label}
                    onClick={col.field ? () => handleSort(col.field) : undefined}
                    className={clsx(
                      'text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide',
                      col.field && 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none'
                    )}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.field && <SortIcon field={col.field} sortField={sortField} sortDir={sortDir} />}
                    </div>
                  </th>
                ))}
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={6} rows={6} />
              ) : sorted.length === 0 ? (
                <EmptyState
                  icon={UserCheck}
                  title="Operator tapılmadı"
                  description="Axtarış şərtlərini dəyişin və ya yeni operator əlavə edin"
                  action={canCreate ? () => setModal({ open: true, editing: null }) : undefined}
                  actionLabel={canCreate ? 'Yeni Operator' : undefined}
                />
              ) : (
                sorted.map(o => {
                  const uploadedCount = (o.documents || []).length
                  return (
                    <tr
                      key={o.id}
                      onClick={() => setSlideOver(o)}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{o.fullName}</p>
                        {o.notes && <p className="text-xs text-gray-400 truncate max-w-[160px]">{o.notes}</p>}
                      </td>
                      <td className="py-3 px-4">
                        {o.address
                          ? <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400"><MapPin size={11} className="text-gray-400 shrink-0" />{o.address}</span>
                          : <span className="text-xs text-gray-400">—</span>
                        }
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
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-xs font-medium text-green-700 dark:text-green-400 w-fit">
                            <CheckCircle size={11} /> Tam ({uploadedCount}/6)
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs font-medium text-amber-700 dark:text-amber-400 w-fit">
                            <AlertCircle size={11} /> Natamam ({uploadedCount}/6)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setSlideOver(o)}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
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
      </div>

      {modal.open && (
        <OperatorModal
          editing={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => { setModal({ open: false, editing: null }); load() }}
        />
      )}

      {slideOver && (
        <OperatorSlideOver
          operator={slideOver}
          onClose={() => setSlideOver(null)}
          onEdit={canEdit ? () => { setSlideOver(null); setModal({ open: true, editing: slideOver }) } : undefined}
          onDelete={canDelete ? () => { setSlideOver(null); handleDelete(slideOver) } : undefined}
          onUpdated={handleUpdated}
        />
      )}

      <ConfirmDialog />
    </div>
  )
}
