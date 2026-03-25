import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { clsx } from 'clsx'

const PAGE_SIZES = [15, 25, 50, 100]

export default function Pagination({ page, pageSize, totalPages, totalElements, onPage, onPageSize }) {
  if (!totalElements) return null

  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, totalElements)

  const pageNums = (() => {
    const count = Math.min(5, totalPages)
    let start
    if (totalPages <= 5)      start = 1
    else if (page <= 3)        start = 1
    else if (page >= totalPages - 2) start = totalPages - 4
    else                       start = page - 2
    return Array.from({ length: count }, (_, i) => start + i)
  })()

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
      <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
        <span>{totalElements} nəticədən {from}–{to}</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className="px-1.5 py-0.5 text-[11px] border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
        >
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / səhifə</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(1)} disabled={page === 1}
          className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronsLeft size={14} />
        </button>
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={14} />
        </button>
        {pageNums.map(n => (
          <button key={n} onClick={() => onPage(n)}
            className={clsx(
              'w-7 h-7 rounded text-[11px] font-medium transition-colors',
              page === n
                ? 'bg-amber-600 text-white'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}>
            {n}
          </button>
        ))}
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
          className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={14} />
        </button>
        <button onClick={() => onPage(totalPages)} disabled={page === totalPages}
          className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  )
}
