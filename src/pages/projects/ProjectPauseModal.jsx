import { useState } from 'react'
import { X, PauseCircle, AlertTriangle, CloudRain, Construction, Wrench, CreditCard, FileText } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import toast from 'react-hot-toast'
import DateInput from '../../components/common/DateInput'
import NumberInput from '../../components/common/NumberInput'

const REASONS = [
  { value: 'WEATHER', label: 'Hava Şəraiti / Fors-major', icon: CloudRain, color: '#0284c7' },
  { value: 'CUSTOMER_SITE', label: 'Müştəri Səbəbli / Sahə Hazır Deyil', icon: Construction, color: '#d97706' },
  { value: 'TECHNICAL_BREAKDOWN', label: 'Texniki Nasazlıq / Təmir Gözlənilir', icon: Wrench, color: '#dc2626' },
  { value: 'PAYMENT_DELAY', label: 'Ödəniş Gecikməsi Səbəbindən Dayandırma', icon: CreditCard, color: '#7c3aed' },
  { value: 'OTHER', label: 'Digər Səbəb', icon: FileText, color: '#475569' },
]

export default function ProjectPauseModal({ project, isOpen, onClose, onSaved }) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [reasonType, setReasonType] = useState('WEATHER')
  const [reasonDescription, setReasonDescription] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  const [standbyRate, setStandbyRate] = useState('')
  const [autoExtendEndDate, setAutoExtendEndDate] = useState(true)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!startDate) {
      toast.error('Dayanma tarixi seçin')
      return
    }
    setLoading(true)
    try {
      await projectsApi.pause(project.id, {
        startDate,
        reasonType,
        reasonDescription,
        isPaid,
        standbyRate: isPaid && standbyRate ? parseFloat(standbyRate) : null,
        autoExtendEndDate,
      })
      toast.success('Layihə müvəqqəti dayandırıldı')
      onSaved?.()
      onClose?.()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Dayandırma zamanı xəta baş verdi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ces-modal-overlay" onClick={onClose}>
      <div className="ces-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="ces-m-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fef3c7', color: '#d97706', display: 'grid', placeItems: 'center' }}>
              <PauseCircle size={20} />
            </div>
            <div>
              <p className="ces-m-title">Layihəni Müvəqqəti Dondur / Dayandır</p>
              <p className="ces-m-sub">{project.projectCode} — {project.companyName}</p>
            </div>
          </div>
          <button className="ces-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="ces-m-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="ces-label">Dayanma Başlama Tarixi *</label>
            <div className="ces-input-wrap">
              <DateInput value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="ces-label">Dayanma Səbəbi *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, marginTop: 4 }}>
              {REASONS.map((r) => {
                const Icon = r.icon
                const active = reasonType === r.value
                return (
                  <button
                    type="button"
                    key={r.value}
                    onClick={() => setReasonType(r.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 8, textAlign: 'left',
                      border: active ? `2px solid ${r.color}` : '1px solid var(--ces-line)',
                      background: active ? `${r.color}15` : 'var(--ces-bg)',
                      cursor: 'pointer', transition: 'all .15s'
                    }}
                  >
                    <Icon size={16} color={r.color} />
                    <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: 'var(--ces-ink)' }}>{r.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="ces-label">Təfərrüatlı İzahat / Qeyd</label>
            <textarea
              className="ces-input"
              rows={2}
              value={reasonDescription}
              onChange={(e) => setReasonDescription(e.target.value)}
              placeholder="Hadisənin təfərrüatlarını qeyd edin..."
            />
          </div>

          <div style={{ padding: 12, borderRadius: 8, background: 'var(--ces-graphite-50)', border: '1px solid var(--ces-line)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--ces-ink)' }}>
              <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
              Ödənişli Gözləmə (Standby Haqqı) tətbiq edilsin
            </label>
            {isPaid && (
              <div style={{ marginTop: 10 }}>
                <label className="ces-label">Standby Gündəlik / Saatlıq Məbləğ (AZN)</label>
                <div className="ces-input-wrap">
                  <NumberInput
                    value={standbyRate}
                    onChange={(v) => setStandbyRate(v)}
                    placeholder="Məs: 150"
                  />
                </div>
              </div>
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12.5, color: 'var(--ces-muted)' }}>
            <input type="checkbox" checked={autoExtendEndDate} onChange={(e) => setAutoExtendEndDate(e.target.checked)} />
            Bərpa edildikdə layihənin bitmə tarixi dayandığı günlər qədər avtomatik uzadılsın
          </label>

          <div className="ces-m-foot" style={{ padding: '14px 0 0', margin: 0, borderTop: '1px solid var(--ces-line)' }}>
            <button type="button" className="ces-btn ces-btn-outline" onClick={onClose} disabled={loading}>İmtina</button>
            <button type="submit" className="ces-btn" style={{ background: '#d97706', color: '#fff' }} disabled={loading}>
              <PauseCircle size={15} />
              {loading ? 'Yadda saxlanılır...' : 'Layihəni Dondur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
