import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { serviceApi } from '../../api/service'
import { garageApi } from '../../api/garage'
import { contractorsApi } from '../../api/contractors'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const SERVICE_TYPES = [
  'Texniki baxış',
  'Yağ dəyişimi',
  'Filtr dəyişimi',
  'Əyləc sistemi',
  'Şin dəyişimi',
  'Motor təmiri',
  'Hidravlika sistemi',
  'Elektrik sistemi',
  'Yanacaq sistemi',
  'Kuzov təmiri',
  'Digər',
]

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500'

function Field({ label, required, children, hint }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function ServiceModal({ editing, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState({
    equipmentId:  editing?.equipmentId  ?? '',
    contractorId: editing?.contractorId ?? '',
    serviceType:  editing?.serviceType  ?? '',
    description:  editing?.description  ?? '',
    cost:         editing?.cost         ?? '',
    serviceDate:  editing?.serviceDate  ?? new Date().toISOString().slice(0, 10),
    nextServiceDate: editing?.nextServiceDate ?? '',
    odometer:     editing?.odometer     ?? '',
    notes:        editing?.notes        ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [equipment, setEquipment] = useState([])
  const [contractors, setContractors] = useState([])

  useEffect(() => {
    garageApi.getAll().then(r => setEquipment(r.data.data || r.data || [])).catch(() => {})
    contractorsApi.getAll().then(r => setContractors(r.data.data || r.data || [])).catch(() => {})
  }, [])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!form.equipmentId) return toast.error('Texnika seçin')
    if (!form.serviceType) return toast.error('Servis növü seçin')
    if (!form.serviceDate) return toast.error('Tarix seçin')

    setSaving(true)
    const payload = {
      equipmentId:     parseInt(form.equipmentId),
      contractorId:    form.contractorId ? parseInt(form.contractorId) : null,
      serviceType:     form.serviceType,
      description:     form.description || null,
      cost:            form.cost ? parseFloat(form.cost) : null,
      serviceDate:     form.serviceDate,
      nextServiceDate: form.nextServiceDate || null,
      odometer:        form.odometer ? parseInt(form.odometer) : null,
      notes:           form.notes || null,
    }

    try {
      if (editing) {
        await serviceApi.update(editing.id, payload)
        toast.success('Servis qeydi yeniləndi')
      } else {
        await serviceApi.create(payload)
        toast.success('Servis qeydi əlavə edildi')
      }
      onSaved()
    } catch {
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
            {editing ? 'Servis Qeydini Redaktə et' : 'Yeni Servis Qeydi'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Field label="Texnika" required>
            <select value={form.equipmentId} onChange={e => set('equipmentId', e.target.value)} className={inputCls}>
              <option value="">— Texnika seçin —</option>
              {equipment.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} {eq.plateNumber ? `(${eq.plateNumber})` : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Servis növü" required>
            <select value={form.serviceType} onChange={e => set('serviceType', e.target.value)} className={inputCls}>
              <option value="">— Servis növü seçin —</option>
              {SERVICE_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Servis tarixi" required>
              <input type="date" value={form.serviceDate} onChange={e => set('serviceDate', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Növbəti servis tarixi">
              <input type="date" value={form.nextServiceDate} onChange={e => set('nextServiceDate', e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Xərc (AZN)">
              <input type="number" value={form.cost} onChange={e => set('cost', e.target.value)}
                placeholder="0.00" min="0" step="0.01" className={inputCls} />
            </Field>
            <Field label="Odometr (km)" hint="Servis zamanı göstərici">
              <input type="number" value={form.odometer} onChange={e => set('odometer', e.target.value)}
                placeholder="50000" min="0" className={inputCls} />
            </Field>
          </div>

          <Field label="Servis şirkəti / Podratçı">
            <select value={form.contractorId} onChange={e => set('contractorId', e.target.value)} className={inputCls}>
              <option value="">— Seçin (könüllü) —</option>
              {contractors.map(c => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
          </Field>

          <Field label="Təsvir">
            <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Hansı işlər görüldü..." className={inputCls} />
          </Field>

          <Field label="Qeydlər">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={2} placeholder="Əlavə məlumat..."
              className={clsx(inputCls, 'resize-none')} />
          </Field>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            Ləğv et
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
            {saving ? 'Saxlanılır...' : (editing ? 'Yenilə' : 'Əlavə et')}
          </button>
        </div>
      </div>
    </div>
  )
}
