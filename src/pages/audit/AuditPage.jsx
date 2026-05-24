import DateInput from '../../components/common/DateInput'
import { useState, useEffect, useCallback, useRef } from 'react'
import { auditApi } from '../../api/audit'
import { useSearchParams } from 'react-router-dom'
import {
  History, Search, RefreshCw, Eye,
  PlusCircle, Edit3, Trash2, RotateCcw, X,
  CheckCircle2, XCircle, LogIn, LogOut,
  AlertTriangle, ShieldOff, KeyRound, FileWarning,
  Send, Upload, Truck, Wrench, Calendar,
  Globe, Server, FileSearch,
} from 'lucide-react'
import Pagination from '../../components/common/Pagination'
import { clsx } from 'clsx'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'
import { fmtDateTime, timeAgo } from '../../utils/date'

const ENTITY_TYPES = [
  'API',
  'MÜŞTƏRİ', 'MÜŞTƏRİ_SƏNƏD', 'PODRATÇI', 'İNVESTOR', 'OPERATOR',
  'TEXNİKA', 'TEXNİKA_BAXIŞ', 'TEXNİKİ_SERVİS',
  'SORĞU', 'KOORDİNATOR_PLAN', 'KOORDİNATOR_SƏNƏD',
  'LAYİHƏ', 'LAYİHƏ_XƏRC', 'LAYİHƏ_GƏLİR', 'LAYİHƏ_ÖDƏNİŞ',
  'FAKTURA', 'ALACAQ', 'ALACAQ_ÖDƏNİŞ', 'BORC', 'BORC_ÖDƏNİŞ',
  'İSTİFADƏÇİ', 'ŞÖBƏ', 'ROL', 'SİSTEM', 'TƏSDİQ',
  'HR_DAVAMİYYƏT', 'HR_MƏZUNİYYƏT',
]

const ACTIONS = [
  'API BAXIŞ', 'API YARATMA', 'API REDAKTƏ', 'API SİLMƏ', 'API ÇAĞIRIŞ',
  'API XƏTASI', 'API İCAZƏ RƏDD', 'API TAPILMADI', 'API VALIDASIYA XƏTASI',
  'YARADILDI', 'YENİLƏNDİ', 'SİLİNDİ', 'BƏRPA EDİLDİ',
  'GİRİŞ ETDİ', 'ÇIXIŞ ETDİ', 'GİRİŞ UĞURSUZ',
  'TƏSDİQLƏNDİ', 'RƏDD EDİLDİ', 'LƏĞV EDİLDİ',
  'SİSTEM XƏTASI', 'DB MƏHDUDİYYƏTİ POZULDU', 'FAYL XƏTASI',
  'İCAZƏ RƏDD EDİLDİ', 'İCAZƏSİZ ƏMƏLİYYAT',
  'OTP GÖNDƏRİLDİ', 'OTP UĞURSUZ', 'ŞİFRƏ BƏRPASI UĞURSUZ', 'TOKEN REFRESH UĞURSUZ',
  'TƏKLİF GÖNDƏRİLDİ', 'TƏKLİF QƏBUL EDİLDİ', 'TƏKLİF RƏDD EDİLDİ',
  'TEXNİKA SEÇİLDİ', 'KOORDİNATORA GÖNDƏRİLDİ',
  'YÜKLƏNDİ', 'SƏNƏD YÜKLƏNDİ', 'TAMAMLANDI',
  'QEYDƏ_ALINDI', 'TƏLƏB_EDİLDİ', 'TƏSDİQLƏNDİ', 'RƏDD_EDİLDİ',
  'ÖDƏNIŞ', 'ÖDƏNIŞ BAĞLANDI',
]

const ACTION_CONFIG = {
  YARADILDI:                  { icon: PlusCircle,    pill: 'ces-p-ok' },
  YENİLƏNDİ:                  { icon: Edit3,         pill: 'ces-p-info' },
  SİLİNDİ:                    { icon: Trash2,        pill: 'ces-p-danger' },
  'BƏRPA EDİLDİ':             { icon: RotateCcw,     pill: 'ces-p-warn' },

  'GİRİŞ ETDİ':               { icon: LogIn,         pill: 'ces-p-gold' },
  'ÇIXIŞ ETDİ':               { icon: LogOut,        pill: 'ces-p-mute' },
  'GİRİŞ UĞURSUZ':            { icon: ShieldOff,     pill: 'ces-p-danger' },

  TƏSDİQLƏNDİ:                { icon: CheckCircle2,  pill: 'ces-p-ok' },
  'RƏDD EDİLDİ':              { icon: XCircle,       pill: 'ces-p-danger' },
  'LƏĞV EDİLDİ':              { icon: XCircle,       pill: 'ces-p-mute' },

  'SİSTEM XƏTASI':            { icon: AlertTriangle, pill: 'ces-p-danger' },
  'DB MƏHDUDİYYƏTİ POZULDU':  { icon: FileWarning,   pill: 'ces-p-danger' },
  'FAYL XƏTASI':              { icon: FileWarning,   pill: 'ces-p-danger' },
  'İCAZƏ RƏDD EDİLDİ':        { icon: ShieldOff,     pill: 'ces-p-warn' },
  'İCAZƏSİZ ƏMƏLİYYAT':       { icon: ShieldOff,     pill: 'ces-p-warn' },

  'OTP GÖNDƏRİLDİ':           { icon: KeyRound,      pill: 'ces-p-gold' },
  'OTP UĞURSUZ':              { icon: KeyRound,      pill: 'ces-p-danger' },
  'ŞİFRƏ BƏRPASI UĞURSUZ':    { icon: KeyRound,      pill: 'ces-p-danger' },
  'TOKEN REFRESH UĞURSUZ':    { icon: KeyRound,      pill: 'ces-p-danger' },

  'TƏKLİF GÖNDƏRİLDİ':        { icon: Send,          pill: 'ces-p-gold' },
  'TƏKLİF QƏBUL EDİLDİ':      { icon: CheckCircle2,  pill: 'ces-p-ok' },
  'TƏKLİF RƏDD EDİLDİ':       { icon: XCircle,       pill: 'ces-p-danger' },
  'KOORDİNATORA GÖNDƏRİLDİ':  { icon: Send,          pill: 'ces-p-info' },
  'TEXNİKA SEÇİLDİ':          { icon: Truck,         pill: 'ces-p-info' },

  YÜKLƏNDİ:                   { icon: Upload,        pill: 'ces-p-info' },
  'SƏNƏD YÜKLƏNDİ':           { icon: Upload,        pill: 'ces-p-info' },
  TAMAMLANDI:                 { icon: Wrench,        pill: 'ces-p-ok' },

  QEYDƏ_ALINDI:               { icon: Calendar,      pill: 'ces-p-info' },
  TƏLƏB_EDİLDİ:               { icon: PlusCircle,    pill: 'ces-p-gold' },
  RƏDD_EDİLDİ:                { icon: XCircle,       pill: 'ces-p-danger' },

  ÖDƏNIŞ:                     { icon: PlusCircle,    pill: 'ces-p-ok' },
  'ÖDƏNIŞ BAĞLANDI':          { icon: CheckCircle2,  pill: 'ces-p-info' },

  'API BAXIŞ':                { icon: FileSearch,    pill: 'ces-p-mute' },
  'API YARATMA':              { icon: PlusCircle,    pill: 'ces-p-info' },
  'API REDAKTƏ':              { icon: Edit3,         pill: 'ces-p-info' },
  'API SİLMƏ':                { icon: Trash2,        pill: 'ces-p-warn' },
  'API ÇAĞIRIŞ':              { icon: Globe,         pill: 'ces-p-mute' },
  'API XƏTASI':               { icon: Server,        pill: 'ces-p-danger' },
  'API İCAZƏ RƏDD':           { icon: ShieldOff,     pill: 'ces-p-warn' },
  'API TAPILMADI':            { icon: Globe,         pill: 'ces-p-mute' },
  'API VALIDASIYA XƏTASI':    { icon: FileWarning,   pill: 'ces-p-warn' },
}

export default function AuditPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchRef = useRef(null)

  const q          = searchParams.get('q') || ''
  const entityType = searchParams.get('entityType') || ''
  const action     = searchParams.get('action') || ''
  const from       = searchParams.get('from') || ''
  const to         = searchParams.get('to') || ''
  const page       = parseInt(searchParams.get('page') || '0', 10)
  const pageSize   = parseInt(searchParams.get('size') || '50', 10)

  const setParam = (key, val) => setSearchParams(prev => {
    const n = new URLSearchParams(prev)
    val ? n.set(key, val) : n.delete(key)
    if (key !== 'page') n.delete('page')
    return n
  }, { replace: true })

  const [logs, setLogs] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [detailLog, setDetailLog] = useState(null)

  usePageShortcuts({ searchRef })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await auditApi.getAll({
        q: q || undefined,
        entityType: entityType || undefined,
        action: action || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        size: pageSize,
      })
      const data = res.data?.data || res.data
      setLogs(data?.content || [])
      setTotalElements(data?.totalElements || 0)
      setTotalPages(data?.totalPages || 0)
    } catch (err) {
      setLogs([])
      setError(err?.response?.status === 403 ? 'Bu bölməyə baxmaq üçün icazəniz yoxdur' : 'Məlumatlar yüklənmədi')
    } finally {
      setLoading(false)
    }
  }, [q, entityType, action, from, to, page, pageSize])

  useEffect(() => { load() }, [load])

  const hasFilters = q || entityType || action || from || to
  const clearFilters = () => setSearchParams({}, { replace: true })

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-7 gap-4 flex-wrap">
        <div>
          <h1 className="ces-page-title flex items-center gap-3">
            <span className="ces-m-ic gold" style={{ width: 38, height: 38, borderRadius: 11 }}>
              <History size={20} />
            </span>
            Audit jurnalı
          </h1>
          <p className="ces-page-sub">
            {totalElements > 0 ? `${totalElements} qeyd tapıldı` : 'Bütün sistem əməliyyatlarının tarixçəsi'}
          </p>
        </div>
        <button onClick={load} className="ces-btn ces-btn-outline">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Yenilə
        </button>
      </div>

      {/* Filters card */}
      <div
        className="mb-5"
        style={{
          background: 'var(--ces-surface)',
          border: '1px solid var(--ces-line)',
          borderRadius: 'var(--ces-radius-lg)',
          padding: 18,
          boxShadow: 'var(--ces-shadow-sm)',
        }}
      >
        <div className="flex flex-wrap gap-3 items-center">
          <div className="ces-input has-icon sm flex-1" style={{ minWidth: 240 }}>
            <Search size={15} />
            <input
              ref={searchRef}
              value={q}
              onChange={e => setParam('q', e.target.value)}
              placeholder="Ad, istifadəçi axtar..."
            />
          </div>

          <select
            value={entityType}
            onChange={e => setParam('entityType', e.target.value)}
            className="ces-select sm"
            style={{ minWidth: 170 }}
          >
            <option value="">Bütün növlər</option>
            {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            value={action}
            onChange={e => setParam('action', e.target.value)}
            className="ces-select sm"
            style={{ minWidth: 200 }}
          >
            <option value="">Bütün əməliyyatlar</option>
            {[...new Set(ACTIONS)].map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <div className="ces-input sm" style={{ minWidth: 150 }}>
            <DateInput
              value={from}
              onChange={e => setParam('from', e.target.value)}
              className="w-full border-0 outline-0 bg-transparent text-sm"
              placeholder="Başlanğıc"
            />
          </div>

          <div className="ces-input sm" style={{ minWidth: 150 }}>
            <DateInput
              value={to}
              onChange={e => setParam('to', e.target.value)}
              className="w-full border-0 outline-0 bg-transparent text-sm"
              placeholder="Son"
            />
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="ces-btn ces-btn-ghost ces-btn-sm" style={{ color: 'var(--ces-danger)' }}>
              <X size={14} /> Sıfırla
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="ces-table-wrap">
        <div className="overflow-x-auto">
          <table className="ces-tbl" style={{ minWidth: 1000 }}>
            <thead>
              <tr>
                <th style={{ width: 170 }}>Vaxt</th>
                <th style={{ width: 160 }}>Əməliyyat</th>
                <th style={{ width: 130 }}>Növ</th>
                <th>Element</th>
                <th style={{ width: 160 }}>İstifadəçi</th>
                <th className="r" style={{ width: 100 }}>Detal</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={6} rows={10} />
              ) : error ? (
                <tr>
                  <td colSpan={6} className="text-center" style={{ padding: '48px 16px' }}>
                    <span className="ces-pill ces-p-danger">
                      <span className="d"></span>{error}
                    </span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="Qeyd tapılmadı"
                  description={hasFilters ? 'Axtarış şərtlərini dəyişin' : 'Hələ heç bir əməliyyat qeydə alınmayıb'}
                />
              ) : (
                logs.map(log => {
                  const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG['YENİLƏNDİ']
                  const Icon = cfg.icon
                  return (
                    <tr key={log.id}>
                      <td>
                        <div className="mono" style={{ fontSize: 12.5, color: 'var(--ces-ink)' }}>
                          {fmtDateTime(log.performedAt)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ces-muted)', marginTop: 2 }}>
                          {timeAgo(log.performedAt)}
                        </div>
                      </td>

                      <td>
                        <span className={clsx('ces-pill sm', cfg.pill)}>
                          <Icon size={11} />
                          {log.action}
                        </span>
                      </td>

                      <td>
                        <span className="ces-pill ces-p-mute sm">{log.entityType}</span>
                      </td>

                      <td>
                        <div className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ces-ink)', maxWidth: 220 }} title={log.entityLabel}>
                          {log.entityLabel || '—'}
                        </div>
                        {log.entityId && (
                          <div className="mono" style={{ fontSize: 11, color: 'var(--ces-muted)' }}>ID: {log.entityId}</div>
                        )}
                      </td>

                      <td>
                        <div className="truncate" style={{ fontSize: 13, color: 'var(--ces-ink)', maxWidth: 160 }} title={log.performedBy}>
                          {log.performedBy || '—'}
                        </div>
                      </td>

                      <td className="r">
                        <button
                          onClick={() => setDetailLog(log)}
                          className="ces-btn ces-btn-outline ces-btn-xs"
                          title="Tam detalları gör"
                        >
                          <Eye size={13} />
                          Bax
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page + 1}
          pageSize={pageSize}
          totalPages={totalPages}
          totalElements={totalElements}
          onPage={(p) => setParam('page', String(p - 1))}
          onPageSize={(s) => setSearchParams(prev => {
            const n = new URLSearchParams(prev)
            n.set('size', s)
            n.delete('page')
            return n
          }, { replace: true })}
        />
      </div>

      {detailLog && <AuditDetailModal log={detailLog} onClose={() => setDetailLog(null)} />}
    </div>
  )
}

function AuditDetailModal({ log, onClose }) {
  const cfg = ACTION_CONFIG[log.action] || { icon: History, pill: 'ces-p-mute' }
  const Icon = cfg.icon
  const isError = (log.action || '').includes('XƏTASI') ||
                  (log.action || '').includes('UĞURSUZ') ||
                  (log.action || '').includes('RƏDD') ||
                  (log.action || '').includes('POZULDU')

  const rows = [
    { label: 'Vaxt',       value: log.performedAt ? new Date(log.performedAt).toLocaleString('az-AZ') : '—', mono: true },
    { label: 'İstifadəçi', value: log.performedBy || '—' },
    { label: 'Növ',        value: log.entityType || '—' },
    { label: 'Element',    value: log.entityLabel || '—' },
    { label: 'Element ID', value: log.entityId != null ? String(log.entityId) : '—', mono: true },
  ]

  return (
    <div className="ces-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ces-modal" style={{ maxWidth: 640 }}>
        <div className="ces-m-head">
          <div className={clsx('ces-m-ic', isError ? 'danger' : 'gold')}>
            <Icon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="flex items-center gap-2 flex-wrap">
              <span className={clsx('ces-pill sm', cfg.pill)}>
                <Icon size={11} />
                {log.action}
              </span>
            </h3>
            <p className="truncate" title={log.entityLabel}>{log.entityLabel || '—'}</p>
          </div>
          <button onClick={onClose} className="ces-modal-x" type="button" aria-label="Bağla">
            <X size={16} />
          </button>
        </div>

        <div className="ces-m-body">
          <div
            style={{
              border: '1px solid var(--ces-line)',
              borderRadius: 12,
              overflow: 'hidden',
              marginBottom: 16,
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.label} style={i < rows.length - 1 ? { borderBottom: '1px solid var(--ces-line-2)' } : undefined}>
                    <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--ces-muted)', fontWeight: 600, width: '32%' }}>
                      {r.label}
                    </td>
                    <td
                      className={r.mono ? 'mono' : undefined}
                      style={{ padding: '10px 14px', fontSize: 13.5, color: 'var(--ces-ink)', wordBreak: 'break-word' }}
                    >
                      {r.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="ces-sec-label" style={{ marginBottom: 10 }}>
            {isError ? 'Tam xəta mesajı' : 'Tam qeyd'}
          </p>
          <pre
            className={isError ? 'mono' : undefined}
            style={{
              margin: 0,
              padding: 16,
              background: isError ? 'var(--ces-danger-100)' : 'var(--ces-graphite-50)',
              border: '1px solid ' + (isError ? 'rgba(212,56,90,.25)' : 'var(--ces-line)'),
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.55,
              color: isError ? 'var(--ces-danger)' : 'var(--ces-ink)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: isError ? "'JetBrains Mono', monospace" : 'inherit',
              maxHeight: 360,
              overflow: 'auto',
            }}
          >
            {log.summary || '—'}
          </pre>
        </div>

        <div className="ces-m-foot">
          <button onClick={onClose} className="ces-btn ces-btn-primary">
            Bağla
          </button>
        </div>
      </div>
    </div>
  )
}
