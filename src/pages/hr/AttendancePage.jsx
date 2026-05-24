import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import { useAuthStore } from '../../store/authStore'
import { PageHeader, Pill, Avatar, TableWrap } from './_shared'
import { ATTENDANCE_STATUSES, AZ_MONTHS, PILL_STYLES } from './_constants'

const monthEnd = (year, month) => new Date(year, month, 0).getDate()

export default function AttendancePage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canEdit = hasPermission('HR_MANAGEMENT', 'canPost')

  const today = new Date()
  const [year, setYear]           = useState(today.getFullYear())
  const [month, setMonth]         = useState(today.getMonth() + 1)
  const [employees, setEmployees] = useState([])
  const [records, setRecords]     = useState({})
  const [loading, setLoading]     = useState(false)

  const days = useMemo(() => {
    const end = monthEnd(year, month)
    return Array.from({ length: end }, (_, i) => i + 1)
  }, [year, month])

  const dateKey = (d) => `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const load = async () => {
    setLoading(true)
    try {
      const empRes = await hrApi.getEmployees()
      const list = (empRes.data?.data ?? empRes.data ?? []).filter(e => e.status === 'ACTIVE' || e.status === 'ON_LEAVE')
      setEmployees(list)

      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const end   = `${year}-${String(month).padStart(2, '0')}-${String(monthEnd(year, month)).padStart(2, '0')}`
      const recRes = await hrApi.getAttendance({ start, end })
      const recs = recRes.data?.data ?? recRes.data ?? []
      const map = {}
      for (const r of recs) {
        if (!map[r.employeeId]) map[r.employeeId] = {}
        map[r.employeeId][r.date] = { status: r.status, hoursWorked: r.hoursWorked, id: r.id }
      }
      setRecords(map)
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Yüklənmədi')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  const setCell = async (empId, date, status) => {
    if (!canEdit) return
    try {
      await hrApi.upsertAttendance({ employeeId: empId, date, status, hoursWorked: status === 'PRESENT' ? 8 : 0 })
      setRecords((prev) => ({
        ...prev,
        [empId]: { ...(prev[empId] || {}), [date]: { status, hoursWorked: status === 'PRESENT' ? 8 : 0 } },
      }))
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Qeyd edilə bilmədi')
    }
  }

  const cellStyle = (status) => {
    const s = ATTENDANCE_STATUSES.find(x => x.v === status)
    if (!s) return { background: 'var(--ces-surface)', color: 'var(--ces-mute2)', borderColor: 'var(--ces-line)' }
    const p = PILL_STYLES[s.tone] || PILL_STYLES.muted
    return { background: p.bg, color: p.color, borderColor: 'transparent' }
  }
  const shortLabel = (status) => ATTENDANCE_STATUSES.find(s => s.v === status)?.short || '—'

  return (
    <div style={{ color: 'var(--ces-ink)' }}>
      <PageHeader
        eyebrow="HR · Davamiyyət"
        title="Aylıq davamiyyət"
        subtitle="İşçilərin gündəlik iş statusu"
        right={
          <button onClick={() => navigate('/hr')} className="ces-btn ces-btn-outline ces-btn-sm">
            <ArrowLeft size={14} /> HR
          </button>
        }
      />

      {/* Filter & Legend */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="text-[13px] font-semibold cursor-pointer"
            style={{
              padding: '8px 12px',
              background: 'var(--ces-surface)',
              border: '1px solid var(--ces-line)',
              borderRadius: '10px',
              color: 'var(--ces-graphite)',
              outline: 'none',
              minHeight: '38px',
            }}
          >
            {AZ_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-[100px] text-[13px] font-semibold num"
            style={{
              padding: '8px 12px',
              background: 'var(--ces-surface)',
              border: '1px solid var(--ces-line)',
              borderRadius: '10px',
              color: 'var(--ces-graphite)',
              outline: 'none',
              minHeight: '38px',
            }}
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap ml-auto">
          <span className="text-[10.5px] font-bold uppercase tracking-[.16em] mr-1" style={{ color: 'var(--ces-muted)' }}>Açar:</span>
          {ATTENDANCE_STATUSES.map(s => (
            <Pill key={s.v} tone={s.tone} sm>{s.short} · {s.label}</Pill>
          ))}
        </div>
      </div>

      {/* Grid */}
      <TableWrap>
        <div className="overflow-x-auto">
          <table className="text-[11px] border-collapse w-full">
            <thead>
              <tr style={{ background: 'var(--ces-graphite-50)' }}>
                <th
                  className="text-left sticky left-0 z-10 min-w-[200px] text-[11px] font-bold uppercase tracking-[.1em]"
                  style={{
                    background: 'var(--ces-graphite-50)',
                    borderRight: '1px solid var(--ces-line)',
                    borderBottom: '1px solid var(--ces-line)',
                    color: 'var(--ces-muted)',
                    padding: '12px 16px',
                  }}
                >
                  İşçi
                </th>
                {days.map(d => (
                  <th
                    key={d}
                    className="text-center font-bold"
                    style={{
                      width: '34px',
                      padding: '12px 2px',
                      color: 'var(--ces-muted)',
                      borderBottom: '1px solid var(--ces-line)',
                      fontSize: '11px',
                    }}
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={days.length + 1} className="text-center py-10" style={{ color: 'var(--ces-mute2)' }}>Yüklənir...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={days.length + 1} className="text-center py-10" style={{ color: 'var(--ces-mute2)' }}>İşçi yoxdur</td></tr>
              ) : employees.map(emp => (
                <tr key={emp.id}>
                  <td
                    className="sticky left-0 z-10"
                    style={{
                      background: 'var(--ces-surface)',
                      borderRight: '1px solid var(--ces-line)',
                      borderBottom: '1px solid var(--ces-line-2)',
                      padding: '10px 16px',
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name={emp.fullName} size="xs" />
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-bold truncate" style={{ color: 'var(--ces-ink)' }}>{emp.fullName}</p>
                        <p className="text-[10px]" style={{ color: 'var(--ces-mute2)' }}>{emp.positionName || '—'}</p>
                      </div>
                    </div>
                  </td>
                  {days.map(d => {
                    const key = dateKey(d)
                    const rec = records[emp.id]?.[key]
                    const st = cellStyle(rec?.status)
                    return (
                      <td
                        key={d}
                        className="p-0.5 text-center"
                        style={{ borderBottom: '1px solid var(--ces-line-2)' }}
                      >
                        <select
                          value={rec?.status || ''}
                          onChange={(e) => setCell(emp.id, key, e.target.value)}
                          disabled={!canEdit}
                          title={ATTENDANCE_STATUSES.find(s => s.v === rec?.status)?.label || 'Qeyd yoxdur'}
                          className="w-7 h-7 text-[10px] font-extrabold appearance-none text-center cursor-pointer"
                          style={{
                            background: st.background,
                            color: st.color,
                            border: `1px solid ${st.borderColor}`,
                            borderRadius: '6px',
                          }}
                        >
                          <option value="">—</option>
                          {ATTENDANCE_STATUSES.map(s => <option key={s.v} value={s.v}>{shortLabel(s.v)}</option>)}
                        </select>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableWrap>
    </div>
  )
}
