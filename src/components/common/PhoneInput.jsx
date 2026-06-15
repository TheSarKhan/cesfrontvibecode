import { forwardRef } from 'react'
import { onlyPhone } from '../../utils/validation'

const ALLOWED_CONTROL_KEYS = new Set([
  'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Home', 'End',
])

const PhoneInput = forwardRef(function PhoneInput(
  { value, onChange, onKeyDown, onPaste, type: _type, inputMode, ...rest },
  ref
) {
  const emit = (e, newValue) => {
    if (!onChange) return
    if (newValue === e.target.value) {
      onChange(e)
      return
    }
    onChange({ ...e, target: { ...e.target, value: newValue, name: e.target.name } })
  }

  const handleChange = (e) => {
    const cleaned = onlyPhone(e.target.value)
    emit(e, cleaned)
  }

  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      onKeyDown?.(e)
      return
    }
    if (ALLOWED_CONTROL_KEYS.has(e.key)) {
      onKeyDown?.(e)
      return
    }
    if (e.key === '+') {
      const el = e.target
      const start = el.selectionStart ?? 0
      if (start !== 0 || el.value.includes('+')) {
        e.preventDefault()
      }
      onKeyDown?.(e)
      return
    }
    if (!/^\d$/.test(e.key)) {
      e.preventDefault()
    }
    onKeyDown?.(e)
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData?.getData('text') ?? ''
    const el = e.target
    const start = el.selectionStart ?? el.value.length
    const end   = el.selectionEnd   ?? el.value.length
    const next  = onlyPhone(el.value.slice(0, start) + pasted + el.value.slice(end))
    if (next !== el.value) {
      e.preventDefault()
      emit(e, next)
    }
    onPaste?.(e)
  }

  return (
    <input
      ref={ref}
      {...rest}
      type="tel"
      inputMode={inputMode ?? 'tel'}
      value={value ?? ''}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
    />
  )
})

export default PhoneInput
