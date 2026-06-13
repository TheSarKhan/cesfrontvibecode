import { useState } from 'react'
import { X, AlertTriangle, CornerUpLeft } from 'lucide-react'
import { useEscapeKey } from '../../hooks/useEscapeKey'

/**
 * Geri qaytarma üçün məcburi səbəb modalı (reusable).
 * Səbəb boş olduqda təsdiq düyməsi deaktivdir.
 *
 * props:
 *   title        — başlıq (məs. "Koordinatora geri qaytar")
 *   message      — izah mətni (opsional)
 *   confirmLabel — təsdiq düyməsinin yazısı (default: "Geri qaytar")
 *   loading      — əməliyyat gedir
 *   onConfirm(reason) — təsdiq; trimlənmiş səbəb ötürülür
 *   onClose      — bağla/ləğv
 */
export default function ReasonPromptModal({
  title,
  message,
  confirmLabel = 'Geri qaytar',
  loading = false,
  onConfirm,
  onClose,
}) {
  useEscapeKey(onClose)
  const [reason, setReason] = useState('')
  const canSubmit = reason.trim().length > 0 && !loading

  return (
    <div className="ces-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="ces-modal" style={{ maxWidth: 460 }}>
        <div className="ces-m-head">
          <div className="ces-m-ic gold"><CornerUpLeft size={20} /></div>
          <div className="flex-1 min-w-0">
            <h3 className="truncate">{title}</h3>
            {message && <p>{message}</p>}
          </div>
          <button onClick={onClose} className="ces-modal-x" type="button" aria-label="Bağla">
            <X size={16} />
          </button>
        </div>

        <div className="ces-m-body">
          <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--ces-danger)' }}>
            <AlertTriangle size={14} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Səbəb <span style={{ color: 'var(--ces-danger)' }}>*</span></span>
          </div>
          <div className="ces-input" style={{ alignItems: 'flex-start', paddingTop: 4, paddingBottom: 4 }}>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Geri qaytarma səbəbini yazın..."
              rows={3}
              autoFocus
            />
          </div>
        </div>

        <div className="ces-m-foot">
          <button type="button" onClick={onClose} disabled={loading} className="ces-btn ces-btn-ghost">
            Ləğv et
          </button>
          <button
            type="button"
            onClick={() => canSubmit && onConfirm(reason.trim())}
            disabled={!canSubmit}
            className="ces-btn ces-btn-danger"
          >
            <CornerUpLeft size={14} />
            {loading ? 'Göndərilir...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
