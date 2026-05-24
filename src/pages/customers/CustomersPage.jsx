import { useState, useEffect, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Plus, Pencil, Trash2, Search, Building2, Download, Eye, Users, ShieldAlert, CheckCircle2 } from 'lucide-react'
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
  LOW:    { label: 'Aşağı',  pill: 'ces-p-ok' },
  MEDIUM: { label: 'Orta',   pill: 'ces-p-warn' },
  HIGH:   { label: 'Yüksək', pill: 'ces-p-danger' },
}

const STATUS_CONFIG = {
  ACTIVE:   { label: 'Aktiv',     pill: 'ces-p-ok' },
  PASSIVE:  { label: 'Passiv',    pill: 'ces-p-mute' },
  VARIABLE: { label: 'Dəyişkən',  pill: 'ces-p-info' },
}

const PAYMENT_LABEL = { CASH: 'Nağd', TRANSFER: 'Köçürmə' }

function PaymentBadges({ types }) {
  if (!types || types.length === 0) return <span className="text-[var(--ces-mute2)] text-xs">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {[...types].map((t) => (
        <span key={t} className="ces-pill ces-p-mute sm">
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
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Müştərilər yüklənmədi')
    } finally {
      setLoading(false)
    }
  }, [page, size, search, statusFilter, riskFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId) return
    customersApi.getById(Number(openId))
      .then(res => setSlideOver(res.data.data || res.data))
      .catch(() => {})
    setSearchParams(p => { const n = new URLSearchParams(p); n.delete('open'); return n }, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allSelected = data.content.length > 0 && data.content.every(x => selectedIds.has(x.id))
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(data.content.map(x => x.id)))

  const handleBulkDelete = async () => {
    if (!window.confirm(`${selectedIds.size} element silinsin?`)) return
    setBulkLoading(true)
    try {
      await customersApi.deleteAll([...selectedIds])
      toast.success(`${selectedIds.size} element silindi`)
      setSelectedIds(new Set())
      load()
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Silinmə zamanı xəta baş verdi')
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

  const activeCount  = data.content.filter(c => c.status === 'ACTIVE').length
  const passiveCount = data.content.filter(c => c.status === 'PASSIVE').length
  const highRisk     = data.content.filter(c => c.riskLevel === 'HIGH').length

  const chips = [
    { label: 'Hamısı',       status: '',         risk: '' },
    { label: 'Aktiv',        status: 'ACTIVE',   risk: '' },
    { label: 'Passiv',       status: 'PASSIVE',  risk: '' },
    { label: 'Yüksək risk',  status: '',         risk: 'HIGH' },
    { label: 'Orta risk',    status: '',         risk: 'MEDIUM' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-7 gap-4 flex-wrap">
        <div>
          <h1 className="ces-page-title">Müştərilər</h1>
          <p className="ces-page-sub">
            {data.totalElements} müştəri qeydiyyatda
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel} className="ces-btn ces-btn-outline">
            <Download size={15} />
            Excel-ə yüklə
          </button>
          {canCreate && (
            <button
              onClick={() => setModal({ open: true, editing: null })}
              className="ces-btn ces-btn-primary"
            >
              <Plus size={16} />
              Yeni müştəri
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="ces-kpi-card">
          <div className="ces-kpi-top">
            <span className="ces-kpi-lab">Cəmi</span>
            <span className="ces-kpi-ic gold"><Users size={18} /></span>
          </div>
          <div className="ces-kpi-val">{data.totalElements}</div>
        </div>
        <div className="ces-kpi-card">
          <div className="ces-kpi-top">
            <span className="ces-kpi-lab">Aktiv</span>
            <span className="ces-kpi-ic ok"><CheckCircle2 size={18} /></span>
          </div>
          <div className="ces-kpi-val">{activeCount}</div>
        </div>
        <div className="ces-kpi-card">
          <div className="ces-kpi-top">
            <span className="ces-kpi-lab">Passiv</span>
            <span className="ces-kpi-ic"><Building2 size={18} /></span>
          </div>
          <div className="ces-kpi-val">{passiveCount}</div>
        </div>
        <div className="ces-kpi-card">
          <div className="ces-kpi-top">
            <span className="ces-kpi-lab">Yüksək risk</span>
            <span className="ces-kpi-ic danger"><ShieldAlert size={18} /></span>
          </div>
          <div className="ces-kpi-val">{highRisk}</div>
        </div>
      </div>

      {/* Quick filter chips (kit-segment style) */}
      <div className="ces-seg mb-4">
        {chips.map(chip => {
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
              className={active ? 'on' : ''}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="ces-input has-icon sm flex-1 min-w-[240px]">
          <Search size={15} />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Şirkət adı, VÖEN, məsul şəxs..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="ces-select sm"
          style={{ minWidth: 160 }}
        >
          <option value="">Bütün statuslar</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="PASSIVE">Passiv</option>
          <option value="VARIABLE">Dəyişkən</option>
        </select>
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="ces-select sm"
          style={{ minWidth: 160 }}
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
        <div className="ces-alert gold mb-4">
          <div className="ces-al-ic"><CheckCircle2 size={18} /></div>
          <div className="flex-1 text-sm font-semibold text-[var(--ces-graphite)]">
            {selectedIds.size} element seçildi
          </div>
          <button
            onClick={handleBulkDelete}
            disabled={bulkLoading}
            className="ces-btn ces-btn-danger ces-btn-sm"
          >
            {bulkLoading
              ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Trash2 size={14} />}
            Seçilənləri sil
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ces-btn ces-btn-ghost ces-btn-sm"
          >
            Ləğv et
          </button>
        </div>
      )}

      {/* Table */}
      <div className="ces-table-wrap">
        <div className="overflow-x-auto">
          <table className="ces-tbl" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th className="w-chk">
                  <label className="ces-chk">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                    <span className="ces-cb"></span>
                  </label>
                </th>
                <th>Şirkət adı</th>
                <th>VÖEN</th>
                {isVisible('customers', 'phone')         && <th>Təchizatçı</th>}
                {isVisible('customers', 'contactPerson') && <th>Ofis məsul</th>}
                {isVisible('customers', 'address')       && <th>Ödəniş</th>}
                {isVisible('customers', 'risk')          && <th>Risk</th>}
                {isVisible('customers', 'status')        && <th>Status</th>}
                <th className="r">Əməliyyat</th>
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
                      style={{ cursor: 'pointer' }}
                    >
                      <td onClick={e => e.stopPropagation()}>
                        <label className="ces-chk">
                          <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} />
                          <span className="ces-cb"></span>
                        </label>
                      </td>
                      <td title={c.companyName}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ces-ink)' }}>{c.companyName}</div>
                        {c.address && (
                          <div className="truncate" style={{ fontSize: 12, color: 'var(--ces-muted)', maxWidth: 200 }} title={c.address}>
                            {c.address}
                          </div>
                        )}
                      </td>
                      <td className="mono" style={{ color: 'var(--ces-muted)' }}>{c.voen || '—'}</td>
                      {isVisible('customers', 'phone') && (
                        <td title={[c.supplierPerson, c.supplierPhone].filter(Boolean).join(' · ')}>
                          <div style={{ color: 'var(--ces-ink)' }}>{c.supplierPerson || '—'}</div>
                          {c.supplierPhone && <div className="mono" style={{ fontSize: 12, color: 'var(--ces-muted)' }}>{c.supplierPhone}</div>}
                        </td>
                      )}
                      {isVisible('customers', 'contactPerson') && (
                        <td title={[c.officeContactPerson, c.officeContactPhone].filter(Boolean).join(' · ')}>
                          <div style={{ color: 'var(--ces-ink)' }}>{c.officeContactPerson || '—'}</div>
                          {c.officeContactPhone && <div className="mono" style={{ fontSize: 12, color: 'var(--ces-muted)' }}>{c.officeContactPhone}</div>}
                        </td>
                      )}
                      {isVisible('customers', 'address') && (
                        <td><PaymentBadges types={c.paymentTypes} /></td>
                      )}
                      {isVisible('customers', 'risk') && (
                        <td>
                          <span className={clsx('ces-pill sm', risk.pill)}>
                            <span className="d"></span>
                            {risk.label}
                          </span>
                        </td>
                      )}
                      {isVisible('customers', 'status') && (
                        <td>
                          <span className={clsx('ces-pill sm', status.pill)}>
                            <span className="d"></span>
                            {status.label}
                          </span>
                        </td>
                      )}
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => setSlideOver(c)} className="ces-row-act info" title="Bax">
                            <Eye size={15} />
                          </button>
                          {canEdit && (
                            <button onClick={() => setModal({ open: true, editing: c })} className="ces-row-act gold" title="Redaktə et">
                              <Pencil size={15} />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDelete(c)} className="ces-row-act danger" title="Sil">
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
