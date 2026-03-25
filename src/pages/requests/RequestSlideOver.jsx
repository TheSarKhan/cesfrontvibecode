import { useState, useEffect } from 'react'
import { X, Info, History, FileText, User, MapPin, Calendar, Clock, Building2, Phone, Hash } from 'lucide-react'
import { requestsApi } from '../../api/requests'
import { STATUS_CFG, PROJECT_TYPES, fmtDate, dash } from '../../constants/requests'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const TABS = [
  { id: 'info', label: 'Məlumat', icon: Info },
  { id: 'params', label: 'Parametrlər', icon: FileText },
  { id: 'history', label: 'Tarixçə', icon: History },
]

function InfoCard({ title, icon: Icon, children, className }) {
  return (
    <div className={clsx('bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700 p-3.5', className)}>
      <div className="flex items-center gap-1.5 mb-2.5">
        {Icon && <Icon size={13} className="text-amber-500" />}
        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{title}</p>
      </div>
      {children}
    </div>
  )
}

function InfoField({ label, value, mono }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-gray-400 dark:text-gray-500">{label}</span>
      <span className={clsx('text-xs font-medium text-gray-800 dark:text-gray-200', mono && 'font-mono')}>{value || '—'}</span>
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

  if (loading) return <div className="flex justify-center py-8"><span className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
  if (logs.length === 0) return <p className="text-sm text-gray-400 text-center py-8">Status tarixçəsi yoxdur</p>

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const from = STATUS_CFG[log.oldStatus] || { label: log.oldStatus, cls: '' }
        const to = STATUS_CFG[log.newStatus] || { label: log.newStatus, cls: '' }
        return (
          <div key={log.id} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={clsx('px-2 py-0.5 rounded text-[10px] font-medium border', from.cls)}>{from.label}</span>
              <span className="text-gray-400">→</span>
              <span className={clsx('px-2 py-0.5 rounded text-[10px] font-medium border', to.cls)}>{to.label}</span>
            </div>
            {log.reason && <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{log.reason}</p>}
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><User size={10} /> {log.changedBy}</span>
              <span className="flex items-center gap-1"><Clock size={10} /> {fmtDate(log.changedAt)}</span>
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

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                {request.requestCode || `REQ-${String(request.id).padStart(4, '0')}`}
              </h2>
              <span className={clsx('px-2 py-0.5 rounded-md text-[10px] font-medium border', status.cls)}>
                {status.label}
              </span>
            </div>
            <p className="text-xs text-gray-400">{request.companyName}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors shrink-0">
            <X size={14} className="text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 px-5 shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors',
                tab === t.id
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              )}
            >
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {tab === 'info' && (
            <>
              <InfoCard title="Müştəri" icon={Building2}>
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Şirkət" value={request.companyName} />
                  <InfoField label="Müştəri ID" value={request.customerId} mono />
                  <InfoField label="Əlaqə şəxsi" value={dash(request.contactPerson)} />
                  <InfoField label="Telefon" value={dash(request.contactPhone)} />
                </div>
              </InfoCard>

              <InfoCard title="Layihə" icon={MapPin}>
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Layihə adı" value={dash(request.projectName)} />
                  <InfoField label="Bölgə" value={dash(request.region)} />
                  <InfoField label="Sorğu tarixi" value={fmtDate(request.requestDate)} />
                  <InfoField label="Layihə tipi" value={projectType?.label || dash(request.projectType)} />
                  <InfoField label="Müddət" value={request.dayCount ? `${request.dayCount} ${request.projectType === 'MONTHLY' ? 'ay' : 'gün'}` : '—'} />
                  <InfoField label="Daşınma" value={request.transportationRequired ? 'Bəli' : 'Xeyr'} />
                </div>
              </InfoCard>

              {request.selectedEquipmentName && (
                <InfoCard title="Seçilmiş texnika" icon={Hash}>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoField label="Ad" value={request.selectedEquipmentName} />
                    <InfoField label="Kod" value={request.selectedEquipmentCode} mono />
                  </div>
                </InfoCard>
              )}

              <InfoCard title="Əlavə məlumat" icon={Calendar}>
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Yaradan" value={dash(request.createdByName)} />
                  <InfoField label="Yaradılma tarixi" value={fmtDate(request.createdAt)} />
                </div>
                {request.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <InfoField label="Qeyd" value={request.notes} />
                  </div>
                )}
              </InfoCard>
            </>
          )}

          {tab === 'params' && (
            <>
              {(!request.params || request.params.length === 0) ? (
                <p className="text-sm text-gray-400 text-center py-8">Texniki parametr yoxdur</p>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
                        <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Parametr</th>
                        <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Dəyər</th>
                      </tr>
                    </thead>
                    <tbody>
                      {request.params.map((p, i) => (
                        <tr key={i} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <td className="py-2 px-4 text-xs font-medium text-gray-700 dark:text-gray-300">{p.paramKey}</td>
                          <td className="py-2 px-4 text-xs text-gray-600 dark:text-gray-400">{p.paramValue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === 'history' && <HistoryTab requestId={request.id} />}
        </div>
      </div>
    </div>
  )
}
