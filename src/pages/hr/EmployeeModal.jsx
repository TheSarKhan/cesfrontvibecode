import { useEffect, useState } from 'react'
import { X, User, Briefcase, Phone, MapPin, CreditCard, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import NumberInput from '../../components/common/NumberInput'
import { onlyPhone, phoneKeyDown, makePasteHandler } from '../../utils/validation'

const STATUSES = [
  { v: 'ACTIVE', label: 'Aktiv' },
  { v: 'ON_LEAVE', label: 'Məzuniyyətdə' },
  { v: 'TERMINATED', label: 'İşdən çıxıb' },
]
const GENDERS = [
  { v: 'MALE', label: 'Kişi' },
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
  const [form, setForm] = useState(empty)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (editing) {
      setForm({
        ...empty,
        ...editing,
        positionId: editing.positionId || '',
        departmentId: editing.departmentId || '',
        gender: editing.gender || '',
        birthDate: editing.birthDate || '',
        hireDate: editing.hireDate || empty.hireDate,
        annualLeaveDays: editing.annualLeaveDays ?? 21,
      })
    } else {
      setForm(empty)
    }
  }, [editing])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

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
        grossSalary: Number(form.grossSalary),
        annualLeaveDays: Number(form.annualLeaveDays || 21),
        positionId: form.positionId ? Number(form.positionId) : null,
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        gender: form.gender || null,
        birthDate: form.birthDate || null,
        hireDate: form.hireDate || null,
        fin: form.fin?.trim() || null,
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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <form
        onSubmit={submit}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl my-8 shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <User size={18} className="text-amber-600" />
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
              {editing ? 'İşçini redaktə et' : 'Yeni işçi'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <Section icon={User} title="Şəxsi məlumat">
            <Field label="Ad *">
              <input value={form.firstName} onChange={e => set('firstName', e.target.value)} className={ipt} />
            </Field>
            <Field label="Soyad *">
              <input value={form.lastName} onChange={e => set('lastName', e.target.value)} className={ipt} />
            </Field>
            <Field label="Ata adı">
              <input value={form.fatherName} onChange={e => set('fatherName', e.target.value)} className={ipt} />
            </Field>
            <Field label="FİN">
              <input
                value={form.fin}
                onChange={e => set('fin', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                maxLength={7}
                className={ipt}
                placeholder="7 simvol (hərf/rəqəm)"
              />
            </Field>
            <Field label="Cinsi">
              <select value={form.gender} onChange={e => set('gender', e.target.value)} className={ipt}>
                <option value="">—</option>
                {GENDERS.map(g => <option key={g.v} value={g.v}>{g.label}</option>)}
              </select>
            </Field>
            <Field label="Doğum tarixi">
              <input type="date" value={form.birthDate || ''} onChange={e => set('birthDate', e.target.value)} className={ipt} />
            </Field>
          </Section>

          <Section icon={Briefcase} title="İş məlumatı">
            <Field label="Vəzifə">
              <select value={form.positionId} onChange={e => onPositionChange(e.target.value)} className={ipt}>
                <option value="">—</option>
                {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Şöbə">
              <select value={form.departmentId} onChange={e => set('departmentId', e.target.value)} className={ipt}>
                <option value="">—</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Aylıq əməkhaqqı (Gross) *">
              <div className="relative">
                <NumberInput decimal min="0" value={form.grossSalary} onChange={e => set('grossSalary', e.target.value)} className={ipt + ' pr-8'} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">₼</span>
              </div>
            </Field>
            <Field label="İşə qəbul tarixi">
              <input type="date" value={form.hireDate || ''} onChange={e => set('hireDate', e.target.value)} className={ipt} />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e => set('status', e.target.value)} className={ipt}>
                {STATUSES.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="İllik məzuniyyət (gün)">
              <NumberInput min="0" max="60" value={form.annualLeaveDays} onChange={e => set('annualLeaveDays', e.target.value)} className={ipt} />
            </Field>
          </Section>

          <Section icon={Phone} title="Əlaqə">
            <Field label="Telefon">
              <input
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={e => set('phone', onlyPhone(e.target.value))}
                onKeyDown={phoneKeyDown}
                onPaste={makePasteHandler(onlyPhone)}
                className={ipt}
                placeholder="+994501234567"
              />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={ipt} />
            </Field>
            <Field label="Ünvan" wide>
              <input value={form.address} onChange={e => set('address', e.target.value)} className={ipt} />
            </Field>
          </Section>

          <Section icon={CreditCard} title="Bank məlumatları">
            <Field label="Bank adı">
              <input value={form.bankName} onChange={e => set('bankName', e.target.value)} className={ipt} />
            </Field>
            <Field label="IBAN / Hesab nömrəsi">
              <input
                value={form.bankAccount}
                onChange={e => set('bankAccount', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                maxLength={34}
                className={ipt}
                placeholder="AZ12NABZ..."
              />
            </Field>
          </Section>

          <Section icon={FileText} title="Əlavə qeyd">
            <Field label="Qeyd" wide>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={ipt} />
            </Field>
          </Section>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            Ləğv et
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg"
          >
            {submitting ? 'Yadda saxlanılır...' : (editing ? 'Yenilə' : 'Yadda saxla')}
          </button>
        </div>
      </form>
    </div>
  )
}

const ipt = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"

function Section({ icon: Icon, title, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-gray-400" />
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, wide }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
}
