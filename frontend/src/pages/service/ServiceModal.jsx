import DateInput from '../../components/common/DateInput'
import { useState, useEffect } from 'react'
import { X, CheckSquare, Square, Eye, Wrench, Pencil } from 'lucide-react'
import { serviceApi } from '../../api/service'
import { garageApi } from '../../api/garage'
import { configApi } from '../../api/config'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const INSPECTION_TYPES = [
  'Texniki baxış',
  'Vizual yoxlama',
  'Motor yoxlaması',
  'Hidravlika yoxlaması',
  'Elektrik sistemi yoxlaması',
  'Şin yoxlaması',
  'Əyləc yoxlaması',
  'Yanacaq sistemi yoxlaması',
]

const REPAIR_TYPES = [
  'Yağ dəyişimi',
  'Filtr dəyişimi',
  'Əyləc sistemi təmiri',
  'Şin dəyişimi',
  'Motor təmiri',
  'Hidravlika sistemi təmiri',
  'Elektrik sistemi təmiri',
  'Yanacaq sistemi təmiri',
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

// recordType: 'INSPECTION' | 'REPAIR'
export default function ServiceModal({ editing, initialEquipmentId, recordType = 'INSPECTION', onClose, onSaved }) {
  useEscapeKey(onClose)

  const isInspection = recordType === 'INSPECTION'
  const SERVICE_TYPES = isInspection ? INSPECTION_TYPES : REPAIR_TYPES

  const [form, setForm] = useState({
    equipmentId: editing?.equipmentId || initialEquipmentId || '',
    serviceType: editing?.serviceType ?? (isInspection ? 'Texniki baxış' : ''),
    cost:        editing?.cost        ?? '',
    serviceDate: editing?.serviceDate ?? new Date().toISOString().slice(0, 10),
    odometer:    editing?.odometer    ?? '',
    notes:       editing?.notes       ?? '',
  })
  const [templates, setTemplates] = useState([])
  const [selectedItems, setSelectedItems] = useState(() => {
    if (editing?.checklistItems?.length > 0) {
      return new Set(editing.checklistItems.map(i => i.itemName))
    }
    return new Set()
  })
  const [saving, setSaving] = useState(false)
  const [equipment, setEquipment] = useState([])

  useEffect(() => {
    garageApi.getAll()
      .then(r => setEquipment(r.data.data || r.data || []))
      .catch(() => {})

    if (!editing) {
      const category = isInspection ? 'SERVICE_CHECKLIST' : 'REPAIR_CHECKLIST'
      configApi.getActiveByCategory(category)
        .then(res => {
          const tmpl = res.data.data || []
          // Fallback to SERVICE_CHECKLIST if REPAIR_CHECKLIST empty
          if (tmpl.length === 0 && !isInspection) {
            return configApi.getActiveByCategory('SERVICE_CHECKLIST')
              .then(r2 => {
                const t2 = r2.data.data || []
                setTemplates(t2.map(t => t.key))
                setSelectedItems(new Set(t2.map(t => t.key)))
              })
          }
          setTemplates(tmpl.map(t => t.key))
          setSelectedItems(new Set(tmpl.map(t => t.key)))
        })
        .catch(() => {})
    } else {
      const existingNames = (editing.checklistItems || []).map(i => i.itemName)
      setTemplates(existingNames)
      setSelectedItems(new Set(existingNames))
    }
  }, [editing, isInspection])

  // Texnika seçildikdə motosaatı avtomatik doldur
  useEffect(() => {
    if (!editing && form.equipmentId && equipment.length > 0) {
      const sel = equipment.find(e => String(e.id) === String(form.equipmentId))
      if (sel && sel.motoHours != null) set('odometer', sel.motoHours)
    }
  }, [form.equipmentId, equipment])

  // Texnika dropdown filtri
  const filteredEquipment = equipment.filter(eq => {
    if (isInspection) return ['IN_TRANSIT', 'AVAILABLE'].includes(eq.status)
    return eq.status === 'DEFECTIVE'
  })

  const currentEquipment = equipment.find(e => String(e.id) === String(form.equipmentId))
  const minMoto = currentEquipment?.motoHours || 0

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const toggleItem = (name) => setSelectedItems(prev => {
    const next = new Set(prev)
    next.has(name) ? next.delete(name) : next.add(name)
    return next
  })

  const toggleAll = () => {
    setSelectedItems(selectedItems.size === templates.length ? new Set() : new Set(templates))
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!form.equipmentId) return toast.error('Texnika seçin')
    if (!form.serviceType) return toast.error('Növ seçin')
    if (!form.serviceDate) return toast.error('Tarix seçin')

    setSaving(true)
    const checklistItems = templates
      .filter(name => selectedItems.has(name))
      .map(name => ({ itemName: name, checked: false, note: '' }))

    const payload = {
      equipmentId:    parseInt(form.equipmentId),
      serviceType:    form.serviceType,
      cost:           (!isInspection && form.cost) ? parseFloat(form.cost) : null,
      serviceDate:    form.serviceDate,
      odometer:       form.odometer ? parseInt(form.odometer) : null,
      notes:          form.notes || null,
      recordType,
      checklistItems,
    }

    try {
      if (editing) {
        await serviceApi.update(editing.id, payload)
        toast.success('Qeyd yeniləndi')
      } else {
        await serviceApi.create(payload)
        toast.success(isInspection ? 'Texnika baxışa qəbul edildi' : 'Texnika servisə alındı')
      }
      onSaved()
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const allSelected = templates.length > 0 && selectedItems.size === templates.length

  const title = editing
    ? 'Qeydi Redaktə et'
    : isInspection ? 'Texniki Baxışa Qəbul' : 'Texniki Servisə Al'

  const accentColor = isInspection ? 'amber' : 'orange'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              {editing ? <Pencil size={16} className={`text-${accentColor}-500 shrink-0`} /> : isInspection ? <Eye size={16} className="text-amber-500 shrink-0" /> : <Wrench size={16} className="text-orange-500 shrink-0" />}
              {title}
            </h2>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {isInspection ? 'Layihədən gəlmiş texnikanı qəbul et' : 'Nasaz texnikanı servisə al'}
            </p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg text-${accentColor}-600 hover:bg-${accentColor}-50 dark:hover:bg-${accentColor}-900/20 transition-colors`}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Field label="Texnika" required>
            <select
              disabled={!!initialEquipmentId || !!editing}
              value={form.equipmentId}
              onChange={e => set('equipmentId', e.target.value)}
              className={clsx(inputCls, (initialEquipmentId || editing) && "bg-gray-50 dark:bg-gray-850 cursor-not-allowed")}
            >
              <option value="">— Texnika seçin —</option>
              {filteredEquipment.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.plateNumber ? `[${eq.plateNumber}] ` : ''}{eq.name} — {eq.status}
                </option>
              ))}
            </select>
            {filteredEquipment.length === 0 && (
              <p className="text-[10px] text-gray-400 mt-1">
                {isInspection ? 'Yolda olan texnika yoxdur' : 'Nasaz texnika yoxdur'}
              </p>
            )}
          </Field>

          <Field label={isInspection ? 'Baxış növü' : 'Servis növü'} required>
            <select value={form.serviceType} onChange={e => set('serviceType', e.target.value)} className={inputCls}>
              <option value="">— Seçin —</option>
              {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tarix" required>
              <DateInput value={form.serviceDate} onChange={e => set('serviceDate', e.target.value)} className={inputCls} />
            </Field>
            {!isInspection && (
              <Field label="Xərc (AZN)">
                <input type="number" value={form.cost} onChange={e => set('cost', e.target.value)}
                  placeholder="0.00" min="0" step="0.01" className={inputCls} />
              </Field>
            )}
          </div>

          <Field
            label="Motosaat"
            hint={currentEquipment ? `Cari motosaat: ${minMoto}. Azaltmaq olmaz.` : 'Texnikanın motosaatı'}
          >
            <input
              type="number"
              value={form.odometer}
              onChange={e => {
                const val = parseInt(e.target.value) || 0
                if (val >= minMoto) set('odometer', val)
                else toast.error(`Motosaat ${minMoto}-dən az ola bilməz`)
              }}
              placeholder="0" min={minMoto} className={inputCls}
            />
          </Field>

          <Field label="Qeydlər">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={2} placeholder="Əlavə məlumat..."
              className={clsx(inputCls, 'resize-none')} />
          </Field>

          {/* Checklist seçimi */}
          {templates.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    {isInspection ? 'Yoxlanılacaq maddələr' : 'Təmir maddələri'}
                  </label>
                  <p className="text-[10px] text-gray-400 mt-0.5">Hansı maddələrin keçiriləcəyini seçin</p>
                </div>
                <button type="button" onClick={toggleAll}
                  className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1">
                  {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                  {allSelected ? 'Hamını ləğv et' : 'Hamısını seç'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {templates.map(name => {
                  const sel = selectedItems.has(name)
                  return (
                    <button key={name} type="button" onClick={() => toggleItem(name)}
                      className={clsx(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all",
                        sel
                          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700"
                          : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      )}
                    >
                      <div className={clsx(
                        "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        sel ? "bg-amber-500 border-amber-500" : "border-gray-300 dark:border-gray-600"
                      )}>
                        {sel && (
                          <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
                            <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className={clsx(
                        "text-xs font-medium",
                        sel ? "text-amber-800 dark:text-amber-300" : "text-gray-600 dark:text-gray-400"
                      )}>
                        {name}
                      </span>
                    </button>
                  )
                })}
              </div>

              <p className="text-[10px] text-gray-400 mt-2 text-center">
                {selectedItems.size} / {templates.length} maddə seçilib
              </p>
            </div>
          )}
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            Ləğv et
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className={clsx(
              "px-5 py-2 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors",
              isInspection ? "bg-amber-600 hover:bg-amber-700" : "bg-orange-600 hover:bg-orange-700"
            )}>
            {saving ? 'Saxlanılır...' : (editing ? 'Yenilə' : isInspection ? 'Qəbul et' : 'Servisə al')}
          </button>
        </div>
      </div>
    </div>
  )
}
