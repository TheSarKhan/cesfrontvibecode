import { X, Scale } from 'lucide-react'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { STATUS_CFG, OWN_LABEL, fmtMoney, fmtDate, dash } from '../../constants/garage'

const ROWS = [
  { label: 'Kod', fn: e => e.equipmentCode, mono: true },
  { label: 'Növ', fn: e => e.type },
  { label: 'Brend', fn: e => e.brand },
  { label: 'Model', fn: e => e.model },
  { label: 'İstehsal ili', fn: e => e.manufactureYear, compare: 'max' },
  { label: 'Alış qiyməti', fn: e => e.purchasePrice != null ? fmtMoney(e.purchasePrice) : '—', raw: e => Number(e.purchasePrice) || 0, compare: 'min' },
  { label: 'Bazar dəyəri', fn: e => e.currentMarketValue != null ? fmtMoney(e.currentMarketValue) : '—', raw: e => Number(e.currentMarketValue) || 0, compare: 'max' },
  { label: 'Moto saatlar', fn: e => e.motoHours != null ? `${Number(e.motoHours).toLocaleString()} s` : '—', raw: e => Number(e.motoHours) || 0 },
  { label: 'Saat / KM', fn: e => dash(e.hourKmCounter) },
  { label: 'Amortizasiya', fn: e => e.depreciationRate != null ? `${e.depreciationRate}%` : '—' },
  { label: 'Status', fn: e => null, status: true },
  { label: 'Mülkiyyət', fn: e => OWN_LABEL[e.ownershipType] || '—' },
  { label: 'Saxlanma yeri', fn: e => dash(e.storageLocation) },
  { label: 'Son baxış', fn: e => fmtDate(e.lastInspectionDate) },
  { label: 'Növbəti baxış', fn: e => fmtDate(e.nextInspectionDate) },
]

function getBest(row, items) {
  if (!row.raw || !row.compare) return null
  const vals = items.map(e => row.raw(e))
  const best = row.compare === 'max' ? Math.max(...vals) : Math.min(...vals)
  if (vals.every(v => v === vals[0])) return null
  return vals.map(v => v === best)
}

export default function CompareModal({ items, onClose }) {
  useEscapeKey(onClose)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(58,58,58,0.45)] backdrop-blur-sm ces-font">
      <div className="bg-[var(--ces-surface)] rounded-[18px] shadow-[0_24px_48px_-20px_rgba(58,58,58,0.28),0_6px_14px_rgba(58,58,58,0.08)] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3.5 px-6 pt-6 pb-5 border-b border-[var(--ces-line)] shrink-0">
          <div className="w-11 h-11 rounded-[12px] grid place-items-center bg-[var(--ces-gold-100)] text-[var(--ces-gold-700)] shrink-0">
            <Scale size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-[var(--ces-ink)] leading-tight">Texnika müqayisəsi</h2>
            <p className="text-[13px] text-[var(--ces-muted)] mt-1">
              <span className="font-semibold text-[var(--ces-ink)]">{items.length}</span> texnika seçildi · ən yaxşı dəyərlər ok rənglə vurğulanır
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[8px] grid place-items-center text-[var(--ces-muted)] hover:bg-[var(--ces-graphite-50)] hover:text-[var(--ces-graphite)] transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 bg-white py-3.5 px-4 text-left text-[11.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.1em] w-44 border-b border-[var(--ces-line)]">
                  Parametr
                </th>
                {items.map(item => (
                  <th key={item.id} className="sticky top-0 z-10 bg-white py-3.5 px-4 text-left border-b border-[var(--ces-line)] min-w-[200px]">
                    <p className="text-sm font-bold text-[var(--ces-ink)] truncate">{item.name}</p>
                    <p className="text-[11px] font-mono text-[var(--ces-muted)] mt-0.5">{item.equipmentCode}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, ri) => {
                const best = getBest(row, items)
                return (
                  <tr key={ri} className="border-b border-[var(--ces-line-2)] hover:bg-[var(--ces-graphite-50)] transition-colors">
                    <td className="sticky left-0 z-10 bg-white py-3 px-4 text-[11.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.1em]">
                      {row.label}
                    </td>
                    {items.map((item, ci) => (
                      <td
                        key={item.id}
                        className={clsx(
                          'py-3 px-4',
                          best && best[ci] && 'bg-[var(--ces-ok-100)]/60'
                        )}
                      >
                        {row.status ? (
                          <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold', (STATUS_CFG[item.status] || STATUS_CFG.AVAILABLE).cls)}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {(STATUS_CFG[item.status] || STATUS_CFG.AVAILABLE).label}
                          </span>
                        ) : (
                          <span className={clsx(
                            'text-[13px]',
                            row.mono && 'font-mono tabular-nums',
                            best && best[ci]
                              ? 'font-extrabold text-[var(--ces-ok)]'
                              : 'font-medium text-[var(--ces-ink)]'
                          )}>
                            {row.fn(item)}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-6 py-4 border-t border-[var(--ces-line)] bg-[var(--ces-graphite-50)] justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-[10px] text-sm font-semibold text-[var(--ces-graphite)] bg-white border border-[var(--ces-line)] hover:border-[var(--ces-graphite)] transition-colors"
          >
            Bağla
          </button>
        </div>
      </div>
    </div>
  )
}
