import { useEffect, useState } from 'react'
import { X, Calculator } from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'

const fmt = (n) => Number(n ?? 0).toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function PayrollEntryModal({ entry, onClose, onSaved }) {
  const [form, setForm] = useState({
    actualDaysWorked: entry.actualDaysWorked,
    bonus: entry.bonus || 0,
    vacationPay: entry.vacationPay || 0,
    overtimePay: entry.overtimePay || 0,
    penalty: entry.penalty || 0,
    baseSalary: entry.baseSalary,
    notes: entry.notes || '',
  })
  const [preview, setPreview] = useState(entry)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setPreview(entry)
  }, [entry])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const submit = async () => {
    setSubmitting(true)
    try {
      const payload = {
        actualDaysWorked: Number(form.actualDaysWorked),
        bonus: Number(form.bonus || 0),
        vacationPay: Number(form.vacationPay || 0),
        overtimePay: Number(form.overtimePay || 0),
        penalty: Number(form.penalty || 0),
        baseSalary: Number(form.baseSalary),
        notes: form.notes || null,
      }
      const res = await hrApi.updateEntry(entry.id, payload)
      setPreview(res.data?.data ?? res.data)
      toast.success('Yeniləndi və yenidən hesablandı')
      onSaved()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl my-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2">
              <Calculator size={18} className="text-emerald-600" />
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">{entry.employeeFullName}</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{entry.positionName || '—'} • {entry.employeeFin || 'FİN —'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-6">
          {/* Inputs */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Daxiletmə</h3>
            <Field label="Əməkhaqqı (Gross)">
              <input type="number" step="0.01" value={form.baseSalary} onChange={(e) => set('baseSalary', e.target.value)} className={ipt} />
            </Field>
            <Field label={`Faktiki iş günü (max ${entry.workingDaysInMonth})`}>
              <input type="number" min="0" max="31" value={form.actualDaysWorked} onChange={(e) => set('actualDaysWorked', e.target.value)} className={ipt} />
            </Field>
            <Field label="Mükafat (Bonus)">
              <input type="number" step="0.01" min="0" value={form.bonus} onChange={(e) => set('bonus', e.target.value)} className={ipt} />
            </Field>
            <Field label="Məzuniyyət ödənişi">
              <input type="number" step="0.01" min="0" value={form.vacationPay} onChange={(e) => set('vacationPay', e.target.value)} className={ipt} />
            </Field>
            <Field label="Saatlıq əlavə (overtime)">
              <input type="number" step="0.01" min="0" value={form.overtimePay} onChange={(e) => set('overtimePay', e.target.value)} className={ipt} />
            </Field>
            <Field label="Cərimə">
              <input type="number" step="0.01" min="0" value={form.penalty} onChange={(e) => set('penalty', e.target.value)} className={ipt} />
            </Field>
            <Field label="Qeyd">
              <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} className={ipt} />
            </Field>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hesablama (son yadda saxlanılan)</h3>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <Row label="HESABLANIB CƏMİ" value={fmt(preview.grossTotal)} bold />
              <Row label="Gəlir vergisi" value={fmt(preview.incomeTax)} />
              <Row label="Pensiya (3% / 10%)" value={fmt(preview.employeePension)} />
              <Row label="İşsizlik (0.5%)" value={fmt(preview.employeeUnemployment)} />
              <Row label="Tibbi (2% / 0.5%)" value={fmt(preview.employeeMedical)} />
              <Row label="CƏMİ TUTULMUŞDUR" value={fmt(preview.totalDeductions)} bold negative />
              <Row label="ÖDƏNİLMƏLİ MƏBLƏĞ" value={fmt(preview.netPay)} bold positive big />
              <Row label="İGÖ Pensiya (22%/15%)" value={fmt(preview.employerPension)} />
              <Row label="İGÖ İşsizlik (0.5%)" value={fmt(preview.employerUnemployment)} />
              <Row label="İGÖ Tibbi" value={fmt(preview.employerMedical)} />
              <Row label="ŞİRKƏT XƏRCİ" value={fmt(preview.totalCompanyCost)} bold />
            </div>
            <p className="text-[11px] text-gray-400 italic">Hesablama "Yadda saxla" düyməsindən sonra yenilənir.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Bağla</button>
          <button onClick={submit} disabled={submitting} className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg">
            {submitting ? 'Hesablanır...' : 'Yadda saxla və hesabla'}
          </button>
        </div>
      </div>
    </div>
  )
}

const ipt = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Row({ label, value, bold, negative, positive, big }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 ${big ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}>
      <span className={`${bold ? 'font-semibold text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'} text-xs`}>{label}</span>
      <span className={`font-medium ${big ? 'text-base text-emerald-700 dark:text-emerald-400 font-bold' : negative ? 'text-rose-600' : positive ? 'text-emerald-700' : 'text-gray-800 dark:text-gray-100'}`}>
        {value} ₼
      </span>
    </div>
  )
}
