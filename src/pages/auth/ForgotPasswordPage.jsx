import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../../api/auth'
import { useThemeStore } from '../../store/themeStore'
import logoLight from '../../assets/logo white.png'
import logoDark from '../../assets/logo2.png'

const OTP_LENGTH = 6  // Backend 6 rəqəmli OTP göndərir

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const theme = useThemeStore((s) => s.theme)
  const brandLogo = theme === 'dark' ? logoDark : logoLight
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailFocused, setEmailFocused] = useState(false)
  const otpRefs = useRef([])

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
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Email göndərilə bilmədi. Yenidən cəhd edin.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Paste edilibsə bütün rəqəmləri yerinə qoy
      const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('')
      const next = Array(OTP_LENGTH).fill('')
      digits.forEach((d, i) => { next[i] = d })
      setOtp(next)
      setError('')
      const lastFilled = Math.min(digits.length, OTP_LENGTH) - 1
      const focusTarget = lastFilled < OTP_LENGTH - 1 ? lastFilled + 1 : lastFilled
      setTimeout(() => otpRefs.current[focusTarget]?.focus(), 0)
      return
    }
    if (!/^\d*$/.test(value)) return

    const next = [...otp]
    next[index] = value
    setOtp(next)
    setError('')

    if (value && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const otpValue = otp.join('')
    if (otpValue.length !== OTP_LENGTH) {
      setError(`${OTP_LENGTH} rəqəmli kodu daxil edin`)
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

  const resendOtp = async () => {
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      toast.success('Yeni OTP kod göndərildi')
      setOtp(Array(OTP_LENGTH).fill(''))
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
    } catch {
      toast.error('Kod göndərilə bilmədi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="ces-font min-h-screen flex flex-col lg:flex-row"
      style={{ background: 'var(--ces-bg)', color: 'var(--ces-ink)' }}
    >
      {/* ═══════════════════════════════════════════════
          LEFT PANEL — FORM
      ═══════════════════════════════════════════════ */}
      <div
        className="relative flex flex-col w-full lg:w-[55%] xl:w-1/2 px-6 sm:px-10 md:px-16 lg:px-20 py-8 lg:py-10 order-1"
        style={{ background: 'var(--ces-surface)' }}
      >
        {/* Top brand — UI kit .kit-logo pattern */}
        <div className="flex items-center gap-3 mb-10 lg:mb-12">
          <div
            className="w-[46px] h-[46px] grid place-items-center p-1 flex-none"
            style={{
              background: 'var(--ces-surface)',
              borderRadius: '10px',
              border: '1px solid var(--ces-line)',
            }}
          >
            <img
              src={brandLogo}
              alt="CES"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <p className="text-[15px] font-extrabold tracking-tight leading-tight" style={{ color: 'var(--ces-ink)' }}>
              Construction <span style={{ color: 'var(--ces-gold)' }}>Equipment</span> Services
            </p>
            <p className="text-[11px] tracking-[.06em] uppercase" style={{ color: 'var(--ces-muted)' }}>
              ERP Platforma · Bakı, AZ
            </p>
          </div>
        </div>

        {/* Center */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="w-full max-w-[420px] mx-auto">

            {/* Step 1 — email */}
            {step === 'email' && (
              <>
                <p
                  className="text-[11px] font-semibold tracking-[.16em] uppercase mb-3"
                  style={{ color: 'var(--ces-gold)' }}
                >
                  Şifrə bərpası · 1/3
                </p>
                <h1
                  className="text-[36px] sm:text-[40px] font-extrabold tracking-[-.022em] leading-[1.05] mb-3"
                  style={{ color: 'var(--ces-ink)' }}
                >
                  Şifrəni <span style={{ color: 'var(--ces-gold)' }}>yenilə.</span>
                </h1>
                <p className="text-[15px] leading-[1.55] mb-10" style={{ color: 'var(--ces-muted)' }}>
                  Email ünvanınızı daxil edin — sizə 6 rəqəmli təsdiq kodu göndərəcəyik.
                </p>

                <form onSubmit={handleEmailSubmit} className="space-y-5">
                  <div>
                    <label className="block text-[13px] font-semibold mb-[7px]" style={{ color: 'var(--ces-ink)' }}>
                      Email <span style={{ color: 'var(--ces-danger)' }}>*</span>
                    </label>
                    <div
                      className="flex items-center px-[13px] transition-all"
                      style={{
                        background: 'var(--ces-surface)',
                        border: `1px solid ${error ? 'var(--ces-danger)' : emailFocused ? 'var(--ces-graphite)' : 'var(--ces-line)'}`,
                        borderRadius: '11px',
                        minHeight: '48px',
                        boxShadow: error
                          ? '0 0 0 3px rgba(212,56,90,.12)'
                          : emailFocused
                          ? '0 0 0 3px rgba(58,58,58,.1)'
                          : 'none',
                      }}
                    >
                      <Mail size={16} style={{ color: 'var(--ces-mute2)' }} className="mr-2 flex-none" />
                      <input
                        type="email"
                        required
                        autoFocus
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError('') }}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        placeholder="email@domain.com"
                        className="flex-1 border-0 outline-0 bg-transparent text-[14px] py-[11px] w-full"
                        style={{ color: 'var(--ces-ink)' }}
                      />
                    </div>
                  </div>

                  {error && (
                    <div
                      className="flex items-start gap-2 text-[12px] font-semibold px-3 py-2 rounded-[10px]"
                      style={{
                        color: 'var(--ces-danger)',
                        background: 'rgba(212,56,90,.06)',
                        border: '1px solid rgba(212,56,90,.18)',
                      }}
                    >
                      <AlertCircle size={14} className="flex-none mt-0.5" />
                      <span className="leading-snug">{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 font-semibold text-[15px] py-[14px] rounded-[12px] transition-all disabled:opacity-60"
                    style={{ background: 'var(--ces-graphite)', color: 'var(--ces-on-primary)' }}
                    onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'var(--ces-graphite-900)')}
                    onMouseLeave={(e) => !loading && (e.currentTarget.style.background = 'var(--ces-graphite)')}
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 rounded-full animate-spin"
                          style={{ border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'var(--ces-on-primary)' }} />
                        Göndərilir...
                      </>
                    ) : (
                      <>OTP göndər <ArrowRight size={16} /></>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 text-[13px] font-semibold transition-colors"
                      style={{ color: 'var(--ces-graphite)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ces-gold)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ces-graphite)')}
                    >
                      <ArrowLeft size={13} />
                      Girişə qayıt
                    </Link>
                  </div>
                </form>
              </>
            )}

            {/* Step 2 — OTP */}
            {step === 'otp' && (
              <>
                <p
                  className="text-[11px] font-semibold tracking-[.16em] uppercase mb-3"
                  style={{ color: 'var(--ces-gold)' }}
                >
                  Şifrə bərpası · 2/3
                </p>
                <h1
                  className="text-[36px] sm:text-[40px] font-extrabold tracking-[-.022em] leading-[1.05] mb-3"
                  style={{ color: 'var(--ces-ink)' }}
                >
                  Təsdiq <span style={{ color: 'var(--ces-gold)' }}>kodu.</span>
                </h1>
                <p className="text-[15px] leading-[1.55] mb-8" style={{ color: 'var(--ces-muted)' }}>
                  <span className="font-semibold" style={{ color: 'var(--ces-ink)' }}>{email}</span> ünvanına göndərdiyimiz <span className="font-semibold" style={{ color: 'var(--ces-ink)' }}>6 rəqəmli</span> kodu daxil edin.
                </p>

                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center gap-2">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => (otpRefs.current[index] = el)}
                          id={`otp-${index}`}
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={index === 0 ? OTP_LENGTH : 1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className="text-center font-extrabold transition-all outline-none"
                          style={{
                            width: '48px',
                            height: '56px',
                            fontSize: '24px',
                            background: digit ? 'var(--ces-surface)' : 'var(--ces-graphite-50)',
                            border: `1px solid ${error ? 'var(--ces-danger)' : digit ? 'var(--ces-graphite)' : 'var(--ces-line)'}`,
                            borderRadius: '12px',
                            color: 'var(--ces-ink)',
                            caretColor: 'var(--ces-graphite)',
                          }}
                          onFocus={(e) => {
                            if (!error) {
                              e.currentTarget.style.borderColor = 'var(--ces-graphite)'
                              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(58,58,58,.1)'
                            }
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.boxShadow = 'none'
                            if (!error && !digit) e.currentTarget.style.borderColor = 'var(--ces-line)'
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-[12px] mt-3 text-center" style={{ color: 'var(--ces-muted)' }}>
                      Kod 10 dəqiqə ərzində aktivdir
                    </p>
                  </div>

                  {error && (
                    <div
                      className="flex items-start gap-2 text-[12px] font-semibold px-3 py-2 rounded-[10px]"
                      style={{
                        color: 'var(--ces-danger)',
                        background: 'rgba(212,56,90,.06)',
                        border: '1px solid rgba(212,56,90,.18)',
                      }}
                    >
                      <AlertCircle size={14} className="flex-none mt-0.5" />
                      <span className="leading-snug">{error}</span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('email')
                        setError('')
                        setOtp(Array(OTP_LENGTH).fill(''))
                      }}
                      className="flex-1 font-semibold text-[14px] py-[14px] rounded-[12px] transition-all"
                      style={{
                        background: 'var(--ces-graphite-50)',
                        color: 'var(--ces-graphite)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ces-graphite-100)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--ces-graphite-50)')}
                    >
                      Geri
                    </button>
                    <button
                      type="submit"
                      disabled={loading || otp.some(d => !d)}
                      className="flex-1 flex items-center justify-center gap-2 font-semibold text-[15px] py-[14px] rounded-[12px] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ background: 'var(--ces-graphite)', color: 'var(--ces-on-primary)' }}
                      onMouseEnter={(e) => !loading && !otp.some(d => !d) && (e.currentTarget.style.background = 'var(--ces-graphite-900)')}
                      onMouseLeave={(e) => !loading && (e.currentTarget.style.background = 'var(--ces-graphite)')}
                    >
                      {loading ? (
                        <>
                          <span className="w-4 h-4 rounded-full animate-spin"
                            style={{ border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'var(--ces-on-primary)' }} />
                          Yoxlanılır...
                        </>
                      ) : (
                        <>Davam et <ArrowRight size={16} /></>
                      )}
                    </button>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={resendOtp}
                      disabled={loading}
                      className="text-[13px] font-semibold transition-colors bg-transparent border-0 p-0 cursor-pointer"
                      style={{ color: 'var(--ces-graphite)' }}
                      onMouseEnter={(e) => !loading && (e.currentTarget.style.color = 'var(--ces-gold)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ces-graphite)')}
                    >
                      Kod gəlmədi? <span className="underline">Yenidən göndər</span>
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Help link footer */}
            <div
              className="mt-8 pt-6 border-t text-[12px] flex items-center justify-between"
              style={{ borderColor: 'var(--ces-line)', color: 'var(--ces-muted)' }}
            >
              <span>Hesab haqqında problemlər?</span>
              <a
                href="mailto:support@ces.az"
                className="font-semibold transition-colors"
                style={{ color: 'var(--ces-graphite)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ces-gold)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ces-graphite)')}
              >
                support@ces.az →
              </a>
            </div>
          </div>
        </div>

        <p className="text-[11px] tracking-wide text-center mt-8" style={{ color: 'var(--ces-mute2)' }}>
          © {new Date().getFullYear()} Construction Equipment Services · Bütün hüquqlar qorunur
        </p>
      </div>

      {/* ═══════════════════════════════════════════════
          RIGHT PANEL — BRAND VISUAL
      ═══════════════════════════════════════════════ */}
      <div
        className="relative w-full lg:w-[45%] xl:w-1/2 min-h-[300px] sm:min-h-[400px] lg:min-h-screen order-2 overflow-hidden"
        style={{ background: 'var(--ces-brand-bg)' }}
      >
        <img
          src="/d1461a66d8f109fcfb98e6ee584a296930495032 (1).jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          style={{ objectPosition: '100% 50%' }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(38,38,38,.85) 0%, rgba(58,58,58,.55) 50%, rgba(26,26,26,.85) 100%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative h-full flex flex-col justify-between p-10 lg:p-14 xl:p-20">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: 'var(--ces-gold)',
                boxShadow: '0 0 0 4px rgba(200,147,42,.25)',
              }}
            />
            <span
              className="text-[11px] font-semibold tracking-[.14em] uppercase"
              style={{ color: 'rgba(255,255,255,.85)' }}
            >
              Təhlükəsiz bərpa · SSL/TLS
            </span>
          </div>

          <div className="max-w-[560px]">
            <p className="text-[12px] font-semibold tracking-[.18em] uppercase mb-5" style={{ color: 'var(--ces-gold)' }}>
              Şifrə bərpası
            </p>
            <h2
              className="text-[40px] lg:text-[48px] xl:text-[56px] font-extrabold tracking-[-.022em] leading-[1.05] mb-5"
              style={{ color: '#fff' }}
            >
              Hesabınız<br />
              <span style={{ color: 'var(--ces-gold)' }}>etibarlı</span> əllərdə.
            </h2>
            <p
              className="text-[16px] lg:text-[17px] leading-[1.55] max-w-[480px]"
              style={{ color: 'rgba(255,255,255,.75)' }}
            >
              OTP kodu yalnız 10 dəqiqə aktivdir və email ünvanınıza şifrələnmiş şəkildə çatdırılır.
              Heç kimə paylaşmayın.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-8 border-t border-white/15">
            <div
              className="w-10 h-10 rounded-[10px] grid place-items-center flex-none"
              style={{ background: 'rgba(200,147,42,.18)' }}
            >
              <ShieldCheck size={20} style={{ color: 'var(--ces-gold)' }} />
            </div>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: '#fff' }}>
                Heç vaxt şifrənizi soruşmuruq
              </p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,.6)' }}>
                CES heç bir əməkdaş şifrəni telefon və ya mailə soruşmayacaq.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
