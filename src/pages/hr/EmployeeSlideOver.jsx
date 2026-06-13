import { useEffect, useState } from 'react'
import { X, Pencil, UserX, Mail, Phone, MapPin, CreditCard, Calendar, Briefcase, Hash, FileText, History } from 'lucide-react'
import { hrApi } from '../../api/hr'

const STATUS_CONFIG = {
  ACTIVE:     { label: 'Aktiv',         cls: 'bg-green-100 text-green-700 border-green-200' },
  ON_LEAVE:   { label: 'Məzuniyyətdə',  cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  TERMINATED: { label: 'İşdən çıxıb',   cls: 'bg-gray-100 text-gray-500 border-gray-200' },
}

const fmt = (n) => Number(n ?? 0).toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function EmployeeSlideOver({ employee, onClose, onEdit, onTerminate }) {
  const [history, setHistory] = useState([])

  useEffect(() => {
    hrApi.getEntriesByEmployee(employee.id).then(r => setHistory(r.data?.data ?? r.data ?? [])).catch(() => {})
  }, [employee.id])

  const downloadPayslip = async (entryId) => {
    try {
      const res = await hrApi.downloadPayslip(entryId)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
    } catch { /* silent */ }
  }

  const status = STATUS_CONFIG[employee.status] || { label: employee.status, cls: 'bg-gray-100 text-gray-500' }

  return (
    <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose}>
      <div
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{employee.fullName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{employee.employeeCode || '—'} • {employee.positionName || '—'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${status.cls}`}>{status.label}</span>
            {onEdit && (
              <button onClick={onEdit} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg">
                <Pencil size={12} /> Redaktə et
              </button>
            )}
            {employee.status !== 'TERMINATED' && onTerminate && (
              <button onClick={onTerminate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 rounded-lg border border-red-200">
                <UserX size={12} /> İşdən çıxar
              </button>
            )}
          </div>

          <Section title="Şəxsi məlumat">
            <Row icon={Hash} label="FİN" value={employee.fin} />
            <Row icon={Calendar} label="Doğum tarixi" value={employee.birthDate} />
            <Row label="Cins" value={employee.gender === 'MALE' ? 'Kişi' : employee.gender === 'FEMALE' ? 'Qadın' : null} />
          </Section>

          <Section title="İş məlumatı">
            <Row icon={Briefcase} label="Vəzifə" value={employee.positionName} />
            <Row label="Şöbə" value={employee.departmentName} />
            <Row label="Əməkhaqqı (Gross)" value={fmt(employee.grossSalary) + ' ₼'} highlight />
            <Row icon={Calendar} label="İşə qəbul" value={employee.hireDate} />
            {employee.terminationDate && <Row label="İşdən çıxma" value={employee.terminationDate} />}
            {employee.terminationReason && <Row label="Səbəb" value={employee.terminationReason} />}
            <Row label="İllik məzuniyyət limiti" value={(employee.annualLeaveDays ?? 21) + ' gün'} />
          </Section>

          <Section title="Əlaqə">
            <Row icon={Phone} label="Telefon" value={employee.phone} />
            <Row icon={Mail} label="Email" value={employee.email} />
            <Row icon={MapPin} label="Ünvan" value={employee.address} />
          </Section>

          {(employee.bankName || employee.bankAccount) && (
            <Section title="Bank">
              <Row icon={CreditCard} label="Bank" value={employee.bankName} />
              <Row label="Hesab" value={employee.bankAccount} mono />
            </Section>
          )}

          {employee.notes && (
            <Section title="Qeyd">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{employee.notes}</p>
            </Section>
          )}

          <Section title="Əməkhaqqı tarixçəsi" icon={History}>
            {history.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Hələ ki, qeyd yoxdur</p>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 12).map(h => (
                  <button
                    key={h.id}
                    onClick={() => downloadPayslip(h.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-gray-200 dark:border-gray-700 text-left transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                        Gross: {fmt(h.grossTotal)} ₼
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Net: {fmt(h.netPay)} ₼ — {h.actualDaysWorked}/{h.workingDaysInMonth} gün
                      </p>
                    </div>
                    <FileText size={14} className="text-amber-600" />
                  </button>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children, icon: Icon }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        {Icon && <Icon size={12} />}
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Row({ icon: Icon, label, value, highlight, mono }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon size={14} className="text-gray-400 mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-400">{label}</p>
        <p className={`text-sm break-words ${highlight ? 'font-semibold text-gray-800 dark:text-gray-100' : 'text-gray-700 dark:text-gray-200'} ${mono ? 'font-mono text-xs' : ''}`}>
          {value}
        </p>
      </div>
    </div>
  )
}
