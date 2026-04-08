import { useState, useEffect } from 'react'

// dd.mm.yyyy displayed ↔ yyyy-mm-dd stored
// Drop-in replacement for <input type="date" />:
//   value (yyyy-mm-dd string or '')
//   onChange receives a synthetic event: { target: { value: 'yyyy-mm-dd' | '' } }
// All other props (className, required, min, max, disabled, placeholder, ...) pass through.

function isoToDisplay(iso) {
  if (!iso) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return ''
  return `${m[3]}.${m[2]}.${m[1]}`
}

function displayToIso(str) {
  if (!str) return ''
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(str.trim())
  if (!m) return null
  const dd = parseInt(m[1], 10), mm = parseInt(m[2], 10), yyyy = parseInt(m[3], 10)
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

// Live mask: auto-insert dots while typing
function maskInput(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  let out = digits
  if (digits.length > 2) out = digits.slice(0, 2) + '.' + digits.slice(2)
  if (digits.length > 4) out = digits.slice(0, 2) + '.' + digits.slice(2, 4) + '.' + digits.slice(4)
  return out
}

export default function DateInput({ value, onChange, placeholder = 'gg.aa.iiii', ...rest }) {
  const [display, setDisplay] = useState(isoToDisplay(value))

  useEffect(() => {
    setDisplay(isoToDisplay(value))
  }, [value])

  function handleChange(e) {
    const masked = maskInput(e.target.value)
    setDisplay(masked)
    const iso = displayToIso(masked)
    if (iso !== null) {
      onChange?.({ target: { value: iso } })
    } else if (masked === '') {
      onChange?.({ target: { value: '' } })
    }
  }

  function handleBlur() {
    if (!display) return
    const iso = displayToIso(display)
    if (iso === null) {
      setDisplay(isoToDisplay(value))
    }
  }

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      maxLength={10}
    />
  )
}
