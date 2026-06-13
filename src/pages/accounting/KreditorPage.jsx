import React, { useState, useEffect } from 'react'
import {
  ArrowLeft, Search, AlertCircle, Clock,
  CheckCircle, Plus, ChevronDown, ChevronUp, FileText, Lock,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { accountingApi } from '../../api/accounting'
import toast from 'react-hot-toast'
import DateInput from '../../components/common/DateInput'
import { fmtDate } from '../../utils/date'
import { PageHeader, Pill, TableWrap, Field, Input, Select, Textarea } from './_shared'
import { fmtMoney } from './_constants'

const fmt = fmtDate

const STATUS_TONE = {
  PENDING:   'info',
  PARTIAL:   'warn',
  OVERDUE:   'danger',
  COMPLETED: 'ok',
}
const STATUS_LABEL = {
  PENDING:   'Gözləyir',
  PARTIAL:   'Qismən Ödənilib',
  OVERDUE:   'Gecikib',
  COMPLETED: 'Yekunlaşıb',
}

export default function KreditorPage() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [stats, setStats] = useState({ totalPayable: 0, totalPaid: 0, overdueCount: 0, pendingCount: 0 })
  const [payForm, setPayForm] = useState({
    invoiceId: '', amount: '', paymentDate: new Date().toISOString().substring(0, 10), note: '',
  })
  const [payLoading, setPayLoading] = useState(false)

  const loadPayables = async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter !== 'ALL') params.status = statusFilter
      if (searchQuery) params.search = searchQuery

      const res = await accountingApi.getPayables(params)
      const items = res.data?.data?.content || []
      setData(items)

      let tp = 0, tpaid = 0, oc = 0, pc = 0
      items.forEach(item => {
        tp += item.totalAmount || 0
        tpaid += item.paidAmount || 0
        if (item.status === 'OVERDUE') oc++
        if (item.status === 'PENDING' || item.status === 'PARTIAL') pc++
      })
      setStats({ totalPayable: tp, totalPaid: tpaid, overdueCount: oc, pendingCount: pc })
    } catch {
      toast.error('Kreditor məlumatları gətirilərkən xəta baş verdi')
    } finally { setLoading(false) }
  }

  useEffect(() => { loadPayables() }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadSingle = async (id) => {
    try {
      const res = await accountingApi.getPayable(id)
      setData(prev => prev.map(item => item.id === id ? res.data.data : item))
    } catch { toast.error('Məlumat yenilənə bilmədi') }
  }

  const handleExpand = (id) => {
    if (expandedId === id) setExpandedId(null)
    else { setExpandedId(id); loadSingle(id) }
  }

  const handleAddPayment = async (e, payableId) => {
    e.preventDefault()
    if (!payForm.invoiceId) return toast.error('Qaimə seçilməlidir')
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) return toast.error('Məbləğ düzgün deyil')

    setPayLoading(true)
    try {
      await accountingApi.addPayablePayment(payableId, {
        invoiceId: parseInt(payForm.invoiceId),
        amount: parseFloat(payForm.amount),
        paymentDate: payForm.paymentDate,
        note: payForm.note,
      })
      toast.success('Ödəniş uğurla əlavə edildi')
      setPayForm({ invoiceId: '', amount: '', paymentDate: new Date().toISOString().substring(0, 10), note: '' })
      await loadSingle(payableId)
    } catch (err) { toast.error(err?.response?.data?.message || 'Ödəniş xətası') }
    finally { setPayLoading(false) }
  }

  const handleDeletePayment = async (payableId, paymentId) => {
    if (!window.confirm('Bu ödənişi silmək istədiyinizə əminsiniz?')) return
    try { await accountingApi.deletePayablePayment(payableId, paymentId); toast.success('Ödəniş silindi'); await loadSingle(payableId) }
    catch { toast.error('Silmə zamanı xəta') }
  }

  const handleComplete = async (payableId) => {
    if (!window.confirm('Borcu tam olaraq bağlamaq istəyirsiniz?')) return
    try { await accountingApi.completePayable(payableId); toast.success('Kreditor tam olaraq yekunlaşdırıldı'); await loadSingle(payableId) }
    catch { toast.error('Xəta baş verdi') }
  }


  return (
    <div style={{ color: 'var(--ces-ink)' }}>
      <PageHeader
        eyebrow="Mühasibatlıq"
        title="Kreditor"
        subtitle="Podratçı və investor ödənişlərinin izlənməsi"
        right={<button onClick={() => navigate('/accounting')} className="ces-btn ces-btn-outline ces-btn-sm">
          <ArrowLeft size={14} /> Geri
        </button>}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        <KpiBlock label="Ümumi Ödənilməli" value={fmtMoney(stats.totalPayable)} color="var(--ces-graphite-900)" />
        <KpiBlock label="İndiyə qədər ödənilib" value={fmtMoney(stats.totalPaid)} color="var(--ces-ok)" />
        <KpiBlock label="Gecikmiş Ödənişlər" value={`${stats.overdueCount} qeyd`} color="var(--ces-danger)"
          tone="danger" icon={AlertCircle} />
        <KpiBlock label="Gözləyən/Qismən" value={`${stats.pendingCount} qeyd`} color="var(--ces-info)"
          tone="info" icon={Clock} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between mb-4">
        <div className="flex gap-1 p-0.5 w-full sm:w-auto overflow-x-auto"
          style={{ background: 'var(--ces-graphite-50)', border: '1px solid var(--ces-line)', borderRadius: '10px' }}>
          {['ALL', 'PENDING', 'PARTIAL', 'OVERDUE', 'COMPLETED'].map(status => {
            const on = statusFilter === status
            return (
              <button key={status} onClick={() => setStatusFilter(status)}
                className="px-4 py-1.5 text-[11.5px] font-semibold whitespace-nowrap transition-colors"
                style={{
                  background: on ? 'var(--ces-surface)' : 'transparent',
                  color: on ? 'var(--ces-graphite)' : 'var(--ces-muted)',
                  boxShadow: on ? 'var(--ces-shadow-sm)' : 'none',
                  borderRadius: '8px',
                }}>
                {status === 'ALL' ? 'Hamısı' :
                 status === 'PENDING' ? 'Gözləyir' :
                 status === 'PARTIAL' ? 'Qismən' :
                 status === 'OVERDUE' ? 'Gecikib' : 'Yekunlaşıb'}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2 sm:w-72"
          style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '10px', padding: '0 12px', minHeight: '40px' }}>
          <Search size={14} style={{ color: 'var(--ces-mute2)' }} />
          <input
            placeholder="Layihə, podratçı və ya investor axtar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadPayables()}
            className="flex-1 outline-none bg-transparent text-[13px]"
          />
        </div>
      </div>

      {/* Table */}
      <TableWrap>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8" style={{ border: '3px solid var(--ces-line)', borderTopColor: 'var(--ces-gold)' }} />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64" style={{ color: 'var(--ces-mute2)' }}>
            <FileText size={48} className="mb-4 opacity-30" />
            <p className="text-[13px] font-semibold">Məlumat tapılmadı</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ces-tbl w-full">
              <thead>
                <tr>
                  <th>Layihə / Texnika</th>
                  <th>Podratçı / İnvestor</th>
                  <th>Ümumi Məbləğ</th>
                  <th>Ödənilib / Qalıq</th>
                  <th className="r">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map(item => {
                  const rem = item.totalAmount - item.paidAmount
                  const isExpanded = expandedId === item.id
                  return (
                    <React.Fragment key={item.id}>
                      <tr onClick={() => handleExpand(item.id)} className="cursor-pointer"
                        style={{ background: isExpanded ? 'var(--ces-gold-50)' : 'transparent' }}>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="text-[11.5px] font-mono font-bold" style={{ color: 'var(--ces-muted)' }}>{item.projectCode}</span>
                            <div>
                              <p className="font-bold text-[13.5px]" style={{ color: 'var(--ces-ink)' }}>{item.projectName || '—'}</p>
                              <p className="text-[11px]" style={{ color: 'var(--ces-mute2)' }}>{item.equipmentName || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <p className="font-medium" style={{ color: 'var(--ces-ink)' }}>{item.payeeName || '—'}</p>
                          <p className="text-[11px]" style={{ color: 'var(--ces-mute2)' }}>{item.payeeVoen || '—'}</p>
                        </td>
                        <td>
                          <span className="font-bold num" style={{ color: 'var(--ces-warn)' }}>{fmtMoney(item.totalAmount)}</span>
                        </td>
                        <td>
                          <p className="font-bold num" style={{ color: 'var(--ces-ok)' }}>{fmtMoney(item.paidAmount)}</p>
                          {rem > 0 && <p className="text-[11px] font-medium num" style={{ color: 'var(--ces-warn)' }}>Qalıq: {fmtMoney(rem)}</p>}
                        </td>
                        <td className="r">
                          <div className="flex items-center justify-end gap-2">
                            <Pill tone={STATUS_TONE[item.status] || 'muted'} sm dot>{STATUS_LABEL[item.status]}</Pill>
                            {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--ces-mute2)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ces-mute2)' }} />}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr style={{ background: 'var(--ces-graphite-50)' }}>
                          <td colSpan={5} className="p-6">
                            <div className="max-w-5xl space-y-6">
                              {/* Progress bar */}
                              <div className="p-4"
                                style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '12px' }}>
                                <div className="flex justify-between text-[11px] font-medium mb-2" style={{ color: 'var(--ces-muted)' }}>
                                  <span>Ödənilmiş %</span>
                                  <span className="num">{item.totalAmount > 0 ? ((item.paidAmount / item.totalAmount) * 100).toFixed(1) : 0}%</span>
                                </div>
                                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--ces-graphite-100)' }}>
                                  <div
                                    className="h-full transition-all"
                                    style={{
                                      width: `${item.totalAmount > 0 ? Math.min((item.paidAmount / item.totalAmount) * 100, 100) : 0}%`,
                                      background: rem <= 0 ? 'var(--ces-ok)' : 'var(--ces-warn)',
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Invoices + payments */}
                                <div className="md:col-span-2 space-y-3">
                                  <h3 className="text-[10.5px] font-bold uppercase tracking-[.16em]" style={{ color: 'var(--ces-muted)' }}>
                                    Bu Layihə üzrə Qaimələr
                                  </h3>
                                  <div className="overflow-hidden"
                                    style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '12px' }}>
                                    {!item.invoices?.length ? (
                                      <div className="p-4 text-center text-[12px]" style={{ color: 'var(--ces-mute2)' }}>
                                        Hələ qaimə kəsilməyib
                                      </div>
                                    ) : (
                                      <div className="overflow-x-auto">
                                        <table className="ces-tbl w-full text-[11px]">
                                          <thead>
                                            <tr>
                                              <th>No / Tarix</th>
                                              <th className="r">Məbləğ</th>
                                              <th className="r">Ödənilib</th>
                                              <th className="r">Qalıq</th>
                                              <th>Status</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {item.invoices.map(inv => (
                                              <tr key={inv.id}>
                                                <td>
                                                  <p className="font-bold" style={{ color: 'var(--ces-ink)' }}>{inv.invoiceNumber || inv.accountingId || `#${inv.id}`}</p>
                                                  <p style={{ color: 'var(--ces-mute2)' }}>{fmt(inv.invoiceDate)}</p>
                                                </td>
                                                <td className="r font-medium num">{fmtMoney(inv.amount)}</td>
                                                <td className="r num" style={{ color: 'var(--ces-ok)' }}>{fmtMoney(inv.paidAmount)}</td>
                                                <td className="r font-bold num" style={{ color: 'var(--ces-danger)' }}>{fmtMoney(inv.remainingAmount)}</td>
                                                <td>
                                                  {inv.remainingAmount <= 0
                                                    ? <Pill tone="ok" sm>Ödənilib</Pill>
                                                    : <Pill tone="warn" sm>Gözləyir</Pill>}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>

                                  <h3 className="text-[10.5px] font-bold uppercase tracking-[.16em] mt-6" style={{ color: 'var(--ces-muted)' }}>
                                    Ödəniş Tarixçəsi
                                  </h3>
                                  <div className="overflow-hidden"
                                    style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '12px' }}>
                                    {!item.payments?.length ? (
                                      <div className="p-4 text-center text-[12px]" style={{ color: 'var(--ces-mute2)' }}>Hələ ödəniş edilməyib</div>
                                    ) : (
                                      <div>
                                        {item.payments.map((p, i) => (
                                          <div key={p.id} className="flex items-center justify-between p-3 text-[12px]"
                                            style={{ borderBottom: i < item.payments.length - 1 ? '1px solid var(--ces-line-2)' : 'none' }}>
                                            <div className="flex flex-col">
                                              <div className="flex items-center gap-2">
                                                <span className="font-bold num" style={{ color: 'var(--ces-ink)' }}>{fmtMoney(p.amount)}</span>
                                                {p.invoiceId && <Pill tone="muted" sm>Qaimə üzrə</Pill>}
                                              </div>
                                              <span className="text-[10.5px]" style={{ color: 'var(--ces-mute2)' }}>
                                                {fmt(p.paymentDate)} {p.note && `• ${p.note}`}
                                              </span>
                                            </div>
                                            {item.status !== 'COMPLETED' && (
                                              <button onClick={() => handleDeletePayment(item.id, p.id)} className="ces-row-act danger">
                                                Sil
                                              </button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* New payment form */}
                                <div className="space-y-3">
                                  <h3 className="text-[10.5px] font-bold uppercase tracking-[.16em]" style={{ color: 'var(--ces-muted)' }}>
                                    Yeni Ödəniş Əlavə Et
                                  </h3>
                                  {item.status === 'COMPLETED' ? (
                                    <div className="p-4 flex flex-col items-center justify-center text-center gap-2"
                                      style={{ background: '#e8fbe5', border: '1px solid rgba(15,157,106,.2)', borderRadius: '12px' }}>
                                      <CheckCircle size={28} style={{ color: 'var(--ces-ok)' }} />
                                      <p className="text-[12.5px] font-bold" style={{ color: 'var(--ces-ok)' }}>Tam yekunlaşdırılıb</p>
                                    </div>
                                  ) : (
                                    <form onSubmit={(e) => handleAddPayment(e, item.id)}
                                      className="p-4 space-y-3"
                                      style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '12px' }}>
                                      <Field label="Qaimə Seçin" required>
                                        <Select value={payForm.invoiceId} onChange={(e) => setPayForm({ ...payForm, invoiceId: e.target.value })}>
                                          <option value="">-- Qaimə seçin --</option>
                                          {item.invoices?.filter(inv => inv.remainingAmount > 0).map(inv => {
                                            const label = inv.invoiceNumber || inv.accountingId || `#${inv.id}`
                                            return (
                                              <option key={inv.id} value={inv.id}>
                                                {label} ({fmtMoney(inv.remainingAmount)} qalıb)
                                              </option>
                                            )
                                          })}
                                          {item.invoices?.filter(inv => inv.remainingAmount <= 0).length > 0 && (
                                            <optgroup label="Ödənilmişlər">
                                              {item.invoices?.filter(inv => inv.remainingAmount <= 0).map(inv => {
                                                const label = inv.invoiceNumber || inv.accountingId || `#${inv.id}`
                                                return (
                                                  <option key={inv.id} value={inv.id}>{label} (Ödənilib)</option>
                                                )
                                              })}
                                            </optgroup>
                                          )}
                                        </Select>
                                      </Field>

                                      <Field label="Ödəniş Məbləği" required>
                                        <Input type="number" step="0.01" placeholder="Məbləğ"
                                          disabled={!payForm.invoiceId}
                                          value={payForm.amount}
                                          onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                                          suffix="₼" />
                                      </Field>

                                      <Field label="Ödəniş Tarixi">
                                        <div className="flex items-center px-[13px]"
                                          style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '11px', minHeight: '44px' }}>
                                          <DateInput value={payForm.paymentDate}
                                            onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
                                            className="flex-1 border-0 outline-0 bg-transparent text-[14px] py-[11px] w-full" />
                                        </div>
                                      </Field>

                                      <Field label="Qeyd">
                                        <Textarea rows={2} placeholder="Qeyd..." value={payForm.note}
                                          onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} />
                                      </Field>

                                      <button
                                        type="submit"
                                        disabled={payLoading || !payForm.invoiceId}
                                        className="ces-btn ces-btn-primary w-full"
                                      >
                                        <Plus size={14} /> Əlavə Et
                                      </button>
                                    </form>
                                  )}

                                  {item.status !== 'COMPLETED' && rem <= 0 && (
                                    <button
                                      onClick={() => handleComplete(item.id)}
                                      className="w-full py-2.5 text-[13px] font-bold rounded-[12px] transition-colors flex items-center justify-center gap-2"
                                      style={{ background: '#e8fbe5', color: 'var(--ces-ok)', border: '2px solid var(--ces-ok)' }}
                                    >
                                      <Lock size={14} /> Kreditoru Yekunlaşdır
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </TableWrap>
    </div>
  )
}

function KpiBlock({ label, value, color, tone, icon: Icon }) {
  const bg = tone === 'danger' ? '#fdeaef' : tone === 'info' ? '#e3edfb' : 'var(--ces-surface)'
  const border = tone === 'danger' ? 'rgba(212,56,90,.2)' : tone === 'info' ? 'rgba(37,99,200,.2)' : 'var(--ces-line)'
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 'var(--ces-radius-lg)',
        padding: '16px 18px',
        boxShadow: 'var(--ces-shadow-sm)',
      }}
    >
      <p className="text-[10.5px] font-bold uppercase tracking-[.14em] mb-1 flex items-center gap-1.5" style={{ color: 'var(--ces-muted)' }}>
        {Icon && <Icon size={12} style={{ color }} />}
        {label}
      </p>
      <p className="text-[22px] font-extrabold num" style={{ color }}>{value}</p>
    </div>
  )
}
