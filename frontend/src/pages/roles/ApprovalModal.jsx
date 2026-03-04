import { useState } from 'react'
import { X } from 'lucide-react'
import { usersApi } from '../../api/users'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#ec4899',
  '#6366f1', '#14b8a6', '#f43f5e', '#f59e0b',
]

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={clsx(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0',
        checked ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
      )}
    >
      <span
        className={clsx(
          'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

export default function ApprovalModal({ role, roleUsers, departments, onClose }) {
  const [state, setState] = useState(() => {
    const map = {}
    roleUsers.forEach((u) => {
      map[u.id] = {
        hasApproval: u.hasApproval || false,
        approvalDepartmentIds: u.approvalDepartments?.map((d) => d.id) || [],
      }
    })
    return map
  })
  const [loading, setLoading] = useState(false)

  const toggleApproval = (userId) => {
    setState((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        hasApproval: !prev[userId].hasApproval,
        approvalDepartmentIds: prev[userId].hasApproval ? [] : prev[userId].approvalDepartmentIds,
      },
    }))
  }

  const toggleDept = (userId, deptId) => {
    setState((prev) => {
      const ids = prev[userId].approvalDepartmentIds
      return {
        ...prev,
        [userId]: {
          ...prev[userId],
          approvalDepartmentIds: ids.includes(deptId)
            ? ids.filter((id) => id !== deptId)
            : [...ids, deptId],
        },
      }
    })
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await Promise.all(
        roleUsers.map((u) =>
          usersApi.updateApproval(u.id, {
            hasApproval: state[u.id].hasApproval,
            approvalDepartmentIds: state[u.id].approvalDepartmentIds,
          })
        )
      )
      toast.success('Approval məlumatları yadda saxlanıldı')
      onClose()
    } catch {
      toast.error('Yadda saxlama uğursuz oldu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              İcazə səviyyələrini təyin et
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="font-medium text-amber-600">{role.name}</span> — istifadəçi approvalları
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors shrink-0"
          >
            <X size={14} className="text-white" />
          </button>
        </div>

        {/* User list */}
        <div className="max-h-[440px] overflow-y-auto scrollbar-thin p-4 space-y-3">
          {roleUsers.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              Bu rola aid istifadəçi yoxdur
            </p>
          ) : (
            roleUsers.map((user) => {
              const userState = state[user.id] || { hasApproval: false, approvalDepartmentIds: [] }
              return (
                <div
                  key={user.id}
                  className="border border-gray-100 dark:border-gray-700 rounded-xl p-3.5"
                >
                  {/* User row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                        style={{ backgroundColor: AVATAR_COLORS[user.id % AVATAR_COLORS.length] }}
                      >
                        {user.fullName?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{user.fullName}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {userState.hasApproval ? 'Aktiv' : 'Deaktiv'}
                      </span>
                      <Toggle
                        checked={userState.hasApproval}
                        onChange={() => toggleApproval(user.id)}
                      />
                    </div>
                  </div>

                  {/* Department selection */}
                  {userState.hasApproval && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Approval verə biləcəyi şöbələr:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {departments.map((dept) => {
                          const checked = userState.approvalDepartmentIds.includes(dept.id)
                          return (
                            <button
                              key={dept.id}
                              type="button"
                              onClick={() => toggleDept(user.id, dept.id)}
                              className={clsx(
                                'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                                checked
                                  ? 'bg-amber-50 border-amber-400 text-amber-700 dark:bg-amber-900/30 dark:border-amber-500 dark:text-amber-400'
                                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-400'
                              )}
                            >
                              {dept.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={loading || roleUsers.length === 0}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Yadda saxla
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Ləğv et
          </button>
        </div>
      </div>
    </div>
  )
}
