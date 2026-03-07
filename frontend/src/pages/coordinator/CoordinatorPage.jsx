import { useState, useEffect, useMemo } from 'react'
import { Search, ClipboardList } from 'lucide-react'
import { coordinatorApi } from '../../api/coordinator'
import CoordinatorPlanModal from './CoordinatorPlanModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const STATUS_CONFIG = {
  SENT_TO_COORDINATOR: { label: 'Koordinatorda', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  OFFER_SENT:          { label: 'Təklif göndərildi', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  ACCEPTED:            { label: 'Qəbul edildi', cls: 'bg-green-50 text-green-700 border-green-200' },
  REJECTED:            { label: 'Rədd edildi', cls: 'bg-red-50 text-red-700 border-red-200' },
}

const PROJECT_TYPE_LABEL = { DAILY: 'Günlük', MONTHLY: 'Aylıq' }

export default function CoordinatorPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await coordinatorApi.getRequests()
      setRequests(res.data.data || [])
    } catch {
      toast.error('Sorğular yüklənmədi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        r.requestCode?.toLowerCase().includes(q) ||
        r.companyName?.toLowerCase().includes(q) ||
        r.projectName?.toLowerCase().includes(q) ||
        r.region?.toLowerCase().includes(q)
      const matchStatus = !statusFilter || r.requestStatus === statusFilter
      return matchSearch && matchStatus
    })
  }, [requests, search, statusFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Koordinator Modulu</h1>
          <p className="text-xs text-gray-400 mt-0.5">{requests.length} sorğu</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sorğu ID, şirkət, layihə, bölgə..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">Bütün statuslar</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Şirkət / Layihə</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Texnika</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Mənbə</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Müddət</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ümumi / Xeyir</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-gray-400">
                    {requests.length === 0 ? 'Koordinatora hələ sorğu gəlməyib' : 'Filtrlərə uyğun nəticə tapılmadı'}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const status = STATUS_CONFIG[r.requestStatus] || STATUS_CONFIG.SENT_TO_COORDINATOR
                  const total = parseFloat(r.totalAmount || 0)
                  const profit = parseFloat(r.companyProfit || 0)
                  const hasPlan = !!r.planId
                  return (
                    <tr key={r.requestId} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="py-3 px-4">
                        <span className="text-xs font-mono font-semibold text-purple-600 dark:text-purple-400">{r.requestCode}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.companyName}</p>
                        {r.projectName && <p className="text-xs text-gray-400">{r.projectName}</p>}
                        {r.region && <p className="text-xs text-gray-400">{r.region}</p>}
                      </td>
                      <td className="py-3 px-4">
                        {r.equipmentName ? (
                          <div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{r.equipmentName}</p>
                            <p className="text-xs text-gray-400">{r.equipmentCode}</p>
                          </div>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                        {r.ownershipType === 'CONTRACTOR' ? (
                          <span className="text-xs text-orange-600">{r.contractorName || 'Podratçı'}</span>
                        ) : r.ownershipType === 'INVESTOR' ? (
                          <span className="text-xs text-blue-600">İnvestor</span>
                        ) : (
                          <span className="text-xs text-green-600">Şirkət</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                        {r.projectType ? `${PROJECT_TYPE_LABEL[r.projectType]} · ${r.dayCount || '—'}` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {hasPlan ? (
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{total.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼</p>
                            <p className={clsx('text-xs', profit >= 0 ? 'text-green-600' : 'text-red-500')}>
                              Xeyir: {profit.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
                            </p>
                          </div>
                        ) : <span className="text-xs text-gray-400">Plan yoxdur</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={clsx('px-2 py-0.5 rounded-md text-xs font-medium border', status.cls)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelected(r)}
                          className="flex items-center gap-1.5 ml-auto text-xs font-medium text-purple-600 hover:text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                        >
                          <ClipboardList size={14} />
                          {hasPlan ? 'Planı aç' : 'Plan yarat'}
                        </button>
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
        <CoordinatorPlanModal
          request={selected}
          onClose={() => setSelected(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
