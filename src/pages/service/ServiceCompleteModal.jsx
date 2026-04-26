import { useState } from 'react'
import { X, CheckCircle, Printer, AlertTriangle } from 'lucide-react'
import { serviceApi } from '../../api/service'
import { accountingApi } from '../../api/accounting'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500'

// mode: 'inspection' | 'repair'
export default function ServiceCompleteModal({ record, mode = 'repair', onClose, onCompleted }) {
  useEscapeKey(onClose)
  const isInspection = mode === 'inspection'

  const [cost, setCost] = useState(record.cost ?? '')
  const [sendToAccounting, setSendToAccounting] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [result, setResult] = useState(null) // 'AVAILABLE' | 'DEFECTIVE'
  const [completedRecord, setCompletedRecord] = useState(null)

  const handleComplete = async (statusAfter) => {
    if (!isInspection && (!cost || parseFloat(cost) <= 0)) {
      return toast.error('Servis xərcini daxil edin')
    }

    setSaving(true)
    setResult(statusAfter)
    try {
      const hasCost = cost && parseFloat(cost) > 0
      const res = await serviceApi.complete(record.id, {
        statusAfter,
        cost: hasCost ? String(cost) : null,
      })
      const updated = res.data.data || res.data

      // Mühasibatlığa göndər (hər iki modda — xərc varsa)
      if (sendToAccounting && hasCost) {
        try {
          await accountingApi.createTransaction({
            type: 'EXPENSE',
            category: 'MAINTENANCE',
            amount: parseFloat(cost),
            transactionDate: record.serviceDate,
            description: `${isInspection ? 'Baxış' : 'Servis'} xərci: ${record.serviceType} — ${record.equipmentName}${record.plateNumber ? ` (${record.plateNumber})` : ''}`,
            notes: `Servis ID: ${record.id}`,
          })
        } catch {
          toast.error('Mühasibatlığa göndərmə uğursuz oldu, amma tamamlandı')
        }
      }

      const msg = statusAfter === 'AVAILABLE'
        ? (isInspection ? 'Baxış tamamlandı. Texnika hazırdır!' : 'Servis tamamlandı. Texnika hazırdır!')
        : 'Baxış tamamlandı. Texnika nasaz olaraq qeyd edildi.'
      toast.success(msg)
      setCompletedRecord(updated)
      setDone(true)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Tamamlama xətası')
      setResult(null)
    } finally {
      setSaving(false)
    }
  }

  const handlePrintAndClose = () => {
    onCompleted(completedRecord)
  }

  const checkedCount = record.checklistItems?.filter(i => i.checked).length || 0
  const totalCount   = record.checklistItems?.length || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className={done ? 'text-green-500' : isInspection ? 'text-amber-500' : 'text-orange-500'} />
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
              {done
                ? (result === 'AVAILABLE' ? 'Tamamlandı — Hazırdır' : 'Tamamlandı — Nasaz')
                : isInspection ? 'Baxışı Tamamla' : 'Servisi Tamamla'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!done ? (
            <>
              {/* Texnika məlumatı */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{record.equipmentName}</p>
                {record.plateNumber && <p className="text-[10px] text-gray-400">{record.plateNumber}</p>}
                <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 font-medium">{record.serviceType}</p>
                {totalCount > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-400">Checklist</span>
                      <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                        {checkedCount}/{totalCount}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={clsx("h-full rounded-full transition-all", checkedCount === totalCount ? "bg-green-500" : "bg-amber-400")}
                        style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
                      />
                    </div>
                    {checkedCount < totalCount && (
                      <p className="text-[10px] text-amber-600 mt-1">⚠ {totalCount - checkedCount} maddə hələ yoxlanılmayıb</p>
                    )}
                  </div>
                )}
              </div>

              {/* Xərc sahəsi — hər iki modda */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  {isInspection ? 'Baxış Xərci (AZN)' : 'Servis Xərci (AZN)'}
                  {!isInspection && <span className="text-red-500 ml-1">*</span>}
                  {isInspection && <span className="text-gray-400 font-normal ml-1">(opsional)</span>}
                </label>
                <input
                  type="number"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={inputCls}
                  autoFocus={!isInspection}
                />
              </div>

              {/* Mühasibat toggle — hər iki modda (xərc varsa) */}
              <button
                type="button"
                onClick={() => setSendToAccounting(v => !v)}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all",
                  sendToAccounting
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                )}
              >
                <div className={clsx(
                  "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0",
                  sendToAccounting ? "bg-blue-500 border-blue-500" : "border-gray-300 dark:border-gray-600"
                )}>
                  {sendToAccounting && (
                    <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
                      <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={clsx("text-xs font-semibold", sendToAccounting ? "text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400")}>
                    Mühasibatlığa göndər
                  </p>
                  <p className="text-[10px] text-gray-400">Xərci avtomatik qeyd et</p>
                </div>
              </button>

              {/* Inspection modu: nəticə seçimi info */}
              {isInspection && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                  Baxışın nəticəsini seçin: texnika <strong>Hazırdır</strong> olarsa qarajа göndərilir, <strong>Nasaz</strong> olarsa texniki servisə yönləndirilir.
                </p>
              )}
            </>
          ) : (
            /* Tamamlandı ekranı */
            <div className="text-center py-4">
              <div className={clsx(
                "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                result === 'AVAILABLE' ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
              )}>
                {result === 'AVAILABLE'
                  ? <CheckCircle size={32} className="text-green-500" />
                  : <AlertTriangle size={32} className="text-red-500" />
                }
              </div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">
                {record.equipmentName}
              </p>
              {result === 'AVAILABLE' ? (
                <p className="text-[11px] font-semibold text-green-600 dark:text-green-400">
                  ✓ Hazırdır statusunda Qarajda görünür
                </p>
              ) : (
                <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                  Nasaz qeyd edildi — Texniki Servis tabında görünəcək
                </p>
              )}
              {cost && parseFloat(cost) > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Xərc: <span className="font-semibold text-red-500">
                    {parseFloat(cost).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
                  </span>
                </p>
              )}
              {sendToAccounting && cost && parseFloat(cost) > 0 && (
                <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">✓ Mühasibatlığa göndərildi</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={clsx("flex items-center gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700", isInspection && !done && "flex-col")}>
          {!done ? (
            isInspection ? (
              /* Inspection: iki düymə — Hazırdır / Nasaz */
              <>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => handleComplete('DEFECTIVE')}
                    disabled={saving}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <AlertTriangle size={14} />
                    Nasaz
                  </button>
                  <button
                    onClick={() => handleComplete('AVAILABLE')}
                    disabled={saving}
                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={14} />
                    Hazırdır
                  </button>
                </div>
                <button onClick={onClose} className="w-full py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  Ləğv et
                </button>
              </>
            ) : (
              /* Repair: xərc + okay */
              <>
                <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  Ləğv et
                </button>
                <button
                  onClick={() => handleComplete('AVAILABLE')}
                  disabled={saving}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  {saving ? 'Tamamlanır...' : 'Okay'}
                </button>
              </>
            )
          ) : (
            /* Tamamlandıqdan sonra */
            <>
              <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                Bağla
              </button>
              {cost && parseFloat(cost) > 0 && (
                <button
                  onClick={handlePrintAndClose}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Printer size={14} />
                  Qaimə çap et
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
