import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import { projectsApi } from '../../api/projects'
import { contractorsApi } from '../../api/contractors'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const TYPE_OPTIONS = [
  { value: 'INCOME',             label: 'A — Gəlir Qaiməsi',      desc: 'Şirkət tərəfindən müştəriyə kəsilən' },
  { value: 'CONTRACTOR_EXPENSE', label: 'B1 — Podratçı Qaiməsi',  desc: 'Podratçıya ödənilən məbləğ' },
  { value: 'COMPANY_EXPENSE',    label: 'B2 — Şirkət Xərci',      desc: 'Kənar xidmət və daxili xərclər' },
]

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

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500'
const selectCls = inputCls

export default function InvoiceModal({ editing, defaultType, preProject, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState({
    type:               editing?.type        ?? defaultType ?? 'INCOME',
    invoiceNumber:      editing?.invoiceNumber ?? '',
    amount:             editing?.amount       ?? '',
    invoiceDate:        editing?.invoiceDate  ?? new Date().toISOString().slice(0, 10),
    etaxesId:           editing?.etaxesId     ?? '',
    equipmentName:      editing?.equipmentName ?? (preProject?.equipmentName ?? ''),
    companyName:        editing?.companyName   ?? (preProject?.companyName ?? ''),
    serviceDescription: editing?.serviceDescription ?? '',
    projectId:          editing?.projectId    ?? (preProject?.id ? String(preProject.id) : ''),
    contractorId:       editing?.contractorId ?? '',
    notes:              editing?.notes        ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [projects, setProjects] = useState([])
  const [contractors, setContractors] = useState([])

  useEffect(() => {
    projectsApi.getAll().then(r => setProjects(r.data.data || r.data || [])).catch(() => {})
    contractorsApi.getAll().then(r => setContractors(r.data.data || r.data || [])).catch(() => {})
  }, [])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const isA  = form.type === 'INCOME'
  const isB1 = form.type === 'CONTRACTOR_EXPENSE'
  const isB2 = form.type === 'COMPANY_EXPENSE'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Məbləğ daxil edin')
    if (!form.invoiceDate) return toast.error('Tarix seçin')
    if ((isA || isB1) && !form.projectId) return toast.error('Layihə seçin')
    if (isB1 && !form.contractorId) return toast.error('Podratçı seçin')

    setSaving(true)
    const payload = {
      type:               form.type,
      invoiceNumber:      form.invoiceNumber || null,
      amount:             parseFloat(form.amount),
      invoiceDate:        form.invoiceDate,
      etaxesId:           isA  ? (form.etaxesId || null) : null,
      equipmentName:      form.equipmentName || null,
      companyName:        form.companyName || null,
      serviceDescription: isB2 ? (form.serviceDescription || null) : null,
      projectId:          form.projectId    ? parseInt(form.projectId)    : null,
      contractorId:       form.contractorId ? parseInt(form.contractorId) : null,
      notes:              form.notes || null,
    }

    try {
      if (editing) {
        await accountingApi.update(editing.id, payload)
        toast.success('Qaimə yeniləndi')
      } else {
        await accountingApi.create(payload)
        toast.success('Qaimə əlavə edildi')
      }
      onSaved()
    } catch (err) {
      if (err?.isPending) { onClose?.(); return }
    } finally {
      setSaving(false)
    }
  }

  const activeProjects = projects.filter(p => ['ACTIVE', 'COMPLETED'].includes(p.status))
  const isPreProject = !!preProject && !editing

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
            {editing ? 'Qaiməni Redaktə et' : 'Yeni Qaimə'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Növ seçimi */}
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('type', opt.value)}
                className={clsx(
                  'p-2.5 rounded-xl border text-left transition-colors',
                  form.type === opt.value
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                )}
              >
                <p className={clsx('text-xs font-semibold',
                  form.type === opt.value ? 'text-amber-700 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'
                )}>
                  {opt.label.split(' — ')[0]}
                </p>
                <p className={clsx('text-[10px] mt-0.5',
                  form.type === opt.value ? 'text-amber-600' : 'text-gray-400'
                )}>
                  {opt.label.split(' — ')[1]}
                </p>
              </button>
            ))}
          </div>

          {/* Layihə (A və B1 üçün məcburi, B2 üçün könüllü) */}
          <Field label="Layihə" required={isA || isB1} hint={isB2 ? 'B2 üçün könüllü — ümumi şirkət xərci ola bilər' : undefined}>
            {isPreProject ? (
              <div className="flex items-center gap-2 px-3 py-2.5 border border-amber-300 dark:border-amber-700 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <span className="text-xs font-mono font-bold text-green-600 dark:text-green-400">
                  {preProject.projectCode || `PRJ-${String(preProject.id).padStart(4,'0')}`}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">{preProject.companyName}</span>
                <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-400">Bağlanmış</span>
              </div>
            ) : (
              <select value={form.projectId} onChange={e => set('projectId', e.target.value)} className={selectCls}>
                <option value="">— Layihə seçin —</option>
                {activeProjects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.projectCode || `PRJ-${String(p.id).padStart(4,'0')}`} · {p.companyName}
                    {p.status === 'COMPLETED' ? ' ✓ bağlanmış' : ''}
                  </option>
                ))}
              </select>
            )}
          </Field>

          {/* B1 — Podratçı */}
          {isB1 && (
            <Field label="Podratçı" required>
              <select value={form.contractorId} onChange={e => set('contractorId', e.target.value)} className={selectCls}>
                <option value="">— Podratçı seçin —</option>
                {contractors.map(c => (
                  <option key={c.id} value={c.id}>{c.companyName} ({c.voen})</option>
                ))}
              </select>
            </Field>
          )}

          {/* Məbləğ + Tarix */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Məbləğ (AZN)" required>
              <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                placeholder="0.00" min="0.01" step="0.01" className={inputCls} />
            </Field>
            <Field label="Tarix" required>
              <input type="date" value={form.invoiceDate} onChange={e => set('invoiceDate', e.target.value)} className={inputCls} />
            </Field>
          </div>

          {/* Qaimə nömrəsi */}
          <Field label="Qaimə nömrəsi" hint="Sonradan da əlavə edilə bilər">
            <input type="text" value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)}
              placeholder="Q-2026-0001" className={inputCls} />
          </Field>

          {/* A — ETaxes ID */}
          {isA && (
            <Field label="ETaxes ID" hint="New e-Taxes platformasından alınan unikal ID">
              <input type="text" value={form.etaxesId} onChange={e => set('etaxesId', e.target.value)}
                placeholder="ETX-2026-00001" className={inputCls} />
            </Field>
          )}

          {/* A + B1 — Texnika adı */}
          {(isA || isB1) && (
            <Field label="Texnika adı">
              <input type="text" value={form.equipmentName} onChange={e => set('equipmentName', e.target.value)}
                placeholder="Hidravlik Ekskavator" className={inputCls} />
            </Field>
          )}

          {/* A — Müştəri şirkəti / B2 — Xidmət şirkəti */}
          {(isA || isB2) && (
            <Field label={isA ? 'Müştəri şirkəti' : 'Xidmət şirkəti'}>
              <input type="text" value={form.companyName} onChange={e => set('companyName', e.target.value)}
                placeholder={isA ? 'ABC İnşaat MMC' : 'AutoServis MMC'} className={inputCls} />
            </Field>
          )}

          {/* B2 — Xidmət növü */}
          {isB2 && (
            <Field label="Xidmət / Xərc növü" hint="Texniki baxış, daşınma, yanacaq...">
              <input type="text" value={form.serviceDescription} onChange={e => set('serviceDescription', e.target.value)}
                placeholder="Texniki baxış və yağ dəyişimi" className={inputCls} />
            </Field>
          )}

          {/* Qeydlər */}
          <Field label="Qeydlər">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={2} placeholder="Əlavə məlumat..."
              className={clsx(inputCls, 'resize-none')} />
          </Field>
        </form>

        {/* Footer */}
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
