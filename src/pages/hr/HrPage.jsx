import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Calculator, Calendar, ClipboardList,
  Briefcase, Settings, TrendingUp, FileText,
} from 'lucide-react'
import { hrApi } from '../../api/hr'

const CARDS = [
  {
    id: 'employees',
    title: 'İşçilər',
    description: 'İşçilərin idarə edilməsi, məlumatları, statusu',
    icon: Users,
    color: 'amber',
    path: '/hr/employees',
  },
  {
    id: 'payroll',
    title: 'Əməkhaqqı Cədvəli',
    description: 'Aylıq əməkhaqqı, vergi və sığorta hesablamaları',
    icon: Calculator,
    color: 'emerald',
    path: '/hr/payroll',
  },
  {
    id: 'attendance',
    title: 'Davamiyyət',
    description: 'İş günü, məzuniyyət və davamiyyətin izlənməsi',
    icon: Calendar,
    color: 'indigo',
    path: '/hr/attendance',
  },
  {
    id: 'leaves',
    title: 'Məzuniyyət',
    description: 'Məzuniyyət tələbləri və təsdiq prosesi',
    icon: ClipboardList,
    color: 'rose',
    path: '/hr/leaves',
  },
  {
    id: 'positions',
    title: 'Vəzifələr',
    description: 'Vəzifə kataloqu və default əməkhaqqılar',
    icon: Briefcase,
    color: 'sky',
    path: '/hr/positions',
  },
  {
    id: 'tax-config',
    title: 'Vergi Tarifləri',
    description: 'İllik vergi və sığorta faizlərinin konfiqurasiyası',
    icon: Settings,
    color: 'violet',
    path: '/hr/tax-config',
  },
]

const COLOR_MAP = {
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', hover: 'hover:border-amber-400 hover:shadow-lg hover:shadow-amber-100/50', icon: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400', title: 'text-amber-900 dark:text-amber-200' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', hover: 'hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-100/50', icon: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400', title: 'text-emerald-900 dark:text-emerald-200' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800', hover: 'hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100/50', icon: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400', title: 'text-indigo-900 dark:text-indigo-200' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800', hover: 'hover:border-rose-400 hover:shadow-lg hover:shadow-rose-100/50', icon: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400', title: 'text-rose-900 dark:text-rose-200' },
  sky: { bg: 'bg-sky-50 dark:bg-sky-900/20', border: 'border-sky-200 dark:border-sky-800', hover: 'hover:border-sky-400 hover:shadow-lg hover:shadow-sky-100/50', icon: 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400', title: 'text-sky-900 dark:text-sky-200' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800', hover: 'hover:border-violet-400 hover:shadow-lg hover:shadow-violet-100/50', icon: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400', title: 'text-violet-900 dark:text-violet-200' },
}

const fmt = (n) => Number(n ?? 0).toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function HrPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    hrApi.getDashboard().then(r => setStats(r.data?.data ?? r.data)).catch(() => {})
  }, [])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">İnsan Resursları</h1>
        <p className="text-sm text-gray-400 mt-1">İşçilər, əməkhaqqı və davamiyyətin idarə edilməsi</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Stat label="Cəmi işçi" value={stats.totalEmployees} icon={Users} accent="text-amber-600" />
          <Stat label="Aktiv" value={stats.activeEmployees} icon={TrendingUp} accent="text-emerald-600" />
          <Stat label="Məzuniyyətdə" value={stats.onLeaveEmployees} icon={Calendar} accent="text-indigo-600" />
          <Stat label="Gözləyən tələblər" value={stats.pendingLeaveRequests} icon={ClipboardList} accent="text-rose-600" />
        </div>
      )}

      {stats && stats.currentMonthEntryCount > 0 && (
        <div className="mb-8 rounded-2xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 font-bold">Bu ay</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100 mt-1">{stats.currentMonthLabel}</p>
              <p className="text-xs text-gray-500 mt-1">Status: {stats.currentMonthStatus} — {stats.currentMonthEntryCount} işçi</p>
            </div>
            <button
              onClick={() => navigate(`/hr/payroll/${stats.currentMonthPeriodId}`)}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium"
            >
              Cədvələ keç →
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Gross</p>
              <p className="text-base font-bold text-gray-800 dark:text-gray-100">{fmt(stats.currentMonthGross)} ₼</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Ödəniləcək</p>
              <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">{fmt(stats.currentMonthNet)} ₼</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Şirkət xərci</p>
              <p className="text-base font-bold text-rose-700 dark:text-rose-400">{fmt(stats.currentMonthCompanyCost)} ₼</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {CARDS.map(card => {
          const c = COLOR_MAP[card.color]
          const Icon = card.icon
          return (
            <button
              key={card.id}
              onClick={() => navigate(card.path)}
              className={`relative text-left rounded-2xl border p-6 transition-all duration-200 cursor-pointer ${c.bg} ${c.border} ${c.hover}`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${c.icon}`}>
                <Icon size={22} />
              </div>
              <h3 className={`text-sm font-bold mb-1 ${c.title}`}>{card.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{card.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value, icon: Icon, accent }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <Icon size={16} className={accent} />
      </div>
      <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value ?? 0}</p>
    </div>
  )
}
