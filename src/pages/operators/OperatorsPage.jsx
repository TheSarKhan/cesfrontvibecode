import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, CheckCircle, AlertCircle, Phone, MapPin, UserCheck, Eye,
         Download, Lock, Users, FileCheck2, Briefcase } from 'lucide-react'
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
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Operatorlar yüklənmədi')
    } finally {
      setLoading(false)
    }
  }, [page, size, search])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId) return
    operatorsApi.getById(Number(openId))
      .then(res => setSelected(res.data.data || res.data))
      .catch(() => {})
    setSearchParams(p => { const n = new URLSearchParams(p); n.delete('open'); return n }, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = data.content.filter(o => {
    return docFilter === 'complete'   ? o.documentsComplete :
           docFilter === 'incomplete' ? !o.documentsComplete :
           docFilter === 'busy'       ? o.busy : true
  })

  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allSelected  = filtered.length > 0 && filtered.every(x => selectedIds.has(x.id))
  const someSelected = !allSelected && filtered.some(x => selectedIds.has(x.id))
  const toggleAll    = () => setSelectedIds(allSelected ? new Set() : new Set(filtered.map(x => x.id)))

  const handleBulkDelete = async () => {
    if (!(await confirm({
      title: 'Seçilənləri sil',
      message: `${selectedIds.size} operator silinəcək. Davam edilsin?`,
      confirmText: 'Sil',
    }))) return
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

  const stats = [
    { label: 'Cəmi',         value: data.totalElements,                                       icon: Users,       tone: 'graphite' },
    { label: 'Sənədlər tam', value: data.content.filter(o => o.documentsComplete).length,     icon: FileCheck2,  tone: 'ok' },
    { label: 'Natamam',      value: data.content.filter(o => !o.documentsComplete).length,    icon: AlertCircle, tone: 'warn' },
    { label: 'Məşğul',       value: data.content.filter(o => o.busy).length,                  icon: Briefcase,   tone: 'info' },
  ]

  const toneCls = {
    graphite: 'bg-[var(--ces-graphite-50)] text-[var(--ces-graphite)]',
    ok:       'bg-[var(--ces-ok-100)] text-[var(--ces-ok)]',
    warn:     'bg-[var(--ces-warn-100)] text-[var(--ces-warn)]',
    info:     'bg-[var(--ces-info-100)] text-[var(--ces-info)]',
    danger:   'bg-[var(--ces-danger-100)] text-[var(--ces-danger)]',
  }

  return (
    <div className="ces-font">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-7">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[var(--ces-ink)] leading-tight">Operatorlar</h1>
          <p className="text-sm text-[var(--ces-muted)] mt-1">
            Cəmi <span className="font-semibold text-[var(--ces-ink)]">{data.totalElements}</span> operator qeydiyyatdadır
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[var(--ces-graphite)] bg-white border border-[var(--ces-line)] rounded-[10px] hover:border-[var(--ces-graphite)] transition-colors"
          >
            <Download size={14} />
            Excel
          </button>
          {canCreate && (
            <button
              onClick={() => setModal({ open: true, editing: null })}
              className="inline-flex items-center gap-2 bg-[var(--ces-gold)] hover:bg-[var(--ces-gold-700)] text-[var(--ces-on-gold)] text-sm font-semibold px-4 py-2.5 rounded-[10px] transition-colors shadow-[0_8px_24px_-12px_rgba(200,147,42,0.55)]"
            >
              <Plus size={16} />
              Yeni operator
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[20px] p-5 shadow-[0_1px_2px_rgba(58,58,58,0.06),0_1px_1px_rgba(58,58,58,0.04)] hover:shadow-[0_8px_24px_-12px_rgba(58,58,58,0.18),0_2px_6px_rgba(58,58,58,0.06)] hover:-translate-y-[1px] transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] tracking-[0.14em] uppercase font-bold text-[var(--ces-muted)]">{stat.label}</span>
                <span className={clsx('w-9 h-9 rounded-[10px] grid place-items-center', toneCls[stat.tone])}>
                  <Icon size={16} />
                </span>
              </div>
              <div className="text-[30px] font-extrabold tracking-tight leading-none text-[var(--ces-ink)] tabular-nums">{stat.value}</div>
            </div>
          )
        })}
      </div>

      {/* Quick filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { label: 'Hamısı',       key: '' },
          { label: 'Sənədlər tam', key: 'complete' },
          { label: 'Natamam',      key: 'incomplete' },
          { label: 'Məşğul',       key: 'busy' },
        ].map(chip => {
          const on = docFilter === chip.key
          return (
            <button
              key={chip.key}
              onClick={() => setDocFilter(chip.key)}
              className={clsx(
                'px-3.5 py-1.5 rounded-full text-[12.5px] font-bold tracking-tight transition-colors',
                on
                  ? 'bg-[var(--ces-graphite)] text-[var(--ces-on-primary)]'
                  : 'bg-white text-[var(--ces-graphite)] border border-[var(--ces-line)] hover:border-[var(--ces-graphite)]'
              )}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ces-mute2)]" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ad, soyad, ünvan, ixtisas, telefon..."
            className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-[var(--ces-line)] rounded-[11px] text-[var(--ces-ink)] placeholder-[var(--ces-mute2)] focus:outline-none focus:border-[var(--ces-graphite)] focus:ring-[3px] focus:ring-[rgba(58,58,58,0.1)] transition-all"
          />
        </div>
      </div>

      {/* Bulk action toolbar */}
      {canDelete && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[var(--ces-gold-50)] border border-[var(--ces-gold-100)] rounded-[14px] mb-4">
          <span className="text-sm font-bold text-[var(--ces-gold-700)]">
            {selectedIds.size} element seçildi
          </span>
          <div className="flex-1" />
          <button
            onClick={handleBulkDelete}
            disabled={bulkLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--ces-danger)] hover:bg-[#b62b4a] text-white text-xs font-bold rounded-[8px] transition-colors disabled:opacity-60"
          >
            {bulkLoading
              ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Trash2 size={13} />}
            Seçilənləri sil ({selectedIds.size})
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs font-semibold text-[var(--ces-muted)] hover:text-[var(--ces-graphite)]"
          >
            Ləğv et
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[20px] overflow-hidden shadow-[0_1px_2px_rgba(58,58,58,0.06),0_1px_1px_rgba(58,58,58,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-[13.5px]">
            <thead>
              <tr className="border-b border-[var(--ces-line)] bg-white">
                <th className="px-4 py-3.5 w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected }}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-[var(--ces-graphite)] cursor-pointer"
                  />
                </th>
                {['Ad Soyad', 'Ünvan', 'Əlaqə', 'İxtisas', 'Sənədlər', 'Status'].map(label => (
                  <th
                    key={label}
                    className="text-left py-3.5 px-4 text-[11.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.1em]"
                  >
                    {label}
                  </th>
                ))}
                <th className="py-3.5 px-4 text-[11.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.1em] text-right">Əməliyyat</th>
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
                        'border-b border-[var(--ces-line-2)] cursor-pointer transition-colors last:border-b-0',
                        isSelected ? 'bg-[var(--ces-gold-50)]' : 'hover:bg-[var(--ces-graphite-50)]'
                      )}
                    >
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(o.id)}
                          onChange={() => toggleSelect(o.id)}
                          className="w-4 h-4 accent-[var(--ces-graphite)] cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-sm font-semibold text-[var(--ces-ink)]">{o.fullName}</p>
                        {o.notes && <p className="text-[11.5px] text-[var(--ces-muted)] truncate max-w-[180px] mt-0.5">{o.notes}</p>}
                      </td>
                      <td className="py-3.5 px-4">
                        {o.address
                          ? <span className="flex items-center gap-1.5 text-[13px] text-[var(--ces-ink)]">
                              <MapPin size={12} className="text-[var(--ces-mute2)] shrink-0" />{o.address}
                            </span>
                          : <span className="text-[var(--ces-muted)]">—</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        {o.phone && (
                          <span className="flex items-center gap-1.5 text-[13px] text-[var(--ces-ink)] font-mono tabular-nums">
                            <Phone size={12} className="text-[var(--ces-mute2)] shrink-0" />{o.phone}
                          </span>
                        )}
                        {o.email && <p className="text-[11.5px] text-[var(--ces-muted)] mt-0.5">{o.email}</p>}
                        {!o.phone && !o.email && <span className="text-[var(--ces-muted)]">—</span>}
                      </td>
                      <td className="py-3.5 px-4 text-[13px] text-[var(--ces-ink)]">{o.specialization || <span className="text-[var(--ces-muted)]">—</span>}</td>
                      <td className="py-3.5 px-4">
                        {o.documentsComplete ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--ces-ok-100)] text-[var(--ces-ok)] text-[11.5px] font-bold">
                            <CheckCircle size={11} /> Tam ({uploadedCount}/6)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--ces-warn-100)] text-[var(--ces-warn)] text-[11.5px] font-bold">
                            <AlertCircle size={11} /> Natamam ({uploadedCount}/6)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {o.busy ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--ces-info-100)] text-[var(--ces-info)] text-[11.5px] font-bold">
                            <Lock size={10} /> Məşğul
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--ces-graphite-100)] text-[var(--ces-muted)] text-[11.5px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            Boş
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setSelected(o)}
                            className="w-8 h-8 grid place-items-center rounded-[7px] text-[var(--ces-muted)] hover:bg-[var(--ces-graphite-50)] hover:text-[var(--ces-graphite)] transition-colors"
                            title="Bax"
                          >
                            <Eye size={15} />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => setModal({ open: true, editing: o })}
                              className="w-8 h-8 grid place-items-center rounded-[7px] text-[var(--ces-muted)] hover:bg-[var(--ces-gold-100)] hover:text-[var(--ces-gold-700)] transition-colors"
                              title="Redaktə et"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(o)}
                              className="w-8 h-8 grid place-items-center rounded-[7px] text-[var(--ces-muted)] hover:bg-[var(--ces-danger-100)] hover:text-[var(--ces-danger)] transition-colors"
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
