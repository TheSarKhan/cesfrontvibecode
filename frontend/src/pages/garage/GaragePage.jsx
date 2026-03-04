import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, Eye } from 'lucide-react'
import { garageApi } from '../../api/garage'
import EquipmentModal from './EquipmentModal'
import EquipmentSlideOver from './EquipmentSlideOver'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const STATUS_CONFIG = {
  AVAILABLE: { label: 'Mövcud', cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  RENTED: { label: 'İcarədə', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  DEFECTIVE: { label: 'Nasaz', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
  OUT_OF_SERVICE: { label: 'Xidmətdən kənarda', cls: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
}

const OWNERSHIP_LABELS = {
  COMPANY: 'Şirkət',
  INVESTOR: 'İnvestor',
  CONTRACTOR: 'Podratçı',
}

export default function GaragePage() {
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, editing: null })
  const [slideOver, setSlideOver] = useState(null) // equipment object

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [ownershipFilter, setOwnershipFilter] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await garageApi.getAll()
      setEquipment(res.data.data || res.data || [])
    } catch {
      toast.error('Texnikalar yüklənmədi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return equipment.filter((e) => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        e.name?.toLowerCase().includes(q) ||
        e.brand?.toLowerCase().includes(q) ||
        e.model?.toLowerCase().includes(q) ||
        e.serialNumber?.toLowerCase().includes(q)
      const matchStatus = !statusFilter || e.status === statusFilter
      const matchOwnership = !ownershipFilter || e.ownershipType === ownershipFilter
      return matchSearch && matchStatus && matchOwnership
    })
  }, [equipment, search, statusFilter, ownershipFilter])

  const handleDelete = async (item) => {
    if (!window.confirm(`"${item.name}" texnikasını silmək istəyirsiniz?`)) return
    try {
      await garageApi.delete(item.id)
      toast.success('Texnika silindi')
      if (slideOver?.id === item.id) setSlideOver(null)
      load()
    } catch {
      toast.error('Silmə uğursuz oldu')
    }
  }

  const openEdit = (item) => {
    setSlideOver(null)
    setModal({ open: true, editing: item })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Qaraj</h1>
          <p className="text-xs text-gray-400 mt-0.5">{equipment.length} texnika</p>
        </div>
        <button
          onClick={() => setModal({ open: true, editing: null })}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Yeni texnika
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, marka, model, seriya..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Bütün statuslar</option>
          <option value="AVAILABLE">Mövcud</option>
          <option value="RENTED">İcarədə</option>
          <option value="DEFECTIVE">Nasaz</option>
          <option value="OUT_OF_SERVICE">Xidmətdən kənarda</option>
        </select>
        <select
          value={ownershipFilter}
          onChange={(e) => setOwnershipFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Bütün mülkiyyət</option>
          <option value="COMPANY">Şirkət</option>
          <option value="INVESTOR">İnvestor</option>
          <option value="CONTRACTOR">Podratçı</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Texnika</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Marka / Model</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mülkiyyət</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Günlük tarif</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="py-3 px-4">
                      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                  {equipment.length === 0 ? 'Hələ texnika yoxdur' : 'Filtrlərə uyğun nəticə tapılmadı'}
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.AVAILABLE
                const isActive = slideOver?.id === item.id
                return (
                  <tr
                    key={item.id}
                    className={clsx(
                      'border-b border-gray-100 dark:border-gray-700 transition-colors cursor-pointer',
                      isActive ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                    )}
                    onClick={() => setSlideOver(item)}
                  >
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.name}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                      {[item.brand, item.model].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                      {OWNERSHIP_LABELS[item.ownershipType] || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx('px-2 py-0.5 rounded-md text-xs font-medium border', status.cls)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                      {item.dailyRate ? `${item.dailyRate} AZN` : '—'}
                    </td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setSlideOver(item)}
                          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
                          title="Ətraflı bax"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
                          title="Redaktə et"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
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

      {/* Equipment Modal */}
      {modal.open && (
        <EquipmentModal
          editing={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => {
            setModal({ open: false, editing: null })
            load()
          }}
        />
      )}

      {/* Slide Over */}
      {slideOver && (
        <EquipmentSlideOver
          equipment={slideOver}
          onClose={() => setSlideOver(null)}
          onEdit={() => openEdit(slideOver)}
        />
      )}
    </div>
  )
}
