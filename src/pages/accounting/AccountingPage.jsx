import { useNavigate } from 'react-router-dom'
import { Receipt, BarChart3, Users } from 'lucide-react'

const CARDS = [
  {
    id: 'invoices',
    title: 'Qaimələr',
    description: 'E-qaimələrin idarə edilməsi, təsdiqlənməsi və izlənməsi',
    icon: Receipt,
    color: 'amber',
    path: '/accounting/invoices',
  },
  {
    id: 'reports',
    title: 'Hesabat',
    description: 'Maliyyə analitikası, statistikalar və hesabatlar',
    icon: BarChart3,
    color: 'indigo',
    path: '/accounting/reports',
  },
  {
    id: 'debit-credit',
    title: 'Debitor / Kreditor',
    description: 'Debitor və kreditor borclarının izlənməsi',
    icon: Users,
    color: 'emerald',
    path: '/accounting/debit-credit',
    disabled: false,
  },
]

const COLOR_MAP = {
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    hover: 'hover:border-amber-400 hover:shadow-lg hover:shadow-amber-100/50',
    icon: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    title: 'text-amber-900 dark:text-amber-200',
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    border: 'border-indigo-200 dark:border-indigo-800',
    hover: 'hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100/50',
    icon: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
    title: 'text-indigo-900 dark:text-indigo-200',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    hover: 'hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-100/50',
    icon: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
    title: 'text-emerald-900 dark:text-emerald-200',
  },
}

export default function AccountingPage() {
  const navigate = useNavigate()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Mühasibatlıq</h1>
        <p className="text-sm text-gray-400 mt-1">Maliyyə əməliyyatlarının idarə edilməsi</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {CARDS.map(card => {
          const c = COLOR_MAP[card.color]
          const Icon = card.icon
          return (
            <button
              key={card.id}
              onClick={() => card.path && navigate(card.path)}
              disabled={card.disabled}
              className={`
                relative text-left rounded-2xl border p-6 transition-all duration-200
                ${c.bg} ${c.border}
                ${card.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : `cursor-pointer ${c.hover}`
                }
              `}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${c.icon}`}>
                <Icon size={22} />
              </div>
              <h3 className={`text-sm font-bold mb-1 ${c.title}`}>{card.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{card.description}</p>
              {card.disabled && (
                <span className="absolute top-3 right-3 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                  Tezliklə
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
