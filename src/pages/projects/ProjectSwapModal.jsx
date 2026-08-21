import { useState, useEffect } from 'react'
import { X, RefreshCw, AlertTriangle, ArrowRight, Truck, Check } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import DateInput from '../../components/common/DateInput'
import NumberInput from '../../components/common/NumberInput'

export default function ProjectSwapModal({ project, isOpen, onClose, onSaved }) {
  const [availableEquipments, setAvailableEquipments] = useState([])
  const [oldEquipmentId, setOldEquipmentId] = useState('')
  const [oldEquipmentFinalCounter, setOldEquipmentFinalCounter] = useState('')
  const [oldEquipmentNextStatus, setOldEquipmentNextStatus] = useState('IN_REPAIR')
  const [newEquipmentId, setNewEquipmentId] = useState('')
  const [newEquipmentInitialCounter, setNewEquipmentInitialCounter] = useState('')
  const [swapDate, setSwapDate] = useState(new Date().toISOString().split('T')[0])
  const [swapReason, setSwapReason] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingEq, setFetchingEq] = useState(false)

  const currentLines = project.equipmentLines?.length
    ? project.equipmentLines
    : project.equipmentId
      ? [{ equipmentId: project.equipmentId, equipmentName: project.equipmentName, equipmentPlateNumber: project.equipmentPlateNumber }]
      : []

  useEffect(() => {
    if (isOpen) {
      if (currentLines.length > 0) {
        setOldEquipmentId(currentLines[0].equipmentId)
      }
      fetchAvailableEquipments()
    }
  }, [isOpen, project])

  const fetchAvailableEquipments = async () => {
    setFetchingEq(true)
    try {
      const res = await api.get('/garage/equipment')
      const all = res.data?.data || res.data || []
      const available = all.filter((e) => e.status === 'AVAILABLE' && e.id !== oldEquipmentId)
      setAvailableEquipments(available)
    } catch (err) {
      toast.error('Qarajdakı sərbəst texnikalar yüklənmədi')
    } finally {
      setFetchingEq(false)
    }
  }

  if (!isOpen) return null

  const handleSelectNewEquipment = (eq) => {
    setNewEquipmentId(eq.id)
    if (eq.hourKmCounter != null) {
      setNewEquipmentInitialCounter(eq.hourKmCounter)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!oldEquipmentId) {
      toast.error('Çıxarılan köhnə texnikanı seçin')
      return
    }
    if (!newEquipmentId) {
      toast.error('Qarajdan yeni əvəzedici texnika seçin')
      return
    }
    if (!swapReason.trim()) {
      toast.error('Əvəzləmə səbəbini qeyd edin')
      return
    }

    setLoading(true)
    try {
      await projectsApi.swapEquipment(project.id, {
        oldEquipmentId: Number(oldEquipmentId),
        oldEquipmentFinalCounter: oldEquipmentFinalCounter ? parseFloat(oldEquipmentFinalCounter) : null,
        oldEquipmentNextStatus,
        newEquipmentId: Number(newEquipmentId),
        newEquipmentInitialCounter: newEquipmentInitialCounter ? parseFloat(newEquipmentInitialCounter) : null,
        swapDate,
        swapReason,
        notes,
      })
      toast.success('Texnika uğurla əvəzləndi')
      onSaved?.()
      onClose?.()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Əvəzləmə zamanı xəta baş verdi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ces-modal-overlay" onClick={onClose}>
      <div className="ces-modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="ces-m-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#ede9fe', color: '#7c3aed', display: 'grid', placeItems: 'center' }}>
              <RefreshCw size={20} />
            </div>
            <div>
              <p className="ces-m-title">Sahədə Texnikanı Əvəzlə (Swap)</p>
              <p className="ces-m-sub">{project.projectCode} — {project.companyName}</p>
            </div>
          </div>
          <button className="ces-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="ces-m-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Comparison Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Old Equipment */}
            <div style={{ padding: 12, borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', marginBottom: 8 }}>
                🛑 Çıxarılan Köhnə Texnika
              </p>
              {currentLines.length > 1 ? (
                <div style={{ marginBottom: 8 }}>
                  <label className="ces-label">Layihədəki Texnika</label>
                  <select
                    className="ces-select"
                    value={oldEquipmentId}
                    onChange={(e) => setOldEquipmentId(e.target.value)}
                  >
                    {currentLines.map((l) => (
                      <option key={l.equipmentId} value={l.equipmentId}>
                        {l.equipmentName} ({l.equipmentPlateNumber || '—'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ces-ink)', margin: 0 }}>
                    {project.equipmentName || currentLines[0]?.equipmentName || 'Texnika'}
                  </p>
                  <p style={{ fontSize: 11.5, color: 'var(--ces-muted)', margin: '2px 0 0' }}>
                    Qeydiyyat №: {project.equipmentPlateNumber || currentLines[0]?.equipmentPlateNumber || '—'}
                  </p>
                </div>
              )}

              <div style={{ marginBottom: 8 }}>
                <label className="ces-label">Son Motosaat / Sayğac</label>
                <div className="ces-input-wrap">
                  <NumberInput
                    value={oldEquipmentFinalCounter}
                    onChange={(v) => setOldEquipmentFinalCounter(v)}
                    placeholder="Məs: 1250.5"
                  />
                </div>
              </div>

              <div>
                <label className="ces-label">Texnikanın Yeni Statusu</label>
                <select
                  className="ces-select"
                  value={oldEquipmentNextStatus}
                  onChange={(e) => setOldEquipmentNextStatus(e.target.value)}
                >
                  <option value="IN_REPAIR">🔧 Təmirə göndərilsin (IN_REPAIR)</option>
                  <option value="IN_INSPECTION">🔍 Texniki baxış (IN_INSPECTION)</option>
                  <option value="DEFECTIVE">⚠️ Qüsurlu (DEFECTIVE)</option>
                  <option value="AVAILABLE">✅ Sərbəst buraxılsın (AVAILABLE)</option>
                </select>
              </div>
            </div>

            {/* New Equipment */}
            <div style={{ padding: 12, borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', marginBottom: 8 }}>
                ✅ Yeni Əvəzedici Texnika
              </p>
              <div style={{ marginBottom: 8 }}>
                <label className="ces-label">Qarajdan Seçin *</label>
                <select
                  className="ces-select"
                  value={newEquipmentId}
                  onChange={(e) => {
                    const eq = availableEquipments.find((x) => x.id === Number(e.target.value))
                    if (eq) handleSelectNewEquipment(eq)
                    else setNewEquipmentId(e.target.value)
                  }}
                  required
                >
                  <option value="">Texnika seçin ({availableEquipments.length} sərbəst)</option>
                  {availableEquipments.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.brand || ''} {eq.model || ''}) — {eq.plateNumber || 'Nişansız'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label className="ces-label">İlkin Motosaat / Sayğac</label>
                <div className="ces-input-wrap">
                  <NumberInput
                    value={newEquipmentInitialCounter}
                    onChange={(v) => setNewEquipmentInitialCounter(v)}
                    placeholder="Məs: 500"
                  />
                </div>
              </div>

              <div>
                <p style={{ fontSize: 11.5, color: '#15803d', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={14} /> Yeni texnika dərhal İcarədə (RENTED) olacaq
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <div>
              <label className="ces-label">Əvəzləmə Tarixi *</label>
              <div className="ces-input-wrap">
                <DateInput value={swapDate} onChange={(e) => setSwapDate(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="ces-label">Əvəzləmə Səbəbi *</label>
              <input
                className="ces-input"
                type="text"
                value={swapReason}
                onChange={(e) => setSwapReason(e.target.value)}
                placeholder="Məs: Hidravlik sistemində nasazlıq yarandı"
                required
              />
            </div>
          </div>

          <div>
            <label className="ces-label">Əlavə Qeydlər</label>
            <textarea
              className="ces-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sahə və ya müştəri ilə razılaşdırılmış xüsusi qeydlər..."
            />
          </div>

          <div className="ces-m-foot" style={{ padding: '14px 0 0', margin: 0, borderTop: '1px solid var(--ces-line)' }}>
            <button type="button" className="ces-btn ces-btn-outline" onClick={onClose} disabled={loading}>İmtina</button>
            <button type="submit" className="ces-btn" style={{ background: '#7c3aed', color: '#fff' }} disabled={loading}>
              <RefreshCw size={15} />
              {loading ? 'Əvəzlənir...' : 'Texnikanı Əvəzlə və Təsdiq Et'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
