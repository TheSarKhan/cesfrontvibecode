import { useState } from 'react'
import { X, CheckCircle, AlertCircle } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import toast from 'react-hot-toast'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useEscapeKey } from '../../hooks/useEscapeKey'

export default function ProjectCompleteModal({ project, onClose, onSaved }) {
  useEscapeKey(onClose)
  const { confirm, ConfirmDialog } = useConfirm()
  const [form, setForm] = useState({
    evacuationCost: '',
    scheduledHours: '',
    actualHours: '',
  })
  const [saving, setSaving] = useState(false)

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }))

  const handleSubmit = async () => {
    if (!form.evacuationCost || parseFloat(form.evacuationCost) < 0) {
      toast.error('Evakuator xərcini daxil edin')
      return
    }
    if (!form.scheduledHours || parseFloat(form.scheduledHours) <= 0) {
      toast.error('Planlaşdırılan iş saatını daxil edin')
      return
    }
    if (!form.actualHours || parseFloat(form.actualHours) <= 0) {
      toast.error('Faktiki iş saatını daxil edin')
      return
    }

    if (!(await confirm({ title: 'Layihəni bağla', message: 'Layihəni bağlamaq istəyirsiniz? Bu əməliyyat geri alına bilməz.', confirmText: 'Bağla' }))) return

    setSaving(true)
    try {
      await projectsApi.complete(project.id, {
        evacuationCost: parseFloat(form.evacuationCost),
        scheduledHours: parseFloat(form.scheduledHours),
        actualHours: parseFloat(form.actualHours),
      })
      toast.success('Layihə uğurla bağlandı. Mühasibatlığa yönləndirildi.')
      onSaved()
      onClose()
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const diff = form.scheduledHours && form.actualHours
    ? parseFloat(form.actualHours) - parseFloat(form.scheduledHours)
    : null

  return (
    <div className="ces-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ces-modal" style={{ maxWidth: 480 }}>
        <div className="ces-m-head">
          <div className="ces-m-ic" style={{ background: '#e8fbe5', color: 'var(--ces-ok)' }}>
            <CheckCircle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3>Layihəni bitir</h3>
            <p className="mono truncate">{project.projectCode || project.requestCode} · {project.companyName}</p>
          </div>
          <button onClick={onClose} className="ces-modal-x" type="button" aria-label="Bağla">
            <X size={16} />
          </button>
        </div>

        <div className="ces-m-body">
          {/* Warning banner */}
          <div className="ces-alert gold" style={{ marginBottom: 16 }}>
            <div className="ces-al-ic">
              <AlertCircle size={18} />
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--ces-gold-700)', lineHeight: 1.55 }}>
              Layihəni bağladıqdan sonra <strong>Mühasibatlıq</strong> moduluna avtomatik yönləndiriləcək. Bu əməliyyat geri alına bilməz.
            </p>
          </div>

          {/* Evacuation Cost */}
          <div className="ces-field">
            <label>Evakuator xərci (AZN) <span className="req">*</span></label>
            <div className="ces-input">
              <input
                className="mono"
                type="number"
                value={form.evacuationCost}
                onChange={(e) => set('evacuationCost', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Work Hours */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="ces-field">
              <label>Plan saat <span className="req">*</span></label>
              <div className="ces-input">
                <input
                  className="mono"
                  type="number"
                  value={form.scheduledHours}
                  onChange={(e) => set('scheduledHours', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.5"
                />
              </div>
            </div>
            <div className="ces-field">
              <label>Faktiki saat <span className="req">*</span></label>
              <div className="ces-input">
                <input
                  className="mono"
                  type="number"
                  value={form.actualHours}
                  onChange={(e) => set('actualHours', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.5"
                />
              </div>
            </div>
          </div>

          {/* Summary preview */}
          {(diff !== null || form.evacuationCost) && (
            <div className="ces-card" style={{ padding: 14 }}>
              <p className="ces-sec-label" style={{ marginBottom: 10 }}>Xülasə</p>
              {diff !== null && (
                <div className="ces-card-row">
                  <span>Fərq (faktiki − plan)</span>
                  <b
                    className="mono"
                    style={{ color: diff >= 0 ? 'var(--ces-ok)' : 'var(--ces-danger)' }}
                  >
                    {diff >= 0 ? '+' : ''}{diff.toFixed(1)} saat
                  </b>
                </div>
              )}
              {form.evacuationCost && (
                <div className="ces-card-row">
                  <span>Evakuator xərci</span>
                  <b className="mono" style={{ color: 'var(--ces-danger)' }}>
                    {parseFloat(form.evacuationCost || 0).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
                  </b>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="ces-m-foot">
          <button onClick={onClose} className="ces-btn ces-btn-ghost">Ləğv et</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="ces-btn"
            style={{ background: 'var(--ces-ok)', color: '#fff' }}
          >
            {saving
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <CheckCircle size={15} />}
            {saving ? 'Bağlanır...' : 'Layihəni bağla'}
          </button>
        </div>
      </div>
      <ConfirmDialog />
    </div>
  )
}
