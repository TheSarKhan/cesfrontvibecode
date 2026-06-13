import { useState, useEffect, useMemo } from 'react'
import { X, Eye, EyeOff, UserPlus, Pencil } from 'lucide-react'
import { usersApi } from '../../api/users'
import { rolesApi } from '../../api/roles'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

function getPasswordStrength(pw) {
  if (!pw) return null
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 2) return { level: 'weak',   label: 'Zəif',  color: 'var(--ces-danger)', width: '33%' }
  if (score <= 3) return { level: 'medium', label: 'Orta',  color: 'var(--ces-warn)',   width: '66%' }
  return { level: 'strong', label: 'Güclü', color: 'var(--ces-ok)', width: '100%' }
}

function Field({ label, required, error, hint, children }) {
  return (
    <div className="ces-field">
      <label>{label} {required && <span className="req">*</span>}</label>
      {children}
      {error && <span className="ces-err">{error}</span>}
      {!error && hint && <span className="ces-hint">{hint}</span>}
    </div>
  )
}

export default function UserModal({ editing, departments, onClose, onSaved }) {
  useEscapeKey(onClose)
  const initialRoleIds = editing?.roleIds ?? (editing?.roleId != null ? [editing.roleId] : [])
  const [form, setForm] = useState({
    fullName: editing?.fullName || '',
    email: editing?.email || '',
    password: '',
    phone: editing?.phone || '',
    departmentId: editing?.departmentId ?? '',
    roleIds: initialRoleIds,
  })
  const initialForm = editing ? {
    fullName: editing.fullName || '',
    email: editing.email || '',
    phone: editing.phone || '',
    departmentId: editing.departmentId ?? '',
    roleIds: [...initialRoleIds].sort(),
  } : null
  const [roles, setRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors] = useState({})

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password])

  useEffect(() => {
    if (!form.departmentId) {
      setRoles([])
      return
    }
    setRolesLoading(true)
    rolesApi.getByDepartment(form.departmentId)
      .then((res) => setRoles(res.data.data || [])) // backend super-admin rollarını onsuz da filtrləyir
      .catch(() => {})
      .finally(() => setRolesLoading(false))
  }, [form.departmentId])

  const handleDeptChange = (e) => {
    const val = e.target.value
    setForm((f) => ({ ...f, departmentId: val, roleIds: [] }))
    if (errors.departmentId) setErrors((prev) => ({ ...prev, departmentId: undefined }))
  }

  const toggleRole = (roleId) => {
    setForm((f) => {
      const has = f.roleIds.includes(roleId)
      return { ...f, roleIds: has ? f.roleIds.filter((r) => r !== roleId) : [...f.roleIds, roleId] }
    })
    if (errors.roleIds) setErrors((p) => ({ ...p, roleIds: undefined }))
  }

  const validatePassword = (pw) => {
    if (!pw) return null
    if (pw.length < 8) return 'Şifrə minimum 8 simvol olmalıdır'
    if (!/[A-Z]/.test(pw)) return 'Şifrə minimum 1 böyük hərf olmalıdır'
    if (!/[a-z]/.test(pw)) return 'Şifrə minimum 1 kiçik hərf olmalıdır'
    if (!/[0-9]/.test(pw)) return 'Şifrə minimum 1 rəqəm olmalıdır'
    return null
  }

  const validate = () => {
    const errs = {}
    if (!form.fullName?.trim()) errs.fullName = 'Ad Soyad mütləqdir'
    else if (form.fullName.trim().length < 2) errs.fullName = 'Minimum 2 simvol olmalıdır'
    else if (!/[a-zA-ZÀ-žА-яёƏəÇçĞğİıÖöŞşÜü]/.test(form.fullName)) errs.fullName = 'Yalnız xüsusi simvol qəbul edilmir'
    if (!form.email?.trim()) errs.email = 'Email mütləqdir'
    if (!editing && !form.password?.trim()) {
      errs.password = 'Şifrə mütləqdir'
    } else if (form.password?.trim()) {
      const pwErr = validatePassword(form.password)
      if (pwErr) errs.password = pwErr
    }
    if (!form.departmentId) errs.departmentId = 'Şöbə seçin'
    if (!form.roleIds || form.roleIds.length === 0) errs.roleIds = 'Ən azı bir rol seçin'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (!validate()) return
    if (editing && initialForm) {
      const currentComparable = { fullName: form.fullName, email: form.email, phone: form.phone, departmentId: form.departmentId, roleIds: [...form.roleIds].sort() }
      if (!form.password.trim() && JSON.stringify(currentComparable) === JSON.stringify(initialForm)) {
        toast('Dəyişiklik edilməyib')
        return
      }
    }

    setLoading(true)
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        departmentId: Number(form.departmentId),
        roleIds: form.roleIds.map(Number),
      }
      if (form.password.trim()) payload.password = form.password

      if (editing) {
        await usersApi.update(editing.id, payload)
        toast.success('İstifadəçi yeniləndi')
      } else {
        await usersApi.create(payload)
        toast.success('İstifadəçi yaradıldı')
      }
      onSaved()
    } catch { /* xəta interceptor-də göstərilir */ } finally {
      setLoading(false)
    }
  }

  const inputWrap = (field) => clsx('ces-input', errors[field] && 'is-error')

  return (
    <div className="ces-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="ces-modal" style={{ maxWidth: 560 }}>
        <div className="ces-m-head">
          <div className={clsx('ces-m-ic', editing ? 'gold' : '')}>
            {editing ? <Pencil size={20} /> : <UserPlus size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3>{editing ? 'İstifadəçini redaktə et' : 'Yeni istifadəçi'}</h3>
            <p>{editing ? editing.fullName : 'Yeni istifadəçinin məlumatlarını daxil edin'}</p>
          </div>
          <button onClick={onClose} className="ces-modal-x" type="button" aria-label="Bağla">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="contents">
          <div className="ces-m-body">
            <p className="ces-sec-label" style={{ marginBottom: 14 }}>Şəxsi məlumat</p>
            <Field label="Ad Soyad" required error={errors.fullName}>
              <div className={inputWrap('fullName')}>
                <input
                  value={form.fullName}
                  onChange={(e) => { setForm(f => ({ ...f, fullName: e.target.value })); if (errors.fullName) setErrors(p => ({ ...p, fullName: undefined })) }}
                  placeholder="Ad Soyad"
                />
              </div>
            </Field>

            <Field label="Email" required error={errors.email}>
              <div className={inputWrap('email')}>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => { setForm(f => ({ ...f, email: e.target.value })); if (errors.email) setErrors(p => ({ ...p, email: undefined })) }}
                  placeholder="email@example.com"
                />
              </div>
            </Field>

            <Field label="Telefon" hint="isteğe bağlı">
              <div className="ces-input">
                <input
                  className="mono"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+994 XX XXX XX XX"
                />
              </div>
            </Field>

            <p className="ces-sec-label" style={{ marginTop: 18, marginBottom: 14 }}>
              Təhlükəsizlik
            </p>
            <Field
              label="Şifrə"
              required={!editing}
              error={errors.password}
              hint={editing ? 'Daxil etməsəniz dəyişmir' : undefined}
            >
              <div className={inputWrap('password')}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => { setForm(f => ({ ...f, password: e.target.value })); if (errors.password) setErrors(p => ({ ...p, password: undefined })) }}
                  placeholder={editing ? '••••••••' : 'Şifrə daxil edin'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{ background: 'transparent', border: 0, color: 'var(--ces-mute2)', cursor: 'pointer', display: 'inline-grid', placeItems: 'center', padding: 4 }}
                  aria-label={showPass ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password && strength && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 5, width: '100%', background: 'var(--ces-graphite-100)', borderRadius: 999, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        background: strength.color,
                        width: strength.width,
                        borderRadius: 999,
                        transition: 'width .25s, background .25s',
                      }}
                    />
                  </div>
                  <p style={{ marginTop: 4, fontSize: 11.5, fontWeight: 600, color: strength.color }}>
                    {strength.label}
                  </p>
                </div>
              )}
            </Field>

            <p className="ces-sec-label" style={{ marginTop: 18, marginBottom: 14 }}>Təşkilat</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
              <Field label="Şöbə" required error={errors.departmentId}>
                <select
                  value={form.departmentId}
                  onChange={handleDeptChange}
                  className={clsx('ces-select', errors.departmentId && 'is-error')}
                  style={errors.departmentId ? { borderColor: 'var(--ces-danger)' } : undefined}
                >
                  <option value="">Şöbə seçin</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Rollar" required error={errors.roleIds} hint="Bir və ya bir neçə rol seçin">
                {!form.departmentId ? (
                  <p style={{ fontSize: 12.5, color: 'var(--ces-mute2)' }}>Əvvəlcə şöbə seçin</p>
                ) : rolesLoading ? (
                  <p style={{ fontSize: 12.5, color: 'var(--ces-mute2)' }}>Yüklənir...</p>
                ) : roles.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: 'var(--ces-mute2)' }}>Bu şöbədə rol yoxdur</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                    {roles.map((r) => (
                      <label key={r.id} className="ces-chk" style={{ gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={form.roleIds.includes(r.id)}
                          onChange={() => toggleRole(r.id)}
                        />
                        <span className="ces-cb" />
                        <span style={{ fontSize: 13 }}>{r.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </Field>
            </div>
          </div>

          <div className="ces-m-foot">
            <button type="button" onClick={onClose} className="ces-btn ces-btn-ghost">
              Ləğv et
            </button>
            <button type="submit" disabled={loading} className="ces-btn ces-btn-primary">
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editing ? 'Yadda saxla' : 'Əlavə et'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
