import { clsx } from 'clsx'

export default function EmptyState({ icon: Icon, title, description, action, actionLabel, className }) {
  return (
    <tr>
      <td colSpan={100}>
        <div className={clsx('flex flex-col items-center justify-center py-16 text-center', className)}>
          {Icon && (
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Icon size={26} className="text-gray-400 dark:text-gray-500" />
            </div>
          )}
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</p>
          {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
          {action && actionLabel && (
            <button
              onClick={action}
              className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
