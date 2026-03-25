import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [form, setForm] = useState({ newPassword: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.newPassword !== form.confirm) {
      toast.error('Şifrələr uyğun gəlmir')
      return
    }
    if (form.newPassword.length < 6) {
      toast.error('Şifrə minimum 6 simvol olmalıdır')
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword(token, form.newPassword)
      toast.success('Şifrə uğurla yeniləndi')
      navigate('/login', { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.message || 'Link etibarsızdır və ya vaxtı keçib'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="bg-white rounded-2xl p-8 text-center space-y-4">
          <p className="text-gray-600">Link etibarsızdır</p>
          <Link to="/login" className="text-sm text-orange-500 hover:underline">Girişə qayıt</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500 mb-4">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <h1 className="text-2xl font-bold text-white">CES ERP</h1>
          <p className="text-gray-400 text-sm mt-1">Yeni şifrə təyin edin</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          <p className="text-sm text-gray-500">
            Yeni şifrənizi daxil edin. Minimum 6 simvol olmalıdır.
          </p>

          {/* Yeni şifrə */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Yeni şifrə
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                autoFocus
                value={form.newPassword}
                onChange={(e) => setForm(f => ({ ...f, newPassword: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                placeholder="Yeni şifrə"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Təkrar şifrə */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Şifrəni təsdiqlə
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={form.confirm}
              onChange={(e) => setForm(f => ({ ...f, confirm: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              placeholder="Şifrəni təkrar daxil edin"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <KeyRound size={16} />
            )}
            {loading ? 'Yenilənir...' : 'Şifrəni yenilə'}
          </button>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={13} />
              Girişə qayıt
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
