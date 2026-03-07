import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderOpen, Clock, CheckCircle, Zap,
  TrendingUp, TrendingDown, Wallet,
  Truck, Users, FileText, AlertTriangle,
  ArrowRight, RefreshCw,
} from 'lucide-react'
import { projectsApi } from '../api/projects'
import { accountingApi } from '../api/accounting'
import { requestsApi } from '../api/requests'
import { garageApi } from '../api/garage'
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

export default function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [summary, setSummary] = useState(null)
  const [requests, setRequests] = useState([])
  const [equipment, setEquipment] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const [projRes, sumRes, reqRes, garRes] = await Promise.allSettled([
        projectsApi.getAll(),
        accountingApi.getSummary(),
        requestsApi.getAll(),
        garageApi.getAll(),
      ])
      if (projRes.status === 'fulfilled') setProjects(projRes.value.data.data || projRes.value.data || [])
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data.data || sumRes.value.data)
      if (reqRes.status === 'fulfilled') setRequests(reqRes.value.data.data || reqRes.value.data || [])
      if (garRes.status === 'fulfilled') setEquipment(garRes.value.data.data || garRes.value.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const activeProjects   = projects.filter(p => p.status === 'ACTIVE')
  const pendingProjects  = projects.filter(p => p.status === 'PENDING')
  const completedProjects = projects.filter(p => p.status === 'COMPLETED')
  const pendingRequests  = requests.filter(r => ['DRAFT', 'SUBMITTED', 'SENT_TO_COORDINATOR'].includes(r.status))
  const urgentProjects   = activeProjects.filter(p => {
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
      {/* Xəbərdarlıq banneri */}
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

      {/* Əsas statistika */}
      <div>
        <SectionHeader title="Ümumi Vəziyyət" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Zap} label="Aktiv Layihə" value={activeProjects.length}
            sub={`${pendingProjects.length} gözləmədə`}
            color="bg-green-500" onClick={() => navigate('/projects')}
          />
          <StatCard
            icon={CheckCircle} label="Bağlanmış" value={completedProjects.length}
            sub="Bu günə qədər"
            color="bg-gray-400" onClick={() => navigate('/projects')}
          />
          <StatCard
            icon={FileText} label="Aktiv Sorğular" value={pendingRequests.length}
            sub={`${requests.length} ümumi`}
            color="bg-blue-500" onClick={() => navigate('/requests')}
          />
          <StatCard
            icon={Truck} label="Texnika" value={equipment.length}
            sub="Qarajda qeydiyyatda"
            color="bg-purple-500" onClick={() => navigate('/garage')}
          />
        </div>
      </div>

      {/* Maliyyə statistikası */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Aktiv layihələr */}
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

        {/* Gözləmədə sorğular */}
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
      </div>

      {/* Son bağlanmış layihələr */}
      {completedProjects.length > 0 && (
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
    </div>
  )
}

function StatusPill({ status }) {
  const map = {
    DRAFT:                 { label: 'Qaralama',     cls: 'bg-gray-100 text-gray-600' },
    SUBMITTED:             { label: 'Göndərildi',   cls: 'bg-blue-50 text-blue-700' },
    SENT_TO_COORDINATOR:   { label: 'Koordinatorda', cls: 'bg-purple-50 text-purple-700' },
    OFFER_SENT:            { label: 'Təklif',        cls: 'bg-amber-50 text-amber-700' },
    ACCEPTED:              { label: 'Qəbul',         cls: 'bg-green-50 text-green-700' },
    REJECTED:              { label: 'Rədd',          cls: 'bg-red-50 text-red-700' },
  }
  const cfg = map[status] || { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0', cfg.cls)}>{cfg.label}</span>
}
