import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, Star, Banknote, Eye, Download, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { investorsApi } from '../../api/investors'
import { useAuthStore } from '../../store/authStore'
import InvestorModal from './InvestorModal'
import InvestorSlideOver from './InvestorSlideOver'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useSearchParams } from 'react-router-dom'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'
import Pagination from '../../components/common/Pagination'

/* ─── Config / mapping ─── */
const RISK_CONFIG = {
  LOW:    { label: 'Aşağı',  tone: 'ok' },
  MEDIUM: { label: 'Orta',   tone: 'warn' },
  HIGH:   { label: 'Yüksək', tone: 'danger' },
}
const STATUS_CONFIG = {
  ACTIVE:   { label: 'Aktiv',   tone: 'ok' },
  INACTIVE: { label: 'Deaktiv', tone: 'muted' },
}
const PAYMENT_LABEL = { CASH: 'Nağd', TRANSFER: 'Köçürmə' }

/* ─── UI kit `.pill` ─── */
const PILL_STYLES = {
  ok:     { bg: 'var(--ces-ok-100)',              color: 'var(--ces-ok)' },
  warn:   { bg: 'var(--ces-warn-100)',              color: 'var(--ces-warn)' },
  danger: { bg: 'var(--ces-danger-100)',              color: 'var(--ces-danger)' },
  info:   { bg: 'var(--ces-info-100)',              color: 'var(--ces-info)' },
  gold:   { bg: 'var(--ces-gold-100)',  color: 'var(--ces-gold-700)' },
  muted:  { bg: 'var(--ces-graphite-100)', color: 'var(--ces-muted)' },
}

function Pill({ tone = 'muted', children, sm, dot }) {
  const s = PILL_STYLES[tone] || PILL_STYLES.muted
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-bold tracking-tight',
        sm ? 'px-2 py-[3px] text-[11px]' : 'px-2.5 py-1 text-[12px]'
      )}
      style={{ background: s.bg, color: s.color }}
    >
      {children}
    </span>
  )
}

/* ─── Rating ─── */
function RatingStars({ rating }) {
  if (rating == null || rating === '') return <span className="text-[12px]" style={{ color: 'var(--ces-mute2)' }}>—</span>
  const val = parseFloat(rating)
  return (
    <div className="flex items-center gap-1">
      <Star size={13} style={{ fill: 'var(--ces-gold)', color: 'var(--ces-gold)' }} />
      <span className="text-[13px] font-bold num" style={{ color: 'var(--ces-ink)' }}>
        {val.toFixed(1)}
      </span>
    </div>
  )
}

/* ─── Avatar (UI kit `.av`) ─── */
function Avatar({ name, size = 'sm', tone = 'graphite' }) {
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?'
  const sizes = { xs: 22, sm: 28, md: 36 }
  const fontSizes = { xs: 10, sm: 11, md: 12.5 }
  const px = sizes[size]
  return (
    <span
      className="inline-grid place-items-center rounded-full font-bold flex-none"
      style={{
        width: `${px}px`,
        height: `${px}px`,
        fontSize: `${fontSizes[size]}px`,
        background: tone === 'gold' ? 'var(--ces-gold)' : tone === 'mute' ? 'var(--ces-graphite-100)' : 'var(--ces-graphite)',
        color: tone === 'gold' ? 'var(--ces-on-gold)' : tone === 'mute' ? 'var(--ces-muted)' : 'var(--ces-gold)',
      }}
    >
      {initials}
    </span>
  )
}

/* ═══════════════════════════════════════════════════ */
export default function InvestorsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('INVESTORS', 'canPost')
  const canEdit   = hasPermission('INVESTORS', 'canPut')
  const canDelete = hasPermission('INVESTORS', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [data, setData]               = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState({ open: false, editing: null })
  const [selected, setSelected]       = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const searchRef = useRef(null)

  const [searchParams, setSearchParams] = useSearchParams()
  const search       = searchParams.get('q')      || ''
  const statusFilter = searchParams.get('status') || ''
  const riskFilter   = searchParams.get('risk')   || ''
  const page = Number(searchParams.get('page') || '0')
  const size = Number(searchParams.get('size') || '15')

  const setSearch       = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('q', v) : n.delete('q'); n.delete('page'); return n }, { replace: true })
  const setStatusFilter = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('status', v) : n.delete('status'); n.delete('page'); return n }, { replace: true })
  const setRiskFilter   = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('risk', v) : n.delete('risk'); n.delete('page'); return n }, { replace: true })
  const setPage     = (p) => setSearchParams(prev => { const n = new URLSearchParams(prev); p > 0 ? n.set('page', String(p)) : n.delete('page'); return n }, { replace: true })
  const setPageSize = (s) => setSearchParams(prev => { const n = new URLSearchParams(prev); s !== 15 ? n.set('size', String(s)) : n.delete('size'); n.delete('page'); return n }, { replace: true })

  usePageShortcuts({
    onNew: canCreate ? () => setModal({ open: true, editing: null }) : undefined,
    searchRef,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, size, ...(search && { q: search }), ...(statusFilter && { status: statusFilter }), ...(riskFilter && { risk: riskFilter }) }
      const res = await investorsApi.getAllPaged(params)
      setData(res.data.data || res.data)
      setSelectedIds(new Set())
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'İnvestorlar yüklənmədi')
    } finally {
      setLoading(false)
    }
  }, [page, size, search, statusFilter, riskFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId) return
    investorsApi.getById(Number(openId))
      .then(res => setSelected(res.data.data || res.data))
      .catch(() => {})
    setSearchParams(p => { const n = new URLSearchParams(p); n.delete('open'); return n }, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* Selection */
  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allSelected  = data.content.length > 0 && data.content.every(x => selectedIds.has(x.id))
  const someSelected = !allSelected && data.content.some(x => selectedIds.has(x.id))
  const toggleAll    = () => setSelectedIds(allSelected ? new Set() : new Set(data.content.map(x => x.id)))

  const handleBulkDelete = async () => {
    if (!window.confirm(`${selectedIds.size} investor silinsin?`)) return
    setBulkLoading(true)
    try {
      await investorsApi.deleteAll([...selectedIds])
      toast.success(`${selectedIds.size} investor silindi`)
      setSelectedIds(new Set())
      load()
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Silinmə zamanı xəta baş verdi')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleDelete = async (c) => {
    if (!(await confirm({ title: 'İnvestoru sil', message: `"${c.companyName}" investorunu silmək istəyirsiniz?` }))) return
    try {
      await investorsApi.delete(c.id)
      toast.success('İnvestor silindi')
      if (selected?.id === c.id) setSelected(null)
      load()
    } catch (err) {
      if (err?.isPending) return
      toast.error('Silmə uğursuz oldu')
    }
  }

  const exportExcel = () => {
    const rows = data.content.map(c => ({
      'Şirkət adı':   c.companyName || '',
      'VÖEN':          c.voen || '',
      'Əlaqə şəxsi':  c.contactPerson || '',
      'Telefon':       c.contactPhone || '',
      'Ünvan':         c.address || '',
      'Ödəniş növü':  PAYMENT_LABEL[c.paymentType] || c.paymentType || '',
      'Reytinq':       c.rating != null ? parseFloat(c.rating).toFixed(1) : '',
      'Risk':          RISK_CONFIG[c.riskLevel]?.label || c.riskLevel || '',
      'Status':        STATUS_CONFIG[c.status]?.label  || c.status    || '',
      'Qeyd':          c.notes || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [28, 16, 24, 18, 28, 14, 10, 12, 12, 30].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'İnvestorlar')
    XLSX.writeFile(wb, 'investorlar.xlsx')
  }

  const activeFiltersCount = [statusFilter, riskFilter].filter(Boolean).length
  const clearFilters = () => setSearchParams(p => {
    const n = new URLSearchParams(p)
    n.delete('status'); n.delete('risk'); n.delete('page')
    return n
  }, { replace: true })

  /* ─── Stats — UI kit `.kpi-card` lite ─── */
  const stats = [
    { key: 'all',    label: 'Cəmi',        value: data.totalElements,                                       tone: 'graphite' },
    { key: 'active', label: 'Aktiv',       value: data.content.filter(c => c.status === 'ACTIVE').length,   tone: 'ok' },
    { key: 'inact',  label: 'Deaktiv',     value: data.content.filter(c => c.status === 'INACTIVE').length, tone: 'muted' },
    { key: 'risk',   label: 'Yüksək risk', value: data.content.filter(c => c.riskLevel === 'HIGH').length,  tone: 'danger' },
  ]

  return (
    <div style={{ color: 'var(--ces-ink)' }}>

      {/* ══ HEADER ══════════════════════════════════════ */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.022em] leading-none" style={{ color: 'var(--ces-graphite-900)' }}>
            İnvestorlar
          </h1>
          <p className="text-[13px] mt-1.5" style={{ color: 'var(--ces-muted)' }}>
            <span className="num font-semibold" style={{ color: 'var(--ces-graphite)' }}>{data.totalElements}</span> investor qeyd olunub
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            className="ces-btn ces-btn-outline ces-btn-sm"
          >
            <Download size={14} />
            Excel
          </button>
          {canCreate && (
            <button
              onClick={() => setModal({ open: true, editing: null })}
              className="ces-btn ces-btn-primary"
            >
              <Plus size={16} />
              Yeni investor
            </button>
          )}
        </div>
      </div>

      {/* ══ STATS ═══════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {stats.map(s => (
          <div
            key={s.key}
            className="flex items-center gap-3.5"
            style={{
              background: 'var(--ces-surface)',
              border: '1px solid var(--ces-line)',
              borderRadius: 'var(--ces-radius-lg)',
              padding: '16px 18px',
              boxShadow: 'var(--ces-shadow-sm)',
            }}
          >
            <span
              className="w-10 h-10 rounded-[10px] grid place-items-center flex-none"
              style={{
                background:
                  s.tone === 'ok'      ? '#e8fbe5' :
                  s.tone === 'danger'  ? '#fdeaef' :
                  s.tone === 'muted'   ? 'var(--ces-graphite-50)' :
                                         'var(--ces-graphite-100)',
                color:
                  s.tone === 'ok'     ? 'var(--ces-ok)' :
                  s.tone === 'danger' ? 'var(--ces-danger)' :
                  s.tone === 'muted'  ? 'var(--ces-mute2)' :
                                        'var(--ces-graphite)',
              }}
            >
              <Banknote size={18} />
            </span>
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[.14em]" style={{ color: 'var(--ces-muted)' }}>
                {s.label}
              </p>
              <p className="text-[22px] font-extrabold tracking-[-.02em] leading-none num mt-1" style={{ color: 'var(--ces-graphite-900)' }}>
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ══ QUICK FILTER CHIPS — UI kit `.fl` ═══════════ */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[
          { label: 'Hamısı',      status: '',         risk: '' },
          { label: 'Aktiv',       status: 'ACTIVE',   risk: '' },
          { label: 'Deaktiv',     status: 'INACTIVE', risk: '' },
          { label: 'Yüksək risk', status: '',         risk: 'HIGH' },
          { label: 'Orta risk',   status: '',         risk: 'MEDIUM' },
        ].map((chip) => {
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
              className="text-[12.5px] font-semibold transition-colors"
              style={{
                padding: '7px 14px',
                borderRadius: '999px',
                background: active ? 'var(--ces-graphite)' : 'var(--ces-surface)',
                color: active ? 'var(--ces-on-primary)' : 'var(--ces-muted)',
                border: `1px solid ${active ? 'var(--ces-graphite)' : 'var(--ces-line)'}`,
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.borderColor = 'var(--ces-graphite)'
                  e.currentTarget.style.color = 'var(--ces-graphite)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.borderColor = 'var(--ces-line)'
                  e.currentTarget.style.color = 'var(--ces-muted)'
                }
              }}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      {/* ══ TABLE — UI kit `.table-wrap` ════════════════ */}
      <div
        className="overflow-hidden"
        style={{
          background: 'var(--ces-surface)',
          border: '1px solid var(--ces-line)',
          borderRadius: 'var(--ces-radius-lg)',
          boxShadow: 'var(--ces-shadow-sm)',
        }}
      >
        {/* ─── Table tools (.table-tools) ─── */}
        <div
          className="flex items-center justify-between gap-4 flex-wrap"
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--ces-line)',
          }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            {/* Search input (.input.has-icon.sm) */}
            <div
              className="flex items-center gap-2 flex-1 max-w-[320px]"
              style={{
                background: 'var(--ces-surface)',
                border: '1px solid var(--ces-line)',
                borderRadius: '10px',
                padding: '0 12px',
                minHeight: '38px',
              }}
            >
              <Search size={14} style={{ color: 'var(--ces-mute2)' }} />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Şirkət, VÖEN, əlaqə şəxsi..."
                className="flex-1 outline-none bg-transparent text-[13px]"
                style={{ color: 'var(--ces-ink)' }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-[13px] font-medium cursor-pointer transition-colors"
              style={{
                padding: '8px 12px',
                background: 'var(--ces-surface)',
                border: '1px solid var(--ces-line)',
                borderRadius: '10px',
                color: 'var(--ces-graphite)',
                outline: 'none',
                minHeight: '38px',
              }}
            >
              <option value="">Bütün statuslar</option>
              <option value="ACTIVE">Aktiv</option>
              <option value="INACTIVE">Deaktiv</option>
            </select>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-[13px] font-medium cursor-pointer transition-colors"
              style={{
                padding: '8px 12px',
                background: 'var(--ces-surface)',
                border: '1px solid var(--ces-line)',
                borderRadius: '10px',
                color: 'var(--ces-graphite)',
                outline: 'none',
                minHeight: '38px',
              }}
            >
              <option value="">Bütün risklər</option>
              <option value="LOW">Aşağı risk</option>
              <option value="MEDIUM">Orta risk</option>
              <option value="HIGH">Yüksək risk</option>
            </select>
          </div>
        </div>

        {/* ─── Active filter chips (.filters) ─── */}
        {activeFiltersCount > 0 && (
          <div
            className="flex items-center gap-2 flex-wrap"
            style={{
              padding: '10px 22px',
              borderBottom: '1px solid var(--ces-line)',
              background: 'var(--ces-graphite-50)',
            }}
          >
            <span className="text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: 'var(--ces-muted)' }}>
              Aktiv filterlər:
            </span>
            {statusFilter && (
              <FilterChip
                label={`Status: ${STATUS_CONFIG[statusFilter]?.label}`}
                onClear={() => setStatusFilter('')}
              />
            )}
            {riskFilter && (
              <FilterChip
                label={`Risk: ${RISK_CONFIG[riskFilter]?.label}`}
                onClear={() => setRiskFilter('')}
              />
            )}
            <button
              onClick={clearFilters}
              className="text-[12.5px] font-semibold transition-colors ml-1"
              style={{ color: 'var(--ces-gold-700)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ces-gold)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ces-gold-700)')}
            >
              Hamısını təmizlə
            </button>
          </div>
        )}

        {/* ─── Bulk action toolbar ─── */}
        {canDelete && selectedIds.size > 0 && (
          <div
            className="flex items-center gap-3"
            style={{
              padding: '10px 22px',
              borderBottom: '1px solid var(--ces-line)',
              background: 'var(--ces-gold-50)',
            }}
          >
            <span className="text-[13px] font-bold" style={{ color: 'var(--ces-gold-700)' }}>
              {selectedIds.size} investor seçildi
            </span>
            <div className="flex-1" />
            <button
              onClick={handleBulkDelete}
              disabled={bulkLoading}
              className="ces-btn ces-btn-danger ces-btn-sm"
            >
              {bulkLoading
                ? <span className="w-3 h-3 rounded-full animate-spin" style={{ border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'var(--ces-on-primary)' }} />
                : <Trash2 size={13} />}
              Sil ({selectedIds.size})
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[12.5px] font-semibold transition-colors"
              style={{ color: 'var(--ces-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ces-graphite)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ces-muted)')}
            >
              Ləğv et
            </button>
          </div>
        )}

        {/* ─── Table (.tbl) ─── */}
        <div className="overflow-x-auto">
          <table className="ces-tbl w-full min-w-[920px]">
            <thead>
              <tr>
                <th className="w-chk">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected }}
                    onChange={toggleAll}
                    className="w-4 h-4 cursor-pointer"
                    style={{ accentColor: 'var(--ces-gold)' }}
                  />
                </th>
                {['Şirkət', 'VÖEN', 'Əlaqə', 'Telefon', 'Ödəniş', 'Risk', 'Status', 'Reytinq'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
                <th className="r w-act">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={10} rows={6} />
              ) : data.content.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: 0 }}>
                    <EmptyState
                      icon={Banknote}
                      title="İnvestor tapılmadı"
                      description="Axtarış şərtlərini dəyişin və ya yeni investor əlavə edin"
                      action={canCreate ? () => setModal({ open: true, editing: null }) : undefined}
                      actionLabel={canCreate ? 'Yeni İnvestor' : undefined}
                    />
                  </td>
                </tr>
              ) : (
                data.content.map((c) => {
                  const risk     = RISK_CONFIG[c.riskLevel]   || RISK_CONFIG.LOW
                  const status   = STATUS_CONFIG[c.status]    || STATUS_CONFIG.ACTIVE
                  const isSelected = selected?.id === c.id
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className="cursor-pointer transition-colors"
                      style={isSelected ? { background: 'var(--ces-gold-50)' } : undefined}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className="w-4 h-4 cursor-pointer"
                          style={{ accentColor: 'var(--ces-gold)' }}
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={c.companyName} size="sm" tone={isSelected ? 'gold' : 'graphite'} />
                          <span className="text-[13.5px] font-bold" style={{ color: 'var(--ces-ink)' }}>
                            {c.companyName}
                          </span>
                        </div>
                      </td>
                      <td className="mono" style={{ color: 'var(--ces-muted)', fontSize: '12.5px' }}>
                        {c.voen || '—'}
                      </td>
                      <td style={{ color: 'var(--ces-ink)' }}>{c.contactPerson || '—'}</td>
                      <td style={{ color: 'var(--ces-muted)' }}>{c.contactPhone || '—'}</td>
                      <td>
                        {c.paymentType ? (
                          <div className="flex flex-wrap gap-1">
                            {c.paymentType.split(',').filter(Boolean).map(pt => (
                              <span
                                key={pt}
                                className="text-[11px] font-semibold"
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: 'var(--ces-graphite-50)',
                                  color: 'var(--ces-graphite)',
                                  border: '1px solid var(--ces-line)',
                                }}
                              >
                                {PAYMENT_LABEL[pt] || pt}
                              </span>
                            ))}
                          </div>
                        ) : <span style={{ color: 'var(--ces-mute2)' }}>—</span>}
                      </td>
                      <td>
                        <Pill tone={risk.tone} sm dot>{risk.label}</Pill>
                      </td>
                      <td>
                        <Pill tone={status.tone} sm dot>{status.label}</Pill>
                      </td>
                      <td>
                        <RatingStars rating={c.rating} />
                      </td>
                      <td className="r" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setSelected(c)}
                            className="ces-row-act info"
                            title="Bax"
                          >
                            <Eye size={15} />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => setModal({ open: true, editing: c })}
                              className="ces-row-act gold"
                              title="Redaktə et"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(c)}
                              className="ces-row-act danger"
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

        {/* ─── Pagination ─── */}
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
        <InvestorModal
          editing={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => { setModal({ open: false, editing: null }); load() }}
        />
      )}

      {selected && (
        <InvestorSlideOver
          investor={selected}
          onClose={() => setSelected(null)}
          onEdit={canEdit ? () => { setModal({ open: true, editing: selected }); setSelected(null) } : undefined}
          onDelete={canDelete ? () => { handleDelete(selected); setSelected(null) } : undefined}
        />
      )}

      <ConfirmDialog />
    </div>
  )
}

/* ─── Active filter chip ─── */
function FilterChip({ label, onClear }) {
  return (
    <span
      className="inline-flex items-center gap-2 text-[12.5px] font-semibold"
      style={{
        padding: '5px 6px 5px 10px',
        borderRadius: '7px',
        background: 'var(--ces-surface)',
        border: '1px solid var(--ces-line)',
        color: 'var(--ces-graphite)',
      }}
    >
      {label}
      <button
        onClick={onClear}
        className="w-4 h-4 grid place-items-center rounded transition-colors"
        style={{ color: 'var(--ces-muted)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--ces-danger)'
          e.currentTarget.style.color = '#fff'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--ces-muted)'
        }}
      >
        <X size={11} />
      </button>
    </span>
  )
}
