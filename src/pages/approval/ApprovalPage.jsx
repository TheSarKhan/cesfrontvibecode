import { useState, useEffect, useMemo } from 'react'
import { Eye, Clock, Check, XCircle, Pencil, Trash2, ClipboardCheck, RefreshCw } from 'lucide-react'
import { approvalApi } from '../../api/approval'
import { useAuthStore } from '../../store/authStore'
import ApprovalDiffModal from './ApprovalDiffModal'
import Pagination from '../../components/common/Pagination'
import { clsx } from 'clsx'
import { enumLabel } from '../../utils/enumLabel'

const MODULE_LABEL = {
  CUSTOMER_MANAGEMENT: 'Müştərilər',
  CONTRACTOR_MANAGEMENT: 'Podratçılar',
  INVESTORS: 'İnvestorlar',
  OPERATORS: 'Operatorlar',
  EMPLOYEE_MANAGEMENT: 'İşçilər',
  GARAGE: 'Qaraj',
  REQUESTS: 'Sorğular',
  COORDINATOR: 'Koordinator',
  PROJECTS: 'Layihələr',
  ACCOUNTING: 'Mühasibatlıq',
  SERVICE_MANAGEMENT: 'Texniki Servis',
}

// Etiket mərkəzi enum mənbəsindən (OperationStatus); stil/ikon lokal
const STATUS_CFG = {
  PENDING:  { pill: 'ces-p-warn',   get label() { return enumLabel('OperationStatus', 'PENDING') },  icon: Clock },
  APPROVED: { pill: 'ces-p-ok',     get label() { return enumLabel('OperationStatus', 'APPROVED') }, icon: Check },
  REJECTED: { pill: 'ces-p-danger', get label() { return enumLabel('OperationStatus', 'REJECTED') }, icon: XCircle },
}

const getOpLabel = (op) => {
  if (op.operationType === 'DELETE') return 'Silmə'
  if (op.moduleCode === 'COORDINATOR') return 'Təklif hazırlanması'
  return 'Redaktə'
}
const getOpPill = (op) => {
  if (op.operationType === 'DELETE') return 'ces-p-danger'
  if (op.moduleCode === 'COORDINATOR') return 'ces-p-gold'
  return 'ces-p-info'
}
const getOpIcon = (op) => op.operationType === 'DELETE' ? Trash2 : Pencil

export default function ApprovalPage() {
  const { user } = useAuthStore()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [deptFilter, setDeptFilter] = useState('ALL')
  const [selectedId, setSelectedId] = useState(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(15)

  const load = async () => {
    setLoading(true)
    try {
      const res = await approvalApi.getQueue()
      setItems(res.data.data || res.data || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return items.filter(op => {
      const matchStatus = !statusFilter || op.status === statusFilter
      const matchDept = deptFilter === 'ALL' || op.performerDepartmentName === deptFilter || String(op.performerDepartmentId) === deptFilter
      return matchStatus && matchDept
    })
  }, [items, statusFilter, deptFilter])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize)

  const pendingCount  = items.filter(o => o.status === 'PENDING').length
  const approvedCount = items.filter(o => o.status === 'APPROVED').length
  const rejectedCount = items.filter(o => o.status === 'REJECTED').length

  const deptOptions = useMemo(() => {
    const seen = new Map()
    items.forEach(op => {
      if (op.performerDepartmentId && op.performerDepartmentName) {
        seen.set(String(op.performerDepartmentId), op.performerDepartmentName)
      }
    })
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [items])

  const statusTabs = [
    { value: '',         label: 'Hamısı',       count: items.length },
    { value: 'PENDING',  label: 'Gözləyir',     count: pendingCount },
    { value: 'APPROVED', label: 'Təsdiqləndi',  count: approvedCount },
    { value: 'REJECTED', label: 'Rədd edildi',  count: rejectedCount },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-7 gap-4 flex-wrap">
        <div>
          <h1 className="ces-page-title flex items-center gap-3">
            <span className="ces-m-ic gold" style={{ width: 38, height: 38, borderRadius: 11 }}>
              <ClipboardCheck size={20} />
            </span>
            Təsdiq növbəsi
          </h1>
          <p className="ces-page-sub">
            {pendingCount > 0 ? `${pendingCount} gözləyən əməliyyat` : 'Gözləyən əməliyyat yoxdur'}
          </p>
        </div>
        <button onClick={load} className="ces-btn ces-btn-outline">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Yenilə
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="ces-kpi-card">
          <div className="ces-kpi-top">
            <span className="ces-kpi-lab">Cəmi</span>
            <span className="ces-kpi-ic gold"><ClipboardCheck size={18} /></span>
          </div>
          <div className="ces-kpi-val">{items.length}</div>
        </div>
        <div className="ces-kpi-card">
          <div className="ces-kpi-top">
            <span className="ces-kpi-lab">Gözləyir</span>
            <span className="ces-kpi-ic" style={{ background: '#fff4dc', color: 'var(--ces-warn)' }}><Clock size={18} /></span>
          </div>
          <div className="ces-kpi-val">{pendingCount}</div>
        </div>
        <div className="ces-kpi-card">
          <div className="ces-kpi-top">
            <span className="ces-kpi-lab">Təsdiqləndi</span>
            <span className="ces-kpi-ic ok"><Check size={18} /></span>
          </div>
          <div className="ces-kpi-val">{approvedCount}</div>
        </div>
        <div className="ces-kpi-card">
          <div className="ces-kpi-top">
            <span className="ces-kpi-lab">Rədd edildi</span>
            <span className="ces-kpi-ic danger"><XCircle size={18} /></span>
          </div>
          <div className="ces-kpi-val">{rejectedCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="ces-seg">
          {statusTabs.map(t => (
            <button
              key={t.value}
              onClick={() => { setStatusFilter(t.value); setPage(0) }}
              className={clsx(statusFilter === t.value && 'on')}
            >
              {t.label}
              {t.value === 'PENDING' && t.count > 0 && (
                <span
                  className="mono"
                  style={{
                    marginLeft: 8, padding: '2px 7px', borderRadius: 999,
                    background: statusFilter === t.value ? 'var(--ces-gold)' : 'var(--ces-warn)',
                    color: statusFilter === t.value ? 'var(--ces-on-gold)' : '#fff', fontSize: 10.5, fontWeight: 800,
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {deptOptions.length > 1 && (
          <select
            value={deptFilter}
            onChange={e => { setDeptFilter(e.target.value); setPage(0) }}
            className="ces-select sm"
            style={{ minWidth: 200 }}
          >
            <option value="ALL">Bütün şöbələr</option>
            {deptOptions.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="ces-table-wrap">
        <div className="overflow-x-auto">
          <table className="ces-tbl" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th>Modul</th>
                <th>Əməliyyat</th>
                <th>Entity</th>
                <th>Şöbə</th>
                <th>Edən</th>
                <th>Tarix</th>
                <th>Status</th>
                <th className="r"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}>
                        <div className="animate-pulse" style={{ height: 14, borderRadius: 4, background: 'var(--ces-graphite-50)' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center" style={{ padding: '48px 16px', color: 'var(--ces-mute2)' }}>
                    {items.length === 0 ? 'Heç bir əməliyyat tapılmadı' : 'Filtrlərə uyğun nəticə yoxdur'}
                  </td>
                </tr>
              ) : (
                paged.map(op => {
                  const OpIcon = getOpIcon(op)
                  const sc = STATUS_CFG[op.status] || STATUS_CFG.PENDING
                  const StatusIcon = sc.icon
                  return (
                    <tr
                      key={op.id}
                      style={op.status === 'PENDING' ? { background: 'rgba(255, 244, 220, .35)' } : undefined}
                    >
                      <td style={{ fontWeight: 600, color: 'var(--ces-ink)' }}>
                        {MODULE_LABEL[op.moduleCode] || op.moduleCode}
                      </td>
                      <td>
                        <span className={clsx('ces-pill sm', getOpPill(op))}>
                          <OpIcon size={11} />
                          {getOpLabel(op)}
                        </span>
                      </td>
                      <td>
                        <div className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ces-ink)', maxWidth: 220 }} title={op.entityLabel}>
                          {op.entityLabel || `#${op.entityId}`}
                        </div>
                      </td>
                      <td style={{ color: 'var(--ces-muted)' }}>
                        {op.performerDepartmentName || '—'}
                      </td>
                      <td style={{ color: 'var(--ces-ink)' }}>
                        {op.performedByName || '—'}
                      </td>
                      <td className="mono" style={{ fontSize: 12, color: 'var(--ces-muted)' }}>
                        {op.createdAt ? new Date(op.createdAt).toLocaleString('az-AZ') : '—'}
                      </td>
                      <td>
                        <span className={clsx('ces-pill sm', sc.pill)}>
                          <StatusIcon size={11} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="r">
                        <button
                          onClick={() => setSelectedId(op.id)}
                          className="ces-btn ces-btn-outline ces-btn-xs"
                        >
                          <Eye size={13} />
                          Bax
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page + 1}
          pageSize={pageSize}
          totalPages={totalPages}
          totalElements={filtered.length}
          onPage={(p) => setPage(p - 1)}
          onPageSize={(s) => { setPageSize(s); setPage(0) }}
        />
      </div>

      {selectedId && (
        <ApprovalDiffModal
          operationId={selectedId}
          onClose={() => setSelectedId(null)}
          onActionDone={() => {
            setSelectedId(null)
            load()
          }}
        />
      )}
    </div>
  )
}
