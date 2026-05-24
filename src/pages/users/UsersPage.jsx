import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight, Users, Download, UserCheck, UserX, Shield, Eye, CheckCircle2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { clsx } from 'clsx'
import { usersApi } from '../../api/users'
import { useAuthStore } from '../../store/authStore'
import { departmentsApi } from '../../api/departments'
import { fmtDate, fmtDateTime } from '../../utils/date'
import UserModal from './UserModal'
import UserSlideOver from './UserSlideOver'
import toast from 'react-hot-toast'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useSearchParams } from 'react-router-dom'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'
import Pagination from '../../components/common/Pagination'

const AVATAR_PALETTE = ['#3a3a3a', '#c8932a', '#0f9d6a', '#2563c8', '#7d4ec9', '#d4385a', '#e08a00', '#1a1a1a']

function Avatar({ name, id, size = 'md' }) {
  const dim = size === 'sm' ? 28 : size === 'lg' ? 44 : 36
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 14 : 12.5
  const initial = name?.[0]?.toUpperCase() || '?'
  const color = AVATAR_PALETTE[(id || 0) % AVATAR_PALETTE.length]
  return (
    <span
      style={{
        width: dim, height: dim, borderRadius: 999,
        background: color, color: '#fff',
        display: 'inline-grid', placeItems: 'center',
        fontSize, fontWeight: 700, flex: 'none',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >{initial}</span>
  )
}

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
    } finally {
      setLoading(false)
    }
  }, [page, size, search, filterDept])

  useEffect(() => { loadDepts() }, [loadDepts])
  useEffect(() => { loadData() }, [loadData])

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
    }
  }

  const currentUser = useAuthStore((s) => s.user)

  const fmt = fmtDate
  const fmtFull = fmtDateTime
  const formatLastLogin = (user) => {
    if (currentUser?.id === user.id) return null
    return user.lastLoginAt ? fmtFull(user.lastLoginAt) : '—'
  }

  const exportExcel = () => {
    const rows = filtered.map(u => ({
      'Ad Soyad':   u.fullName || '',
      'Email':      u.email || '',
      'Telefon':    u.phone || '',
      'Şöbə':       u.departmentName || '',
      'Rol':        u.roleName || '',
      'Status':     u.active ? 'Aktiv' : 'Deaktiv',
      'Yaradılma':  fmt(u.createdAt),
      'Son giriş':  currentUser?.id === u.id ? 'Hal-hazırda aktiv' : (u.lastLoginAt ? fmtFull(u.lastLoginAt) : ''),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [28, 28, 18, 22, 22, 12, 16, 16].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'İstifadəçilər')
    XLSX.writeFile(wb, 'isciler.xlsx')
  }

  const activeCount = data.content.filter(u => u.active).length
  const inactiveCount = data.content.filter(u => !u.active).length

  const chips = [
    { id: '',         label: 'Hamısı' },
    { id: 'active',   label: 'Aktiv' },
    { id: 'inactive', label: 'Deaktiv' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-7 gap-4 flex-wrap">
        <div>
          <h1 className="ces-page-title">İstifadəçilər</h1>
          <p className="ces-page-sub">{data.totalElements} istifadəçi qeydiyyatda</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel} className="ces-btn ces-btn-outline">
            <Download size={15} />
            Excel-ə yüklə
          </button>
          {canCreate && (
            <button
              onClick={() => setModal({ open: true, editing: null })}
              className="ces-btn ces-btn-primary"
            >
              <Plus size={16} />
              Yeni istifadəçi
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="ces-kpi-card">
          <div className="ces-kpi-top">
            <span className="ces-kpi-lab">Cəmi</span>
            <span className="ces-kpi-ic gold"><Users size={18} /></span>
          </div>
          <div className="ces-kpi-val">{data.totalElements}</div>
        </div>
        <div className="ces-kpi-card">
          <div className="ces-kpi-top">
            <span className="ces-kpi-lab">Aktiv</span>
            <span className="ces-kpi-ic ok"><UserCheck size={18} /></span>
          </div>
          <div className="ces-kpi-val">{activeCount}</div>
        </div>
        <div className="ces-kpi-card">
          <div className="ces-kpi-top">
            <span className="ces-kpi-lab">Deaktiv</span>
            <span className="ces-kpi-ic danger"><UserX size={18} /></span>
          </div>
          <div className="ces-kpi-val">{inactiveCount}</div>
        </div>
      </div>

      {/* Quick filter chips */}
      <div className="ces-seg mb-4">
        {chips.map(chip => (
          <button
            key={chip.id || 'all'}
            onClick={() => setFilterStatus(chip.id)}
            className={filterStatus === chip.id ? 'on' : ''}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="ces-input has-icon sm flex-1 min-w-[240px]">
          <Search size={15} />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, email, telefon ilə axtar..."
          />
        </div>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="ces-select sm"
          style={{ minWidth: 180 }}
        >
          <option value="">Bütün şöbələr</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Bulk action toolbar */}
      {canDelete && selectedIds.size > 0 && (
        <div className="ces-alert gold mb-4">
          <div className="ces-al-ic"><CheckCircle2 size={18} /></div>
          <div className="flex-1 text-sm font-semibold" style={{ color: 'var(--ces-graphite)' }}>
            {selectedIds.size} element seçildi
          </div>
          <button
            onClick={handleBulkDelete}
            disabled={bulkLoading}
            className="ces-btn ces-btn-danger ces-btn-sm"
          >
            {bulkLoading
              ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Trash2 size={14} />}
            Seçilənləri sil
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ces-btn ces-btn-ghost ces-btn-sm"
          >
            Ləğv et
          </button>
        </div>
      )}

      {/* Table */}
      <div className="ces-table-wrap">
        <div className="overflow-x-auto">
          <table className="ces-tbl" style={{ minWidth: 1000 }}>
            <thead>
              <tr>
                <th className="w-chk">
                  <label className="ces-chk">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                    <span className="ces-cb"></span>
                  </label>
                </th>
                <th>Ad Soyad</th>
                <th>Email</th>
                <th>Telefon</th>
                <th>Şöbə</th>
                <th>Rol</th>
                <th>Yaradılma</th>
                <th>Son giriş</th>
                <th>Status</th>
                <th className="r">Əməliyyat</th>
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
                    style={{ cursor: 'pointer', background: slideOver?.id === user.id ? 'var(--ces-graphite-50)' : undefined }}
                  >
                    <td onClick={e => e.stopPropagation()}>
                      <label className="ces-chk">
                        <input type="checkbox" checked={selectedIds.has(user.id)} onChange={() => toggleSelect(user.id)} />
                        <span className="ces-cb"></span>
                      </label>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={user.fullName} id={user.id} size="sm" />
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ces-ink)' }}>{user.fullName}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--ces-muted)' }}>{user.email}</td>
                    <td className="mono" style={{ color: 'var(--ces-muted)', fontSize: 13 }}>{user.phone || '—'}</td>
                    <td style={{ color: 'var(--ces-ink)' }}>{user.departmentName || '—'}</td>
                    <td>
                      {user.roleName ? (
                        <span className="ces-pill ces-p-gold sm">
                          <Shield size={11} />
                          {user.roleName}
                        </span>
                      ) : <span style={{ color: 'var(--ces-mute2)' }}>—</span>}
                    </td>
                    <td className="mono" style={{ fontSize: 12.5, color: 'var(--ces-muted)' }}>{fmt(user.createdAt)}</td>
                    <td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                      {currentUser?.id === user.id ? (
                        <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--ces-ok)', fontWeight: 600 }}>
                          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ces-ok)' }} className="animate-pulse" />
                          Hal-hazırda aktiv
                        </span>
                      ) : (
                        <span style={{ color: 'var(--ces-muted)' }}>{formatLastLogin(user)}</span>
                      )}
                    </td>
                    <td>
                      <span className={clsx('ces-pill sm', user.active ? 'ces-p-ok' : 'ces-p-danger')}>
                        <span className="d"></span>
                        {user.active ? 'Aktiv' : 'Deaktiv'}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setSlideOver(user)} className="ces-row-act info" title="Bax">
                          <Eye size={15} />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => setModal({ open: true, editing: user })}
                            disabled={!user.active}
                            className="ces-row-act gold"
                            title={user.active ? 'Redaktə et' : 'Deaktiv istifadəçi redaktə edilə bilməz'}
                            style={{ opacity: user.active ? 1 : 0.3, cursor: user.active ? 'pointer' : 'not-allowed' }}
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={clsx('ces-row-act', user.active ? 'danger' : 'gold')}
                            title={user.active ? 'Deaktiv et' : 'Aktiv et'}
                          >
                            {user.active ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(user)} className="ces-row-act danger" title="Sil">
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
          onEdit={canEdit && slideOver?.active ? () => { setSlideOver(null); setModal({ open: true, editing: slideOver }) } : undefined}
          onDelete={canDelete ? () => { setSlideOver(null); handleDelete(slideOver) } : undefined}
          onToggleActive={canEdit ? () => handleToggleActive(slideOver) : undefined}
        />
      )}

      <ConfirmDialog />
    </div>
  )
}
