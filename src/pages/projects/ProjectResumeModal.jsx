import { useState } from 'react'
import { X, PlayCircle, CheckCircle } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import toast from 'react-hot-toast'
import DateInput from '../../components/common/DateInput'

export default function ProjectResumeModal({ project, isOpen, onClose, onSaved }) {
  const [resumeDate, setResumeDate] = useState(new Date().toISOString().split('T')[0])
  const [resolvedNotes, setResolvedNotes] = useState('')
  const [autoExtendEndDate, setAutoExtendEndDate] = useState(true)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!resumeDate) {
      toast.error('Bərpa tarixi seçin')
      return
    }
    setLoading(true)
    try {
      await projectsApi.resume(project.id, {
        resumeDate,
        resolvedNotes,
        autoExtendEndDate,
      })
      toast.success('Layihə icrası bərpa edildi (Status: ACTIVE)')
      onSaved?.()
      onClose?.()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bərpa zamanı xəta baş verdi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ces-modal-overlay" onClick={onClose}>
      <div className="ces-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="ces-m-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center' }}>
              <PlayCircle size={20} />
            </div>
            <div>
              <p className="ces-m-title">Layihəni Bərpa Et</p>
              <p className="ces-m-sub">{project.projectCode} — {project.companyName}</p>
            </div>
          </div>
          <button className="ces-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="ces-m-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="ces-label">İşin Bərpa Tarixi *</label>
            <div className="ces-input-wrap">
              <DateInput value={resumeDate} onChange={(e) => setResumeDate(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="ces-label">Bərpa Qeydləri / Razılaşma</label>
            <textarea
              className="ces-input"
              rows={2}
              value={resolvedNotes}
              onChange={(e) => setResolvedNotes(e.target.value)}
              placeholder="İşin bərpası ilə bağlı qeydləri daxil edin..."
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--ces-ink)' }}>
            <input type="checkbox" checked={autoExtendEndDate} onChange={(e) => setAutoExtendEndDate(e.target.checked)} />
            Bitmə tarixini dayanma günləri qədər avtomatik uzat
          </label>

          <div className="ces-m-foot" style={{ padding: '14px 0 0', margin: 0, borderTop: '1px solid var(--ces-line)' }}>
            <button type="button" className="ces-btn ces-btn-outline" onClick={onClose} disabled={loading}>İmtina</button>
            <button type="submit" className="ces-btn ces-btn-primary" disabled={loading}>
              <CheckCircle size={15} />
              {loading ? 'Bərpa edilir...' : 'İşləri Bərpa Et'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
