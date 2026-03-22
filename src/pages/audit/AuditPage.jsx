import { useState, useEffect, useCallback, useRef } from 'react'
import { auditApi } from '../../api/audit'
import { useSearchParams } from 'react-router-dom'
import {
  History, Search, Filter, RefreshCw,
  PlusCircle, Edit3, Trash2, RotateCcw,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react'
import { clsx } from 'clsx'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'

const ENTITY_TYPES = [
  'MÜŞTƏRİ', 'PODRATÇI', 'İNVESTOR', 'OPERATOR',
  'SORĞU', 'LAYİHƏ', 'FAKTURA',
]

const ACTIONS = ['YARADILDI', 'YENİLƏNDİ', 'SİLİNDİ', 'BƏRPA EDİLDİ']

const ACTION_CONFIG = {
  YARADILDI:    { icon: PlusCircle,  color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20',  badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  YENİLƏNDİ:   { icon: Edit3,       color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20',    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  SİLİNDİ:     { icon: Trash2,      color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20',      badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  'BƏRPA EDİLDİ': { icon: RotateCcw, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
}

function fmtDateTime(str) {
  if (!str) return '—'
  const d = new Date(str)
  return d.toLocaleString('az-AZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function timeAgo(str) {
  const diff = Date.now() - new Date(str).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'İndicə'
  if (mins < 60) return `${mins} dəq əvvəl`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} saat əvvəl`
  const days = Math.floor(hrs / 24)
  return `${days} gün əvvəl`
}

export default function AuditPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchRef = useRef(null)

  const q          = searchParams.get('q') || ''
  const entityType = searchParams.get('entityType') || ''
  const action     = searchParams.get('action') || ''
  const from       = searchParams.get('from') || ''
  const to         = searchParams.get('to') || ''
  const page       = parseInt(searchParams.get('page') || '0', 10)

  const setParam = (key, val) => setSearchParams(prev => {
    const n = new URLSearchParams(prev)
    val ? n.set(key, val) : n.delete(key)
    if (key !== 'page') n.delete('page')
    return n
  }, { replace: true })

  const [logs, setLogs] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  usePageShortcuts({ searchRef })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await auditApi.getAll({
        q: q || undefined,
        entityType: entityType || undefined,
        action: action || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        size: 50,
      })
      const data = res.data?.data || res.data
      setLogs(data?.content || [])
      setTotalElements(data?.totalElements || 0)
      setTotalPages(data?.totalPages || 0)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [q, entityType, action, from, to, page])

  useEffect(() => { load() }, [load])

  const hasFilters = q || entityType || action || from || to
  const clearFilters = () => setSearchParams({}, { replace: true })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <History size={20} className="text-amber-500" />
            Audit Jurnal
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {totalElements > 0 ? `${totalElements} qeyd tapıldı` : 'Bütün sistem əməliyyatlarının tarixçəsi'}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Yenilə
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              value={q}
              onChange={e => setParam('q', e.target.value)}
              placeholder="Ad, istifadəçi axtar..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-amber-400 text-gray-700 dark:text-gray-200"
            />
          </div>

          {/* Entity type */}
          <select
            value={entityType}
            onChange={e => setParam('entityType', e.target.value)}
            className="px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-amber-400 text-gray-700 dark:text-gray-200"
          >
            <option value="">Bütün növlər</option>
            {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {/* Action */}
          <select
            value={action}
            onChange={e => setParam('action', e.target.value)}
            className="px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-amber-400 text-gray-700 dark:text-gray-200"
          >
            <option value="">Bütün əməliyyatlar</option>
            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          {/* Date from */}
          <input
            type="date"
            value={from}
            onChange={e => setParam('from', e.target.value)}
            className="px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-amber-400 text-gray-700 dark:text-gray-200"
          />

          {/* Date to */}
          <input
            type="date"
            value={to}
            onChange={e => setParam('to', e.target.value)}
            className="px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-amber-400 text-gray-700 dark:text-gray-200"
          />

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-xs text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
            >
              <X size={11} /> Filtri sıfırla
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 w-36">Vaxt</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 w-28">Əməliyyat</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 w-28">Növ</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Element</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">İstifadəçi</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Qeyd</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {loading ? (
              <TableSkeleton cols={6} rows={10} />
            ) : logs.length === 0 ? (
              <EmptyState
                icon={History}
                title="Qeyd tapılmadı"
                description={hasFilters ? 'Axtarış şərtlərini dəyişin' : 'Hələ heç bir əməliyyat qeydə alınmayıb'}
              />
            ) : (
              logs.map(log => {
                const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG['YENİLƏNDİ']
                const Icon = cfg.icon
                return (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    {/* Vaxt */}
                    <td className="px-4 py-3">
                      <p className="text-xs font-mono text-gray-600 dark:text-gray-300">{fmtDateTime(log.performedAt)}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(log.performedAt)}</p>
                    </td>

                    {/* Əməliyyat */}
                    <td className="px-4 py-3">
                      <span className={clsx('inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full', cfg.badge)}>
                        <Icon size={10} />
                        {log.action}
                      </span>
                    </td>

                    {/* Növ */}
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                        {log.entityType}
                      </span>
                    </td>

                    {/* Element */}
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate max-w-[180px]" title={log.entityLabel}>
                        {log.entityLabel || '—'}
                      </p>
                      {log.entityId && (
                        <p className="text-[10px] text-gray-400">ID: {log.entityId}</p>
                      )}
                    </td>

                    {/* İstifadəçi */}
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[140px]" title={log.performedBy}>
                        {log.performedBy || '—'}
                      </p>
                    </td>

                    {/* Qeyd */}
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-400 truncate max-w-[200px]" title={log.summary}>
                        {log.summary || '—'}
                      </p>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-gray-400">
            Səhifə {page + 1} / {totalPages} · Cəmi {totalElements} qeyd
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setParam('page', String(page - 1))}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i : i + Math.max(0, page - 3)
              if (p >= totalPages) return null
              return (
                <button
                  key={p}
                  onClick={() => setParam('page', String(p))}
                  className={clsx(
                    'w-7 h-7 text-xs rounded-lg transition-colors',
                    p === page
                      ? 'bg-amber-500 text-white font-bold'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  {p + 1}
                </button>
              )
            })}
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setParam('page', String(page + 1))}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
