import React, { useState, useEffect } from 'react'
import {
  ArrowLeft, Search, AlertCircle, Clock,
  CheckCircle, Plus, ChevronDown, ChevronUp, FileText, Lock
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { accountingApi } from '../../api/accounting'
import toast from 'react-hot-toast'
import DateInput from '../../components/common/DateInput'
import { clsx } from 'clsx'

const fmtMoney = (v) => v != null ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼' : '0.00 ₼'
const fmt = (d) => d ? new Date(d).toLocaleDateString('az-AZ') : '—'

export default function KreditorPage() {
  const navigate = useNavigate()

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const [expandedId, setExpandedId] = useState(null)

  // KPI stats
  const [stats, setStats] = useState({
    totalPayable: 0,
    totalPaid: 0,
    overdueCount: 0,
    pendingCount: 0
  })

  // Payment form state
  const [payForm, setPayForm] = useState({
    invoiceId: '',
    amount: '',
    paymentDate: new Date().toISOString().substring(0, 10),
    note: ''
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

    } catch (err) {
      toast.error('Kreditor məlumatları gətirilərkən xəta baş verdi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayables()
  }, [statusFilter])

  const loadSingle = async (id) => {
    try {
      const res = await accountingApi.getPayable(id)
      setData(prev => prev.map(item => item.id === id ? res.data.data : item))
    } catch (err) {
      toast.error('Məlumat yenilənə bilmədi')
    }
  }

  const handleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      loadSingle(id)
    }
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
        note: payForm.note
      })
      toast.success('Ödəniş uğurla əlavə edildi')
      setPayForm({
        invoiceId: '',
        amount: '',
        paymentDate: new Date().toISOString().substring(0, 10),
        note: ''
      })
      await loadSingle(payableId)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Ödəniş xətası')
    } finally {
      setPayLoading(false)
    }
  }

  const handleDeletePayment = async (payableId, paymentId) => {
    if (!window.confirm('Bu ödənişi silmək istədiyinizə əminsiniz?')) return

    try {
      await accountingApi.deletePayablePayment(payableId, paymentId)
      toast.success('Ödəniş silindi')
      await loadSingle(payableId)
    } catch (err) {
      toast.error('Silmə zamanı xəta')
    }
  }

  const handleComplete = async (payableId) => {
    if (!window.confirm('Borcu tam olaraq bağlamaq istəyirsiniz?')) return
    try {
      await accountingApi.completePayable(payableId)
      toast.success('Kreditor tam olaraq yekunlaşdırıldı')
      await loadSingle(payableId)
    } catch (err) {
      toast.error('Xəta baş verdi')
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold border border-blue-200">Gözləyir</span>
      case 'PARTIAL':
        return <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-md text-[10px] font-bold border border-amber-200">Qismən Ödənilib</span>
      case 'OVERDUE':
        return <span className="px-2 py-1 bg-red-50 text-red-600 rounded-md text-[10px] font-bold border border-red-200 flex items-center gap-1"><AlertCircle size={10}/> Gecikib</span>
      case 'COMPLETED':
        return <span className="px-2 py-1 bg-green-50 text-green-600 rounded-md text-[10px] font-bold border border-green-200 flex items-center gap-1"><CheckCircle size={10}/> Yekunlaşıb</span>
      default: return null
    }
  }

  const getDaysDiff = (dueDate) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/accounting')}
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Kreditor</h1>
          <p className="text-sm text-gray-400">Podratçı və investor ödənişlərinin izlənməsi</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Ümumi Ödənilməli</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fmtMoney(stats.totalPayable)}</p>
        </div>
        <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <p className="text-xs text-gray-500 uppercase font-bold mb-1">İndiyə qədər ödənilib</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{fmtMoney(stats.totalPaid)}</p>
        </div>
        <div className="p-4 rounded-2xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10">
          <p className="text-xs text-red-600 dark:text-red-400 uppercase font-bold mb-1 flex items-center gap-1.5"><AlertCircle size={14}/> Gecikmiş Ödənişlər</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-500">{stats.overdueCount} qeyd</p>
        </div>
        <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/10">
          <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-bold mb-1 flex items-center gap-1.5"><Clock size={14}/> Gözləyən/Qismən</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-500">{stats.pendingCount} qeyd</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          {['ALL', 'PENDING', 'PARTIAL', 'OVERDUE', 'COMPLETED'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={clsx(
                "px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
                statusFilter === status
                  ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              {status === 'ALL' ? 'Hamısı' :
               status === 'PENDING' ? 'Gözləyir' :
               status === 'PARTIAL' ? 'Qismən' :
               status === 'OVERDUE' ? 'Gecikib' : 'Yekunlaşıb'}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Layihə, podratçı və ya investor axtar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadPayables()}
            className="pl-9 pr-4 py-2 w-full sm:w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FileText size={48} className="mb-4 opacity-20" />
            <p>Məlumat tapılmadı</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50 dark:bg-gray-800/50">
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="font-semibold text-gray-500 px-4 py-3">Layihə / Texnika</th>
                  <th className="font-semibold text-gray-500 px-4 py-3">Podratçı / İnvestor</th>
                  <th className="font-semibold text-gray-500 px-4 py-3">Ümumi Məbləğ</th>
                  <th className="font-semibold text-gray-500 px-4 py-3">Ödənilib / Qalıq</th>
                  <th className="font-semibold text-gray-500 px-4 py-3">Müddət</th>
                  <th className="font-semibold text-gray-500 px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.map(item => {
                  const rem = item.totalAmount - item.paidAmount
                  const diffDays = getDaysDiff(item.dueDate)

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        onClick={() => handleExpand(item.id)}
                        className={clsx(
                          "group transition-colors cursor-pointer",
                          expandedId === item.id ? "bg-indigo-50/50 dark:bg-indigo-900/10" : "hover:bg-gray-50 dark:hover:bg-gray-750"
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400">{item.projectCode}</span>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-gray-100">{item.projectName || '—'}</p>
                              <p className="text-xs text-gray-500">{item.equipmentName || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-gray-200">{item.payeeName || '—'}</p>
                          <p className="text-xs text-gray-500">{item.payeeVoen || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-orange-500">{fmtMoney(item.totalAmount)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-green-500">{fmtMoney(item.paidAmount)}</p>
                          {rem > 0 && <p className="text-xs text-orange-500 font-medium">Qalıq: {fmtMoney(rem)}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium">{fmt(item.dueDate)}</p>
                          {item.status !== 'COMPLETED' && (
                            <p className={clsx("text-xs font-semibold mt-0.5", diffDays < 0 ? "text-red-500" : "text-amber-500")}>
                              {diffDays < 0 ? `${Math.abs(diffDays)} gün gecikib` : `${diffDays} gün qalıb`}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {getStatusBadge(item.status)}
                            {expandedId === item.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Section */}
                      {expandedId === item.id && (
                        <tr className="bg-gray-50/80 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700">
                          <td colSpan={6} className="p-6">
                            <div className="max-w-4xl space-y-6">
                              {/* Progress bar */}
                              <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between text-xs text-gray-500 font-medium mb-2">
                                  <span>Ödənilmiş %</span>
                                  <span>{item.totalAmount > 0 ? ((item.paidAmount / item.totalAmount) * 100).toFixed(1) : 0}%</span>
                                </div>
                                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                  <div
                                    className={clsx("h-full transition-all duration-500", rem <= 0 ? "bg-green-500" : "bg-orange-500")}
                                    style={{ width: `${item.totalAmount > 0 ? Math.min((item.paidAmount / item.totalAmount) * 100, 100) : 0}%` }}
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Qaimələr Siyahısı */}
                                <div className="md:col-span-2 space-y-3">
                                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Bu Layihə üzrə Qaimələr</h3>
                                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    {!item.invoices?.length ? (
                                      <div className="p-4 flex items-center justify-center border-t border-gray-100 text-xs text-gray-400">
                                        Hələ qaimə kəsilməyib
                                      </div>
                                    ) : (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-[10px] text-left">
                                          <thead className="bg-gray-50 dark:bg-gray-800">
                                            <tr>
                                              <th className="px-3 py-2 text-gray-500 uppercase">No / Tarix</th>
                                              <th className="px-3 py-2 text-gray-500 uppercase text-right">Məbləğ</th>
                                              <th className="px-3 py-2 text-gray-500 uppercase text-right">Ödənilib</th>
                                              <th className="px-3 py-2 text-gray-500 uppercase text-right">Qalıq</th>
                                              <th className="px-3 py-2 text-gray-500 uppercase text-center">Status</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {item.invoices.map(inv => (
                                              <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                <td className="px-3 py-2">
                                                  <p className="font-bold text-gray-900 dark:text-gray-100">{inv.invoiceNumber}</p>
                                                  <p className="text-gray-400">{fmt(inv.invoiceDate)}</p>
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium">{fmtMoney(inv.amount)}</td>
                                                <td className="px-3 py-2 text-right text-green-600">{fmtMoney(inv.paidAmount)}</td>
                                                <td className="px-3 py-2 text-right text-red-500 font-bold">{fmtMoney(inv.remainingAmount)}</td>
                                                <td className="px-3 py-2 text-center">
                                                  {inv.remainingAmount <= 0
                                                    ? <span className="text-green-500 font-bold">Ödənilib</span>
                                                    : <span className="text-amber-500 font-bold">Gözləyir</span>
                                                  }
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>

                                  {/* Ödəniş Tarixçəsi */}
                                  <div className="mt-6 space-y-3">
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Ödəniş Tarixçəsi</h3>
                                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                      {!item.payments?.length ? (
                                        <div className="p-4 flex items-center justify-center text-xs text-gray-400">Hələ ödəniş edilməyib</div>
                                      ) : (
                                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                          {item.payments.map(p => (
                                            <div key={p.id} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs">
                                              <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-bold text-gray-900 dark:text-gray-100">{fmtMoney(p.amount)}</span>
                                                  {p.invoiceId && <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[9px] text-gray-500 italic">Qaimə üzrə</span>}
                                                </div>
                                                <span className="text-[10px] text-gray-400">{fmt(p.paymentDate)} {p.note && `• ${p.note}`}</span>
                                              </div>
                                              {item.status !== 'COMPLETED' && (
                                                <button onClick={() => handleDeletePayment(item.id, p.id)} className="text-red-500 hover:text-red-700">Sil</button>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Yeni Ödəniş Formu */}
                                <div className="space-y-3">
                                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Yeni Ödəniş Əlavə Et</h3>
                                  {item.status === 'COMPLETED' ? (
                                    <div className="p-4 bg-green-50 rounded-xl border border-green-200 flex flex-col items-center justify-center text-center gap-2">
                                      <CheckCircle size={28} className="text-green-500" />
                                      <p className="text-xs font-bold text-green-700">Tam yekunlaşdırılıb</p>
                                    </div>
                                  ) : (
                                    <form onSubmit={(e) => handleAddPayment(e, item.id)} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 space-y-3">
                                      <div>
                                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Qaimə Seçin *</label>
                                        <select
                                          required
                                          value={payForm.invoiceId}
                                          onChange={e => setPayForm({ ...payForm, invoiceId: e.target.value })}
                                          className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                                        >
                                          <option value="">-- Qaimə seçin --</option>
                                          {item.invoices?.filter(inv => inv.remainingAmount > 0).map(inv => (
                                            <option key={inv.id} value={inv.id}>
                                              {inv.invoiceNumber} ({fmtMoney(inv.remainingAmount)} qalıb)
                                            </option>
                                          ))}
                                          {item.invoices?.filter(inv => inv.remainingAmount <= 0).length > 0 && (
                                            <optgroup label="Ödənilmişlər">
                                              {item.invoices?.filter(inv => inv.remainingAmount <= 0).map(inv => (
                                                <option key={inv.id} value={inv.id}>{inv.invoiceNumber} (Ödənilib)</option>
                                              ))}
                                            </optgroup>
                                          )}
                                        </select>
                                      </div>

                                      <div>
                                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Ödəniş Məbləği</label>
                                        <input
                                          required
                                          type="number"
                                          placeholder="Məbləğ (₼)"
                                          step="0.01"
                                          disabled={!payForm.invoiceId}
                                          value={payForm.amount}
                                          onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                                          className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                                        />
                                      </div>

                                      <DateInput
                                        value={payForm.paymentDate}
                                        onChange={e => setPayForm({ ...payForm, paymentDate: e.target.value })}
                                        className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg"
                                      />

                                      <textarea
                                        placeholder="Qeyd..."
                                        rows={2}
                                        value={payForm.note}
                                        onChange={e => setPayForm({ ...payForm, note: e.target.value })}
                                        className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg resize-none"
                                      />

                                      <button
                                        type="submit"
                                        disabled={payLoading || !payForm.invoiceId}
                                        className="w-full py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                      >
                                        <Plus size={16} /> Əlavə Et
                                      </button>
                                    </form>
                                  )}

                                  {item.status !== 'COMPLETED' && rem <= 0 && (
                                    <button
                                      onClick={() => handleComplete(item.id)}
                                      className="w-full py-2 border-2 border-green-500 text-green-600 font-bold rounded-xl text-sm hover:bg-green-50 transition-colors flex items-center justify-center gap-2 mt-4"
                                    >
                                      <Lock size={16} /> Kreditoru Yekunlaşdır (Bağla)
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
      </div>
    </div>
  )
}
