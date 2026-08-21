import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Check, Info, X, AlertTriangle, Loader2, Send } from 'lucide-react'
import { systemApi } from '../../api/system'

const VARIANTS = {
  success: {
    bg: '#0f9d6a',
    Icon: Check,
    iconStroke: 3,
  },
  error: {
    bg: '#d4385a',
    Icon: X,
    iconStroke: 2.6,
  },
  warning: {
    bg: '#e08a00',
    Icon: AlertTriangle,
    iconStroke: 2.4,
  },
  info: {
    bg: '#2563c8',
    Icon: Info,
    iconStroke: 2.4,
  },
  loading: {
    bg: '#3a3a3a',
    Icon: Loader2,
    iconStroke: 2.4,
    spin: true,
  },
}

function resolveVariant(t) {
  if (t.type === 'success') return VARIANTS.success
  if (t.type === 'error') return VARIANTS.error
  if (t.type === 'loading') return VARIANTS.loading
  if (t.icon === 'warning' || t.icon === '⚠️') return VARIANTS.warning
  return VARIANTS.info
}

function ToastCard({ t, message }) {
  const variant = resolveVariant(t)
  const { Icon, iconStroke, spin } = variant
  const [enter, setEnter] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [reported, setReported] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setEnter(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const visible = t.visible && enter
  const text = typeof message === 'function' ? message(t) : message

  let title = null
  let body = null
  if (typeof text === 'string' && text.includes('\n')) {
    const [first, ...rest] = text.split('\n')
    title = first
    body = rest.join('\n')
  } else {
    title = text
  }

  const isError = t.type === 'error' || t.errorReport

  const handleSendReport = async (e) => {
    e.stopPropagation()
    if (reporting || reported) return

    setReporting(true)
    try {
      const payload = t.errorReport || {
        errorMessage: typeof text === 'string' ? text : 'Xəta baş verdi',
        pageUrl: window.location.pathname + window.location.search,
        timestamp: new Date().toLocaleString('az-AZ'),
      }
      await systemApi.reportError(payload)
      setReported(true)
    } catch {
      // ignore
    } finally {
      setReporting(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 14px',
        background: 'var(--ces-toast-bg)',
        color: 'var(--ces-toast-fg)',
        border: '1px solid var(--ces-line)',
        borderRadius: 12,
        fontSize: 13.5,
        fontWeight: 500,
        lineHeight: 1.4,
        boxShadow: 'var(--ces-shadow-lg)',
        minWidth: 290,
        maxWidth: 440,
        fontFamily:
          "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        transform: visible ? 'translateY(0)' : 'translateY(-10px)',
        opacity: visible ? 1 : 0,
        transition: 'transform .22s cubic-bezier(.4,0,.2,1), opacity .22s ease',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: body ? 'flex-start' : 'center', gap: 10 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            display: 'grid',
            placeItems: 'center',
            background: variant.bg,
            color: '#fff',
            flex: 'none',
            marginTop: body ? 1 : 0,
          }}
        >
          <Icon
            size={14}
            strokeWidth={iconStroke}
            style={spin ? { animation: 'ces-spin 1s linear infinite' } : undefined}
          />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              wordBreak: 'break-word',
              fontWeight: body ? 600 : 500,
            }}
          >
            {title}
          </div>
          {body && (
            <div
              style={{
                marginTop: 2,
                fontSize: 12.5,
                fontWeight: 400,
                color: 'rgba(255,255,255,.72)',
                wordBreak: 'break-word',
              }}
            >
              {body}
            </div>
          )}
        </div>
        {t.type !== 'loading' && (
          <button
            onClick={() => toast.dismiss(t.id)}
            aria-label="Bağla"
            style={{
              marginLeft: 4,
              width: 22,
              height: 22,
              borderRadius: 6,
              display: 'grid',
              placeItems: 'center',
              color: 'rgba(255,255,255,.55)',
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              flex: 'none',
              transition: 'background .15s, color .15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,.08)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'rgba(255,255,255,.55)'
            }}
          >
            <X size={13} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {/* Telegram Report Button for Error Toasts */}
      {isError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 6,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            marginTop: 2,
          }}
        >
          <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.45)' }}>
            Xəta davam edirsə bildirin:
          </span>
          <button
            type="button"
            onClick={handleSendReport}
            disabled={reporting || reported}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 600,
              color: reported ? '#45e6a8' : '#fff',
              background: reported
                ? 'rgba(69, 230, 168, 0.15)'
                : 'rgba(212, 56, 90, 0.25)',
              border: `1px solid ${reported ? 'rgba(69, 230, 168, 0.3)' : 'rgba(212, 56, 90, 0.4)'}`,
              cursor: reported || reporting ? 'default' : 'pointer',
              transition: 'all .15s ease',
            }}
            onMouseEnter={(e) => {
              if (!reported && !reporting) {
                e.currentTarget.style.background = 'rgba(212, 56, 90, 0.45)'
              }
            }}
            onMouseLeave={(e) => {
              if (!reported && !reporting) {
                e.currentTarget.style.background = 'rgba(212, 56, 90, 0.25)'
              }
            }}
          >
            {reporting ? (
              <>
                <Loader2 size={12} style={{ animation: 'ces-spin 1s linear infinite' }} />
                <span>Göndərilir...</span>
              </>
            ) : reported ? (
              <>
                <Check size={12} strokeWidth={3} />
                <span>İnzibatçıya çatdırıldı</span>
              </>
            ) : (
              <>
                <Send size={11} />
                <span>İnzibatçıya Göndər</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export default ToastCard
