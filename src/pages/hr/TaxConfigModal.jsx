import { useState } from 'react'
import { Settings, Pencil, Shield, Briefcase, Activity, Heart, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { Field, Input, Textarea, ModalShell, FormSection } from './_shared'

const empty = {
  year: new Date().getFullYear(),
  active: false,
  employeePensionThreshold: 200, employeePensionRateBelow: 0.03, employeePensionRateAbove: 0.10,
  employerPensionThreshold: 200, employerPensionRateBelow: 0.22, employerPensionRateAbove: 0.15,
  employeeUnemploymentRate: 0.005, employerUnemploymentRate: 0.005,
  employeeMedicalThreshold: 2500, employeeMedicalRateBelow: 0.02, employeeMedicalRateAbove: 0.005,
  employerMedicalThreshold: 2500, employerMedicalRateBelow: 0.02, employerMedicalRateAbove: 0.005,
  incomeTaxThreshold: 8000, incomeTaxRateBelow: 0.00, incomeTaxRateAbove: 0.14,
  nonTaxableMinimum: 0, deductSocialFromTaxBase: false,
  notes: '',
}

export default function TaxConfigModal({ editing, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState(editing ? { ...empty, ...editing } : empty)
  const [submitting, setSubmitting] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const submit = async () => {
    setSubmitting(true)
    try {
      const payload = { ...form }
      Object.keys(payload).forEach((k) => {
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
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta')
    } finally { setSubmitting(false) }
  }

  return (
    <ModalShell
      icon={editing ? Pencil : Settings}
      eyebrow={editing ? 'Redaktə' : 'Yeni qeyd'}
      title={editing ? `${editing.year} ili tarifi` : 'Yeni illik tarif'}
      subtitle="Vergi və sığorta faizləri"
      onClose={onClose}
      tone={editing ? 'gold' : 'graphite'}
      maxWidth="900px"
      footer={
        <>
          <button onClick={onClose} className="ces-btn ces-btn-ghost ces-btn-sm">Ləğv et</button>
          <button onClick={submit} disabled={submitting} className="ces-btn ces-btn-primary">
            {submitting && (
              <span className="w-3.5 h-3.5 rounded-full animate-spin"
                style={{ border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'var(--ces-on-primary)' }} />
            )}
            {submitting ? '...' : 'Yadda saxla'}
          </button>
        </>
      }
    >
      <div className="p-6 space-y-6">

        {/* Year + Active toggle */}
        <FormSection icon={Settings} title="Əsas məlumat" cols={2}>
          <Field label="İl" required>
            <Input type="number" value={form.year} onChange={(e) => set('year', Number(e.target.value))} />
          </Field>
          <Field label="Status">
            <label
              className="flex items-center gap-2 px-3"
              style={{
                background: 'var(--ces-surface)',
                border: '1px solid var(--ces-line)',
                borderRadius: '11px',
                minHeight: '44px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={!!form.active}
                onChange={(e) => set('active', e.target.checked)}
                className="w-4 h-4"
                style={{ accentColor: 'var(--ces-gold)' }}
              />
              <span className="text-[13.5px] font-semibold" style={{ color: 'var(--ces-ink)' }}>
                Aktiv tarif kimi seç
              </span>
            </label>
          </Field>
        </FormSection>

        <FormSection icon={Shield} title="Pensiya Fondu — İşçi" cols={1}>
          <Bracket form={form} set={set} thrKey="employeePensionThreshold" belowKey="employeePensionRateBelow" aboveKey="employeePensionRateAbove" />
        </FormSection>

        <FormSection icon={Briefcase} title="Pensiya Fondu — İşəgötürən" cols={1}>
          <Bracket form={form} set={set} thrKey="employerPensionThreshold" belowKey="employerPensionRateBelow" aboveKey="employerPensionRateAbove" />
        </FormSection>

        <FormSection icon={Activity} title="İşsizlik Sığortası" cols={2}>
          <Field label="İşçi rate">
            <PctInput value={form.employeeUnemploymentRate} onChange={(v) => set('employeeUnemploymentRate', v)} />
          </Field>
          <Field label="İşəgötürən rate">
            <PctInput value={form.employerUnemploymentRate} onChange={(v) => set('employerUnemploymentRate', v)} />
          </Field>
        </FormSection>

        <FormSection icon={Heart} title="Tibbi Sığorta — İşçi" cols={1}>
          <Bracket form={form} set={set} thrKey="employeeMedicalThreshold" belowKey="employeeMedicalRateBelow" aboveKey="employeeMedicalRateAbove" />
        </FormSection>

        <FormSection icon={Heart} title="Tibbi Sığorta — İşəgötürən" cols={1}>
          <Bracket form={form} set={set} thrKey="employerMedicalThreshold" belowKey="employerMedicalRateBelow" aboveKey="employerMedicalRateAbove" />
        </FormSection>

        <FormSection icon={FileText} title="Gəlir Vergisi" cols={1}>
          <Bracket form={form} set={set} thrKey="incomeTaxThreshold" belowKey="incomeTaxRateBelow" aboveKey="incomeTaxRateAbove" />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Field label="Qeyri-vergi minimumu" hint="AZN — base-dan çıxılır">
              <Input type="number" step="0.01" value={form.nonTaxableMinimum} onChange={(e) => set('nonTaxableMinimum', Number(e.target.value))} suffix="₼" />
            </Field>
            <Field label="Tax base">
              <label
                className="flex items-center gap-2 px-3"
                style={{
                  background: 'var(--ces-surface)',
                  border: '1px solid var(--ces-line)',
                  borderRadius: '11px',
                  minHeight: '44px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={!!form.deductSocialFromTaxBase}
                  onChange={(e) => set('deductSocialFromTaxBase', e.target.checked)}
                  className="w-4 h-4"
                  style={{ accentColor: 'var(--ces-gold)' }}
                />
                <span className="text-[12.5px] font-semibold" style={{ color: 'var(--ces-ink)' }}>
                  Sosial töhfələri base-dan çıx
                </span>
              </label>
            </Field>
          </div>
        </FormSection>

        <FormSection icon={FileText} title="Qeyd" cols={1}>
          <Field label="Əlavə açıqlama">
            <Textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} rows={2} />
          </Field>
        </FormSection>
      </div>
    </ModalShell>
  )
}

function Bracket({ form, set, thrKey, belowKey, aboveKey }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Field label="Threshold">
        <Input type="number" step="0.01" value={form[thrKey]} onChange={(e) => set(thrKey, Number(e.target.value))} suffix="₼" />
      </Field>
      <Field label="Threshold-dan aşağı">
        <PctInput value={form[belowKey]} onChange={(v) => set(belowKey, v)} />
      </Field>
      <Field label="Threshold-dan yuxarı">
        <PctInput value={form[aboveKey]} onChange={(v) => set(aboveKey, v)} />
      </Field>
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
  return <Input value={input} onChange={handleChange} suffix="%" />
}
