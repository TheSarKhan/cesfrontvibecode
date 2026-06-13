import { Trash2, Pencil, Users, Shield, ChevronRight } from 'lucide-react'

function initials(name) {
  const parts = (name || '').trim().split(/\s+/)
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : ((name || '?')[0] || '?').toUpperCase()
}

function UserAvatar({ user }) {
  return (
    <div
      title={user.fullName}
      style={{
        width: 30,
        height: 30,
        borderRadius: 999,
        background: 'var(--ces-graphite)',
        color: 'var(--ces-gold)',
        display: 'inline-grid',
        placeItems: 'center',
        fontSize: 11,
        fontWeight: 700,
        border: '2px solid #fff',
        boxShadow: '0 0 0 1px var(--ces-line)',
        fontFamily: 'inherit',
      }}
    >
      {initials(user.fullName)}
    </div>
  )
}

export default function DepartmentCard({ dept, users, roleCount, onSelect, onEdit, onDelete }) {
  return (
    <div
      onClick={onSelect}
      className="ces-card group cursor-pointer transition-all"
      style={{ padding: 0, overflow: 'hidden' }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="ces-m-ic gold" style={{ width: 42, height: 42 }}>
              <Shield size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[var(--ces-ink)] m-0 truncate" title={dept.name}>
                {dept.name}
              </h3>
              {dept.description && (
                <p className="text-xs text-[var(--ces-muted)] mt-1 line-clamp-2 m-0" title={dept.description}>
                  {dept.description}
                </p>
              )}
            </div>
          </div>

          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit() }}
                  className="ces-row-act gold"
                  title="Redaktə et"
                >
                  <Pencil size={15} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete() }}
                  className="ces-row-act danger"
                  title="Sil"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="ces-pill ces-p-mute sm">
            <Users size={11} />
            {users.length} istifadəçi
          </span>
          {roleCount != null && (
            <span className="ces-pill ces-p-gold sm">
              <Shield size={11} />
              {roleCount} rol
            </span>
          )}
        </div>

        {users.length > 0 ? (
          <div className="flex items-center" style={{ marginLeft: 0 }}>
            {users.slice(0, 5).map((u, i) => (
              <span key={u.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
                <UserAvatar user={u} />
              </span>
            ))}
            {users.length > 5 && (
              <span
                style={{
                  marginLeft: -10,
                  width: 30,
                  height: 30,
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
                +{users.length - 5}
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs italic m-0" style={{ color: 'var(--ces-mute2)' }}>
            İstifadəçi yoxdur
          </p>
        )}
      </div>

      <div
        className="flex items-center justify-between px-5 py-3 text-xs font-semibold transition-colors"
        style={{
          background: 'var(--ces-graphite-50)',
          color: 'var(--ces-muted)',
          borderTop: '1px solid var(--ces-line)',
        }}
      >
        <span>Rolları idarə et</span>
        <ChevronRight size={14} />
      </div>
    </div>
  )
}
