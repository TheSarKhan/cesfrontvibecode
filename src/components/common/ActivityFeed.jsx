import { useState, useEffect } from 'react'
import axiosInstance from '../../api/axios'
import { Clock, RefreshCw, PlusCircle, Edit3, Trash2, RotateCcw, LogIn, LogOut, CheckCircle, XCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { timeAgo } from '../../utils/date'

const ACTION_CONFIG = {
  'YARADILDI':    { icon: PlusCircle,  textCls: 'text-[var(--ces-ok)]',       bgCls: 'bg-[var(--ces-ok-100)]',       borderCls: 'border-[var(--ces-ok)]' },
  'YENİLƏNDİ':   { icon: Edit3,       textCls: 'text-[var(--ces-info)]',     bgCls: 'bg-[var(--ces-info-100)]',     borderCls: 'border-[var(--ces-info)]' },
  'SİLİNDİ':     { icon: Trash2,      textCls: 'text-[var(--ces-danger)]',   bgCls: 'bg-[var(--ces-danger-100)]',   borderCls: 'border-[var(--ces-danger)]' },
  'BƏRPA EDİLDİ':{ icon: RotateCcw,   textCls: 'text-[var(--ces-gold-700)]', bgCls: 'bg-[var(--ces-gold-100)]',     borderCls: 'border-[var(--ces-gold)]' },
  'GİRİŞ ETDİ':  { icon: LogIn,       textCls: 'text-[var(--ces-info)]',     bgCls: 'bg-[var(--ces-info-100)]',     borderCls: 'border-[var(--ces-info)]' },
  'ÇIXIŞ ETDİ':  { icon: LogOut,      textCls: 'text-[var(--ces-muted)]',    bgCls: 'bg-[var(--ces-graphite-100)]', borderCls: 'border-[var(--ces-muted)]' },
  'TƏSDİQLƏNDİ': { icon: CheckCircle, textCls: 'text-[var(--ces-ok)]',       bgCls: 'bg-[var(--ces-ok-100)]',       borderCls: 'border-[var(--ces-ok)]' },
  'RƏDD EDİLDİ': { icon: XCircle,     textCls: 'text-[var(--ces-warn)]',     bgCls: 'bg-[var(--ces-warn-100)]',     borderCls: 'border-[var(--ces-warn)]' },
}

export default function ActivityFeed({ entityType, entityId, className }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const url = entityType && entityId
      ? `/audit/${entityType}/${entityId}`
      : '/audit/recent'
    axiosInstance.get(url, { _suppressToast: true })
      .then(r => setLogs(r.data?.data || r.data || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [entityType, entityId])

  if (loading) return (
    <div className={clsx('flex items-center justify-center py-10 gap-2 text-[var(--ces-muted)] ces-font', className)}>
      <RefreshCw size={14} className="animate-spin text-[var(--ces-gold)]" />
      <span className="text-[13px] font-semibold">Yüklənir...</span>
    </div>
  )

  if (logs.length === 0) return (
    <div className={clsx('flex flex-col items-center justify-center py-12 ces-font', className)}>
      <div className="w-14 h-14 rounded-[16px] bg-[var(--ces-graphite-50)] grid place-items-center mb-3">
        <Clock size={22} className="text-[var(--ces-mute2)]" />
      </div>
      <p className="text-[13px] font-semibold text-[var(--ces-muted)]">Tarixçə yoxdur</p>
    </div>
  )

  return (
    <div className={clsx('ces-font', className)}>
      <ul className="relative">
        {logs.map((log, idx) => {
          const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG['YENİLƏNDİ']
          const Icon = cfg.icon
          const isLast = idx === logs.length - 1
          return (
            <li key={log.id} className="relative pl-10 pb-5 last:pb-0">
              {/* Vertical connector line */}
              {!isLast && (
                <span
                  className="absolute left-[14px] top-7 bottom-0 w-px bg-[var(--ces-line)]"
                  aria-hidden
                />
              )}
              {/* Dot icon */}
              <div className={clsx(
                'absolute left-0 top-0 w-7 h-7 rounded-full grid place-items-center border-2 bg-[var(--ces-surface)]',
                cfg.borderCls
              )}>
                <Icon size={12} className={cfg.textCls} />
              </div>
              {/* Body */}
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13px] text-[var(--ces-ink)]">
                    <span className="font-bold">{log.entityLabel}</span>
                    {' '}
                    <span className={clsx('font-semibold', cfg.textCls)}>{log.action.toLowerCase()}</span>
                  </p>
                  <span className="text-[10.5px] text-[var(--ces-mute2)] font-medium whitespace-nowrap shrink-0">
                    {timeAgo(log.performedAt)}
                  </span>
                </div>
                <p className="text-[11.5px] text-[var(--ces-muted)] mt-0.5">
                  {log.performedBy}
                </p>
                {log.summary && (
                  <p className="text-[11.5px] text-[var(--ces-muted)] mt-1 leading-relaxed">{log.summary}</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
