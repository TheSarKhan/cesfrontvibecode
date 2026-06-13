import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'

const PAGE_SIZES = [15, 25, 50, 100]

/* ─────────────────────────────────────────────
   CES Pagination — UI kit `.pagination` pattern
   • Light bottom bar with info + page btns + size
───────────────────────────────────────────── */
export default function Pagination({ page, pageSize, totalPages, totalElements, onPage, onPageSize }) {
  if (!totalElements) return null

  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, totalElements)

  const pageNums = (() => {
    const count = Math.min(5, totalPages)
    let start
    if (totalPages <= 5)              start = 1
    else if (page <= 3)               start = 1
    else if (page >= totalPages - 2)  start = totalPages - 4
    else                              start = page - 2
    return Array.from({ length: count }, (_, i) => start + i)
  })()

  return (
    <div
      className="flex items-center justify-between gap-3 flex-wrap"
      style={{
        padding: '14px 22px',
        borderTop: '1px solid var(--ces-line)',
        background: 'var(--ces-surface)',
        fontSize: '13px',
      }}
    >
      <div className="text-[13px]" style={{ color: 'var(--ces-muted)' }}>
        <span className="num">{totalElements}</span> nəticədən{' '}
        <span className="num font-semibold" style={{ color: 'var(--ces-ink)' }}>{from}–{to}</span> göstərilir
      </div>

      <div className="flex items-center gap-1">
        <PgBtn onClick={() => onPage(1)} disabled={page === 1} title="İlk">
          <ChevronsLeft size={14} />
        </PgBtn>
        <PgBtn onClick={() => onPage(page - 1)} disabled={page === 1} title="Əvvəlki">
          <ChevronLeft size={14} />
        </PgBtn>
        {pageNums.map((n) => (
          <PgBtn key={n} onClick={() => onPage(n)} active={page === n}>
            {n}
          </PgBtn>
        ))}
        <PgBtn onClick={() => onPage(page + 1)} disabled={page === totalPages} title="Növbəti">
          <ChevronRight size={14} />
        </PgBtn>
        <PgBtn onClick={() => onPage(totalPages)} disabled={page === totalPages} title="Son">
          <ChevronsRight size={14} />
        </PgBtn>
      </div>

      <div className="flex items-center gap-2 text-[12.5px]" style={{ color: 'var(--ces-muted)' }}>
        <span>Səhifədə</span>
        <div className="relative">
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="appearance-none cursor-pointer pr-7 pl-2.5 py-1.5 text-[12.5px] font-semibold transition-colors"
            style={{
              background: 'var(--ces-surface)',
              border: '1px solid var(--ces-line)',
              borderRadius: '8px',
              color: 'var(--ces-ink)',
              outline: 'none',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--ces-graphite)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--ces-line)')}
          >
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown
            size={11}
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--ces-muted)' }}
          />
        </div>
      </div>
    </div>
  )
}

/* ─── Pagination button — UI kit `.pg` ─── */
function PgBtn({ children, onClick, disabled, active, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        'inline-grid place-items-center font-semibold transition-colors',
        disabled && 'cursor-not-allowed opacity-40'
      )}
      style={{
        minWidth: '32px',
        height: '32px',
        padding: '0 10px',
        background: active ? 'var(--ces-graphite)' : 'var(--ces-surface)',
        color: active ? 'var(--ces-on-primary)' : 'var(--ces-ink)',
        border: `1px solid ${active ? 'var(--ces-graphite)' : 'var(--ces-line)'}`,
        borderRadius: '8px',
        fontSize: '13px',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active) e.currentTarget.style.borderColor = 'var(--ces-graphite)'
      }}
      onMouseLeave={(e) => {
        if (!disabled && !active) e.currentTarget.style.borderColor = 'var(--ces-line)'
      }}
    >
      {children}
    </button>
  )
}
