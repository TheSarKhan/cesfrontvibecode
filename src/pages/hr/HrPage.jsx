import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Calculator, Calendar, ClipboardList,
  Briefcase, Settings, TrendingUp, ArrowRight,
} from 'lucide-react'
import { hrApi } from '../../api/hr'
import { PageHeader, Pill } from './_shared'
import { fmtMoney } from './_constants'

const CARDS = [
  { id: 'employees',  title: 'İşçilər',           description: 'İşçilərin idarə edilməsi, məlumatları, statusu',                  icon: Users,        path: '/hr/employees',   tone: 'gold' },
  { id: 'payroll',    title: 'Əməkhaqqı Cədvəli', description: 'Aylıq əməkhaqqı, vergi və sığorta hesablamaları',                  icon: Calculator,   path: '/hr/payroll',     tone: 'ok' },
  { id: 'attendance', title: 'Davamiyyət',        description: 'İş günü, məzuniyyət və davamiyyətin izlənməsi',                    icon: Calendar,     path: '/hr/attendance',  tone: 'info' },
  { id: 'leaves',     title: 'Məzuniyyət',        description: 'Məzuniyyət tələbləri və təsdiq prosesi',                            icon: ClipboardList, path: '/hr/leaves',     tone: 'danger' },
  { id: 'positions',  title: 'Vəzifələr',         description: 'Vəzifə kataloqu və default əməkhaqqılar',                          icon: Briefcase,    path: '/hr/positions',   tone: 'muted' },
  { id: 'tax-config', title: 'Vergi Tarifləri',   description: 'İllik vergi və sığorta faizlərinin konfiqurasiyası',               icon: Settings,     path: '/hr/tax-config',  tone: 'warn' },
]

const TONE_TO_BG = {
  gold:   { bg: 'var(--ces-gold-100)',     color: 'var(--ces-gold-700)' },
  ok:     { bg: 'var(--ces-ok-100)',                 color: 'var(--ces-ok)' },
  info:   { bg: 'var(--ces-info-100)',                 color: 'var(--ces-info)' },
  danger: { bg: 'var(--ces-danger-100)',                 color: 'var(--ces-danger)' },
  warn:   { bg: 'var(--ces-warn-100)',                 color: 'var(--ces-warn)' },
  muted:  { bg: 'var(--ces-graphite-50)',  color: 'var(--ces-graphite)' },
}

export default function HrPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    hrApi.getDashboard().then(r => setStats(r.data?.data ?? r.data)).catch(() => {})
  }, [])

  const statCards = stats ? [
    { label: 'Cəmi işçi',         value: stats.totalEmployees,        icon: Users,         tone: 'gold' },
    { label: 'Aktiv',             value: stats.activeEmployees,       icon: TrendingUp,    tone: 'ok' },
    { label: 'Məzuniyyətdə',      value: stats.onLeaveEmployees,      icon: Calendar,      tone: 'info' },
    { label: 'Gözləyən tələblər', value: stats.pendingLeaveRequests,  icon: ClipboardList, tone: 'danger' },
  ] : []

  return (
    <div style={{ color: 'var(--ces-ink)' }}>
      <PageHeader
        eyebrow="İnsan Resursları"
        title="HR Modulları"
        subtitle="İşçilər, əməkhaqqı, davamiyyət və vergi konfiqurasiyası"
      />

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {statCards.map((s) => {
            const t = TONE_TO_BG[s.tone]
            const Icon = s.icon
            return (
              <div
                key={s.label}
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
                  style={{ background: t.bg, color: t.color }}
                >
                  {Icon && <Icon size={18} />}
                </span>
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[.14em]" style={{ color: 'var(--ces-muted)' }}>
                    {s.label}
                  </p>
                  <p className="text-[22px] font-extrabold tracking-[-.02em] leading-none num mt-1" style={{ color: 'var(--ces-graphite-900)' }}>
                    {s.value ?? 0}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Current month payroll banner */}
      {stats && stats.currentMonthEntryCount > 0 && (
        <div
          className="flex overflow-hidden mb-6"
          style={{
            background: 'var(--ces-surface)',
            border: '1px solid var(--ces-line)',
            borderRadius: 'var(--ces-radius-lg)',
            boxShadow: 'var(--ces-shadow-sm)',
          }}
        >
          <div style={{ width: '6px', background: 'var(--ces-gold)' }} />
          <div className="flex-1 p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[.16em] mb-1" style={{ color: 'var(--ces-gold)' }}>
                  Bu ay
                </p>
                <p className="text-[18px] font-extrabold leading-tight" style={{ color: 'var(--ces-graphite-900)' }}>
                  {stats.currentMonthLabel}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Pill tone="info" sm>{stats.currentMonthStatus}</Pill>
                  <span className="text-[12px]" style={{ color: 'var(--ces-muted)' }}>
                    <span className="num font-semibold" style={{ color: 'var(--ces-ink)' }}>{stats.currentMonthEntryCount}</span> işçi
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigate(`/hr/payroll/${stats.currentMonthPeriodId}`)}
                className="ces-btn ces-btn-primary"
              >
                Cədvələ keç <ArrowRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--ces-line)' }}>
              <BannerStat label="Gross"        value={fmtMoney(stats.currentMonthGross)}       color="var(--ces-graphite-900)" />
              <BannerStat label="Ödəniləcək"   value={fmtMoney(stats.currentMonthNet)}         color="var(--ces-ok)" />
              <BannerStat label="Şirkət xərci" value={fmtMoney(stats.currentMonthCompanyCost)} color="var(--ces-info)" />
            </div>
          </div>
        </div>
      )}

      {/* Module cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((card) => {
          const t = TONE_TO_BG[card.tone]
          const Icon = card.icon
          return (
            <button
              key={card.id}
              onClick={() => navigate(card.path)}
              className="group relative text-left transition-all"
              style={{
                background: 'var(--ces-surface)',
                border: '1px solid var(--ces-line)',
                borderRadius: 'var(--ces-radius-lg)',
                padding: '24px',
                boxShadow: 'var(--ces-shadow-sm)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--ces-graphite)'
                e.currentTarget.style.boxShadow = 'var(--ces-shadow)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--ces-line)'
                e.currentTarget.style.boxShadow = 'var(--ces-shadow-sm)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div
                className="w-12 h-12 rounded-[12px] grid place-items-center mb-4 transition-transform group-hover:scale-110"
                style={{ background: t.bg, color: t.color }}
              >
                {Icon && <Icon size={22} />}
              </div>
              <h3 className="text-[16px] font-extrabold mb-1" style={{ color: 'var(--ces-graphite-900)' }}>
                {card.title}
              </h3>
              <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--ces-muted)' }}>
                {card.description}
              </p>
              <ArrowRight
                size={14}
                className="absolute top-6 right-6 transition-transform group-hover:translate-x-0.5"
                style={{ color: 'var(--ces-mute2)' }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BannerStat({ label, value, color }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: 'var(--ces-muted)' }}>{label}</p>
      <p className="text-[18px] font-extrabold num mt-1" style={{ color }}>{value}</p>
    </div>
  )
}
