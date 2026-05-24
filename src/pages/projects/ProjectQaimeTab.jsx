import DateInput from '../../components/common/DateInput'
import { useState, useEffect, useMemo } from 'react'
import { Plus, FileText, ChevronUp, Send, Lock, CheckCircle, Undo2, Eye, X, Calendar, Hash, Pencil, Trash2, Paperclip, Upload } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import toast from 'react-hot-toast'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useAuthStore } from '../../store/authStore'
import { clsx } from 'clsx'
import { fmtDate } from '../../utils/date'

const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
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
    monthlyRate: project?.planEquipmentPrice || (isDaily ? '' : 14000),
    workingDaysInMonth: isDaily ? 1 : 26,
    workingHoursPerDay: 9,
    invoiceDate: new Date().toISOString().slice(0, 10),
    notes: '',
    hasTransport: false,
    transportations: [],
  }
}

function parseTransportations(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  try { return JSON.parse(val) } catch { return [] }
}

const STATUS_CFG = {
  DRAFT:    { pill: 'ces-p-mute',   label: 'Qaralama',        icon: FileText },
  SENT:     { pill: 'ces-p-warn',   label: 'Göndərilib',      icon: Send },
  APPROVED: { pill: 'ces-p-ok',     label: 'Təsdiqlənib',     icon: CheckCircle },
  RETURNED: { pill: 'ces-p-danger', label: 'Geri qaytarılıb', icon: Undo2 },
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
  const isDailyInv = workDays <= 1
  const monthly    = parseFloat(inv.monthlyRate) || 0
  const daily      = isDailyInv ? monthly : (monthly && workDays ? monthly / workDays : 0)
  const stdAmt     = daily * std
  const extDAmt    = daily * extD
  const extHAmt    = workHours ? (daily / workHours) * extH * rate : 0

  const period = (inv.periodMonth && inv.periodYear)
    ? `${MONTHS[inv.periodMonth - 1]} ${inv.periodYear}` : '—'

  return (
    <div
      className="ces-modal-backdrop"
      style={{ zIndex: 70 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="ces-modal" style={{ maxWidth: 480 }}>
        <div className="ces-m-head">
          <div className="ces-m-ic gold"><FileText size={20} /></div>
          <div className="flex-1 min-w-0">
            <h3>{inv.invoiceNumber ? `Qaime №${inv.invoiceNumber}` : 'Qaime'}</h3>
            <p>{period}</p>
          </div>
          <span className={clsx('ces-pill sm', st.pill)}>
            <StatusIcon size={11} />
            {st.label}
          </span>
          <button onClick={onClose} className="ces-modal-x" type="button" aria-label="Bağla">
            <X size={16} />
          </button>
        </div>

        <div className="ces-m-body">
          {/* Şirkət / Texnika */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {inv.companyName && (
              <div style={{ background: '#e3edfb', borderRadius: 12, padding: 12 }}>
                <p className="ces-sec-label" style={{ fontSize: 9, color: 'var(--ces-info)', marginBottom: 4 }}>Şirkət</p>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ces-ink)' }}>{inv.companyName}</p>
              </div>
            )}
            {inv.equipmentName && (
              <div style={{ background: '#efe6fd', borderRadius: 12, padding: 12 }}>
                <p className="ces-sec-label" style={{ fontSize: 9, color: 'var(--ces-alt, #7d4ec9)', marginBottom: 4 }}>Texnika</p>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ces-ink)' }}>{inv.equipmentName}</p>
              </div>
            )}
          </div>

          {/* Tarix */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ces-muted)', marginBottom: 14 }}>
            <Calendar size={13} />
            <span>Tarix:</span>
            <span className="mono" style={{ color: 'var(--ces-ink)', fontWeight: 600 }}>
              {inv.invoiceDate ? fmtDate(inv.invoiceDate) : '—'}
            </span>
            {inv.invoiceNumber && (
              <>
                <Hash size={13} style={{ marginLeft: 8 }} />
                <span className="mono" style={{ color: 'var(--ces-ink)', fontWeight: 600 }}>{inv.invoiceNumber}</span>
              </>
            )}
          </div>

          {/* Hesablama */}
          <div style={{ border: '1px solid var(--ces-line)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '8px 14px', background: 'var(--ces-graphite-50)', borderBottom: '1px solid var(--ces-line)' }}>
              <p className="ces-sec-label" style={{ margin: 0 }}>Hesablama</p>
            </div>
            <div>
              {!isDailyInv && (
                <Row label="Aylıq tarif" value={`${fmtMoney(monthly)} ₼`} />
              )}
              {!isDailyInv && (
                <Row label="Norma" value={`${workDays} gün · ${workHours} saat`} />
              )}
              <Row label={isDailyInv ? 'Günlük tarif' : 'Günlük tarif (hesabi)'} value={`${fmtMoney(daily)} ₼`} />
              {isDailyInv && workHours > 0 && (
                <Row label="Norma saat/gün" value={`${workHours} saat`} />
              )}
              {std > 0 && (
                <Row label={`Standart gün (${std} × ${fmtMoney(daily)})`} value={`${fmtMoney(stdAmt)} ₼`} />
              )}
              {extD > 0 && (
                <Row label={`Əlavə gün (${extD} × ${fmtMoney(daily)})`} value={`${fmtMoney(extDAmt)} ₼`} />
              )}
              {extH > 0 && (
                <Row label={`Əlavə saat (${extH}s × ${rate}×)`} value={`${fmtMoney(extHAmt)} ₼`} />
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--ces-ok-100)', borderTop: '1px solid #d8f3d0' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ces-ok)' }}>Cəmi</span>
              <span className="mono" style={{ fontSize: 16, fontWeight: 800, color: 'var(--ces-ok)' }}>{fmtMoney(inv.amount)} ₼</span>
            </div>
          </div>

          {/* Daşınmalar */}
          {(() => {
            const transports = parseTransportations(inv.transportations)
            if (transports.length === 0) return null
            const total = transports.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
            return (
              <div style={{ border: '1px solid #cdddf7', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ padding: '8px 14px', background: '#e3edfb', borderBottom: '1px solid #cdddf7' }}>
                  <p className="ces-sec-label" style={{ margin: 0, color: 'var(--ces-info)' }}>Texnika daşınmaları</p>
                </div>
                <div>
                  {transports.map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid var(--ces-line-2)', fontSize: 12.5 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {t.date && <span className="mono" style={{ fontSize: 10.5, color: 'var(--ces-mute2)' }}>{fmtDate(t.date)}</span>}
                        <span style={{ fontWeight: 500, color: 'var(--ces-graphite)' }}>{t.direction || '—'}</span>
                      </div>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--ces-info)' }}>{fmtMoney(parseFloat(t.amount) || 0)} ₼</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: '#e3edfb', borderTop: '1px solid #cdddf7' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ces-info)' }}>Daşınma cəmi</span>
                  <span className="mono" style={{ fontSize: 14, fontWeight: 800, color: 'var(--ces-info)' }}>{fmtMoney(total)} ₼</span>
                </div>
              </div>
            )
          })()}

          {/* Qeydlər */}
          {inv.notes && (
            <div style={{ background: 'var(--ces-gold-50)', borderRadius: 12, padding: '10px 14px' }}>
              <p className="ces-sec-label" style={{ marginBottom: 6, color: 'var(--ces-gold-700)' }}>Qeydlər</p>
              <p style={{ fontSize: 12.5, color: 'var(--ces-graphite)', whiteSpace: 'pre-wrap' }}>{inv.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid var(--ces-line-2)', fontSize: 12, color: 'var(--ces-muted)' }}>
      <span>{label}</span>
      <span className="mono" style={{ fontWeight: 600, color: 'var(--ces-graphite)' }}>{value}</span>
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
  const [aktFile, setAktFile] = useState(null)
  const [aktUploading, setAktUploading] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()
  const canCreate = useAuthStore(s => s.hasPermission('ACCOUNTING', 'canPost'))
  const canSend = canCreate
  const canDelete = useAuthStore(s => s.hasPermission('ACCOUNTING', 'canDelete'))
  const isDaily = project?.projectType === 'DAILY'
  const isLocked = project?.status !== 'ACTIVE'

  useEffect(() => { load() }, [project.id])

  async function load() {
    setLoading(true)
    try {
      const res = await accountingApi.getByProject(project.id)
      setInvoices((res.data?.data || []).filter(inv => inv.type === 'INCOME'))
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Qaimələr yüklənmədi')
    } finally {
      setLoading(false)
    }
  }

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function addTransport() {
    setForm(f => ({
      ...f,
      transportations: [...f.transportations, { date: f.invoiceDate, direction: '', amount: '' }],
    }))
  }
  function removeTransport(idx) {
    setForm(f => ({ ...f, transportations: f.transportations.filter((_, i) => i !== idx) }))
  }
  function updateTransport(idx, field, value) {
    setForm(f => ({
      ...f,
      transportations: f.transportations.map((tr, i) => i === idx ? { ...tr, [field]: value } : tr),
    }))
  }

  const transTotal = form.hasTransport
    ? form.transportations.reduce((s, tr) => s + (parseFloat(tr.amount) || 0), 0)
    : 0

  const contractorDailyRate = parseFloat(project?.contractorDailyRate || 0)
  const hasContractorRate = contractorDailyRate > 0 &&
    (project?.ownershipType === 'CONTRACTOR' || project?.ownershipType === 'INVESTOR')

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
      if (isDaily) perDay = contractorDailyRate
      else {
        const workDays = parseFloat(form.workingDaysInMonth) || 26
        perDay = contractorDailyRate / workDays
      }
      const daysAmt = perDay * totalDays
      const extHAmtC = workHours > 0 ? (perDay / workHours) * extH : 0
      contractorAmt = daysAmt + extHAmtC
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
      const transports = form.hasTransport ? form.transportations.filter(t => t.direction || t.amount) : []
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
        transportations: transports.length > 0 ? transports : null,
        transportationsTotal: transports.length > 0 ? parseFloat(transTotal.toFixed(2)) : null,
      })
      const createdId = res.data?.data?.id
      if (aktFile && createdId) {
        try {
          await accountingApi.uploadAkt(createdId, aktFile)
          toast.success('Qaimə və Akt yükləndi')
        } catch {
          toast.success('Qaimə yaradıldı')
          toast.error('Akt yüklənmədi — sonradan əlavə edə bilərsiniz')
        }
      } else {
        toast.success('Qaimə yaradıldı')
      }
      setJustCreatedId(createdId)
      setAktFile(null)
      setForm(getDefaultForm(project))
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    } finally {
      setSaving(false)
    }
  }

  async function handleOpenAkt(invoiceId, fileName) {
    try {
      const res = await accountingApi.downloadAkt(invoiceId)
      const url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' }))
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.rel = 'noreferrer'
      a.download = fileName || 'akt'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a) }, 1000)
    } catch { toast.error('Fayl açıla bilmədi') }
  }

  async function handleUploadAkt(invoiceId, file) {
    setAktUploading(true)
    try {
      await accountingApi.uploadAkt(invoiceId, file)
      toast.success('Akt yükləndi')
      load()
    } catch {
      toast.error('Akt yüklənmədi')
    } finally {
      setAktUploading(false)
    }
  }

  function handleEdit(inv) {
    setEditingInvoice(inv)
    const existingTransports = parseTransportations(inv.transportations)
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
      hasTransport:       existingTransports.length > 0,
      transportations:    existingTransports,
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
    })
    if (!ok) return

    const d = new Date(form.invoiceDate)
    setSaving(true)
    try {
      const transports = form.hasTransport ? form.transportations.filter(t => t.direction || t.amount) : []
      await accountingApi.resubmit(editingInvoice.id, {
        invoiceDate:          form.invoiceDate,
        notes:                form.notes || null,
        standardDays:         form.standardDays !== '' ? parseInt(form.standardDays) : null,
        extraDays:            form.extraDays !== '' ? parseInt(form.extraDays) : null,
        extraHours:           form.extraHours !== '' ? parseFloat(form.extraHours) : null,
        monthlyRate:          parseFloat(form.monthlyRate),
        workingDaysInMonth:   parseInt(form.workingDaysInMonth),
        workingHoursPerDay:   parseInt(form.workingHoursPerDay),
        overtimeRate:         parseFloat(form.overtimeRate) || 1,
        periodMonth:          d.getMonth() + 1,
        periodYear:           d.getFullYear(),
        transportations:      transports.length > 0 ? transports : null,
        transportationsTotal: transports.length > 0 ? parseFloat(transTotal.toFixed(2)) : null,
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
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Silmə uğursuz oldu')
    }
  }

  async function handleSend(id, periodLbl) {
    const ok = await confirm({
      title: 'Mühasibatlığa Göndər',
      message: `"${periodLbl}" qaiməsi mühasibatlığa göndərilsin?`,
      confirmText: 'Göndər',
    })
    if (!ok) return
    setSendingId(id)
    try {
      await accountingApi.sendToAccounting(id)
      toast.success('Qaimə mühasibatlığa göndərildi')
      setJustCreatedId(null)
      load()
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Göndərmə uğursuz oldu')
    } finally {
      setSendingId(null)
    }
  }

  const fieldLabel = { display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--ces-muted)', marginBottom: 5, letterSpacing: '.04em' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Locked banner */}
      {isLocked && (
        <div className="ces-alert" style={{
          borderLeftColor: project?.status === 'PENDING' ? 'var(--ces-info)' : 'var(--ces-mute2)',
          background: project?.status === 'PENDING' ? '#f0f6fd' : 'var(--ces-graphite-50)',
        }}>
          <div className="ces-al-ic" style={{
            background: project?.status === 'PENDING' ? '#e3edfb' : 'var(--ces-graphite-100)',
            color: project?.status === 'PENDING' ? 'var(--ces-info)' : 'var(--ces-muted)',
          }}>
            <Lock size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ces-graphite)' }}>
              {project?.status === 'PENDING' ? 'Layihə hələ aktiv deyil' : 'Layihə bağlanmışdır'}
            </p>
            <p style={{ fontSize: 11.5, color: 'var(--ces-muted)', marginTop: 2 }}>
              {project?.status === 'PENDING'
                ? 'Müqavilə yükləndikdən sonra qaimə yaratmaq mümkün olacaq.'
                : 'Bu layihə üzrə yeni qaimə yaratmaq mümkün deyil.'}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={15} style={{ color: 'var(--ces-gold-700)' }} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ces-ink)' }}>Qaimələr</span>
          {invoices.length > 0 && (
            <span className="ces-pill ces-p-gold sm">{invoices.length}</span>
          )}
        </div>
        {!editingInvoice && !isLocked && (
          <button onClick={() => setShowForm(v => !v)} className="ces-btn ces-btn-sm ces-btn-primary">
            {showForm ? <ChevronUp size={13} /> : <Plus size={13} />}
            {showForm ? 'Bağla' : 'Yeni qaimə'}
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && !isLocked && (
        <form
          onSubmit={editingInvoice ? handleResubmit : handleSubmit}
          style={{
            border: `1px solid ${editingInvoice ? '#fce4ea' : 'var(--ces-gold-100)'}`,
            background: editingInvoice ? 'var(--ces-danger-100)' : 'var(--ces-gold-50)',
            borderRadius: 14, padding: 16,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}
        >
          <div className="flex items-center justify-between">
            <p className="ces-sec-label" style={{ color: editingInvoice ? 'var(--ces-danger)' : 'var(--ces-gold-700)', margin: 0 }}>
              {editingInvoice ? 'Qaiməni düzəlt' : 'Yeni qaimə'}
            </p>
            {editingInvoice && (
              <button
                type="button"
                onClick={() => { setEditingInvoice(null); setShowForm(false); setForm(getDefaultForm(project)) }}
                className="ces-btn ces-btn-xs ces-btn-ghost"
              >
                Ləğv et
              </button>
            )}
          </div>

          {/* Standard + Extra days */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={fieldLabel}>Standart gün</label>
              <div className="ces-input sm">
                <input className="mono" type="number" value={form.standardDays} onChange={e => set('standardDays', e.target.value)} min="0" max="31" placeholder="0" />
              </div>
            </div>
            <div>
              <label style={fieldLabel}>Əlavə gün</label>
              <div className="ces-input sm">
                <input className="mono" type="number" value={form.extraDays} onChange={e => set('extraDays', e.target.value)} min="0" max="31" placeholder="0" />
              </div>
            </div>
          </div>

          {/* Extra hours */}
          <div>
            <label style={fieldLabel}>Əlavə saat</label>
            <div className="ces-input sm">
              <input className="mono" type="number" value={form.extraHours} onChange={e => set('extraHours', e.target.value)} min="0" step="0.5" placeholder="0" />
            </div>
          </div>

          {/* Overtime rate segmented */}
          <div>
            <label style={fieldLabel}>Əlavə saat dərəcəsi</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['1.0', 'Adi (1×)'], ['1.5', 'Əlavə (1.5×)']].map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set('overtimeRate', val)}
                  className={clsx('ces-btn ces-btn-sm', form.overtimeRate === val ? 'ces-btn-primary' : 'ces-btn-outline')}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Tarif */}
          {isDaily ? (
            <div>
              <label style={fieldLabel}>Günlük tarif (₼)</label>
              <div className="ces-input sm">
                <input className="mono" type="number" value={form.monthlyRate} onChange={e => set('monthlyRate', e.target.value)} min="0.01" step="0.01" required />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={fieldLabel}>Aylıq tarif (₼)</label>
                <div className="ces-input sm">
                  <input className="mono" type="number" value={form.monthlyRate} onChange={e => set('monthlyRate', e.target.value)} min="1" step="0.01" required />
                </div>
              </div>
              <div>
                <label style={fieldLabel}>Norma gün/ay</label>
                <div className="ces-input sm">
                  <input className="mono" type="number" value={form.workingDaysInMonth} onChange={e => set('workingDaysInMonth', e.target.value)} min="1" max="31" required />
                </div>
              </div>
            </div>
          )}

          <div>
            <label style={fieldLabel}>Norma saat/gün</label>
            <div className="ces-input sm">
              <input className="mono" type="number" value={form.workingHoursPerDay} onChange={e => set('workingHoursPerDay', e.target.value)} min="1" max="24" required />
            </div>
          </div>

          {/* Preview */}
          {calc.total > 0 && (
            <div style={{ border: '1px solid #d8f3d0', background: 'var(--ces-ok-100)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p className="ces-sec-label" style={{ color: 'var(--ces-ok)', margin: 0 }}>Hesablanmış məbləğ</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ces-muted)' }}>
                <span>{isDaily ? 'Günlük tarif' : 'Günlük tarif (hesabi)'}</span>
                <span className="mono">{fmtMoney(calc.daily)} ₼</span>
              </div>
              {calc.stdAmt > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ces-graphite)' }}>
                  <span>Standart ({form.standardDays} × {fmtMoney(calc.daily)})</span>
                  <span className="mono">{fmtMoney(calc.stdAmt)} ₼</span>
                </div>
              )}
              {calc.extDAmt > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ces-graphite)' }}>
                  <span>Əlavə gün ({form.extraDays} × {fmtMoney(calc.daily)})</span>
                  <span className="mono">{fmtMoney(calc.extDAmt)} ₼</span>
                </div>
              )}
              {calc.extHAmt > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ces-graphite)' }}>
                  <span>Əlavə saat ({form.extraHours}s × {form.overtimeRate})</span>
                  <span className="mono">{fmtMoney(calc.extHAmt)} ₼</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: 'var(--ces-ok)', borderTop: '1px solid #d8f3d0', paddingTop: 6, marginTop: 4 }}>
                <span>Müştəridən alınacaq</span>
                <span className="mono">{fmtMoney(calc.total)} ₼</span>
              </div>
              {hasContractorRate && calc.contractorAmt > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 700, color: 'var(--ces-warn)', borderTop: '1px solid #fbe6c1', paddingTop: 6, marginTop: 2 }}>
                  <span>
                    {project?.ownershipType === 'CONTRACTOR' ? 'Podratçıya ödəniləcək' : 'İnvestora ödəniləcək'}
                  </span>
                  <span className="mono">−{fmtMoney(calc.contractorAmt)} ₼</span>
                </div>
              )}
            </div>
          )}

          {/* Date */}
          <div>
            <label style={fieldLabel}>Tarix *</label>
            <div className="ces-input sm">
              <DateInput
                value={form.invoiceDate}
                onChange={e => set('invoiceDate', e.target.value)}
                required
                style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 13, padding: '8px 0', width: '100%' }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={fieldLabel}>Qeydlər</label>
            <div className="ces-input sm" style={{ alignItems: 'flex-start', paddingTop: 4, paddingBottom: 4 }}>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="İstəyə bağlı qeyd..." />
            </div>
          </div>

          {/* Transport */}
          <div style={{ border: '1px solid var(--ces-line)', background: 'var(--ces-surface)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label className="ces-chk" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.hasTransport}
                onChange={e => {
                  const checked = e.target.checked
                  setForm(f => ({
                    ...f,
                    hasTransport: checked,
                    transportations: checked && f.transportations.length === 0
                      ? [{ date: f.invoiceDate, direction: '', amount: '' }]
                      : f.transportations,
                  }))
                }}
              />
              <span className="ces-cb"></span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ces-graphite)' }}>Texnika daşınıb?</span>
            </label>

            {form.hasTransport && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {form.transportations.map((tr, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                    <div style={{ width: 110, flexShrink: 0 }}>
                      <label style={fieldLabel}>Tarix</label>
                      <div className="ces-input sm">
                        <DateInput
                          value={tr.date}
                          onChange={e => updateTransport(idx, 'date', e.target.value)}
                          style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 13, padding: '8px 0', width: '100%' }}
                        />
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={fieldLabel}>İstiqamət</label>
                      <div className="ces-input sm">
                        <input type="text" value={tr.direction} onChange={e => updateTransport(idx, 'direction', e.target.value)} placeholder="Bakı → Sumqayıt" />
                      </div>
                    </div>
                    <div style={{ width: 90, flexShrink: 0 }}>
                      <label style={fieldLabel}>Məbləğ</label>
                      <div className="ces-input sm">
                        <input className="mono" type="number" value={tr.amount} onChange={e => updateTransport(idx, 'amount', e.target.value)} min="0" step="0.01" placeholder="0.00" />
                      </div>
                    </div>
                    <button type="button" onClick={() => removeTransport(idx)} className="ces-row-act danger" style={{ marginBottom: 4 }}>
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addTransport} className="ces-btn ces-btn-xs ces-btn-outline" style={{ alignSelf: 'flex-start' }}>
                  <Plus size={12} /> Daşınma əlavə et
                </button>
                {transTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, color: 'var(--ces-gold-700)', borderTop: '1px solid var(--ces-line)', paddingTop: 8 }}>
                    <span>Daşınma cəmi</span>
                    <span className="mono">{fmtMoney(transTotal)} ₼</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Akt */}
          {!editingInvoice && (
            <div style={{ border: '1px solid var(--ces-line)', background: 'var(--ces-surface)', borderRadius: 12, padding: 12 }}>
              <label style={{ ...fieldLabel, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Paperclip size={11} /> Təhvil-Təslim Aktı <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--ces-mute2)' }}>(opsional)</span>
              </label>
              {aktFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--ces-ok-100)', border: '1px solid #d8f3d0', borderRadius: 10 }}>
                  <Paperclip size={13} style={{ color: 'var(--ces-ok)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--ces-ok)', fontWeight: 600, flex: 1, minWidth: 0 }} className="truncate">{aktFile.name}</span>
                  <button type="button" onClick={() => setAktFile(null)} className="ces-row-act danger">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    padding: '10px 12px', border: '1.5px dashed var(--ces-line)', borderRadius: 10,
                    transition: 'border-color .15s, background .15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ces-gold)'; e.currentTarget.style.background = 'var(--ces-gold-50)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ces-line)'; e.currentTarget.style.background = 'transparent' }}
                >
                  <Upload size={13} style={{ color: 'var(--ces-mute2)' }} />
                  <span style={{ fontSize: 12, color: 'var(--ces-mute2)' }}>Fayl seçin (PDF, şəkil)</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: 'none' }}
                    onChange={e => e.target.files?.[0] && setAktFile(e.target.files[0])} />
                </label>
              )}
              <p style={{ fontSize: 10.5, color: 'var(--ces-mute2)', marginTop: 6 }}>Yüklənməsə də qaimə yaradıla bilər.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || calc.total <= 0 || !canCreate}
            className={clsx('ces-btn', editingInvoice ? '' : 'ces-btn-primary')}
            style={{
              justifyContent: 'center',
              background: editingInvoice ? 'var(--ces-danger)' : undefined,
              color: editingInvoice ? '#fff' : undefined,
            }}
          >
            {saving
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Göndərilir...</>
              : editingInvoice
                ? <><Send size={13} /> Düzəlt və göndər</>
                : 'Qaimə yarat'}
          </button>

          {/* Success message */}
          {justCreatedId && !saving && !editingInvoice && (
            <div className="ces-alert" style={{ borderLeftColor: 'var(--ces-ok)', background: 'var(--ces-ok-100)' }}>
              <div className="ces-al-ic" style={{ background: '#e8fbe5', color: 'var(--ces-ok)' }}>
                <CheckCircle size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ces-ok)', marginBottom: 8 }}>Qaimə uğurla yaradıldı!</p>
                <div className="flex gap-2">
                  {canSend && (
                    <button
                      type="button"
                      onClick={() => handleSend(justCreatedId, periodLabel(form.periodMonth, form.periodYear))}
                      disabled={sendingId === justCreatedId}
                      className="ces-btn ces-btn-sm ces-btn-primary"
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      {sendingId === justCreatedId
                        ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Göndərilir...</>
                        : <><Send size={12} /> Mühasibatlığa göndər</>}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setJustCreatedId(null)}
                    className="ces-btn ces-btn-sm ces-btn-ghost"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Bağla
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Invoice list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <span style={{ width: 22, height: 22, border: '2px solid var(--ces-line)', borderTopColor: 'var(--ces-gold)', borderRadius: 999, animation: 'ces-spin .8s linear infinite' }} />
        </div>
      ) : invoices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 24px', border: '1.5px dashed var(--ces-line)', borderRadius: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--ces-graphite-50)', color: 'var(--ces-mute2)', display: 'inline-grid', placeItems: 'center', marginBottom: 12 }}>
            <FileText size={26} />
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--ces-muted)' }}>Hələ qaimə yoxdur</p>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--ces-line)', borderRadius: 14, overflow: 'hidden' }}>
          {invoices.map(inv => {
            const periodLbl = periodLabel(inv.periodMonth, inv.periodYear)
            const statusCfg = STATUS_CFG[inv.status] || STATUS_CFG.DRAFT
            const StatusIcon = statusCfg.icon
            return (
              <div
                key={inv.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', background: 'var(--ces-surface)',
                  borderBottom: '1px solid var(--ces-line-2)',
                  transition: 'background .15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ces-graphite-50)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ces-surface)' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ces-ink)' }}>{periodLbl}</span>
                    <span className={clsx('ces-pill sm', statusCfg.pill)}>
                      <StatusIcon size={11} />
                      {statusCfg.label}
                    </span>
                    {inv.invoiceNumber && (
                      <span className="mono" style={{ fontSize: 11, color: 'var(--ces-mute2)' }}>№{inv.invoiceNumber}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap" style={{ fontSize: 11, color: 'var(--ces-muted)' }}>
                    {inv.standardDays != null && <span>Std: {inv.standardDays} gün</span>}
                    {inv.extraDays != null && inv.extraDays > 0 && <span>Əl: {inv.extraDays} gün</span>}
                    {inv.extraHours != null && inv.extraHours > 0 && <span>Əl: {inv.extraHours} saat</span>}
                    <span className="mono">{fmtDate(inv.invoiceDate)}</span>
                    {parseTransportations(inv.transportations).length > 0 && (
                      <span style={{ color: 'var(--ces-info)', fontWeight: 600 }}>
                        • Daşınma: <span className="mono">{fmtMoney(inv.transportationsTotal || 0)} ₼</span>
                      </span>
                    )}
                  </div>
                </div>
                <span className="mono" style={{ fontSize: 14, fontWeight: 800, color: 'var(--ces-ok)', whiteSpace: 'nowrap' }}>
                  {fmtMoney(inv.amount)} ₼
                </span>
                <div className="flex items-center gap-0.5">
                  {inv.aktFileUploaded ? (
                    <button onClick={() => handleOpenAkt(inv.id, inv.aktFileName)} className="ces-row-act" style={{ color: 'var(--ces-ok)' }} title={`Akt: ${inv.aktFileName || 'Fayla bax'}`}>
                      <Paperclip size={13} />
                    </button>
                  ) : (
                    !isLocked && canCreate && (
                      <label className="ces-row-act gold" title="Akt yüklə" style={{ cursor: 'pointer' }}>
                        <Upload size={13} />
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: 'none' }}
                          disabled={aktUploading}
                          onChange={e => { if (e.target.files?.[0]) handleUploadAkt(inv.id, e.target.files[0]) }} />
                      </label>
                    )
                  )}
                  <button onClick={() => setViewInvoice(inv)} className="ces-row-act gold" title="Qaiməyə bax">
                    <Eye size={13} />
                  </button>
                  {!isLocked && inv.status === 'RETURNED' && canSend && (
                    <button onClick={() => handleEdit(inv)} className="ces-row-act danger" title="Düzəlt və göndər">
                      <Pencil size={13} />
                    </button>
                  )}
                  {!isLocked && inv.status === 'DRAFT' && canSend && (
                    <button onClick={() => handleSend(inv.id, periodLbl)} disabled={sendingId === inv.id} className="ces-row-act info" title="Mühasibatlığa göndər">
                      <Send size={13} />
                    </button>
                  )}
                  {!isLocked && (inv.status === 'DRAFT' || inv.status === 'RETURNED') && canDelete && (
                    <button onClick={() => handleDelete(inv.id)} className="ces-row-act danger" title="Sil">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--ces-ok-100)', borderTop: '1px solid #d8f3d0' }}>
            <span className="ces-sec-label" style={{ color: 'var(--ces-ok)', margin: 0 }}>Ümumi cəmi</span>
            <span className="mono" style={{ fontSize: 14, fontWeight: 800, color: 'var(--ces-ok)' }}>
              {fmtMoney(invoices.reduce((s, inv) => s + parseFloat(inv.amount || 0), 0))} ₼
            </span>
          </div>
        </div>
      )}

      <ConfirmDialog />
      {viewInvoice && <InvoiceDetailModal inv={viewInvoice} onClose={() => setViewInvoice(null)} />}
    </div>
  )
}
