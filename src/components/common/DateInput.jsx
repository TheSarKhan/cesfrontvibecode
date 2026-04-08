import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
]
const MONTHS_SHORT = [
  'Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn',
  'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'
]
const WEEKDAYS = ['Be', 'Ça', 'Çə', 'Cü', 'Cü', 'Şə', 'Ba']

function isoToDisplay(iso) {
  if (!iso) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return ''
  return `${m[3]}.${m[2]}.${m[1]}`
}

function pad(n) { return String(n).padStart(2, '0') }
function toIso(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}` }

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year, month) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

// view: 'days' | 'months' | 'years'
export default function DateInput({ value, onChange, placeholder = 'gg.aa.iiii', className = '', ...rest }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('days')
  const [pos, setPos] = useState({ top: true, left: true })
  const ref = useRef(null)

  const today = new Date()
  const parsed = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null
  const selYear = parsed ? parseInt(parsed[1]) : null
  const selMonth = parsed ? parseInt(parsed[2]) - 1 : null
  const selDay = parsed ? parseInt(parsed[3]) : null

  const [viewYear, setViewYear] = useState(selYear ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selMonth ?? today.getMonth())
  const [yearRangeStart, setYearRangeStart] = useState(Math.floor((selYear ?? today.getFullYear()) / 12) * 12)

  useEffect(() => {
    if (parsed) {
      const y = parseInt(parsed[1])
      setViewYear(y)
      setViewMonth(parseInt(parsed[2]) - 1)
      setYearRangeStart(Math.floor(y / 12) * 12)
    }
  }, [value])

  // Reset view to days when opening
  useEffect(() => {
    if (open) setView('days')
  }, [open])

  // Position dropdown
  useEffect(() => {
    if (!open || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const dropH = 340, dropW = 264
    setPos({
      top: rect.bottom + dropH <= window.innerHeight,
      left: rect.left + dropW <= window.innerWidth
    })
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function selectDay(day) {
    onChange?.({ target: { value: toIso(viewYear, viewMonth, day) } })
    setOpen(false)
  }

  function selectMonth(m) {
    setViewMonth(m)
    setView('days')
  }

  function selectYear(y) {
    setViewYear(y)
    setYearRangeStart(Math.floor(y / 12) * 12)
    setView('months')
  }

  function selectToday() {
    onChange?.({ target: { value: toIso(today.getFullYear(), today.getMonth(), today.getDate()) } })
    setOpen(false)
  }

  function clear() {
    onChange?.({ target: { value: '' } })
    setOpen(false)
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)

  const isSelected = (day) =>
    selYear === viewYear && selMonth === viewMonth && selDay === day

  const isDayToday = (day) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day

  // Header title & navigation per view
  let headerTitle, onPrev, onNext, onHeaderClick
  if (view === 'days') {
    headerTitle = `${MONTHS[viewMonth]} ${viewYear}`
    onPrev = prevMonth
    onNext = nextMonth
    onHeaderClick = () => setView('months')
  } else if (view === 'months') {
    headerTitle = `${viewYear}`
    onPrev = () => setViewYear(y => y - 1)
    onNext = () => setViewYear(y => y + 1)
    onHeaderClick = () => setView('years')
  } else {
    headerTitle = `${yearRangeStart} – ${yearRangeStart + 11}`
    onPrev = () => setYearRangeStart(s => s - 12)
    onNext = () => setYearRangeStart(s => s + 12)
    onHeaderClick = null
  }

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(o => !o)}
        className={`flex items-center cursor-pointer ${className}`}
        {...rest}
      >
        <span className={`flex-1 ${value ? '' : 'text-gray-400'}`}>
          {value ? isoToDisplay(value) : placeholder}
        </span>
        <Calendar size={14} className="text-gray-400 shrink-0 ml-1" />
      </div>

      {open && (
        <div className={`absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 w-64 select-none
          ${pos.top ? 'mt-1 top-full' : 'mb-1 bottom-full'}
          ${pos.left ? 'left-0' : 'right-0'}
        `}>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={onPrev}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={onHeaderClick}
              disabled={!onHeaderClick}
              className="text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-amber-600 dark:hover:text-amber-400 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:hover:bg-transparent disabled:hover:text-gray-700 dark:disabled:hover:text-gray-200 disabled:cursor-default"
            >
              {headerTitle}
            </button>
            <button type="button" onClick={onNext}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* === DAYS VIEW === */}
          {view === 'days' && (
            <>
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`e-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={`
                      w-8 h-8 text-xs rounded-lg flex items-center justify-center transition-colors
                      ${isSelected(day)
                        ? 'bg-amber-500 text-white font-bold'
                        : isDayToday(day)
                          ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-semibold ring-1 ring-amber-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
                    `}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* === MONTHS VIEW === */}
          {view === 'months' && (
            <div className="grid grid-cols-3 gap-2 py-1">
              {MONTHS_SHORT.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectMonth(i)}
                  className={`
                    py-2.5 text-xs rounded-lg transition-colors
                    ${viewMonth === i && selYear === viewYear
                      ? 'bg-amber-500 text-white font-bold'
                      : i === today.getMonth() && viewYear === today.getFullYear()
                        ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-semibold ring-1 ring-amber-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
                  `}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {/* === YEARS VIEW === */}
          {view === 'years' && (
            <div className="grid grid-cols-3 gap-2 py-1">
              {Array.from({ length: 12 }, (_, i) => yearRangeStart + i).map(y => (
                <button
                  key={y}
                  type="button"
                  onClick={() => selectYear(y)}
                  className={`
                    py-2.5 text-xs rounded-lg transition-colors
                    ${y === viewYear
                      ? 'bg-amber-500 text-white font-bold'
                      : y === today.getFullYear()
                        ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-semibold ring-1 ring-amber-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
                  `}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button type="button" onClick={selectToday}
              className="text-[10px] font-medium text-amber-600 hover:text-amber-700 px-2 py-1 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20">
              Bu gün
            </button>
            {value && (
              <button type="button" onClick={clear}
                className="text-[10px] font-medium text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                Təmizlə
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
