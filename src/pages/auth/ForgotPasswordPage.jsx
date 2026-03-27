import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { Mail, ArrowLeft, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState('email') // 'email' | 'otp'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setStep('otp')
      toast.success('OTP kod emailə göndərildi')
    } catch {
      // global interceptor xətanı göstərir
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await authApi.verifyOtp(email, otp)
      const verificationToken = response.data.data.verificationToken
      toast.success('OTP doğrulandı')
      sessionStorage.setItem('verificationToken', verificationToken)
      sessionStorage.setItem('resetEmail', email)
      navigate('/reset-password')
    } catch {
      // global interceptor xətanı göstərir
    } finally {
      setLoading(false)
    }
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
          <p className="text-gray-400 text-sm mt-1">Şifrəmi unutdum</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  Email ünvanınızı daxil edin. OTP kod göndərəcəyik.
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                    placeholder="Email daxil edin"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Mail size={16} />
                )}
                {loading ? 'Göndərilir...' : 'OTP göndər'}
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
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  Email ünvanınıza göndərilən 6 rəqəmli OTP kodu daxil edin.
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  OTP Kodu
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength="6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                  placeholder="000000"
                />
                <p className="text-xs text-gray-400 mt-1">6 rəqəmli kod</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Lock size={16} />
                )}
                {loading ? 'Doğrulanır...' : 'OTP-ni doğrula'}
              </button>

              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
              >
                Emaili dəyiş
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
