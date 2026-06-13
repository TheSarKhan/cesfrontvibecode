import { useEffect, useState } from 'react'
import { User, Briefcase, Phone, CreditCard, FileText, Pencil, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { Field, Input, Select, Textarea, ModalShell, FormSection } from './_shared'

const STATUSES = [
  { v: 'ACTIVE',     label: 'Aktiv' },
  { v: 'ON_LEAVE',   label: 'Məzuniyyətdə' },
  { v: 'TERMINATED', label: 'İşdən çıxıb' },
]
const GENDERS = [
  { v: 'MALE',   label: 'Kişi' },
  { v: 'FEMALE', label: 'Qadın' },
]

const empty = {
  firstName: '', lastName: '', fatherName: '',
  fin: '', idCardSeries: '', idCardNumber: '',
  gender: '', birthDate: '',
  phone: '', email: '', address: '',
  positionId: '', departmentId: '',
  grossSalary: '', hireDate: new Date().toISOString().slice(0, 10),
  status: 'ACTIVE',
  bankName: '', bankAccount: '',
  notes: '', annualLeaveDays: 21,
}

export default function EmployeeModal({ editing, positions = [], departments = [], onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState(empty)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (editing) {
      setForm({
        ...empty,
        ...editing,
        positionId:   editing.positionId   || '',
        departmentId: editing.departmentId || '',
        gender:       editing.gender       || '',
        birthDate:    editing.birthDate    || '',
        hireDate:     editing.hireDate     || empty.hireDate,
        annualLeaveDays: editing.annualLeaveDays ?? 21,
      })
    } else {
      setForm(empty)
    }
  }, [editing])

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const onPositionChange = (id) => {
    set('positionId', id)
    const p = positions.find(x => String(x.id) === String(id))
    if (p && !editing && (!form.grossSalary || form.grossSalary === '')) {
      set('grossSalary', p.defaultSalary || '')
    }
    if (p && p.departmentId && !form.departmentId) {
      set('departmentId', p.departmentId)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.firstName?.trim() || !form.lastName?.trim()) { toast.error('Ad və soyad mütləqdir'); return }
    if (!form.grossSalary || Number(form.grossSalary) <= 0) { toast.error('Əməkhaqqı 0-dan böyük olmalıdır'); return }

    setSubmitting(true)
    try {
      const payload = {
        ...form,
        grossSalary:     Number(form.grossSalary),
        annualLeaveDays: Number(form.annualLeaveDays || 21),
        positionId:      form.positionId   ? Number(form.positionId)   : null,
        departmentId:    form.departmentId ? Number(form.departmentId) : null,
        gender:          form.gender    || null,
        birthDate:       form.birthDate || null,
        hireDate:        form.hireDate  || null,
        fin:             form.fin?.trim() || null,
      }
      if (editing?.id) {
        await hrApi.updateEmployee(editing.id, payload)
        toast.success('İşçi yeniləndi')
      } else {
        await hrApi.createEmployee(payload)
        toast.success('İşçi əlavə edildi')
      }
      onSaved()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Yadda saxlanıla bilmədi')
    } finally { setSubmitting(false) }
  }

  return (
    <ModalShell
      icon={editing ? Pencil : UserPlus}
      eyebrow={editing ? 'Redaktə' : 'Yeni qeyd'}
      title={editing ? editing.fullName : 'Yeni işçi əlavə et'}
      subtitle={editing ? editing.positionName : 'Şəxsi və iş məlumatlarını doldurun'}
      onClose={onClose}
      tone={editing ? 'gold' : 'graphite'}
      maxWidth="820px"
      footer={
        <>
          <button type="button" onClick={onClose} className="ces-btn ces-btn-ghost ces-btn-sm">Ləğv et</button>
          <button type="submit" form="employee-form" disabled={submitting} className="ces-btn ces-btn-primary">
            {submitting && (
              <span className="w-3.5 h-3.5 rounded-full animate-spin"
                style={{ border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'var(--ces-on-primary)' }} />
            )}
            {submitting ? 'Saxlanılır...' : (editing ? 'Yenilə' : 'Yadda saxla')}
          </button>
        </>
      }
    >
      <form id="employee-form" onSubmit={submit} className="p-6 space-y-6">
        <FormSection icon={User} title="Şəxsi məlumat" cols={2}>
          <Field label="Ad" required>
            <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} autoFocus />
          </Field>
          <Field label="Soyad" required>
            <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
          </Field>
          <Field label="Ata adı">
            <Input value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} />
          </Field>
          <Field label="FİN" hint="7 simvol">
            <Input value={form.fin} onChange={(e) => set('fin', e.target.value.toUpperCase())} maxLength={7} />
          </Field>
          <Field label="Cinsi">
            <Select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="">—</option>
              {GENDERS.map(g => <option key={g.v} value={g.v}>{g.label}</option>)}
            </Select>
          </Field>
          <Field label="Doğum tarixi">
            <Input type="date" value={form.birthDate || ''} onChange={(e) => set('birthDate', e.target.value)} />
          </Field>
        </FormSection>

        <FormSection icon={Briefcase} title="İş məlumatı" cols={2}>
          <Field label="Vəzifə">
            <Select value={form.positionId} onChange={(e) => onPositionChange(e.target.value)}>
              <option value="">—</option>
              {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Şöbə">
            <Select value={form.departmentId} onChange={(e) => set('departmentId', e.target.value)}>
              <option value="">—</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Aylıq əməkhaqqı (Gross)" required>
            <Input type="number" min="0" step="0.01" value={form.grossSalary} onChange={(e) => set('grossSalary', e.target.value)} suffix="₼" />
          </Field>
          <Field label="İşə qəbul tarixi">
            <Input type="date" value={form.hireDate || ''} onChange={(e) => set('hireDate', e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="İllik məzuniyyət" hint="Gün sayı (default 21)">
            <Input type="number" min="0" max="60" value={form.annualLeaveDays} onChange={(e) => set('annualLeaveDays', e.target.value)} suffix="gün" />
          </Field>
        </FormSection>

        <FormSection icon={Phone} title="Əlaqə" cols={2}>
          <Field label="Telefon">
            <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+994 50 123 45 67" />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Ünvan" wide>
            <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
        </FormSection>

        <FormSection icon={CreditCard} title="Bank məlumatları" cols={2}>
          <Field label="Bank adı">
            <Input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} />
          </Field>
          <Field label="IBAN / Hesab nömrəsi">
            <Input value={form.bankAccount} onChange={(e) => set('bankAccount', e.target.value)} placeholder="AZ12NABZ..." />
          </Field>
        </FormSection>

        <FormSection icon={FileText} title="Əlavə qeyd" cols={1}>
          <Field label="Qeyd">
            <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
          </Field>
        </FormSection>
      </form>
    </ModalShell>
  )
}
