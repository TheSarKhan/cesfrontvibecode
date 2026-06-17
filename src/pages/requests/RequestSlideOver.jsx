import { useState, useEffect } from 'react'
import { X, Info, History, FileText, User, MapPin, Calendar, Clock, Building2, Hash, ArrowRight } from 'lucide-react'
import { requestsApi } from '../../api/requests'
import { STATUS_CFG, PROJECT_TYPES, fmtDate, dash } from '../../constants/requests'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const TABS = [
  { id: 'info', label: 'Məlumat', icon: Info },
  { id: 'params', label: 'Parametrlər', icon: FileText },
  { id: 'history', label: 'Tarixçə', icon: History },
]

function InfoField({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span className="ces-sec-label" style={{ fontSize: 10 }}>{label}</span>
      <span
        className={mono ? 'mono' : undefined}
        style={{ fontSize: 13.5, color: 'var(--ces-ink)', fontWeight: 500 }}
      >
        {value || <span style={{ color: 'var(--ces-mute2)' }}>—</span>}
      </span>
    </div>
  )
}

function HistoryTab({ requestId }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    requestsApi.getStatusHistory(requestId)
      .then((res) => setLogs(res.data.data || res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [requestId])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 36 }}>
        <span style={{ width: 22, height: 22, border: '2px solid var(--ces-line)', borderTopColor: 'var(--ces-gold)', borderRadius: 999, animation: 'ces-spin .8s linear infinite' }} />
      </div>
    )
  }
  if (logs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--ces-graphite-50)', color: 'var(--ces-mute2)', display: 'inline-grid', placeItems: 'center', marginBottom: 12 }}>
          <History size={26} />
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--ces-muted)' }}>Status tarixçəsi yoxdur</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {logs.map((log) => {
        const from = STATUS_CFG[log.oldStatus] || { label: log.oldStatus, pill: 'ces-p-mute' }
        const to = STATUS_CFG[log.newStatus] || { label: log.newStatus, pill: 'ces-p-mute' }
        return (
          <div
            key={log.id}
            style={{
              background: 'var(--ces-surface)',
              border: '1px solid var(--ces-line)',
              borderRadius: 12,
              padding: '12px 14px',
            }}
          >
            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
              <span className={clsx('ces-pill sm', from.pill)}>
                <span className="d"></span>
                {from.label}
              </span>
              <ArrowRight size={12} style={{ color: 'var(--ces-mute2)' }} />
              <span className={clsx('ces-pill sm', to.pill)}>
                <span className="d"></span>
                {to.label}
              </span>
            </div>
            {log.reason && (
              <p style={{ fontSize: 12.5, color: 'var(--ces-graphite)', marginBottom: 6 }}>{log.reason}</p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--ces-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <User size={11} /> {log.changedBy}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} /> {fmtDate(log.changedAt)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function RequestSlideOver({ request, onClose }) {
  useEscapeKey(onClose)
  const [tab, setTab] = useState('info')

  if (!request) return null

  const status = STATUS_CFG[request.status] || STATUS_CFG.DRAFT
  const projectType = PROJECT_TYPES.find(t => t.value === request.projectType)
  const code = request.requestCode || `REQ-${String(request.id).padStart(4, '0')}`

  return (
    <>
      <div className="ces-drawer-backdrop" onClick={onClose} />
      <div className="ces-drawer">
        {/* Header */}
        <div className="ces-drawer-head">
          <div className="ces-m-ic gold">
            <FileText size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className="mono truncate"
              style={{ fontSize: 17, fontWeight: 800, color: 'var(--ces-ink)', letterSpacing: '-.01em', margin: 0 }}
            >
              {code}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={clsx('ces-pill sm', status.pill)}>
                <span className="d"></span>
                {status.label}
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--ces-muted)' }}>{request.companyName}</span>
            </div>
          </div>
          <button onClick={onClose} className="ces-row-act" title="Bağla">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="ces-tabs" style={{ padding: '0 12px', overflowX: 'auto', flexWrap: 'nowrap' }}>
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx('ces-tab', tab === t.id && 'on')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 14px', fontSize: 13 }}
              >
                <Icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div className="ces-drawer-body" style={{ padding: 0 }}>
          {tab === 'info' && (
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <p className="ces-sec-label" style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={11} /> Müştəri
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <InfoField label="Şirkət" value={request.companyName} />
                  <InfoField label="Müştəri ID" value={request.customerId} mono />
                  <InfoField label="Əlaqə şəxsi" value={dash(request.contactPerson)} />
                  <InfoField label="Telefon" value={dash(request.contactPhone)} mono />
                </div>
              </div>

              <div>
                <p className="ces-sec-label" style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={11} /> Layihə
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <InfoField label="Layihə adı" value={dash(request.projectName)} />
                  <InfoField label="Bölgə" value={dash(request.region)} />
                  <InfoField label="Sorğu tarixi" value={fmtDate(request.requestDate)} mono />
                  <InfoField label="Layihə tipi" value={projectType?.label || dash(request.projectType)} />
                  <InfoField
                    label="Müddət"
                    value={request.dayCount ? `${request.dayCount} ${request.projectType === 'MONTHLY' ? 'ay' : 'gün'}` : '—'}
                  />
                  <InfoField
                    label="Ödəniş növü"
                    value={request.paymentMethod === 'CASH' ? 'Nağd' : request.paymentMethod === 'TRANSFER' ? 'Köçürmə' : '—'}
                  />
                  <div>
                    <span className="ces-sec-label" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>Daşınma</span>
                    {request.transportationRequired
                      ? <span className="ces-pill ces-p-ok sm">Bəli</span>
                      : <span className="ces-pill ces-p-mute sm">Xeyr</span>}
                  </div>
                </div>
              </div>

              {request.selectedEquipmentName && (
                <div>
                  <p className="ces-sec-label" style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Hash size={11} /> Seçilmiş texnika
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <InfoField label="Ad" value={request.selectedEquipmentName} />
                    <InfoField label="Kod" value={request.selectedEquipmentCode} mono />
                  </div>
                </div>
              )}

              <div>
                <p className="ces-sec-label" style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={11} /> Əlavə məlumat
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <InfoField label="Yaradan" value={dash(request.createdByName)} />
                  <InfoField label="Yaradılma" value={fmtDate(request.createdAt)} mono />
                </div>
                {request.notes && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--ces-line)' }}>
                    <InfoField label="Qeyd" value={request.notes} />
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'params' && (
            <div style={{ padding: 22 }}>
              {(!request.params || request.params.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--ces-graphite-50)', color: 'var(--ces-mute2)', display: 'inline-grid', placeItems: 'center', marginBottom: 12 }}>
                    <FileText size={26} />
                  </div>
                  <p style={{ fontSize: 13.5, color: 'var(--ces-muted)' }}>Texniki parametr yoxdur</p>
                </div>
              ) : (
                <div className="ces-table-wrap" style={{ boxShadow: 'none' }}>
                  <table className="ces-tbl">
                    <thead>
                      <tr>
                        <th>Parametr</th>
                        <th className="r">Dəyər</th>
                      </tr>
                    </thead>
                    <tbody>
                      {request.params.map((p, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--ces-ink)' }}>{p.paramKey}</td>
                          <td className="r mono" style={{ fontSize: 13, color: 'var(--ces-muted)' }}>{p.paramValue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div style={{ padding: 22 }}>
              <HistoryTab requestId={request.id} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
