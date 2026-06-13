import { useEffect, useState } from 'react'
import {
  X, Pencil, UserX, Mail, Phone, MapPin, CreditCard,
  Calendar, Briefcase, Hash, FileText, History,
} from 'lucide-react'
import { hrApi } from '../../api/hr'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { Pill, Avatar } from './_shared'
import { fmt, EMPLOYEE_STATUS } from './_constants'

export default function EmployeeSlideOver({ employee, onClose, onEdit, onTerminate }) {
  useEscapeKey(onClose)
  const [history, setHistory] = useState([])

  useEffect(() => {
    let cancelled = false
    hrApi.getEntriesByEmployee(employee.id)
      .then(r => { if (!cancelled) setHistory(r.data?.data ?? r.data ?? []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [employee.id])

  const downloadPayslip = async (entryId) => {
    try {
      const res = await hrApi.downloadPayslip(entryId)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
    } catch { /* silent */ }
  }

  const status = EMPLOYEE_STATUS[employee.status] || { label: employee.status, tone: 'muted' }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(26,26,26,.4)', backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[480px] flex flex-col"
        style={{ background: 'var(--ces-surface)', boxShadow: 'var(--ces-shadow-lg)' }}
      >
        {/* Header */}
        <div
          className="flex items-start gap-3 px-6 py-5 shrink-0"
          style={{ borderBottom: '1px solid var(--ces-line)' }}
        >
          <Avatar name={employee.fullName} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] mb-1" style={{ color: 'var(--ces-gold)' }}>
              İşçi
            </p>
            <h2 className="text-[18px] font-extrabold leading-tight truncate" style={{ color: 'var(--ces-ink)' }}>
              {employee.fullName}
            </h2>
            <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--ces-muted)' }}>
              {employee.positionName || '—'}
              {employee.employeeCode && <> · <span className="font-mono">{employee.employeeCode}</span></>}
            </p>
            <div className="mt-2"><Pill tone={status.tone} sm dot>{status.label}</Pill></div>
          </div>
          <button
            onClick={onClose}
            className="ces-row-act flex-none"
            title="Bağla"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action bar */}
        <div
          className="flex items-center gap-2 px-6 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--ces-line)', background: 'var(--ces-graphite-50)' }}
        >
          {onEdit && (
            <button onClick={onEdit} className="ces-btn ces-btn-primary ces-btn-sm">
              <Pencil size={13} /> Redaktə et
            </button>
          )}
          {employee.status !== 'TERMINATED' && onTerminate && (
            <button onClick={onTerminate} className="ces-btn ces-btn-sm" style={{ background: '#fdeaef', color: 'var(--ces-danger)', border: '1px solid rgba(212,56,90,.2)' }}>
              <UserX size={13} /> İşdən çıxar
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-6 space-y-6">

            <Section title="Şəxsi məlumat">
              <Row icon={Hash}     label="FİN"           value={employee.fin}        mono />
              <Row icon={Calendar} label="Doğum tarixi"  value={employee.birthDate}  mono />
              <Row label="Cins" value={employee.gender === 'MALE' ? 'Kişi' : employee.gender === 'FEMALE' ? 'Qadın' : null} />
            </Section>

            <Section title="İş məlumatı">
              <Row icon={Briefcase} label="Vəzifə" value={employee.positionName} />
              <Row label="Şöbə" value={employee.departmentName} />
              <Row label="Əməkhaqqı (Gross)" value={`${fmt(employee.grossSalary)} ₼`} highlight />
              <Row icon={Calendar} label="İşə qəbul" value={employee.hireDate} mono />
              {employee.terminationDate && <Row label="İşdən çıxma" value={employee.terminationDate} mono />}
              {employee.terminationReason && <Row label="Səbəb" value={employee.terminationReason} />}
              <Row label="İllik məzuniyyət limiti" value={`${employee.annualLeaveDays ?? 21} gün`} />
            </Section>

            <Section title="Əlaqə">
              <Row icon={Phone}  label="Telefon" value={employee.phone} />
              <Row icon={Mail}   label="Email"   value={employee.email} />
              <Row icon={MapPin} label="Ünvan"   value={employee.address} />
            </Section>

            {(employee.bankName || employee.bankAccount) && (
              <Section title="Bank">
                <Row icon={CreditCard} label="Bank"  value={employee.bankName} />
                <Row label="Hesab" value={employee.bankAccount} mono />
              </Section>
            )}

            {employee.notes && (
              <Section title="Qeyd">
                <p className="text-[13px] whitespace-pre-wrap" style={{ color: 'var(--ces-ink)' }}>{employee.notes}</p>
              </Section>
            )}

            <Section title="Əməkhaqqı tarixçəsi" icon={History}>
              {history.length === 0 ? (
                <p className="text-[12px] italic" style={{ color: 'var(--ces-mute2)' }}>Hələ ki, qeyd yoxdur</p>
              ) : (
                <div className="space-y-2">
                  {history.slice(0, 12).map((h) => (
                    <button
                      key={h.id}
                      onClick={() => downloadPayslip(h.id)}
                      className="w-full flex items-center justify-between p-3 transition-colors text-left"
                      style={{
                        borderRadius: '10px',
                        background: 'var(--ces-graphite-50)',
                        border: '1px solid var(--ces-line)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ces-gold-50)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--ces-graphite-50)')}
                    >
                      <div>
                        <p className="text-[13px] font-bold" style={{ color: 'var(--ces-ink)' }}>
                          Gross: <span className="num">{fmt(h.grossTotal)} ₼</span>
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--ces-muted)' }}>
                          Net: <span className="num font-semibold" style={{ color: 'var(--ces-ok)' }}>{fmt(h.netPay)} ₼</span>
                          {' · '}
                          {h.actualDaysWorked}/{h.workingDaysInMonth} gün
                        </p>
                      </div>
                      <FileText size={14} style={{ color: 'var(--ces-gold)' }} />
                    </button>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>
      </div>
    </>
  )
}

function Section({ title, children, icon: Icon }) {
  return (
    <div>
      <h3 className="text-[10.5px] font-bold uppercase tracking-[.16em] mb-3 flex items-center gap-1.5" style={{ color: 'var(--ces-muted)' }}>
        {Icon && <Icon size={12} />}
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ icon: Icon, label, value, highlight, mono }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5">
      {Icon && <Icon size={14} style={{ color: 'var(--ces-mute2)' }} className="mt-0.5 flex-none" />}
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] font-bold uppercase tracking-[.12em]" style={{ color: 'var(--ces-muted)' }}>{label}</p>
        <p
          className={`text-[13.5px] break-words mt-0.5 ${mono ? 'font-mono text-[12.5px]' : ''}`}
          style={{
            color: highlight ? 'var(--ces-graphite-900)' : 'var(--ces-ink)',
            fontWeight: highlight ? 800 : 500,
          }}
        >
          {value}
        </p>
      </div>
    </div>
  )
}
