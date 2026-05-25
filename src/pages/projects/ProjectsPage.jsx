import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Search, Clock, Zap, CheckCircle, TrendingUp, ChevronRight, FileText, FolderKanban } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import { fmtDate } from '../../utils/date'
import ProjectSlideOver from './ProjectSlideOver'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'
import Pagination from '../../components/common/Pagination'
import { useSearchParams } from 'react-router-dom'

const STATUS_CONFIG = {
  PENDING:   { label: 'Gözləmədə', pill: 'ces-p-info' },
  ACTIVE:    { label: 'Aktiv',     pill: 'ces-p-ok' },
  COMPLETED: { label: 'Bağlanmış', pill: 'ces-p-mute' },
}

const PROJ_TYPE = { DAILY: 'Günlük', MONTHLY: 'Aylıq' }

function calcDuration(p) {
  const s = p.startDate ?? p.planStartDate
  const e = p.endDate ?? p.planEndDate
  if (s && e) {
    const days = Math.ceil((new Date(e) - new Date(s)) / 86400000)
    return p.projectType === 'MONTHLY' ? `${Math.round(days / 30)} ay` : `${days} gün`
  }
  const n = p.planDayCount ?? p.dayCount
  if (!n) return '—'
  return p.projectType === 'MONTHLY' ? `${n} ay` : `${n} gün`
}

const OWNERSHIP_CFG = {
  COMPANY:    { label: 'Şirkət',    color: 'var(--ces-ok)' },
  INVESTOR:   { label: 'İnvestor',  color: 'var(--ces-info)' },
  CONTRACTOR: { label: 'Podratçı',  color: 'var(--ces-warn)' },
}

function StatCard({ icon: Icon, label, value, sub, iconCls }) {
  return (
    <div className="ces-kpi-card" style={{ padding: 18 }}>
      <div className="ces-kpi-top" style={{ marginBottom: 10 }}>
        <span className="ces-kpi-lab">{label}</span>
        <span className={clsx('ces-kpi-ic', iconCls)}><Icon size={16} /></span>
      </div>
      <div className="ces-kpi-val" style={{ fontSize: 26 }}>{value}</div>
      {sub && <p style={{ fontSize: 11.5, color: 'var(--ces-muted)', marginTop: 6 }}>{sub}</p>}
    </div>
  )
}

export default function ProjectsPage() {
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [allProjects, setAllProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const searchRef = useRef(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('q') || ''
  const statusFilter = searchParams.get('status') || ''
  const page = parseInt(searchParams.get('page') || '0')
  const pageSize = parseInt(searchParams.get('size') || '15')

  const setSearch = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('q', v) : n.delete('q'); n.delete('page'); return n }, { replace: true })
  const setStatusFilter = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('status', v) : n.delete('status'); n.delete('page'); return n }, { replace: true })

  usePageShortcuts({ searchRef })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, size: pageSize }
      if (search) params.q = search
      if (statusFilter) params.status = statusFilter
      const res = await projectsApi.getAllPaged(params)
      const paged = res.data.data || res.data
      setData(paged)
      setSelected(prev => prev ? (paged.content.find(p => p.id === prev.id) ?? prev) : null)
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Layihələr yüklənmədi')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, statusFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId) return
    projectsApi.getById(Number(openId))
      .then(res => setSelected(res.data.data || res.data))
      .catch(() => {})
    setSearchParams(p => { const n = new URLSearchParams(p); n.delete('open'); return n }, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    projectsApi.getAll().then(res => setAllProjects(res.data.data || res.data || [])).catch(() => {})
  }, [data])

  const stats = useMemo(() => {
    const pending   = allProjects.filter(p => p.status === 'PENDING').length
    const active    = allProjects.filter(p => p.status === 'ACTIVE').length
    const completed = allProjects.filter(p => p.status === 'COMPLETED').length
    const totalNet = allProjects
      .filter(p => ['ACTIVE', 'COMPLETED'].includes(p.status))
      .reduce((s, p) => {
        const rev = parseFloat(p.totalRevenue || 0)
        const exp = parseFloat(p.totalExpense || 0)
                  + parseFloat(p.planTransportationPrice || 0)
                  + parseFloat(p.planOperatorPayment || 0)
        return s + (rev - exp)
      }, 0)
    return { pending, active, completed, totalNet }
  }, [allProjects])

  const fmtMoney = (v) => parseFloat(v || 0).toLocaleString('az-AZ', { minimumFractionDigits: 2 })
  const fmt = fmtDate

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-7 gap-4 flex-wrap">
        <div>
          <h1 className="ces-page-title">Layihələr</h1>
          <p className="ces-page-sub">{data.totalElements} layihə</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Clock}       label="Gözləmədə"  value={stats.pending}   sub="müqavilə gözlənilir" />
        <StatCard icon={Zap}         label="Aktiv"      value={stats.active}    sub="icra mərhələsində"      iconCls="ok" />
        <StatCard icon={CheckCircle} label="Bağlanmış"  value={stats.completed} sub="mühasibatlığa göndərildi" />
        <StatCard
          icon={TrendingUp}
          label="Xalis gəlir"
          value={`${fmtMoney(stats.totalNet)} ₼`}
          sub="aktiv + bağlanmış"
          iconCls={stats.totalNet >= 0 ? 'gold' : 'danger'}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="ces-input has-icon sm flex-1 min-w-[240px]">
          <Search size={15} />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kod, şirkət, layihə, texnika, bölgə, podratçı..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="ces-select sm"
          style={{ minWidth: 180 }}
        >
          <option value="">Bütün statuslar</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="ces-table-wrap">
        <div className="overflow-x-auto">
          <table className="ces-tbl" style={{ minWidth: 920 }}>
            <thead>
              <tr>
                <th>Kod</th>
                <th>Şirkət / Layihə</th>
                <th>Bölgə</th>
                <th>Texnika</th>
                <th>Müqavilə</th>
                <th>Status</th>
                <th className="w-act"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={7} rows={6} />
              ) : data.content.length === 0 ? (
                <EmptyState
                  icon={FolderKanban}
                  title="Layihə tapılmadı"
                  description={data.totalElements === 0 ? 'Koordinator sorğu qəbul etdikdən sonra layihələr burada görünəcək' : 'Axtarış şərtlərini dəyişin'}
                />
              ) : (
                data.content.map((p) => {
                  const status = STATUS_CONFIG[p.status] || STATUS_CONFIG.PENDING
                  const isSelected = selected?.id === p.id
                  const ownership = OWNERSHIP_CFG[p.ownershipType]

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelected(p)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'var(--ces-gold-50)' : undefined,
                      }}
                    >
                      {/* Kod */}
                      <td>
                        <p className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ces-ok)' }}>
                          {p.projectCode || `PRJ-${String(p.id).padStart(4, '0')}`}
                        </p>
                        {p.requestCode && (
                          <p className="mono" style={{ fontSize: 10.5, color: 'var(--ces-mute2)', marginTop: 2 }}>{p.requestCode}</p>
                        )}
                      </td>

                      {/* Şirkət / Layihə */}
                      <td>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ces-ink)' }}>{p.companyName}</p>
                        {p.projectName && (
                          <p className="truncate" style={{ fontSize: 12, color: 'var(--ces-muted)', maxWidth: 180 }}>{p.projectName}</p>
                        )}
                      </td>

                      {/* Bölgə */}
                      <td>
                        {p.region ? (
                          <span style={{ fontSize: 12.5, color: 'var(--ces-ink)' }}>{p.region}</span>
                        ) : (
                          <span style={{ color: 'var(--ces-mute2)' }}>—</span>
                        )}
                      </td>

                      {/* Texnika */}
                      <td>
                        {p.equipmentName ? (
                          <div>
                            <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ces-ink)' }}>{p.equipmentName}</p>
                            <p style={{ fontSize: 11, color: 'var(--ces-muted)' }}>
                              {[p.equipmentCode, p.equipmentBrand, p.equipmentModel].filter(Boolean).join(' · ')}
                            </p>
                            {p.equipmentType && (
                              <p style={{ fontSize: 10.5, color: 'var(--ces-mute2)' }}>{p.equipmentType}</p>
                            )}
                            {ownership && (
                              <span style={{ fontSize: 10.5, fontWeight: 700, color: ownership.color }}>
                                {ownership.label}
                              </span>
                            )}
                            {p.ownershipType === 'CONTRACTOR' && p.contractorName && (
                              <p style={{ fontSize: 10.5, color: 'var(--ces-warn)' }}>{p.contractorName}</p>
                            )}
                            {p.ownershipType === 'INVESTOR' && p.investorName && (
                              <p style={{ fontSize: 10.5, color: 'var(--ces-info)' }}>{p.investorName}</p>
                            )}
                          </div>
                        ) : <span style={{ color: 'var(--ces-mute2)' }}>—</span>}
                      </td>

                      {/* Müqavilə */}
                      <td>
                        {p.hasContract ? (
                          <span className="ces-pill ces-p-ok sm">
                            <FileText size={10} />
                            Yüklənib
                          </span>
                        ) : (
                          <span className="ces-pill ces-p-warn sm">
                            <Clock size={10} />
                            Gözlənilir
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={clsx('ces-pill sm', status.pill)}>
                          <span className="d"></span>
                          {status.label}
                        </span>
                      </td>

                      {/* Arrow */}
                      <td className="r">
                        <ChevronRight
                          size={16}
                          style={{ color: isSelected ? 'var(--ces-gold-700)' : 'var(--ces-mute2)' }}
                        />
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
          onPage={(p) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('page', String(p - 1)); return n }, { replace: true })}
          onPageSize={(s) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('size', String(s)); n.delete('page'); return n }, { replace: true })}
        />
      </div>

      {/* SlideOver */}
      {selected && (
        <ProjectSlideOver
          project={selected}
          onClose={() => setSelected(null)}
          onSaved={() => load()}
        />
      )}
    </div>
  )
}
