import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = { PENDING: '#f59e0b', ACTIVE: '#22c55e', COMPLETED: '#6b7280' }
const LABELS = { PENDING: 'Gözləyir', ACTIVE: 'Aktiv', COMPLETED: 'Tamamlandı' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</p>
      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{payload[0].value} layihə</p>
    </div>
  )
}

export default function ProjectStatusChart({ projects }) {
  if (!projects?.length) return <div className="h-32 flex items-center justify-center text-xs text-gray-400">Məlumat yoxdur</div>

  const counts = { PENDING: 0, ACTIVE: 0, COMPLETED: 0 }
  projects.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++ })
  const data = Object.entries(counts).map(([status, count]) => ({
    name: LABELS[status], value: count, status
  }))

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry, i) => <Cell key={i} fill={COLORS[entry.status]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
