import { useNavigate } from 'react-router-dom'
import { Receipt, BarChart3, TrendingDown, TrendingUp, Wrench, ArrowRight, FileCheck } from 'lucide-react'
import { PageHeader, Pill } from './_shared'
import { PILL_STYLES } from './_constants'

const CARDS = [
  { id: 'document-checks',    title: 'Sənəd Yoxlanışı',             description: 'Müqavilə və qiymət razılaşma protokolunun yüklənməsi və təsdiqi', icon: FileCheck,    path: '/accounting/document-checks', tone: 'info' },
  { id: 'invoices',           title: 'Qaimələr',                    description: 'E-qaimələrin idarə edilməsi, təsdiqlənməsi və izlənməsi', icon: Receipt,      path: '/accounting/invoices',  tone: 'gold' },
  { id: 'reports',            title: 'Hesabat',                     description: 'Maliyyə analitikası, statistikalar və hesabatlar',         icon: BarChart3,    path: '/accounting/reports',   tone: 'info' },
  { id: 'debitor',            title: 'Debitor',                     description: 'Müştəri borclarının izlənməsi və ödəniş təqibi',           icon: TrendingDown, path: '/accounting/debitor',   tone: 'ok' },
  { id: 'kreditor',           title: 'Kreditor',                    description: 'Podratçı və investor ödənişlərinin izlənməsi',             icon: TrendingUp,   path: '/accounting/kreditor',  tone: 'danger' },
  { id: 'service-accounting', title: 'Texniki Servis Mühasibatı',   description: 'Texniki servis və baxış xərclərinin mühasibat uçotu',      icon: Wrench,       path: null,                    tone: 'warn', disabled: true },
]

export default function AccountingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ color: 'var(--ces-ink)' }}>
      <PageHeader
        eyebrow="Maliyyə"
        title="Mühasibatlıq"
        subtitle="Maliyyə əməliyyatlarının idarə edilməsi"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map((card) => {
          const t = PILL_STYLES[card.tone] || PILL_STYLES.muted
          const Icon = card.icon
          return (
            <button
              key={card.id}
              onClick={() => card.path && navigate(card.path)}
              disabled={card.disabled}
              className="group relative text-left transition-all"
              style={{
                background: 'var(--ces-surface)',
                border: '1px solid var(--ces-line)',
                borderRadius: 'var(--ces-radius-lg)',
                padding: '24px',
                boxShadow: 'var(--ces-shadow-sm)',
                cursor: card.disabled ? 'not-allowed' : 'pointer',
                opacity: card.disabled ? 0.55 : 1,
              }}
              onMouseEnter={(e) => {
                if (card.disabled) return
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
              {card.disabled ? (
                <span className="absolute top-5 right-5">
                  <Pill tone="muted" sm>Tezliklə</Pill>
                </span>
              ) : (
                <ArrowRight
                  size={14}
                  className="absolute top-6 right-6 transition-transform group-hover:translate-x-0.5"
                  style={{ color: 'var(--ces-mute2)' }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
