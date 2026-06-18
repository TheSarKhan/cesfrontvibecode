import DateInput from '../../components/common/DateInput'
import { useState, useEffect, useMemo } from 'react'
import { Plus, FileText, ChevronUp, Send, Lock, CheckCircle, Undo2, Eye, X, Calendar, Hash, Pencil, Trash2, Paperclip, Upload } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import toast from 'react-hot-toast'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useAuthStore } from '../../store/authStore'
import { clsx } from 'clsx'
import { fmtDate } from '../../utils/date'
import NumberInput from '../../components/common/NumberInput'

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

function getDefaultForm() {
  return {
    invoiceDate: new Date().toISOString().slice(0, 10),
    notes: '',
  }
}

// Layihənin texnika xətlərindən (və ya tək-texnikalı legacy layihədən) sətir formaları qur
function buildInitialLines(project) {
  const isDaily = project?.projectType === 'DAILY'
  const lines = project?.equipmentLines || []
  if (lines.length > 0) {
    return lines.map((l, idx) => ({
      lineId: l.id,
      equipmentId: l.equipmentId ?? null,
      equipmentName: l.equipmentName || '—',
      equipmentCode: l.equipmentCode || '',
      ownershipType: l.ownershipType,
      planEquipmentPrice: l.equipmentPrice,            // sahibə (cost)
      customerEquipmentPrice: l.customerEquipmentPrice, // müştəri tarifi
      included: idx === 0,                              // ilk texnika default seçili
      standardDays: '', extraDays: '', extraHours: '', overtimeRate: '1.0',
      monthlyRate: l.customerEquipmentPrice != null ? String(l.customerEquipmentPrice) : '',
      workingDaysInMonth: isDaily ? 1 : 26,
      workingHoursPerDay: 9,
      hasTransport: false,
      transports: [],
      aktFile: null, aktFileUploaded: false, aktFileName: null,
    }))
  }
  // Legacy: tək-texnikalı layihə (xətt yoxdur) — sintetik tək sətir
  return [{
    lineId: null,
    equipmentId: project?.equipmentId ?? null,
    equipmentName: project?.equipmentName || '—',
    equipmentCode: '',
    ownershipType: project?.ownershipType,
    planEquipmentPrice: project?.planEquipmentPrice,
    customerEquipmentPrice: project?.planEquipmentPrice,
    included: true,
    standardDays: '', extraDays: '', extraHours: '', overtimeRate: '1.0',
    monthlyRate: project?.planEquipmentPrice != null ? String(project.planEquipmentPrice) : (isDaily ? '' : '14000'),
    workingDaysInMonth: isDaily ? 1 : 26,
    workingHoursPerDay: 9,
    hasTransport: false,
    transports: [],
    aktFile: null, aktFileUploaded: false, aktFileName: null,
  }]
}

// İnvestora / podratçıya ödəniləcək məbləğ (sahibə cost dərəcəsi × gün/saat).
function computeContractorAmt(src, { std = 0, extD = 0, extH = 0, workDays = 26, workHours = 9, isDaily = false } = {}) {
  if (!src) return 0
  const owned = src.ownershipType === 'CONTRACTOR' || src.ownershipType === 'INVESTOR'
  if (!owned) return 0
  let dailyRate = parseFloat(src.contractorDailyRate || 0)
  if (dailyRate <= 0) dailyRate = parseFloat(src.planEquipmentPrice || 0)
  if (dailyRate > 0) {
    const perDay = isDaily ? dailyRate : dailyRate / (workDays || 26)
    const daysAmt = perDay * (std + extD)
    const extHAmt = workHours > 0 ? (perDay / workHours) * extH : 0
    return daysAmt + extHAmt
  }
  const payment = parseFloat(src.contractorPayment || 0)
  return payment > 0 ? payment : 0
}

function contractorPayLabel(ownershipType) {
  return ownershipType === 'CONTRACTOR' ? 'Podratçıya ödəniləcək' : 'İnvestora ödəniləcək'
}

// Bir sətrin müştəri məbləği (texnika) — daşınmasız
function lineEquipmentAmount(lf, isDaily) {
  const std = parseFloat(lf.standardDays) || 0
  const extD = parseFloat(lf.extraDays) || 0
  const extH = parseFloat(lf.extraHours) || 0
  const rate = parseFloat(lf.overtimeRate) || 1
  const workHours = parseFloat(lf.workingHoursPerDay) || 9
  let daily
  if (isDaily) {
    daily = parseFloat(lf.monthlyRate) || 0
  } else {
    const monthly = parseFloat(lf.monthlyRate) || 0
    const workDays = parseFloat(lf.workingDaysInMonth) || 26
    daily = workDays ? monthly / workDays : 0
  }
  const stdAmt = daily * std
  const extDAmt = daily * extD
  const extHAmt = workHours ? (daily / workHours) * extH * rate : 0
  return { daily, stdAmt, extDAmt, extHAmt, total: stdAmt + extDAmt + extHAmt }
}

function lineTransportTotal(lf) {
  if (!lf.hasTransport) return 0
  return (lf.transports || []).reduce((s, tr) => s + (parseFloat(tr.amount) || 0), 0)
}

const STATUS_CFG = {
  DRAFT:    { pill: 'ces-p-mute',   label: 'Qaralama',        icon: FileText },
  SENT:     { pill: 'ces-p-warn',   label: 'Göndərilib',      icon: Send },
  APPROVED: { pill: 'ces-p-ok',     label: 'Təsdiqlənib',     icon: CheckCircle },
  RETURNED: { pill: 'ces-p-danger', label: 'Geri qaytarılıb', icon: Undo2 },
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid var(--ces-line-2)', fontSize: 12, color: 'var(--ces-muted)' }}>
      <span>{label}</span>
      <span className="mono" style={{ fontWeight: 600, color: 'var(--ces-graphite)' }}>{value}</span>
    </div>
  )
}

function InvoiceDetailModal({ inv, project, onClose, onChanged, canEdit = false }) {
  const [data, setData] = useState(inv)
  const [busyLine, setBusyLine] = useState(null)
  useEffect(() => { setData(inv) }, [inv])
  if (!inv) return null
  const st = STATUS_CFG[data.status] || STATUS_CFG.DRAFT
  const StatusIcon = st.icon
  const isDaily = project?.projectType === 'DAILY'
  const period = (data.periodMonth && data.periodYear) ? `${MONTHS[data.periodMonth - 1]} ${data.periodYear}` : '—'
  const lines = data.lines || []
  const hasLines = lines.length > 0
  const editable = canEdit && (data.status === 'DRAFT' || data.status === 'RETURNED')

  const refresh = async () => {
    try { const r = await accountingApi.getById(inv.id); setData(r.data.data) } catch {}
    onChanged?.()
  }
  const openLineAkt = async (lineId) => {
    try {
      const res = await accountingApi.downloadLineAkt(inv.id, lineId)
      const url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' }))
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch { toast.error('Akt açıla bilmədi') }
  }
  const uploadLineAktFile = async (lineId, file) => {
    if (!file) return
    setBusyLine(lineId)
    try { await accountingApi.uploadLineAkt(inv.id, lineId, file); toast.success('Akt yükləndi'); await refresh() }
    catch { toast.error('Akt yüklənmədi') }
    finally { setBusyLine(null) }
  }

  // Köhnə tək-texnikalı qaimə üçün hesablama (sətir yoxdursa)
  const legacy = (() => {
    const workDays = parseFloat(inv.workingDaysInMonth) || 26
    const workHours = parseFloat(inv.workingHoursPerDay) || 9
    const std = parseFloat(inv.standardDays) || 0
    const extD = parseFloat(inv.extraDays) || 0
    const extH = parseFloat(inv.extraHours) || 0
    const rate = parseFloat(inv.overtimeRate) || 1
    const isDailyInv = workDays <= 1
    const monthly = parseFloat(inv.monthlyRate) || 0
    const daily = isDailyInv ? monthly : (monthly && workDays ? monthly / workDays : 0)
    return { workDays, workHours, std, extD, extH, rate, isDailyInv, monthly, daily }
  })()

  return (
    <div className="ces-modal-backdrop" style={{ zIndex: 70 }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ces-modal" style={{ maxWidth: 520 }}>
        <div className="ces-m-head">
          <div className="ces-m-ic gold"><FileText size={20} /></div>
          <div className="flex-1 min-w-0">
            <h3>{inv.invoiceNumber ? `Qaime №${inv.invoiceNumber}` : 'Qaime'}</h3>
            <p>{period}{hasLines ? ` · ${lines.length} texnika` : ''}</p>
          </div>
          <span className={clsx('ces-pill sm', st.pill)}><StatusIcon size={11} />{st.label}</span>
          <button onClick={onClose} className="ces-modal-x" type="button" aria-label="Bağla"><X size={16} /></button>
        </div>

        <div className="ces-m-body">
          {/* Tarix */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ces-muted)', marginBottom: 14 }}>
            <Calendar size={13} /><span>Tarix:</span>
            <span className="mono" style={{ color: 'var(--ces-ink)', fontWeight: 600 }}>{inv.invoiceDate ? fmtDate(inv.invoiceDate) : '—'}</span>
            {inv.invoiceNumber && (<><Hash size={13} style={{ marginLeft: 8 }} /><span className="mono" style={{ color: 'var(--ces-ink)', fontWeight: 600 }}>{inv.invoiceNumber}</span></>)}
          </div>

          {hasLines ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {lines.map((ln) => {
                const ownerLine = (project?.equipmentLines || []).find(l =>
                  (ln.equipmentId && l.equipmentId === ln.equipmentId) || (ln.planItemId && l.id === ln.planItemId))
                const ownership = ownerLine?.ownershipType || ln.ownershipType
                const ownerAmt = computeContractorAmt(
                  { ownershipType: ownership, planEquipmentPrice: ownerLine?.equipmentPrice },
                  { std: ln.standardDays || 0, extD: ln.extraDays || 0, extH: parseFloat(ln.extraHours) || 0,
                    workDays: isDaily ? 1 : (ln.workingDaysInMonth || 26), workHours: ln.workingHoursPerDay || 9, isDaily })
                return (
                  <div key={ln.id} style={{ border: '1px solid var(--ces-line)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 14px', background: '#efe6fd', borderBottom: '1px solid var(--ces-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1f2937' }}>🔧 {ln.equipmentName}{ln.equipmentCode ? ` (${ln.equipmentCode})` : ''}</span>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 800, color: 'var(--ces-ok)' }}>{fmtMoney(ln.lineTotal)} ₼</span>
                    </div>
                    <div>
                      {ln.standardDays > 0 && <Row label={`Standart gün`} value={`${ln.standardDays}`} />}
                      {ln.extraDays > 0 && <Row label={`Əlavə gün`} value={`${ln.extraDays}`} />}
                      {ln.extraHours > 0 && <Row label={`Əlavə saat`} value={`${ln.extraHours}`} />}
                      <Row label="Texnika məbləği" value={`${fmtMoney(ln.equipmentAmount)} ₼`} />
                      {ln.transportAmount > 0 && <Row label="Daşınma" value={`${fmtMoney(ln.transportAmount)} ₼`} />}
                      {ownerAmt > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: 'var(--ces-warn-100, #fff7ec)', fontSize: 12 }}>
                          <span style={{ fontWeight: 700, color: 'var(--ces-warn)' }}>{contractorPayLabel(ownership)}</span>
                          <span className="mono" style={{ fontWeight: 800, color: 'var(--ces-warn)' }}>−{fmtMoney(ownerAmt)} ₼</span>
                        </div>
                      )}
                      {/* Təhvil-təslim aktı */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', fontSize: 12, borderTop: '1px solid var(--ces-line-2)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: ln.aktFileUploaded ? 'var(--ces-ok)' : 'var(--ces-mute2)', fontWeight: 600 }}>
                          <Paperclip size={12} /> Təhvil-təslim aktı {ln.aktFileUploaded ? '· var' : '· yoxdur'}
                        </span>
                        <span className="flex items-center gap-1">
                          {ln.aktFileUploaded && (
                            <button type="button" onClick={() => openLineAkt(ln.id)} className="ces-row-act" style={{ color: 'var(--ces-ok)' }} title="Aktı aç"><Eye size={13} /></button>
                          )}
                          {editable && (
                            <label className="ces-row-act gold" style={{ cursor: busyLine === ln.id ? 'wait' : 'pointer' }} title={ln.aktFileUploaded ? 'Dəyiş' : 'Akt yüklə'}>
                              <Upload size={13} />
                              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: 'none' }} disabled={busyLine === ln.id}
                                onChange={e => { if (e.target.files?.[0]) uploadLineAktFile(ln.id, e.target.files[0]) }} />
                            </label>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--ces-ok-100)', border: '1px solid #d8f3d0', borderRadius: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ces-ok)' }}>Müştəridən alınacaq (cəm)</span>
                <span className="mono" style={{ fontSize: 16, fontWeight: 800, color: 'var(--ces-ok)' }}>{fmtMoney(inv.amount)} ₼</span>
              </div>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--ces-line)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
              {inv.equipmentName && <Row label="Texnika" value={inv.equipmentName} />}
              {!legacy.isDailyInv && <Row label="Aylıq tarif" value={`${fmtMoney(legacy.monthly)} ₼`} />}
              <Row label={legacy.isDailyInv ? 'Günlük tarif' : 'Günlük tarif (hesabi)'} value={`${fmtMoney(legacy.daily)} ₼`} />
              {legacy.std > 0 && <Row label={`Standart gün (${legacy.std})`} value={`${fmtMoney(legacy.daily * legacy.std)} ₼`} />}
              {legacy.extD > 0 && <Row label={`Əlavə gün (${legacy.extD})`} value={`${fmtMoney(legacy.daily * legacy.extD)} ₼`} />}
              {legacy.extH > 0 && <Row label={`Əlavə saat (${legacy.extH})`} value={`${fmtMoney(legacy.workHours ? (legacy.daily / legacy.workHours) * legacy.extH * legacy.rate : 0)} ₼`} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--ces-ok-100)', borderTop: '1px solid #d8f3d0' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ces-ok)' }}>Müştəridən alınacaq</span>
                <span className="mono" style={{ fontSize: 16, fontWeight: 800, color: 'var(--ces-ok)' }}>{fmtMoney(inv.amount)} ₼</span>
              </div>
            </div>
          )}

          {/* Daşınmalar (qaimə səviyyəsi) */}
          {(inv.transports || []).length > 0 && (
            <div style={{ border: '1px solid #cdddf7', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ padding: '8px 14px', background: '#e3edfb', borderBottom: '1px solid #cdddf7' }}>
                <p className="ces-sec-label" style={{ margin: 0, color: '#2563eb' }}>Texnika daşınmaları</p>
              </div>
              <div>
                {inv.transports.map((t, i) => (
                  <div key={t.id ?? i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid var(--ces-line-2)', fontSize: 12.5 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {t.transportDate && <span className="mono" style={{ fontSize: 10.5, color: 'var(--ces-mute2)' }}>{fmtDate(t.transportDate)}</span>}
                      <span style={{ fontWeight: 500, color: 'var(--ces-graphite)' }}>{t.transportDirection || '—'}</span>
                    </div>
                    <span className="mono" style={{ fontWeight: 700, color: '#2563eb' }}>{fmtMoney(parseFloat(t.transportAmount) || 0)} ₼</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: '#e3edfb', borderTop: '1px solid #cdddf7' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#2563eb' }}>Daşınma cəmi</span>
                <span className="mono" style={{ fontSize: 14, fontWeight: 800, color: '#2563eb' }}>{fmtMoney(inv.totalTransportAmount || 0)} ₼</span>
              </div>
            </div>
          )}

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

const fieldLabel = { display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--ces-muted)', marginBottom: 5, letterSpacing: '.04em' }
const tariffBox = { padding: '8px 12px', background: 'var(--ces-graphite-50)', border: '1px solid var(--ces-line)', borderRadius: 10, fontSize: 13, color: 'var(--ces-ink)', fontWeight: 600 }

// ─── Bir texnika sətrinin forması (kart) ───────────────────────────────────
function LineCard({ lf, idx, isDaily, ratesUnlocked, onChange }) {
  const set = (field, value) => onChange(idx, { ...lf, [field]: value })
  const calc = lineEquipmentAmount(lf, isDaily)
  const trTotal = lineTransportTotal(lf)
  const owned = lf.ownershipType === 'CONTRACTOR' || lf.ownershipType === 'INVESTOR'
  const ownerAmt = computeContractorAmt(
    { ownershipType: lf.ownershipType, planEquipmentPrice: lf.planEquipmentPrice },
    { std: parseFloat(lf.standardDays) || 0, extD: parseFloat(lf.extraDays) || 0, extH: parseFloat(lf.extraHours) || 0,
      workDays: isDaily ? 1 : (parseFloat(lf.workingDaysInMonth) || 26), workHours: parseFloat(lf.workingHoursPerDay) || 9, isDaily })

  const addTransport = () => set('transports', [...(lf.transports || []), { date: '', direction: '', amount: '' }])
  const removeTransport = (i) => set('transports', lf.transports.filter((_, j) => j !== i))
  const updateTransport = (i, field, value) => set('transports', lf.transports.map((tr, j) => j === i ? { ...tr, [field]: value } : tr))

  return (
    <div style={{ border: `1px solid ${lf.included ? 'var(--ces-gold-100)' : 'var(--ces-line)'}`, background: lf.included ? 'var(--ces-surface)' : 'var(--ces-graphite-50)', borderRadius: 12, padding: 12 }}>
      <label className="ces-chk" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={lf.included} onChange={(e) => set('included', e.target.checked)} />
        <span className="ces-cb"></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ces-ink)' }}>{lf.equipmentName}</span>
          {lf.equipmentCode && <span className="mono" style={{ fontSize: 11, color: 'var(--ces-mute2)', marginLeft: 6 }}>({lf.equipmentCode})</span>}
          <span style={{ fontSize: 10.5, color: 'var(--ces-mute2)', marginLeft: 6 }}>
            · {lf.ownershipType === 'CONTRACTOR' ? 'Podratçı' : lf.ownershipType === 'INVESTOR' ? 'İnvestor' : 'Şirkət'}
          </span>
        </span>
        {lf.included && calc.total > 0 && (
          <span className="mono" style={{ fontSize: 13, fontWeight: 800, color: 'var(--ces-ok)' }}>{fmtMoney(calc.total + trTotal)} ₼</span>
        )}
      </label>

      {lf.included && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div>
              <label style={fieldLabel}>Standart gün</label>
              <div className="ces-input sm"><NumberInput className="mono" value={lf.standardDays} onChange={e => set('standardDays', e.target.value)} min="0" max="31" placeholder="0" /></div>
            </div>
            <div>
              <label style={fieldLabel}>Əlavə gün</label>
              <div className="ces-input sm"><NumberInput className="mono" value={lf.extraDays} onChange={e => set('extraDays', e.target.value)} min="0" max="31" placeholder="0" /></div>
            </div>
            <div>
              <label style={fieldLabel}>Əlavə saat</label>
              <div className="ces-input sm"><NumberInput decimal className="mono" value={lf.extraHours} onChange={e => set('extraHours', e.target.value)} min="0" placeholder="0" /></div>
            </div>
          </div>

          <div>
            <label style={fieldLabel}>Əlavə saat dərəcəsi</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['1.0', 'Adi (1×)'], ['1.5', 'Əlavə (1.5×)']].map(([val, lbl]) => (
                <button key={val} type="button" onClick={() => set('overtimeRate', val)}
                  className={clsx('ces-btn ces-btn-sm', lf.overtimeRate === val ? 'ces-btn-primary' : 'ces-btn-outline')}
                  style={{ flex: 1, justifyContent: 'center' }}>{lbl}</button>
              ))}
            </div>
          </div>

          {isDaily ? (
            <div>
              <label style={fieldLabel}>Günlük tarif (₼)</label>
              {ratesUnlocked
                ? <div className="ces-input sm"><NumberInput decimal className="mono" value={lf.monthlyRate} onChange={e => set('monthlyRate', e.target.value)} min="0.01" /></div>
                : <div style={tariffBox} className="mono">{lf.monthlyRate || '—'} <span style={{ color: 'var(--ces-muted)', fontWeight: 400 }}>₼</span></div>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <label style={fieldLabel}>Aylıq tarif (₼)</label>
                {ratesUnlocked
                  ? <div className="ces-input sm"><NumberInput decimal className="mono" value={lf.monthlyRate} onChange={e => set('monthlyRate', e.target.value)} min="1" /></div>
                  : <div style={tariffBox} className="mono">{lf.monthlyRate || '—'}</div>}
              </div>
              <div>
                <label style={fieldLabel}>Norma gün/ay</label>
                {ratesUnlocked
                  ? <div className="ces-input sm"><NumberInput className="mono" value={lf.workingDaysInMonth} onChange={e => set('workingDaysInMonth', e.target.value)} min="1" max="31" /></div>
                  : <div style={tariffBox} className="mono">{lf.workingDaysInMonth || '—'}</div>}
              </div>
              <div>
                <label style={fieldLabel}>Norma saat/gün</label>
                {ratesUnlocked
                  ? <div className="ces-input sm"><NumberInput className="mono" value={lf.workingHoursPerDay} onChange={e => set('workingHoursPerDay', e.target.value)} min="1" max="24" /></div>
                  : <div style={tariffBox} className="mono">{lf.workingHoursPerDay || '—'}</div>}
              </div>
            </div>
          )}

          {/* Preview */}
          {(calc.total > 0 || ownerAmt > 0) && (
            <div style={{ border: '1px solid #d8f3d0', background: 'var(--ces-ok-100)', borderRadius: 10, padding: 10, fontSize: 11.5 }}>
              {calc.total > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--ces-ok)' }}>
                  <span>Müştəridən{trTotal > 0 ? ' (+daşınma)' : ''}</span>
                  <span className="mono">{fmtMoney(calc.total + trTotal)} ₼</span>
                </div>
              )}
              {owned && ownerAmt > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--ces-warn)', marginTop: 2 }}>
                  <span>{contractorPayLabel(lf.ownershipType)}</span>
                  <span className="mono">−{fmtMoney(ownerAmt)} ₼</span>
                </div>
              )}
            </div>
          )}

          {/* Daşınma (sətir başına) */}
          <div>
            <label className="ces-chk" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={lf.hasTransport}
                onChange={e => {
                  const checked = e.target.checked
                  onChange(idx, {
                    ...lf,
                    hasTransport: checked,
                    transports: checked && (!lf.transports || lf.transports.length === 0)
                      ? [{ date: '', direction: '', amount: '' }]
                      : (lf.transports || []),
                  })
                }} />
              <span className="ces-cb"></span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ces-graphite)' }}>Bu texnika daşınıb?</span>
            </label>
            {lf.hasTransport && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {(lf.transports || []).map((tr, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                    <div style={{ width: 110, flexShrink: 0 }}>
                      <label style={fieldLabel}>Tarix</label>
                      <div className="ces-input sm"><DateInput value={tr.date} onChange={e => updateTransport(i, 'date', e.target.value)} style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 13, padding: '8px 0', width: '100%' }} /></div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={fieldLabel}>İstiqamət</label>
                      <div className="ces-input sm"><input type="text" value={tr.direction} onChange={e => updateTransport(i, 'direction', e.target.value)} placeholder="Bakı → Sumqayıt" /></div>
                    </div>
                    <div style={{ width: 90, flexShrink: 0 }}>
                      <label style={fieldLabel}>Məbləğ</label>
                      <div className="ces-input sm"><NumberInput decimal className="mono" value={tr.amount} onChange={e => updateTransport(i, 'amount', e.target.value)} min="0" placeholder="0.00" /></div>
                    </div>
                    <button type="button" onClick={() => removeTransport(i)} className="ces-row-act danger" style={{ marginBottom: 4 }}><X size={13} /></button>
                  </div>
                ))}
                <button type="button" onClick={addTransport} className="ces-btn ces-btn-xs ces-btn-outline" style={{ alignSelf: 'flex-start' }}>
                  <Plus size={12} /> Daşınma əlavə et
                </button>
              </div>
            )}
          </div>

          {/* Təhvil-təslim aktı (bu texnikanın) */}
          <div>
            <label style={{ ...fieldLabel, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Paperclip size={11} /> Təhvil-təslim aktı <span style={{ color: 'var(--ces-danger)' }}>*</span>
            </label>
            {lf.aktFile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--ces-ok-100)', border: '1px solid #d8f3d0', borderRadius: 10 }}>
                <Paperclip size={12} style={{ color: 'var(--ces-ok)', flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: 'var(--ces-ok)', fontWeight: 600, flex: 1, minWidth: 0 }} className="truncate">{lf.aktFile.name}</span>
                <button type="button" onClick={() => set('aktFile', null)} className="ces-row-act danger"><X size={12} /></button>
              </div>
            ) : lf.aktFileUploaded ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--ces-ok-100)', border: '1px solid #d8f3d0', borderRadius: 10 }}>
                <CheckCircle size={12} style={{ color: 'var(--ces-ok)', flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: 'var(--ces-ok)', fontWeight: 600, flex: 1, minWidth: 0 }} className="truncate">Yüklənib: {lf.aktFileName || 'akt'}</span>
                <label className="ces-btn ces-btn-xs ces-btn-ghost" style={{ cursor: 'pointer' }}>
                  Dəyiş
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && set('aktFile', e.target.files[0])} />
                </label>
              </div>
            ) : (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 10px', border: '1.5px dashed var(--ces-line)', borderRadius: 10 }}>
                <Upload size={12} style={{ color: 'var(--ces-mute2)' }} />
                <span style={{ fontSize: 11.5, color: 'var(--ces-mute2)' }}>Akt faylı seçin</span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && set('aktFile', e.target.files[0])} />
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProjectQaimeTab({ project }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(getDefaultForm())
  const [lineForms, setLineForms] = useState(() => buildInitialLines(project))
  const [sendingId, setSendingId] = useState(null)
  const [justCreatedId, setJustCreatedId] = useState(null)
  const [viewInvoice, setViewInvoice] = useState(null)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [ratesUnlocked, setRatesUnlocked] = useState(false)
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
  function updateLine(idx, next) { setLineForms(arr => arr.map((l, i) => i === idx ? next : l)) }

  function resetForm() {
    setForm(getDefaultForm())
    setLineForms(buildInitialLines(project))
    setRatesUnlocked(false)
  }

  const includedLines = lineForms.filter(l => l.included)
  const grandTotal = useMemo(() => includedLines.reduce((s, lf) => {
    const c = lineEquipmentAmount(lf, isDaily)
    return s + c.total + lineTransportTotal(lf)
  }, 0), [lineForms, isDaily]) // eslint-disable-line react-hooks/exhaustive-deps

  // Payload: seçilmiş sətirlərdən lines[] + transports[]
  function buildPayloadLines() {
    const lines = []
    const transports = []
    for (const lf of includedLines) {
      lines.push({
        equipmentId: lf.equipmentId || null,
        equipmentName: lf.equipmentName,
        planItemId: lf.lineId || null,
        unitPrice: lf.monthlyRate !== '' ? parseFloat(lf.monthlyRate) : null,
        dayCount: (parseInt(lf.standardDays) || 0) + (parseInt(lf.extraDays) || 0) || null,
        monthlyRate: lf.monthlyRate !== '' ? parseFloat(lf.monthlyRate) : null,
        workingDaysInMonth: parseInt(lf.workingDaysInMonth) || (isDaily ? 1 : 26),
        workingHoursPerDay: parseInt(lf.workingHoursPerDay) || 9,
        standardDays: lf.standardDays !== '' ? parseInt(lf.standardDays) : null,
        extraDays: lf.extraDays !== '' ? parseInt(lf.extraDays) : null,
        extraHours: lf.extraHours !== '' ? parseFloat(lf.extraHours) : null,
        overtimeRate: parseFloat(lf.overtimeRate) || 1,
      })
      if (lf.hasTransport) {
        for (const tr of (lf.transports || [])) {
          const amt = parseFloat(tr.amount)
          // Yalnız tam doldurulmuş daşınma sətri göndərilir (istiqamət + müsbət məbləğ).
          // Boş/yarımçıq sətirlər ötürülmür ki, daşınma seçilməyəndə "tələb olunur" xətası çıxmasın.
          if (!tr.direction || !tr.direction.trim() || !(amt > 0)) continue
          transports.push({
            equipmentId: lf.equipmentId || null,
            transportDate: tr.date || form.invoiceDate,
            transportDirection: tr.direction.trim(),
            transportAmount: amt,
          })
        }
      }
    }
    return { lines, transports }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.invoiceDate) return toast.error('Tarix seçilməlidir')
    if (includedLines.length === 0) return toast.error('Ən azı bir texnika seçilməlidir')
    if (grandTotal <= 0) return toast.error('Məbləğ 0-dan böyük olmalıdır')
    if (!includedLines.every(l => l.aktFile || l.aktFileUploaded)) {
      return toast.error('Hər texnika üçün təhvil-təslim aktı yüklənməlidir')
    }

    const ok = await confirm({
      title: 'Qaime Yaratma',
      message: `${includedLines.length} texnika · ${fmtMoney(grandTotal)} ₼ məbləğli qaime yaradılsın?`,
      confirmText: 'Bəli, yarat',
    })
    if (!ok) return

    const d = new Date(form.invoiceDate)
    const { lines, transports } = buildPayloadLines()
    setSaving(true)
    try {
      const res = await accountingApi.create({
        type: 'INCOME',
        projectId: project.id,
        companyName: project.companyName || '',
        invoiceDate: form.invoiceDate,
        notes: form.notes || null,
        amount: parseFloat(grandTotal.toFixed(2)),
        periodMonth: d.getMonth() + 1,
        periodYear: d.getFullYear(),
        status: 'DRAFT',
        hasTransport: transports.length > 0,
        transports: transports.length > 0 ? transports : null,
        lines,
      })
      const created = res.data?.data
      const createdId = created?.id
      // Hər texnika sətrinin aktını yüklə (sətir id-sini uyğunlaşdır)
      let aktFail = false
      const createdLines = created?.lines || []
      for (const lf of includedLines) {
        if (!lf.aktFile) continue
        const cl = createdLines.find(c =>
          (lf.lineId && c.planItemId === lf.lineId) || (lf.equipmentId && c.equipmentId === lf.equipmentId))
        if (cl && createdId) {
          try { await accountingApi.uploadLineAkt(createdId, cl.id, lf.aktFile) } catch { aktFail = true }
        }
      }
      toast.success(aktFail ? 'Qaimə yaradıldı (bəzi aktlar yüklənmədi)' : 'Qaimə və aktlar yükləndi')
      setJustCreatedId(createdId)
      resetForm()
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    } finally { setSaving(false) }
  }

  async function handleResubmit(e) {
    e.preventDefault()
    if (!form.invoiceDate) return toast.error('Tarix seçilməlidir')
    if (includedLines.length === 0) return toast.error('Ən azı bir texnika seçilməlidir')
    if (grandTotal <= 0) return toast.error('Məbləğ 0-dan böyük olmalıdır')

    const ok = await confirm({
      title: 'Yenidən Göndər',
      message: `Qaimə düzəliş edilib ${fmtMoney(grandTotal)} ₼ məbləğlə yenidən göndərilsin?`,
      confirmText: 'Göndər',
    })
    if (!ok) return

    const d = new Date(form.invoiceDate)
    const { lines, transports } = buildPayloadLines()
    setSaving(true)
    try {
      const res = await accountingApi.resubmit(editingInvoice.id, {
        invoiceDate: form.invoiceDate,
        notes: form.notes || null,
        amount: parseFloat(grandTotal.toFixed(2)),
        periodMonth: d.getMonth() + 1,
        periodYear: d.getFullYear(),
        hasTransport: transports.length > 0,
        transports: transports.length > 0 ? transports : null,
        lines,
      })
      // Yeni seçilmiş akt fayllarını (əvəzləmə) yüklə
      const updatedLines = res.data?.data?.lines || []
      for (const lf of includedLines) {
        if (!lf.aktFile) continue
        const cl = updatedLines.find(c =>
          (lf.lineId && c.planItemId === lf.lineId) || (lf.equipmentId && c.equipmentId === lf.equipmentId))
        if (cl) { try { await accountingApi.uploadLineAkt(editingInvoice.id, cl.id, lf.aktFile) } catch {} }
      }
      toast.success('Qaimə yenidən göndərildi')
      setEditingInvoice(null)
      setShowForm(false)
      resetForm()
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    } finally { setSaving(false) }
  }

  function handleEdit(inv) {
    setEditingInvoice(inv)
    setForm({
      invoiceDate: inv.invoiceDate ? inv.invoiceDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: inv.notes ?? '',
    })
    // Qaimənin sətirlərindən forma sətirlərini qur
    const invLines = inv.lines || []
    if (invLines.length > 0) {
      setLineForms(invLines.map(ln => {
        const pl = (project?.equipmentLines || []).find(l =>
          (ln.equipmentId && l.equipmentId === ln.equipmentId) || (ln.planItemId && l.id === ln.planItemId))
        const lineTransports = (inv.transports || [])
          .filter(t => (ln.equipmentId ? t.equipmentId === ln.equipmentId : t.equipmentId == null))
          .map(t => ({ date: t.transportDate || '', direction: t.transportDirection || '', amount: t.transportAmount != null ? String(t.transportAmount) : '' }))
        return {
          lineId: ln.planItemId ?? pl?.id ?? null,
          equipmentId: ln.equipmentId ?? pl?.equipmentId ?? null,
          equipmentName: ln.equipmentName || pl?.equipmentName || '—',
          equipmentCode: pl?.equipmentCode || '',
          ownershipType: pl?.ownershipType,
          planEquipmentPrice: pl?.equipmentPrice,
          customerEquipmentPrice: pl?.customerEquipmentPrice,
          included: true,
          standardDays: ln.standardDays ?? '', extraDays: ln.extraDays ?? '', extraHours: ln.extraHours ?? '',
          overtimeRate: String(ln.overtimeRate ?? '1.0'),
          monthlyRate: ln.monthlyRate != null ? String(ln.monthlyRate) : (ln.unitPrice != null ? String(ln.unitPrice) : ''),
          workingDaysInMonth: ln.workingDaysInMonth ?? (isDaily ? 1 : 26),
          workingHoursPerDay: ln.workingHoursPerDay ?? 9,
          hasTransport: lineTransports.length > 0,
          transports: lineTransports,
          aktFile: null, aktFileUploaded: !!ln.aktFileUploaded, aktFileName: ln.aktFileName || null,
        }
      }))
    } else {
      // Köhnə tək-texnikalı qaimə → sintetik tək sətir
      const lineTransports = (inv.transports || []).map(t => ({ date: t.transportDate || '', direction: t.transportDirection || '', amount: t.transportAmount != null ? String(t.transportAmount) : '' }))
      setLineForms([{
        lineId: null, equipmentId: inv.equipmentId ?? null, equipmentName: inv.equipmentName || '—', equipmentCode: '',
        ownershipType: project?.ownershipType, planEquipmentPrice: project?.planEquipmentPrice, customerEquipmentPrice: project?.planEquipmentPrice,
        included: true,
        standardDays: inv.standardDays ?? '', extraDays: inv.extraDays ?? '', extraHours: inv.extraHours ?? '',
        overtimeRate: String(inv.overtimeRate ?? '1.0'),
        monthlyRate: inv.monthlyRate != null ? String(inv.monthlyRate) : '',
        workingDaysInMonth: inv.workingDaysInMonth ?? (isDaily ? 1 : 26),
        workingHoursPerDay: inv.workingHoursPerDay ?? 9,
        hasTransport: lineTransports.length > 0, transports: lineTransports,
        aktFile: null, aktFileUploaded: !!inv.aktFileUploaded, aktFileName: inv.aktFileName || null,
      }])
    }
    setShowForm(true)
  }

  async function handleOpenAkt(invoiceId, fileName) {
    try {
      const res = await accountingApi.downloadAkt(invoiceId)
      const url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' }))
      const a = document.createElement('a')
      a.href = url; a.target = '_blank'; a.rel = 'noreferrer'; a.download = fileName || 'akt'
      document.body.appendChild(a); a.click()
      setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a) }, 1000)
    } catch { toast.error('Fayl açıla bilmədi') }
  }

  async function handleUploadAkt(invoiceId, file) {
    setAktUploading(true)
    try { await accountingApi.uploadAkt(invoiceId, file); toast.success('Akt yükləndi'); load() }
    catch { toast.error('Akt yüklənmədi') }
    finally { setAktUploading(false) }
  }

  async function handleDelete(id) {
    const ok = await confirm({ title: 'Qaiməni sil', message: 'Qaralama qaiməsi silinsin?', confirmText: 'Sil', danger: true })
    if (!ok) return
    try { await accountingApi.delete(id); toast.success('Qaimə silindi'); load() }
    catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Silmə uğursuz oldu') }
  }

  async function handleSend(id, periodLbl) {
    const ok = await confirm({ title: 'Mühasibatlığa Göndər', message: `"${periodLbl}" qaiməsi mühasibatlığa göndərilsin?`, confirmText: 'Göndər' })
    if (!ok) return
    setSendingId(id)
    try {
      await accountingApi.sendToAccounting(id)
      toast.success('Qaimə mühasibatlığa göndərildi')
      setJustCreatedId(null); load()
    } catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Göndərmə uğursuz oldu') }
    finally { setSendingId(null) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Locked banner */}
      {isLocked && (
        <div className="ces-alert" style={{ borderLeftColor: project?.status === 'PENDING' ? 'var(--ces-info)' : 'var(--ces-mute2)', background: project?.status === 'PENDING' ? '#f0f6fd' : 'var(--ces-graphite-50)' }}>
          <div className="ces-al-ic" style={{ background: project?.status === 'PENDING' ? '#e3edfb' : 'var(--ces-graphite-100)', color: project?.status === 'PENDING' ? 'var(--ces-info)' : 'var(--ces-muted)' }}>
            <Lock size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ces-graphite)' }}>{project?.status === 'PENDING' ? 'Layihə hələ aktiv deyil' : 'Layihə bağlanmışdır'}</p>
            <p style={{ fontSize: 11.5, color: 'var(--ces-muted)', marginTop: 2 }}>{project?.status === 'PENDING' ? 'Müqavilə yükləndikdən sonra qaimə yaratmaq mümkün olacaq.' : 'Bu layihə üzrə yeni qaimə yaratmaq mümkün deyil.'}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={15} style={{ color: 'var(--ces-gold-700)' }} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ces-ink)' }}>Qaimələr</span>
          {invoices.length > 0 && <span className="ces-pill ces-p-gold sm">{invoices.length}</span>}
        </div>
        {!editingInvoice && !isLocked && (
          <button onClick={() => { if (!showForm) resetForm(); setShowForm(v => !v) }} className="ces-btn ces-btn-sm ces-btn-primary">
            {showForm ? <ChevronUp size={13} /> : <Plus size={13} />}{showForm ? 'Bağla' : 'Yeni qaimə'}
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && !isLocked && (
        <form onSubmit={editingInvoice ? handleResubmit : handleSubmit}
          style={{ border: `1px solid ${editingInvoice ? '#fce4ea' : 'var(--ces-gold-100)'}`, background: editingInvoice ? 'var(--ces-danger-100)' : 'var(--ces-gold-50)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="flex items-center justify-between">
            <p className="ces-sec-label" style={{ color: editingInvoice ? 'var(--ces-danger)' : 'var(--ces-gold-700)', margin: 0 }}>
              {editingInvoice ? 'Qaiməni düzəlt' : 'Yeni qaimə — texnikaları seçin'}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setRatesUnlocked(v => !v)} className="ces-btn ces-btn-ghost ces-btn-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                {ratesUnlocked ? <><Lock size={12} /> Tarifi kilidlə</> : <><Pencil size={12} /> Tarifi dəyiş</>}
              </button>
              {editingInvoice && (
                <button type="button" onClick={() => { setEditingInvoice(null); setShowForm(false); resetForm() }} className="ces-btn ces-btn-xs ces-btn-ghost">Ləğv et</button>
              )}
            </div>
          </div>

          {/* Texnika sətirləri */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lineForms.map((lf, idx) => (
              <LineCard key={lf.lineId ?? idx} lf={lf} idx={idx} isDaily={isDaily} ratesUnlocked={ratesUnlocked} onChange={updateLine} />
            ))}
          </div>

          {/* Cəm */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--ces-ok-100)', border: '1px solid #d8f3d0', borderRadius: 12 }}>
            <span className="ces-sec-label" style={{ color: 'var(--ces-ok)', margin: 0 }}>Cəmi ({includedLines.length} texnika)</span>
            <span className="mono" style={{ fontSize: 15, fontWeight: 800, color: 'var(--ces-ok)' }}>{fmtMoney(grandTotal)} ₼</span>
          </div>

          {/* Date */}
          <div>
            <label style={fieldLabel}>Tarix *</label>
            <div className="ces-input sm">
              <DateInput value={form.invoiceDate} onChange={e => set('invoiceDate', e.target.value)} required style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 13, padding: '8px 0', width: '100%' }} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={fieldLabel}>Qeydlər</label>
            <div className="ces-input sm" style={{ alignItems: 'flex-start', paddingTop: 4, paddingBottom: 4 }}>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="İstəyə bağlı qeyd..." />
            </div>
          </div>

          <p style={{ fontSize: 10.5, color: 'var(--ces-mute2)' }}>
            <Paperclip size={10} style={{ display: 'inline', marginRight: 4 }} />
            Hər texnikanın təhvil-təslim aktı yuxarıda öz kartında yüklənir. Aktsız qaimə mühasibatlığa göndərilə bilməz.
          </p>

          <button type="submit" disabled={saving || grandTotal <= 0 || !canCreate || includedLines.length === 0 || (!editingInvoice && !includedLines.every(l => l.aktFile || l.aktFileUploaded))}
            className={clsx('ces-btn', editingInvoice ? '' : 'ces-btn-primary')}
            style={{ justifyContent: 'center', background: editingInvoice ? 'var(--ces-danger)' : undefined, color: editingInvoice ? '#fff' : undefined }}>
            {saving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Göndərilir...</>
              : editingInvoice ? <><Send size={13} /> Düzəlt və göndər</> : 'Qaimə yarat'}
          </button>

          {/* Success message */}
          {justCreatedId && !saving && !editingInvoice && (
            <div className="ces-alert" style={{ borderLeftColor: 'var(--ces-ok)', background: 'var(--ces-ok-100)' }}>
              <div className="ces-al-ic" style={{ background: '#e8fbe5', color: 'var(--ces-ok)' }}><CheckCircle size={16} /></div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ces-ok)', marginBottom: 8 }}>Qaimə uğurla yaradıldı!</p>
                <div className="flex gap-2">
                  {canSend && (
                    <button type="button" onClick={() => handleSend(justCreatedId, periodLabel(new Date(form.invoiceDate).getMonth() + 1, new Date(form.invoiceDate).getFullYear()))}
                      disabled={sendingId === justCreatedId} className="ces-btn ces-btn-sm ces-btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                      {sendingId === justCreatedId ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Göndərilir...</> : <><Send size={12} /> Mühasibatlığa göndər</>}
                    </button>
                  )}
                  <button type="button" onClick={() => setJustCreatedId(null)} className="ces-btn ces-btn-sm ces-btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Bağla</button>
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
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--ces-graphite-50)', color: 'var(--ces-mute2)', display: 'inline-grid', placeItems: 'center', marginBottom: 12 }}><FileText size={26} /></div>
          <p style={{ fontSize: 13.5, color: 'var(--ces-muted)' }}>Hələ qaimə yoxdur</p>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--ces-line)', borderRadius: 14, overflow: 'hidden' }}>
          {invoices.map(inv => {
            const periodLbl = periodLabel(inv.periodMonth, inv.periodYear)
            const statusCfg = STATUS_CFG[inv.status] || STATUS_CFG.DRAFT
            const StatusIcon = statusCfg.icon
            const hasLines = inv.lines?.length > 0
            const eqNames = hasLines ? inv.lines.map(l => l.equipmentName).filter(Boolean) : []
            const eqLabel = hasLines
              ? (eqNames.length ? eqNames.join(', ') : `${inv.lines.length} texnika`)
              : (inv.equipmentName || '')
            const aktReady = hasLines ? inv.lines.every(l => l.aktFileUploaded) : inv.aktFileUploaded
            const aktCount = hasLines ? inv.lines.filter(l => l.aktFileUploaded).length : (inv.aktFileUploaded ? 1 : 0)
            const aktTotal = hasLines ? inv.lines.length : 1
            return (
              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--ces-surface)', borderBottom: '1px solid var(--ces-line-2)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ces-ink)' }}>{periodLbl}</span>
                    <span className={clsx('ces-pill sm', statusCfg.pill)}><StatusIcon size={11} />{statusCfg.label}</span>
                    {inv.invoiceNumber && <span className="mono" style={{ fontSize: 11, color: 'var(--ces-mute2)' }}>№{inv.invoiceNumber}</span>}
                    {eqLabel && <span style={{ fontSize: 11, fontWeight: 600, color: '#7d4ec9' }}>🔧 {eqLabel}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap" style={{ fontSize: 11, color: 'var(--ces-muted)' }}>
                    <span className="mono">{fmtDate(inv.invoiceDate)}</span>
                    {inv.transports?.length > 0 && (
                      <span style={{ color: 'var(--ces-info)', fontWeight: 600 }}>• Daşınma: <span className="mono">{fmtMoney(inv.totalTransportAmount || 0)} ₼</span></span>
                    )}
                  </div>
                </div>
                <span className="mono" style={{ fontSize: 14, fontWeight: 800, color: 'var(--ces-ok)', whiteSpace: 'nowrap' }}>{fmtMoney(inv.amount)} ₼</span>
                <div className="flex items-center gap-0.5">
                  {hasLines ? (
                    <span title="Yüklənmiş aktlar" style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 8, whiteSpace: 'nowrap', color: aktReady ? 'var(--ces-ok)' : 'var(--ces-warn)', background: aktReady ? 'var(--ces-ok-100)' : 'var(--ces-warn-100, #fff7ec)' }}>
                      <Paperclip size={10} style={{ display: 'inline', marginRight: 3 }} />{aktCount}/{aktTotal}
                    </span>
                  ) : inv.aktFileUploaded ? (
                    <button onClick={() => handleOpenAkt(inv.id, inv.aktFileName)} className="ces-row-act" style={{ color: 'var(--ces-ok)' }} title={`Akt: ${inv.aktFileName || 'Fayla bax'}`}><Paperclip size={13} /></button>
                  ) : (!isLocked && canCreate && (
                    <label className="ces-row-act gold" title="Akt yüklə" style={{ cursor: 'pointer' }}>
                      <Upload size={13} />
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: 'none' }} disabled={aktUploading} onChange={e => { if (e.target.files?.[0]) handleUploadAkt(inv.id, e.target.files[0]) }} />
                    </label>
                  ))}
                  <button onClick={() => setViewInvoice(inv)} className="ces-row-act gold" title="Qaiməyə bax"><Eye size={13} /></button>
                  {!isLocked && inv.status === 'RETURNED' && canSend && (
                    <button onClick={() => handleEdit(inv)} className="ces-row-act danger" title="Düzəlt və göndər"><Pencil size={13} /></button>
                  )}
                  {!isLocked && inv.status === 'DRAFT' && canSend && (
                    <button onClick={() => handleSend(inv.id, periodLbl)} disabled={sendingId === inv.id || !aktReady} className="ces-row-act info"
                      title={aktReady ? 'Mühasibatlığa göndər' : 'Əvvəlcə bütün təhvil-təslim aktlarını yükləyin'}><Send size={13} /></button>
                  )}
                  {!isLocked && (inv.status === 'DRAFT' || inv.status === 'RETURNED') && canDelete && (
                    <button onClick={() => handleDelete(inv.id)} className="ces-row-act danger" title="Sil"><Trash2 size={13} /></button>
                  )}
                </div>
              </div>
            )
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--ces-ok-100)', borderTop: '1px solid #d8f3d0' }}>
            <span className="ces-sec-label" style={{ color: 'var(--ces-ok)', margin: 0 }}>Ümumi cəmi</span>
            <span className="mono" style={{ fontSize: 14, fontWeight: 800, color: 'var(--ces-ok)' }}>{fmtMoney(invoices.reduce((s, inv) => s + parseFloat(inv.amount || 0), 0))} ₼</span>
          </div>
        </div>
      )}

      <ConfirmDialog />
      {viewInvoice && <InvoiceDetailModal inv={viewInvoice} project={project} canEdit={canCreate && !isLocked} onChanged={load} onClose={() => setViewInvoice(null)} />}
    </div>
  )
}
