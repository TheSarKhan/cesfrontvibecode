import DateInput from '../../components/common/DateInput'
import { useState, useEffect, useMemo } from 'react'
import { Plus, FileText, ChevronDown, ChevronUp, Send, Lock } from 'lucide-react'
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

const emptyForm = {
  standardDays: '',
  extraDays: '',
  extraHours: '',
  overtimeRate: '1.0',
  monthlyRate: 14000,
  workingDaysInMonth: 26,
  workingHoursPerDay: 9,
  invoiceDate: new Date().toISOString().slice(0, 10),
  notes: '',
}

export default function ProjectQaimeTab({ project }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [sendingId, setSendingId] = useState(null)
  const [justCreatedId, setJustCreatedId] = useState(null)
  const { confirm, ConfirmDialog } = useConfirm()
  const canCreate = useAuthStore(s => s.hasPermission('ACCOUNTING', 'canPost'))
  const canSend = canCreate  // Əgər qaimə yarada bilsə, göndərə də bilər
  const canDelete = useAuthStore(s => s.hasPermission('ACCOUNTING', 'canDelete'))

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

  // Live amount calculation
  const calc = useMemo(() => {
    const monthly = parseFloat(form.monthlyRate) || 0
    const workDays = parseFloat(form.workingDaysInMonth) || 26
    const workHours = parseFloat(form.workingHoursPerDay) || 9
    const std = parseFloat(form.standardDays) || 0
    const extD = parseFloat(form.extraDays) || 0
    const extH = parseFloat(form.extraHours) || 0
    if (!monthly || !workDays || !workHours) return { daily: 0, stdAmt: 0, extDAmt: 0, extHAmt: 0, total: 0 }
    const daily = monthly / workDays
    const stdAmt = daily * std
    const extDAmt = daily * extD
    const rate = parseFloat(form.overtimeRate) || 1
    const extHAmt = (daily / workHours) * extH * rate
    return { daily, stdAmt, extDAmt, extHAmt, total: stdAmt + extDAmt + extHAmt }
  }, [form.monthlyRate, form.workingDaysInMonth, form.workingHoursPerDay, form.standardDays, form.extraDays, form.extraHours, form.overtimeRate])

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
      setForm(emptyForm)
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    } finally {
      setSaving(false)
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
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors"
        >
          {showForm ? <ChevronUp size={12} /> : <Plus size={12} />}
          {showForm ? 'Bağla' : 'Yeni Qaime'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Yeni Qaime</p>

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

          {/* Row 4: Rate + Working days */}
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

          {/* Row 5: Hours per day */}
          <div>
            <label className={labelCls}>Norma saat/gün</label>
            <input type="number" value={form.workingHoursPerDay} onChange={e => set('workingHoursPerDay', e.target.value)}
              min="1" max="24" className={inputCls} required />
          </div>

          {/* Preview box */}
          {calc.total > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 space-y-1">
              <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Hesablanmış məbləğ</p>
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
                  <span>Əlavə saat ({form.extraHours} saat × {form.overtimeRate})</span>
                  <span>{fmtMoney(calc.extHAmt)} ₼</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-green-700 border-t border-green-200 pt-1 mt-1">
                <span>Cəmi</span>
                <span>{fmtMoney(calc.total)} ₼</span>
              </div>
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
            className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
            {saving ? 'Yaradılır...' : 'Qaime Yarat'}
          </button>

          {/* Success message with Send button */}
          {justCreatedId && !saving && (
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
            const isSent = inv.status === 'SENT'
            const periodLbl = periodLabel(inv.periodMonth, inv.periodYear)
            return (
              <div key={inv.id} className="flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-800">
                      {periodLbl}
                    </span>
                    <span className={clsx(
                      'px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1',
                      isSent
                        ? 'bg-green-50 text-green-700'
                        : 'bg-amber-50 text-amber-700'
                    )}>
                      {isSent ? <Lock size={10} /> : <span>DRAFT</span>}
                      {isSent ? 'SENT' : ''}
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
                  {!isSent && canSend && (
                    <button
                      onClick={() => handleSend(inv.id, periodLbl)}
                      disabled={sendingId === inv.id}
                      className="p-1 rounded text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
                      title="Mühasibatlığa göndər"
                    >
                      <Send size={12} />
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
    </div>
  )
}
