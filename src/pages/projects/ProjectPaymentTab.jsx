import DateInput from '../../components/common/DateInput'
import { useState, useEffect } from 'react'
import { Plus, Trash2, CreditCard, CheckCircle, Lock, AlertCircle } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { fmtDate } from '../../utils/date'
import NumberInput from '../../components/common/NumberInput'

const fmtMoney = (v) =>
  v != null ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼' : '—'

const fmt = fmtDate

export default function ProjectPaymentTab({ project, planAmount, readOnly }) {
  const { confirm, ConfirmDialog } = useConfirm()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)

  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().substring(0, 10))
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)

  const load = async () => {
    try {
      const res = await projectsApi.getPaymentEntries(project.id)
      setEntries(res.data?.data || [])
    } catch {
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
    if (!(await confirm({ title: 'Ödənişi sil', message: `${fmtMoney(entry.amount)} — ${fmt(entry.paymentDate)} silinsin?` }))) return
    try {
      await projectsApi.deletePaymentEntry(project.id, entry.id)
      toast.success('Ödəniş silindi')
      load()
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Silinmədi')
    }
  }

  const handleClose = async () => {
    if (!(await confirm({
      title: 'Ödəniş qaiməsini bağla',
      message: `Cəmi ${fmtMoney(paid)} ödənib. Ödəniş seriyasını bağlamaq istəyirsiniz?`,
      confirmText: 'Bağla',
    }))) return
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <span style={{ width: 22, height: 22, border: '2px solid var(--ces-line)', borderTopColor: 'var(--ces-gold)', borderRadius: 999, animation: 'ces-spin .8s linear infinite' }} />
      </div>
    )
  }

  const ownerLabel = project.ownershipType === 'CONTRACTOR'
    ? project.contractorName || 'Podratçı'
    : project.investorName || 'İnvestor'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Closed banner */}
      {isClosed && (
        <div className="ces-alert" style={{ borderLeftColor: 'var(--ces-ok)', background: 'var(--ces-ok-100)' }}>
          <div className="ces-al-ic" style={{ background: '#e8fbe5', color: 'var(--ces-ok)' }}>
            <CheckCircle size={16} />
          </div>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ces-ok)' }}>
            Ödəniş seriyası bağlanmışdır
          </p>
        </div>
      )}

      {/* Card */}
      <div style={{ border: '1px solid #fbe6c1', borderRadius: 14, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', background: 'var(--ces-gold-50)',
          }}
        >
          <CreditCard size={14} style={{ color: 'var(--ces-gold-700)' }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ces-gold-700)' }}>
            {project.ownershipType === 'CONTRACTOR' ? 'Podratçı' : 'İnvestor'} ödənişləri
          </span>
          <span className="truncate" style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 500, color: 'var(--ces-gold-700)', maxWidth: 160 }}>
            {ownerLabel}
          </span>
        </div>

        {/* Progress */}
        {plan > 0 && (
          <div style={{ padding: '12px 14px 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ces-muted)', marginBottom: 6 }}>
              <span>Ödənilmiş: <strong className="mono" style={{ color: 'var(--ces-graphite)' }}>{fmtMoney(paid)}</strong></span>
              <span>Plan: <strong className="mono" style={{ color: 'var(--ces-graphite)' }}>{fmtMoney(plan)}</strong></span>
            </div>
            <div style={{ height: 8, background: 'var(--ces-graphite-100)', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: pct >= 100 ? 'var(--ces-ok)' : 'var(--ces-gold)',
                  borderRadius: 999,
                  transition: 'width .5s, background .25s',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 6 }}>
              <span style={{ color: 'var(--ces-mute2)' }}>{pct.toFixed(0)}% ödənilib</span>
              {remaining > 0 ? (
                <span style={{ color: 'var(--ces-gold-700)', fontWeight: 600 }} className="mono">
                  Qalıq: {fmtMoney(remaining)}
                </span>
              ) : (
                <span style={{ color: 'var(--ces-ok)', fontWeight: 600 }}>Tam ödənilib ✓</span>
              )}
            </div>
          </div>
        )}

        {/* Entries */}
        <div style={{ marginTop: 8 }}>
          {entries.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 24, color: 'var(--ces-mute2)' }}>
              <AlertCircle size={22} style={{ opacity: 0.5 }} />
              <p style={{ fontSize: 12.5 }}>Hələ ödəniş qeydedilməyib</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px',
                  borderTop: '1px solid var(--ces-line-2)',
                  background: entry.closed ? 'var(--ces-ok-100)' : 'var(--ces-surface)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="mono" style={{ fontSize: 13, fontWeight: 800, color: 'var(--ces-gold-700)' }}>
                      {fmtMoney(entry.amount)}
                    </span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ces-mute2)' }}>
                      {fmt(entry.paymentDate)}
                    </span>
                    {entry.closed && (
                      <span className="ces-pill ces-p-ok sm">
                        <Lock size={9} />
                        Bağlı
                      </span>
                    )}
                  </div>
                  {entry.note && (
                    <p className="truncate" style={{ fontSize: 11, color: 'var(--ces-mute2)', marginTop: 3 }}>{entry.note}</p>
                  )}
                </div>
                {!readOnly && !entry.closed && (
                  <button onClick={() => handleDelete(entry)} className="ces-row-act danger">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add form */}
        {!readOnly && !isClosed && (
          <div style={{ padding: '12px 14px', borderTop: '1px solid #fbe6c1', background: 'var(--ces-surface)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <div className="ces-input sm" style={{ width: 130, flexShrink: 0 }}>
                <DateInput
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 13, padding: '8px 0', width: '100%' }}
                />
              </div>
              <div className="ces-input sm" style={{ flex: 1, minWidth: 0 }}>
                <NumberInput
                  decimal
                  className="mono"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder="Məbləğ (₼)"
                  min="0"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={adding}
                className="ces-btn ces-btn-sm"
                style={{ background: 'var(--ces-gold)', color: 'var(--ces-on-gold)' }}
              >
                <Plus size={13} />
              </button>
            </div>
            <div className="ces-input sm">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Qeyd (isteğe bağlı)"
              />
            </div>
          </div>
        )}
      </div>

      {/* Total */}
      {entries.length > 0 && (
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderRadius: 12,
            background: 'var(--ces-graphite-50)', border: '1px solid var(--ces-line)',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--ces-muted)' }}>{entries.length} ödəniş girişi</span>
          <span className="mono" style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ces-gold-700)' }}>{fmtMoney(paid)}</span>
        </div>
      )}

      {/* Close button */}
      {canClose && (
        <button
          onClick={handleClose}
          disabled={closing}
          className="ces-btn"
          style={{
            background: 'var(--ces-surface)',
            border: '1.5px solid var(--ces-gold)',
            color: 'var(--ces-gold-700)',
            justifyContent: 'center',
            padding: '13px 16px',
          }}
        >
          {closing
            ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : <Lock size={14} />}
          {closing ? 'Bağlanır...' : 'Ödəniş qaiməsini bağla'}
        </button>
      )}

      <ConfirmDialog />
    </div>
  )
}
