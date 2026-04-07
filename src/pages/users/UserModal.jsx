import { useState, useEffect, useMemo } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
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
  if (score <= 2) return { level: 'weak', label: 'Zəif', color: 'bg-red-500', width: '33%' }
  if (score <= 3) return { level: 'medium', label: 'Orta', color: 'bg-amber-500', width: '66%' }
  return { level: 'strong', label: 'Güclü', color: 'bg-emerald-500', width: '100%' }
}

export default function UserModal({ editing, departments, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState({
    fullName: editing?.fullName || '',
    email: editing?.email || '',
    password: '',
    phone: editing?.phone || '',
    departmentId: editing?.departmentId ?? '',
    roleId: editing?.roleId ?? '',
  })
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
      .then((res) => setRoles(res.data.data || []))
      .catch(() => {})
      .finally(() => setRolesLoading(false))
  }, [form.departmentId])

  const handleDeptChange = (e) => {
    const val = e.target.value
    setForm((f) => ({ ...f, departmentId: val, roleId: '' }))
    if (errors.departmentId) setErrors((prev) => ({ ...prev, departmentId: undefined }))
  }

  const validate = () => {
    const errs = {}
    if (!form.fullName?.trim()) errs.fullName = 'Ad Soyad mütləqdir'
    if (!form.email?.trim()) errs.email = 'Email mütləqdir'
    if (!editing && !form.password?.trim()) errs.password = 'Şifrə mütləqdir'
    if (!form.departmentId) errs.departmentId = 'Şöbə seçin'
    if (!form.roleId) errs.roleId = 'Rol seçin'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return

    setLoading(true)
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        departmentId: Number(form.departmentId),
        roleId: Number(form.roleId),
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
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (field) => clsx(
    'w-full border bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent',
    errors[field]
      ? 'border-red-400 dark:border-red-500 focus:ring-red-400'
      : 'border-gray-300 dark:border-gray-600 focus:ring-amber-500'
  )
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-7 relative max-h-[90vh] overflow-y-auto scrollbar-thin">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors"
        >
          <X size={14} className="text-white" />
        </button>

        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">
          {editing ? 'İstifadəçini redaktə et' : 'Yeni istifadəçi'}
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          {editing ? 'İstifadəçi məlumatlarını yeniləyin' : 'Yeni istifadəçinin məlumatlarını daxil edin'}
        </p>

        <div className="space-y-4">
          {/* fullName */}
          <div>
            <label className={labelClass}>Ad Soyad</label>
            <input
              value={form.fullName}
              onChange={(e) => {
                setForm((f) => ({ ...f, fullName: e.target.value }))
                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }))
              }}
              className={inputClass('fullName')}
              placeholder="Ad Soyad"
            />
            {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
          </div>

          {/* email */}
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm((f) => ({ ...f, email: e.target.value }))
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
              }}
              className={inputClass('email')}
              placeholder="email@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>

          {/* password */}
          <div>
            <label className={labelClass}>
              Şifrə
              {editing && (
                <span className="ml-2 text-xs text-gray-400 font-normal">— daxil etməsəniz dəyişmir</span>
              )}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => {
                  setForm((f) => ({ ...f, password: e.target.value }))
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                }}
                className={clsx(inputClass('password'), 'pr-10')}
                placeholder={editing ? '••••••••' : 'Şifrə daxil edin'}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            {/* Password strength indicator */}
            {form.password && strength && (
              <div className="mt-2">
                <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full transition-all duration-300', strength.color)}
                    style={{ width: strength.width }}
                  />
                </div>
                <p className={clsx('text-xs mt-1', {
                  'text-red-500': strength.level === 'weak',
                  'text-amber-500': strength.level === 'medium',
                  'text-emerald-500': strength.level === 'strong',
                })}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* phone */}
          <div>
            <label className={labelClass}>
              Telefon
              <span className="ml-2 text-xs text-gray-400 font-normal">— isteğe bağlı</span>
            </label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={inputClass('')}
              placeholder="+994 XX XXX XX XX"
            />
          </div>

          {/* department */}
          <div>
            <label className={labelClass}>Şöbə</label>
            <select
              value={form.departmentId}
              onChange={handleDeptChange}
              className={inputClass('departmentId')}
            >
              <option value="">Şöbə seçin</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {errors.departmentId && <p className="mt-1 text-xs text-red-500">{errors.departmentId}</p>}
          </div>

          {/* role */}
          <div>
            <label className={labelClass}>Rol</label>
            <select
              value={form.roleId}
              onChange={(e) => {
                setForm((f) => ({ ...f, roleId: e.target.value }))
                if (errors.roleId) setErrors((prev) => ({ ...prev, roleId: undefined }))
              }}
              disabled={!form.departmentId || rolesLoading}
              className={clsx(inputClass('roleId'), 'disabled:opacity-50 disabled:cursor-not-allowed')}
            >
              <option value="">
                {!form.departmentId
                  ? 'Əvvəlcə şöbə seçin'
                  : rolesLoading
                  ? 'Yüklənir...'
                  : 'Rol seçin'}
              </option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            {errors.roleId && <p className="mt-1 text-xs text-red-500">{errors.roleId}</p>}
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {editing ? 'Yenilə' : 'Əlavə et'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Ləğv et
          </button>
        </div>
      </div>
    </div>
  )
}
