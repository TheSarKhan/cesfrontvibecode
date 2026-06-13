import { forwardRef } from 'react'
import { onlyDigits, onlyDecimal } from '../../utils/validation'

/**
 * NumberInput — `<input type="number">` üçün uyğunlu, lakin daha sərt rəqəm sahəsi.
 *
 * Xüsusiyyətlər:
 *  - `decimal=false` (default) — yalnız tam ədəd: nöqtə, vergül, hərf, "e", "+", "-" qadağandır.
 *  - `decimal=true`  — onluq ədəd: yalnız rəqəm və bir dənə nöqtə icazəlidir; vergül avtomatik nöqtəyə çevrilir.
 *  - Klaviatura, kopya/paste və proqramatik dəyişiklik tamamilə süzgəcdən keçir.
 *  - Eyni `value` / `onChange` interfeysini saxlayır — adi inputun drop-in əvəzidir.
 *
 * Qeyd: HTML-də `type="number"` browserdan asılı olaraq "e", "+", "-", "." simvollarına icazə verə bilər.
 * Buna görə də sahə daxili olaraq `type="text"` istifadə edir, lakin mobil cihazlar üçün
 * uyğun `inputMode` təyin olunur.
 */
const NumberInput = forwardRef(function NumberInput(
  { decimal = false, value, onChange, onKeyDown, onPaste, inputMode, type, ...rest },
  ref
) {
  const sanitize = decimal ? onlyDecimal : onlyDigits

  const emit = (e, newValue) => {
    if (!onChange) return
    if (newValue === e.target.value) {
      onChange(e)
      return
    }
    onChange({ ...e, target: { ...e.target, value: newValue, name: e.target.name } })
  }

  const handleChange = (e) => {
    const cleaned = sanitize(e.target.value)
    emit(e, cleaned)
  }

  const handleKeyDown = (e) => {
    // ən geniş yayılmış zərərli simvolları klaviaturadan bloklayırıq
    const blocked = ['e', 'E', '+', '-']
    if (blocked.includes(e.key)) {
      e.preventDefault()
    } else if (!decimal && (e.key === '.' || e.key === ',')) {
      e.preventDefault()
    } else if (decimal && e.key === ',') {
      // vergülü nöqtə ilə əvəzləyirik
      e.preventDefault()
      const el = e.target
      const start = el.selectionStart ?? el.value.length
      const end   = el.selectionEnd   ?? el.value.length
      const next  = sanitize(el.value.slice(0, start) + '.' + el.value.slice(end))
      emit(e, next)
    }
    onKeyDown?.(e)
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData?.getData('text') ?? ''
    const el = e.target
    const start = el.selectionStart ?? el.value.length
    const end   = el.selectionEnd   ?? el.value.length
    const next  = sanitize(el.value.slice(0, start) + pasted + el.value.slice(end))
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
      type="text"
      inputMode={inputMode ?? (decimal ? 'decimal' : 'numeric')}
      value={value ?? ''}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
    />
  )
})

export default NumberInput
