/* ─────────────────────────────────────────────────────
   CES ERP Mühasibatlıq — Shared UI kit components
───────────────────────────────────────────────────── */
import { useState } from 'react'
import { clsx } from 'clsx'
import { AlertCircle, X } from 'lucide-react'
import { PILL_STYLES } from './_constants'
import { onlyDigits, onlyDecimal, digitKeyDown, decimalKeyDown, makePasteHandler } from '../../utils/validation'

/* ─── UI kit `.pill` ─── */
// dot prop saxlanılır (geriyə uyğunluq üçün) amma render etmir — istifadəçi
// status badge-larında nöqtə istəmir, yalnız sözün özü.
export function Pill({ tone = 'muted', children, dot, sm }) {
  const s = PILL_STYLES[tone] || PILL_STYLES.muted
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-bold tracking-tight',
        sm ? 'px-2 py-[3px] text-[11px]' : 'px-2.5 py-1 text-[12px]'
      )}
      style={{ background: s.bg, color: s.color }}
    >
      {children}
    </span>
  )
}

export function PageHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.022em] leading-none" style={{ color: 'var(--ces-graphite-900)' }}>
          {title}
        </h1>
        {subtitle && <p className="text-[13px] mt-1.5" style={{ color: 'var(--ces-muted)' }}>{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2 flex-wrap">{right}</div>}
    </div>
  )
}

export function Field({ label, required, error, children, hint, wide }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      {label && (
        <label className="block text-[13px] font-semibold mb-[7px]" style={{ color: 'var(--ces-ink)' }}>
          {label}
          {required && <span style={{ color: 'var(--ces-danger)' }}> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1.5 text-[11.5px]" style={{ color: 'var(--ces-muted)' }}>{hint}</p>}
      {error && (
        <p className="mt-1.5 text-[11.5px] font-semibold flex items-center gap-1" style={{ color: 'var(--ces-danger)' }}>
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  )
}

export function Input({ value, onChange, placeholder, type = 'text', error, prefix, suffix, autoFocus, min, max, step, maxLength, disabled, mono, onKeyDown, onPaste, inputMode }) {
  const [focused, setFocused] = useState(false)

  const isNumber = type === 'number'
  const isDecimal = isNumber && step !== undefined && String(step) !== '1'
  const renderType = isNumber ? 'text' : type
  const resolvedInputMode = inputMode ?? (isDecimal ? 'decimal' : isNumber ? 'numeric' : undefined)

  const sanitize = isDecimal ? onlyDecimal : isNumber ? onlyDigits : null
  const handleChange = (e) => {
    if (!onChange) return
    if (!sanitize) { onChange(e); return }
    const cleaned = sanitize(e.target.value)
    if (cleaned === e.target.value) onChange(e)
    else onChange({ ...e, target: { ...e.target, value: cleaned, name: e.target.name } })
  }
  const resolvedKeyDown = onKeyDown ?? (isDecimal ? decimalKeyDown : isNumber ? digitKeyDown : undefined)
  const resolvedPaste = onPaste ?? (sanitize ? makePasteHandler(sanitize) : undefined)

  return (
    <div
      className="flex items-center px-[13px] transition-all"
      style={{
        background: disabled ? 'var(--ces-graphite-50)' : 'var(--ces-surface)',
        border: `1px solid ${error ? 'var(--ces-danger)' : focused ? 'var(--ces-gold)' : 'var(--ces-line)'}`,
        borderRadius: '11px',
        minHeight: '44px',
        boxShadow: error
          ? '0 0 0 3px var(--ces-danger-100)'
          : focused ? '0 0 0 3px var(--ces-gold-100)' : 'none',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {prefix && (
        <span className="text-[12.5px] font-semibold mr-2"
          style={{ padding: '6px 10px', background: 'var(--ces-graphite-50)', borderRadius: '7px', color: 'var(--ces-muted)' }}>
          {prefix}
        </span>
      )}
      <input
        type={renderType}
        inputMode={resolvedInputMode}
        value={value ?? ''}
        onChange={handleChange}
        onKeyDown={resolvedKeyDown}
        onPaste={resolvedPaste}
        placeholder={placeholder}
        autoFocus={autoFocus}
        min={min}
        max={max}
        step={step}
        maxLength={maxLength}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={clsx('flex-1 border-0 outline-0 bg-transparent text-[14px] py-[11px] w-full', mono && 'font-mono')}
        style={{ color: 'var(--ces-ink)' }}
      />
      {suffix && (
        <span className="text-[12.5px] font-semibold ml-2"
          style={{ padding: '6px 10px', background: 'var(--ces-graphite-50)', borderRadius: '7px', color: 'var(--ces-muted)' }}>
          {suffix}
        </span>
      )}
    </div>
  )
}

export function Textarea({ value, onChange, placeholder, rows = 3, error }) {
  const [focused, setFocused] = useState(false)
  return (
    <div
      className="flex items-start"
      style={{
        background: 'var(--ces-surface)',
        border: `1px solid ${error ? 'var(--ces-danger)' : focused ? 'var(--ces-gold)' : 'var(--ces-line)'}`,
        borderRadius: '11px',
        padding: '4px 13px',
        boxShadow: error
          ? '0 0 0 3px var(--ces-danger-100)'
          : focused ? '0 0 0 3px var(--ces-gold-100)' : 'none',
      }}
    >
      <textarea
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="flex-1 border-0 outline-0 bg-transparent text-[14px] py-[11px] w-full resize-none"
        style={{ color: 'var(--ces-ink)' }}
      />
    </div>
  )
}

export function Select({ value, onChange, children, disabled }) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      value={value ?? ''}
      onChange={onChange}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="w-full appearance-none cursor-pointer transition-all"
      style={{
        padding: '11px 36px 11px 13px',
        background: `${disabled ? 'var(--ces-graphite-50)' : 'var(--ces-surface)'} url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b6b6b' stroke-width='2.4' stroke-linecap='round'><path d='m6 9 6 6 6-6'/></svg>") no-repeat right 12px center`,
        border: `1px solid ${focused ? 'var(--ces-gold)' : 'var(--ces-line)'}`,
        borderRadius: '11px',
        minHeight: '44px',
        fontSize: '14px',
        color: 'var(--ces-ink)',
        outline: 'none',
        boxShadow: focused ? '0 0 0 3px var(--ces-gold-100)' : 'none',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
    </select>
  )
}

export function Avatar({ name, size = 'sm', tone = 'graphite' }) {
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?'
  const sizes = { xs: 22, sm: 28, md: 36, lg: 48 }
  const fontSizes = { xs: 10, sm: 11, md: 12.5, lg: 15 }
  const px = sizes[size] || 28
  return (
    <span
      className="inline-grid place-items-center rounded-full font-bold flex-none"
      style={{
        width: `${px}px`,
        height: `${px}px`,
        fontSize: `${fontSizes[size]}px`,
        background: tone === 'gold' ? 'var(--ces-gold)' : tone === 'mute' ? 'var(--ces-graphite-100)' : 'var(--ces-graphite)',
        color: tone === 'gold' ? 'var(--ces-on-gold)' : tone === 'mute' ? 'var(--ces-muted)' : 'var(--ces-gold)',
      }}
    >
      {initials}
    </span>
  )
}

export function ModalShell({ icon: Icon, eyebrow, title, subtitle, onClose, children, footer, maxWidth = '640px', tone = 'graphite' }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(26,26,26,.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full overflow-hidden flex flex-col my-8"
        style={{
          maxWidth,
          background: 'var(--ces-surface)',
          borderRadius: 'var(--ces-radius-lg)',
          boxShadow: 'var(--ces-shadow-lg)',
          maxHeight: '92vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-6 py-5 shrink-0" style={{ borderBottom: '1px solid var(--ces-line)' }}>
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div
                className="w-10 h-10 rounded-[10px] grid place-items-center flex-none"
                style={{
                  background: tone === 'gold' ? 'var(--ces-gold-100)' : 'var(--ces-graphite-100)',
                  color: tone === 'gold' ? 'var(--ces-gold-700)' : 'var(--ces-graphite)',
                }}
              >
                <Icon size={18} />
              </div>
            )}
            <div className="min-w-0">
              {eyebrow && (
                <p className="text-[10.5px] font-bold uppercase tracking-[.16em]" style={{ color: 'var(--ces-gold)' }}>
                  {eyebrow}
                </p>
              )}
              <h2 className="text-[18px] font-extrabold leading-tight truncate" style={{ color: 'var(--ces-ink)' }}>{title}</h2>
              {subtitle && <p className="text-[12px] mt-0.5" style={{ color: 'var(--ces-muted)' }}>{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-[8px] grid place-items-center transition-colors flex-none"
            style={{ color: 'var(--ces-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ces-graphite-50)'; e.currentTarget.style.color = 'var(--ces-graphite)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ces-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">{children}</div>

        {footer && (
          <div
            className="flex items-center justify-end gap-2 px-6 py-4 shrink-0"
            style={{ borderTop: '1px solid var(--ces-line)', background: 'var(--ces-graphite-50)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function LoadingRow({ colSpan, message = 'Yüklənir...' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-10" style={{ color: 'var(--ces-mute2)' }}>
        <span className="inline-flex items-center gap-2 text-[13px]">
          <span className="w-3 h-3 rounded-full animate-spin"
            style={{ border: '2px solid var(--ces-line)', borderTopColor: 'var(--ces-gold)' }} />
          {message}
        </span>
      </td>
    </tr>
  )
}

export function EmptyRow({ colSpan, icon: Icon, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-14 px-4">
        <div className="w-12 h-12 rounded-2xl mx-auto mb-3 grid place-items-center" style={{ background: 'var(--ces-graphite-50)' }}>
          {Icon && <Icon size={20} style={{ color: 'var(--ces-mute2)' }} />}
        </div>
        <p className="text-[13px] font-semibold" style={{ color: 'var(--ces-ink)' }}>{message}</p>
      </td>
    </tr>
  )
}

export function TableWrap({ children }) {
  return (
    <div
      className="overflow-hidden"
      style={{
        background: 'var(--ces-surface)',
        border: '1px solid var(--ces-line)',
        borderRadius: 'var(--ces-radius-lg)',
        boxShadow: 'var(--ces-shadow-sm)',
      }}
    >
      {children}
    </div>
  )
}

export function FormSection({ icon: Icon, title, children, cols = 2 }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {Icon && (
          <span className="w-6 h-6 rounded-[6px] grid place-items-center"
            style={{ background: 'var(--ces-graphite-50)', color: 'var(--ces-graphite)' }}>
            <Icon size={13} />
          </span>
        )}
        <h3 className="text-[10.5px] font-bold uppercase tracking-[.16em]" style={{ color: 'var(--ces-muted)' }}>
          {title}
        </h3>
      </div>
      <div className={cols === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : cols === 3 ? 'grid grid-cols-1 sm:grid-cols-3 gap-3' : 'space-y-3'}>
        {children}
      </div>
    </div>
  )
}

/* ─── KPI Card (for hubs/dashboards) ─── */
export function KpiCard({ label, value, unit, icon: Icon, tone = 'muted', sub, onClick }) {
  const toneStyle = PILL_STYLES[tone] || PILL_STYLES.muted
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={clsx(
        'flex flex-col text-left transition-all',
        onClick && 'cursor-pointer hover:-translate-y-0.5'
      )}
      style={{
        background: 'var(--ces-surface)',
        border: '1px solid var(--ces-line)',
        borderRadius: 'var(--ces-radius-lg)',
        padding: '22px',
        boxShadow: 'var(--ces-shadow-sm)',
      }}
    >
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: 'var(--ces-muted)' }}>
          {label}
        </span>
        {Icon && (
          <span
            className="w-9 h-9 rounded-[10px] grid place-items-center"
            style={{ background: toneStyle.bg, color: toneStyle.color }}
          >
            <Icon size={18} />
          </span>
        )}
      </div>
      <div className="text-[28px] font-extrabold tracking-[-.025em] leading-none num flex items-baseline gap-1.5" style={{ color: 'var(--ces-graphite-900)' }}>
        {value}
        {unit && <span className="text-[14px] font-semibold" style={{ color: 'var(--ces-muted)' }}>{unit}</span>}
      </div>
      {sub && <p className="text-[11.5px] mt-2" style={{ color: 'var(--ces-muted)' }}>{sub}</p>}
    </button>
  )
}
