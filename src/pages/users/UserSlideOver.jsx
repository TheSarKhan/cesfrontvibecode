import { useState } from 'react'
import { X, Pencil, Trash2, User, Shield, History, Phone, Mail, Building2, Calendar, Clock, ToggleLeft, ToggleRight } from 'lucide-react'
import { clsx } from 'clsx'
import ActivityFeed from '../../components/common/ActivityFeed'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useAuthStore } from '../../store/authStore'

const AVATAR_PALETTE = ['#3a3a3a', '#c8932a', '#0f9d6a', '#2563c8', '#7d4ec9', '#d4385a', '#e08a00', '#1a1a1a']

const TABS = [
  { id: 'info',        label: 'Məlumat',   icon: User },
  { id: 'permissions', label: 'İcazələr',  icon: Shield },
  { id: 'history',     label: 'Tarixçə',   icon: History },
]

const PERM_LABEL = {
  canGet:    { label: 'Oxumaq',   cls: 'ces-p-info' },
  canPost:   { label: 'Yazmaq',   cls: 'ces-p-ok' },
  canPut:    { label: 'Redaktə',  cls: 'ces-p-gold' },
  canDelete: { label: 'Silmək',   cls: 'ces-p-danger' },
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px dashed var(--ces-line)' }}>
      <Icon size={15} style={{ color: 'var(--ces-mute2)', flex: 'none', marginTop: 2 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="ces-sec-label" style={{ fontSize: 10, marginBottom: 3 }}>{label}</p>
        <div style={{ fontSize: 14, color: 'var(--ces-ink)' }}>{children}</div>
      </div>
    </div>
  )
}

const parseUTC = (d) => {
  if (!d) return null
  return new Date(d.includes('Z') || d.includes('+') ? d : d + 'Z')
}
const fmt = (d) => {
  const date = parseUTC(d)
  return date ? date.toLocaleString('az-AZ', { timeZone: 'Asia/Baku', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null
}

export default function UserSlideOver({ user, onClose, onEdit, onDelete, onToggleActive }) {
  const [tab, setTab] = useState('info')
  const currentUser = useAuthStore((s) => s.user)
  useEscapeKey(onClose)

  const permissions = user.permissions || user.rolePermissions || []
  const avatarBg = AVATAR_PALETTE[(user.id || 0) % AVATAR_PALETTE.length]

  return (
    <>
      <div className="ces-drawer-backdrop" onClick={onClose} />

      <div className="ces-drawer">
        {/* Header */}
        <div className="ces-drawer-head">
          <span
            style={{
              width: 48, height: 48, borderRadius: 14,
              background: avatarBg, color: '#fff',
              display: 'grid', placeItems: 'center',
              fontSize: 18, fontWeight: 700, flex: 'none',
            }}
          >
            {user.fullName?.[0]?.toUpperCase() || '?'}
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="truncate" style={{ fontSize: 18, fontWeight: 800, color: 'var(--ces-ink)', letterSpacing: '-.01em', margin: 0 }}>
              {user.fullName}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {user.roleName && (
                <span className="ces-pill ces-p-gold sm">
                  <Shield size={11} />
                  {user.roleName}
                </span>
              )}
              <span className={clsx('ces-pill sm', user.active ? 'ces-p-ok' : 'ces-p-danger')}>
                <span className="d"></span>
                {user.active ? 'Aktiv' : 'Deaktiv'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onToggleActive && (
              <button
                onClick={onToggleActive}
                className={clsx('ces-row-act', user.active ? 'danger' : 'gold')}
                title={user.active ? 'Deaktiv et' : 'Aktiv et'}
              >
                {user.active ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
              </button>
            )}
            {onEdit && (
              <button onClick={onEdit} className="ces-row-act gold" title="Redaktə et">
                <Pencil size={15} />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="ces-row-act danger" title="Sil">
                <Trash2 size={15} />
              </button>
            )}
            <button onClick={onClose} className="ces-row-act" title="Bağla">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="ces-tabs" style={{ padding: '0 12px', overflowX: 'auto', flexWrap: 'nowrap' }}>
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx('ces-tab', tab === t.id && 'on')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 14px', fontSize: 13 }}
              >
                <Icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div className="ces-drawer-body" style={{ padding: 0 }}>
          {tab === 'info' && (
            <div style={{ padding: 22 }}>
              <p className="ces-sec-label" style={{ marginBottom: 8 }}>Əlaqə</p>
              <div>
                <InfoRow icon={Mail} label="Email">
                  {user.email || <span style={{ color: 'var(--ces-mute2)' }}>—</span>}
                </InfoRow>
                <InfoRow icon={Phone} label="Telefon">
                  {user.phone
                    ? <span className="mono">{user.phone}</span>
                    : <span style={{ color: 'var(--ces-mute2)' }}>—</span>}
                </InfoRow>
              </div>

              <p className="ces-sec-label" style={{ marginTop: 22, marginBottom: 8 }}>Təşkilat</p>
              <div>
                <InfoRow icon={Building2} label="Şöbə">
                  {user.departmentName || <span style={{ color: 'var(--ces-mute2)' }}>—</span>}
                </InfoRow>
                <InfoRow icon={Shield} label="Rol">
                  {user.roleName || <span style={{ color: 'var(--ces-mute2)' }}>—</span>}
                </InfoRow>
              </div>

              <p className="ces-sec-label" style={{ marginTop: 22, marginBottom: 8 }}>Aktivlik</p>
              <div>
                <InfoRow icon={Calendar} label="Yaradılma">
                  {fmt(user.createdAt) || <span style={{ color: 'var(--ces-mute2)' }}>—</span>}
                </InfoRow>
                <InfoRow icon={Clock} label="Son giriş">
                  {currentUser?.id === user.id ? (
                    <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--ces-ok)', fontWeight: 600 }}>
                      <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ces-ok)' }} />
                      Hal-hazırda aktiv
                    </span>
                  ) : (
                    fmt(user.lastLoginAt) || <span style={{ color: 'var(--ces-mute2)' }}>—</span>
                  )}
                </InfoRow>
              </div>
            </div>
          )}

          {tab === 'permissions' && (
            <div style={{ padding: 22 }}>
              {permissions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {permissions.map((perm, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'var(--ces-surface)',
                        border: '1px solid var(--ces-line)',
                        borderRadius: 12,
                        padding: '12px 14px',
                      }}
                    >
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ces-ink)', marginBottom: 8 }}>
                        {perm.moduleName || perm.moduleCode}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(PERM_LABEL).map(([key, { label, cls }]) =>
                          perm[key] ? (
                            <span key={key} className={clsx('ces-pill sm', cls)}>{label}</span>
                          ) : null
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--ces-graphite-50)', color: 'var(--ces-mute2)', display: 'inline-grid', placeItems: 'center', marginBottom: 12 }}>
                    <Shield size={26} />
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--ces-muted)', fontWeight: 600 }}>İcazə məlumatı mövcud deyil</p>
                  <p style={{ fontSize: 12.5, color: 'var(--ces-mute2)', marginTop: 4 }}>Rollar bölməsindən icazələri idarə edin</p>
                </div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div style={{ padding: 18 }}>
              <ActivityFeed entityType="USER" entityId={user.id} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
