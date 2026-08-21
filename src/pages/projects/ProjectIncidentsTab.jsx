import { useState, useEffect } from 'react'
import {
  PauseCircle, PlayCircle, RefreshCw, AlertOctagon,
  FileText, Calendar, ArrowRight, Wrench, ShieldAlert,
  Clock, CheckCircle2, CloudRain, Construction, CreditCard, ExternalLink
} from 'lucide-react'
import { projectsApi } from '../../api/projects'
import { fmtDate } from '../../utils/date'
import toast from 'react-hot-toast'
import ProjectPauseModal from './ProjectPauseModal'
import ProjectResumeModal from './ProjectResumeModal'
import ProjectSwapModal from './ProjectSwapModal'
import ProjectEarlyTerminateModal from './ProjectEarlyTerminateModal'

const REASON_LABELS = {
  WEATHER: { label: '🌪️ Hava Şəraiti / Fors-major', pill: 'ces-p-info' },
  CUSTOMER_SITE: { label: '🚧 Müştəri Səbəbli / Sahə Gözləməsi', pill: 'ces-p-warn' },
  TECHNICAL_BREAKDOWN: { label: '🔧 Texniki Nasazlıq / Təmir', pill: 'ces-p-danger' },
  PAYMENT_DELAY: { label: '💳 Ödəniş Gecikməsi', pill: 'ces-p-purple' },
  OTHER: { label: '📋 Digər Səbəb', pill: 'ces-p-mute' },
}

export default function ProjectIncidentsTab({ project, onReload }) {
  const [downtimes, setDowntimes] = useState([])
  const [swaps, setSwaps] = useState([])
  const [loading, setLoading] = useState(false)

  // Modals state
  const [pauseOpen, setPauseOpen] = useState(false)
  const [resumeOpen, setResumeOpen] = useState(false)
  const [swapOpen, setSwapOpen] = useState(false)
  const [terminateOpen, setTerminateOpen] = useState(false)

  useEffect(() => {
    if (project?.id) {
      loadHistory()
    }
  }, [project?.id])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const [dtRes, swRes] = await Promise.all([
        projectsApi.getDowntimes(project.id),
        projectsApi.getEquipmentSwaps(project.id),
      ])
      setDowntimes(dtRes.data?.data || dtRes.data || [])
      setSwaps(swRes.data?.data || swRes.data || [])
    } catch (err) {
      console.error('İnsident tarixçəsi yüklənmədi:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaved = () => {
    loadHistory()
    onReload?.()
  }

  const isPaused = project.status === 'PAUSED'
  const isActive = project.status === 'ACTIVE'
  const isTerminated = project.status === 'CANCELLED' || project.status === 'COMPLETED'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Status & Quick Action Hub */}
      <div
        style={{
          padding: 16,
          borderRadius: 12,
          background: isPaused
            ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
            : isActive
            ? 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
            : 'var(--ces-bg)',
          border: isPaused ? '1px solid #fde68a' : '1px solid var(--ces-line)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ces-ink)' }}>
                Layihə İdarəetmə və İnsident Mərkəzi
              </span>
              <span className={`ces-pill ${isPaused ? 'ces-p-warn' : isActive ? 'ces-p-ok' : 'ces-p-mute'}`}>
                {isPaused ? '⏸️ Dayandırılıb' : isActive ? '🟢 Aktiv İcrada' : project.status}
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ces-muted)', margin: '4px 0 0' }}>
              {isPaused
                ? 'Layihə hazırda dondurulub. Sahə hazır olduqda "Bərpa Et" düyməsini sıxın.'
                : 'Sahədə baş verən dayanma, təmir və ya texnika əvəzləmə əməliyyatlarını buradan icra edin.'}
            </p>
          </div>

          {!isTerminated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {isPaused ? (
                <button
                  type="button"
                  className="ces-btn ces-btn-primary"
                  onClick={() => setResumeOpen(true)}
                  style={{ background: '#16a34a', borderColor: '#16a34a' }}
                >
                  <PlayCircle size={15} /> Layihəni Bərpa Et
                </button>
              ) : (
                <button
                  type="button"
                  className="ces-btn"
                  onClick={() => setPauseOpen(true)}
                  style={{ background: '#d97706', color: '#fff' }}
                >
                  <PauseCircle size={15} /> Layihəni Dondur
                </button>
              )}

              <button
                type="button"
                className="ces-btn"
                onClick={() => setSwapOpen(true)}
                style={{ background: '#7c3aed', color: '#fff' }}
              >
                <RefreshCw size={15} /> Texnikanı Əvəzlə (Swap)
              </button>

              <button
                type="button"
                className="ces-btn ces-btn-outline"
                onClick={() => setTerminateOpen(true)}
                style={{ color: '#dc2626', borderColor: '#fca5a5' }}
              >
                <AlertOctagon size={15} /> Vaxtından Əvvəl Xitam
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Section 1: Dayanma Tarixçəsi */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <p className="ces-sec-label" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
            <Clock size={12} /> Dayanma və Gözləmə Tarixçəsi ({downtimes.length})
          </p>
        </div>

        {downtimes.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', borderRadius: 8, background: 'var(--ces-graphite-50)', border: '1px dashed var(--ces-line)' }}>
            <p style={{ fontSize: 12.5, color: 'var(--ces-muted)', margin: 0 }}>Bu layihədə heç bir dayanma qeydə alınmayıb</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {downtimes.map((dt) => {
              const rInfo = REASON_LABELS[dt.reasonType] || REASON_LABELS.OTHER
              const isDtActive = dt.status === 'ACTIVE'
              return (
                <div
                  key={dt.id}
                  style={{
                    padding: 12, borderRadius: 10,
                    background: isDtActive ? '#fffbeb' : 'var(--ces-bg)',
                    border: isDtActive ? '1px solid #fde68a' : '1px solid var(--ces-line)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`ces-pill ${rInfo.pill}`} style={{ fontSize: 11 }}>{rInfo.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ces-ink)' }}>
                        {fmtDate(dt.startDate)} ➔ {dt.endDate ? fmtDate(dt.endDate) : <span style={{ color: '#d97706' }}>Davam edir</span>}
                      </span>
                      {dt.isPaid && (
                        <span className="ces-pill ces-p-ok" style={{ fontSize: 10 }}>
                          Ödənişli (Standby: {dt.standbyRate ? `${parseFloat(dt.standbyRate).toLocaleString('az-AZ')} ₼` : '—'})
                        </span>
                      )}
                    </div>
                    {dt.reasonDescription && (
                      <p style={{ fontSize: 12, color: 'var(--ces-muted)', margin: '4px 0 0' }}>{dt.reasonDescription}</p>
                    )}
                    {dt.resolvedNotes && (
                      <p style={{ fontSize: 11.5, color: '#15803d', margin: '2px 0 0' }}>✅ Bərpa: {dt.resolvedNotes}</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <a
                      href={`https://api.ces.invorent.com/api/projects/${project.id}/downtimes/${dt.id}/act/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ces-btn ces-btn-outline"
                      style={{ fontSize: 11.5, padding: '5px 9px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <FileText size={13} /> Dayanma Aktı (PDF)
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Section 2: Texnika Əvəzləmə Tarixçəsi */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <p className="ces-sec-label" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
            <RefreshCw size={12} /> Texnika Əvəzləmə Tarixçəsi ({swaps.length})
          </p>
        </div>

        {swaps.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', borderRadius: 8, background: 'var(--ces-graphite-50)', border: '1px dashed var(--ces-line)' }}>
            <p style={{ fontSize: 12.5, color: 'var(--ces-muted)', margin: 0 }}>Bu layihədə texnika əvəzlənməsi aparılmayıb</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {swaps.map((sw) => (
              <div
                key={sw.id}
                style={{
                  padding: 12, borderRadius: 10,
                  background: 'var(--ces-bg)',
                  border: '1px solid var(--ces-line)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10
                }}
              >
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--ces-muted)', fontWeight: 600 }}>{fmtDate(sw.swapDate)}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#dc2626' }}>
                      🛑 {sw.oldEquipmentName} ({sw.oldEquipmentPlateNumber || 'Nişansız'})
                    </span>
                    <ArrowRight size={14} color="var(--ces-muted)" />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#16a34a' }}>
                      ✅ {sw.newEquipmentName} ({sw.newEquipmentPlateNumber || 'Nişansız'})
                    </span>
                  </div>

                  <p style={{ fontSize: 12, color: 'var(--ces-ink)', margin: '4px 0 0' }}>
                    <b>Səbəb:</b> {sw.swapReason}
                  </p>

                  <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: 'var(--ces-muted)' }}>
                    <span>Köhnə son sayğac: <b>{sw.oldEquipmentFinalCounter != null ? `${sw.oldEquipmentFinalCounter} saat` : '—'}</b></span>
                    <span>Yeni ilkin sayğac: <b>{sw.newEquipmentInitialCounter != null ? `${sw.newEquipmentInitialCounter} saat` : '—'}</b></span>
                    <span>Köhnə statusu: <b style={{ color: '#d97706' }}>{sw.oldEquipmentNextStatus}</b></span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <a
                    href={`https://api.ces.invorent.com/api/projects/${project.id}/equipment-swaps/${sw.id}/act/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ces-btn ces-btn-outline"
                    style={{ fontSize: 11.5, padding: '5px 9px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <FileText size={13} /> Əvəzləmə Aktı (PDF)
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ProjectPauseModal
        project={project}
        isOpen={pauseOpen}
        onClose={() => setPauseOpen(false)}
        onSaved={handleSaved}
      />
      <ProjectResumeModal
        project={project}
        isOpen={resumeOpen}
        onClose={() => setResumeOpen(false)}
        onSaved={handleSaved}
      />
      <ProjectSwapModal
        project={project}
        isOpen={swapOpen}
        onClose={() => setSwapOpen(false)}
        onSaved={handleSaved}
      />
      <ProjectEarlyTerminateModal
        project={project}
        isOpen={terminateOpen}
        onClose={() => setTerminateOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
