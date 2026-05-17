import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'

const SESSION_KEY = 'login_form_draft'

export default function LoginPage() {
  const [form, setForm] = useState(() => {
    const draft = sessionStorage.getItem(SESSION_KEY)
    if (draft) {
      sessionStorage.removeItem(SESSION_KEY)
      return JSON.parse(draft)
    }
    return { email: '', password: '' }
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Reset password səhifəsindən gələn state-i yoxla
    if (location.state?.showSuccessMessage) {
      setShowSuccess(true)
      window.history.replaceState({}, document.title)
    }
  }, [location])

  const goToForgotPassword = () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(form))
    navigate('/forgot-password')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(form)
      sessionStorage.removeItem(SESSION_KEY)
      navigate('/', { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.message || 'Email və ya şifrə yanlışdır'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left panel (FORM) - full width on mobile, 50% on desktop ── */}
      <div className="flex flex-col justify-between w-full lg:w-1/2 px-6 sm:px-8 md:px-12 py-8 sm:py-10 bg-white order-1 lg:order-1">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6 sm:mb-0">
          <img
            src="../../../../public/e8e0f0a3bd7902466f6cdf7793af03199b95dce7 (1).png"
            alt="CES Logo"
            className="h-8 sm:h-10 w-auto object-contain"
          />
        </div>

        {/* Main content */}
        <div className="w-full max-w-md mx-auto my-6 sm:my-8 lg:my-0">
          {/* Əgər reset password uğurludursa, başlıq dəyişir */}
          {showSuccess ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug mb-2">
                Təbriklər, şifrə yeniləndi!
              </h1>
              <p className="text-sm text-gray-500 mb-6 sm:mb-8">
                Daxil olmaq üçün yeni şifrənizdən istifadə edin
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug mb-2">
                Rəqəmsal ekosistemimizə,<br />
                <span className="text-gray-900">xoş gəldin.</span>
              </h1>
              <p className="text-sm text-gray-500 mb-6 sm:mb-8">
                Başlamaq üçün aşağıda kimlik xanalarını doldurun
              </p>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide uppercase">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => {
                  setForm((f) => ({ ...f, email: e.target.value }))
                  setError('')
                }}
                placeholder="email@domain.com"
                className={`w-full border ${error ? 'border-red-500' : 'border-gray-200'} rounded-md px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition`}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide uppercase">
                Şifrə
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, password: e.target.value }))
                    setError('')
                  }}
                  placeholder="••••••••••••"
                  className={`w-full border ${error ? 'border-red-500' : 'border-gray-200'} rounded-md px-3.5 py-2.5 text-sm pr-10 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Xəta mesajı - rəng #B0B0B0 */}
            {error && (
              <div className="text-sm" style={{ color: '#B0B0B0' }}>
                {error}
              </div>
            )}

            {/* Şifrəmi unutmuşam - Daxil ol buttonunun ÜSTÜNDƏ, rəng #2A86FF */}
            <div className="text-right">
              <button
                type="button"
                onClick={goToForgotPassword}
                className="text-sm transition-colors bg-transparent border-none p-0 cursor-pointer"
                style={{ color: '#2A86FF' }}
              >
                Şifrəmi unutmuşam
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-md transition-colors text-sm"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {loading ? 'Giriş edilir...' : 'Daxil ol'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center mt-6 sm:mt-0">
          © {new Date().getFullYear()} CES. Bütün hüquqlar qorunur.
        </p>
      </div>

      {/* ── Right panel (IMAGE) - visible on all devices, responsive height ── */}
      <div className="w-full lg:w-1/2 relative min-h-[300px] sm:min-h-[400px] lg:min-h-screen order-2 lg:order-2">
        <img
          src="../../../../public/d1461a66d8f109fcfb98e6ee584a296930495032 (1).jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: '100% 50%' }}
        />
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Bottom caption – responsive padding and text size */}
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 text-white text-xs sm:text-sm leading-relaxed">
          <div 
            className="max-w-2xl mx-auto px-4 sm:px-6 py-3 sm:py-4 rounded-lg backdrop-blur-lg"
            style={{ backgroundColor: '#FFFFFF3D' }}
          >
            <p className="opacity-90 text-center text-xs sm:text-sm">
              CES ilə bir platforma üzərindən müştərilərə, avadanlıqlara, layihələrə
              və əməkdaşlara nəzarət edin.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}