import { useState, useEffect } from 'react'
import { X, Star, TrendingDown, FileText, ChevronRight } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import { clsx } from 'clsx'

const fmt = (d) => d ? new Date(d).toLocaleDateString('az-AZ') : '—'
const fmtMoney = (v) => v != null
  ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼'
  : '—'

const RISK_COLOR = {
  LOW:    'bg-green-50 text-green-700 border-green-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH:   'bg-red-50 text-red-700 border-red-200',
}
const RISK_LABEL = { LOW: 'Aşağı', MEDIUM: 'Orta', HIGH: 'Yüksək' }
const STATUS_COLOR = {
  ACTIVE:   'bg-green-50 text-green-700 border-green-200',
  INACTIVE: 'bg-gray-100 text-gray-500 border-gray-200',
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 mr-4">{label}</span>
      <span className="text-xs font-medium text-gray-800 dark:text-gray-200 text-right">{value}</span>
    </div>
  )
}

export default function ContractorSlideOver({ contractor, onClose }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    accountingApi.getAll({ type: 'CONTRACTOR_EXPENSE' })
      .then(r => {
        const all = r.data.data || r.data || []
        setInvoices(all.filter(inv => inv.contractorId === contractor.id))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [contractor.id])

  const totalPaid = invoices.reduce((s, inv) => s + parseFloat(inv.amount || 0), 0)

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="min-w-0 flex-1 mr-3">
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 truncate">{contractor.companyName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{contractor.voen || 'VÖEN yoxdur'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Status + Risk */}
          <div className="flex items-center gap-2">
            <span className={clsx('px-2.5 py-1 rounded-lg text-xs font-semibold border', STATUS_COLOR[contractor.status] || STATUS_COLOR.ACTIVE)}>
              {contractor.status === 'ACTIVE' ? 'Aktiv' : 'Deaktiv'}
            </span>
            {contractor.riskLevel && (
              <span className={clsx('px-2.5 py-1 rounded-lg text-xs font-semibold border', RISK_COLOR[contractor.riskLevel] || RISK_COLOR.LOW)}>
                Risk: {RISK_LABEL[contractor.riskLevel] || contractor.riskLevel}
              </span>
            )}
            {contractor.rating != null && (
              <div className="flex items-center gap-1 ml-auto">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{parseFloat(contractor.rating).toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Əlaqə məlumatları */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">Əlaqə məlumatları</h3>
            <InfoRow label="Əlaqə şəxsi" value={contractor.contactPerson} />
            <InfoRow label="Telefon"      value={contractor.phone} />
            <InfoRow label="E-poçt"       value={contractor.email} />
            <InfoRow label="Ödəniş növü"  value={contractor.paymentType} />
            <InfoRow label="Bank"          value={contractor.bankName} />
            <InfoRow label="Hesab nömrəsi" value={contractor.bankAccount} />
          </div>

          {/* Qeydlər */}
          {contractor.notes && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Qeydlər</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">{contractor.notes}</p>
            </div>
          )}

          {/* B1 qaimələri — borc izləmə */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
                <TrendingDown size={13} className="text-orange-500" />
                Podratçı Qaimələri (B1)
              </h3>
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                Cəmi: −{fmtMoney(totalPaid)}
              </span>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />)}
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">
                <FileText size={28} className="mx-auto mb-2 opacity-30" />
                Bu podratçı üçün hələ B1 qaiməsi yoxdur
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map(inv => (
                  <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {inv.invoiceNumber ? (
                          <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">{inv.invoiceNumber}</span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Nömrəsiz</span>
                        )}
                        <span className="text-[10px] text-gray-400">{fmt(inv.invoiceDate)}</span>
                      </div>
                      {inv.equipmentName && <p className="text-[10px] text-gray-400 truncate">{inv.equipmentName}</p>}
                      {inv.projectCode && (
                        <p className="text-[10px] font-mono text-green-600 dark:text-green-400">{inv.projectCode}</p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400 shrink-0">
                      −{fmtMoney(inv.amount)}
                    </span>
                  </div>
                ))}

                {/* Cəmi */}
                <div className="flex items-center justify-between pt-2 border-t border-orange-200 dark:border-orange-800/50 mt-2">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{invoices.length} qaimə · Ümumi ödəniş</span>
                  <span className="text-base font-bold text-orange-600 dark:text-orange-400">−{fmtMoney(totalPaid)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
