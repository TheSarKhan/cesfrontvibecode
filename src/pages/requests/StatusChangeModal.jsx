import { useState } from 'react'
import { X, ArrowRight, GitBranch } from 'lucide-react'
import { requestsApi } from '../../api/requests'
import { STATUS_CFG, ALLOWED_TRANSITIONS } from '../../constants/requests'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

export default function StatusChangeModal({ request, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [selected, setSelected] = useState(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const currentStatus = request.status
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || []
  const current = STATUS_CFG[currentStatus] || STATUS_CFG.DRAFT
  const code = request.requestCode || `REQ-${String(request.id).padStart(4, '0')}`

  const handleSubmit = async () => {
    if (!selected) return toast.error('Yeni status seçin')
    setLoading(true)
    try {
      await requestsApi.changeStatus(request.id, { status: selected, reason: reason.trim() || null })
      toast.success('Status dəyişdirildi')
      onSaved()
    } catch {
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ces-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ces-modal" style={{ maxWidth: 480 }}>
        <div className="ces-m-head">
          <div className="ces-m-ic gold">
            <GitBranch size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3>Status dəyiş</h3>
            <p className="mono">{code}</p>
          </div>
          <button onClick={onClose} className="ces-modal-x" type="button" aria-label="Bağla">
            <X size={16} />
          </button>
        </div>

        <div className="ces-m-body">
          {/* Current status */}
          <div className="ces-field">
            <label>Hazırkı status</label>
            <span className={clsx('ces-pill', current.pill)}>
              <span className="d"></span>
              {current.label}
            </span>
          </div>

          {/* Transition options */}
          {allowed.length === 0 ? (
            <div className="ces-alert" style={{ marginTop: 8 }}>
              <span style={{ fontSize: 13.5, color: 'var(--ces-muted)' }}>
                Bu statusdan keçid mümkün deyil
              </span>
            </div>
          ) : (
            <>
              <p className="ces-sec-label" style={{ marginTop: 16, marginBottom: 10 }}>Yeni status seçin</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allowed.map((s) => {
                  const cfg = STATUS_CFG[s]
                  const active = selected === s
                  return (
                    <button
                      key={s}
                      onClick={() => setSelected(s)}
                      type="button"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px', borderRadius: 12,
                        border: `1.5px solid ${active ? 'var(--ces-gold)' : 'var(--ces-line)'}`,
                        background: active ? 'var(--ces-gold-50)' : 'var(--ces-surface)',
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'background .15s, border-color .15s',
                      }}
                    >
                      <ArrowRight size={15} style={{ color: active ? 'var(--ces-gold-700)' : 'var(--ces-mute2)', flex: 'none' }} />
                      <span className={clsx('ces-pill sm', cfg.pill)}>
                        <span className="d"></span>
                        {cfg.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="ces-field" style={{ marginTop: 16, marginBottom: 0 }}>
                <label>Səbəb <span style={{ color: 'var(--ces-mute2)', fontWeight: 500 }}>(ixtiyari)</span></label>
                <div className="ces-input" style={{ alignItems: 'flex-start', paddingTop: 4, paddingBottom: 4 }}>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Status dəyişmə səbəbi..."
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="ces-m-foot">
          <button type="button" onClick={onClose} className="ces-btn ces-btn-ghost">
            Ləğv et
          </button>
          {allowed.length > 0 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selected || loading}
              className="ces-btn ces-btn-primary"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Təsdiqlə
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
