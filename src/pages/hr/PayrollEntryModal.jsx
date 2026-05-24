import { useEffect, useMemo, useState } from 'react'
import { Calculator } from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { Field, Input, Textarea, ModalShell, Avatar } from './_shared'
import { fmt } from './_constants'

/* ─── Calculation helpers ─── */
function round2(n) { return Math.round(n * 100) / 100 }

function bracketedRaw(amount, threshold, rateBelow, rateAbove) {
  if (!amount || amount <= 0) return 0
  const t  = Number(threshold ?? 0)
  const rb = Number(rateBelow ?? 0)
  const ra = Number(rateAbove ?? 0)
  if (amount <= t) return amount * rb
  return t * rb + (amount - t) * ra
}

// Azərbaycan 2026 progressiv gəlir vergisi
function progressiveIncomeTaxRaw(taxBase) {
  if (!taxBase || taxBase <= 0) return 0
  if (taxBase <= 200)  return 0
  if (taxBase <= 2500) return (taxBase - 200) * 0.03
  if (taxBase <= 8000) return 75 + (taxBase - 2500) * 0.10
  return 625 + (taxBase - 8000) * 0.14
}

function calcPreview(form, cfg, workingDaysInMonth) {
  if (!cfg) return null
  const baseSalary  = Number(form.baseSalary)    || 0
  const workingDays = workingDaysInMonth > 0 ? workingDaysInMonth : 22
  const actualDays  = Number(form.actualDaysWorked) || workingDays
  const overtimePay = Number(form.overtimePay)   || 0
  const bonus       = Number(form.bonus)         || 0
  const vacation    = Number(form.vacationPay)   || 0
  const penalty     = Number(form.penalty)       || 0

  const proRated = actualDays === workingDays
    ? baseSalary
    : round2(baseSalary * actualDays / workingDays)

  let gross = round2(proRated + overtimePay + bonus + vacation - penalty)
  if (gross < 0) gross = 0

  const pensionRaw      = bracketedRaw(gross, cfg.employeePensionThreshold, cfg.employeePensionRateBelow, cfg.employeePensionRateAbove)
  const unemploymentRaw = gross * Number(cfg.employeeUnemploymentRate ?? 0)
  const medicalRaw      = bracketedRaw(gross, cfg.employeeMedicalThreshold, cfg.employeeMedicalRateBelow, cfg.employeeMedicalRateAbove)

  let taxBase = gross
  if (cfg.deductSocialFromTaxBase) taxBase -= pensionRaw + unemploymentRaw + medicalRaw
  if (Number(cfg.nonTaxableMinimum) > 0) taxBase -= Number(cfg.nonTaxableMinimum)
  if (taxBase < 0) taxBase = 0

  const incomeTaxRaw       = progressiveIncomeTaxRaw(taxBase)
  const totalDeductionsRaw = incomeTaxRaw + pensionRaw + unemploymentRaw + medicalRaw
  let   netPayRaw          = gross - totalDeductionsRaw
  if (netPayRaw < 0) netPayRaw = 0

  const employerPensionRaw      = bracketedRaw(gross, cfg.employerPensionThreshold, cfg.employerPensionRateBelow, cfg.employerPensionRateAbove)
  const employerUnemploymentRaw = gross * Number(cfg.employerUnemploymentRate ?? 0)
  const employerMedicalRaw      = bracketedRaw(gross, cfg.employerMedicalThreshold, cfg.employerMedicalRateBelow, cfg.employerMedicalRateAbove)
  const totalEmployerRaw        = employerPensionRaw + employerUnemploymentRaw + employerMedicalRaw

  return {
    grossTotal:                 round2(gross),
    incomeTax:                  round2(incomeTaxRaw),
    employeePension:            round2(pensionRaw),
    employeeUnemployment:       round2(unemploymentRaw),
    employeeMedical:            round2(medicalRaw),
    totalDeductions:            round2(totalDeductionsRaw),
    netPay:                     round2(netPayRaw),
    employerPension:            round2(employerPensionRaw),
    employerUnemployment:       round2(employerUnemploymentRaw),
    employerMedical:            round2(employerMedicalRaw),
    totalEmployerContributions: round2(totalEmployerRaw),
    totalCompanyCost:           round2(gross + totalEmployerRaw),
  }
}

export default function PayrollEntryModal({ entry, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState({
    actualDaysWorked: entry.actualDaysWorked,
    bonus:            entry.bonus       || 0,
    vacationPay:      entry.vacationPay || 0,
    overtimePay:      entry.overtimePay || 0,
    penalty:          entry.penalty     || 0,
    baseSalary:       entry.baseSalary,
    notes:            entry.notes       || '',
  })
  const [cfg, setCfg]           = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    hrApi.getActiveTaxRate()
      .then(r => { if (!cancelled) setCfg(r.data?.data ?? r.data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const preview = useMemo(
    () => calcPreview(form, cfg, entry.workingDaysInMonth) ?? entry,
    [form, cfg, entry]
  )

  const submit = async (e) => {
    e?.preventDefault?.()
    setSubmitting(true)
    try {
      const payload = {
        actualDaysWorked: Number(form.actualDaysWorked),
        bonus:       Number(form.bonus       || 0),
        vacationPay: Number(form.vacationPay || 0),
        overtimePay: Number(form.overtimePay || 0),
        penalty:     Number(form.penalty     || 0),
        baseSalary:  Number(form.baseSalary),
        notes:       form.notes || null,
      }
      await hrApi.updateEntry(entry.id, payload)
      toast.success('Yadda saxlandı')
      onSaved()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta')
    } finally { setSubmitting(false) }
  }

  return (
    <ModalShell
      icon={Calculator}
      eyebrow="Əməkhaqqı sətri"
      title={entry.employeeFullName}
      subtitle={
        <>
          {entry.positionName || '—'}
          {entry.employeeFin && <> · <span className="font-mono">{entry.employeeFin}</span></>}
        </>
      }
      onClose={onClose}
      tone="gold"
      maxWidth="900px"
      footer={
        <>
          <button type="button" onClick={onClose} className="ces-btn ces-btn-ghost ces-btn-sm">Bağla</button>
          <button onClick={submit} disabled={submitting} className="ces-btn ces-btn-primary">
            {submitting && (
              <span className="w-3.5 h-3.5 rounded-full animate-spin"
                style={{ border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'var(--ces-on-primary)' }} />
            )}
            {submitting ? 'Saxlanılır...' : 'Yadda saxla'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        {/* Inputs */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <Avatar name={entry.employeeFullName} size="sm" />
            <div>
              <h3 className="text-[10.5px] font-bold uppercase tracking-[.16em]" style={{ color: 'var(--ces-muted)' }}>
                Daxiletmə
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--ces-mute2)' }}>İş günü max: {entry.workingDaysInMonth}</p>
            </div>
          </div>
          <div className="space-y-3">
            <Field label="Əməkhaqqı (Gross)">
              <Input type="number" step="0.01" value={form.baseSalary} onChange={(e) => set('baseSalary', e.target.value)} suffix="₼" />
            </Field>
            <Field label="Faktiki iş günü">
              <Input type="number" min="0" max="31" value={form.actualDaysWorked} onChange={(e) => set('actualDaysWorked', e.target.value)} suffix={`/ ${entry.workingDaysInMonth}`} />
            </Field>
            <Field label="Mükafat (Bonus)">
              <Input type="number" step="0.01" min="0" value={form.bonus} onChange={(e) => set('bonus', e.target.value)} suffix="₼" />
            </Field>
            <Field label="Məzuniyyət ödənişi">
              <Input type="number" step="0.01" min="0" value={form.vacationPay} onChange={(e) => set('vacationPay', e.target.value)} suffix="₼" />
            </Field>
            <Field label="Saatlıq əlavə">
              <Input type="number" step="0.01" min="0" value={form.overtimePay} onChange={(e) => set('overtimePay', e.target.value)} suffix="₼" />
            </Field>
            <Field label="Cərimə">
              <Input type="number" step="0.01" min="0" value={form.penalty} onChange={(e) => set('penalty', e.target.value)} suffix="₼" />
            </Field>
            <Field label="Qeyd">
              <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
            </Field>
          </div>
        </div>

        {/* Live preview */}
        <div>
          <h3 className="text-[10.5px] font-bold uppercase tracking-[.16em] mb-4" style={{ color: 'var(--ces-muted)' }}>
            Canlı hesablama
          </h3>
          <div
            className="overflow-hidden divide-y"
            style={{
              border: '1px solid var(--ces-line)',
              borderRadius: '14px',
              background: 'var(--ces-surface)',
              boxShadow: 'var(--ces-shadow-sm)',
            }}
          >
            <Row label="HESABLANIB CƏMİ"               value={preview.grossTotal} bold />
            <Row label="Gəlir vergisi (0/3/10/14%)"    value={preview.incomeTax} subtle />
            <Row label="Pensiya (3% / 10%)"            value={preview.employeePension} subtle />
            <Row label="İşsizlik (0.5%)"               value={preview.employeeUnemployment} subtle />
            <Row label="Tibbi (2% / 0.5%, ≷2500)"      value={preview.employeeMedical} subtle />
            <Row label="CƏMİ TUTULMUŞDUR"              value={preview.totalDeductions} bold negative />
            <Row label="ÖDƏNİLMƏLİ MƏBLƏĞ"             value={preview.netPay} big />
            <Row label="İGÖ Pensiya (22%/15%)"         value={preview.employerPension} subtle />
            <Row label="İGÖ İşsizlik (0.5%)"           value={preview.employerUnemployment} subtle />
            <Row label="İGÖ Tibbi"                     value={preview.employerMedical} subtle />
            <Row label="ŞİRKƏT XƏRCİ"                  value={preview.totalCompanyCost} bold info />
          </div>
        </div>
      </div>
    </ModalShell>
  )
}

function Row({ label, value, bold, negative, big, info, subtle }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5"
      style={{ background: big ? 'rgba(15,157,106,.06)' : 'transparent' }}
    >
      <span
        className={bold ? 'font-bold' : 'font-medium'}
        style={{
          color: bold || big ? 'var(--ces-ink)' : 'var(--ces-muted)',
          fontSize: bold || big ? '12.5px' : '11.5px',
          letterSpacing: subtle ? '.02em' : 0,
        }}
      >
        {label}
      </span>
      <span
        className="num"
        style={{
          fontSize: big ? '20px' : bold ? '14px' : '13px',
          fontWeight: big ? 800 : bold ? 700 : 600,
          color:
            big      ? 'var(--ces-ok)' :
            negative ? 'var(--ces-danger)' :
            info     ? 'var(--ces-info)' :
            bold     ? 'var(--ces-graphite-900)' :
                       'var(--ces-ink)',
        }}
      >
        {fmt(value)} ₼
      </span>
    </div>
  )
}
