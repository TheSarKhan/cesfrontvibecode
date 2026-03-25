import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight, Users, Download, UserCheck, UserX, Shield } from 'lucide-react'
import * as XLSX from 'xlsx'
import { clsx } from 'clsx'
import { usersApi } from '../../api/users'
import { useAuthStore } from '../../store/authStore'
import { departmentsApi } from '../../api/departments'
import UserModal from './UserModal'
import UserSlideOver from './UserSlideOver'
import toast from 'react-hot-toast'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useSearchParams } from 'react-router-dom'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'
import Pagination from '../../components/common/Pagination'

const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#ec4899',
  '#6366f1', '#14b8a6', '#f43f5e', '#f59e0b',
]

export default function UsersPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('EMPLOYEE_MANAGEMENT', 'canPost')
  const canEdit   = hasPermission('EMPLOYEE_MANAGEMENT', 'canPut')
  const canDelete = hasPermission('EMPLOYEE_MANAGEMENT', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, editing: null })
  const [slideOver, setSlideOver] = useState(null)
  const searchRef = useRef(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') || ''
  const filterDept = searchParams.get('dept') || ''
  const filterStatus = searchParams.get('status') || ''
  const page = Number(searchParams.get('page') || '0')
  const size = Number(searchParams.get('size') || '15')

  const setSearch = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('q', v) : n.delete('q'); n.delete('page'); return n }, { replace: true })
  const setFilterDept = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('dept', v) : n.delete('dept'); n.delete('page'); return n }, { replace: true })
  const setFilterStatus = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('status', v) : n.delete('status'); return n }, { replace: true })
  const setPage = (p) => setSearchParams(prev => { const n = new URLSearchParams(prev); p > 0 ? n.set('page', String(p)) : n.delete('page'); return n }, { replace: true })
  const setPageSize = (s) => setSearchParams(prev => { const n = new URLSearchParams(prev); s !== 15 ? n.set('size', String(s)) : n.delete('size'); n.delete('page'); return n }, { replace: true })

  usePageShortcuts({
    onNew: canCreate ? () => setModal({ open: true, editing: null }) : undefined,
    searchRef,
  })

  const loadDepts = useCallback(async () => {
    try {
      const deptsRes = await departmentsApi.getAll()
      setDepartments(deptsRes.data.data || [])
    } catch { /* silent */ }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, size, ...(search && { q: search }), ...(filterDept && { departmentId: filterDept }) }
      const usersRes = await usersApi.getAllPaged(params)
      const pageData = usersRes.data.data || usersRes.data
      setData(pageData)
      setSelectedIds(new Set())
      setSlideOver(prev => prev ? (pageData.content.find(u => u.id === prev.id) ?? prev) : null)
    } catch {
      toast.error('Məlumatlar yüklənmədi')
    } finally {
      setLoading(false)
    }
  }, [page, size, search, filterDept])

  useEffect(() => { loadDepts() }, [loadDepts])
  useEffect(() => { loadData() }, [loadData])

  // Client-side status filter
  const filtered = data.content.filter(u => {
    if (filterStatus === 'active' && !u.active) return false
    if (filterStatus === 'inactive' && u.active) return false
    return true
  })

  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allSelected = filtered.length > 0 && filtered.every(x => selectedIds.has(x.id))
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(filtered.map(x => x.id)))

  const handleBulkDelete = async () => {
    if (!(await confirm({ title: 'Toplu silmə', message: `${selectedIds.size} istifadəçi silinsin?` }))) return
    setBulkLoading(true)
    try {
      await Promise.all([...selectedIds].map(id => usersApi.delete(id)))
      toast.success(`${selectedIds.size} istifadəçi silindi`)
      setSelectedIds(new Set())
      loadData()
    } catch {
      toast.error('Silinmə zamanı xəta baş verdi')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleToggleActive = async (user) => {
    try {
      await usersApi.toggleActive(user.id)
      toast.success(user.active ? 'İstifadəçi deaktiv edildi' : 'İstifadəçi aktiv edildi')
      loadData()
    } catch {
      toast.error('Əməliyyat uğursuz oldu')
    }
  }

  const handleDelete = async (user) => {
    if (!(await confirm({ title: 'İstifadəçini sil', message: `"${user.fullName}" istifadəçisini silmək istəyirsiniz?` }))) return
    try {
      await usersApi.delete(user.id)
      toast.success('İstifadəçi silindi')
      if (slideOver?.id === user.id) setSlideOver(null)
      loadData()
    } catch (err) {
      if (err?.isPending) return
      toast.error(err?.response?.data?.message || 'Silmə əməliyyatı uğursuz oldu')
    }
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString('az-AZ') : '—'
  const fmtFull = (d) => d ? new Date(d).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'

  const exportExcel = () => {
    const rows = filtered.map(u => ({
      'Ad Soyad':   u.fullName || '',
      'Email':      u.email || '',
      'Telefon':    u.phone || '',
      'Şöbə':      u.departmentName || '',
      'Rol':        u.roleName || '',
      'Status':     u.active ? 'Aktiv' : 'Deaktiv',
      'Yaradılma':  fmt(u.createdAt),
      'Son giriş':  u.lastLoginAt ? fmtFull(u.lastLoginAt) : '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [28, 28, 18, 22, 22, 12, 16, 16].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'İstifadəçilər')
    XLSX.writeFile(wb, 'istifadeciler.xlsx')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">İstifadəçilər</h1>
          <p className="text-xs text-gray-400 mt-0.5">{data.totalElements} istifadəçi</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download size={15} />
            Excel
          </button>
          {canCreate && (
            <button
              onClick={() => setModal({ open: true, editing: null })}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Yeni istifadəçi
            </button>
          )}
        </div>
      </div>

      {/* Stat cards / quick filters */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { id: '',         label: 'Cəmi',    value: data.totalElements,                                         color: 'text-gray-700 dark:text-gray-200', icon: Users },
          { id: 'active',   label: 'Aktiv',    value: data.content.filter(u => u.active).length,                 color: 'text-green-600 dark:text-green-400', icon: UserCheck },
          { id: 'inactive', label: 'Deaktiv',  value: data.content.filter(u => !u.active).length,                color: 'text-red-500 dark:text-red-400', icon: UserX },
        ].map(s => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => setFilterStatus(s.id)}
              className={clsx(
                'rounded-xl border px-4 py-3 text-left transition-colors',
                filterStatus === s.id
                  ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-700'
              )}
            >
              <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Icon size={10} className={s.color} />
                {s.label}
              </p>
              <p className={clsx('text-2xl font-bold mt-0.5', s.color)}>{s.value}</p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, email, telefon ilə axtar..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Bütün şöbələr</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Bütün statuslar</option>
          <option value="active">Aktiv</option>
          <option value="inactive">Deaktiv</option>
        </select>
      </div>

      {/* Bulk action toolbar */}
      {canDelete && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl mb-3">
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            {selectedIds.size} element seçildi
          </span>
          <div className="flex-1" />
          <button
            onClick={handleBulkDelete}
            disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
          >
            {bulkLoading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 size={13} />}
            Seçilənləri sil ({selectedIds.size})
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Ləğv et
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="w-4 h-4 accent-amber-500 cursor-pointer" />
                </th>
                {['Ad Soyad', 'Email', 'Telefon', 'Şöbə', 'Rol', 'Yaradılma', 'Son giriş', 'Status'].map(label => (
                  <th
                    key={label}
                    className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                  >
                    {label}
                  </th>
                ))}
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={10} rows={6} />
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="İstifadəçi tapılmadı"
                  description="Axtarış şərtlərini dəyişin və ya yeni istifadəçi əlavə edin"
                  action={canCreate ? () => setModal({ open: true, editing: null }) : undefined}
                  actionLabel={canCreate ? 'Yeni İstifadəçi' : undefined}
                />
              ) : (
                filtered.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => setSlideOver(user)}
                    className={clsx(
                      'border-b border-gray-100 dark:border-gray-700 transition-colors cursor-pointer',
                      slideOver?.id === user.id
                        ? 'bg-amber-50 dark:bg-amber-900/10'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                    )}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(user.id)} onChange={() => toggleSelect(user.id)}
                        className="w-4 h-4 accent-amber-500 cursor-pointer" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                          style={{ backgroundColor: AVATAR_COLORS[user.id % AVATAR_COLORS.length] }}
                        >
                          {user.fullName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{user.fullName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{user.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{user.phone || '—'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{user.departmentName || '—'}</td>
                    <td className="py-3 px-4">
                      {user.roleName ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          <Shield size={10} />
                          {user.roleName}
                        </span>
                      ) : <span className="text-gray-400 text-sm">—</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">{fmt(user.createdAt)}</td>
                    <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{user.lastLoginAt ? fmtFull(user.lastLoginAt) : '—'}</td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                        user.active
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      )}>
                        {user.active ? 'Aktiv' : 'Deaktiv'}
                      </span>
                    </td>
                    <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        {canEdit && (
                          <button
                            onClick={() => setModal({ open: true, editing: user })}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
                            title="Redaktə et"
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={clsx(
                              'p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                              user.active
                                ? 'text-emerald-500 hover:text-red-500'
                                : 'text-gray-400 hover:text-emerald-500'
                            )}
                            title={user.active ? 'Deaktiv et' : 'Aktiv et'}
                          >
                            {user.active ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(user)}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={data.page + 1}
          pageSize={data.size}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          onPage={(p) => setPage(p - 1)}
          onPageSize={(s) => setPageSize(s)}
        />
      </div>

      {modal.open && (
        <UserModal
          editing={modal.editing}
          departments={departments}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => { setModal({ open: false, editing: null }); loadData() }}
        />
      )}

      {slideOver && (
        <UserSlideOver
          user={slideOver}
          onClose={() => setSlideOver(null)}
          onEdit={canEdit ? () => { setSlideOver(null); setModal({ open: true, editing: slideOver }) } : undefined}
          onDelete={canDelete ? () => { setSlideOver(null); handleDelete(slideOver) } : undefined}
          onToggleActive={canEdit ? () => handleToggleActive(slideOver) : undefined}
        />
      )}

      <ConfirmDialog />
    </div>
  )
}
