import { useState } from 'react'
import { X, MapPin, Pencil } from 'lucide-react'
import { garageApi } from '../../api/garage'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import ComboInput from '../../components/common/ComboInput'

export default function BulkEditModal({ selectedIds, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [loading, setLoading] = useState(false)
  const [storageLocation, setStorageLocation] = useState('')
  const [applyLocation, setApplyLocation] = useState(false)
  const [notes, setNotes] = useState('')
  const [applyNotes, setApplyNotes] = useState(false)

  const inputCls = 'w-full px-3.5 py-2.5 text-sm bg-white border border-[var(--ces-line)] rounded-[11px] text-[var(--ces-ink)] placeholder-[var(--ces-mute2)] focus:outline-none focus:border-[var(--ces-graphite)] focus:ring-[3px] focus:ring-[rgba(58,58,58,0.1)] transition-all'

  const handleSubmit = async () => {
    if (!applyLocation && !applyNotes) {
      toast.error('Ən azı bir sahə seçin')
      return
    }

    setLoading(true)
    let ok = 0, pending = 0, fail = 0
    for (const id of selectedIds) {
      try {
        const { data: res } = await garageApi.getById(id)
        const current = res.data
        const payload = {
          equipmentCode:           current.equipmentCode,
          name:                    current.name,
          type:                    current.type,
          serialNumber:            current.serialNumber,
          brand:                   current.brand,
          model:                   current.model,
          manufactureYear:         current.manufactureYear,
          purchaseDate:            current.purchaseDate,
          purchasePrice:           current.purchasePrice,
          plateNumber:             current.plateNumber,
          weightTon:               current.weightTon,
          currentMarketValue:      current.currentMarketValue,
          depreciationRate:        current.depreciationRate,
          hourKmCounter:           current.hourKmCounter,
          motoHours:               current.motoHours,
          responsibleUserId:       current.responsibleUserId,
          ownershipType:           current.ownershipType,
          ownerContractorId:       current.ownerContractorId,
          ownerInvestorName:       current.ownerInvestorName,
          ownerInvestorVoen:       current.ownerInvestorVoen,
          ownerInvestorPhone:      current.ownerInvestorPhone,
          lastInspectionDate:      current.lastInspectionDate,
          nextInspectionDate:      current.nextInspectionDate,
          technicalReadinessStatus:current.technicalReadinessStatus,
          status:                  current.status,
          repairStatus:            current.repairStatus,
          safetyEquipmentIds:      current.safetyEquipment?.map(s => s.id) ?? [],
          storageLocation:  applyLocation ? (storageLocation || null) : current.storageLocation,
          notes:            applyNotes    ? (notes || null)            : current.notes,
        }
        await garageApi.update(id, payload)
        ok++
      } catch (err) {
        if (err?.isPending) pending++
        else fail++
      }
    }
    setLoading(false)
    if (ok) toast.success(`${ok} texnika yeniləndi`)
    if (pending) toast.success(`${pending} texnikanın dəyişikliyi təsdiq növbəsinə göndərildi`)
    if (fail) toast.error(`${fail} texnika yenilənmədi`)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(58,58,58,0.45)] backdrop-blur-sm p-4 ces-font">
      <div className="bg-[var(--ces-surface)] rounded-[18px] shadow-[0_24px_48px_-20px_rgba(58,58,58,0.28),0_6px_14px_rgba(58,58,58,0.08)] w-full max-w-md relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3.5 px-6 pt-6 pb-5 border-b border-[var(--ces-line)]">
          <div className="w-11 h-11 rounded-[12px] grid place-items-center bg-[var(--ces-info-100)] text-[var(--ces-info)] shrink-0">
            <Pencil size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-[var(--ces-ink)] leading-tight">Toplu redaktə</h2>
            <p className="text-[13px] text-[var(--ces-muted)] mt-1">
              <span className="font-semibold text-[var(--ces-ink)]">{selectedIds.length}</span> texnika seçildi
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[8px] grid place-items-center text-[var(--ces-muted)] hover:bg-[var(--ces-graphite-50)] hover:text-[var(--ces-graphite)] transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Storage Location */}
          <div>
            <label className="flex items-center gap-2.5 mb-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={applyLocation}
                onChange={(e) => setApplyLocation(e.target.checked)}
                className="w-4 h-4 accent-[var(--ces-graphite)]"
              />
              <span className="text-[13px] font-semibold text-[var(--ces-ink)] flex items-center gap-1.5">
                <MapPin size={14} className="text-[var(--ces-gold-700)]" /> Saxlanma yeri
              </span>
            </label>
            {applyLocation && (
              <ComboInput
                category="REGION"
                value={storageLocation}
                onChange={(v) => setStorageLocation(v)}
                placeholder="Saxlanma yeri seçin..."
              />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-2.5 mb-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={applyNotes}
                onChange={(e) => setApplyNotes(e.target.checked)}
                className="w-4 h-4 accent-[var(--ces-graphite)]"
              />
              <span className="text-[13px] font-semibold text-[var(--ces-ink)]">Qeyd</span>
            </label>
            {applyNotes && (
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Əlavə qeyd..."
                className={clsx(inputCls, 'resize-none')}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-6 py-4 border-t border-[var(--ces-line)] bg-[var(--ces-graphite-50)] justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-[10px] text-sm font-semibold text-[var(--ces-graphite)] bg-white border border-[var(--ces-line)] hover:border-[var(--ces-graphite)] transition-colors"
          >
            Ləğv et
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (!applyLocation && !applyNotes)}
            className="inline-flex items-center gap-2 bg-[var(--ces-gold)] hover:bg-[var(--ces-gold-700)] disabled:opacity-60 disabled:pointer-events-none text-[var(--ces-on-gold)] font-semibold px-5 py-2.5 rounded-[10px] text-sm transition-colors"
          >
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Tətbiq et ({selectedIds.length})
          </button>
        </div>
      </div>
    </div>
  )
}
