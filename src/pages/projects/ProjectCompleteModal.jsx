import { useState } from 'react'
import { X, CheckCircle, AlertCircle, Wrench, Gauge, FileText } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import toast from 'react-hot-toast'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import NumberInput from '../../components/common/NumberInput'

export default function ProjectCompleteModal({ project, onClose, onSaved }) {
  useEscapeKey(onClose)
  const { confirm, ConfirmDialog } = useConfirm()
  const [form, setForm] = useState({
    evacuationCost: '',
    scheduledHours: '',
    actualHours: '',
    finalHourKmCounter: '',
    returnNotes: '',
    requiresInspection: false,
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

    if (!(await confirm({
      title: 'Layihəni bağla və Qaraja qaytar',
      message: 'Layihə bağlanacaq və texnika qaraja sərbəst (AVAILABLE) statusla qaytarılacaq. Təsdiq edirsiniz?',
      confirmText: 'Bağla və Qaytar'
    }))) return

    setSaving(true)
    try {
      await projectsApi.complete(project.id, {
        evacuationCost: parseFloat(form.evacuationCost),
        scheduledHours: parseFloat(form.scheduledHours),
        actualHours: parseFloat(form.actualHours),
      })

      if (form.finalHourKmCounter) {
        await projectsApi.returnToGarage(project.id, {
          finalHourKmCounter: parseFloat(form.finalHourKmCounter),
          returnNotes: form.returnNotes?.trim() || null,
          requiresInspection: form.requiresInspection,
        })
      }

      toast.success('Layihə tamamlandı və texnika qaraja qaytarıldı', { icon: '🏁' })
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
      <div className="ces-modal" style={{ maxWidth: 520 }}>
        <div className="ces-m-head">
          <div className="ces-m-ic" style={{ background: '#e8fbe5', color: 'var(--ces-ok)' }}>
            <CheckCircle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3>Layihəni bitir və Qaraja qaytar</h3>
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
              Layihəni bağladıqdan sonra <strong>Mühasibatlıq</strong> moduluna avtomatik yönləndiriləcək və texnika qarajda sərbəstləşdiriləcək.
            </p>
          </div>

          {/* Evacuation Cost */}
          <div className="ces-field">
            <label>Evakuator xərci (AZN) <span className="req">*</span></label>
            <div className="ces-input">
              <NumberInput
                decimal
                className="mono"
                value={form.evacuationCost}
                onChange={(e) => set('evacuationCost', e.target.value)}
                placeholder="0.00"
                min="0"
              />
            </div>
          </div>

          {/* Work Hours */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="ces-field">
              <label>Plan saat <span className="req">*</span></label>
              <div className="ces-input">
                <NumberInput
                  decimal
                  className="mono"
                  value={form.scheduledHours}
                  onChange={(e) => set('scheduledHours', e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            <div className="ces-field">
              <label>Faktiki saat <span className="req">*</span></label>
              <div className="ces-input">
                <NumberInput
                  decimal
                  className="mono"
                  value={form.actualHours}
                  onChange={(e) => set('actualHours', e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Demobilization / Garage Return Section */}
          <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3 mt-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Gauge size={14} className="text-amber-500" />
              <span>Demobilizasiya və Qaraj Qayıdışı</span>
            </div>

            <div className="ces-field">
              <label>Yekun Sayğac Göstəricisi (Saat / KM)</label>
              <div className="ces-input">
                <NumberInput
                  decimal
                  className="mono"
                  value={form.finalHourKmCounter}
                  onChange={(e) => set('finalHourKmCounter', e.target.value)}
                  placeholder="Texnikanın cari sayğacı (məs: 1450)"
                  min="0"
                />
              </div>
            </div>

            <div className="ces-field">
              <label>Qaraja Təhvil Qeydi</label>
              <div className="ces-input">
                <input
                  type="text"
                  value={form.returnNotes}
                  onChange={(e) => set('returnNotes', e.target.value)}
                  placeholder="Texnikanın vəziyyəti, çatışmazlıqlar və s."
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={form.requiresInspection}
                onChange={(e) => set('requiresInspection', e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0"
              />
              <span className="flex items-center gap-1">
                <Wrench size={12} className="text-amber-400" />
                Texniki servis və ya baxış tələb olunur (IN_INSPECTION)
              </span>
            </label>
          </div>

          {/* Summary preview */}
          {(diff !== null || form.evacuationCost) && (
            <div className="ces-card" style={{ padding: 14, marginTop: 12 }}>
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
            {saving ? 'Tamamlanır...' : 'Layihəni bağla və Qaytar'}
          </button>
        </div>
      </div>
      <ConfirmDialog />
    </div>
  )
}
