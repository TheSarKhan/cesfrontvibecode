import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft, TrendingUp, TrendingDown, DollarSign,
  Receipt, BarChart3, PieChart, LineChart, Target,
  Download, Printer, Table as TableIcon, Users, Building2, LayoutDashboard, FileText,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { accountingApi } from '../../api/accounting'
import * as XLSX from 'xlsx'
import {
  BarChart, Bar, AreaChart, Area, PieChart as RePieChart, Pie, Cell,
  LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { PageHeader, Pill, TableWrap } from './_shared'
import { fmtMoney } from './_constants'

const COLORS = ['#0f9d6a', '#c8932a', '#d4385a', '#2563c8', '#7d4ec9', '#e08a00', '#06b6d4', '#84cc16']

const STAT_TONES = {
  ok:     { bg: 'var(--ces-ok-100)', color: 'var(--ces-ok)' },
  danger: { bg: 'var(--ces-danger-100)', color: 'var(--ces-danger)' },
  warn:   { bg: 'var(--ces-warn-100)', color: 'var(--ces-warn)' },
  info:   { bg: 'var(--ces-info-100)', color: 'var(--ces-info)' },
  gold:   { bg: 'var(--ces-gold-100)', color: 'var(--ces-gold-700)' },
  alt:    { bg: 'rgba(125,78,201,.12)', color: 'var(--ces-alt, #7d4ec9)' },
}

function StatCard({ icon: Icon, label, value, tone, sub, changePercent }) {
  const s = STAT_TONES[tone] || STAT_TONES.gold
  return (
    <div
      style={{
        background: 'var(--ces-surface)',
        border: '1px solid var(--ces-line)',
        borderRadius: 'var(--ces-radius-lg)',
        padding: '16px',
        boxShadow: 'var(--ces-shadow-sm)',
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-[8px] grid place-items-center" style={{ background: s.bg, color: s.color }}>
            {Icon && <Icon size={14} />}
          </span>
          <span className="text-[10.5px] font-bold uppercase tracking-[.14em]" style={{ color: 'var(--ces-muted)' }}>{label}</span>
        </div>
        {changePercent != null && changePercent !== 0 && (
          <Pill tone={changePercent > 0 ? 'ok' : 'danger'} sm>
            {changePercent > 0 ? '↑' : '↓'} {Math.abs(changePercent).toFixed(1)}%
          </Pill>
        )}
      </div>
      <p className="text-[20px] font-extrabold num" style={{ color: s.color }}>{value}</p>
      {sub && <p className="text-[10.5px] mt-1" style={{ color: 'var(--ces-muted)' }}>{sub}</p>}
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="p-3"
      style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '10px', boxShadow: 'var(--ces-shadow)' }}>
      <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--ces-muted)' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-3 text-[11.5px] mb-1 last:mb-0">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="flex-1" style={{ color: 'var(--ces-ink)' }}>{p.name}:</span>
          <span className="font-bold num" style={{ color: 'var(--ces-ink)' }}>{fmtMoney(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function AccountingReportsPage() {
  const navigate = useNavigate()
  const printRef = useRef()

  const [dateRange, setDateRange]     = useState('this_year')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd]     = useState('')
  const [activeTab, setActiveTab]     = useState('overview')
  const [loading, setLoading]         = useState(true)

  const [summary, setSummary]                   = useState(null)
  const [monthlyTrend, setMonthlyTrend]         = useState([])
  const [projectReport, setProjectReport]       = useState([])
  const [partnerReport, setPartnerReport]       = useState([])
  const [expenseBreakdown, setExpenseBreakdown] = useState([])
  const [cashFlow, setCashFlow]                 = useState([])
  const [comparison, setComparison]             = useState(null)
  const [receivableReport, setReceivableReport] = useState([])

  const TABS = [
    { id: 'overview',           label: 'Ümumi baxış',     icon: LayoutDashboard },
    { id: 'trend',              label: 'Aylıq trend',     icon: LineChart },
    { id: 'cashflow',           label: 'Cash Flow',       icon: TrendingUp },
    { id: 'projects',           label: 'Layihələr',       icon: Building2 },
    { id: 'partners',           label: 'Tərəfdaşlar',     icon: Users },
    { id: 'expense_breakdown',  label: 'Xərc təsnifatı',  icon: PieChart },
    { id: 'receivables',        label: 'Debitorlar',      icon: FileText },
    { id: 'comparison',         label: 'Müqayisə',        icon: TableIcon },
  ]

  const loadData = async () => {
    setLoading(true)
    try {
      let sd = null, ed = null
      let psd = null, ped = null
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
        currentEnd:   ed || today.toISOString().slice(0,10),
        prevStart:    psd || new Date(1999, 0, 1).toISOString().slice(0,10),
        prevEnd:      ped || new Date(2000, 0, 1).toISOString().slice(0,10),
      }
      const [resSum, resTrend, resProj, resPart, resExp, resCash, resComp, resReceivable] = await Promise.all([
        accountingApi.getReportSummary(params),
        accountingApi.getMonthlyTrend(params),
        accountingApi.getProjectReport(params),
        accountingApi.getPartnerReport(params),
        accountingApi.getExpenseBreakdown(params),
        accountingApi.getCashFlowReport(params),
        accountingApi.getComparison(compParams).catch(() => ({ data: { data: null } })),
        accountingApi.getReceivableReport(params),
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
    } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [dateRange, customStart, customEnd]) // eslint-disable-line react-hooks/exhaustive-deps

  const exportCurrentTab = () => {
    let ws = null
    const filename = `hesabat-${activeTab}.xlsx`
    if (activeTab === 'trend')
      ws = XLSX.utils.json_to_sheet(monthlyTrend.map(t => ({ 'Dövr': t.month, 'Gəlir': t.income, 'Podratçı Xərci': t.contractorExpense, 'Şirkət Xərci': t.companyExpense, 'Xalis Mənfəət': t.netProfit })))
    else if (activeTab === 'projects')
      ws = XLSX.utils.json_to_sheet(projectReport.map(p => ({ 'Layihə': p.projectCode, 'Şirkət': p.companyName, 'Ümumi Gəlir': p.totalIncome, 'Ümumi Xərc': p.totalExpense, 'Xalis Mənfəət': p.netProfit, 'Marja %': p.profitMarginPercent })))
    else if (activeTab === 'partners')
      ws = XLSX.utils.json_to_sheet(partnerReport.map(c => ({ 'Tip': c.type === 'INVESTOR' ? 'İnvestor' : 'Podratçı', 'Şirkət/Şəxs': c.name, 'VÖEN': c.voen, 'Ümumi Xərc': c.totalExpense, 'Qaimə Sayı': c.invoiceCount })))
    else if (activeTab === 'expense_breakdown')
      ws = XLSX.utils.json_to_sheet(expenseBreakdown.map(e => ({ 'Təsnifat': e.categoryLabel, 'Məbləğ': e.amount, 'Faiz %': e.percentage, 'Qaimə Sayı': e.count })))
    else if (activeTab === 'receivables')
      ws = XLSX.utils.json_to_sheet(receivableReport.map(r => ({ 'Layihə': r.projectCode, 'Müştəri': r.customerName, 'Ümumi Borc': r.totalAmount, 'Ödənilib': r.paidAmount, 'Qalıq Borc': r.remainingAmount, 'Son Tarix': r.dueDate, 'Status': r.status })))
    if (ws) {
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Hesabat')
      XLSX.writeFile(wb, filename)
    }
  }

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8" style={{ border: '3px solid var(--ces-line)', borderTopColor: 'var(--ces-gold)' }} />
      </div>
    )
  }

  return (
    <div style={{ color: 'var(--ces-ink)' }} className="print:p-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 print:hidden mb-5">
        <PageHeader
          eyebrow="Mühasibatlıq"
          title="Hesabat və Analitika"
          subtitle="Maliyyə hesabatlarının təhlili"
          right={null}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => navigate('/accounting')} className="ces-btn ces-btn-outline ces-btn-sm">
            <ArrowLeft size={14} /> Geri
          </button>
          <div className="flex items-center p-1"
            style={{ background: 'var(--ces-graphite-50)', border: '1px solid var(--ces-line)', borderRadius: '10px' }}>
            {[
              { id: 'this_month', label: 'Bu Ay' },
              { id: 'last_month', label: 'Ötən Ay' },
              { id: 'this_year',  label: 'Bu İl' },
              { id: 'custom',     label: 'Xüsusi' },
            ].map(d => {
              const on = dateRange === d.id
              return (
                <button key={d.id} onClick={() => setDateRange(d.id)}
                  className="px-3 py-1.5 text-[11.5px] font-semibold rounded-md transition-colors"
                  style={{
                    background: on ? 'var(--ces-surface)' : 'transparent',
                    color: on ? 'var(--ces-graphite)' : 'var(--ces-muted)',
                    boxShadow: on ? 'var(--ces-shadow-sm)' : 'none',
                  }}>
                  {d.label}
                </button>
              )
            })}
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                className="text-[12px] px-2 py-1.5"
                style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '8px' }} />
              <span style={{ color: 'var(--ces-mute2)' }}>—</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                className="text-[12px] px-2 py-1.5"
                style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '8px' }} />
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={exportCurrentTab} className="ces-btn ces-btn-outline ces-btn-sm" title="Excel-ə ixrac et">
              <Download size={14} />
            </button>
            <button onClick={() => window.print()} className="ces-btn ces-btn-outline ces-btn-sm" title="Çap et">
              <Printer size={14} />
            </button>
          </div>
        </div>
      </div>

      <div ref={printRef} className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={TrendingUp}   label="Ümumi gəlir"    value={fmtMoney(summary?.totalIncome)} tone="ok"
            sub={`${summary?.incomeCount || 0} gəlir qaiməsi`} changePercent={comparison?.currentPeriod?.incomeChangeScore} />
          <StatCard icon={TrendingDown} label="Ümumi xərc"     value={fmtMoney(summary?.totalExpense)} tone="danger"
            sub={`${(summary?.contractorExpenseCount || 0) + (summary?.companyExpenseCount || 0)} xərc qaiməsi`} changePercent={comparison?.currentPeriod?.expenseChangeScore} />
          <StatCard icon={DollarSign}   label="Xalis mənfəət"  value={fmtMoney(summary?.netProfit)}
            tone={summary?.netProfit >= 0 ? 'ok' : 'danger'} changePercent={comparison?.currentPeriod?.profitChangeScore} />
          <StatCard icon={Target}       label="Orta marja"
            value={summary?.totalIncome > 0 ? ((summary?.netProfit / summary?.totalIncome) * 100).toFixed(1) + '%' : '0%'}
            tone="info" sub="Gəlirə nisbətən" />
          <StatCard icon={Receipt}      label="Ümumi qaimə"
            value={(summary?.incomeCount || 0) + (summary?.contractorExpenseCount || 0) + (summary?.companyExpenseCount || 0)}
            tone="gold" sub="Dövr ərzində" />
          <StatCard icon={BarChart3}    label="Orta məbləğ"     value={fmtMoney(summary?.avgInvoiceAmount)} tone="alt" sub="Bir qaimə üzrə" />
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 p-1.5 print:hidden"
          style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '12px', boxShadow: 'var(--ces-shadow-sm)' }}>
          {TABS.map(t => {
            const Icon = t.icon
            const on = activeTab === t.id
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="flex items-center gap-1.5 px-4 py-2 text-[11.5px] font-semibold rounded-lg whitespace-nowrap transition-colors"
                style={{
                  background: on ? 'var(--ces-gold-100)' : 'transparent',
                  color: on ? 'var(--ces-gold-700)' : 'var(--ces-muted)',
                }}>
                <Icon size={13} /> {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="p-6 print:border-none print:shadow-none"
          style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: 'var(--ces-radius-lg)', boxShadow: 'var(--ces-shadow-sm)' }}>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-[18px] font-extrabold" style={{ color: 'var(--ces-graphite-900)' }}>Dövr üzrə ümumi baxış</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-[10.5px] font-bold uppercase tracking-[.16em] mb-3" style={{ color: 'var(--ces-muted)' }}>Gəlir vs Xərc</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{ name: 'Cəmi', income: summary?.totalIncome || 0, expense: summary?.totalExpense || 0 }]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ces-line)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <ReTooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar name="Gəlir" dataKey="income" fill="var(--ces-ok)" radius={[4, 4, 0, 0]} maxBarSize={60} />
                        <Bar name="Xərc" dataKey="expense" fill="var(--ces-danger)" radius={[4, 4, 0, 0]} maxBarSize={60} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <h3 className="text-[10.5px] font-bold uppercase tracking-[.16em] mb-3" style={{ color: 'var(--ces-muted)' }}>Xərc təsnifatı</h3>
                  <div className="h-64">
                    {expenseBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie data={expenseBreakdown} dataKey="amount" nameKey="categoryLabel" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                            {expenseBreakdown.map((e, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <ReTooltip formatter={(value) => fmtMoney(value)} />
                          <Legend wrapperStyle={{ fontSize: '11.5px' }} />
                        </RePieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-[13px]" style={{ color: 'var(--ces-mute2)' }}>Xərc yoxdur</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trend' && (
            <div className="space-y-6">
              <h2 className="text-[18px] font-extrabold" style={{ color: 'var(--ces-graphite-900)' }}>Aylıq Gəlir-Xərc Trendi</h2>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ReLineChart data={monthlyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ces-line)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} tickMargin={10} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <ReTooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" name="Gəlir" dataKey="income" stroke="var(--ces-ok)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" name="Ümumi Xərc" dataKey={(d) => d.contractorExpense + d.companyExpense} stroke="var(--ces-danger)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" name="Xalis Mənfəət" dataKey="netProfit" stroke="var(--ces-gold)" strokeWidth={3} strokeDasharray="5 5" />
                  </ReLineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'cashflow' && (
            <div className="space-y-6">
              <h2 className="text-[18px] font-extrabold" style={{ color: 'var(--ces-graphite-900)' }}>Aylıq Cash Flow</h2>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlow} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ces-line)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} tickMargin={10} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <ReTooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" name="Mədaxil" dataKey="inflow" stackId="1" stroke="var(--ces-ok)" fill="var(--ces-ok)" fillOpacity={0.6} />
                    <Area type="monotone" name="Məxaric" dataKey="outflow" stackId="2" stroke="var(--ces-danger)" fill="var(--ces-danger)" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-4">
              <h2 className="text-[18px] font-extrabold" style={{ color: 'var(--ces-graphite-900)' }}>Layihələr üzrə Rentabellik</h2>
              <TableWrap>
                <div className="overflow-x-auto">
                  <table className="ces-tbl w-full">
                    <thead>
                      <tr>
                        <th>Layihə Kodu</th>
                        <th>Şirkət</th>
                        <th className="r">Gəlir</th>
                        <th className="r">Xərc</th>
                        <th className="r">Xalis Mənfəət</th>
                        <th className="r">Marja %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectReport.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-6" style={{ color: 'var(--ces-mute2)' }}>Məlumat yoxdur</td></tr>
                      ) : projectReport.map(p => (
                        <tr key={p.projectId}>
                          <td className="mono font-bold" style={{ color: 'var(--ces-gold-700)' }}>{p.projectCode}</td>
                          <td style={{ color: 'var(--ces-ink)' }}>{p.companyName}</td>
                          <td className="r font-medium num" style={{ color: 'var(--ces-ok)' }}>{fmtMoney(p.totalIncome)}</td>
                          <td className="r font-medium num" style={{ color: 'var(--ces-danger)' }}>{fmtMoney(p.totalExpense)}</td>
                          <td className="r font-bold num" style={{ color: 'var(--ces-graphite-900)' }}>{fmtMoney(p.netProfit)}</td>
                          <td className="r">
                            <Pill tone={p.profitMarginPercent > 20 ? 'ok' : p.profitMarginPercent > 0 ? 'warn' : 'danger'} sm>
                              {p.profitMarginPercent?.toFixed(1)}%
                            </Pill>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TableWrap>
            </div>
          )}

          {activeTab === 'partners' && (
            <div className="space-y-4">
              <h2 className="text-[18px] font-extrabold" style={{ color: 'var(--ces-graphite-900)' }}>Tərəfdaşlar üzrə Xərclər</h2>
              <TableWrap>
                <div className="overflow-x-auto">
                  <table className="ces-tbl w-full">
                    <thead>
                      <tr>
                        <th>Tip</th>
                        <th>Şirkət / Şəxs</th>
                        <th>VÖEN</th>
                        <th className="r">Qaimə Sayı</th>
                        <th>Son Ödəniş</th>
                        <th className="r">Ümumi Xərc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partnerReport.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-6" style={{ color: 'var(--ces-mute2)' }}>Məlumat yoxdur</td></tr>
                      ) : partnerReport.map(c => (
                        <tr key={c.type + '_' + c.id}>
                          <td><Pill tone={c.type === 'INVESTOR' ? 'gold' : 'info'} sm>{c.type === 'INVESTOR' ? 'İnvestor' : 'Podratçı'}</Pill></td>
                          <td className="font-medium" style={{ color: 'var(--ces-ink)' }}>{c.name}</td>
                          <td className="mono" style={{ color: 'var(--ces-muted)', fontSize: '11.5px' }}>{c.voen || '—'}</td>
                          <td className="r num" style={{ color: 'var(--ces-ink)' }}>{c.invoiceCount}</td>
                          <td style={{ color: 'var(--ces-muted)' }}>{c.lastPaymentDate ? new Date(c.lastPaymentDate).toLocaleDateString('az-AZ') : '—'}</td>
                          <td className="r font-bold num" style={{ color: 'var(--ces-danger)' }}>{fmtMoney(c.totalExpense)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TableWrap>
            </div>
          )}

          {activeTab === 'expense_breakdown' && (
            <div className="space-y-6">
              <h2 className="text-[18px] font-extrabold" style={{ color: 'var(--ces-graphite-900)' }}>Xərc Təsnifatı</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={expenseBreakdown} dataKey="amount" nameKey="categoryLabel" cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5}>
                        {expenseBreakdown.map((e, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <ReTooltip formatter={(value) => fmtMoney(value)} />
                      <Legend wrapperStyle={{ fontSize: '11.5px' }} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {expenseBreakdown.map((e, idx) => (
                    <div key={idx} className="p-4"
                      style={{ background: 'var(--ces-graphite-50)', border: '1px solid var(--ces-line)', borderRadius: '12px' }}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} />
                          <span className="font-semibold" style={{ color: 'var(--ces-ink)' }}>{e.categoryLabel}</span>
                        </div>
                        <span className="font-bold text-[16px] num" style={{ color: 'var(--ces-ink)' }}>{fmtMoney(e.amount)}</span>
                      </div>
                      <div className="flex justify-between text-[11.5px]" style={{ color: 'var(--ces-muted)' }}>
                        <span>{e.count} qaimə</span>
                        <span className="num">{e.percentage?.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'receivables' && (
            <div className="space-y-6">
              <h2 className="text-[18px] font-extrabold" style={{ color: 'var(--ces-graphite-900)' }}>Debitorlar Hesabatı</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                <StatCard icon={DollarSign} label="Cəmi Borc"     value={fmtMoney(receivableReport.reduce((acc, r) => acc + (r.totalAmount || 0), 0))} tone="gold" />
                <StatCard icon={TrendingUp} label="Cəmi Ödənilən" value={fmtMoney(receivableReport.reduce((acc, r) => acc + (r.paidAmount || 0), 0))} tone="ok" />
                <StatCard icon={TrendingDown} label="Cəmi Qalıq"  value={fmtMoney(receivableReport.reduce((acc, r) => acc + (r.remainingAmount || 0), 0))} tone="danger" />
              </div>
              <TableWrap>
                <div className="overflow-x-auto">
                  <table className="ces-tbl w-full">
                    <thead>
                      <tr>
                        <th>Layihə</th>
                        <th>Müştəri</th>
                        <th className="r">Ümumi Borc</th>
                        <th className="r">Ödənilən</th>
                        <th className="r">Qalıq</th>
                        <th>Status</th>
                        <th>Son Tarix</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receivableReport.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-6" style={{ color: 'var(--ces-mute2)' }}>Məlumat yoxdur</td></tr>
                      ) : receivableReport.map(r => (
                        <tr key={r.id}>
                          <td className="mono font-bold" style={{ color: 'var(--ces-gold-700)' }}>{r.projectCode}</td>
                          <td style={{ color: 'var(--ces-ink)' }}>{r.customerName}</td>
                          <td className="r font-medium num">{fmtMoney(r.totalAmount)}</td>
                          <td className="r num" style={{ color: 'var(--ces-ok)' }}>{fmtMoney(r.paidAmount)}</td>
                          <td className="r font-bold num" style={{ color: 'var(--ces-danger)' }}>{fmtMoney(r.remainingAmount)}</td>
                          <td>
                            <Pill tone={r.status === 'COMPLETED' ? 'ok' : r.status === 'OVERDUE' ? 'danger' : r.status === 'PARTIAL' ? 'info' : 'warn'} sm>
                              {r.status}
                            </Pill>
                          </td>
                          <td style={{ color: 'var(--ces-muted)' }}>{r.dueDate ? new Date(r.dueDate).toLocaleDateString('az-AZ') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TableWrap>
            </div>
          )}

          {activeTab === 'comparison' && comparison && (
            <div className="space-y-6">
              <h2 className="text-[18px] font-extrabold" style={{ color: 'var(--ces-graphite-900)' }}>Dövrlər arası müqayisə</h2>
              <div className="flex items-center justify-center gap-4 text-[13px] font-semibold p-3 w-fit mx-auto"
                style={{ background: 'var(--ces-graphite-50)', borderRadius: '10px', color: 'var(--ces-muted)' }}>
                <span>{comparison.previousPeriodLabel}</span>
                <ArrowLeft size={14} className="rotate-180" />
                <span style={{ color: 'var(--ces-gold-700)' }}>{comparison.currentPeriodLabel}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Ümumi Gəlir',   current: comparison.currentPeriod?.totalIncome, prev: comparison.previousPeriod?.totalIncome,  change: comparison.currentPeriod?.incomeChangeScore },
                  { label: 'Ümumi Xərc',    current: comparison.currentPeriod?.totalExpense, prev: comparison.previousPeriod?.totalExpense, change: comparison.currentPeriod?.expenseChangeScore },
                  { label: 'Xalis Mənfəət', current: comparison.currentPeriod?.netProfit,    prev: comparison.previousPeriod?.netProfit,    change: comparison.currentPeriod?.profitChangeScore },
                ].map((item, i) => (
                  <div key={i} className="p-5"
                    style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: 'var(--ces-radius-lg)' }}>
                    <h3 className="text-[10.5px] font-bold uppercase tracking-[.16em] mb-4" style={{ color: 'var(--ces-muted)' }}>{item.label}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-[11px]" style={{ color: 'var(--ces-mute2)' }}>Bu dövr:</span>
                        <span className="text-[18px] font-extrabold num" style={{ color: 'var(--ces-graphite-900)' }}>{fmtMoney(item.current)}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-[11px]" style={{ color: 'var(--ces-mute2)' }}>Əvvəlki:</span>
                        <span className="text-[14px] font-semibold num" style={{ color: 'var(--ces-muted)' }}>{fmtMoney(item.prev)}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--ces-line)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px]" style={{ color: 'var(--ces-mute2)' }}>Fərq:</span>
                        <Pill tone={item.change > 0 ? 'ok' : item.change < 0 ? 'danger' : 'muted'} sm>
                          {item.change > 0 ? '↑' : item.change < 0 ? '↓' : ''} {Math.abs(item.change || 0).toFixed(1)}%
                        </Pill>
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
