import { Wrench, Eye } from 'lucide-react'
import { clsx } from 'clsx'

/**
 * Texnika kartı — qarajdan gəlmiş equipment obyektini card formasında göstərir.
 * `onShowDetails` veriləndə "Haqqında" düyməsi görünür.
 */
export default function EquipmentCard({ eq, selected, onSelect, onShowDetails, disabled }) {
  const statusCfg = {
    AVAILABLE:      { label: 'Mövcud',   cls: 'bg-green-100 text-green-700' },
    IN_USE:         { label: 'İcarədə',  cls: 'bg-amber-100 text-amber-700' },
    RENTED:         { label: 'İcarədə',  cls: 'bg-amber-100 text-amber-700' },
    UNDER_REPAIR:   { label: 'Təmirdə',  cls: 'bg-red-100 text-red-700' },
    DECOMMISSIONED: { label: 'Xaric',    cls: 'bg-gray-100 text-gray-600' },
  }
  const stat = statusCfg[eq.status] || { label: eq.status, cls: 'bg-gray-100 text-gray-600' }

  const cardStyle = selected
    ? { background: 'var(--ces-gold-50)', borderColor: 'var(--ces-gold)', boxShadow: '0 0 0 2px var(--ces-gold) inset' }
    : { background: 'var(--ces-surface)', borderColor: 'var(--ces-line)' }

  return (
    <div
      className={clsx(
        'rounded-xl border p-2.5 transition-all relative',
        !disabled && !selected && 'hover:border-amber-300 hover:shadow-sm cursor-pointer',
        selected && 'cursor-pointer'
      )}
      style={cardStyle}
      onClick={() => !disabled && onSelect && onSelect()}
    >
      {selected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 grid place-items-center rounded-full" style={{ background: 'var(--ces-gold)', color: 'var(--ces-on-gold)' }}>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      <div className="flex items-start gap-2 mb-2 pr-6">
        <div className={clsx(
          'w-9 h-9 grid place-items-center rounded-lg shrink-0',
          selected ? 'bg-amber-200 text-amber-800' : 'bg-gray-100 text-gray-500'
        )}>
          <Wrench size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[12.5px] truncate leading-tight" style={{ color: 'var(--ces-ink)' }}>
            {eq.name}
          </div>
          <div className="text-[10px] mono mt-0.5" style={{ color: 'var(--ces-gold-700)' }}>
            {eq.equipmentCode}
          </div>
        </div>
      </div>

      <div className="space-y-0.5 text-[11px] leading-snug mb-2" style={{ color: 'var(--ces-muted)' }}>
        {eq.type && (
          <div className="truncate">
            <span style={{ color: 'var(--ces-mute2)' }}>Növ:</span>{' '}
            <span style={{ color: 'var(--ces-ink)' }}>{eq.type}</span>
          </div>
        )}
        {(eq.brand || eq.model) && (
          <div className="truncate">
            <span style={{ color: 'var(--ces-mute2)' }}>Marka:</span>{' '}
            <span style={{ color: 'var(--ces-ink)' }}>{[eq.brand, eq.model].filter(Boolean).join(' ')}</span>
          </div>
        )}
        {eq.manufactureYear && (
          <div>
            <span style={{ color: 'var(--ces-mute2)' }}>İl:</span>{' '}
            <span style={{ color: 'var(--ces-ink)' }}>{eq.manufactureYear}</span>
            {eq.weightTon && <span style={{ color: 'var(--ces-mute2)' }}> · {eq.weightTon} ton</span>}
          </div>
        )}
        {eq.plateNumber && (
          <div className="truncate">
            <span style={{ color: 'var(--ces-mute2)' }}>Q.N:</span>{' '}
            <span className="mono" style={{ color: 'var(--ces-ink)' }}>{eq.plateNumber}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-2" style={{ borderTop: '1px solid var(--ces-line)' }}>
        <span className={clsx('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider', stat.cls)}>
          {stat.label}
        </span>
        {onShowDetails && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onShowDetails() }}
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md transition-colors hover:bg-amber-100"
            style={{ color: 'var(--ces-gold-700)' }}
          >
            <Eye size={10} /> Haqqında
          </button>
        )}
      </div>
    </div>
  )
}
