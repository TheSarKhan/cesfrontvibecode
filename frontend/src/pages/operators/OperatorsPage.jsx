import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, FileText, CheckCircle, AlertCircle, Phone, MapPin } from 'lucide-react'
import { operatorsApi } from '../../api/operators'
import { useAuthStore } from '../../store/authStore'
import OperatorModal from './OperatorModal'
import OperatorDocumentsModal from './OperatorDocumentsModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

export default function OperatorsPage() {
  const [operators, setOperators] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [docFilter, setDocFilter] = useState('') // '' | 'complete' | 'incomplete'
  const [modal, setModal] = useState({ open: false, editing: null })
  const [docsModal, setDocsModal] = useState(null) // operator object

  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('OPERATORS', 'POST')
  const canEdit   = hasPermission('OPERATORS', 'PUT')
  const canDelete = hasPermission('OPERATORS', 'DELETE')

  const load = async () => {
    setLoading(true)
    try {
      const res = await operatorsApi.getAll()
      setOperators(res.data.data || res.data || [])
    } catch {
      toast.error('Operatorlar yüklənmədi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return operators.filter((o) => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        o.fullName?.toLowerCase().includes(q) ||
        o.address?.toLowerCase().includes(q) ||
        o.phone?.toLowerCase().includes(q) ||
        o.specialization?.toLowerCase().includes(q)
      const matchDoc = !docFilter ||
        (docFilter === 'complete' && o.documentsComplete) ||
        (docFilter === 'incomplete' && !o.documentsComplete)
      return matchSearch && matchDoc
    })
  }, [operators, search, docFilter])

  const stats = useMemo(() => ({
    total:      operators.length,
    complete:   operators.filter((o) => o.documentsComplete).length,
    incomplete: operators.filter((o) => !o.documentsComplete).length,
  }), [operators])

  const handleDelete = async (o) => {
    if (!window.confirm(`"${o.fullName}" operatorunu silmək istəyirsiniz?`)) return
    try {
      await operatorsApi.delete(o.id)
      toast.success('Operator silindi')
      load()
    } catch {
      toast.error('Silmə uğursuz oldu')
    }
  }

  const handleDocsUpdated = (updated) => {
    setOperators((prev) => prev.map((o) => o.id === updated.id ? updated : o))
    setDocsModal(updated)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Operatorlar</h1>
          <p className="text-xs text-gray-400 mt-0.5">{operators.length} operator</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setModal({ open: true, editing: null })}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Yeni operator
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <button
          onClick={() => setDocFilter('')}
          className={clsx('rounded-xl border px-4 py-3 text-left transition-colors', docFilter === '' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-200')}
        >
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Cəmi</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.total}</p>
        </button>
        <button
          onClick={() => setDocFilter('complete')}
          className={clsx('rounded-xl border px-4 py-3 text-left transition-colors', docFilter === 'complete' ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-green-200')}
        >
          <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1"><CheckCircle size={10} className="text-green-500" /> Sənədlər tam</p>
          <p className="text-2xl font-bold text-green-600">{stats.complete}</p>
        </button>
        <button
          onClick={() => setDocFilter('incomplete')}
          className={clsx('rounded-xl border px-4 py-3 text-left transition-colors', docFilter === 'incomplete' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-200')}
        >
          <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1"><AlertCircle size={10} className="text-amber-500" /> Natamam</p>
          <p className="text-2xl font-bold text-amber-600">{stats.incomplete}</p>
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, soyad, ünvan, ixtisas, telefon..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ad Soyad</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ünvan</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Əlaqə</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">İxtisas</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sənədlər</th>
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
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                    {operators.length === 0 ? 'Hələ operator yoxdur' : 'Filtrlərə uyğun nəticə tapılmadı'}
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const uploadedCount = (o.documents || []).length
                  const total = 6
                  return (
                    <tr key={o.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      {/* Ad Soyad */}
                      <td className="py-3 px-4">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{o.fullName}</p>
                        {o.notes && <p className="text-xs text-gray-400 truncate max-w-[160px]">{o.notes}</p>}
                      </td>

                      {/* Ünvan */}
                      <td className="py-3 px-4">
                        {o.address ? (
                          <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                            <MapPin size={11} className="text-gray-400 shrink-0" />
                            {o.address}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>

                      {/* Əlaqə */}
                      <td className="py-3 px-4">
                        {o.phone && (
                          <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                            <Phone size={11} className="text-gray-400 shrink-0" />
                            {o.phone}
                          </span>
                        )}
                        {o.email && <p className="text-xs text-gray-400 mt-0.5">{o.email}</p>}
                      </td>

                      {/* İxtisas */}
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{o.specialization || '—'}</td>

                      {/* Sənədlər */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setDocsModal(o)}
                          className="flex items-center gap-1.5 group"
                        >
                          {o.documentsComplete ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-xs font-medium text-green-700 dark:text-green-400 group-hover:bg-green-100 transition-colors">
                              <CheckCircle size={11} />
                              Tam ({uploadedCount}/{total})
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs font-medium text-amber-700 dark:text-amber-400 group-hover:bg-amber-100 transition-colors">
                              <AlertCircle size={11} />
                              Natamam ({uploadedCount}/{total})
                            </span>
                          )}
                          <FileText size={13} className="text-gray-300 group-hover:text-amber-500 transition-colors" />
                        </button>
                      </td>

                      {/* Əməliyyatlar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 justify-end">
                          {canEdit && (
                            <button
                              onClick={() => setModal({ open: true, editing: o })}
                              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
                              title="Redaktə et"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(o)}
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

      {/* Modals */}
      {modal.open && (
        <OperatorModal
          editing={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => { setModal({ open: false, editing: null }); load() }}
        />
      )}

      {docsModal && (
        <OperatorDocumentsModal
          operator={docsModal}
          onClose={() => setDocsModal(null)}
          onUpdated={handleDocsUpdated}
        />
      )}
    </div>
  )
}
