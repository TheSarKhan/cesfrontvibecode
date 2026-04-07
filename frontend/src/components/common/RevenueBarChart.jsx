import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']

function buildMonthlyData(invoices) {
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return { month: MONTHS[d.getMonth()], year: d.getFullYear(), monthNum: d.getMonth(), total: 0 }
  })
  ;(invoices || []).forEach(inv => {
    if (!inv.issueDate) return
    const d = new Date(inv.issueDate)
    const found = months.find(m => m.year === d.getFullYear() && m.monthNum === d.getMonth())
    if (found) found.total += Number(inv.amount || inv.totalAmount || 0)
  })
  return months
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</p>
      <p className="text-sm font-bold text-amber-600">{new Intl.NumberFormat('az-AZ', { minimumFractionDigits: 0 }).format(val)} ₼</p>
    </div>
  )
}

export default function RevenueBarChart({ invoices }) {
  const data = buildMonthlyData(invoices)

  if (!invoices) return <div className="h-40 flex items-center justify-center text-xs text-gray-400">Yüklənir...</div>
  if (data.every(d => d.total === 0)) return <div className="h-40 flex items-center justify-center text-xs text-gray-400">Məlumat yoxdur</div>

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={55}
          tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(245,158,11,0.08)' }} />
        <Bar dataKey="total" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
