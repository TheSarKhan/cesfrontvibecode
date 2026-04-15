import { useState, useEffect, useMemo, useRef } from 'react'
import {
  ArrowLeft, TrendingUp, TrendingDown, DollarSign,
  Receipt, BarChart3, PieChart, LineChart, Target,
  Download, Printer, Calendar, Clock,
  Table as TableIcon, Users, Building2, LayoutDashboard, FileText
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { accountingApi } from '../../api/accounting'
import * as XLSX from 'xlsx'
import {
  BarChart, Bar, AreaChart, Area, PieChart as RePieChart, Pie, Cell,
  LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  Legend, ResponsiveContainer, ComposedChart
} from 'recharts'
import { clsx } from 'clsx'

const fmtMoney = (v) => v != null ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼' : '0.00 ₼'
const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

function StatCard({ icon: Icon, label, value, color, sub, changePercent }) {
  const colors = {
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  }
  return (
    <div className={`rounded-xl border p-4 transition-shadow hover:shadow-md ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={16} />
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</span>
        </div>
        {changePercent != null && changePercent !== 0 && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${changePercent > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {changePercent > 0 ? '↑' : '↓'} {Math.abs(changePercent).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-[10px] mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3">
      <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-3 text-xs mb-1 last:mb-0">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-700 dark:text-gray-300 flex-1">{p.name}:</span>
          <span className="font-bold text-gray-900 dark:text-gray-100">{fmtMoney(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function AccountingReportsPage() {
  const navigate = useNavigate()
  const printRef = useRef()

  const [dateRange, setDateRange] = useState('this_year') // this_month, last_month, this_year, custom
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  const [summary, setSummary] = useState(null)
  const [monthlyTrend, setMonthlyTrend] = useState([])
  const [projectReport, setProjectReport] = useState([])
  const [partnerReport, setPartnerReport] = useState([])
  const [expenseBreakdown, setExpenseBreakdown] = useState([])
  const [cashFlow, setCashFlow] = useState([])
  const [comparison, setComparison] = useState(null)
  const [receivableReport, setReceivableReport] = useState([])

  const TABS = [
    { id: 'overview', label: 'Ümumi baxış', icon: LayoutDashboard },
    { id: 'trend', label: 'Aylıq trend', icon: LineChart },
    { id: 'cashflow', label: 'Cash Flow', icon: TrendingUp },
    { id: 'projects', label: 'Layihələr', icon: Building2 },
    { id: 'partners', label: 'Tərəfdaşlar', icon: Users },
    { id: 'expense_breakdown', label: 'Xərc təsnifatı', icon: PieChart },
    { id: 'receivables', label: 'Debitorlar', icon: FileText },
    { id: 'comparison', label: 'Müqayisə', icon: TableIcon },
  ]

  const loadData = async () => {
    setLoading(true)
    try {
      let sd = null, ed = null
      let psd = null, ped = null // previous period for comparison

      const today = new Date()
      if (dateRange === 'this_month') {
        sd = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0,10)
        ed = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0,10)
        psd = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0,10)
        ped = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().slice(0,10)
      } else if (dateRange === 'last_month') {
        sd = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0,10)
        ed = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().slice(0,10)
        psd = new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().slice(0,10)
        ped = new Date(today.getFullYear(), today.getMonth() - 1, 0).toISOString().slice(0,10)
      } else if (dateRange === 'this_year') {
        sd = new Date(today.getFullYear(), 0, 1).toISOString().slice(0,10)
        ed = new Date(today.getFullYear(), 11, 31).toISOString().slice(0,10)
        psd = new Date(today.getFullYear() - 1, 0, 1).toISOString().slice(0,10)
        ped = new Date(today.getFullYear() - 1, 11, 31).toISOString().slice(0,10)
      } else if (dateRange === 'custom') {
        sd = customStart || null
        ed = customEnd || null
      }

      const params = {}
      if (sd) params.startDate = sd
      if (ed) params.endDate = ed

      const compParams = {
        currentStart: sd || new Date(2000, 0, 1).toISOString().slice(0,10),
        currentEnd: ed || today.toISOString().slice(0,10),
        prevStart: psd || new Date(1999, 0, 1).toISOString().slice(0,10),
        prevEnd: ped || new Date(2000, 0, 1).toISOString().slice(0,10),
      }

      const [resSum, resTrend, resProj, resPart, resExp, resCash, resComp, resReceivable] = await Promise.all([
        accountingApi.getReportSummary(params),
        accountingApi.getMonthlyTrend(params),
        accountingApi.getProjectReport(params),
        accountingApi.getPartnerReport(params),
        accountingApi.getExpenseBreakdown(params),
        accountingApi.getCashFlowReport(params),
        accountingApi.getComparison(compParams).catch(() => ({ data: { data: null } })),
        accountingApi.getReceivableReport(params)
      ])

      setSummary(resSum.data.data)
      setMonthlyTrend(resTrend.data.data)
      setProjectReport(resProj.data.data)
      setPartnerReport(resPart.data.data)
      setExpenseBreakdown(resExp.data.data)
      setCashFlow(resCash.data.data)
      setComparison(resComp.data?.data)
      setReceivableReport(resReceivable.data.data)

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [dateRange, customStart, customEnd])

  const exportCurrentTab = () => {
    let ws = null
    let filename = `hesabat-${activeTab}.xlsx`
    
    if (activeTab === 'trend') {
      ws = XLSX.utils.json_to_sheet(monthlyTrend.map(t => ({
        'Dövr': t.month, 'Gəlir': t.income, 'Podratçı Xərci': t.contractorExpense, 'Şirkət Xərci': t.companyExpense, 'Xalis Mənfəət': t.netProfit
      })))
    } else if (activeTab === 'projects') {
      ws = XLSX.utils.json_to_sheet(projectReport.map(p => ({
        'Layihə': p.projectCode, 'Şirkət': p.companyName, 'Ümumi Gəlir': p.totalIncome, 'Ümumi Xərc': p.totalExpense, 'Xalis Mənfəət': p.netProfit, 'Marja %': p.profitMarginPercent
      })))
    } else if (activeTab === 'partners') {
      ws = XLSX.utils.json_to_sheet(partnerReport.map(c => ({
        'Tip': c.type === 'INVESTOR' ? 'İnvestor' : 'Podratçı', 'Şirkət/Şəxs': c.name, 'VÖEN': c.voen, 'Ümumi Xərc': c.totalExpense, 'Qaimə Sayı': c.invoiceCount
      })))
    } else if (activeTab === 'expense_breakdown') {
      ws = XLSX.utils.json_to_sheet(expenseBreakdown.map(e => ({
        'Təsnifat': e.categoryLabel, 'Məbləğ': e.amount, 'Faiz %': e.percentage, 'Qaimə Sayı': e.count
      })))
    } else if (activeTab === 'receivables') {
      ws = XLSX.utils.json_to_sheet(receivableReport.map(r => ({
        'Layihə': r.projectCode, 'Müştəri': r.customerName, 'Ümumi Borc': r.totalAmount, 'Ödənilib': r.paidAmount, 'Qalıq Borc': r.remainingAmount, 'Son Tarix': r.dueDate, 'Status': r.status
      })))
    }

    if (ws) {
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Hesabat')
      XLSX.writeFile(wb, filename)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading && !summary) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 print:p-0">
      {/* Header & Filters (No print) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/accounting')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Hesabat və Analitika</h1>
            <p className="text-sm text-gray-400">Maliyyə hesabatlarının təhlili</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
            <button onClick={() => setDateRange('this_month')} className={clsx('px-3 py-1.5 text-xs font-medium rounded-md transition-colors', dateRange === 'this_month' ? 'bg-amber-100 text-amber-700' : 'text-gray-500 hover:text-gray-700')}>Bu Ay</button>
            <button onClick={() => setDateRange('last_month')} className={clsx('px-3 py-1.5 text-xs font-medium rounded-md transition-colors', dateRange === 'last_month' ? 'bg-amber-100 text-amber-700' : 'text-gray-500 hover:text-gray-700')}>Ötən Ay</button>
            <button onClick={() => setDateRange('this_year')} className={clsx('px-3 py-1.5 text-xs font-medium rounded-md transition-colors', dateRange === 'this_year' ? 'bg-amber-100 text-amber-700' : 'text-gray-500 hover:text-gray-700')}>Bu İl</button>
            <button onClick={() => setDateRange('custom')} className={clsx('px-3 py-1.5 text-xs font-medium rounded-md transition-colors', dateRange === 'custom' ? 'bg-amber-100 text-amber-700' : 'text-gray-500 hover:text-gray-700')}>Xüsusi</button>
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:bg-gray-800" />
              <span className="text-gray-400">-</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:bg-gray-800" />
            </div>
          )}

          <div className="flex gap-2 ml-2">
            <button onClick={exportCurrentTab} className="p-2 text-gray-500 hover:text-green-600 bg-white border border-gray-200 rounded-lg hover:bg-green-50 transition-colors" title="Excel-ə ixrac et">
              <Download size={16} />
            </button>
            <button onClick={handlePrint} className="p-2 text-gray-500 hover:text-blue-600 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors" title="Çap et">
              <Printer size={16} />
            </button>
          </div>
        </div>
      </div>

      <div ref={printRef} className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={TrendingUp} label="Ümumi gəlir" value={fmtMoney(summary?.totalIncome)} color="green"
            sub={`${summary?.incomeCount || 0} gəlir qaiməsi`} changePercent={comparison?.currentPeriod?.incomeChangeScore} />
          <StatCard icon={TrendingDown} label="Ümumi xərc" value={fmtMoney(summary?.totalExpense)} color="red"
            sub={`${(summary?.contractorExpenseCount || 0) + (summary?.companyExpenseCount || 0)} xərc qaiməsi`} changePercent={comparison?.currentPeriod?.expenseChangeScore} />
          <StatCard icon={DollarSign} label="Xalis mənfəət" value={fmtMoney(summary?.netProfit)} color={summary?.netProfit >= 0 ? 'green' : 'red'} changePercent={comparison?.currentPeriod?.profitChangeScore} />
          
          <StatCard icon={Target} label="Orta marja" 
            value={summary?.totalIncome > 0 ? ((summary?.netProfit / summary?.totalIncome) * 100).toFixed(1) + '%' : '0%'} 
            color="indigo" sub="Gəlirə nisbətən" />
          <StatCard icon={Receipt} label="Ümumi qaimə" value={(summary?.incomeCount || 0) + (summary?.contractorExpenseCount || 0) + (summary?.companyExpenseCount || 0)} color="amber" sub="Dövr ərzində" />
          <StatCard icon={BarChart3} label="Orta məbləğ" value={fmtMoney(summary?.avgInvoiceAmount)} color="blue" sub="Bir qaimə üzrə" />
        </div>

        {/* Tabs Row (No print) */}
        <div className="flex overflow-x-auto gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 print:hidden">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={clsx('flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors',
                activeTab === t.id ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700')}>
                <Icon size={14} /> {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 print:border-none print:shadow-none">
          
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold">Dövr üzrə ümumi baxış</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Gəlir vs Xərc</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{ name: 'Cəmi', income: summary?.totalIncome || 0, expense: summary?.totalExpense || 0 }]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} axisLine={false} tickLine={false} />
                        <ReTooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                        <Legend />
                        <Bar name="Gəlir" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} />
                        <Bar name="Xərc" dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={60} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Xərc Təsnifatı</h3>
                  <div className="h-64">
                    {expenseBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie data={expenseBreakdown} dataKey="amount" nameKey="categoryLabel" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                            {expenseBreakdown.map((e, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <ReTooltip formatter={(value) => fmtMoney(value)} />
                          <Legend />
                        </RePieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-gray-400">Xərc yoxdur</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TREND */}
          {activeTab === 'trend' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold">Aylıq Gəlir-Xərc Trendi</h2>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ReLineChart data={monthlyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{fontSize: 10}} tickMargin={10} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                    <ReTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" name="Gəlir" dataKey="income" stroke="#10b981" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} />
                    <Line type="monotone" name="Ümumi Xərc" dataKey={(d) => d.contractorExpense + d.companyExpense} stroke="#ef4444" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} />
                    <Line type="monotone" name="Xalis Mənfəət" dataKey="netProfit" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" />
                  </ReLineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB: CASHFLOW */}
          {activeTab === 'cashflow' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold">Aylıq Cash Flow (Pul axını)</h2>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlow} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{fontSize: 10}} tickMargin={10} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                    <ReTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" name="Mədaxil (Inflow)" dataKey="inflow" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                    <Area type="monotone" name="Məxaric (Outflow)" dataKey="outflow" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB: PROJECTS */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold">Layihələr üzrə Rentabellik</h2>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-750">
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Layihə Kodu</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Şirkət</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Gəlir</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Xərc</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Xalis Mənfəət</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Marja %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {projectReport.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-4 text-center text-gray-400">Məlumat yoxdur</td></tr>
                    ) : projectReport.map(p => (
                      <tr key={p.projectId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-mono text-amber-600">{p.projectCode}</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{p.companyName}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">{fmtMoney(p.totalIncome)}</td>
                        <td className="px-4 py-3 text-right text-red-500 font-medium">{fmtMoney(p.totalExpense)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-100">{fmtMoney(p.netProfit)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2 py-1 rounded-md text-xs font-bold ${p.profitMarginPercent > 20 ? 'bg-green-100 text-green-700' : p.profitMarginPercent > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {p.profitMarginPercent?.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: PARTNERS */}
          {activeTab === 'partners' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold">Tərəfdaşlar üzrə Xərclər (Podratçı / İnvestor)</h2>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-750">
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Tip</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Şirkət / Şəxs</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">VÖEN</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600">Qaimə Sayı</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Son Ödəniş/Qaimə Tarixi</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Ümumi Xərc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {partnerReport.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-4 text-center text-gray-400">Məlumat yoxdur</td></tr>
                    ) : partnerReport.map(c => (
                      <tr key={c.type + '_' + c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-500 text-xs">
                          <span className={clsx("px-2 py-0.5 rounded-md border", c.type === 'INVESTOR' ? "bg-purple-50 text-purple-600 border-purple-200" : "bg-blue-50 text-blue-600 border-blue-200")}>
                            {c.type === 'INVESTOR' ? 'İnvestor' : 'Podratçı'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{c.name}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono">{c.voen || '—'}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{c.invoiceCount}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{c.lastPaymentDate ? new Date(c.lastPaymentDate).toLocaleDateString('az-AZ') : '—'}</td>
                        <td className="px-4 py-3 text-right text-red-500 font-bold">{fmtMoney(c.totalExpense)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: EXPENSE BREAKDOWN */}
          {activeTab === 'expense_breakdown' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold">Xərc Təsnifatı</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={expenseBreakdown} dataKey="amount" nameKey="categoryLabel" cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5}>
                        {expenseBreakdown.map((e, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <ReTooltip formatter={(value) => fmtMoney(value)} />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div className="space-y-4">
                    {expenseBreakdown.map((e, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} />
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{e.categoryLabel}</span>
                          </div>
                          <span className="font-bold text-lg">{fmtMoney(e.amount)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{e.count} qaimə</span>
                          <span>{e.percentage?.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: RECEIVABLES */}
          {activeTab === 'receivables' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold">Debitorlar (Müştəri Borcları) Hesabatı</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                 <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <p className="text-xs font-bold text-gray-500 uppercase">Cəmi Borc</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmtMoney(receivableReport.reduce((acc, r) => acc + (r.totalAmount || 0), 0))}</p>
                 </div>
                 <div className="p-4 rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20">
                    <p className="text-xs font-bold text-green-600 uppercase">Cəmi Ödənilən</p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-400">{fmtMoney(receivableReport.reduce((acc, r) => acc + (r.paidAmount || 0), 0))}</p>
                 </div>
                 <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20">
                    <p className="text-xs font-bold text-red-600 uppercase">Cəmi Qalıq Borc</p>
                    <p className="text-xl font-bold text-red-700 dark:text-red-400">{fmtMoney(receivableReport.reduce((acc, r) => acc + (r.remainingAmount || 0), 0))}</p>
                 </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-750">
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Layihə</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Müştəri</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Ümumi Borc</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Ödənilən</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Qalıq Borc</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Son Ödəniş Tarixi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {receivableReport.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-4 text-center text-gray-400">Məlumat yoxdur</td></tr>
                    ) : receivableReport.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                         <td className="px-4 py-3 font-mono text-amber-600">{r.projectCode}</td>
                         <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{r.customerName}</td>
                         <td className="px-4 py-3 text-right font-medium">{fmtMoney(r.totalAmount)}</td>
                         <td className="px-4 py-3 text-right text-green-600">{fmtMoney(r.paidAmount)}</td>
                         <td className="px-4 py-3 text-right text-red-500 font-bold">{fmtMoney(r.remainingAmount)}</td>
                         <td className="px-4 py-3 text-center">
                           <span className={clsx("px-2 py-1 text-[10px] font-bold uppercase rounded-md", 
                             r.status === 'COMPLETED' ? "bg-green-100 text-green-700" :
                             r.status === 'OVERDUE' ? "bg-red-100 text-red-700" :
                             r.status === 'PARTIAL' ? "bg-blue-100 text-blue-700" :
                             "bg-amber-100 text-amber-700"
                           )}>{r.status}</span>
                         </td>
                         <td className="px-4 py-3 text-right text-gray-500">{r.dueDate ? new Date(r.dueDate).toLocaleDateString('az-AZ') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: COMPARISON */}
          {activeTab === 'comparison' && comparison && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold">Dövrlər arası müqayisə</h2>
              <div className="flex items-center justify-center gap-4 text-sm font-semibold text-gray-500 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg w-fit mx-auto mb-6">
                <span>{comparison.previousPeriodLabel}</span>
                <ArrowLeft size={16} className="rotate-180" />
                <span className="text-amber-600">{comparison.currentPeriodLabel}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Ümumi Gəlir', current: comparison.currentPeriod?.totalIncome, prev: comparison.previousPeriod?.totalIncome, change: comparison.currentPeriod?.incomeChangeScore },
                  { label: 'Ümumi Xərc', current: comparison.currentPeriod?.totalExpense, prev: comparison.previousPeriod?.totalExpense, change: comparison.currentPeriod?.expenseChangeScore },
                  { label: 'Xalis Mənfəət', current: comparison.currentPeriod?.netProfit, prev: comparison.previousPeriod?.netProfit, change: comparison.currentPeriod?.profitChangeScore },
                ].map((item, i) => (
                  <div key={i} className="p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-4">{item.label}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-xs text-gray-400">Bu dövr:</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmtMoney(item.current)}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-xs text-gray-400">Əvvəlki dövr:</span>
                        <span className="text-sm font-semibold text-gray-500">{fmtMoney(item.prev)}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Fərq:</span>
                        <span className={`text-sm font-bold flex items-center gap-1 ${item.change > 0 ? 'text-green-600' : item.change < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          {item.change > 0 ? '↑' : item.change < 0 ? '↓' : ''} 
                          {Math.abs(item.change || 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
