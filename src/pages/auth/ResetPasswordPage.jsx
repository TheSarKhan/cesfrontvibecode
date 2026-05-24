import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useThemeStore } from '../../store/themeStore'
import { Eye, EyeOff, ArrowRight, AlertCircle, Lock, CheckCircle2, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import logoLight from '../../assets/logo white.png'
import logoDark from '../../assets/logo2.png'

const MIN_PASSWORD_LENGTH = 6

// Şifrə güclülüyü hesablanması (UI kit `--ok/--warn/--danger` semantik rəngləri ilə)
function passwordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: 'var(--ces-line)' }
  let score = 0
  if (pwd.length >= 6) score++
  if (pwd.length >= 10) score++
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  const labels = ['Zəif', 'Zəif', 'Orta', 'Yaxşı', 'Güclü', 'Çox güclü']
  const colors = ['var(--ces-danger)', 'var(--ces-danger)', 'var(--ces-warn)', 'var(--ces-warn)', 'var(--ces-ok)', 'var(--ces-ok)']
  return { score, label: labels[score], color: colors[score] }
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const theme = useThemeStore((s) => s.theme)
  const brandLogo = theme === 'light' ? logoLight : logoDark
  const [verificationToken, setVerificationToken] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [form, setForm] = useState({ newPassword: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState({ pass: false, confirm: false })

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

  const strength = passwordStrength(form.newPassword)
  const passwordsMatch = form.confirm && form.newPassword === form.confirm
  const passwordsMismatch = form.confirm && form.newPassword !== form.confirm

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setError('')

    if (form.newPassword !== form.confirm) {
      setError('Şifrələr uyğun gəlmir')
      return
    }
    if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Şifrə minimum ${MIN_PASSWORD_LENGTH} simvol olmalıdır`)
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword(verificationToken, form.newPassword)
      toast.success('Şifrə uğurla yeniləndi')
      sessionStorage.removeItem('verificationToken')
      sessionStorage.removeItem('resetEmail')
      navigate('/login', { replace: true, state: { showSuccessMessage: true } })
    } catch (err) {
      const msg = err?.response?.data?.message || 'Şifrə yenilənə bilmədi. Yenidən cəhd edin.'
      setError(msg)
      toast.error(msg)
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

        <div className="flex-1 flex flex-col justify-center">
          <div className="w-full max-w-[420px] mx-auto">
            <p
              className="text-[11px] font-semibold tracking-[.16em] uppercase mb-3"
              style={{ color: 'var(--ces-gold)' }}
            >
              Şifrə bərpası · 3/3
            </p>
            <h1
              className="text-[36px] sm:text-[40px] font-extrabold tracking-[-.022em] leading-[1.05] mb-3"
              style={{ color: 'var(--ces-ink)' }}
            >
              Yeni <span style={{ color: 'var(--ces-gold)' }}>şifrə</span> təyin et.
            </h1>
            <p className="text-[15px] leading-[1.55] mb-8" style={{ color: 'var(--ces-muted)' }}>
              {resetEmail && (
                <>
                  <span className="font-semibold" style={{ color: 'var(--ces-ink)' }}>{resetEmail}</span> üçün
                  yeni şifrə daxil edin.
                </>
              )}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* New Password */}
              <div>
                <label className="block text-[13px] font-semibold mb-[7px]" style={{ color: 'var(--ces-ink)' }}>
                  Yeni şifrə <span style={{ color: 'var(--ces-danger)' }}>*</span>
                </label>
                <div
                  className="flex items-center px-[13px] transition-all"
                  style={{
                    background: 'var(--ces-surface)',
                    border: `1px solid ${error ? 'var(--ces-danger)' : focused.pass ? 'var(--ces-graphite)' : 'var(--ces-line)'}`,
                    borderRadius: '11px',
                    minHeight: '48px',
                    boxShadow: error
                      ? '0 0 0 3px rgba(212,56,90,.12)'
                      : focused.pass
                      ? '0 0 0 3px rgba(58,58,58,.1)'
                      : 'none',
                  }}
                >
                  <Lock size={16} style={{ color: 'var(--ces-mute2)' }} className="mr-2 flex-none" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    autoFocus
                    value={form.newPassword}
                    onChange={(e) => { setForm(f => ({ ...f, newPassword: e.target.value })); setError('') }}
                    onFocus={() => setFocused(s => ({ ...s, pass: true }))}
                    onBlur={() => setFocused(s => ({ ...s, pass: false }))}
                    placeholder="Yeni şifrə"
                    className="flex-1 border-0 outline-0 bg-transparent text-[14px] py-[11px] w-full"
                    style={{ color: 'var(--ces-ink)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="ml-2 flex-none p-1 rounded transition-colors"
                    style={{ color: 'var(--ces-mute2)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ces-graphite)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ces-mute2)')}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Strength meter — UI kit semantic colors */}
                {form.newPassword && (
                  <div className="mt-3">
                    <div className="flex gap-1 mb-1.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div
                          key={i}
                          className="h-[3px] flex-1 rounded-full transition-colors"
                          style={{
                            background: i <= strength.score ? strength.color : 'var(--ces-graphite-100)',
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] font-semibold" style={{ color: strength.color }}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm */}
              <div>
                <label className="block text-[13px] font-semibold mb-[7px]" style={{ color: 'var(--ces-ink)' }}>
                  Şifrəni təkrarla <span style={{ color: 'var(--ces-danger)' }}>*</span>
                </label>
                <div
                  className="flex items-center px-[13px] transition-all"
                  style={{
                    background: 'var(--ces-surface)',
                    border: `1px solid ${
                      passwordsMismatch ? 'var(--ces-danger)' :
                      passwordsMatch ? 'var(--ces-ok)' :
                      focused.confirm ? 'var(--ces-graphite)' :
                      'var(--ces-line)'
                    }`,
                    borderRadius: '11px',
                    minHeight: '48px',
                    boxShadow:
                      passwordsMismatch ? '0 0 0 3px rgba(212,56,90,.12)' :
                      passwordsMatch ? '0 0 0 3px rgba(15,157,106,.12)' :
                      focused.confirm ? '0 0 0 3px rgba(58,58,58,.1)' : 'none',
                  }}
                >
                  <KeyRound size={16} style={{ color: 'var(--ces-mute2)' }} className="mr-2 flex-none" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={form.confirm}
                    onChange={(e) => { setForm(f => ({ ...f, confirm: e.target.value })); setError('') }}
                    onFocus={() => setFocused(s => ({ ...s, confirm: true }))}
                    onBlur={() => setFocused(s => ({ ...s, confirm: false }))}
                    placeholder="Şifrəni təkrar daxil edin"
                    className="flex-1 border-0 outline-0 bg-transparent text-[14px] py-[11px] w-full"
                    style={{ color: 'var(--ces-ink)' }}
                  />
                  {passwordsMatch && (
                    <CheckCircle2 size={16} style={{ color: 'var(--ces-ok)' }} className="ml-2 flex-none" />
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="ml-2 flex-none p-1 rounded transition-colors"
                    style={{ color: 'var(--ces-mute2)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ces-graphite)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ces-mute2)')}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordsMismatch && (
                  <p className="text-[12px] font-semibold mt-[6px]" style={{ color: 'var(--ces-danger)' }}>
                    Şifrələr uyğun gəlmir
                  </p>
                )}
              </div>

              {/* Rules — UI kit muted helper text */}
              <div
                className="px-3 py-2.5 rounded-[10px] text-[12px] leading-relaxed"
                style={{ background: 'var(--ces-graphite-50)', color: 'var(--ces-muted)' }}
              >
                Şifrə tövsiyəsi: minimum {MIN_PASSWORD_LENGTH} simvol, böyük/kiçik hərf qarışığı, rəqəm və xüsusi simvol.
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

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
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
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 font-semibold text-[15px] py-[14px] rounded-[12px] transition-all disabled:opacity-60"
                  style={{ background: 'var(--ces-graphite)', color: 'var(--ces-on-primary)' }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'var(--ces-graphite-900)')}
                  onMouseLeave={(e) => !loading && (e.currentTarget.style.background = 'var(--ces-graphite)')}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 rounded-full animate-spin"
                        style={{ border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'var(--ces-on-primary)' }} />
                      Yenilənir...
                    </>
                  ) : (
                    <>Şifrəni təsdiqlə <ArrowRight size={16} /></>
                  )}
                </button>
              </div>
            </form>

            <div
              className="mt-8 pt-6 border-t text-[12px] flex items-center justify-between"
              style={{ borderColor: 'var(--ces-line)', color: 'var(--ces-muted)' }}
            >
              <span>Texniki dəstək lazımdırsa?</span>
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
              Son addım · Yeni şifrə
            </span>
          </div>

          <div className="max-w-[560px]">
            <p className="text-[12px] font-semibold tracking-[.18em] uppercase mb-5" style={{ color: 'var(--ces-gold)' }}>
              Təhlükəsizlik
            </p>
            <h2
              className="text-[40px] lg:text-[48px] xl:text-[56px] font-extrabold tracking-[-.022em] leading-[1.05] mb-5"
              style={{ color: '#fff' }}
            >
              Güclü şifrə —<br />
              <span style={{ color: 'var(--ces-gold)' }}>daha güclü</span> qoruma.
            </h2>
            <p
              className="text-[16px] lg:text-[17px] leading-[1.55] max-w-[480px]"
              style={{ color: 'rgba(255,255,255,.75)' }}
            >
              Hər hesab ayrıca BCrypt ilə şifrələnir. Şifrəni heç bir yerdə yazılı saxlamayın və
              müntəzəm yeniləyin.
            </p>
          </div>

          {/* Best practices strip */}
          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-white/15">
            {[
              { num: '10+', label: 'Simvol' },
              { num: 'Aa1!', label: 'Müxtəliflik' },
              { num: '90', label: 'Gündən bir yenilə', accent: true },
            ].map((it, i) => (
              <div key={i}>
                <p
                  className="text-[24px] lg:text-[28px] font-extrabold tracking-tight leading-none"
                  style={{ color: it.accent ? 'var(--ces-gold)' : '#fff' }}
                >
                  {it.num}
                </p>
                <p className="text-[11px] font-semibold tracking-[.1em] uppercase mt-2" style={{ color: 'rgba(255,255,255,.6)' }}>
                  {it.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
