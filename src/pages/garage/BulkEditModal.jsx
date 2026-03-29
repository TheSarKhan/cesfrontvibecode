import { useState } from 'react'
import { X, MapPin } from 'lucide-react'
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

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'

  const handleSubmit = async () => {
    if (!applyLocation && !applyNotes) {
      toast.error('Ən azı bir sahə seçin')
      return
    }

    setLoading(true)
    let ok = 0, fail = 0
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
      } catch { fail++ }
    }
    setLoading(false)
    if (ok) toast.success(`${ok} texnika yeniləndi`)
    if (fail) toast.error(`${fail} texnika yenilənmədi`)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors"
        >
          <X size={14} className="text-white" />
        </button>

        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">Toplu redaktə</h2>
        <p className="text-xs text-gray-400 mb-5">{selectedIds.length} texnika seçildi</p>

        <div className="space-y-4">
          {/* Storage Location */}
          <div>
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applyLocation}
                onChange={(e) => setApplyLocation(e.target.checked)}
                className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <MapPin size={14} className="text-amber-500" /> Saxlanma yeri
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
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applyNotes}
                onChange={(e) => setApplyNotes(e.target.checked)}
                className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Qeyd</span>
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

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSubmit}
            disabled={loading || (!applyLocation && !applyNotes)}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Tətbiq et ({selectedIds.length})
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Ləğv et
          </button>
        </div>
      </div>
    </div>
  )
}
