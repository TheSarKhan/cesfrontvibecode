import { useState, useEffect, useRef } from 'react'
import { User, Mail, Phone, Lock, Camera, Save, Eye, EyeOff, Shield, Building2, Loader2, Trash2 } from 'lucide-react'
import { usersApi } from '../../api/users'
import { useAuthStore } from '../../store/authStore'
import axiosInstance from '../../api/axios'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const PHONE_REGEX = /^(\+994|0)(10|12|50|51|55|60|70|77|99)\d{7}$/
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
const PHONE_MAX_LEN = 13 // "+994" + 9 rəqəm

// Telefon sahəsi üçün yalnız "+" və rəqəmlərə icazə ver; "+" yalnız başda;
// uzunluğu maksimuma kəs.
function sanitizePhone(raw) {
  let s = String(raw ?? '').replace(/[^\d+]/g, '')
  if (s.includes('+')) {
    const startsWithPlus = s[0] === '+'
    s = (startsWithPlus ? '+' : '') + s.replace(/\+/g, '')
  }
  return s.slice(0, PHONE_MAX_LEN)
}

function initials(name) {
  const parts = (name || '').trim().split(/\s+/)
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : ((name || '?')[0] || '?').toUpperCase()
}

/* ─── Auth-protected profile image (blob) ───────────────────── */
function ProfileAvatar({ user, size = 120, bustKey }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user?.profileImage) { setBlobUrl(null); return }
    let cancelled = false
    let url = null
    setLoading(true)
    axiosInstance.get('/users/me/profile-image', { responseType: 'blob' })
      .then((res) => {
        url = URL.createObjectURL(res.data)
        if (!cancelled) setBlobUrl(url)
      })
      .catch(() => { if (!cancelled) setBlobUrl(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
  }, [user?.profileImage, bustKey])

  if (loading) {
    return (
      <div
        className="rounded-full grid place-items-center"
        style={{ width: size, height: size, background: 'var(--ces-graphite-50)' }}
      >
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--ces-mute2)' }} />
      </div>
    )
  }

  if (blobUrl) {
    return (
      <img
        src={blobUrl}
        alt={user?.fullName}
        className="rounded-full object-cover"
        style={{ width: size, height: size, border: '3px solid var(--ces-gold)', boxShadow: 'var(--ces-shadow)' }}
      />
    )
  }

  return (
    <div
      className="rounded-full grid place-items-center font-extrabold"
      style={{
        width: size,
        height: size,
        background: 'var(--ces-graphite)',
        color: 'var(--ces-gold)',
        fontSize: Math.round(size * 0.32),
        border: '3px solid var(--ces-gold)',
        boxShadow: 'var(--ces-shadow)',
      }}
    >
      {initials(user?.fullName || user?.username)}
    </div>
  )
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const refetchMe = useAuthStore((s) => s.refetchMe)
  const [tab, setTab] = useState('contact')
  const [imgBust, setImgBust] = useState(0)

  useEffect(() => { refetchMe() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="mb-6">
        <h1 className="ces-page-title">Profil</h1>
        <p className="ces-page-sub">Şəxsi məlumatlar, əlaqə detalları və şifrəni idarə edin</p>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: '320px 1fr' }}>
        {/* Left: identity card */}
        <ProfileIdentityCard user={user} imgBust={imgBust} onImageChanged={() => setImgBust((v) => v + 1)} />

        {/* Right: tabs + forms */}
        <div className="min-w-0">
          <div className="ces-tabs mb-5">
            <button
              onClick={() => setTab('contact')}
              className={clsx('ces-tab', tab === 'contact' && 'on')}
            >
              <span className="inline-flex items-center gap-2">
                <User size={14} />
                Əlaqə məlumatları
              </span>
            </button>
            <button
              onClick={() => setTab('password')}
              className={clsx('ces-tab', tab === 'password' && 'on')}
            >
              <span className="inline-flex items-center gap-2">
                <Lock size={14} />
                Şifrəni dəyişdir
              </span>
            </button>
          </div>

          {tab === 'contact' && <ContactForm user={user} onSaved={refetchMe} />}
          {tab === 'password' && <PasswordForm />}
        </div>
      </div>
    </div>
  )
}

/* ─── Left identity card ───────────────────────────────────── */
function ProfileIdentityCard({ user, imgBust, onImageChanged }) {
  const fileRef = useRef(null)
  const refetchMe = useAuthStore((s) => s.refetchMe)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Fayl 5 MB-dan böyük ola bilməz')
      e.target.value = ''
      return
    }
    setUploading(true)
    try {
      await usersApi.uploadProfileImage(file)
      await refetchMe()
      onImageChanged()
      toast.success('Profil şəkli yeniləndi')
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Şəkil yüklənə bilmədi')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="ces-card text-center" style={{ padding: 28 }}>
      <div className="relative inline-block mb-4">
        <ProfileAvatar user={user} size={140} bustKey={imgBust} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute inline-grid place-items-center transition-all"
          style={{
            bottom: 4,
            right: 4,
            width: 36,
            height: 36,
            borderRadius: 999,
            background: 'var(--ces-gold)',
            color: 'var(--ces-on-gold)',
            border: '3px solid var(--ces-surface)',
            boxShadow: 'var(--ces-shadow-sm)',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1,
          }}
          title="Şəkli dəyiş"
          onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.background = 'var(--ces-gold-700)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ces-gold)' }}
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <h2 className="text-lg font-extrabold m-0 text-[var(--ces-ink)]">{user?.fullName || '—'}</h2>
      {user?.role && (
        <p className="text-xs mt-1 mb-3 uppercase tracking-[.1em] font-bold" style={{ color: 'var(--ces-gold-700)' }}>
          {user.role}
        </p>
      )}

      <div className="space-y-2 text-left mt-4 pt-4" style={{ borderTop: '1px solid var(--ces-line)' }}>
        {user?.department && (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ces-muted)' }}>
            <Building2 size={13} style={{ color: 'var(--ces-mute2)' }} />
            <span className="text-[var(--ces-ink)] font-medium">{user.department}</span>
          </div>
        )}
        {user?.email && (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ces-muted)' }}>
            <Mail size={13} style={{ color: 'var(--ces-mute2)' }} />
            <span className="truncate text-[var(--ces-ink)]">{user.email}</span>
          </div>
        )}
        {user?.phone && (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ces-muted)' }}>
            <Phone size={13} style={{ color: 'var(--ces-mute2)' }} />
            <span className="mono text-[var(--ces-ink)]">{user.phone}</span>
          </div>
        )}
        {user?.hasApproval && (
          <div className="flex items-center gap-2 text-sm mt-3 pt-3" style={{ borderTop: '1px dashed var(--ces-line)' }}>
            <Shield size={13} style={{ color: 'var(--ces-gold-700)' }} />
            <span className="text-xs font-bold" style={{ color: 'var(--ces-gold-700)' }}>
              Təsdiq icazəsi var
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Contact form ───────────────────────────────────────── */
function ContactForm({ user, onSaved }) {
  const [form, setForm] = useState({ email: '', phone: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm({ email: user?.email || '', phone: user?.phone || '' })
    setErrors({})
  }, [user?.email, user?.phone])

  const isDirty = form.email !== (user?.email || '') || form.phone !== (user?.phone || '')

  const validate = () => {
    const errs = {}
    if (!form.email?.trim()) errs.email = 'Email boş ola bilməz'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email formatı düzgün deyil'

    const phone = form.phone?.trim() || ''
    if (phone) {
      if (/^0+$/.test(phone) || /^\+?9940+$/.test(phone)) {
        errs.phone = 'Telefon nömrəsi yalnız sıfırlardan ibarət ola bilməz'
      } else if (!PHONE_REGEX.test(phone)) {
        errs.phone = 'Düzgün Azərbaycan nömrəsi daxil edin (məs: +994501234567)'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await usersApi.updateContact({ email: form.email.trim(), phone: form.phone?.trim() || null })
      await onSaved()
      toast.success('Əlaqə məlumatları yeniləndi')
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Yenilənə bilmədi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="ces-card" style={{ padding: 26 }}>
      <div className="flex items-center gap-2 mb-5 pb-4" style={{ borderBottom: '1px solid var(--ces-line)' }}>
        <div className="ces-m-ic gold" style={{ width: 36, height: 36 }}>
          <User size={16} />
        </div>
        <div>
          <h3 className="text-base font-extrabold m-0 text-[var(--ces-ink)]">Əlaqə məlumatları</h3>
          <p className="text-xs m-0" style={{ color: 'var(--ces-muted)' }}>Email və telefon nömrəsini yeniləyin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
        <div className="ces-field">
          <label>Email <span className="req">*</span></label>
          <div className={clsx('ces-input has-icon', errors.email && 'is-error')}>
            <Mail size={14} />
            <input
              type="email"
              value={form.email}
              onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); if (errors.email) setErrors((p) => ({ ...p, email: undefined })) }}
              placeholder="user@example.com"
            />
          </div>
          {errors.email && <span className="ces-err">{errors.email}</span>}
        </div>

        <div className="ces-field">
          <label>Telefon</label>
          <div className={clsx('ces-input has-icon', errors.phone && 'is-error')}>
            <Phone size={14} />
            <input
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => {
                const next = sanitizePhone(e.target.value)
                setForm((f) => ({ ...f, phone: next }))
                if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }))
              }}
              onKeyDown={(e) => {
                // Naviqasiya/silmə düymələrinə icazə ver
                if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return
                // Yalnız rəqəm və "+" qəbul et; "+" yalnız sahə boş ikən
                if (e.key === '+') {
                  if (form.phone.length !== 0) e.preventDefault()
                } else if (!/\d/.test(e.key)) {
                  e.preventDefault()
                } else if (form.phone.length >= PHONE_MAX_LEN) {
                  e.preventDefault()
                }
              }}
              onPaste={(e) => {
                e.preventDefault()
                const pasted = e.clipboardData.getData('text')
                const next = sanitizePhone((form.phone || '') + pasted)
                setForm((f) => ({ ...f, phone: next }))
                if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }))
              }}
              maxLength={PHONE_MAX_LEN}
              placeholder="+994501234567"
              className="mono"
            />
          </div>
          {errors.phone && <span className="ces-err">{errors.phone}</span>}
          {!errors.phone && <span className="ces-hint">Format: +994XXXXXXXXX və ya 0XXXXXXXXX</span>}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-2">
        <button
          type="submit"
          disabled={!isDirty || loading}
          className="ces-btn ces-btn-primary"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Yadda saxla
        </button>
      </div>
    </form>
  )
}

/* ─── Password form ──────────────────────────────────────── */
function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [show, setShow] = useState({ cur: false, new: false, conf: false })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const isDirty = form.currentPassword || form.newPassword || form.confirmPassword

  const passwordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: 'var(--ces-mute2)' }
    let score = 0
    if (pwd.length >= 8) score++
    if (/[a-z]/.test(pwd)) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/\d/.test(pwd)) score++
    if (/[^a-zA-Z0-9]/.test(pwd)) score++
    if (score <= 2) return { score, label: 'Zəif', color: 'var(--ces-danger)' }
    if (score === 3) return { score, label: 'Orta', color: 'var(--ces-warn)' }
    if (score === 4) return { score, label: 'Yaxşı', color: 'var(--ces-gold-700)' }
    return { score, label: 'Güclü', color: 'var(--ces-ok)' }
  }

  const strength = passwordStrength(form.newPassword)

  const validate = () => {
    const errs = {}
    if (!form.currentPassword) errs.currentPassword = 'Cari şifrə boş ola bilməz'
    if (!form.newPassword) errs.newPassword = 'Yeni şifrə boş ola bilməz'
    else if (!PASSWORD_REGEX.test(form.newPassword)) {
      errs.newPassword = 'Ən az 8 simvol, böyük və kiçik hərf, rəqəm olmalıdır'
    }
    if (form.newPassword && form.newPassword === form.currentPassword) {
      errs.newPassword = 'Yeni şifrə cari şifrə ilə eyni ola bilməz'
    }
    if (form.newPassword !== form.confirmPassword) {
      errs.confirmPassword = 'Şifrələr uyğun gəlmir'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await usersApi.updatePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      toast.success('Şifrə yeniləndi')
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setErrors({})
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Şifrə yenilənə bilmədi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="ces-card" style={{ padding: 26 }}>
      <div className="flex items-center gap-2 mb-5 pb-4" style={{ borderBottom: '1px solid var(--ces-line)' }}>
        <div className="ces-m-ic gold" style={{ width: 36, height: 36 }}>
          <Lock size={16} />
        </div>
        <div>
          <h3 className="text-base font-extrabold m-0 text-[var(--ces-ink)]">Şifrəni dəyişdir</h3>
          <p className="text-xs m-0" style={{ color: 'var(--ces-muted)' }}>Təhlükəsizlik üçün güclü şifrə seçin</p>
        </div>
      </div>

      <div className="ces-field">
        <label>Cari şifrə <span className="req">*</span></label>
        <div className={clsx('ces-input has-icon', errors.currentPassword && 'is-error')}>
          <Lock size={14} />
          <input
            type={show.cur ? 'text' : 'password'}
            value={form.currentPassword}
            onChange={(e) => { setForm((f) => ({ ...f, currentPassword: e.target.value })); if (errors.currentPassword) setErrors((p) => ({ ...p, currentPassword: undefined })) }}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShow((s) => ({ ...s, cur: !s.cur }))}
            className="inline-grid place-items-center"
            style={{ width: 24, height: 24, color: 'var(--ces-mute2)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            tabIndex={-1}
          >
            {show.cur ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {errors.currentPassword && <span className="ces-err">{errors.currentPassword}</span>}
      </div>

      <div className="ces-field">
        <label>Yeni şifrə <span className="req">*</span></label>
        <div className={clsx('ces-input has-icon', errors.newPassword && 'is-error')}>
          <Lock size={14} />
          <input
            type={show.new ? 'text' : 'password'}
            value={form.newPassword}
            onChange={(e) => { setForm((f) => ({ ...f, newPassword: e.target.value })); if (errors.newPassword) setErrors((p) => ({ ...p, newPassword: undefined })) }}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShow((s) => ({ ...s, new: !s.new }))}
            className="inline-grid place-items-center"
            style={{ width: 24, height: 24, color: 'var(--ces-mute2)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            tabIndex={-1}
          >
            {show.new ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {errors.newPassword && <span className="ces-err">{errors.newPassword}</span>}
        {form.newPassword && !errors.newPassword && (
          <div className="mt-2">
            <div className="flex gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 999,
                    background: i <= strength.score ? strength.color : 'var(--ces-graphite-100)',
                    transition: 'background .2s',
                  }}
                />
              ))}
            </div>
            <span className="text-xs font-bold" style={{ color: strength.color }}>
              {strength.label}
            </span>
          </div>
        )}
        {!form.newPassword && (
          <span className="ces-hint">Min. 8 simvol, böyük və kiçik hərf, rəqəm</span>
        )}
      </div>

      <div className="ces-field">
        <label>Yeni şifrəni təkrarla <span className="req">*</span></label>
        <div className={clsx('ces-input has-icon', errors.confirmPassword && 'is-error')}>
          <Lock size={14} />
          <input
            type={show.conf ? 'text' : 'password'}
            value={form.confirmPassword}
            onChange={(e) => { setForm((f) => ({ ...f, confirmPassword: e.target.value })); if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: undefined })) }}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShow((s) => ({ ...s, conf: !s.conf }))}
            className="inline-grid place-items-center"
            style={{ width: 24, height: 24, color: 'var(--ces-mute2)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            tabIndex={-1}
          >
            {show.conf ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {errors.confirmPassword && <span className="ces-err">{errors.confirmPassword}</span>}
      </div>

      <div className="flex justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={() => { setForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setErrors({}) }}
          disabled={!isDirty || loading}
          className="ces-btn ces-btn-ghost"
        >
          <Trash2 size={14} />
          Təmizlə
        </button>
        <button
          type="submit"
          disabled={!isDirty || loading}
          className="ces-btn ces-btn-primary"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Şifrəni yenilə
        </button>
      </div>
    </form>
  )
}
