import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock, CheckCircle, Zap,
  TrendingUp, TrendingDown, Wallet,
  FileText, AlertTriangle,
  ArrowRight, RefreshCw, ShieldCheck,
  Building2, HardHat,
  UserCheck, BarChart3, Trash2, Settings,
  Users, CloudSun,
} from 'lucide-react'
import ActivityFeed from '../components/common/ActivityFeed'
import RevenueBarChart from '../components/common/RevenueBarChart'
import ProjectStatusChart from '../components/common/ProjectStatusChart'
import axiosInstance from '../api/axios'
import { clsx } from 'clsx'

const fmt = (n) =>
  new Intl.NumberFormat('az-AZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n ?? 0)

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

/* ─────────────────────────────────────────────
   KPI CARD  — pastel background, label top-left,
   big number bottom-left, trend badge top-right
───────────────────────────────────────────── */
function KpiCard({ label, value, trend, trendPositive, bg, onClick }) {
  const pos = trendPositive !== undefined ? trendPositive : (parseFloat(trend) >= 0)
  return (
    <button
      onClick={onClick}
      className={clsx(
        'rounded-2xl px-4 py-4 flex flex-col justify-between text-left w-full min-h-[90px] transition-shadow hover:shadow-sm cursor-pointer',
        bg
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-[11px] text-gray-500 font-medium leading-snug">{label}</p>
        {trend !== undefined && (
          <span className={clsx(
            'text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5',
            pos ? 'bg-white/60 text-green-600' : 'bg-white/60 text-red-500'
          )}>
            {pos && trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-[32px] font-black text-gray-800 leading-none mt-2">{value}</p>
    </button>
  )
}

/* ─────────────────────────────────────────────
   FINANCE CARD — white bg, colored value,
   sub-label, "Hədd: ±N" note, colored bottom line
───────────────────────────────────────────── */
function FinanceCard({ label, value, sub, note, valueColor, lineColor }) {
  return (
    <div className="bg-white rounded-2xl px-4 py-4 flex flex-col gap-0.5"
      style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      <p className="text-[11px] text-gray-400 font-medium">{label}</p>
      <p className={clsx('text-[22px] font-black leading-tight mt-0.5', valueColor)}>{value}</p>
      {sub  && <p className="text-[10px] text-gray-400">{sub}</p>}
      {note && <p className="text-[10px] text-gray-400 mt-0.5">{note}</p>}
      <div className={clsx('mt-3 h-[3px] rounded-full w-full', lineColor || 'bg-gray-200')} />
    </div>
  )
}

/* ─────────────────────────────────────────────
   DEADLINE BADGE — inline colored text (no pill)
───────────────────────────────────────────── */
function DeadlineBadge({ endDate }) {
  if (!endDate) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const end   = new Date(endDate); end.setHours(0,0,0,0)
  const diff  = Math.ceil((end - today) / 86400000)
  if (diff < 0)  return <span className="text-[10px] font-semibold text-red-500">Bitib</span>
  if (diff === 0) return <span className="text-[10px] font-semibold text-red-500">Bu gün bitir</span>
  if (diff <= 7)  return <span className="text-[10px] font-semibold text-red-500">Bitmə­sinə {diff} gün qalıb</span>
  return null
}

/* ─────────────────────────────────────────────
   EQUIPMENT BAR
───────────────────────────────────────────── */
function EquipmentBar({ stats, navigate }) {
  const total = (stats.availableEquipment ?? 0) + (stats.rentedEquipment ?? 0) +
                (stats.defectiveEquipment ?? 0) + (stats.outOfServiceEquipment ?? 0)
  if (total === 0) return null

  const segs = [
    { key: 'availableEquipment',    label: 'Mövcud',            bar: 'bg-emerald-400', dot: 'bg-emerald-400' },
    { key: 'rentedEquipment',       label: 'İcarədə',           bar: 'bg-blue-400',    dot: 'bg-blue-400' },
    { key: 'defectiveEquipment',    label: 'Nasaz',             bar: 'bg-red-500',     dot: 'bg-red-500' },
    { key: 'outOfServiceEquipment', label: 'Mövcud deyil',      bar: 'bg-gray-400',    dot: 'bg-gray-400' },
  ]

  return (
    <div className="bg-white rounded-2xl px-4 py-4" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-semibold text-gray-700">
          Texnikaların statusu <span className="text-gray-400 font-normal">({total} ədəd)</span>
        </p>
        <button onClick={() => navigate('/garage')}
          className="text-[11px] text-orange-500 font-semibold flex items-center gap-1">
          Daha çox <ArrowRight size={11} />
        </button>
      </div>
      {/* progress bar */}
      <div className="flex h-2 rounded-full overflow-hidden mb-3">
        {segs.map(({ key, bar }) => {
          const pct = (stats[key] / total) * 100
          return pct > 0 ? <div key={key} className={bar} style={{ width: `${pct}%` }} /> : null
        })}
      </div>
      {/* legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {segs.map(({ key, label, dot }) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={clsx(dot, 'w-2 h-2 rounded-full shrink-0')} />
            <span className="text-[11px] text-gray-500">{label}</span>
            <span className="text-[11px] font-bold text-gray-700">{stats[key] ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   STATUS PILL (sorğular siyahısı)
───────────────────────────────────────────── */
function StatusPill({ status }) {
  const map = {
    DRAFT:               { label: 'Qaralama',         cls: 'bg-gray-100 text-gray-500' },
    PENDING:             { label: 'Gözləmədə',        cls: 'bg-yellow-100 text-yellow-700' },
    SUBMITTED:           { label: 'Göndərildi',       cls: 'bg-blue-100 text-blue-700' },
    SENT_TO_COORDINATOR: { label: 'İstənmədi',        cls: 'bg-orange-100 text-orange-600' },
    OFFER_SENT:          { label: 'Teklif göndərildi',cls: 'bg-teal-100 text-teal-700' },
    ACCEPTED:            { label: 'İcra edilməyib',   cls: 'bg-red-100 text-red-600' },
    REJECTED:            { label: 'Rədd edildi',      cls: 'bg-red-100 text-red-600' },
  }
  const cfg = map[status] || { label: status, cls: 'bg-gray-100 text-gray-500' }
  return (
    <span className={clsx('px-2.5 py-1 rounded-lg text-[10px] font-semibold shrink-0 whitespace-nowrap', cfg.cls)}>
      {cfg.label}
    </span>
  )
}

/* ─────────────────────────────────────────────
   WIDGET SETTINGS
───────────────────────────────────────────── */
const DEFAULT_WIDGETS = {
  kpis: true, equipment: true, entities: true,
  charts: true, projects: true, requests: true, activity: true,
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
export default function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading]           = useState(true)
  const [projects, setProjects]         = useState([])
  const [summary, setSummary]           = useState(null)
  const [requests, setRequests]         = useState([])
  const [stats, setStats]               = useState(null)
  const [widgets, setWidgets]           = useState(() => {
    try { return { ...DEFAULT_WIDGETS, ...JSON.parse(localStorage.getItem('dashboard_widgets') || '{}') } }
    catch { return DEFAULT_WIDGETS }
  })
  const [showSettings, setShowSettings] = useState(false)

  const toggleWidget = (key) => {
    setWidgets(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem('dashboard_widgets', JSON.stringify(next))
      return next
    })
  }

  const load = async () => {
    setLoading(true)
    try {
      const res  = await axiosInstance.get('/dashboard/stats')
      const data = res.data.data || res.data
      setStats(data)
      setProjects(data.projects || [])
      setSummary(data.accountingSummary || null)
      setRequests(data.requests || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const activeProjects    = projects.filter(p => p.status === 'ACTIVE')
  const pendingProjects   = projects.filter(p => p.status === 'PENDING')
  const completedProjects = projects.filter(p => p.status === 'COMPLETED')
  const pendingRequests   = requests.filter(r => ['DRAFT','PENDING','SENT_TO_COORDINATOR'].includes(r.status))
  const urgentProjects    = activeProjects.filter(p => {
    if (!p.endDate) return false
    return Math.ceil((new Date(p.endDate) - new Date()) / 86400000) <= 3
  })

  const todayStr = new Date().toLocaleDateString('az-AZ', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).toUpperCase().replace('.', ' ').replace('.', '')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 gap-2 text-gray-300">
        <RefreshCw size={16} className="animate-spin" />
        <span className="text-sm">Yüklənir...</span>
      </div>
    )
  }

  return (
    <div className="space-y-5 bg-white min-h-screen px-5 py-5">

      {/* ══ HEADER ══════════════════════════════ */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] text-gray-400 font-normal mb-0.5">Biz Elvira</p>
          <h1 className="text-[26px] font-black text-gray-900 leading-tight">Xoş gəlmisən!</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* settings */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(s => !s)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Settings size={15} />
            </button>
            {showSettings && (
              <div className="absolute right-0 top-9 z-50 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Bölmələr</p>
                {[
                  { key: 'kpis',      label: 'KPI kartları' },
                  { key: 'equipment', label: 'Texnika statusu' },
                  { key: 'entities',  label: 'Biznes göstəriciləri' },
                  { key: 'charts',    label: 'Qrafiklər' },
                  { key: 'projects',  label: 'Aktiv layihələr' },
                  { key: 'requests',  label: 'Son sorğular' },
                  { key: 'activity',  label: 'Son fəaliyyətlər' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 py-1.5 cursor-pointer">
                    <input type="checkbox" checked={widgets[key]} onChange={() => toggleWidget(key)}
                      className="w-3.5 h-3.5 accent-orange-500" />
                    <span className="text-xs text-gray-600">{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {/* date + weather */}
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <CloudSun size={22} className="text-amber-400" />
            <div>
              <p className="text-[12px] font-bold text-gray-700 leading-tight">{todayStr}</p>
              <p className="text-[10px] text-gray-400 leading-tight">18C, Buludlu</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ BANNERS ══════════════════════════════ */}
      {(urgentProjects.length > 0 || (stats?.pendingApprovals > 0)) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {urgentProjects.length > 0 && (
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-left w-full"
              style={{ background: '#FF5A5A' }}
            >
              <p className="text-[12px] font-semibold text-white leading-snug flex-1">
                {urgentProjects.length} aktiv layihənin bitmə tarixi yaxınlaşır.{' '}
                <span className="underline font-bold">Keçid et!</span>
              </p>
              <div className="w-9 h-9 rounded-xl bg-white/25 flex items-center justify-center shrink-0">
                <BarChart3 size={16} className="text-white" />
              </div>
            </button>
          )}
          {stats?.pendingApprovals > 0 && (
            <button
              onClick={() => navigate('/approval')}
              className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-left w-full"
              style={{ background: '#FF9F43' }}
            >
              <p className="text-[12px] font-semibold text-white leading-snug flex-1">
                {stats.pendingApprovals} əməliyyat növbə üçün səni gözləyir.{' '}
                <span className="underline font-bold">Keçid et!</span>
              </p>
              <div className="w-9 h-9 rounded-xl bg-white/25 flex items-center justify-center shrink-0">
                <TrendingUp size={16} className="text-white" />
              </div>
            </button>
          )}
        </div>
      )}

      {/* ══ KPI CARDS ════════════════════════════ */}
      {widgets.kpis && (
        <div>
          <p className="text-[11px] text-gray-400 font-medium mb-2.5">Cari durum</p>
          {/* Row 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 mb-2.5">
            <KpiCard label="Aktiv layihələr"
              value={stats?.activeProjects ?? activeProjects.length}
              trend={3} trendPositive={true}
              bg="bg-[#FFF3E8]"
              onClick={() => navigate('/projects')} />
            <KpiCard label="Aktiv sorğular"
              value={stats?.activeRequests ?? pendingRequests.length}
              trend={1} trendPositive={true}
              bg="bg-[#E8F4FF]"
              onClick={() => navigate('/requests')} />
            <KpiCard label="Təsdiq gözləyən sorğular"
              value={stats?.pendingApprovals ?? '—'}
              trend={-10} trendPositive={false}
              bg="bg-[#F0EDFF]"
              onClick={() => navigate('/approval')} />
          </div>
          {/* Row 2 */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
            <KpiCard label="Aktiv işçilər"
              value={stats?.totalEmployees ?? '—'}
              trend={3} trendPositive={true}
              bg="bg-[#FFF3E8]"
              onClick={() => navigate('/roles')} />
            <KpiCard label="Silinmiş məlumatlar"
              value={stats?.deletedRecords ?? 0}
              trend={-1} trendPositive={false}
              bg="bg-[#F5F5F5]"
              onClick={() => navigate('/trash')} />
            <KpiCard label="Bitmış layihələr"
              value={completedProjects.length}
              trend={-11} trendPositive={false}
              bg="bg-[#F0EDFF]"
              onClick={() => navigate('/projects')} />
          </div>
        </div>
      )}

      {/* ══ BUSINESS ENTITIES ════════════════════ */}
      {widgets.entities && stats && (
        <div>
          <p className="text-[11px] text-gray-400 font-medium mb-2.5">Göstəricilər</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <KpiCard label="Müştərilər"  value={stats.totalCustomers}   trend={3}  trendPositive={true}  bg="bg-[#F5F5F5]" onClick={() => navigate('/customers')} />
            <KpiCard label="Podratçılar" value={stats.totalContractors} trend={-8} trendPositive={false} bg="bg-[#F5F5F5]" onClick={() => navigate('/contractors')} />
            <KpiCard label="İnvestorlar" value={stats.totalInvestors}   trend={-2} trendPositive={false} bg="bg-[#F5F5F5]" onClick={() => navigate('/investors')} />
            <KpiCard label="Operatorlar" value={stats.totalOperators}   trend={6}  trendPositive={true}  bg="bg-[#F5F5F5]" onClick={() => navigate('/operators')} />
          </div>
        </div>
      )}

      {/* ══ EQUIPMENT BAR ════════════════════════ */}
      {widgets.equipment && stats && <EquipmentBar stats={stats} navigate={navigate} />}

      {/* ══ CHARTS ═══════════════════════════════ */}
      {widgets.charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-[11px] text-gray-500 font-medium mb-3">Aylıq gəlir (son 6 ay)</p>
            <RevenueBarChart invoices={stats?.invoices} />
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-[11px] text-gray-500 font-medium mb-3">Layihə statusu</p>
            <ProjectStatusChart projects={projects} />
          </div>
        </div>
      )}

      {/* ══ FINANCE SUMMARY ══════════════════════ */}
      {summary && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11px] text-gray-400 font-medium">Maliyyə xülasəsi</p>
            <button onClick={() => navigate('/accounting')}
              className="text-[11px] text-orange-500 font-semibold flex items-center gap-1">
              Daha çox <ArrowRight size={11} />
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <FinanceCard
              label="Ümumi gəlir"
              value={`${fmt(summary.totalIncome)}₼`}
              sub={`${summary.incomeCount ?? 0} qaimə`}
              note={`Hədd: +${fmt(summary.totalIncome)}`}
              valueColor="text-green-500"
              lineColor="bg-green-400"
            />
            <FinanceCard
              label="Podratçı xərcləri"
              value={`${fmt(summary.totalContractorExpense)}₼`}
              sub={`${summary.contractorExpenseCount ?? 0} qaimə`}
              note={`Hədd: -${fmt(summary.totalContractorExpense)}`}
              valueColor="text-red-500"
              lineColor="bg-red-400"
            />
            <FinanceCard
              label="Şirkot xərcləri"
              value={`${fmt(summary.totalCompanyExpense)}₼`}
              sub="Gəlir"
              note={`Hədd: -${fmt(summary.totalCompanyExpense)}`}
              valueColor="text-red-500"
              lineColor="bg-red-400"
            />
            <FinanceCard
              label="Xalis mənfəət"
              value={`${fmt(summary.netProfit)}₼`}
              sub="Gəlir"
              note={`Hədd: +${fmt(Math.abs(summary.netProfit))}`}
              valueColor={summary.netProfit >= 0 ? 'text-blue-500' : 'text-red-500'}
              lineColor={summary.netProfit >= 0 ? 'bg-blue-400' : 'bg-red-400'}
            />
          </div>
        </div>
      )}

      {/* ══ PROJECTS + REQUESTS ══════════════════ */}
      {(widgets.projects || widgets.requests) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Active projects */}
          {widgets.projects && (
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
              {activeProjects.length === 0 ? (
                <p className="text-xs text-gray-300 px-4 py-6 text-center">Aktiv layihə yoxdur</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {activeProjects.slice(0, 5).map(p => (
                    <div key={p.id}
                      className="px-4 py-3 flex items-start justify-between hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate('/projects')}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-gray-800 truncate">{p.companyName}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{p.projectCode || `PRJ-${String(p.id).padStart(3,'0')}`}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-[11px] text-gray-500">{fmtDate(p.endDate)}</p>
                        <DeadlineBadge endDate={p.endDate} />
                      </div>
                    </div>
                  ))}
                  <div className="px-4 py-3 text-center">
                    <button onClick={() => navigate('/projects')}
                      className="text-[11px] text-gray-500 font-medium hover:text-orange-500">
                      Bütün layihələrə bax
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pending requests */}
          {widgets.requests && (
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
              {pendingRequests.length === 0 ? (
                <p className="text-xs text-gray-300 px-4 py-6 text-center">Gözləmədə sorğu yoxdur</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {pendingRequests.slice(0, 5).map(r => (
                    <div key={r.id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate('/requests')}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-gray-800 truncate">{r.companyName || r.customerName || '—'}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{r.requestCode || `PRJ-${String(r.id).padStart(3,'0')}`}</p>
                      </div>
                      <StatusPill status={r.status} />
                    </div>
                  ))}
                  <div className="px-4 py-3 text-center">
                    <button onClick={() => navigate('/requests')}
                      className="text-[11px] text-gray-500 font-medium hover:text-orange-500">
                      Bütün sorğulara bax
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ COMPLETED PROJECTS TABLE ═════════════ */}
      {widgets.activity && completedProjects.length > 0 && (
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <p className="text-[12px] font-semibold text-gray-700">Son Bağlanmış Layihələr</p>
            <button onClick={() => navigate('/projects')}
              className="text-[11px] text-orange-500 font-semibold flex items-center gap-1">
              Hamısı <ArrowRight size={10} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-4 py-2 text-left text-[10px] text-gray-400 font-semibold">Layihə</th>
                  <th className="px-4 py-2 text-left text-[10px] text-gray-400 font-semibold">Şirkət</th>
                  <th className="px-4 py-2 text-right text-[10px] text-gray-400 font-semibold">Xalis Gəlir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {completedProjects.slice(0, 5).map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate('/projects')}>
                    <td className="px-4 py-2.5">
                      <span className="font-mono font-bold text-green-500">
                        {p.projectCode || `PRJ-${String(p.id).padStart(3,'0')}`}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{p.companyName}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={clsx('font-bold', (p.netProfit ?? 0) >= 0 ? 'text-green-500' : 'text-red-400')}>
                        {(p.netProfit ?? 0) >= 0 ? '+' : ''}{fmt(p.netProfit)} ₼
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ ACTIVITY FEED ════════════════════════ */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <p className="text-[12px] font-semibold text-gray-700 mb-3">Son fəaliyyətlər</p>
        <ActivityFeed />
      </div>

    </div>
  )
}