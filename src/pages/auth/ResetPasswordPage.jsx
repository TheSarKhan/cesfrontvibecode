import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [verificationToken, setVerificationToken] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [form, setForm] = useState({ newPassword: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = sessionStorage.getItem('verificationToken')
    const email = sessionStorage.getItem('resetEmail')

    if (!token || !email) {
      toast.error('Səhifə keçərsizdir')
      navigate('/forgot-password', { replace: true })
      return
    }

    setVerificationToken(token)
    setResetEmail(email)
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    setError('')

    if (form.newPassword !== form.confirm) {
      setError('Şifrələr uyğun gəlmir')
      return
    }

    if (form.newPassword.length < 6) {
      setError('Şifrə minimum 6 simvol olmalıdır')
      return
    }

    setLoading(true)
    
    // Simulyasiya
    setTimeout(() => {
      // Uğurlu olduqda
      toast.success('Şifrə uğurla yeniləndi')
      sessionStorage.removeItem('verificationToken')
      sessionStorage.removeItem('resetEmail')
      
      // STATE ilə loginə yönləndir - burada əsas düzəliş!
      navigate('/login', { 
        replace: true,
        state: { 
          showSuccessMessage: true,
          successTitle: 'Təbriklər, şifrə yeniləndi!',
          successText: 'Daxil olmaq üçün yeni şifrənizdən istifadə edin'
        }
      })
    }, 1000)
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel - FORM */}
      <div className="flex flex-col justify-between w-full lg:w-1/2 px-6 sm:px-8 md:px-12 py-8 sm:py-10 bg-white order-1 lg:order-1">
        <div className="flex items-center gap-2 mb-6 sm:mb-0">
          <img
            src="../../../../public/e8e0f0a3bd7902466f6cdf7793af03199b95dce7 (1).png"
            alt="CES Logo"
            className="h-8 sm:h-10 w-auto object-contain"
          />
        </div>

        <div className="w-full max-w-md mx-auto my-6 sm:my-8 lg:my-0">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              İndi isə yeni şifrə təyin et!
            </h1>
            <p className="text-sm text-gray-500 mt-3">
              Yeni şifrə təyin etmək üçün xanalara müvafiq məlumatları daxil et
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  onChange={(e) => {
                    setForm(f => ({ ...f, newPassword: e.target.value }))
                    setError('')
                  }}
                  className={`w-full border ${error ? 'border-red-500' : 'border-gray-200'} rounded-md px-3.5 py-2.5 text-sm pr-10 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition`}
                  placeholder="Yeni şifrə daxil edin"
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

            {/* Şifrənin təkrarı */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Şifrənin təkrarı
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={form.confirm}
                  onChange={(e) => {
                    setForm(f => ({ ...f, confirm: e.target.value }))
                    setError('')
                  }}
                  className={`w-full border ${error ? 'border-red-500' : 'border-gray-200'} rounded-md px-3.5 py-2.5 text-sm pr-10 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition`}
                  placeholder="Şifrəni təkrar daxil edin"
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

            {/* Xəta mesajı */}
            {error && (
              <div className="text-sm" style={{ color: '#B0B0B0' }}>
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="flex-1 flex items-center justify-center bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-md transition-colors text-sm"
              >
                Ləğv et
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-md transition-colors text-sm"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Təsdiqlə'
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6 sm:mt-0">
          © {new Date().getFullYear()} CES. Bütün hüquqlar qorunur.
        </p>
      </div>

      {/* Right panel - IMAGE */}
      <div className="w-full lg:w-1/2 relative min-h-[300px] sm:min-h-[400px] lg:min-h-screen order-2 lg:order-2">
        <img
          src="../../../../public/d1461a66d8f109fcfb98e6ee584a296930495032 (1).jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: '100% 50%' }}
        />
        <div className="absolute inset-0 bg-black/40" />
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