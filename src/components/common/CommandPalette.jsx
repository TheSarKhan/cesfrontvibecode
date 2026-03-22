import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Building2, HardHat, Banknote, UserCheck, Truck, ClipboardList, FolderKanban, X, ArrowRight } from 'lucide-react'
import { searchApi } from '../../api/search'
import { clsx } from 'clsx'

const TYPE_ICONS = {
  'MÜŞTƏRİ': Building2,
  'PODRATÇI': HardHat,
  'İNVESTOR': Banknote,
  'OPERATOR': UserCheck,
  'TEXNİKA': Truck,
  'SORĞU': ClipboardList,
  'LAYİHƏ': FolderKanban,
}

const TYPE_COLORS = {
  'MÜŞTƏRİ': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'PODRATÇI': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'İNVESTOR': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'OPERATOR': 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  'TEXNİKA': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'SORĞU': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'LAYİHƏ': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await searchApi.search(query)
        setResults(res.data?.data || res.data || [])
        setActiveIndex(0)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  const go = (item) => {
    navigate(item.path)
    onClose()
  }

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && results[activeIndex]) { go(results[activeIndex]) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, results, activeIndex])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Müştəri, texnika, layihə, sorğu axtar..."
            className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none"
          />
          {loading && <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={15} />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto py-1.5">
            {results.map((item, i) => {
              const Icon = TYPE_ICONS[item.type] || Search
              return (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      i === activeIndex
                        ? 'bg-amber-50 dark:bg-amber-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    )}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => go(item)}
                  >
                    <Icon size={15} className="text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{item.label}</p>
                      {item.subLabel && <p className="text-xs text-gray-400 truncate">{item.subLabel}</p>}
                    </div>
                    <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0', TYPE_COLORS[item.type])}>
                      {item.type}
                    </span>
                    <ArrowRight size={12} className="text-gray-300 dark:text-gray-600 shrink-0" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {/* Empty state */}
        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">
            "{query}" üçün nəticə tapılmadı
          </div>
        )}

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 text-[10px] text-gray-400">
          <span><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">↑↓</kbd> naviqasiya</span>
          <span><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Enter</kbd> aç</span>
          <span><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Esc</kbd> bağla</span>
        </div>
      </div>
    </div>
  )
}
