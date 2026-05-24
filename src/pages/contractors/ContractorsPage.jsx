import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, Star, HardHat, Eye, Download, AlertTriangle, CheckCircle2, Users, XCircle } from 'lucide-react'
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
  LOW:    { label: 'Aşağı',   cls: 'bg-[var(--ces-ok-100,#e8fbe5)] text-[var(--ces-ok)]' },
  MEDIUM: { label: 'Orta',    cls: 'bg-[var(--ces-gold-100)] text-[var(--ces-gold-700)]' },
  HIGH:   { label: 'Yüksək', cls: 'bg-[var(--ces-danger-100,#fdeaef)] text-[var(--ces-danger)]' },
}

const STATUS_CONFIG = {
  ACTIVE:   { label: 'Aktiv',   cls: 'bg-[var(--ces-ok-100,#e8fbe5)] text-[var(--ces-ok)]' },
  INACTIVE: { label: 'Deaktiv', cls: 'bg-[var(--ces-graphite-100)] text-[var(--ces-muted)]' },
}
const PAYMENT_LABEL = { CASH: 'Nağd', TRANSFER: 'Köçürmə' }

function RatingStars({ rating }) {
  if (rating == null || rating === '') return <span className="text-[var(--ces-mute2,#9a9a9a)] text-xs">—</span>
  const val = parseFloat(rating)
  return (
    <div className="flex items-center gap-1">
      <Star size={13} className="fill-[var(--ces-gold)] text-[var(--ces-gold)]" />
      <span className="text-xs font-semibold text-[var(--ces-ink)]">{val.toFixed(1)}</span>
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

  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId) return
    contractorsApi.getById(Number(openId))
      .then(res => setSelected(res.data.data || res.data))
      .catch(() => {})
    setSearchParams(p => { const n = new URLSearchParams(p); n.delete('open'); return n }, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allSelected = data.content.length > 0 && data.content.every(x => selectedIds.has(x.id))
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(data.content.map(x => x.id)))

  const handleBulkDelete = async () => {
    if (!(await confirm({
      title: 'Seçilənləri sil',
      message: `${selectedIds.size} podratçı silinəcək. Davam edilsin?`,
      confirmText: 'Sil',
    }))) return
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
      'Ünvan':          c.address || '',
      'Ödəniş növü':   PAYMENT_LABEL[c.paymentType] || c.paymentType || '',
      'Reytinq':        c.rating != null ? parseFloat(c.rating).toFixed(1) : '',
      'Risk':           RISK_LABELS[c.riskLevel] || c.riskLevel || '',
      'Status':         STATUS_LABELS[c.status] || c.status || '',
      'Qeyd':           c.notes || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [22,15,20,15,25,14,10,12,12,30].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Podratçılar')
    XLSX.writeFile(wb, 'podratcilar.xlsx')
  }

  const totalCount = data.totalElements
  const activeCount = data.content.filter(c => c.status === 'ACTIVE').length
  const inactiveCount = data.content.filter(c => c.status === 'INACTIVE').length
  const highRiskCount = data.content.filter(c => c.riskLevel === 'HIGH').length

  const stats = [
    { label: 'Cəmi',        value: totalCount,    icon: Users,         tone: 'graphite' },
    { label: 'Aktiv',       value: activeCount,   icon: CheckCircle2,  tone: 'ok' },
    { label: 'Deaktiv',     value: inactiveCount, icon: XCircle,       tone: 'mute' },
    { label: 'Yüksək risk', value: highRiskCount, icon: AlertTriangle, tone: 'danger' },
  ]

  const toneCls = {
    graphite: 'bg-[var(--ces-graphite-50)] text-[var(--ces-graphite)]',
    ok:       'bg-[var(--ces-ok-100,#e8fbe5)] text-[var(--ces-ok)]',
    mute:     'bg-[var(--ces-graphite-100)] text-[var(--ces-muted)]',
    danger:   'bg-[var(--ces-danger-100,#fdeaef)] text-[var(--ces-danger)]',
    gold:     'bg-[var(--ces-gold-100)] text-[var(--ces-gold-700)]',
  }

  return (
    <div className="ces-font">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-7">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[var(--ces-ink)] leading-tight">Podratçılar</h1>
          <p className="text-sm text-[var(--ces-muted)] mt-1">
            Cəmi <span className="font-semibold text-[var(--ces-ink)]">{totalCount}</span> podratçı qeydiyyatdadır
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
              Yeni podratçı
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
                'px-3.5 py-1.5 rounded-full text-[12.5px] font-bold tracking-tight transition-colors',
                active
                  ? 'bg-[var(--ces-graphite)] text-[var(--ces-on-primary)]'
                  : 'bg-white text-[var(--ces-graphite)] border border-[var(--ces-line)] hover:border-[var(--ces-graphite)]'
              )}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ces-mute2,#9a9a9a)]" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Şirkət adı, VÖEN, əlaqə şəxsi..."
            className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-[var(--ces-line)] rounded-[11px] text-[var(--ces-ink)] placeholder-[var(--ces-mute2,#9a9a9a)] focus:outline-none focus:border-[var(--ces-graphite)] focus:ring-[3px] focus:ring-[rgba(58,58,58,0.1)] transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 text-sm bg-white border border-[var(--ces-line)] rounded-[11px] text-[var(--ces-ink)] focus:outline-none focus:border-[var(--ces-graphite)] focus:ring-[3px] focus:ring-[rgba(58,58,58,0.1)] cursor-pointer"
        >
          <option value="">Bütün statuslar</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="INACTIVE">Deaktiv</option>
        </select>
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="px-3.5 py-2.5 text-sm bg-white border border-[var(--ces-line)] rounded-[11px] text-[var(--ces-ink)] focus:outline-none focus:border-[var(--ces-graphite)] focus:ring-[3px] focus:ring-[rgba(58,58,58,0.1)] cursor-pointer"
        >
          <option value="">Bütün risklər</option>
          <option value="LOW">Aşağı risk</option>
          <option value="MEDIUM">Orta risk</option>
          <option value="HIGH">Yüksək risk</option>
        </select>
      </div>

      {/* Bulk action toolbar */}
      {canDelete && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[var(--ces-gold-50,#fbf3dc)] border border-[var(--ces-gold-100)] rounded-[14px] mb-4">
          <span className="text-sm font-bold text-[var(--ces-gold-700)]">
            {selectedIds.size} element seçildi
          </span>
          <div className="flex-1" />
          <button
            onClick={handleBulkDelete}
            disabled={bulkLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--ces-danger)] hover:bg-[#b62b4a] text-white text-xs font-bold rounded-[8px] transition-colors disabled:opacity-60"
          >
            {bulkLoading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 size={13} />}
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
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-[var(--ces-line)] bg-white">
              <th className="px-4 py-3.5 w-12">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 accent-[var(--ces-graphite)] cursor-pointer" />
              </th>
              <th className="text-left py-3.5 px-4 text-[11.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.1em]">Şirkət adı</th>
              <th className="text-left py-3.5 px-4 text-[11.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.1em]">VÖEN</th>
              <th className="text-left py-3.5 px-4 text-[11.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.1em]">Əlaqə şəxsi</th>
              <th className="text-left py-3.5 px-4 text-[11.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.1em]">Ödəniş növü</th>
              <th className="text-left py-3.5 px-4 text-[11.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.1em]">Risk</th>
              <th className="text-left py-3.5 px-4 text-[11.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.1em]">Status</th>
              <th className="text-left py-3.5 px-4 text-[11.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.1em]">Reytinq</th>
              <th className="py-3.5 px-4 text-[11.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.1em] text-right">Əməliyyat</th>
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
                      'border-b border-[var(--ces-line-2)] cursor-pointer transition-colors last:border-b-0',
                      isSelected ? 'bg-[var(--ces-gold-50,#fbf3dc)]' : 'hover:bg-[var(--ces-graphite-50)]'
                    )}
                  >
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)}
                        className="w-4 h-4 accent-[var(--ces-graphite)] cursor-pointer" />
                    </td>
                    <td className="py-3.5 px-4" title={c.companyName}>
                      <span className="text-sm font-semibold text-[var(--ces-ink)]">{c.companyName}</span>
                    </td>
                    <td className="py-3.5 px-4 text-sm text-[var(--ces-muted)] font-mono tabular-nums">{c.voen || '—'}</td>
                    <td className="py-3.5 px-4 text-sm text-[var(--ces-muted)]" title={c.contactPerson || ''}>{c.contactPerson || '—'}</td>
                    <td className="py-3.5 px-4 text-sm">
                      {c.paymentType
                        ? <div className="flex flex-wrap gap-1">
                            {c.paymentType.split(',').filter(Boolean).map(pt => (
                              <span key={pt} className="px-2 py-0.5 rounded-[6px] text-[11.5px] font-semibold bg-[var(--ces-graphite-50)] text-[var(--ces-graphite)]">
                                {PAYMENT_LABEL[pt] || pt}
                              </span>
                            ))}
                          </div>
                        : <span className="text-[var(--ces-muted)]">—</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold', risk.cls)}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {risk.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold', status.cls)}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {status.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <RatingStars rating={c.rating} />
                    </td>
                    <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setSelected(c)}
                          className="w-8 h-8 grid place-items-center rounded-[7px] text-[var(--ces-muted)] hover:bg-[var(--ces-graphite-50)] hover:text-[var(--ces-graphite)] transition-colors"
                          title="Bax"
                        >
                          <Eye size={15} />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => setModal({ open: true, editing: c })}
                            className="w-8 h-8 grid place-items-center rounded-[7px] text-[var(--ces-muted)] hover:bg-[var(--ces-gold-100)] hover:text-[var(--ces-gold-700)] transition-colors"
                            title="Redaktə et"
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(c)}
                            className="w-8 h-8 grid place-items-center rounded-[7px] text-[var(--ces-muted)] hover:bg-[var(--ces-danger-100,#fdeaef)] hover:text-[var(--ces-danger)] transition-colors"
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
