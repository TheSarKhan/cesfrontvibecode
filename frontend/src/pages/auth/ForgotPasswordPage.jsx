import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../../api/auth'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!email) {
      setError('Email daxil edin')
      return
    }
    
    setLoading(true)
    setError('')

    try {
      await authApi.forgotPassword(email)
      setStep('otp')
      toast.success('OTP kod emailə göndərildi')
    } catch (err) {
      const msg = err?.response?.data?.message || 'Email göndərilə bilmədi. Yenidən cəhd edin.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return
    if (!/^\d*$/.test(value)) return
    
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError('')
    
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const otpValue = otp.join('')
    if (otpValue.length !== 4) {
      setError('4 rəqəmli kodu daxil edin')
      return
    }
    
    setLoading(true)
    setError('')

    try {
      const res = await authApi.verifyOtp(email, otpValue)
      const token = res.data?.data?.verificationToken || res.data?.verificationToken || res.data?.token
      toast.success('OTP doğrulandı!')
      sessionStorage.setItem('verificationToken', token)
      sessionStorage.setItem('resetEmail', email)
      navigate('/reset-password')
    } catch (err) {
      const msg = err?.response?.data?.message || 'OTP kod yanlışdır. Yenidən cəhd edin.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
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
          {step === 'email' ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug mb-2">
                Şifrəni yenilə,<br />
                <span className="text-gray-900">hesabına təhlükəsiz qayıt.</span>
              </h1>
              <p className="text-sm text-gray-500 mb-6 sm:mb-8">
                Email ünvanınızı daxil edin. OTP kod göndərəcəyik.
              </p>

              <form onSubmit={handleEmailSubmit} className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide uppercase">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setError('')
                      }}
                      className={`w-full border ${error ? 'border-red-500' : 'border-gray-200'} rounded-md pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition`}
                      placeholder="email@domain.com"
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-sm" style={{ color: '#B0B0B0' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-md transition-colors text-sm"
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
                    className="inline-flex items-center gap-1.5 text-sm transition-colors"
                    style={{ color: '#2A86FF' }}
                  >
                    <ArrowLeft size={13} />
                    Girişə qayıt
                  </Link>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                {/* Yaşıl klik işarəsi ÇIXARILDI - şəkildəki kimi */}
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">
                  Şifrəni dəyişək!
                </h1>
                <p className="text-sm text-gray-500 mt-3">
                  <span className="font-semibold text-gray-800">{email}</span><br />
                  email ünvanına gələn<br />
                  4 rəqəmli kodu daxil edin
                </p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-6">
                {/* 4 rəqəmli OTP inputları - açıq boz fon, içi boşdursa nöqtə */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-3 text-center uppercase">
                    Təsdiq kodu
                  </label>
                  <div className="flex justify-center gap-3 sm:gap-4">
                    {otp.map((digit, index) => (
                      <div key={index} className="relative">
                        <input
                          id={`otp-${index}`}
                          type="text"
                          maxLength="1"
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !digit && index > 0) {
                              const prevInput = document.getElementById(`otp-${index - 1}`)
                              if (prevInput) prevInput.focus()
                            }
                          }}
                          className="w-14 h-14 sm:w-16 sm:h-16 text-center text-2xl sm:text-3xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition text-gray-900 bg-gray-100"
                          style={{ backgroundColor: '#F3F4F6', color: 'transparent', caretColor: '#000' }}
                          autoFocus={index === 0}
                        />
                        {/* Nöqtə overlay - input boşdursa göstər */}
                        {!digit && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-3xl sm:text-4xl text-gray-500" style={{ color: '#9CA3AF' }}>•</span>
                          </div>
                        )}
                        {/* Rəqəm overlay - input doludursa göstər */}
                        {digit && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-2xl sm:text-3xl font-bold text-gray-900">{digit}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3 text-center">4 rəqəmli kodu daxil edin</p>
                </div>

                {error && (
                  <div className="text-sm text-center" style={{ color: '#B0B0B0' }}>
                    {error}
                  </div>
                )}

                {/* Buttons - Ləğv et və Davam et */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email')
                      setError('')
                      setOtp(['', '', '', ''])
                    }}
                    className="flex-1 flex items-center justify-center bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-md transition-colors text-sm"
                  >
                    Ləğv et
                  </button>
                  
                  <button
                    type="submit"
                    disabled={loading || otp.some(d => !d)}
                    className="flex-1 flex items-center justify-center bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-md transition-colors text-sm"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Davam et'
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
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