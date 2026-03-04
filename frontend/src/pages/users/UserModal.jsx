import { useState, useEffect } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
import { usersApi } from '../../api/users'
import { rolesApi } from '../../api/roles'
import toast from 'react-hot-toast'

export default function UserModal({ editing, departments, onClose, onSaved }) {
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

  useEffect(() => {
    if (!form.departmentId) {
      setRoles([])
      return
    }
    setRolesLoading(true)
    rolesApi.getByDepartment(form.departmentId)
      .then((res) => setRoles(res.data.data || []))
      .catch(() => toast.error('Rollar yüklənmədi'))
      .finally(() => setRolesLoading(false))
  }, [form.departmentId])

  const handleDeptChange = (e) => {
    setForm((f) => ({ ...f, departmentId: e.target.value, roleId: '' }))
  }

  const handleSave = async () => {
    if (!form.fullName.trim()) return toast.error('Ad Soyad mütləqdir')
    if (!form.email.trim()) return toast.error('Email mütləqdir')
    if (!editing && !form.password.trim()) return toast.error('Şifrə mütləqdir')
    if (!form.departmentId) return toast.error('Şöbə seçin')
    if (!form.roleId) return toast.error('Rol seçin')

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
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Əməliyyat uğursuz oldu')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
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
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className={inputClass}
              placeholder="Ad Soyad"
            />
          </div>

          {/* email */}
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={inputClass}
              placeholder="email@example.com"
            />
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
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className={inputClass + ' pr-10'}
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
              className={inputClass}
              placeholder="+994 XX XXX XX XX"
            />
          </div>

          {/* department */}
          <div>
            <label className={labelClass}>Şöbə</label>
            <select
              value={form.departmentId}
              onChange={handleDeptChange}
              className={inputClass}
            >
              <option value="">Şöbə seçin</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* role */}
          <div>
            <label className={labelClass}>Rol</label>
            <select
              value={form.roleId}
              onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
              disabled={!form.departmentId || rolesLoading}
              className={inputClass + ' disabled:opacity-50 disabled:cursor-not-allowed'}
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
