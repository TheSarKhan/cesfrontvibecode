import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = { PENDING: 'var(--ces-warn)', ACTIVE: 'var(--ces-ok)', COMPLETED: 'var(--ces-mute2)' }
const LABELS = { PENDING: 'Gözləyir', ACTIVE: 'Aktiv', COMPLETED: 'Tamamlandı' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg px-3 py-2 shadow-lg border"
      style={{
        background: 'var(--ces-surface)',
        borderColor: 'var(--ces-line)',
      }}
    >
      <p className="text-xs font-semibold" style={{ color: 'var(--ces-muted)' }}>{label}</p>
      <p className="text-sm font-bold" style={{ color: 'var(--ces-ink)' }}>{payload[0].value} layihə</p>
    </div>
  )
}

export default function ProjectStatusChart({ projects }) {
  if (!projects?.length) return <div className="h-32 flex items-center justify-center text-xs" style={{ color: 'var(--ces-mute2)' }}>Məlumat yoxdur</div>

  const counts = { PENDING: 0, ACTIVE: 0, COMPLETED: 0 }
  projects.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++ })
  const data = Object.entries(counts).map(([status, count]) => ({
    name: LABELS[status], value: count, status
  }))

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--ces-muted)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--ces-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--ces-graphite-50)' }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry, i) => <Cell key={i} fill={COLORS[entry.status]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
