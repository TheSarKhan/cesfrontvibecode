import { useState } from 'react'
import { X, StopCircle, AlertOctagon } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import toast from 'react-hot-toast'
import DateInput from '../../components/common/DateInput'
import NumberInput from '../../components/common/NumberInput'

export default function ProjectEarlyTerminateModal({ project, isOpen, onClose, onSaved }) {
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split('T')[0])
  const [terminationReason, setTerminationReason] = useState('')
  const [finalHourKmCounter, setFinalHourKmCounter] = useState('')
  const [requiresInspection, setRequiresInspection] = useState(false)
  const [returnNotes, setReturnNotes] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!terminationReason.trim()) {
      toast.error('Xitam səbəbini qeyd edin')
      return
    }
    setLoading(true)
    try {
      await projectsApi.earlyTerminate(project.id, {
        terminationDate,
        terminationReason,
        finalHourKmCounter: finalHourKmCounter ? parseFloat(finalHourKmCounter) : null,
        requiresInspection,
        returnNotes,
      })
      toast.success('Layihəyə vaxtından əvvəl xitam verildi (Status: CANCELLED)')
      onSaved?.()
      onClose?.()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xitam zamanı xəta baş verdi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ces-modal-overlay" onClick={onClose}>
      <div className="ces-modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
        <div className="ces-m-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fee2e2', color: '#ef4444', display: 'grid', placeItems: 'center' }}>
              <AlertOctagon size={20} />
            </div>
            <div>
              <p className="ces-m-title">Layihəyə Vaxtından Əvvəl Xitam Ver</p>
              <p className="ces-m-sub">{project.projectCode} — {project.companyName}</p>
            </div>
          </div>
          <button className="ces-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="ces-m-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: 10, borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 12.5, color: '#991b1b' }}>
            ⚠️ <b>Diqqət:</b> Layihə ləğv ediləcək və bütün icarədə olan texnikalar qaraja qaytarılaraq sərbəstləşdiriləcəkdir.
          </div>

          <div>
            <label className="ces-label">Xitam Tarixi *</label>
            <div className="ces-input-wrap">
              <DateInput value={terminationDate} onChange={(e) => setTerminationDate(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="ces-label">Xitam Səbəbi *</label>
            <input
              className="ces-input"
              type="text"
              value={terminationReason}
              onChange={(e) => setTerminationReason(e.target.value)}
              placeholder="Məs: Müştəri tikinti işlərini dayandırdı"
              required
            />
          </div>

          <div>
            <label className="ces-label">Qaytarılan Texnikanın Son Motosaatı / Sayğacı</label>
            <div className="ces-input-wrap">
              <NumberInput
                value={finalHourKmCounter}
                onChange={(v) => setFinalHourKmCounter(v)}
                placeholder="Məs: 1150"
              />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--ces-ink)' }}>
            <input type="checkbox" checked={requiresInspection} onChange={(e) => setRequiresInspection(e.target.checked)} />
            Qaytarıldıqdan sonra texniki servis baxışı tələb olunur (IN_INSPECTION)
          </label>

          <div>
            <label className="ces-label">Təhvil Qeydləri</label>
            <textarea
              className="ces-input"
              rows={2}
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="Texnikanın vəziyyəti haqqında qeydlər..."
            />
          </div>

          <div className="ces-m-foot" style={{ padding: '14px 0 0', margin: 0, borderTop: '1px solid var(--ces-line)' }}>
            <button type="button" className="ces-btn ces-btn-outline" onClick={onClose} disabled={loading}>İmtina</button>
            <button type="submit" className="ces-btn" style={{ background: '#dc2626', color: '#fff' }} disabled={loading}>
              <StopCircle size={15} />
              {loading ? 'Xitam verilir...' : 'Layihəni Ləğv Et'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
