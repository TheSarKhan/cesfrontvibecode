import { useState } from 'react'
import { X, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import NumberInput from '../../components/common/NumberInput'

const empty = {
  year: new Date().getFullYear(),
  active: false,
  employeePensionThreshold: 200, employeePensionRateBelow: 0.03, employeePensionRateAbove: 0.10,
  employerPensionThreshold: 200, employerPensionRateBelow: 0.22, employerPensionRateAbove: 0.15,
  employeeUnemploymentRate: 0.005, employerUnemploymentRate: 0.005,
  employeeMedicalThreshold: 8000, employeeMedicalRateBelow: 0.02, employeeMedicalRateAbove: 0.005,
  employerMedicalThreshold: 8000, employerMedicalRateBelow: 0.02, employerMedicalRateAbove: 0.005,
  incomeTaxThreshold: 8000, incomeTaxRateBelow: 0.00, incomeTaxRateAbove: 0.14,
  nonTaxableMinimum: 0, deductSocialFromTaxBase: false,
  notes: '',
}

export default function TaxConfigModal({ editing, onClose, onSaved }) {
  const [form, setForm] = useState(editing ? { ...empty, ...editing } : empty)
  const [submitting, setSubmitting] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const submit = async () => {
    setSubmitting(true)
    try {
      const payload = { ...form }
      Object.keys(payload).forEach(k => {
        if (typeof payload[k] === 'string' && k !== 'notes') {
          const n = Number(payload[k])
          if (!Number.isNaN(n)) payload[k] = n
        }
      })
      if (editing?.id) {
        await hrApi.updateTaxRate(editing.id, payload)
        toast.success('Yeniləndi')
      } else {
        await hrApi.createTaxRate(payload)
        toast.success('Yaradıldı')
      }
      onSaved()
    } catch (err) { toast.error(err?.response?.data?.message || 'Xəta') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl my-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-violet-600" />
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">{editing ? 'Tarifi redaktə et' : 'Yeni illik tarif'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <Field label="İl">
              <NumberInput value={form.year} onChange={(e) => set('year', Number(e.target.value))} className={ipt} />
            </Field>
            <Field label="Status">
              <label className="flex items-center gap-2 px-3 py-2">
                <input type="checkbox" checked={!!form.active} onChange={(e) => set('active', e.target.checked)} className="accent-violet-600" />
                <span className="text-sm">Aktiv tarif</span>
              </label>
            </Field>
          </div>

          <Group title="Pensiya Fondu — İşçi">
            <Bracket form={form} set={set} thrKey="employeePensionThreshold" belowKey="employeePensionRateBelow" aboveKey="employeePensionRateAbove" />
          </Group>
          <Group title="Pensiya Fondu — İşəgötürən">
            <Bracket form={form} set={set} thrKey="employerPensionThreshold" belowKey="employerPensionRateBelow" aboveKey="employerPensionRateAbove" />
          </Group>

          <Group title="İşsizlik Sığortası">
            <div className="grid grid-cols-2 gap-3">
              <Field label="İşçi rate"><PctInput value={form.employeeUnemploymentRate} onChange={(v) => set('employeeUnemploymentRate', v)} /></Field>
              <Field label="İşəgötürən rate"><PctInput value={form.employerUnemploymentRate} onChange={(v) => set('employerUnemploymentRate', v)} /></Field>
            </div>
          </Group>

          <Group title="Tibbi Sığorta — İşçi">
            <Bracket form={form} set={set} thrKey="employeeMedicalThreshold" belowKey="employeeMedicalRateBelow" aboveKey="employeeMedicalRateAbove" />
          </Group>
          <Group title="Tibbi Sığorta — İşəgötürən">
            <Bracket form={form} set={set} thrKey="employerMedicalThreshold" belowKey="employerMedicalRateBelow" aboveKey="employerMedicalRateAbove" />
          </Group>

          <Group title="Gəlir Vergisi">
            <Bracket form={form} set={set} thrKey="incomeTaxThreshold" belowKey="incomeTaxRateBelow" aboveKey="incomeTaxRateAbove" />
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="Qeyri-vergi minimumu (AZN)">
                <NumberInput decimal value={form.nonTaxableMinimum} onChange={(e) => set('nonTaxableMinimum', Number(e.target.value))} className={ipt} />
              </Field>
              <label className="flex items-center gap-2 mt-6">
                <input type="checkbox" checked={!!form.deductSocialFromTaxBase} onChange={(e) => set('deductSocialFromTaxBase', e.target.checked)} className="accent-violet-600" />
                <span className="text-xs">Sosial töhfələri vergi base-dan çıx</span>
              </label>
            </div>
          </Group>

          <Field label="Qeyd">
            <textarea rows={2} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} className={ipt} />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Ləğv et</button>
          <button onClick={submit} disabled={submitting} className="px-5 py-2 text-sm font-semibold bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg">
            {submitting ? '...' : 'Yadda saxla'}
          </button>
        </div>
      </div>
    </div>
  )
}

const ipt = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"

function Field({ label, children }) {
  return <div><label className="block text-xs text-gray-500 mb-1">{label}</label>{children}</div>
}

function Group({ title, children }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  )
}

function Bracket({ form, set, thrKey, belowKey, aboveKey }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Field label="Threshold (AZN)">
        <NumberInput decimal value={form[thrKey]} onChange={(e) => set(thrKey, Number(e.target.value))} className={ipt} />
      </Field>
      <Field label="Threshold-dan aşağı %"><PctInput value={form[belowKey]} onChange={(v) => set(belowKey, v)} /></Field>
      <Field label="Threshold-dan yuxarı %"><PctInput value={form[aboveKey]} onChange={(v) => set(aboveKey, v)} /></Field>
    </div>
  )
}

function PctInput({ value, onChange }) {
  const [input, setInput] = useState(String(((Number(value) || 0) * 100).toFixed(2).replace(/\.?0+$/, '')))
  const handleChange = (e) => {
    setInput(e.target.value)
    const n = Number(e.target.value)
    if (!Number.isNaN(n)) onChange(n / 100)
  }
  return (
    <div className="relative">
      <input value={input} onChange={handleChange} className={ipt + ' pr-7'} />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
    </div>
  )
}
