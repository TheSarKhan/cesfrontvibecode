import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Receipt, CheckCircle, Clock, BarChart3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { accountingApi } from '../../api/accounting'

const fmtMoney = (v) => v != null
  ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼'
  : '0.00 ₼'

function StatCard({ icon: Icon, label, value, color, sub }) {
  const colors = {
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} />
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
      {sub && <p className="text-[10px] mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

export default function AccountingReportsPage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      accountingApi.getSummary(),
      accountingApi.getAll(),
    ]).then(([sumRes, invRes]) => {
      setSummary(sumRes.data?.data || null)
      setInvoices(invRes.data?.data || [])
    }).catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    if (!invoices.length) return { approved: 0, pending: 0, approvedAmount: 0, pendingAmount: 0, byMonth: [] }
    const approved = invoices.filter(i => i.status === 'APPROVED')
    const pending = invoices.filter(i => i.status === 'SENT')

    // Group by month
    const monthMap = {}
    invoices.filter(i => i.type === 'INCOME').forEach(inv => {
      const key = inv.invoiceDate ? inv.invoiceDate.slice(0, 7) : 'unknown'
      if (!monthMap[key]) monthMap[key] = { income: 0, expense: 0, count: 0 }
      monthMap[key].income += parseFloat(inv.amount || 0)
      monthMap[key].count++
    })
    invoices.filter(i => i.type !== 'INCOME').forEach(inv => {
      const key = inv.invoiceDate ? inv.invoiceDate.slice(0, 7) : 'unknown'
      if (!monthMap[key]) monthMap[key] = { income: 0, expense: 0, count: 0 }
      monthMap[key].expense += parseFloat(inv.amount || 0)
    })
    const byMonth = Object.entries(monthMap)
      .filter(([k]) => k !== 'unknown')
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)

    return {
      approved: approved.length,
      pending: pending.length,
      approvedAmount: approved.reduce((s, i) => s + parseFloat(i.amount || 0), 0),
      pendingAmount: pending.reduce((s, i) => s + parseFloat(i.amount || 0), 0),
      byMonth,
    }
  }, [invoices])

  const maxBar = useMemo(() => {
    if (!stats.byMonth.length) return 1
    return Math.max(...stats.byMonth.map(([, v]) => Math.max(v.income, v.expense)), 1)
  }, [stats.byMonth])

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/accounting')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Hesabat</h1>
          <p className="text-sm text-gray-400">Maliyyə analitikası və statistikalar</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Ümumi gəlir" value={fmtMoney(summary?.totalIncome)} color="green"
          sub={`${summary?.incomeCount || 0} qaimə`} />
        <StatCard icon={TrendingDown} label="Ümumi xərc" value={fmtMoney(summary?.totalExpense)} color="red"
          sub={`${(summary?.contractorExpenseCount || 0) + (summary?.companyExpenseCount || 0)} qaimə`} />
        <StatCard icon={DollarSign} label="Xalis mənfəət" value={fmtMoney(summary?.netProfit)} color={summary?.netProfit >= 0 ? 'green' : 'red'} />
        <StatCard icon={Receipt} label="Ümumi qaimə" value={invoices.length} color="amber" />
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Qaimə statusları</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Təsdiqlənmiş</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-green-600">{stats.approved}</span>
                <span className="text-xs text-gray-400 ml-2">{fmtMoney(stats.approvedAmount)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-amber-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Gözləyən</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-amber-600">{stats.pending}</span>
                <span className="text-xs text-gray-400 ml-2">{fmtMoney(stats.pendingAmount)}</span>
              </div>
            </div>
            {stats.approved + stats.pending > 0 && (
              <div className="mt-2 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
                <div className="bg-green-500 h-full transition-all" style={{ width: `${(stats.approved / (stats.approved + stats.pending)) * 100}%` }} />
                <div className="bg-amber-400 h-full transition-all" style={{ width: `${(stats.pending / (stats.approved + stats.pending)) * 100}%` }} />
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Xərc təsnifatı</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Podratçı ödənişləri</span>
              <span className="text-sm font-bold text-blue-600">{fmtMoney(summary?.totalContractorExpense)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Şirkət xərcləri</span>
              <span className="text-sm font-bold text-red-600">{fmtMoney(summary?.totalCompanyExpense)}</span>
            </div>
            {summary?.totalExpense > 0 && (
              <div className="mt-2 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
                <div className="bg-blue-500 h-full" style={{ width: `${(summary.totalContractorExpense / summary.totalExpense) * 100}%` }} />
                <div className="bg-red-400 h-full" style={{ width: `${(summary.totalCompanyExpense / summary.totalExpense) * 100}%` }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monthly chart */}
      {stats.byMonth.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Aylıq gəlir / xərc</h3>
          <div className="flex items-end gap-3 h-40">
            {stats.byMonth.map(([month, data]) => {
              const label = new Date(month + '-01').toLocaleDateString('az-AZ', { month: 'short', year: '2-digit' })
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end gap-0.5 justify-center" style={{ height: 120 }}>
                    <div
                      className="w-5 bg-green-400 dark:bg-green-500 rounded-t transition-all"
                      style={{ height: `${(data.income / maxBar) * 100}%`, minHeight: data.income > 0 ? 4 : 0 }}
                      title={`Gəlir: ${fmtMoney(data.income)}`}
                    />
                    <div
                      className="w-5 bg-red-400 dark:bg-red-500 rounded-t transition-all"
                      style={{ height: `${(data.expense / maxBar) * 100}%`, minHeight: data.expense > 0 ? 4 : 0 }}
                      title={`Xərc: ${fmtMoney(data.expense)}`}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">{label}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-400" />
              <span className="text-[10px] text-gray-500">Gəlir</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-400" />
              <span className="text-[10px] text-gray-500">Xərc</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
