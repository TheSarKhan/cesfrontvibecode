import { Trash2, Pencil, Users, Shield } from 'lucide-react'
import { clsx } from 'clsx'

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-emerald-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-rose-500',
]

function UserAvatar({ user }) {
  const name = user.fullName || ''
  const parts = name.trim().split(/\s+/)
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : (name[0] || '?').toUpperCase()
  const color = AVATAR_COLORS[user.id % AVATAR_COLORS.length]
  return (
    <div
      className={clsx(color, 'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ring-2 ring-white dark:ring-gray-800')}
      title={name}
    >
      {initials}
    </div>
  )
}

export default function DepartmentCard({ dept, users, roleCount, onSelect, onEdit, onDelete }) {
  return (
    <div
      onClick={onSelect}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 cursor-pointer hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-base">{dept.name}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Users size={11} />
              {users.length} istifadəçi
            </span>
            {roleCount != null && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Shield size={11} />
                {roleCount} rol
              </span>
            )}
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit() }}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
              >
                <Pencil size={15} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      {users.length > 0 ? (
        <div className="flex -space-x-2">
          {users.slice(0, 4).map((u) => (
            <UserAvatar key={u.id} user={u} />
          ))}
          {users.length > 4 && (
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 font-semibold ring-2 ring-white dark:ring-gray-800">
              +{users.length - 4}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-300 dark:text-gray-600 italic">İstifadəçi yoxdur</p>
      )}
    </div>
  )
}
