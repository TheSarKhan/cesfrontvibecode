import DateInput from '../../components/common/DateInput'
import { useState, useEffect } from 'react'
import { Plus, Trash2, CreditCard, CheckCircle, Lock, AlertCircle } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'

const fmtMoney = (v) =>
  v != null ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼' : '—'

const fmt = (d) => (d ? new Date(d).toLocaleDateString('az-AZ') : '—')

/**
 * Podratçı / investor texnikasına aid layihələrdə ödəniş tarixçəsi.
 *
 * Props:
 *   project      — ProjectResponse
 *   planAmount   — BigDecimal (contractorPayment — plan məbləği)
 *   readOnly     — boolean
 */
export default function ProjectPaymentTab({ project, planAmount, readOnly }) {
  const { confirm, ConfirmDialog } = useConfirm()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)

  // Add form
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().substring(0, 10)
  )
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)

  const load = async () => {
    try {
      const res = await projectsApi.getPaymentEntries(project.id)
      setEntries(res.data?.data || [])
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [project.id])

  const paid = entries.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
  const plan = parseFloat(planAmount || 0)
  const remaining = plan - paid
  const pct = plan > 0 ? Math.min((paid / plan) * 100, 100) : 0
  const isClosed = entries.length > 0 && entries.every((e) => e.closed)
  const canClose = !isClosed && !readOnly && (plan <= 0 || paid >= plan)

  const handleAdd = async () => {
    if (!amount || parseFloat(amount) <= 0) return toast.error('Məbləğ daxil edin')
    if (!paymentDate) return toast.error('Tarix seçin')
    setAdding(true)
    try {
      await projectsApi.addPaymentEntry(project.id, {
        amount: parseFloat(amount),
        paymentDate,
        note: note.trim() || null,
      })
      toast.success('Ödəniş əlavə edildi')
      setAmount('')
      setNote('')
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (entry) => {
    if (
      !(await confirm({
        title: 'Ödənişi sil',
        message: `${fmtMoney(entry.amount)} — ${fmt(entry.paymentDate)} silinsin?`,
      }))
    )
      return
    try {
      await projectsApi.deletePaymentEntry(project.id, entry.id)
      toast.success('Ödəniş silindi')
      load()
    } catch {
      toast.error('Silinmədi')
    }
  }

  const handleClose = async () => {
    if (
      !(await confirm({
        title: 'Ödəniş qaiməsini bağla',
        message: `Cəmi ${fmtMoney(paid)} ödənib. Ödəniş seriyasını bağlamaq istəyirsiniz?`,
        confirmText: 'Bağla',
      }))
    )
      return
    setClosing(true)
    try {
      await projectsApi.closePayment(project.id)
      toast.success('Ödəniş bağlandı')
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    } finally {
      setClosing(false)
    }
  }

  if (loading)
    return (
      <div className="py-10 text-center text-sm text-gray-400 animate-pulse">
        Yüklənir...
      </div>
    )

  const ownerLabel =
    project.ownershipType === 'CONTRACTOR'
      ? project.contractorName || 'Podratçı'
      : project.investorName || 'İnvestor'

  return (
    <div className="space-y-4">
      {/* ── Status banner ── */}
      {isClosed && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
          <CheckCircle size={14} />
          Ödəniş seriyası bağlanmışdır
        </div>
      )}

      {/* ── Plan / Ödənilmiş / Qalıq ── */}
      <div className="rounded-xl border border-orange-100 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-orange-50">
          <CreditCard size={13} className="text-orange-500" />
          <span className="text-xs font-semibold text-orange-700">
            {project.ownershipType === 'CONTRACTOR' ? 'Podratçı' : 'İnvestor'} Ödənişləri
          </span>
          <span className="ml-auto text-[10px] font-medium text-orange-500 truncate max-w-[140px]">
            {ownerLabel}
          </span>
        </div>

        {/* Progress */}
        {plan > 0 && (
          <div className="px-3 pt-3 pb-1">
            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
              <span>Ödənilmiş: <strong className="text-gray-700">{fmtMoney(paid)}</strong></span>
              <span>Plan: <strong className="text-gray-700">{fmtMoney(plan)}</strong></span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-500',
                  pct >= 100 ? 'bg-green-500' : 'bg-orange-400'
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] mt-1">
              <span className="text-gray-400">{pct.toFixed(0)}% ödənilib</span>
              {remaining > 0 ? (
                <span className="text-orange-500 font-medium">Qalıq: {fmtMoney(remaining)}</span>
              ) : (
                <span className="text-green-500 font-medium">Tam ödənilib ✓</span>
              )}
            </div>
          </div>
        )}

        {/* Siyahı */}
        <div className="divide-y divide-gray-100 mt-1">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-6 text-gray-400">
              <AlertCircle size={20} className="opacity-40" />
              <p className="text-xs">Hələ ödəniş qeydedilməyib</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2.5',
                  entry.closed && 'bg-green-50/40'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-orange-600">
                      {fmtMoney(entry.amount)}
                    </span>
                    <span className="text-[10px] text-gray-400">{fmt(entry.paymentDate)}</span>
                    {entry.closed && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-green-600 bg-green-100 border border-green-200 px-1.5 py-0.5 rounded-full">
                        <Lock size={8} />
                        Bağlı
                      </span>
                    )}
                  </div>
                  {entry.note && (
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{entry.note}</p>
                  )}
                </div>
                {!readOnly && !entry.closed && (
                  <button
                    onClick={() => handleDelete(entry)}
                    className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Əlavə formu */}
        {!readOnly && !isClosed && (
          <div className="px-3 py-2.5 border-t border-orange-100 bg-white space-y-2">
            <div className="flex gap-2">
              <DateInput
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-32 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Məbləğ (₼)"
                min="0"
                step="0.01"
                className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
              <button
                onClick={handleAdd}
                disabled={adding}
                className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg transition-colors flex-shrink-0"
              >
                <Plus size={13} />
              </button>
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Qeyd (isteğe bağlı)"
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>
        )}
      </div>

      {/* Cəmi */}
      {entries.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 text-xs">
          <span className="text-gray-500">{entries.length} ödəniş girişi</span>
          <span className="font-bold text-orange-600">{fmtMoney(paid)}</span>
        </div>
      )}

      {/* Bağla düyməsi */}
      {canClose && (
        <button
          onClick={handleClose}
          disabled={closing}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-orange-400 bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-bold transition-colors disabled:opacity-50"
        >
          <Lock size={14} />
          {closing ? 'Bağlanır...' : 'Ödəniş Qaiməsini Bağla'}
        </button>
      )}

      <ConfirmDialog />
    </div>
  )
}
