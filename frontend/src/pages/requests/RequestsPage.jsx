import { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, ChevronDown, Send } from 'lucide-react'
import { requestsApi } from '../../api/requests'
import { useAuthStore } from '../../store/authStore'
import RequestModal from './RequestModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const STATUS_CONFIG = {
  DRAFT:                { label: 'Qaralama',          cls: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
  PENDING:              { label: 'Gözləyir',           cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  SENT_TO_COORDINATOR:  { label: 'Kordinatorda',       cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' },
  OFFER_SENT:           { label: 'Təklif göndərildi', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  ACCEPTED:             { label: 'Qəbul edildi',       cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  REJECTED:             { label: 'Rədd edildi',        cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
}

// Hər sətrin action dropdown-u
function ActionMenu({ request, canSendToCoordinator, onRefresh }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const doSubmit = async () => {
    setOpen(false)
    try {
      await requestsApi.submit(request.id)
      toast.success('Sorğu Alım-Satım komandasına göndərildi')
      onRefresh()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Uğursuz oldu')
    }
  }

  const doSendCoordinator = async () => {
    setOpen(false)
    try {
      await requestsApi.sendToCoordinator(request.id)
      toast.success('Kordinatora göndərildi')
      onRefresh()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Uğursuz oldu')
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
        title="Əməliyyatlar"
      >
        <ChevronDown size={15} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 overflow-hidden py-1">
          {request.status === 'DRAFT' && (
            <button onClick={doSubmit} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
              <Send size={14} />
              Alım-Satım-a göndər
            </button>
          )}
          {request.status === 'PENDING' && canSendToCoordinator && (
            <button onClick={doSendCoordinator} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
              <Send size={14} />
              Kordinatora göndər
            </button>
          )}
          {open && !['SENT_TO_COORDINATOR','OFFER_SENT','ACCEPTED'].includes(request.status) && (
            <div className="border-t border-gray-100 dark:border-gray-700 mt-1" />
          )}
        </div>
      )}

    </div>
  )
}

export default function RequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, editing: null })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canSendToCoordinator = hasPermission('REQUESTS', 'canSendToCoordinator')

  const load = async () => {
    setLoading(true)
    try {
      const res = await requestsApi.getAll()
      setRequests(res.data.data || res.data || [])
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
      const matchStatus = !statusFilter || r.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [requests, search, statusFilter])

  const handleDelete = async (r) => {
    if (!window.confirm(`"${r.requestCode || r.companyName}" sorğusunu silmək istəyirsiniz?`)) return
    try {
      await requestsApi.delete(r.id)
      toast.success('Sorğu silindi')
      load()
    } catch {
      toast.error('Silmə uğursuz oldu')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Sorğular</h1>
          <p className="text-xs text-gray-400 mt-0.5">{requests.length} sorğu</p>
        </div>
        <button
          onClick={() => setModal({ open: true, editing: null })}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Yeni sorğu
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sorğu ID, şirkət, layihə, bölgə..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Bütün statuslar</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Şirkət / Layihə</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bölgə</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Daşınma</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Texnika</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Yaradan</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-gray-400">
                    {requests.length === 0 ? 'Hələ sorğu yoxdur' : 'Filtrlərə uyğun nəticə tapılmadı'}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const status = STATUS_CONFIG[r.status] || STATUS_CONFIG.DRAFT
                  const canEdit = ['DRAFT', 'PENDING'].includes(r.status)
                  return (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="py-3 px-4">
                        <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">
                          {r.requestCode || `REQ-${String(r.id).padStart(4, '0')}`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.companyName}</p>
                        {r.projectName && <p className="text-xs text-gray-400">{r.projectName}</p>}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{r.region || '—'}</td>
                      <td className="py-3 px-4">
                        {r.transportationRequired ? (
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {parseFloat(r.transportationPrice || 0).toLocaleString('az-AZ')} ₼
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Yoxdur</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {r.selectedEquipmentName ? (
                          <div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{r.selectedEquipmentName}</p>
                            <p className="text-xs text-gray-400">{r.selectedEquipmentCode}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Seçilməyib</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={clsx('px-2 py-0.5 rounded-md text-xs font-medium border', status.cls)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{r.createdByName || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 justify-end">
                          {canEdit && (
                            <button
                              onClick={() => setModal({ open: true, editing: r })}
                              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
                              title="Redaktə et"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          <ActionMenu request={r} canSendToCoordinator={canSendToCoordinator} onRefresh={load} />
                          {['DRAFT', 'PENDING'].includes(r.status) && (
                            <button
                              onClick={() => handleDelete(r)}
                              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"
                              title="Sil"
                            >
                              <Trash2 size={15} />
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

      {modal.open && (
        <RequestModal
          editing={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => { setModal({ open: false, editing: null }); load() }}
        />
      )}
    </div>
  )
}
