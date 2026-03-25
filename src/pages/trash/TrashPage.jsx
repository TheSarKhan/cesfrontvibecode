import { useState, useEffect, useCallback } from 'react'
import { Trash2, RotateCcw, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { trashApi } from '../../api/trash'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import Pagination from '../../components/common/Pagination'

const MODULES = [
  { code: null,                    label: 'Hamısı' },
  { code: 'CUSTOMER_MANAGEMENT',   label: 'Müştərilər' },
  { code: 'CONTRACTOR_MANAGEMENT', label: 'Podratçılar' },
  { code: 'INVESTORS',             label: 'İnvestorlar' },
  { code: 'OPERATORS',             label: 'Operatorlar' },
  { code: 'GARAGE',                label: 'Texnikalar' },
  { code: 'REQUESTS',              label: 'Sorğular' },
  { code: 'PROJECTS',              label: 'Layihələr' },
  { code: 'EMPLOYEE_MANAGEMENT',   label: 'İstifadəçilər / Şöbələr' },
  { code: 'ROLE_PERMISSION',       label: 'Rollar' },
  { code: 'ACCOUNTING',            label: 'İnvoiclar' },
]

const MODULE_LABEL_MAP = Object.fromEntries(
  MODULES.filter(m => m.code).map(m => [m.code, m.label])
)

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('az-AZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function DetailGrid({ details }) {
  if (!details) return null
  const entries = Object.entries(details).filter(([, v]) => v && v !== '—')
  if (entries.length === 0) return null
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
      {entries.map(([label, value]) => (
        <div key={label}>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
          <p className="text-sm text-gray-800 dark:text-gray-200 font-medium break-words">{value}</p>
        </div>
      ))}
    </div>
  )
}

export default function TrashPage() {
  const [activeModule, setActiveModule] = useState(null)
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(15)
  const [restoring, setRestoring] = useState(null)
  const [expandedKey, setExpandedKey] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setExpandedKey(null)
    const params = { page, size: pageSize }
    if (activeModule) params.module = activeModule
    if (search) params.q = search
    trashApi.getAllPaged(params)
      .then(res => setData(res.data.data || res.data))
      .catch(() => toast.error('Məlumatlar yüklənmədi'))
      .finally(() => setLoading(false))
  }, [activeModule, page, pageSize, search])

  useEffect(() => { load() }, [load])

  const handleRestore = async (item, e) => {
    e.stopPropagation()
    if (!confirm(`"${item.entityLabel}" bərpa edilsin?`)) return
    const key = item.id + item.entityType
    setRestoring(key)
    try {
      await trashApi.restore(item.entityType, item.id)
      toast.success('Məlumat bərpa edildi')
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    } finally {
      setRestoring(null)
    }
  }

  const toggleExpand = (key) => {
    setExpandedKey(prev => prev === key ? null : key)
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <Trash2 size={20} className="text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Silinmiş Məlumatlar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Silinmiş qeydlər bərpa edilə bilər</p>
        </div>
      </div>

      {/* Module tabs */}
      <div className="flex flex-wrap gap-2">
        {MODULES.map(m => (
          <button
            key={m.code ?? 'all'}
            onClick={() => { setActiveModule(m.code); setPage(0) }}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeModule === m.code
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Axtar..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{data.totalElements} qeyd</span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 border-b border-gray-50 dark:border-gray-700/50 animate-pulse bg-gray-50 dark:bg-gray-700/30" />
            ))}
          </div>
        ) : data.content.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <Trash2 size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Silinmiş məlumat yoxdur</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="w-8 px-3 py-3" />
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Ad</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Modul</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Silinmə tarixi</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.content.map((item) => {
                const key = item.id + item.entityType
                const isExpanded = expandedKey === key
                return (
                  <>
                    <tr
                      key={key}
                      onClick={() => toggleExpand(key)}
                      className={clsx(
                        'border-b border-gray-50 dark:border-gray-700/50 cursor-pointer transition-colors',
                        isExpanded
                          ? 'bg-red-50 dark:bg-red-900/10'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                      )}
                    >
                      <td className="px-3 py-3 text-gray-400">
                        {isExpanded
                          ? <ChevronDown size={15} />
                          : <ChevronRight size={15} />
                        }
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                        {item.entityLabel}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium">
                          {MODULE_LABEL_MAP[item.moduleCode] || item.moduleName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {formatDate(item.deletedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => handleRestore(item, e)}
                          disabled={restoring === key}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          <RotateCcw size={13} className={restoring === key ? 'animate-spin' : ''} />
                          Bərpa et
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={key + '_detail'} className="bg-red-50/60 dark:bg-red-900/5 border-b border-gray-100 dark:border-gray-700/50">
                        <td colSpan={5} className="px-8 py-4">
                          <DetailGrid details={item.details} />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        page={data.page + 1}
        pageSize={data.size}
        totalPages={data.totalPages}
        totalElements={data.totalElements}
        onPage={(p) => setPage(p - 1)}
        onPageSize={(s) => { setPageSize(s); setPage(0) }}
      />
    </div>
  )
}
