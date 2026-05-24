import { useState } from 'react'
import { X, ClipboardList } from 'lucide-react'
import { clsx } from 'clsx'

const STATUS_TABS = [
  { value: '', label: 'Hamısı' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Aktiv' },
  { value: 'COMPLETED', label: 'Tamamlanmış' },
]

export default function OrdersPopup({ customer, onClose }) {
  const [tab, setTab] = useState('')

  return (
    <div className="ces-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="ces-modal" style={{ maxWidth: 560 }}>
        <div className="ces-m-head">
          <div className="ces-m-ic gold"><ClipboardList size={20} /></div>
          <div className="flex-1 min-w-0">
            <h3>Sifarişlər</h3>
            <p className="truncate">{customer.companyName}</p>
          </div>
          <button onClick={onClose} className="ces-modal-x" type="button" aria-label="Bağla">
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '18px 26px 0' }}>
          <div className="ces-seg">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={clsx(tab === t.value && 'on')}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="py-14 flex flex-col items-center gap-3 text-center" style={{ padding: '56px 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--ces-graphite-50)', display: 'grid', placeItems: 'center' }}>
            <ClipboardList size={24} style={{ color: 'var(--ces-mute2)' }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ces-ink)' }}>Sorğu tapılmadı</p>
          <p style={{ fontSize: 13, color: 'var(--ces-muted)', maxWidth: 320, lineHeight: 1.5 }}>
            Sorğular modulu qurulduqdan sonra bu müştəriyə aid aktiv layihələr və sifarişlər burada görünəcək.
          </p>
        </div>
      </div>
    </div>
  )
}
