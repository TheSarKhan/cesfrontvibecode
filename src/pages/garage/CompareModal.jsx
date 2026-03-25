import { X } from 'lucide-react'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { STATUS_CFG, OWN_LABEL, fmtMoney, fmtDate, dash } from '../../constants/garage'

const ROWS = [
  { label: 'Kod', fn: e => e.equipmentCode },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Texnika müqayisəsi</h2>
            <p className="text-[11px] text-gray-400">{items.length} texnika seçildi</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors">
            <X size={14} className="text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 py-3 px-4 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-36">Parametr</th>
                {items.map(item => (
                  <th key={item.id} className="py-3 px-4 text-left">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{item.name}</p>
                    <p className="text-[10px] font-mono text-gray-400">{item.equipmentCode}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, ri) => {
                const best = getBest(row, items)
                return (
                  <tr key={ri} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 py-2.5 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{row.label}</td>
                    {items.map((item, ci) => (
                      <td key={item.id} className={clsx('py-2.5 px-4', best && best[ci] && 'bg-emerald-50/50 dark:bg-emerald-900/10')}>
                        {row.status ? (
                          <span className={clsx('px-2 py-0.5 rounded text-[9px] font-semibold border', (STATUS_CFG[item.status] || STATUS_CFG.AVAILABLE).cls)}>
                            {(STATUS_CFG[item.status] || STATUS_CFG.AVAILABLE).label}
                          </span>
                        ) : (
                          <span className={clsx('text-xs text-gray-700 dark:text-gray-200', best && best[ci] && 'font-bold text-emerald-700 dark:text-emerald-400')}>
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
      </div>
    </div>
  )
}
