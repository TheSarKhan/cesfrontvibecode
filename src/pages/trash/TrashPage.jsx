import { useState, useEffect, useCallback, Fragment } from 'react'
import { Trash2, RotateCcw, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { trashApi } from '../../api/trash'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import Pagination from '../../components/common/Pagination'
import TableSkeleton from '../../components/common/TableSkeleton'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useSearchParams } from 'react-router-dom'

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
  if (entries.length === 0) return (
    <p className="text-[12.5px] text-[var(--ces-muted)] italic">Əlavə məlumat yoxdur</p>
  )
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3.5">
      {entries.map(([label, value]) => (
        <div key={label}>
          <p className="text-[10.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.12em] mb-1">{label}</p>
          <p className="text-[13px] text-[var(--ces-ink)] font-medium break-words">{value}</p>
        </div>
      ))}
    </div>
  )
}

export default function TrashPage() {
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState(null)
  const [expandedKey, setExpandedKey] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const { confirm, ConfirmDialog } = useConfirm()

  const activeModule = searchParams.get('module') || null
  const search = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page') || '0')
  const pageSize = parseInt(searchParams.get('size') || '15')

  const setActiveModule = (mod) => setSearchParams(p => { const n = new URLSearchParams(p); mod ? n.set('module', mod) : n.delete('module'); n.delete('page'); return n }, { replace: true })
  const setSearch = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('q', v) : n.delete('q'); n.delete('page'); return n }, { replace: true })
  const setPage = (p) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('page', String(p)); return n }, { replace: true })
  const setPageSize = (s) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('size', String(s)); n.delete('page'); return n }, { replace: true })

  const load = useCallback(() => {
    setLoading(true)
    setExpandedKey(null)
    const params = { page, size: pageSize }
    if (activeModule) params.module = activeModule
    if (search) params.q = search
    trashApi.getAllPaged(params)
      .then(res => setData(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeModule, page, pageSize, search])

  useEffect(() => { load() }, [load])

  const handleRestore = async (item, e) => {
    e.stopPropagation()
    if (!(await confirm({
      title: 'Məlumatı bərpa et',
      message: `"${item.entityLabel}" bərpa edilsin?`,
      confirmText: 'Bərpa et',
      danger: false,
    }))) return
    const key = item.id + item.entityType
    setRestoring(key)
    try {
      await trashApi.restore(item.entityType, item.id)
      toast.success('Məlumat bərpa edildi')
      load()
    } catch {
      // error toast handled by axios interceptor
    } finally {
      setRestoring(null)
    }
  }

  const toggleExpand = (key) => {
    setExpandedKey(prev => prev === key ? null : key)
  }

  return (
    <div className="ces-font">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-7">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[16px] bg-[var(--ces-danger-100)] grid place-items-center shrink-0">
            <Trash2 size={22} className="text-[var(--ces-danger)]" />
          </div>
          <div>
            <div className="font-mono text-[12px] font-semibold text-[var(--ces-danger)] tracking-wider mb-1.5">RECYCLE BIN</div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-[var(--ces-ink)] leading-tight">Silinmiş Məlumatlar</h1>
            <p className="text-sm text-[var(--ces-muted)] mt-1">
              <span className="font-semibold text-[var(--ces-ink)]">{data.totalElements}</span> qeyd bərpa edilə bilər
            </p>
          </div>
        </div>
      </div>

      {/* Module filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {MODULES.map(m => {
          const on = activeModule === m.code
          return (
            <button
              key={m.code ?? 'all'}
              onClick={() => setActiveModule(m.code)}
              className={clsx(
                'px-3.5 py-1.5 rounded-full text-[12.5px] font-bold tracking-tight transition-colors',
                on
                  ? 'bg-[var(--ces-graphite)] text-[var(--ces-on-primary)]'
                  : 'bg-white text-[var(--ces-graphite)] border border-[var(--ces-line)] hover:border-[var(--ces-graphite)]'
              )}
            >
              {m.label}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ces-mute2)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ad və ya identifikator ilə axtar..."
            className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-[var(--ces-line)] rounded-[11px] text-[var(--ces-ink)] placeholder-[var(--ces-mute2)] focus:outline-none focus:border-[var(--ces-graphite)] focus:ring-[3px] focus:ring-[rgba(58,58,58,0.1)] transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[20px] overflow-hidden shadow-[0_1px_2px_rgba(58,58,58,0.06),0_1px_1px_rgba(58,58,58,0.04)]">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-[var(--ces-line)] bg-white">
              <th className="w-10 px-3 py-3.5" />
              <th className="text-left px-4 py-3.5 text-[11.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.1em]">Ad</th>
              <th className="text-left px-4 py-3.5 text-[11.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.1em]">Modul</th>
              <th className="text-left px-4 py-3.5 text-[11.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.1em]">Silinmə tarixi</th>
              <th className="px-4 py-3.5 text-[11.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.1em] text-right">Əməliyyat</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton cols={5} rows={6} />
            ) : data.content.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="w-16 h-16 rounded-[18px] bg-[var(--ces-graphite-50)] grid place-items-center mb-4 border border-[var(--ces-line)]">
                      <Trash2 size={28} className="text-[var(--ces-mute2)]" />
                    </div>
                    <h3 className="text-[17px] font-extrabold text-[var(--ces-ink)] tracking-tight">Silinmiş məlumat yoxdur</h3>
                    <p className="text-[13px] text-[var(--ces-muted)] mt-1.5 max-w-[380px]">
                      {activeModule || search
                        ? 'Seçilmiş filtrə uyğun qeyd tapılmadı'
                        : 'Səbət təmizdir — bərpa ediləcək məlumat yoxdur'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              data.content.map((item) => {
                const key = item.id + item.entityType
                const isExpanded = expandedKey === key
                const isRestoring = restoring === key
                return (
                  <Fragment key={key}>
                    <tr
                      onClick={() => toggleExpand(key)}
                      className={clsx(
                        'border-b border-[var(--ces-line-2)] cursor-pointer transition-colors',
                        isExpanded
                          ? 'bg-[var(--ces-gold-50)]'
                          : 'hover:bg-[var(--ces-graphite-50)]'
                      )}
                    >
                      <td className="px-3 py-3.5 text-[var(--ces-muted)]">
                        {isExpanded
                          ? <ChevronDown size={15} />
                          : <ChevronRight size={15} />
                        }
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold text-[var(--ces-ink)]">{item.entityLabel}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--ces-graphite-50)] text-[var(--ces-graphite)] text-[11.5px] font-bold">
                          {MODULE_LABEL_MAP[item.moduleCode] || item.moduleName}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[12.5px] text-[var(--ces-muted)] tabular-nums">
                        {formatDate(item.deletedAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleRestore(item, e)}
                          disabled={isRestoring}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[var(--ces-ok-100)] hover:bg-[#d8f5d2] text-[var(--ces-ok)] text-[12px] font-bold transition-colors disabled:opacity-60 disabled:pointer-events-none"
                        >
                          <RotateCcw size={13} className={isRestoring ? 'animate-spin' : ''} />
                          {isRestoring ? 'Bərpa olunur...' : 'Bərpa et'}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-[var(--ces-gold-50)] border-b border-[var(--ces-line-2)]">
                        <td />
                        <td colSpan={4} className="px-4 pb-5 pt-2">
                          <div className="bg-white border border-[var(--ces-line)] rounded-[14px] p-5 shadow-[0_1px_2px_rgba(58,58,58,0.06)]">
                            <p className="text-[11px] tracking-[0.16em] uppercase font-bold text-[var(--ces-muted)] mb-4">Silinmiş qeydin detalları</p>
                            <DetailGrid details={item.details} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>

        <Pagination
          page={data.page + 1}
          pageSize={data.size}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          onPage={(p) => setPage(p - 1)}
          onPageSize={(s) => { setPageSize(s); setPage(0) }}
        />
      </div>

      <ConfirmDialog />
    </div>
  )
}
