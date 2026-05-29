import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronDown, ChevronRight, Plus, Trash2, Pencil, Search, Shield } from 'lucide-react'
import { rolesApi } from '../../api/roles'
import { useAuthStore } from '../../store/authStore'
import RoleModal from './RoleModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'
import Pagination from '../../components/common/Pagination'
import { useSearchParams } from 'react-router-dom'

// Action suffiksi → AZ etiket (rol icazə pill-ləri üçün)
const ACTION_LABELS = {
  GET: 'Oxumaq', POST: 'Yazmaq', PUT: 'Redaktə', DELETE: 'Silmək',
  SEND_COORDINATOR: 'Koordinatora göndər', SUBMIT_OFFER: 'Təklif göndər',
  SEND_ACCOUNTING: 'Mühasibatlığa göndər', RETURN_PROJECT: 'Layihəyə qaytar',
  APPROVE_PM: 'PM təsdiqi', CHECK_DOCUMENTS: 'Sənəd təsdiqi',
  DISPATCH: 'Texnika göndər', DELIVER: 'Təhvil-təslim',
}
const CRUD = new Set(['GET', 'POST', 'PUT', 'DELETE'])

// Kod siyahısını modul üzrə qruplaşdır: ["ACCOUNTING:GET", ...] → [["ACCOUNTING", ["GET", ...]], ...]
function groupByModule(codes) {
  const map = new Map()
  ;(codes || []).forEach((code) => {
    const i = code.indexOf(':')
    if (i < 0) return
    const mod = code.slice(0, i)
    const act = code.slice(i + 1)
    if (!map.has(mod)) map.set(mod, [])
    map.get(mod).push(act)
  })
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
}

function initials(name) {
  const parts = (name || '').trim().split(/\s+/)
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : ((name || '?')[0] || '?').toUpperCase()
}

function UserAvatar({ user }) {
  return (
    <span
      title={user.fullName}
      style={{
        width: 28,
        height: 28,
        borderRadius: 999,
        background: 'var(--ces-graphite)',
        color: 'var(--ces-gold)',
        display: 'inline-grid',
        placeItems: 'center',
        fontSize: 11,
        fontWeight: 700,
        border: '2px solid #fff',
        boxShadow: '0 0 0 1px var(--ces-line)',
      }}
    >
      {initials(user.fullName)}
    </span>
  )
}

function AvatarStack({ users }) {
  if (!users.length) return <span className="text-xs" style={{ color: 'var(--ces-mute2)' }}>İstifadəçi yoxdur</span>
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex">
        {users.slice(0, 4).map((u, i) => (
          <span key={u.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
            <UserAvatar user={u} />
          </span>
        ))}
        {users.length > 4 && (
          <span
            style={{
              marginLeft: -10,
              width: 28,
              height: 28,
              borderRadius: 999,
              background: 'var(--ces-graphite-100)',
              color: 'var(--ces-muted)',
              display: 'inline-grid',
              placeItems: 'center',
              fontSize: 11,
              fontWeight: 700,
              border: '2px solid #fff',
              boxShadow: '0 0 0 1px var(--ces-line)',
            }}
          >
            +{users.length - 4}
          </span>
        )}
      </div>
      <span className="text-xs" style={{ color: 'var(--ces-muted)' }}>{users.length} nəfər</span>
    </div>
  )
}

function PermPill({ active, children, accent }) {
  return (
    <span
      className={clsx('ces-pill sm', accent === 'purple'
        ? (active ? 'ces-p-info' : 'ces-p-mute')
        : (active ? 'ces-p-gold' : 'ces-p-mute'))}
      style={!active ? { opacity: 0.55 } : undefined}
    >
      <span className="d" />
      {children}
    </span>
  )
}

function RoleRow({ role, users, onEdit, onDelete, canEdit, canDelete }) {
  const [expanded, setExpanded] = useState(false)
  const roleUsers = users.filter((u) => (u.roleIds || (u.roleId != null ? [u.roleId] : [])).includes(role.id))

  return (
    <>
      <tr>
        <td>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="inline-grid place-items-center w-6 h-6 rounded-md transition-colors"
              style={{
                background: expanded ? 'var(--ces-gold-100)' : 'transparent',
                color: expanded ? 'var(--ces-gold-700)' : 'var(--ces-muted)',
              }}
              title={expanded ? 'Yığ' : 'Aç'}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <span className="font-semibold text-[var(--ces-ink)]">{role.name}</span>
          </div>
        </td>
        <td style={{ color: 'var(--ces-muted)' }}>{role.description || '—'}</td>
        <td>
          <AvatarStack users={roleUsers} />
        </td>
        <td>
          <div className="flex items-center gap-1 justify-end">
            {canEdit && (
              <button onClick={onEdit} className="ces-row-act gold" title="Redaktə et">
                <Pencil size={15} />
              </button>
            )}
            {canDelete && (
              <button onClick={onDelete} className="ces-row-act danger" title="Sil">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </td>
      </tr>

      {expanded && groupByModule(role.permissions).map(([moduleCode, actions]) => (
        <tr key={moduleCode} style={{ background: 'var(--ces-gold-50)' }}>
          <td style={{ paddingLeft: 50 }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--ces-gold-700)' }}>
              {moduleCode}
            </span>
          </td>
          <td colSpan={3}>
            <div className="flex items-center gap-2 flex-wrap py-1">
              {actions.map((a) => (
                <PermPill key={a} active accent={CRUD.has(a) ? undefined : 'purple'}>
                  {ACTION_LABELS[a] || a}
                </PermPill>
              ))}
            </div>
          </td>
        </tr>
      ))}

      {expanded && (!role.permissions || role.permissions.length === 0) && (
        <tr style={{ background: 'var(--ces-gold-50)' }}>
          <td colSpan={4} style={{ paddingLeft: 50 }}>
            <span className="text-xs italic" style={{ color: 'var(--ces-mute2)' }}>
              Bu rola heç bir icazə verilməyib
            </span>
          </td>
        </tr>
      )}
    </>
  )
}

export default function RolesView({ dept, users, departments, onBack }) {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('ROLE_PERMISSION', 'canPost')
  const canEdit   = hasPermission('ROLE_PERMISSION', 'canPut')
  const canDelete = hasPermission('ROLE_PERMISSION', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [loading, setLoading] = useState(true)
  const [roleModal, setRoleModal] = useState({ open: false, editing: null })
  const [searchParams, setSearchParams] = useSearchParams()
  const searchRef = useRef(null)

  const search = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page') || '0')
  const pageSize = parseInt(searchParams.get('size') || '15')

  const setSearch = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('q', v) : n.delete('q'); n.delete('page'); return n }, { replace: true })
  const setPage = (p) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('page', String(p)); return n }, { replace: true })
  const setPageSize = (s) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('size', String(s)); n.delete('page'); return n }, { replace: true })

  usePageShortcuts({
    onNew: canCreate ? () => setRoleModal({ open: true, editing: null }) : undefined,
    searchRef,
  })

  const loadRoles = useCallback(async () => {
    setLoading(true)
    try {
      const params = { departmentId: dept.id, page, size: pageSize }
      if (search) params.q = search
      const res = await rolesApi.getAllPaged(params)
      setData(res.data.data || res.data)
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Rollar yüklənmədi')
    } finally {
      setLoading(false)
    }
  }, [dept.id, page, pageSize, search])

  useEffect(() => { loadRoles() }, [loadRoles])
  useEffect(() => {
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete('page'); return n }, { replace: true })
  }, [dept.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (role) => {
    if (!(await confirm({ title: 'Rolu sil', message: `"${role.name}" rolunu silmək istəyirsiniz?` }))) return
    try {
      await rolesApi.delete(role.id)
      toast.success('Rol silindi')
      loadRoles()
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Silmə əməliyyatı uğursuz oldu')
    }
  }

  const roles = data.content

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors px-2 py-1 rounded-md"
          style={{ color: 'var(--ces-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ces-gold-700)'; e.currentTarget.style.background = 'var(--ces-gold-50)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ces-muted)'; e.currentTarget.style.background = 'transparent' }}
        >
          <ChevronLeft size={16} />
          Şöbələr
        </button>
        <span style={{ color: 'var(--ces-mute2)' }}>/</span>
        <span className="text-sm font-semibold text-[var(--ces-ink)]">{dept.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="ces-m-ic gold">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="ces-page-title">İcazələrin tənzimlənməsi</h1>
            <p className="ces-page-sub">
              {dept.name} · {data.totalElements} rol
            </p>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={() => setRoleModal({ open: true, editing: null })}
            className="ces-btn ces-btn-primary"
          >
            <Plus size={16} />
            Yeni rol
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-5 flex">
        <div className="ces-input has-icon sm" style={{ maxWidth: 360, width: '100%' }}>
          <Search size={15} />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rol axtar..."
          />
        </div>
      </div>

      <div className="ces-table-wrap">
        <div className="overflow-x-auto">
          <table className="ces-tbl" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th>Rolun adı</th>
                <th>Təsvir</th>
                <th>İstifadəçilər</th>
                <th className="r" style={{ width: 110 }}>Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {[1, 2, 3, 4].map((j) => (
                      <td key={j}>
                        <div className="h-3.5 rounded" style={{ background: 'var(--ces-graphite-100)' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm" style={{ color: 'var(--ces-muted)' }}>
                    {search ? 'Axtarış nəticəsi tapılmadı' : 'Bu şöbədə hələ rol yoxdur'}
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <RoleRow
                    key={role.id}
                    role={role}
                    users={users}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onEdit={() => setRoleModal({ open: true, editing: role })}
                    onDelete={() => handleDelete(role)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {data.totalPages > 1 && (
          <Pagination
            page={data.page + 1}
            pageSize={data.size}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            onPage={(p) => setPage(p - 1)}
            onPageSize={(s) => { setPageSize(s); setPage(0) }}
          />
        )}
      </div>

      {roleModal.open && (
        <RoleModal
          editing={roleModal.editing}
          currentDept={dept}
          departments={departments}
          onClose={() => setRoleModal({ open: false, editing: null })}
          onSaved={() => { setRoleModal({ open: false, editing: null }); loadRoles() }}
        />
      )}

      <ConfirmDialog />
    </div>
  )
}
