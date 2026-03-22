import { useState, useEffect } from 'react'
import { auditApi } from '../../api/audit'
import { Clock, RefreshCw, PlusCircle, Edit3, Trash2, RotateCcw } from 'lucide-react'
import { clsx } from 'clsx'

const ACTION_CONFIG = {
  'YARADILDI': { icon: PlusCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  'YENİLƏNDİ': { icon: Edit3, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  'SİLİNDİ': { icon: Trash2, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  'BƏRPA EDİLDİ': { icon: RotateCcw, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'İndicə'
  if (mins < 60) return `${mins} dəq əvvəl`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} saat əvvəl`
  const days = Math.floor(hrs / 24)
  return `${days} gün əvvəl`
}

export default function ActivityFeed({ entityType, entityId, className }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const call = entityType && entityId
      ? auditApi.getForEntity(entityType, entityId)
      : auditApi.getRecent()
    call
      .then(r => setLogs(r.data?.data || r.data || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [entityType, entityId])

  if (loading) return (
    <div className={clsx('flex items-center justify-center py-8 gap-2 text-gray-400', className)}>
      <RefreshCw size={14} className="animate-spin" />
      <span className="text-xs">Yüklənir...</span>
    </div>
  )

  if (logs.length === 0) return (
    <div className={clsx('flex flex-col items-center justify-center py-8 text-gray-400', className)}>
      <Clock size={24} className="mb-2 opacity-40" />
      <p className="text-xs">Tarixçə yoxdur</p>
    </div>
  )

  return (
    <div className={clsx('space-y-1', className)}>
      {logs.map(log => {
        const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG['YENİLƏNDİ']
        const Icon = cfg.icon
        return (
          <div key={log.id} className="flex items-start gap-3 py-2 px-1">
            <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5', cfg.bg)}>
              <Icon size={13} className={cfg.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-700 dark:text-gray-300">
                <span className="font-semibold">{log.entityLabel}</span>
                {' '}
                <span className={clsx('font-medium', cfg.color)}>{log.action.toLowerCase()}</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {log.performedBy} · {timeAgo(log.performedAt)}
              </p>
              {log.summary && <p className="text-[10px] text-gray-400">{log.summary}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
