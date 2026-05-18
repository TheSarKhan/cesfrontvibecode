import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import { useAuthStore } from '../../store/authStore'

const STATUSES = [
  { v: 'PRESENT', label: 'İşdə', cls: 'bg-green-100 text-green-700 border-green-300' },
  { v: 'ABSENT', label: 'Yoxdur', cls: 'bg-red-100 text-red-700 border-red-300' },
  { v: 'LEAVE', label: 'Məzuniyyət', cls: 'bg-blue-100 text-blue-700 border-blue-300' },
  { v: 'SICK', label: 'Xəstə', cls: 'bg-orange-100 text-orange-700 border-orange-300' },
  { v: 'HOLIDAY', label: 'Bayram', cls: 'bg-purple-100 text-purple-700 border-purple-300' },
  { v: 'BUSINESS_TRIP', label: 'Ezamiyyət', cls: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
]

const monthEnd = (year, month) => new Date(year, month, 0).getDate()

export default function AttendancePage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canEdit = hasPermission('HR_MANAGEMENT', 'canPost')

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [employees, setEmployees] = useState([])
  const [records, setRecords] = useState({}) // { empId: { 'YYYY-MM-DD': { status, hours }} }
  const [loading, setLoading] = useState(false)

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
      const end = `${year}-${String(month).padStart(2, '0')}-${String(monthEnd(year, month)).padStart(2, '0')}`
      const recRes = await hrApi.getAttendance({ start, end })
      const recs = recRes.data?.data ?? recRes.data ?? []
      const map = {}
      for (const r of recs) {
        if (!map[r.employeeId]) map[r.employeeId] = {}
        map[r.employeeId][r.date] = { status: r.status, hoursWorked: r.hoursWorked, id: r.id }
      }
      setRecords(map)
    } catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Yüklənmədi') } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [year, month])

  const setCell = async (empId, date, status) => {
    if (!canEdit) return
    try {
      await hrApi.upsertAttendance({ employeeId: empId, date, status, hoursWorked: status === 'PRESENT' ? 8 : 0 })
      setRecords(prev => ({ ...prev, [empId]: { ...(prev[empId] || {}), [date]: { status, hoursWorked: status === 'PRESENT' ? 8 : 0 } } }))
    } catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Qeyd edilə bilmədi') }
  }

  const cellColor = (status) => {
    return STATUSES.find(s => s.v === status)?.cls || 'bg-gray-50 text-gray-400 border-gray-200'
  }
  const shortLabel = (status) => {
    if (!status) return '—'
    const map = { PRESENT: 'İ', ABSENT: 'Y', LEAVE: 'M', SICK: 'X', HOLIDAY: 'B', BUSINESS_TRIP: 'E' }
    return map[status] || status[0]
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Calendar size={22} className="text-indigo-600" />
            Davamiyyət
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Aylıq iş günləri</p>
        </div>
        <button onClick={() => navigate('/hr')} className="px-3 py-2 text-xs font-medium text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50">← HR</button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr'].map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" />

        <div className="flex items-center gap-2 ml-auto">
          {STATUSES.map(s => (
            <span key={s.v} className={`px-2 py-1 rounded text-[10px] font-medium border ${s.cls}`}>{s.label}</span>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 text-gray-500">
              <th className="px-3 py-2 text-left sticky left-0 bg-gray-50 dark:bg-gray-900 z-10 min-w-[180px] border-r border-gray-200 dark:border-gray-700">İşçi</th>
              {days.map(d => (
                <th key={d} className="w-8 px-1 py-2 text-center font-medium">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? <tr><td colSpan={days.length + 1} className="text-center py-6 text-gray-400">Yüklənir...</td></tr>
              : employees.length === 0 ? <tr><td colSpan={days.length + 1} className="text-center py-6 text-gray-400">İşçi yoxdur</td></tr>
              : employees.map(emp => (
                <tr key={emp.id}>
                  <td className="px-3 py-2 sticky left-0 bg-white dark:bg-gray-800 z-10 border-r border-gray-200 dark:border-gray-700 font-medium text-gray-800 dark:text-gray-100">
                    {emp.fullName}
                    <p className="text-[10px] text-gray-400">{emp.positionName || '—'}</p>
                  </td>
                  {days.map(d => {
                    const key = dateKey(d)
                    const rec = records[emp.id]?.[key]
                    return (
                      <td key={d} className="p-0.5 text-center">
                        <select
                          value={rec?.status || ''}
                          onChange={(e) => setCell(emp.id, key, e.target.value)}
                          disabled={!canEdit}
                          className={`w-7 h-7 rounded text-[10px] font-bold border cursor-pointer text-center ${cellColor(rec?.status)} appearance-none`}
                          title={STATUSES.find(s => s.v === rec?.status)?.label || 'Qeyd yox'}
                        >
                          <option value="">—</option>
                          {STATUSES.map(s => <option key={s.v} value={s.v}>{shortLabel(s.v)}</option>)}
                        </select>
                      </td>
                    )
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
