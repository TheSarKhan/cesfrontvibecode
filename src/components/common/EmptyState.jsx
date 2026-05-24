import { clsx } from 'clsx'

export default function EmptyState({ icon: Icon, title, description, action, actionLabel, className }) {
  return (
    <tr>
      <td colSpan={100}>
        <div className={clsx('flex flex-col items-center justify-center py-16 px-6 text-center ces-font', className)}>
          {Icon && (
            <div className="w-16 h-16 rounded-[18px] bg-[var(--ces-gold-50)] grid place-items-center mb-4 border border-[var(--ces-gold-100)]">
              <Icon size={28} className="text-[var(--ces-gold-700)]" />
            </div>
          )}
          <h3 className="text-[17px] font-extrabold text-[var(--ces-ink)] tracking-tight">{title}</h3>
          {description && (
            <p className="text-[13px] text-[var(--ces-muted)] mt-1.5 max-w-[380px]">{description}</p>
          )}
          {action && actionLabel && (
            <button
              onClick={action}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--ces-gold)] hover:bg-[var(--ces-gold-700)] text-[var(--ces-on-gold)] text-sm font-semibold rounded-[10px] transition-colors"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
