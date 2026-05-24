import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, ClipboardCheck, RefreshCw, CheckCircle, XCircle, AlertCircle, Send, FileText, MessageSquare, ListChecks } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { projectManagerApi } from '../../api/projectManager'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { STATUS_CFG } from '../../constants/requests'
import PmRequestSlideOver from './PmRequestSlideOver'

const STAT_CARDS = [
  { id: 'ALL',                   label: 'Hamısı',            icon: FileText,      color: 'text-gray-500' },
  { id: 'PENDING',               label: 'Yeni gəldi',        icon: Send,          color: 'text-blue-500' },
  { id: 'PM_REVIEW',             label: 'Nəzərdən keçirir',  icon: ClipboardCheck,color: 'text-sky-500' },
  { id: 'PM_SHORTLIST_READY',    label: 'Shortlist hazır',   icon: ListChecks,    color: 'text-indigo-500' },
  { id: 'COORDINATOR_PROPOSED',  label: 'Təklif gəldi',      icon: AlertCircle,   color: 'text-fuchsia-500' },
  { id: 'PM_PRICE_NEGOTIATION',  label: 'Sifarişçi ilə',     icon: MessageSquare, color: 'text-amber-500' },
  { id: 'PM_APPROVED',           label: 'Təsdiqləndi',       icon: CheckCircle,   color: 'text-green-500' },
  { id: 'REJECTED',              label: 'Rədd',              icon: XCircle,       color: 'text-red-500' },
]

export default function ProjectManagerPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canPut = hasPermission('PROJECT_MANAGER', 'canPut')
  const { confirm, ConfirmDialog } = useConfirm()

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [quickFilter, setQuickFilter] = useState('ALL')
  const [selected, setSelected] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await projectManagerApi.getRequests()
      setRequests(res.data.data || [])
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const s = { ALL: requests.length }
    STAT_CARDS.forEach(c => {
      if (c.id !== 'ALL') s[c.id] = requests.filter(r => r.status === c.id).length
    })
    return s
  }, [requests])

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (quickFilter !== 'ALL' && r.status !== quickFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!(r.requestCode?.toLowerCase().includes(q)
            || r.companyName?.toLowerCase().includes(q)
            || r.projectName?.toLowerCase().includes(q)
            || r.region?.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [requests, quickFilter, search])

  const handleAccept = async (r, e) => {
    e?.stopPropagation()
    if (!(await confirm({ title: 'Sorğunu qəbul et', message: `"${r.companyName}" sorğusu sizə təyin edilsin?`, danger: false }))) return
    setActionLoading(r.requestId)
    try {
      await projectManagerApi.accept(r.requestId)
      toast.success('Sorğu qəbul edildi')
      load()
    } catch {} finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (r, e) => {
    e?.stopPropagation()
    if (!(await confirm({ title: 'Sorğunu rədd et', message: `"${r.companyName}" sorğusu rədd edilsin?`, danger: true }))) return
    setActionLoading(r.requestId)
    try {
      await projectManagerApi.reject(r.requestId, 'PM tərəfindən rədd edildi')
      toast.success('Sorğu rədd edildi')
      load()
    } catch {} finally {
      setActionLoading(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Layihə Meneceri</h1>
          <p className="text-xs text-gray-400 mt-0.5">{requests.length} sorğu</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none">
        {STAT_CARDS.map(s => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => setQuickFilter(s.id)}
              className={clsx(
                'rounded-xl border px-3 py-2 text-left transition-colors shrink-0 min-w-[110px]',
                quickFilter === s.id
                  ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-700'
              )}
            >
              <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Icon size={10} className={s.color} />
                {s.label}
              </p>
              <p className={clsx('text-lg font-bold mt-0.5', s.color)}>{stats[s.id] ?? 0}</p>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1 min-w-0">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sorğu ID, şirkət, layihə, bölgə..."
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <button onClick={load} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors" title="Yenilə">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Şirkət / Layihə</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bölgə</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Növ / Müddət</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                    {requests.length === 0 ? 'PM-ə hələ sorğu gəlməyib' : 'Filtrlərə uyğun nəticə tapılmadı'}
                  </td>
                </tr>
              ) : (
                filtered.map(r => {
                  const status = STATUS_CFG[r.status] || { label: r.status, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
                  return (
                    <tr
                      key={r.requestId}
                      onClick={() => setSelected(r)}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4"><span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">{r.requestCode}</span></td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.companyName}</p>
                        {r.projectName && <p className="text-xs text-gray-400">{r.projectName}</p>}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{r.region || '—'}</td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                        {r.projectType ? `${r.dayCount ? `${r.dayCount} ${r.projectType === 'DAILY' ? 'gün' : 'ay'}` : r.projectType}` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={clsx('px-2 py-0.5 rounded-md text-xs font-medium border', status.cls)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 justify-end flex-wrap">
                          {r.status === 'PENDING' && canPut && (
                            <button
                              disabled={actionLoading === r.requestId}
                              onClick={(e) => handleAccept(r, e)}
                              className="flex items-center gap-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              <CheckCircle size={13} />
                              Qəbul et
                            </button>
                          )}
                          {!['REJECTED','PM_APPROVED','DELIVERED'].includes(r.status) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelected(r) }}
                              className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                            >
                              <ClipboardCheck size={13} />
                              Aç
                            </button>
                          )}
                          {!['REJECTED','PM_APPROVED','DELIVERED'].includes(r.status) && canPut && (
                            <button
                              disabled={actionLoading === r.requestId}
                              onClick={(e) => handleReject(r, e)}
                              className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              <XCircle size={13} />
                              Ləğv
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <PmRequestSlideOver
          requestId={selected.requestId}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
      <ConfirmDialog />
    </div>
  )
}
