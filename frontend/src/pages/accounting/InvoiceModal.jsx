import { useState, useEffect, useMemo } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import { projectsApi } from '../../api/projects'
import { contractorsApi } from '../../api/contractors'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const TYPE_OPTIONS = [
  { value: 'INCOME',             label: 'Gəlir',  desc: 'Layihədən qazanılan gəlir' },
  { value: 'COMPANY_EXPENSE',    label: 'Xərc',   desc: 'Şirkət daxili xərclər' },
  { value: 'CONTRACTOR_EXPENSE', label: 'Ödəmə',  desc: 'İnvestor / Podratçı ödənişi' },
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
    periodMonth:        editing?.periodMonth  ?? '',
    periodYear:         editing?.periodYear   ?? new Date().getFullYear(),
    standardDays:       editing?.standardDays ?? '',
    extraDays:          editing?.extraDays    ?? '',
    extraHours:         editing?.extraHours   ?? '',
    monthlyRate:        editing?.monthlyRate  ?? 14000,
    workingDaysInMonth: editing?.workingDaysInMonth ?? 26,
    workingHoursPerDay: editing?.workingHoursPerDay ?? 9,
  })
  const [saving, setSaving] = useState(false)
  const [showTimesheet, setShowTimesheet] = useState(!!(editing?.periodMonth))
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

  const timesheetCalc = useMemo(() => {
    if (!showTimesheet || !isA) return null
    const monthly = parseFloat(form.monthlyRate) || 0
    const workDays = parseFloat(form.workingDaysInMonth) || 26
    const workHours = parseFloat(form.workingHoursPerDay) || 9
    if (!monthly || !workDays || !workHours) return null
    const daily = monthly / workDays
    const stdAmt = daily * (parseFloat(form.standardDays) || 0)
    const extDAmt = daily * (parseFloat(form.extraDays) || 0)
    const extHAmt = (daily / workHours) * (parseFloat(form.extraHours) || 0)
    const total = stdAmt + extDAmt + extHAmt
    return total > 0 ? { daily, stdAmt, extDAmt, extHAmt, total } : null
  }, [showTimesheet, isA, form.monthlyRate, form.workingDaysInMonth, form.workingHoursPerDay, form.standardDays, form.extraDays, form.extraHours])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!timesheetCalc && (!form.amount || parseFloat(form.amount) <= 0)) return toast.error('Məbləğ daxil edin')
    if (!form.invoiceDate) return toast.error('Tarix seçin')
    if (isA && !form.projectId) return toast.error('Gəlir qaiməsi üçün layihə seçilməlidir')

    setSaving(true)
    const payload = {
      type:               form.type,
      invoiceNumber:      form.invoiceNumber || null,
      amount:             timesheetCalc ? parseFloat(timesheetCalc.total.toFixed(2)) : parseFloat(form.amount),
      invoiceDate:        form.invoiceDate,
      etaxesId:           isA  ? (form.etaxesId || null) : null,
      equipmentName:      form.equipmentName || null,
      companyName:        form.companyName || null,
      serviceDescription: (isB1 || isB2) ? (form.serviceDescription || null) : null,
      projectId:          form.projectId    ? parseInt(form.projectId)    : null,
      contractorId:       form.contractorId ? parseInt(form.contractorId) : null,
      notes:              form.notes || null,
      periodMonth:        (isA && showTimesheet && form.periodMonth) ? parseInt(form.periodMonth) : null,
      periodYear:         (isA && showTimesheet && form.periodYear)  ? parseInt(form.periodYear)  : null,
      standardDays:       (isA && showTimesheet && form.standardDays !== '') ? parseInt(form.standardDays) : null,
      extraDays:          (isA && showTimesheet && form.extraDays !== '')    ? parseInt(form.extraDays)    : null,
      extraHours:         (isA && showTimesheet && form.extraHours !== '')   ? parseFloat(form.extraHours) : null,
      monthlyRate:        (isA && showTimesheet) ? parseFloat(form.monthlyRate)        : null,
      workingDaysInMonth: (isA && showTimesheet) ? parseInt(form.workingDaysInMonth)   : null,
      workingHoursPerDay: (isA && showTimesheet) ? parseInt(form.workingHoursPerDay)   : null,
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
                <p className={clsx('text-sm font-bold',
                  form.type === opt.value ? 'text-amber-700 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'
                )}>
                  {opt.label}
                </p>
                <p className={clsx('text-[10px] mt-0.5',
                  form.type === opt.value ? 'text-amber-600' : 'text-gray-400'
                )}>
                  {opt.desc}
                </p>
              </button>
            ))}
          </div>

          {/* Layihə */}
          <Field label="Layihə" required={isA} hint={!isA ? 'İstəyə bağlı — əlaqəli layihə varsa seçin' : undefined}>
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

          {/* Ödəmə — Podratçı (optional) */}
          {isB1 && (
            <Field label="Podratçı" hint="İnvestora ödənişdə boş qoya bilərsiniz">
              <select value={form.contractorId} onChange={e => set('contractorId', e.target.value)} className={selectCls}>
                <option value="">— Seçin (istəyə bağlı) —</option>
                {contractors.map(c => (
                  <option key={c.id} value={c.id}>{c.companyName} ({c.voen})</option>
                ))}
              </select>
            </Field>
          )}

          {/* Ödəmə — Alıcı adı (investor və ya podratçı adı) */}
          {isB1 && (
            <Field label="Alıcı / Şirkət adı" hint="Podratçı siyahısında olmayan investoru burada yazın">
              <input type="text" value={form.companyName} onChange={e => set('companyName', e.target.value)}
                placeholder="İnvestor MMC" className={inputCls} />
            </Field>
          )}

          {/* Ödəmə — Ödəmə məqsədi */}
          {isB1 && (
            <Field label="Ödəmə məqsədi">
              <input type="text" value={form.serviceDescription} onChange={e => set('serviceDescription', e.target.value)}
                placeholder="Avadanlıq icarəsi, yanacaq, texniki xidmət..." className={inputCls} />
            </Field>
          )}

          {/* Xərc — Xərc növü (məcburi açıqlama) */}
          {isB2 && (
            <Field label="Xərc növü" hint="Kontur, kommunal xərc, ofis, maaş...">
              <input type="text" value={form.serviceDescription} onChange={e => set('serviceDescription', e.target.value)}
                placeholder="Kommunal xərc, işçi kontur, ofis icarəsi..." className={inputCls} />
            </Field>
          )}

          {/* Xərc — Təchizatçı / Şirkət */}
          {isB2 && (
            <Field label="Təchizatçı / Şirkət" hint="İstəyə bağlı">
              <input type="text" value={form.companyName} onChange={e => set('companyName', e.target.value)}
                placeholder="Azərenerji, Bakıtelekom..." className={inputCls} />
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

          {/* A — Aylıq iş cədvəli */}
          {isA && (
            <div className="rounded-xl border border-indigo-100 overflow-hidden">
              <button type="button" onClick={() => setShowTimesheet(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-indigo-50 text-left">
                <span className="text-xs font-semibold text-indigo-700">Aylıq iş cədvəlindən hesabla</span>
                {showTimesheet ? <ChevronUp size={13} className="text-indigo-500" /> : <ChevronDown size={13} className="text-indigo-500" />}
              </button>
              {showTimesheet && (
                <div className="p-3 space-y-3 bg-white">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">Ay</label>
                      <select value={form.periodMonth} onChange={e => set('periodMonth', e.target.value)} className={inputCls}>
                        <option value="">Seçin...</option>
                        {['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr'].map((m,i) => (
                          <option key={i+1} value={i+1}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">İl</label>
                      <input type="number" value={form.periodYear} onChange={e => set('periodYear', e.target.value)}
                        min="2020" max="2040" className={inputCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">Standart gün</label>
                      <input type="number" value={form.standardDays} onChange={e => set('standardDays', e.target.value)}
                        min="0" max="31" placeholder="0" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">Əlavə gün</label>
                      <input type="number" value={form.extraDays} onChange={e => set('extraDays', e.target.value)}
                        min="0" max="31" placeholder="0" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Əlavə saat</label>
                    <input type="number" value={form.extraHours} onChange={e => set('extraHours', e.target.value)}
                      min="0" step="0.5" placeholder="0" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">Aylıq tarif ₼</label>
                      <input type="number" value={form.monthlyRate} onChange={e => set('monthlyRate', e.target.value)}
                        min="1" step="0.01" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">Norma gün</label>
                      <input type="number" value={form.workingDaysInMonth} onChange={e => set('workingDaysInMonth', e.target.value)}
                        min="1" max="31" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">Norma saat</label>
                      <input type="number" value={form.workingHoursPerDay} onChange={e => set('workingHoursPerDay', e.target.value)}
                        min="1" max="24" className={inputCls} />
                    </div>
                  </div>
                  {timesheetCalc && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 space-y-1">
                      {timesheetCalc.stdAmt > 0 && (
                        <div className="flex justify-between text-[11px] text-gray-600">
                          <span>Standart gün ({form.standardDays} × {Number(timesheetCalc.daily).toFixed(2)})</span>
                          <span>{Number(timesheetCalc.stdAmt).toFixed(2)} ₼</span>
                        </div>
                      )}
                      {timesheetCalc.extDAmt > 0 && (
                        <div className="flex justify-between text-[11px] text-gray-600">
                          <span>Əlavə gün ({form.extraDays} × {Number(timesheetCalc.daily).toFixed(2)})</span>
                          <span>{Number(timesheetCalc.extDAmt).toFixed(2)} ₼</span>
                        </div>
                      )}
                      {timesheetCalc.extHAmt > 0 && (
                        <div className="flex justify-between text-[11px] text-gray-600">
                          <span>Əlavə saat ({form.extraHours} saat)</span>
                          <span>{Number(timesheetCalc.extHAmt).toFixed(2)} ₼</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs font-bold text-green-700 border-t border-green-200 pt-1">
                        <span>Cəmi (avtomatik)</span>
                        <span>{Number(timesheetCalc.total).toFixed(2)} ₼</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Gəlir — Texnika adı */}
          {isA && (
            <Field label="Texnika adı">
              <input type="text" value={form.equipmentName} onChange={e => set('equipmentName', e.target.value)}
                placeholder="Hidravlik Ekskavator, Kran..." className={inputCls} />
            </Field>
          )}

          {/* Gəlir — Müştəri şirkəti */}
          {isA && (
            <Field label="Müştəri şirkəti">
              <input type="text" value={form.companyName} onChange={e => set('companyName', e.target.value)}
                placeholder="ABC İnşaat MMC" className={inputCls} />
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
