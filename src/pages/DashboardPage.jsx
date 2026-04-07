import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderOpen, Clock, CheckCircle, Zap,
  TrendingUp, TrendingDown, Wallet,
  Truck, Users, FileText, AlertTriangle,
  ArrowRight, RefreshCw, ShieldCheck,
  Building2, HardHat, Wrench, CircleOff,
  UserCheck, BarChart3, Trash2, Settings,
} from 'lucide-react'
import ActivityFeed from '../components/common/ActivityFeed'
import EquipmentPieChart from '../components/common/EquipmentPieChart'
import RevenueBarChart from '../components/common/RevenueBarChart'
import ProjectStatusChart from '../components/common/ProjectStatusChart'
import axiosInstance from '../api/axios'
import { clsx } from 'clsx'

const fmt = (n) =>
  new Intl.NumberFormat('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0)

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

function StatCard({ icon: Icon, label, value, sub, color, textColor, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-4 flex items-center gap-3 text-left w-full transition-shadow',
        onClick && 'hover:shadow-md cursor-pointer'
      )}
    >
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
        <p className={clsx('text-xl font-bold leading-tight truncate', textColor || 'text-gray-800 dark:text-gray-100')}>{value}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </button>
  )
}

function SectionHeader({ title, linkLabel, onLink }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">{title}</h2>
      {onLink && (
        <button onClick={onLink} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium">
          {linkLabel} <ArrowRight size={12} />
        </button>
      )}
    </div>
  )
}

function DeadlineBadge({ endDate }) {
  if (!endDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  const diff = Math.ceil((end - today) / 86400000)

  if (diff < 0)
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">Vaxtı keçib</span>
  if (diff <= 3)
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">{diff}g qalıb</span>
  return null
}

function EquipmentBar({ stats, navigate }) {
  const total = (stats.availableEquipment ?? 0) + (stats.rentedEquipment ?? 0) +
                (stats.defectiveEquipment ?? 0) + (stats.outOfServiceEquipment ?? 0)
  if (total === 0) return null

  const segments = [
    { key: 'availableEquipment', label: 'Mövcud', color: 'bg-emerald-500', textColor: 'text-emerald-700 dark:text-emerald-400' },
    { key: 'rentedEquipment', label: 'İcarədə', color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-400' },
    { key: 'defectiveEquipment', label: 'Nasaz', color: 'bg-red-400', textColor: 'text-red-600 dark:text-red-400' },
    { key: 'outOfServiceEquipment', label: 'Xidmətdən kənarda', color: 'bg-gray-400', textColor: 'text-gray-500 dark:text-gray-400' },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Truck size={14} className="text-purple-500" /> Texnika Vəziyyəti
          <span className="text-xs font-normal text-gray-400">({total} ədəd)</span>
        </h2>
        <button onClick={() => navigate('/garage')} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
          Qaraj <ArrowRight size={11} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 mb-3">
        {segments.map(({ key, color }) => {
          const pct = (stats[key] / total) * 100
          return pct > 0 ? (
            <div key={key} className={clsx(color, 'transition-all')} style={{ width: `${pct}%` }} />
          ) : null
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {segments.map(({ key, label, color, textColor }) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={clsx(color, 'w-2.5 h-2.5 rounded-full shrink-0')} />
            <span className="text-[11px] text-gray-500 dark:text-gray-400">{label}</span>
            <span className={clsx('text-[11px] font-bold ml-auto', textColor)}>{stats[key] ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const DEFAULT_WIDGETS = {
  kpis: true,
  equipment: true,
  entities: true,
  charts: true,
  projects: true,
  requests: true,
  activity: true,
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [summary, setSummary] = useState(null)
  const [requests, setRequests] = useState([])
  const [stats, setStats] = useState(null)
  const [widgets, setWidgets] = useState(() => {
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
      const res = await axiosInstance.get('/dashboard/stats')
      const data = res.data.data || res.data
      setStats(data)
      setProjects(data.projects || [])
      setSummary(data.accountingSummary || null)
      setRequests(data.requests || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const activeProjects    = projects.filter(p => p.status === 'ACTIVE')
  const pendingProjects   = projects.filter(p => p.status === 'PENDING')
  const completedProjects = projects.filter(p => p.status === 'COMPLETED')
  const pendingRequests   = requests.filter(r => ['DRAFT', 'PENDING', 'SENT_TO_COORDINATOR'].includes(r.status))
  const urgentProjects    = activeProjects.filter(p => {
    if (!p.endDate) return false
    const diff = Math.ceil((new Date(p.endDate) - new Date()) / 86400000)
    return diff <= 3
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 gap-2 text-gray-400">
        <RefreshCw size={16} className="animate-spin" />
        <span className="text-sm">Yüklənir...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dashboard header with settings */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">İdarə Paneli</h1>
          <p className="text-xs text-gray-400 mt-0.5">Sistemin ümumi vəziyyəti</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowSettings(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
          >
            <Settings size={13} />
            Paneli fərdiləşdir
          </button>
          {showSettings && (
            <div className="absolute right-0 top-9 z-50 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3">
              <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">Göstərilən bölmələr</p>
              {[
                { key: 'kpis', label: 'KPI kartları' },
                { key: 'equipment', label: 'Texnika statusu' },
                { key: 'entities', label: 'Biznes göstəriciləri' },
                { key: 'charts', label: 'Qrafiklər' },
                { key: 'projects', label: 'Aktiv layihələr' },
                { key: 'requests', label: 'Son sorğular' },
                { key: 'activity', label: 'Son fəaliyyətlər' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 py-1.5 cursor-pointer">
                  <input type="checkbox" checked={widgets[key]} onChange={() => toggleWidget(key)}
                    className="w-3.5 h-3.5 accent-amber-500 cursor-pointer" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Urgent deadline warning */}
      {urgentProjects.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {urgentProjects.length} aktiv layihənin bitmə tarixi yaxınlaşır
            </p>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {urgentProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => navigate('/projects')}
                  className="flex items-center gap-1.5 px-2 py-1 bg-red-100 dark:bg-red-900/40 rounded-lg text-xs text-red-700 dark:text-red-300 hover:bg-red-200 transition-colors"
                >
                  <span className="font-mono font-bold">{p.projectCode || `PRJ-${String(p.id).padStart(4,'0')}`}</span>
                  <span>{p.companyName}</span>
                  <DeadlineBadge endDate={p.endDate} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending approvals banner */}
      {stats?.pendingApprovals > 0 && (
        <div
          className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          onClick={() => navigate('/approval')}
        >
          <ShieldCheck size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex-1">
            {stats.pendingApprovals} əməliyyat təsdiq gözləyir
          </p>
          <ArrowRight size={14} className="text-amber-500" />
        </div>
      )}

      {/* Main stats */}
      {widgets.kpis && (
      <div>
        <SectionHeader title="Ümumi Vəziyyət" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
          <StatCard
            icon={Zap} label="Aktiv Layihə" value={stats?.activeProjects ?? activeProjects.length}
            sub={`${pendingProjects.length} gözləmədə`}
            color="bg-green-500" onClick={() => navigate('/projects')}
          />
          <StatCard
            icon={FileText} label="Aktiv Sorğular" value={stats?.activeRequests ?? pendingRequests.length}
            sub={`${requests.length} ümumi`}
            color="bg-blue-500" onClick={() => navigate('/requests')}
          />
          <StatCard
            icon={ShieldCheck} label="Gözləyən Təsdiq" value={stats?.pendingApprovals ?? '—'}
            sub="Əməliyyat növbədə"
            color="bg-amber-500" textColor={stats?.pendingApprovals > 0 ? 'text-amber-700 dark:text-amber-400' : undefined}
            onClick={() => navigate('/approval')}
          />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={CheckCircle} label="Bağlanmış Layihə" value={completedProjects.length}
            sub="Bu günə qədər"
            color="bg-gray-400" onClick={() => navigate('/projects')}
          />
          <StatCard
            icon={UserCheck} label="Aktiv İşçilər" value={stats?.totalEmployees ?? '—'}
            sub="Sistemdə qeydiyyatda"
            color="bg-teal-500" onClick={() => navigate('/roles')}
          />
          <StatCard
            icon={Trash2} label="Silinmiş Məlumatlar" value={stats?.deletedRecords ?? '—'}
            color="bg-gray-500" onClick={() => navigate('/trash')}
          />
        </div>
      </div>
      )}

      {/* Business entities */}
      {widgets.entities && stats && (
        <div>
          <SectionHeader title="İş Subyektləri" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={Building2} label="Müştərilər" value={stats.totalCustomers}
              color="bg-sky-500" onClick={() => navigate('/customers')}
            />
            <StatCard
              icon={HardHat} label="Podratçılar" value={stats.totalContractors}
              color="bg-orange-500" onClick={() => navigate('/contractors')}
            />
            <StatCard
              icon={BarChart3} label="İnvestorlar" value={stats.totalInvestors}
              color="bg-violet-500" onClick={() => navigate('/investors')}
            />
            <StatCard
              icon={Users} label="Operatorlar" value={stats.totalOperators}
              color="bg-cyan-500" onClick={() => navigate('/operators')}
            />
          </div>
        </div>
      )}

      {/* Equipment status bar */}
      {widgets.equipment && stats && <EquipmentBar stats={stats} navigate={navigate} />}

      {/* Charts section */}
      {widgets.charts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">Texnika Statusu</h3>
            <EquipmentPieChart stats={stats} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">Aylıq Gəlir (son 6 ay)</h3>
            <RevenueBarChart invoices={stats?.invoices} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">Layihə Statusu</h3>
            <ProjectStatusChart projects={projects} />
          </div>
        </div>
      )}

      {/* Finance summary */}
      {summary && (
        <div>
          <SectionHeader title="Maliyyə Xülasəsi" linkLabel="Mühasibata keç" onLink={() => navigate('/accounting')} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={TrendingUp} label="Ümumi Gəlir" value={`${fmt(summary.totalIncome)} ₼`}
              sub={`${summary.incomeCount ?? 0} qaimə`}
              color="bg-green-500" textColor="text-green-700 dark:text-green-400"
            />
            <StatCard
              icon={TrendingDown} label="Podratçı Xərcləri" value={`${fmt(summary.totalContractorExpense)} ₼`}
              sub={`${summary.contractorExpenseCount ?? 0} qaimə`}
              color="bg-orange-500" textColor="text-orange-700 dark:text-orange-400"
            />
            <StatCard
              icon={TrendingDown} label="Şirkət Xərcləri" value={`${fmt(summary.totalCompanyExpense)} ₼`}
              sub={`${summary.companyExpenseCount ?? 0} qaimə`}
              color="bg-red-500" textColor="text-red-700 dark:text-red-400"
            />
            <StatCard
              icon={Wallet} label="Xalis Mənfəət" value={`${fmt(summary.netProfit)} ₼`}
              sub="Gəlir − Bütün xərclər"
              color={summary.netProfit >= 0 ? 'bg-amber-500' : 'bg-red-600'}
              textColor={summary.netProfit >= 0 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400'}
            />
          </div>
        </div>
      )}

      {(widgets.projects || widgets.requests) && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active projects */}
        {widgets.projects && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Zap size={14} className="text-green-500" /> Aktiv Layihələr
            </h2>
            <button onClick={() => navigate('/projects')} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
              Hamısı <ArrowRight size={11} />
            </button>
          </div>
          {activeProjects.length === 0 ? (
            <p className="text-xs text-gray-400 px-4 py-5 text-center">Aktiv layihə yoxdur</p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {activeProjects.slice(0, 6).map(p => (
                <div key={p.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => navigate('/projects')}>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{p.companyName}</p>
                    <p className="text-[11px] text-gray-400 font-mono">{p.projectCode || `PRJ-${String(p.id).padStart(4,'0')}`}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.endDate && <span className="text-[10px] text-gray-400">{fmtDate(p.endDate)}</span>}
                    <DeadlineBadge endDate={p.endDate} />
                  </div>
                </div>
              ))}
              {activeProjects.length > 6 && (
                <div className="px-4 py-2 text-center">
                  <button onClick={() => navigate('/projects')} className="text-xs text-amber-600 hover:underline">
                    + {activeProjects.length - 6} daha
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* Pending requests */}
        {widgets.requests && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Clock size={14} className="text-blue-500" /> Gözləmədə Sorğular
            </h2>
            <button onClick={() => navigate('/requests')} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
              Hamısı <ArrowRight size={11} />
            </button>
          </div>
          {pendingRequests.length === 0 ? (
            <p className="text-xs text-gray-400 px-4 py-5 text-center">Gözləmədə sorğu yoxdur</p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {pendingRequests.slice(0, 6).map(r => (
                <div key={r.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => navigate('/requests')}>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{r.companyName || r.customerName || '—'}</p>
                    <p className="text-[11px] text-gray-400">{r.equipmentType || r.serviceType || '—'}</p>
                  </div>
                  <StatusPill status={r.status} />
                </div>
              ))}
              {pendingRequests.length > 6 && (
                <div className="px-4 py-2 text-center">
                  <button onClick={() => navigate('/requests')} className="text-xs text-amber-600 hover:underline">
                    + {pendingRequests.length - 6} daha
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>
      )}

      {/* Recently completed projects */}
      {widgets.activity && completedProjects.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <CheckCircle size={14} className="text-gray-400" /> Son Bağlanmış Layihələr
            </h2>
            <button onClick={() => navigate('/projects')} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
              Hamısı <ArrowRight size={11} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Layihə</th>
                  <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Şirkət</th>
                  <th className="px-4 py-2 text-right text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Xalis Gəlir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {completedProjects.slice(0, 5).map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => navigate('/projects')}>
                    <td className="px-4 py-2.5">
                      <span className="font-mono font-bold text-green-600 dark:text-green-400">
                        {p.projectCode || `PRJ-${String(p.id).padStart(4,'0')}`}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{p.companyName}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={clsx('font-bold', (p.netProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-500')}>
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

      {/* Activity Feed */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">Son Fəaliyyətlər</h2>
          <Clock size={14} className="text-gray-400" />
        </div>
        <ActivityFeed />
      </div>
    </div>
  )
}

function StatusPill({ status }) {
  const map = {
    DRAFT:                 { label: 'Qaralama',      cls: 'bg-gray-100 text-gray-600' },
    PENDING:               { label: 'Gözləmədə',     cls: 'bg-yellow-50 text-yellow-700' },
    SUBMITTED:             { label: 'Göndərildi',    cls: 'bg-blue-50 text-blue-700' },
    SENT_TO_COORDINATOR:   { label: 'Koordinatorda', cls: 'bg-purple-50 text-purple-700' },
    OFFER_SENT:            { label: 'Gözdən keçirilir', cls: 'bg-amber-50 text-amber-700' },
    ACCEPTED:              { label: 'Qəbul',          cls: 'bg-green-50 text-green-700' },
    REJECTED:              { label: 'Rədd',           cls: 'bg-red-50 text-red-700' },
  }
  const cfg = map[status] || { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0', cfg.cls)}>{cfg.label}</span>
}
