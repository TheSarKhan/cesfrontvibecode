import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { configApi } from '../../api/config'
import { clsx } from 'clsx'

/**
 * ComboInput — həm dropdown, həm əl ilə yazma.
 * Konfiqurasiya kateqoriyasından gələn dəyərləri göstərir,
 * istifadəçi istədiyi dəyəri əl ilə də yaza bilər.
 *
 * Props:
 *   category  — config kateqoriya adı (e.g. "EQUIPMENT_BRAND")
 *   value     — kontrol edilən dəyər
 *   onChange  — (newValue) => void
 *   placeholder
 *   className — əlavə class (default input styling tətbiq olunur)
 *   disabled
 *   label     — inputun üstündəki label (ixtiyari, xaricdən verilə bilər)
 */
export default function ComboInput({ category, value, onChange, placeholder, className, disabled }) {
  const [options, setOptions] = useState([])
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const ref = useRef()
  const inputRef = useRef()

  useEffect(() => {
    if (category) {
      configApi.getActiveByCategory(category)
        .then(res => {
          const items = res.data.data || res.data || []
          setOptions(items.map(i => i.value || i.key))
        })
        .catch(() => {})
    }
  }, [category])

  // Click outside → bağla
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = filter
    ? options.filter(o => o.toLowerCase().includes(filter.toLowerCase()))
    : options

  const handleInputChange = (e) => {
    const v = e.target.value
    onChange(v)
    setFilter(v)
    if (!open) setOpen(true)
  }

  const handleSelect = (opt) => {
    onChange(opt)
    setFilter('')
    setOpen(false)
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value || ''}
          onChange={handleInputChange}
          onFocus={() => { if (options.length > 0) setOpen(true) }}
          placeholder={placeholder}
          disabled={disabled}
          className={clsx(inputCls, options.length > 0 && 'pr-8', className)}
        />
        {options.length > 0 && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => { setOpen(o => !o); inputRef.current?.focus() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronDown size={14} className={clsx('transition-transform', open && 'rotate-180')} />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto scrollbar-thin">
          {filtered.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(opt)}
              className={clsx(
                'w-full text-left px-3 py-2 text-sm transition-colors',
                opt === value
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
