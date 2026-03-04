import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, Star } from 'lucide-react'
import { contractorsApi } from '../../api/contractors'
import ContractorModal from './ContractorModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const RISK_CONFIG = {
  LOW: { label: 'Aşağı', cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  MEDIUM: { label: 'Orta', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  HIGH: { label: 'Yüksək', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
}

const STATUS_CONFIG = {
  ACTIVE: { label: 'Aktiv', cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  INACTIVE: { label: 'Deaktiv', cls: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
}

function RatingStars({ rating }) {
  if (rating == null || rating === '') return <span className="text-gray-400 text-xs">—</span>
  const val = parseFloat(rating)
  return (
    <div className="flex items-center gap-1">
      <Star size={13} className="fill-amber-400 text-amber-400" />
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{val.toFixed(1)}</span>
    </div>
  )
}

export default function ContractorsPage() {
  const [contractors, setContractors] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, editing: null })

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await contractorsApi.getAll()
      setContractors(res.data.data || res.data || [])
    } catch {
      toast.error('Podratçılar yüklənmədi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return contractors.filter((c) => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        c.companyName?.toLowerCase().includes(q) ||
        c.voen?.toLowerCase().includes(q) ||
        c.contactPerson?.toLowerCase().includes(q)
      const matchStatus = !statusFilter || c.status === statusFilter
      const matchRisk = !riskFilter || c.riskLevel === riskFilter
      return matchSearch && matchStatus && matchRisk
    })
  }, [contractors, search, statusFilter, riskFilter])

  const handleDelete = async (c) => {
    if (!window.confirm(`"${c.companyName}" podratçısını silmək istəyirsiniz?`)) return
    try {
      await contractorsApi.delete(c.id)
      toast.success('Podratçı silindi')
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
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Podratçılar</h1>
          <p className="text-xs text-gray-400 mt-0.5">{contractors.length} podratçı</p>
        </div>
        <button
          onClick={() => setModal({ open: true, editing: null })}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Yeni podratçı
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Şirkət adı, VÖEN, əlaqə şəxsi..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Bütün statuslar</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="INACTIVE">Deaktiv</option>
        </select>
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Bütün risklər</option>
          <option value="LOW">Aşağı risk</option>
          <option value="MEDIUM">Orta risk</option>
          <option value="HIGH">Yüksək risk</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Şirkət adı</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">VÖEN</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Əlaqə şəxsi</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ödəniş növü</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Risk</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reytinq</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="py-3 px-4">
                      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-gray-400">
                  {contractors.length === 0 ? 'Hələ podratçı yoxdur' : 'Filtrlərə uyğun nəticə tapılmadı'}
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const risk = RISK_CONFIG[c.riskLevel] || RISK_CONFIG.LOW
                const status = STATUS_CONFIG[c.status] || STATUS_CONFIG.ACTIVE
                return (
                  <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.companyName}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{c.voen || '—'}</td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{c.contactPerson || '—'}</td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{c.paymentType || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={clsx('px-2 py-0.5 rounded-md text-xs font-medium border', risk.cls)}>
                        {risk.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx('px-2 py-0.5 rounded-md text-xs font-medium border', status.cls)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <RatingStars rating={c.rating} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setModal({ open: true, editing: c })}
                          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
                          title="Redaktə et"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <ContractorModal
          editing={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => { setModal({ open: false, editing: null }); load() }}
        />
      )}
    </div>
  )
}
