import DateInput from '../../components/common/DateInput'
import { useState, useEffect, useMemo } from 'react'
import { Plus, FileText, ChevronDown, ChevronUp, Send, Lock, CheckCircle, Undo2, Eye, X, Calendar, Hash, Pencil, Trash2 } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import toast from 'react-hot-toast'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useAuthStore } from '../../store/authStore'
import { clsx } from 'clsx'

const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
]

function fmtMoney(v) {
  if (v == null) return '—'
  return Number(v).toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function periodLabel(month, year) {
  if (!month || !year) return '—'
  return `${MONTHS[month - 1]} ${year}`
}

function getDefaultForm(project) {
  const isDaily = project?.projectType === 'DAILY'
  return {
    standardDays: '',
    extraDays: '',
    extraHours: '',
    overtimeRate: '1.0',
    // DAILY: monthlyRate sahəsi günlük tarifi saxlayır (workingDaysInMonth=1 → daily=monthlyRate/1)
    monthlyRate: project?.planEquipmentPrice || (isDaily ? '' : 14000),
    workingDaysInMonth: isDaily ? 1 : 26,
    workingHoursPerDay: 9,
    invoiceDate: new Date().toISOString().slice(0, 10),
    notes: '',
  }
}

const STATUS_CFG = {
  DRAFT:    { cls: 'bg-gray-100 text-gray-600 border-gray-200',   label: 'Qaralama',        icon: FileText },
  SENT:     { cls: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Göndərilib',      icon: Send },
  APPROVED: { cls: 'bg-green-100 text-green-700 border-green-200', label: 'Təsdiqlənib',     icon: CheckCircle },
  RETURNED: { cls: 'bg-red-100 text-red-600 border-red-200',       label: 'Geri qaytarılıb', icon: Undo2 },
}

function InvoiceDetailModal({ inv, onClose }) {
  if (!inv) return null

  const st = STATUS_CFG[inv.status] || STATUS_CFG.DRAFT
  const StatusIcon = st.icon

  const workDays   = parseFloat(inv.workingDaysInMonth) || 26
  const workHours  = parseFloat(inv.workingHoursPerDay) || 9
  const std        = parseFloat(inv.standardDays) || 0
  const extD       = parseFloat(inv.extraDays) || 0
  const extH       = parseFloat(inv.extraHours) || 0
  const rate       = parseFloat(inv.overtimeRate) || 1
  const isDailyInv = workDays <= 1  // DAILY: workingDaysInMonth=1 saxlanılır
  const monthly    = parseFloat(inv.monthlyRate) || 0
  const daily      = isDailyInv ? monthly : (monthly && workDays ? monthly / workDays : 0)
  const stdAmt     = daily * std
  const extDAmt    = daily * extD
  const extHAmt    = workHours ? (daily / workHours) * extH * rate : 0

  const period = (inv.periodMonth && inv.periodYear)
    ? `${MONTHS[inv.periodMonth - 1]} ${inv.periodYear}` : '—'

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <FileText size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                {inv.invoiceNumber ? `Qaime №${inv.invoiceNumber}` : 'Qaime'}
              </p>
              <p className="text-xs text-gray-400">{period}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={clsx('flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border', st.cls)}>
              <StatusIcon size={11} />
              {st.label}
            </span>
            <button onClick={onClose}
              className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors">
              <X size={13} className="text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">

          {/* Şirkət / Texnika */}
          <div className="grid grid-cols-2 gap-3">
            {inv.companyName && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">Şirkət</p>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{inv.companyName}</p>
              </div>
            )}
            {inv.equipmentName && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3">
                <p className="text-[9px] font-bold text-purple-400 uppercase tracking-wider mb-1">Texnika</p>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{inv.equipmentName}</p>
              </div>
            )}
          </div>

          {/* Tarix */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Calendar size={13} className="text-gray-400" />
            <span>Tarix:</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('az-AZ') : '—'}
            </span>
            {inv.invoiceNumber && (
              <>
                <Hash size={13} className="text-gray-400 ml-2" />
                <span className="font-medium text-gray-700 dark:text-gray-300">{inv.invoiceNumber}</span>
              </>
            )}
          </div>

          {/* Hesablama */}
          <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Hesablama</p>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {!isDailyInv && (
                <div className="flex justify-between px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>Aylıq tarif</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{fmtMoney(monthly)} ₼</span>
                </div>
              )}
              {!isDailyInv && (
                <div className="flex justify-between px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>Norma (gün/saat)</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{workDays} gün · {workHours} saat</span>
                </div>
              )}
              <div className="flex justify-between px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{isDailyInv ? 'Günlük tarif' : 'Günlük tarif (hesabi)'}</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{fmtMoney(daily)} ₼</span>
              </div>
              {isDailyInv && workHours && (
                <div className="flex justify-between px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>Norma saat/gün</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{workHours} saat</span>
                </div>
              )}
              {std > 0 && (
                <div className="flex justify-between px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>Standart gün ({std} × {fmtMoney(daily)})</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{fmtMoney(stdAmt)} ₼</span>
                </div>
              )}
              {extD > 0 && (
                <div className="flex justify-between px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>Əlavə gün ({extD} × {fmtMoney(daily)})</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{fmtMoney(extDAmt)} ₼</span>
                </div>
              )}
              {extH > 0 && (
                <div className="flex justify-between px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>Əlavə saat ({extH} saat × {rate}×)</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{fmtMoney(extHAmt)} ₼</span>
                </div>
              )}
            </div>
            <div className="flex justify-between px-3 py-2.5 bg-green-50 dark:bg-green-900/20 border-t border-green-100 dark:border-green-800/40">
              <span className="text-xs font-bold text-green-700 dark:text-green-400">Cəmi</span>
              <span className="text-base font-bold text-green-700 dark:text-green-400">{fmtMoney(inv.amount)} ₼</span>
            </div>
          </div>

          {/* Qeydlər */}
          {inv.notes && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2.5">
              <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider mb-1">Qeydlər</p>
              <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{inv.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProjectQaimeTab({ project }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(getDefaultForm(project))
  const [sendingId, setSendingId] = useState(null)
  const [justCreatedId, setJustCreatedId] = useState(null)
  const [viewInvoice, setViewInvoice] = useState(null)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const { confirm, ConfirmDialog } = useConfirm()
  const canCreate = useAuthStore(s => s.hasPermission('ACCOUNTING', 'canPost'))
  const canSend = canCreate
  const canDelete = useAuthStore(s => s.hasPermission('ACCOUNTING', 'canDelete'))
  const isDaily = project?.projectType === 'DAILY'

  useEffect(() => {
    load()
  }, [project.id])

  async function load() {
    setLoading(true)
    try {
      const res = await accountingApi.getByProject(project.id)
      setInvoices((res.data?.data || []).filter(inv => inv.type === 'INCOME'))
    } catch {
      toast.error('Qaimələr yüklənmədi')
    } finally {
      setLoading(false)
    }
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const contractorDailyRate = parseFloat(project?.contractorDailyRate || 0)
  const hasContractorRate = contractorDailyRate > 0 &&
    (project?.ownershipType === 'CONTRACTOR' || project?.ownershipType === 'INVESTOR')

  // Live amount calculation
  const calc = useMemo(() => {
    const workHours = parseFloat(form.workingHoursPerDay) || 9
    const std  = parseFloat(form.standardDays) || 0
    const extD = parseFloat(form.extraDays) || 0
    const extH = parseFloat(form.extraHours) || 0
    const rate = parseFloat(form.overtimeRate) || 1

    let daily
    if (isDaily) {
      daily = parseFloat(form.monthlyRate) || 0
      if (!daily) return { daily: 0, stdAmt: 0, extDAmt: 0, extHAmt: 0, total: 0, contractorAmt: 0 }
    } else {
      const monthly  = parseFloat(form.monthlyRate) || 0
      const workDays = parseFloat(form.workingDaysInMonth) || 26
      if (!monthly || !workDays) return { daily: 0, stdAmt: 0, extDAmt: 0, extHAmt: 0, total: 0, contractorAmt: 0 }
      daily = monthly / workDays
    }

    const stdAmt  = daily * std
    const extDAmt = daily * extD
    const extHAmt = workHours ? (daily / workHours) * extH * rate : 0
    const totalDays = std + extD
    let contractorAmt = 0
    if (contractorDailyRate > 0) {
      let perDay
      if (isDaily) {
        perDay = contractorDailyRate
      } else {
        const workDays = parseFloat(form.workingDaysInMonth) || 26
        perDay = contractorDailyRate / workDays
      }
      const daysAmt = perDay * totalDays
      const extHAmt = workHours > 0 ? (perDay / workHours) * extH * rate : 0
      contractorAmt = daysAmt + extHAmt
    }
    return { daily, stdAmt, extDAmt, extHAmt, total: stdAmt + extDAmt + extHAmt, contractorAmt }
  }, [isDaily, form.monthlyRate, form.workingDaysInMonth, form.workingHoursPerDay, form.standardDays, form.extraDays, form.extraHours, form.overtimeRate, contractorDailyRate])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.invoiceDate) return toast.error('Tarix seçilməlidir')
    if (calc.total <= 0) return toast.error('Məbləğ 0-dan böyük olmalıdır')

    const ok = await confirm({
      title: 'Qaime Yaratma',
      message: `${fmtMoney(calc.total)} ₼ məbləğli qaime yaradılsın?`,
      confirmText: 'Bəli, yarat',
    })
    if (!ok) return

    const d = new Date(form.invoiceDate)
    setSaving(true)
    try {
      const res = await accountingApi.create({
        type: 'INCOME',
        projectId: project.id,
        companyName: project.companyName || '',
        equipmentName: project.equipmentName || '',
        invoiceDate: form.invoiceDate,
        notes: form.notes || null,
        amount: parseFloat(calc.total.toFixed(2)),
        periodMonth: d.getMonth() + 1,
        periodYear: d.getFullYear(),
        standardDays: form.standardDays !== '' ? parseInt(form.standardDays) : null,
        extraDays: form.extraDays !== '' ? parseInt(form.extraDays) : null,
        extraHours: form.extraHours !== '' ? parseFloat(form.extraHours) : null,
        monthlyRate: parseFloat(form.monthlyRate),
        workingDaysInMonth: parseInt(form.workingDaysInMonth),
        workingHoursPerDay: parseInt(form.workingHoursPerDay),
        overtimeRate: parseFloat(form.overtimeRate) || 1,
        status: 'DRAFT',
      })
      toast.success('Qaimə yaradıldı')
      setJustCreatedId(res.data?.data?.id)
      setForm(getDefaultForm(project))
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(inv) {
    setEditingInvoice(inv)
    setForm({
      standardDays:       inv.standardDays ?? '',
      extraDays:          inv.extraDays ?? '',
      extraHours:         inv.extraHours ?? '',
      overtimeRate:       String(inv.overtimeRate ?? '1.0'),
      monthlyRate:        inv.monthlyRate ?? project?.planEquipmentPrice ?? (isDaily ? '' : 14000),
      workingDaysInMonth: inv.workingDaysInMonth ?? (isDaily ? 1 : 26),
      workingHoursPerDay: inv.workingHoursPerDay ?? 9,
      invoiceDate:        inv.invoiceDate ? inv.invoiceDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes:              inv.notes ?? '',
    })
    setShowForm(true)
  }

  async function handleResubmit(e) {
    e.preventDefault()
    if (!form.invoiceDate) return toast.error('Tarix seçilməlidir')
    if (calc.total <= 0) return toast.error('Məbləğ 0-dan böyük olmalıdır')

    const ok = await confirm({
      title: 'Yenidən Göndər',
      message: `Qaimə düzəliş edilib ${fmtMoney(calc.total)} ₼ məbləğlə yenidən mühasibatlığa göndərilsin?`,
      confirmText: 'Göndər',
      danger: false,
    })
    if (!ok) return

    const d = new Date(form.invoiceDate)
    setSaving(true)
    try {
      await accountingApi.resubmit(editingInvoice.id, {
        invoiceDate:        form.invoiceDate,
        notes:              form.notes || null,
        standardDays:       form.standardDays !== '' ? parseInt(form.standardDays) : null,
        extraDays:          form.extraDays !== '' ? parseInt(form.extraDays) : null,
        extraHours:         form.extraHours !== '' ? parseFloat(form.extraHours) : null,
        monthlyRate:        parseFloat(form.monthlyRate),
        workingDaysInMonth: parseInt(form.workingDaysInMonth),
        workingHoursPerDay: parseInt(form.workingHoursPerDay),
        overtimeRate:       parseFloat(form.overtimeRate) || 1,
        periodMonth:        d.getMonth() + 1,
        periodYear:         d.getFullYear(),
      })
      toast.success('Qaimə yenidən göndərildi')
      setEditingInvoice(null)
      setShowForm(false)
      setForm(getDefaultForm(project))
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    const ok = await confirm({
      title: 'Qaiməni sil',
      message: 'Qaralama qaiməsi silinsin?',
      confirmText: 'Sil',
      danger: true,
    })
    if (!ok) return
    try {
      await accountingApi.delete(id)
      toast.success('Qaimə silindi')
      load()
    } catch {
      toast.error('Silmə uğursuz oldu')
    }
  }

  async function handleSend(id, periodLabel) {
    const ok = await confirm({
      title: 'Mühasibatlığa Göndər',
      message: `"${periodLabel}" qaməsi mühasibatlığa göndərilsin?`,
      confirmText: 'Göndər',
    })
    if (!ok) return
    setSendingId(id)
    try {
      await accountingApi.sendToAccounting(id)
      toast.success('Qaimə mühasibatlığa göndərildi')
      setJustCreatedId(null)
      load()
    } catch {
      toast.error('Göndərmə uğursuz oldu')
    } finally {
      setSendingId(null)
    }
  }

  const inputCls = 'w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500'
  const labelCls = 'block text-[10px] font-medium text-gray-500 mb-1'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileText size={14} className="text-amber-600" />
          <span className="text-sm font-semibold text-gray-800">Qaimələr</span>
          {invoices.length > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-semibold rounded-full">
              {invoices.length}
            </span>
          )}
        </div>
        {!editingInvoice && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {showForm ? <ChevronUp size={12} /> : <Plus size={12} />}
            {showForm ? 'Bağla' : 'Yeni Qaime'}
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={editingInvoice ? handleResubmit : handleSubmit}
          className={`rounded-xl border p-4 space-y-3 ${editingInvoice ? 'border-red-200 bg-red-50/40' : 'border-amber-200 bg-amber-50/60'}`}>
          <div className="flex items-center justify-between">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${editingInvoice ? 'text-red-600' : 'text-amber-700'}`}>
              {editingInvoice ? 'Qaiməni Düzəlt — Yenidən Göndər' : 'Yeni Qaime'}
            </p>
            {editingInvoice && (
              <button type="button" onClick={() => { setEditingInvoice(null); setShowForm(false); setForm(getDefaultForm(project)) }}
                className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors">
                Ləğv et
              </button>
            )}
          </div>

          {/* Row 2: Standard + Extra days */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Standart gün</label>
              <input type="number" value={form.standardDays} onChange={e => set('standardDays', e.target.value)}
                min="0" max="31" placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Əlavə gün</label>
              <input type="number" value={form.extraDays} onChange={e => set('extraDays', e.target.value)}
                min="0" max="31" placeholder="0" className={inputCls} />
            </div>
          </div>

          {/* Row 3: Extra hours */}
          <div>
            <label className={labelCls}>Əlavə saat</label>
            <input type="number" value={form.extraHours} onChange={e => set('extraHours', e.target.value)}
              min="0" step="0.5" placeholder="0" className={inputCls} />
          </div>

          {/* Row 3b: Overtime rate */}
          <div>
            <label className={labelCls}>Əlavə saat dərəcəsi</label>
            <div className="flex gap-2">
              {[['1.0', 'Adi (1×)'], ['1.5', 'Əlavə (1.5×)']].map(([val, lbl]) => (
                <button type="button" key={val} onClick={() => set('overtimeRate', val)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    form.overtimeRate === val
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400'
                  }`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Row 4: DAILY — sadəcə günlük tarif; MONTHLY — aylıq tarif + norma gün */}
          {isDaily ? (
            <div>
              <label className={labelCls}>Günlük tarif (₼)</label>
              <input type="number" value={form.monthlyRate} onChange={e => set('monthlyRate', e.target.value)}
                min="0.01" step="0.01" className={inputCls} required />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Aylıq tarif (₼)</label>
                <input type="number" value={form.monthlyRate} onChange={e => set('monthlyRate', e.target.value)}
                  min="1" step="0.01" className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Norma gün/ay</label>
                <input type="number" value={form.workingDaysInMonth} onChange={e => set('workingDaysInMonth', e.target.value)}
                  min="1" max="31" className={inputCls} required />
              </div>
            </div>
          )}

          {/* Norma saat/gün — hər iki növ üçün (əlavə saat hesabı) */}
          <div>
            <label className={labelCls}>Norma saat/gün</label>
            <input type="number" value={form.workingHoursPerDay} onChange={e => set('workingHoursPerDay', e.target.value)}
              min="1" max="24" className={inputCls} required />
          </div>

          {/* Preview box */}
          {calc.total > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 space-y-1">
              <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Hesablanmış məbləğ</p>
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>{isDaily ? 'Günlük tarif' : 'Günlük tarif (hesabi)'}</span>
                <span>{fmtMoney(calc.daily)} ₼</span>
              </div>
              {calc.stdAmt > 0 && (
                <div className="flex justify-between text-[11px] text-gray-600">
                  <span>Standart gün ({form.standardDays} × {fmtMoney(calc.daily)})</span>
                  <span>{fmtMoney(calc.stdAmt)} ₼</span>
                </div>
              )}
              {calc.extDAmt > 0 && (
                <div className="flex justify-between text-[11px] text-gray-600">
                  <span>Əlavə gün ({form.extraDays} × {fmtMoney(calc.daily)})</span>
                  <span>{fmtMoney(calc.extDAmt)} ₼</span>
                </div>
              )}
              {calc.extHAmt > 0 && (
                <div className="flex justify-between text-[11px] text-gray-600">
                  <span>Əlavə saat ({form.extraHours}s × {fmtMoney(calc.daily / (parseFloat(form.workingHoursPerDay) || 9))} × {form.overtimeRate})</span>
                  <span>{fmtMoney(calc.extHAmt)} ₼</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-green-700 border-t border-green-200 pt-1 mt-1">
                <span>Müştəridən alınacaq</span>
                <span>{fmtMoney(calc.total)} ₼</span>
              </div>
              {hasContractorRate && calc.contractorAmt > 0 && (
                <div className="flex justify-between text-[11px] font-semibold text-orange-600 border-t border-orange-200 pt-1 mt-0.5">
                  <span>
                    {project?.ownershipType === 'CONTRACTOR' ? 'Podratçıya ödəniləcək' : 'İnvestora ödəniləcək'}
                    <span className="font-normal text-gray-400 ml-1">
                      {isDaily
                        ? `(${(parseFloat(form.standardDays) || 0) + (parseFloat(form.extraDays) || 0)} gün × ${fmtMoney(contractorDailyRate)} günlük)`
                        : `(${(parseFloat(form.standardDays) || 0) + (parseFloat(form.extraDays) || 0)} gün × ${fmtMoney(contractorDailyRate / (parseFloat(form.workingDaysInMonth) || 26))} = ${fmtMoney(contractorDailyRate)} aylıq / ${parseFloat(form.workingDaysInMonth) || 26} gün)`
                      }
                    </span>
                  </span>
                  <span>−{fmtMoney(calc.contractorAmt)} ₼</span>
                </div>
              )}
            </div>
          )}

          {/* Date */}
          <div>
            <label className={labelCls}>Tarix *</label>
            <DateInput value={form.invoiceDate} onChange={e => set('invoiceDate', e.target.value)}
              className={inputCls} required />
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Qeydlər</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={2} placeholder="İstəyə bağlı qeyd..." className={inputCls + ' resize-none'} />
          </div>

          <button type="submit" disabled={saving || calc.total <= 0 || !canCreate}
            className={`w-full py-2 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              editingInvoice ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'
            }`}>
            {saving ? 'Göndərilir...' : editingInvoice
              ? <><Send size={12} /> Düzəlt və Yenidən Göndər</>
              : 'Qaime Yarat'}
          </button>

          {/* Success message with Send button */}
          {justCreatedId && !saving && !editingInvoice && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-700 mb-3">✓ Qaimə uğurla yaradıldı!</p>
              <div className="flex gap-2">
                {canSend && (
                  <button
                    type="button"
                    onClick={() => handleSend(justCreatedId, periodLabel(form.periodMonth, form.periodYear))}
                    disabled={sendingId === justCreatedId}
                    className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    {sendingId === justCreatedId ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Göndərilir...
                      </>
                    ) : (
                      <>
                        <Send size={12} />
                        Mühasibatlığa Göndər
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setJustCreatedId(null)}
                  className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Bağla
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Invoice list */}
      {loading ? (
        <div className="py-6 text-center text-xs text-gray-400">Yüklənir...</div>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
          <FileText size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-xs text-gray-400">Hələ qaime yoxdur</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
          {invoices.map(inv => {
            const periodLbl = periodLabel(inv.periodMonth, inv.periodYear)
            const statusCfg = {
              DRAFT:    { cls: 'bg-gray-50 text-gray-500',   icon: null,                      label: 'Qaralama' },
              SENT:     { cls: 'bg-amber-50 text-amber-700', icon: <Send size={10} />,         label: 'Göndərilib' },
              APPROVED: { cls: 'bg-green-50 text-green-700', icon: <CheckCircle size={10} />,  label: 'Təsdiqlənib' },
              RETURNED: { cls: 'bg-red-50 text-red-600',     icon: <Undo2 size={10} />,        label: 'Geri qaytarılıb' },
            }[inv.status] || { cls: 'bg-gray-50 text-gray-500', icon: null, label: inv.status }
            return (
              <div key={inv.id} className="flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-800">
                      {periodLbl}
                    </span>
                    <span className={clsx(
                      'px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1',
                      statusCfg.cls
                    )}>
                      {statusCfg.icon}
                      {statusCfg.label}
                    </span>
                    {inv.invoiceNumber && (
                      <span className="text-[10px] text-gray-400">№{inv.invoiceNumber}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-400 flex-wrap">
                    {inv.standardDays != null && <span>Std: {inv.standardDays} gün</span>}
                    {inv.extraDays != null && inv.extraDays > 0 && <span>Əl: {inv.extraDays} gün</span>}
                    {inv.extraHours != null && inv.extraHours > 0 && <span>Əl: {inv.extraHours} saat</span>}
                    <span>{new Date(inv.invoiceDate).toLocaleDateString('az-AZ')}</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-green-600 whitespace-nowrap">
                  {fmtMoney(inv.amount)} ₼
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setViewInvoice(inv)}
                    className="p-1 rounded text-gray-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                    title="Qaiməyə bax"
                  >
                    <Eye size={12} />
                  </button>
                  {inv.status === 'RETURNED' && canSend && (
                    <button
                      onClick={() => handleEdit(inv)}
                      className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Düzəlt və yenidən göndər"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                  {inv.status === 'DRAFT' && canSend && (
                    <button
                      onClick={() => handleSend(inv.id, periodLbl)}
                      disabled={sendingId === inv.id}
                      className="p-1 rounded text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
                      title="Mühasibatlığa göndər"
                    >
                      <Send size={12} />
                    </button>
                  )}
                  {(inv.status === 'DRAFT' || inv.status === 'RETURNED') && canDelete && (
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Qaiməni sil"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          <div className="flex justify-between items-center px-3 py-2 bg-green-50">
            <span className="text-[10px] font-semibold text-green-700">Ümumi cəmi</span>
            <span className="text-sm font-bold text-green-700">
              {fmtMoney(invoices.reduce((s, inv) => s + parseFloat(inv.amount || 0), 0))} ₼
            </span>
          </div>
        </div>
      )}
      <ConfirmDialog />
      {viewInvoice && (
        <InvoiceDetailModal inv={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}
    </div>
  )
}
