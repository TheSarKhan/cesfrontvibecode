import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Wrench, Hash, Calendar, Weight, MapPin, User, Phone, Building2,
  FileText, ShieldCheck, ClipboardCheck, Image as ImageIcon, Info,
} from 'lucide-react'
import { clsx } from 'clsx'
import { garageApi } from '../../api/garage'

/**
 * Texnika haqqında tam məlumat modalı (Qaraj modulundan datalarla).
 * Koordinator modalı üzərində nested olaraq açılır.
 */
export default function EquipmentDetailsModal({ equipmentId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imgIdx, setImgIdx] = useState(0)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setLoading(true)
    garageApi.getById(equipmentId)
      .then(r => setData(r.data.data || r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [equipmentId])

  // Esc ilə bağlama
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal((
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 1100, background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col"
        style={{ maxWidth: 720, maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-start justify-between gap-3" style={{ borderColor: 'var(--ces-line)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 grid place-items-center rounded-xl shrink-0" style={{ background: 'var(--ces-gold)', color: 'var(--ces-on-gold)' }}>
              <Wrench size={18} />
            </div>
            <div className="min-w-0">
              {loading ? (
                <div className="h-5 w-40 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              ) : (
                <>
                  <h3 className="text-base font-bold m-0 truncate" style={{ color: 'var(--ces-ink)' }}>
                    {data?.name || 'Texnika'}
                  </h3>
                  <p className="text-[11px] m-0 mt-0.5 mono" style={{ color: 'var(--ces-gold-700)' }}>
                    {data?.equipmentCode}
                  </p>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 p-1.5 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-10 text-center text-sm" style={{ color: 'var(--ces-muted)' }}>Yüklənir...</div>
          ) : !data ? (
            <div className="p-10 text-center text-sm" style={{ color: 'var(--ces-muted)' }}>Məlumat tapılmadı</div>
          ) : (
            <div className="p-5 space-y-4">
              {/* Status + ownership badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={data.status} />
                <OwnershipBadge ownership={data.ownershipType} />
                {data.technicalReadinessStatus && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-700">
                    {data.technicalReadinessStatus}
                  </span>
                )}
              </div>

              {/* Image carousel (if any) */}
              {data.images?.length > 0 && (
                <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900" style={{ aspectRatio: '16 / 9' }}>
                  {!imgError ? (
                    <img
                      src={garageApi.getImageViewUrl(data.id, data.images[imgIdx]?.id)}
                      alt={data.name}
                      className="w-full h-full object-cover"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-gray-400">
                      <ImageIcon size={32} />
                    </div>
                  )}
                  {data.images.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {data.images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => { setImgIdx(i); setImgError(false) }}
                          className={clsx(
                            'w-1.5 h-1.5 rounded-full transition-all',
                            i === imgIdx ? 'bg-white w-4' : 'bg-white/50'
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Specs grid */}
              <SectionCard title="Texniki spesifikasiyalar" icon={Info}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <Line label="Növ" value={data.type} />
                  <Line label="Marka" value={data.brand} />
                  <Line label="Model" value={data.model} />
                  <Line label="İstehsal ili" value={data.manufactureYear} />
                  <Line label="Seriya №" value={data.serialNumber} mono />
                  <Line label="Qeydiyyat №" value={data.plateNumber} mono />
                  <Line label="Çəki" value={data.weightTon ? `${data.weightTon} ton` : null} />
                  <Line label="Moto saat" value={data.motoHours} />
                  <Line label="Saat/km counter" value={data.hourKmCounter} />
                  <Line label="Saxlama yeri" value={data.storageLocation} />
                  <Line label="Cari bazar dəyəri" value={data.currentMarketValue ? `${fmt(data.currentMarketValue)} ₼` : null} />
                  <Line label="Köhnəlmə dərəcəsi" value={data.depreciationRate ? `${data.depreciationRate}%` : null} />
                </div>
              </SectionCard>

              {/* Inspection */}
              {(data.lastInspectionDate || data.nextInspectionDate) && (
                <SectionCard title="Texniki baxış" icon={ClipboardCheck}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <Line icon={Calendar} label="Son baxış" value={data.lastInspectionDate} />
                    <Line icon={Calendar} label="Növbəti baxış" value={data.nextInspectionDate} />
                  </div>
                </SectionCard>
              )}

              {/* Ownership */}
              {(data.ownerContractorName || data.ownerInvestorName) && (
                <SectionCard title="Sahib məlumatları" icon={Building2}>
                  {data.ownerContractorName && (
                    <>
                      <Line icon={Building2} label="Şirkət" value={data.ownerContractorName} />
                      <Line icon={Hash} label="VÖEN" value={data.ownerContractorVoen} mono />
                      <Line icon={Phone} label="Telefon" value={data.ownerContractorPhone} mono />
                      <Line icon={User} label="Əlaqə şəxsi" value={data.ownerContractorContact} />
                    </>
                  )}
                  {data.ownerInvestorName && (
                    <>
                      <Line icon={Building2} label="Şirkət" value={data.ownerInvestorName} />
                      <Line icon={Hash} label="VÖEN" value={data.ownerInvestorVoen} mono />
                      <Line icon={Phone} label="Telefon" value={data.ownerInvestorPhone} mono />
                    </>
                  )}
                </SectionCard>
              )}

              {/* Safety equipment */}
              {data.safetyEquipment?.length > 0 && (
                <SectionCard title="Təhlükəsizlik avadanlıqları" icon={ShieldCheck}>
                  <div className="flex flex-wrap gap-1.5">
                    {data.safetyEquipment.map(s => (
                      <span
                        key={s.id}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium border"
                        style={{ background: 'var(--ces-gold-50)', borderColor: 'var(--ces-gold)', color: 'var(--ces-gold-700)' }}
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Documents */}
              {data.documents?.length > 0 && (
                <SectionCard title={`Sənədlər (${data.documents.length})`} icon={FileText}>
                  <div className="space-y-1">
                    {data.documents.map(doc => (
                      <div key={doc.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded" style={{ background: 'var(--ces-graphite-50)' }}>
                        <FileText size={11} style={{ color: 'var(--ces-gold-700)' }} />
                        <span className="truncate flex-1" style={{ color: 'var(--ces-ink)' }}>
                          {doc.documentName || doc.fileName}
                        </span>
                        {doc.documentType && (
                          <span className="text-[9px] uppercase mono px-1 py-0.5 rounded" style={{ background: 'var(--ces-graphite-100)', color: 'var(--ces-mute2)' }}>
                            {doc.documentType}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Notes */}
              {data.notes && (
                <SectionCard title="Qeydlər" icon={Info}>
                  <p className="text-xs whitespace-pre-wrap m-0" style={{ color: 'var(--ces-muted)' }}>{data.notes}</p>
                </SectionCard>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-gray-50 dark:bg-gray-900 flex justify-end" style={{ borderColor: 'var(--ces-line)' }}>
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            Bağla
          </button>
        </div>
      </div>
    </div>
  ), document.body)
}

function StatusBadge({ status }) {
  const cfg = {
    AVAILABLE:      { label: 'Mövcuddur', cls: 'bg-green-100 text-green-700 border-green-200' },
    IN_USE:         { label: 'İcarədə',   cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    RENTED:         { label: 'İcarədə',   cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    UNDER_REPAIR:   { label: 'Təmirdə',   cls: 'bg-red-100 text-red-700 border-red-200' },
    DECOMMISSIONED: { label: 'Xaric',     cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  }
  const c = cfg[status] || { label: status, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
  return <span className={clsx('px-2 py-0.5 rounded-md text-[10px] font-bold border', c.cls)}>{c.label}</span>
}

function OwnershipBadge({ ownership }) {
  const cfg = {
    COMPANY:    { label: 'Şirkət texnikası', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    CONTRACTOR: { label: 'Podratçı texnikası', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    INVESTOR:   { label: 'Investor texnikası', cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  }
  const c = cfg[ownership]
  if (!c) return null
  return <span className={clsx('px-2 py-0.5 rounded-md text-[10px] font-bold border', c.cls)}>{c.label}</span>
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--ces-line)', background: 'var(--ces-surface)' }}>
      <div className="flex items-center gap-1.5 mb-2 pb-1.5" style={{ borderBottom: '1px solid var(--ces-line)' }}>
        {Icon && <Icon size={12} style={{ color: 'var(--ces-gold-700)' }} />}
        <p className="text-[10px] font-bold uppercase tracking-wider m-0" style={{ color: 'var(--ces-gold-700)' }}>
          {title}
        </p>
      </div>
      {children}
    </div>
  )
}

function Line({ icon: Icon, label, value, mono }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-start gap-1.5">
      {Icon && <Icon size={11} className="shrink-0 mt-0.5" style={{ color: 'var(--ces-mute2)' }} />}
      <span className="shrink-0" style={{ color: 'var(--ces-muted)', minWidth: 100 }}>{label}:</span>
      <span className={clsx('font-semibold break-words', mono && 'mono')} style={{ color: 'var(--ces-ink)' }}>{value}</span>
    </div>
  )
}

function fmt(val) {
  if (val == null) return '—'
  return parseFloat(val).toLocaleString('az-AZ', { minimumFractionDigits: 2 })
}
