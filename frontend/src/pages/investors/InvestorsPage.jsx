import { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, Star, Banknote, Eye, ChevronUp, ChevronDown, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { investorsApi } from '../../api/investors'
import { useAuthStore } from '../../store/authStore'
import InvestorModal from './InvestorModal'
import InvestorSlideOver from './InvestorSlideOver'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'

const RISK_CONFIG = {
  LOW:    { label: 'Aşağı',   cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  MEDIUM: { label: 'Orta',    cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  HIGH:   { label: 'Yüksək', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
}
const STATUS_CONFIG = {
  ACTIVE:   { label: 'Aktiv',   cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  INACTIVE: { label: 'Deaktiv', cls: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
}
const PAYMENT_LABEL = { CASH: 'Nağd', TRANSFER: 'Köçürmə' }

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronUp size={12} className="text-gray-300 dark:text-gray-600" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-amber-500" />
    : <ChevronDown size={12} className="text-amber-500" />
}

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

export default function InvestorsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('INVESTORS', 'canPost')
  const canEdit   = hasPermission('INVESTORS', 'canPut')
  const canDelete = hasPermission('INVESTORS', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [investors, setInvestors] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, editing: null })
  const [slideOver, setSlideOver] = useState(null)

  const [search, setSearch] = useState('')
  const [quickFilter, setQuickFilter] = useState('ALL')
  const [sortField, setSortField] = useState('companyName')
  const [sortDir, setSortDir] = useState('asc')
  const searchRef = useRef(null)

  usePageShortcuts({
    onNew: canCreate ? () => setModal({ open: true, editing: null }) : undefined,
    searchRef,
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await investorsApi.getAll()
      setInvestors(res.data.data || res.data || [])
    } catch {
      toast.error('İnvestorlar yüklənmədi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const stats = useMemo(() => ({
    total:    investors.length,
    active:   investors.filter(c => c.status === 'ACTIVE').length,
    inactive: investors.filter(c => c.status === 'INACTIVE').length,
    highRisk: investors.filter(c => c.riskLevel === 'HIGH').length,
  }), [investors])

  const QUICK_FILTERS = [
    { id: 'ALL',      label: 'Hamısı',      count: stats.total },
    { id: 'ACTIVE',   label: 'Aktiv',        count: stats.active },
    { id: 'INACTIVE', label: 'Deaktiv',      count: stats.inactive },
    { id: 'HIGH',     label: 'Yüksək risk',  count: stats.highRisk },
  ]

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return investors.filter((c) => {
      const matchSearch = !q ||
        c.companyName?.toLowerCase().includes(q) ||
        c.voen?.toLowerCase().includes(q) ||
        c.contactPerson?.toLowerCase().includes(q)
      const matchQuick =
        quickFilter === 'ALL'      ? true :
        quickFilter === 'ACTIVE'   ? c.status === 'ACTIVE' :
        quickFilter === 'INACTIVE' ? c.status === 'INACTIVE' :
        quickFilter === 'HIGH'     ? c.riskLevel === 'HIGH' : true
      return matchSearch && matchQuick
    })
  }, [investors, search, quickFilter])

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

  const handleDelete = async (c) => {
    if (!(await confirm({ title: 'İnvestoru sil', message: `"${c.companyName}" investorunu silmək istəyirsiniz?` }))) return
    try {
      await investorsApi.delete(c.id)
      toast.success('İnvestor silindi')
      load()
    } catch (err) {
      if (err?.isPending) return
      toast.error('Silmə uğursuz oldu')
    }
  }

  const exportExcel = () => {
    const rows = sorted.map(c => ({
      'Şirkət adı':    c.companyName || '',
      'VÖEN':          c.voen || '',
      'Əlaqə şəxsi':   c.contactPerson || '',
      'Telefon':        c.contactPhone || '',
      'Ünvan':          c.address || '',
      'Ödəniş növü':   PAYMENT_LABEL[c.paymentType] || c.paymentType || '',
      'Risk':           RISK_CONFIG[c.riskLevel]?.label || c.riskLevel || '',
      'Status':         STATUS_CONFIG[c.status]?.label || c.status || '',
      'Reytinq':        c.rating ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [32, 16, 24, 18, 28, 14, 12, 12, 10].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'İnvestorlar')
    XLSX.writeFile(wb, 'investorlar.xlsx')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">İnvestorlar</h1>
          <p className="text-xs text-gray-400 mt-0.5">{stats.total} investor</p>
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
              Yeni investor
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Cəmi',         value: stats.total,    color: 'text-gray-700 dark:text-gray-200' },
          { label: 'Aktiv',        value: stats.active,   color: 'text-green-600 dark:text-green-400' },
          { label: 'Deaktiv',      value: stats.inactive, color: 'text-gray-500 dark:text-gray-400' },
          { label: 'Yüksək risk',  value: stats.highRisk, color: 'text-red-500 dark:text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3">
            <p className="text-xs text-gray-400 dark:text-gray-500">{s.label}</p>
            <p className={clsx('text-2xl font-bold mt-0.5', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Quick filters */}
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
        <div className="flex gap-1">
          {QUICK_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setQuickFilter(f.id)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                quickFilter === f.id
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-amber-400'
              )}
            >
              {f.label}
              <span className={clsx('ml-1.5 text-[10px] font-bold', quickFilter === f.id ? 'text-amber-100' : 'text-gray-400')}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                {[
                  { label: 'Şirkət adı',  field: 'companyName' },
                  { label: 'VÖEN',        field: 'voen' },
                  { label: 'Əlaqə şəxsi', field: 'contactPerson' },
                  { label: 'Telefon',     field: null },
                  { label: 'Ödəniş növü', field: 'paymentType' },
                  { label: 'Risk',        field: 'riskLevel' },
                  { label: 'Status',      field: 'status' },
                  { label: 'Reytinq',     field: 'rating' },
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
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={9} rows={6} />
              ) : sorted.length === 0 ? (
                <EmptyState
                  icon={Banknote}
                  title="İnvestor tapılmadı"
                  description="Axtarış şərtlərini dəyişin və ya yeni investor əlavə edin"
                  action={canCreate ? () => setModal({ open: true, editing: null }) : undefined}
                  actionLabel={canCreate ? 'Yeni İnvestor' : undefined}
                />
              ) : (
                sorted.map((c) => {
                  const risk   = RISK_CONFIG[c.riskLevel]   || RISK_CONFIG.LOW
                  const status = STATUS_CONFIG[c.status]    || STATUS_CONFIG.ACTIVE
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSlideOver(c)}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.companyName}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{c.voen || '—'}</td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{c.contactPerson || '—'}</td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{c.contactPhone || '—'}</td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                        {c.paymentType
                          ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                              {PAYMENT_LABEL[c.paymentType] || c.paymentType}
                            </span>
                          : '—'
                        }
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
                            onClick={() => setSlideOver(c)}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
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
      </div>

      {modal.open && (
        <InvestorModal
          editing={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => { setModal({ open: false, editing: null }); load() }}
        />
      )}

      {slideOver && (
        <InvestorSlideOver
          investor={slideOver}
          onClose={() => setSlideOver(null)}
          onEdit={canEdit ? () => { setSlideOver(null); setModal({ open: true, editing: slideOver }) } : undefined}
          onDelete={canDelete ? () => { setSlideOver(null); handleDelete(slideOver) } : undefined}
        />
      )}

      <ConfirmDialog />
    </div>
  )
}
