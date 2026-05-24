import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['var(--ces-ok)', 'var(--ces-gold)', 'var(--ces-danger)', 'var(--ces-mute2)']
const LABELS = {
  available: 'Mövcud',
  rented: 'İstifadədə',
  defective: 'Nasaz',
  outOfService: 'Xidmətdən kənar',
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div
      className="rounded-lg px-3 py-2 shadow-lg border"
      style={{
        background: 'var(--ces-surface)',
        borderColor: 'var(--ces-line)',
      }}
    >
      <p className="text-xs font-semibold" style={{ color: 'var(--ces-muted)' }}>{name}</p>
      <p className="text-sm font-bold" style={{ color: 'var(--ces-ink)' }}>{value} ədəd</p>
    </div>
  )
}

export default function EquipmentPieChart({ stats }) {
  if (!stats) return null

  const data = [
    { name: LABELS.available, value: stats.availableEquipment ?? 0 },
    { name: LABELS.rented, value: stats.rentedEquipment ?? 0 },
    { name: LABELS.defective, value: stats.defectiveEquipment ?? 0 },
    { name: LABELS.outOfService, value: stats.outOfServiceEquipment ?? 0 },
  ].filter(d => d.value > 0)

  if (data.length === 0) return (
    <div className="flex items-center justify-center h-40 text-xs" style={{ color: 'var(--ces-mute2)' }}>Məlumat yoxdur</div>
  )

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => <span className="text-[11px]" style={{ color: 'var(--ces-muted)' }}>{value}</span>}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
