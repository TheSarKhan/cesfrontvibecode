import { Trash2, Pencil } from 'lucide-react'
import { clsx } from 'clsx'

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-emerald-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-rose-500',
]

function UserAvatar({ user }) {
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
  const color = AVATAR_COLORS[user.id % AVATAR_COLORS.length]
  return (
    <div
      className={clsx(
        color,
        'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ring-2 ring-white'
      )}
    >
      {initials}
    </div>
  )
}

export default function DepartmentCard({ dept, users, onSelect, onEdit, onDelete }) {
  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:shadow-md hover:border-amber-300 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-800 text-base">{dept.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {users.length > 0 ? `${users.length} istifadəçi` : 'İstifadəçi yoxdur'}
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-amber-600 transition-colors"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {users.length > 0 ? (
        <div className="flex -space-x-2">
          {users.slice(0, 4).map((u) => (
            <UserAvatar key={u.id} user={u} />
          ))}
          {users.length > 4 && (
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500 font-semibold ring-2 ring-white">
              +{users.length - 4}
            </div>
          )}
        </div>
      ) : (
        <div className="h-8" />
      )}
    </div>
  )
}
