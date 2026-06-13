import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, Lock, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import logoLight from '../../assets/logo white.png'
import logoDark from '../../assets/logo2.png'

const SESSION_KEY = 'login_form_draft'

export default function LoginPage() {
  const theme = useThemeStore((s) => s.theme)
  const brandLogo = theme === 'dark' ? logoDark : logoLight
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
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
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
        {/* Top brand row — UI kit .kit-logo pattern (white bg, padded) */}
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

        {/* Center: form */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="w-full max-w-[420px] mx-auto">

            {/* Section pre-title */}
            <p
              className="text-[11px] font-semibold tracking-[.16em] uppercase mb-3"
              style={{ color: 'var(--ces-gold)' }}
            >
              {showSuccess ? 'Şifrə yeniləndi' : 'Daxil ol'}
            </p>

            {/* Hero title */}
            {showSuccess ? (
              <>
                <h1
                  className="text-[36px] sm:text-[40px] font-extrabold tracking-[-.022em] leading-[1.05] mb-3"
                  style={{ color: 'var(--ces-ink)' }}
                >
                  Təbriklər,<br />
                  <span style={{ color: 'var(--ces-gold)' }}>şifrə yeniləndi.</span>
                </h1>
                <p className="text-[15px] leading-[1.55] mb-10" style={{ color: 'var(--ces-muted)' }}>
                  Daxil olmaq üçün yeni şifrənizdən istifadə edin.
                </p>
              </>
            ) : (
              <>
                <h1
                  className="text-[36px] sm:text-[40px] font-extrabold tracking-[-.022em] leading-[1.05] mb-3"
                  style={{ color: 'var(--ces-ink)' }}
                >
                  Yenidən xoş <span style={{ color: 'var(--ces-gold)' }}>gəldin.</span>
                </h1>
                <p className="text-[15px] leading-[1.55] mb-10" style={{ color: 'var(--ces-muted)' }}>
                  Hesabınıza daxil olun və işinizi davam etdirin.
                </p>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* ─── EMAIL ─── */}
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
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, email: e.target.value }))
                      setError('')
                    }}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    placeholder="email@domain.com"
                    className="flex-1 border-0 outline-0 bg-transparent text-[14px] py-[11px] w-full"
                    style={{ color: 'var(--ces-ink)' }}
                  />
                </div>
              </div>

              {/* ─── PASSWORD ─── */}
              <div>
                <div className="flex items-baseline justify-between mb-[7px]">
                  <label className="text-[13px] font-semibold" style={{ color: 'var(--ces-ink)' }}>
                    Şifrə <span style={{ color: 'var(--ces-danger)' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={goToForgotPassword}
                    className="text-[12px] font-semibold transition-colors bg-transparent border-0 p-0 cursor-pointer hover:opacity-80"
                    style={{ color: 'var(--ces-graphite)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ces-gold)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ces-graphite)')}
                  >
                    Unutmuşam?
                  </button>
                </div>
                <div
                  className="flex items-center px-[13px] transition-all"
                  style={{
                    background: 'var(--ces-surface)',
                    border: `1px solid ${error ? 'var(--ces-danger)' : passwordFocused ? 'var(--ces-graphite)' : 'var(--ces-line)'}`,
                    borderRadius: '11px',
                    minHeight: '48px',
                    boxShadow: error
                      ? '0 0 0 3px rgba(212,56,90,.12)'
                      : passwordFocused
                      ? '0 0 0 3px rgba(58,58,58,.1)'
                      : 'none',
                  }}
                >
                  <Lock size={16} style={{ color: 'var(--ces-mute2)' }} className="mr-2 flex-none" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, password: e.target.value }))
                      setError('')
                    }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    placeholder="••••••••••••"
                    className="flex-1 border-0 outline-0 bg-transparent text-[14px] py-[11px] w-full"
                    style={{ color: 'var(--ces-ink)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="ml-2 flex-none p-1 rounded transition-colors"
                    style={{ color: 'var(--ces-mute2)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ces-graphite)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ces-mute2)')}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* ─── ERROR MESSAGE ─── */}
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

              {/* ─── SUBMIT BUTTON (Graphite — UI kit btn-primary) ─── */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 font-semibold text-[15px] py-[14px] rounded-[12px] transition-all disabled:opacity-60"
                style={{
                  background: 'var(--ces-graphite)',
                  color: 'var(--ces-on-primary)',
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'var(--ces-graphite-900)')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.background = 'var(--ces-graphite)')}
              >
                {loading ? (
                  <>
                    <span
                      className="w-4 h-4 rounded-full animate-spin"
                      style={{
                        border: '2px solid rgba(255,255,255,.3)',
                        borderTopColor: 'var(--ces-on-primary)',
                      }}
                    />
                    Giriş edilir...
                  </>
                ) : (
                  <>
                    Daxil ol
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* ─── SUCCESS BANNER (reset password done) ─── */}
              {showSuccess && (
                <div
                  className="flex items-start gap-2 text-[12px] font-semibold px-3 py-2 rounded-[10px]"
                  style={{
                    color: 'var(--ces-ok)',
                    background: 'rgba(15,157,106,.06)',
                    border: '1px solid rgba(15,157,106,.18)',
                  }}
                >
                  <CheckCircle2 size={14} className="flex-none mt-0.5" />
                  <span className="leading-snug">Şifrəniz uğurla yeniləndi. İndi daxil ola bilərsiniz.</span>
                </div>
              )}
            </form>

            {/* Help row under form */}
            <div
              className="mt-8 pt-6 border-t text-[12px] flex items-center justify-between"
              style={{ borderColor: 'var(--ces-line)', color: 'var(--ces-muted)' }}
            >
              <span>Sistemə dəstək lazımdırsa?</span>
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

        {/* Footer */}
        <p
          className="text-[11px] tracking-wide text-center mt-8"
          style={{ color: 'var(--ces-mute2)' }}
        >
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
        {/* Background image with overlay */}
        <img
          src="/d1461a66d8f109fcfb98e6ee584a296930495032 (1).jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          style={{ objectPosition: '100% 50%' }}
        />

        {/* Gradient overlay — graphite to transparent */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(38,38,38,.85) 0%, rgba(58,58,58,.55) 50%, rgba(26,26,26,.85) 100%)',
          }}
        />

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Content overlay */}
        <div className="relative h-full flex flex-col justify-between p-10 lg:p-14 xl:p-20">

          {/* Top corner — version/status badge */}
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
              Sistem aktiv · v1.0
            </span>
          </div>

          {/* Middle — brand statement */}
          <div className="max-w-[560px]">
            <p
              className="text-[12px] font-semibold tracking-[.18em] uppercase mb-5"
              style={{ color: 'var(--ces-gold)' }}
            >
              CES ERP — 2026
            </p>
            <h2
              className="text-[40px] lg:text-[48px] xl:text-[56px] font-extrabold tracking-[-.022em] leading-[1.05] mb-5"
              style={{ color: '#fff' }}
            >
              Texnika, layihə və<br />
              <span style={{ color: 'var(--ces-gold)' }}>maliyyə</span> bir<br />
              platformada.
            </h2>
            <p
              className="text-[16px] lg:text-[17px] leading-[1.55] max-w-[480px]"
              style={{ color: 'rgba(255,255,255,.75)' }}
            >
              Ayrı cədvəllər, paralel WhatsApp qrupları, itən sənədlər —
              hamısı bir interfeysə yığılır.
            </p>
          </div>

          {/* Bottom — stats strip */}
          <div className="grid grid-cols-3 gap-6 lg:gap-10 pt-8 border-t border-white/15">
            <div>
              <p className="text-[28px] lg:text-[32px] font-extrabold tracking-tight leading-none" style={{ color: '#fff' }}>
                17
              </p>
              <p className="text-[11px] font-semibold tracking-[.1em] uppercase mt-2" style={{ color: 'rgba(255,255,255,.6)' }}>
                Modul
              </p>
            </div>
            <div>
              <p className="text-[28px] lg:text-[32px] font-extrabold tracking-tight leading-none" style={{ color: 'var(--ces-gold)' }}>
                Sürətli
              </p>
              <p className="text-[11px] font-semibold tracking-[.1em] uppercase mt-2" style={{ color: 'rgba(255,255,255,.6)' }}>
                proses
              </p>
            </div>
            <div>
              <p className="text-[28px] lg:text-[32px] font-extrabold tracking-tight leading-none" style={{ color: '#fff' }}>
                Sadə
              </p>
              <p className="text-[11px] font-semibold tracking-[.1em] uppercase mt-2" style={{ color: 'rgba(255,255,255,.6)' }}>
                interfeys
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
