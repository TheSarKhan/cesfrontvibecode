import { useState, useEffect, useMemo, useRef } from 'react'
import { Search, Printer, Eye, Wrench, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { serviceApi } from '../../api/service'
import ServiceInvoicePrintModal from '../service/ServiceInvoicePrintModal'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'
import { fmtDate } from '../../utils/date'
import { Pill, TableWrap, PageHeader, Select } from './_shared'
import { fmtMoney } from './_constants'

const fmt = fmtDate

const STATUS_LABELS = {
  AVAILABLE:     'Hazırdır',
  DEFECTIVE:     'Nasaz',
  IN_REPAIR:     'Təmirdə',
  IN_INSPECTION: 'Servisdədir',
  IN_TRANSIT:    'Yoldadır',
  RENTED:        'Layihədə',
}

const STATCARD_TONES = {
  gold:   { bg: 'var(--ces-gold-100)',  color: 'var(--ces-gold-700)' },
  ok:     { bg: 'var(--ces-ok-100)',              color: 'var(--ces-ok)' },
  danger: { bg: 'var(--ces-danger-100)',              color: 'var(--ces-danger)' },
  info:   { bg: 'var(--ces-info-100)',              color: 'var(--ces-info)' },
  warn:   { bg: 'var(--ces-warn-100)',              color: 'var(--ces-warn)' },
}

function StatCard({ icon: Icon, label, value, tone }) {
  const t = STATCARD_TONES[tone] || STATCARD_TONES.gold
  return (
    <div
      className="flex items-center gap-3"
      style={{
        background: 'var(--ces-surface)',
        border: '1px solid var(--ces-line)',
        borderRadius: 'var(--ces-radius-lg)',
        padding: '14px 16px',
        boxShadow: 'var(--ces-shadow-sm)',
      }}
    >
      <div className="w-9 h-9 rounded-[10px] grid place-items-center flex-none"
        style={{ background: t.bg, color: t.color }}>
        {Icon && <Icon size={15} />}
      </div>
      <div className="min-w-0">
        <p className="text-[10.5px] font-bold uppercase tracking-[.14em] truncate" style={{ color: 'var(--ces-muted)' }}>{label}</p>
        <p className="text-[18px] font-extrabold leading-tight num" style={{ color: 'var(--ces-graphite-900)' }}>{value}</p>
      </div>
    </div>
  )
}

export default function ServiceInvoicesPage() {
  const navigate = useNavigate()

  const [records, setRecords]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [printModal, setPrintModal] = useState(null)

  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const searchRef = useRef(null)

  usePageShortcuts({ searchRef })

  const load = async () => {
    setLoading(true)
    try {
      const res = await serviceApi.getAll()
      const all = res.data.data || res.data || []
      setRecords(all.filter(r => r.completed && r.cost != null && parseFloat(r.cost) > 0))
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return records.filter(r => {
      if (q && !r.equipmentName?.toLowerCase().includes(q) && !r.serviceType?.toLowerCase().includes(q)) return false
      if (typeFilter && r.recordType !== typeFilter) return false
      if (dateFrom && r.serviceDate < dateFrom) return false
      if (dateTo   && r.serviceDate > dateTo)   return false
      return true
    })
  }, [records, search, typeFilter, dateFrom, dateTo])

  const totalCost   = filtered.reduce((s, r) => s + parseFloat(r.cost || 0), 0)
  const inspCount   = filtered.filter(r => r.recordType === 'INSPECTION').length
  const repairCount = filtered.filter(r => r.recordType !== 'INSPECTION').length

  return (
    <div style={{ color: 'var(--ces-ink)' }}>
      <PageHeader
        eyebrow="Mühasibatlıq"
        title="Servis Qaimələri"
        subtitle="Tamamlanmış baxış və servis xərcləri"
        right={<button onClick={() => navigate('/accounting')} className="ces-btn ces-btn-outline ces-btn-sm">
          <ArrowLeft size={14} /> Geri
        </button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard icon={Printer}     label="Cəmi Qaimə"        value={filtered.length} tone="gold" />
        <StatCard icon={CheckCircle} label="Cəmi Xərc"         value={fmtMoney(totalCost)} tone="danger" />
        <StatCard icon={Eye}         label="Baxış Qaimələri"   value={inspCount}  tone="warn" />
        <StatCard icon={Wrench}      label="Servis Qaimələri"  value={repairCount} tone="info" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 max-w-[360px]"
          style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '10px', padding: '0 12px', minHeight: '40px' }}>
          <Search size={14} style={{ color: 'var(--ces-mute2)' }} />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Texnika, növ..."
            className="flex-1 outline-none bg-transparent text-[13px]"
          />
        </div>
        <div className="min-w-[170px]">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Bütün növlər</option>
            <option value="INSPECTION">Texniki Baxış</option>
            <option value="REPAIR">Texniki Servis</option>
          </Select>
        </div>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="text-[13px]"
          style={{
            padding: '0 12px', minHeight: '40px',
            background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '10px',
            color: 'var(--ces-graphite)', outline: 'none',
          }} />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="text-[13px]"
          style={{
            padding: '0 12px', minHeight: '40px',
            background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '10px',
            color: 'var(--ces-graphite)', outline: 'none',
          }} />
      </div>

      <TableWrap>
        <div className="overflow-x-auto">
          <table className="ces-tbl w-full min-w-[760px]">
            <thead>
              <tr>
                <th>№</th>
                <th>Texnika</th>
                <th>Növ</th>
                <th>Tarix</th>
                <th>Kateqoriya</th>
                <th>Nəticə</th>
                <th className="r">Xərc</th>
                <th className="w-act"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={8} rows={6} />
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 0 }}>
                  <EmptyState
                    icon={Printer}
                    title="Servis qaiməsi yoxdur"
                    description={records.length === 0 ? 'Xərci olan tamamlanmış servis qeydi tapılmadı' : 'Axtarış şərtlərini dəyişin'}
                  />
                </td></tr>
              ) : filtered.map((rec) => {
                const isInspection = rec.recordType === 'INSPECTION'
                const isAvailable  = rec.statusAfter === 'AVAILABLE'
                return (
                  <tr key={rec.id}>
                    <td className="mono" style={{ color: 'var(--ces-muted)', fontSize: '11.5px' }}>
                      SRV-{String(rec.id).padStart(5, '0')}
                    </td>
                    <td>
                      <p className="text-[13.5px] font-bold" style={{ color: 'var(--ces-ink)' }}>{rec.equipmentName || '—'}</p>
                      {rec.plateNumber && <p className="text-[10.5px]" style={{ color: 'var(--ces-mute2)' }}>{rec.plateNumber}</p>}
                    </td>
                    <td>
                      <Pill tone={isInspection ? 'warn' : 'info'} sm>{rec.serviceType}</Pill>
                    </td>
                    <td style={{ color: 'var(--ces-muted)', fontSize: '12px' }}>{fmt(rec.serviceDate)}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {isInspection
                          ? <Eye size={12} style={{ color: 'var(--ces-warn)' }} />
                          : <Wrench size={12} style={{ color: 'var(--ces-info)' }} />}
                        <span className="text-[12.5px]" style={{ color: 'var(--ces-ink)' }}>
                          {isInspection ? 'Texniki Baxış' : 'Texniki Servis'}
                        </span>
                      </div>
                    </td>
                    <td>
                      {rec.statusAfter && (
                        <div className="flex items-center gap-1">
                          {isAvailable
                            ? <CheckCircle size={11} style={{ color: 'var(--ces-ok)' }} />
                            : <AlertTriangle size={11} style={{ color: 'var(--ces-danger)' }} />}
                          <span className="text-[10.5px] font-bold"
                            style={{ color: isAvailable ? 'var(--ces-ok)' : 'var(--ces-danger)' }}>
                            {STATUS_LABELS[rec.statusAfter] || rec.statusAfter}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="r">
                      <span className="text-[14px] font-bold num" style={{ color: 'var(--ces-danger)' }}>
                        −{fmtMoney(rec.cost)}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => setPrintModal(rec)} className="ces-row-act gold" title="Qaiməni çap et">
                        <Printer size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--ces-line)', background: 'var(--ces-graphite-50)' }}>
            <span className="text-[12px]" style={{ color: 'var(--ces-muted)' }}>{filtered.length} qaimə</span>
            <span className="text-[14px] font-bold num" style={{ color: 'var(--ces-danger)' }}>Cəmi: −{fmtMoney(totalCost)}</span>
          </div>
        )}
      </TableWrap>

      {printModal && (
        <ServiceInvoicePrintModal record={printModal} onClose={() => setPrintModal(null)} />
      )}
    </div>
  )
}
