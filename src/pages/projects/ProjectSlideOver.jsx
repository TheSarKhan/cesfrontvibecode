import { useState, useEffect } from 'react'
import {
  X, Info, DollarSign, CheckCircle,
  FileText, Plus, Trash2, Download,
  TrendingUp, TrendingDown, Calendar,
  AlertCircle, Phone, User, MapPin, Building2,
  Clock, FolderKanban
} from 'lucide-react'
import { projectsApi } from '../../api/projects'
import { accountingApi } from '../../api/accounting'
import ProjectQaimeTab from './ProjectQaimeTab'
import axiosInstance from '../../api/axios'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { fmtDate } from '../../utils/date'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import PrintButton from '../../components/common/PrintButton'

const STATUS_CONFIG = {
  PENDING:   { label: 'Gözləmədə', pill: 'ces-p-info' },
  ACTIVE:    { label: 'Aktiv',     pill: 'ces-p-ok' },
  COMPLETED: { label: 'Bağlanmış', pill: 'ces-p-mute' },
}

const TABS = [
  { id: 'info',     label: 'Məlumat',   icon: Info },
  { id: 'finance',  label: 'Maliyyə',   icon: DollarSign },
  { id: 'qaime',    label: 'Qaimələr',  icon: FileText },
  { id: 'complete', label: 'Bağlanış',  icon: CheckCircle },
]

const OWNERSHIP_CFG = {
  COMPANY:    { label: 'Şirkət',    pill: 'ces-p-ok' },
  INVESTOR:   { label: 'İnvestor',  pill: 'ces-p-info' },
  CONTRACTOR: { label: 'Podratçı',  pill: 'ces-p-warn' },
}
const PROJ_TYPE = { DAILY: 'Günlük', MONTHLY: 'Aylıq' }

function calcDuration(p, overrideStart, overrideEnd) {
  const s = overrideStart ?? p.startDate ?? p.planStartDate
  const e = overrideEnd   ?? p.endDate   ?? p.planEndDate
  if (s && e) {
    const days = Math.ceil((new Date(e) - new Date(s)) / 86400000)
    return p.projectType === 'MONTHLY' ? `${Math.round(days / 30)} ay` : `${days} gün`
  }
  const n = p.planDayCount ?? p.dayCount
  if (!n) return '—'
  return p.projectType === 'MONTHLY' ? `${n} ay` : `${n} gün`
}

function InfoRow({ label, value, children }) {
  return (
    <div
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        gap: 14, padding: '8px 0',
        borderBottom: '1px dashed var(--ces-line)',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--ces-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ces-ink)', textAlign: 'right', minWidth: 0 }}>
        {children ?? (value || <span style={{ color: 'var(--ces-mute2)' }}>—</span>)}
      </span>
    </div>
  )
}

function Section({ children, title, icon: Icon }) {
  return (
    <div style={{ marginTop: 16 }}>
      <p
        className="ces-sec-label"
        style={{ marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        {Icon && <Icon size={11} />}
        {title}
      </p>
      <div>{children}</div>
    </div>
  )
}

// ─── Start Date Dialog ────────────────────────────────────────────────────────

// ─── Məlumat Tab ──────────────────────────────────────────────────────────────

function InfoTab({ project, onEndDateUpdated }) {
  const [editingDate, setEditingDate] = useState(false)
  const [date, setDate] = useState(project.endDate?.substring(0, 10) || '')
  const [savingDate, setSavingDate] = useState(false)

  const [editingStartDate, setEditingStartDate] = useState(false)
  const [startDate, setStartDate] = useState(project.startDate?.substring(0, 10) || '')
  const [savingStartDate, setSavingStartDate] = useState(false)

  const handleDownloadContract = async () => {
    try {
      const url = projectsApi.contractDownloadUrl(project.id)
      const res = await axiosInstance.get(url, { responseType: 'blob' })
      const baseName = project.contractFileName || `contract_${project.id}`
      const cd = res.headers['content-disposition'] || ''
      const match = cd.match(/filename="?([^";\s]+)"?/)
      const serverExt = match ? match[1].substring(match[1].lastIndexOf('.')) : ''
      const fileName = serverExt && !baseName.toLowerCase().endsWith(serverExt.toLowerCase())
        ? baseName + serverExt : baseName
      const link = document.createElement('a')
      link.href = URL.createObjectURL(res.data)
      link.download = fileName
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Fayl yüklənə bilmədi')
    }
  }

  // QEYD: Müqavilə YÜKLƏMƏ silindi — layihə mühasibat OK + Əməliyyatların təsdiqi ilə ACTIVE olur.
  // Yalnız mövcud müqaviləni endirmək qaldı (handleDownloadContract).

  const saveDate = async () => {
    if (!date) return
    setSavingDate(true)
    try {
      await projectsApi.updateEndDate(project.id, { endDate: date })
      toast.success('Bitmə tarixi yeniləndi')
      setEditingDate(false)
      onEndDateUpdated()
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Tarix yenilənə bilmədi')
    } finally {
      setSavingDate(false)
    }
  }

  const saveStartDate = async () => {
    if (!startDate) return
    setSavingStartDate(true)
    try {
      await projectsApi.updateStartDate(project.id, { startDate })
      toast.success('Başlanğıc tarixi yeniləndi')
      setEditingStartDate(false)
      onEndDateUpdated()
    } catch {
    } finally {
      setSavingStartDate(false)
    }
  }

  const fmt = fmtDate
  const fmtMoney = (v) => v != null ? `${parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼` : '—'
  const ownership = OWNERSHIP_CFG[project.ownershipType]

  return (
    <div>
      <Section title="Layihə məlumatları" icon={FolderKanban}>
        <InfoRow label="Şirkət" value={project.companyName} />
        <InfoRow label="Əlaqədar şəxs">
          {project.contactPerson ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <User size={11} style={{ color: 'var(--ces-mute2)' }} />
              {project.contactPerson}
            </span>
          ) : <span style={{ color: 'var(--ces-mute2)' }}>—</span>}
        </InfoRow>
        <InfoRow label="Telefon">
          {project.contactPhone ? (
            <a href={`tel:${project.contactPhone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--ces-gold-700)' }} className="mono">
              <Phone size={11} />
              {project.contactPhone}
            </a>
          ) : <span style={{ color: 'var(--ces-mute2)' }}>—</span>}
        </InfoRow>
        <InfoRow label="Layihə adı" value={project.projectName} />
        <InfoRow label="Bölgə">
          {project.region ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={11} style={{ color: 'var(--ces-mute2)' }} />
              {project.region}
            </span>
          ) : <span style={{ color: 'var(--ces-mute2)' }}>—</span>}
        </InfoRow>
        <InfoRow label="Növ">
          {project.projectType
            ? (PROJ_TYPE[project.projectType] || project.projectType)
            : '—'}
        </InfoRow>
        {project.transportationRequired && (
          <InfoRow label="Daşınma">
            <span className="ces-pill ces-p-info sm">Tələb olunur</span>
          </InfoRow>
        )}
        {project.requestDate && <InfoRow label="Sorğu tarixi" value={fmt(project.requestDate)} />}
      </Section>

      {project.requestParams?.length > 0 && (
        <Section title="Texniki parametrlər" icon={Info}>
          {project.requestParams.map((p, i) => (
            <InfoRow key={i} label={p.key} value={p.value} />
          ))}
        </Section>
      )}

      <Section title="Texnika" icon={Building2}>
        <InfoRow label="Ad" value={project.equipmentName} />
        <InfoRow label="Kod">
          {project.equipmentCode ? <span className="mono">{project.equipmentCode}</span> : <span style={{ color: 'var(--ces-mute2)' }}>—</span>}
        </InfoRow>
        {project.equipmentType && <InfoRow label="Növ" value={project.equipmentType} />}
        {project.equipmentBrand && <InfoRow label="Brend" value={project.equipmentBrand} />}
        {project.equipmentModel && <InfoRow label="Model" value={project.equipmentModel} />}
        {project.equipmentSerialNumber && (
          <InfoRow label="Seriya №"><span className="mono">{project.equipmentSerialNumber}</span></InfoRow>
        )}
        {project.equipmentPlateNumber && (
          <InfoRow label="Qeydiyyat №"><span className="mono">{project.equipmentPlateNumber}</span></InfoRow>
        )}
        <InfoRow label="Mülkiyyət">
          {ownership ? (
            <span className={clsx('ces-pill sm', ownership.pill)}>
              {ownership.label}
            </span>
          ) : <span style={{ color: 'var(--ces-mute2)' }}>—</span>}
        </InfoRow>
      </Section>

      {project.ownershipType === 'CONTRACTOR' && (
        <Section title="Podratçı" icon={Building2}>
          <InfoRow label="Şirkət">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={11} style={{ color: 'var(--ces-warn)' }} />
              {project.contractorName || '—'}
            </span>
          </InfoRow>
          {project.contractorVoen && (
            <InfoRow label="VÖEN"><span className="mono">{project.contractorVoen}</span></InfoRow>
          )}
          {project.contractorPhone && (
            <InfoRow label="Telefon">
              <a href={`tel:${project.contractorPhone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--ces-gold-700)' }} className="mono">
                <Phone size={11} />
                {project.contractorPhone}
              </a>
            </InfoRow>
          )}
          {project.contractorContactPerson && (
            <InfoRow label="Əlaqədar şəxs">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <User size={11} style={{ color: 'var(--ces-mute2)' }} />
                {project.contractorContactPerson}
              </span>
            </InfoRow>
          )}
        </Section>
      )}

      {project.ownershipType === 'INVESTOR' && (
        <Section title="İnvestor" icon={Building2}>
          <InfoRow label="Ad" value={project.investorName} />
          {project.investorVoen && (
            <InfoRow label="VÖEN"><span className="mono">{project.investorVoen}</span></InfoRow>
          )}
          {project.investorPhone && (
            <InfoRow label="Telefon">
              <a href={`tel:${project.investorPhone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--ces-gold-700)' }} className="mono">
                <Phone size={11} />
                {project.investorPhone}
              </a>
            </InfoRow>
          )}
        </Section>
      )}

      {(project.planEquipmentPrice != null || project.operatorName || project.planDayCount) && (
        <Section title="Koordinator planı" icon={Info}>
          {project.planDayCount && <InfoRow label="Plan gün" value={`${project.planDayCount} gün`} />}
          {project.planStartDate && <InfoRow label="Plan başlanğıc" value={fmt(project.planStartDate)} />}
          {project.planEndDate && <InfoRow label="Plan bitmə" value={fmt(project.planEndDate)} />}
          {project.operatorName && (
            <InfoRow label="Operator">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <User size={11} style={{ color: 'var(--ces-mute2)' }} />
                {project.operatorName}
              </span>
            </InfoRow>
          )}
          {project.planEquipmentPrice != null && (
            <InfoRow label={project.projectType === 'DAILY' ? 'Texnika qiyməti (gün)' : 'Texnika qiyməti'}>
              {project.projectType === 'DAILY' && project.planDayCount > 0 ? (
                <span style={{ color: 'var(--ces-gold-700)', fontWeight: 700 }} className="mono">
                  {fmtMoney(project.planEquipmentPrice)} × {project.planDayCount} = {fmtMoney(project.planEquipmentTotal)}
                </span>
              ) : (
                <span style={{ color: 'var(--ces-gold-700)', fontWeight: 700 }} className="mono">
                  {fmtMoney(project.planEquipmentTotal ?? project.planEquipmentPrice)}
                </span>
              )}
            </InfoRow>
          )}
          {project.planTransportationPrice != null && (
            <InfoRow label="Nəqliyyat xərci">
              <span className="mono" style={{ fontWeight: 700 }}>{fmtMoney(project.planTransportationPrice)}</span>
            </InfoRow>
          )}
          {project.planOperatorPayment != null && (
            <InfoRow label="Operator haqqı">
              <span className="mono" style={{ fontWeight: 700 }}>{fmtMoney(project.planOperatorPayment)}</span>
            </InfoRow>
          )}
          {project.planNotes && <InfoRow label="Qeyd" value={project.planNotes} />}
        </Section>
      )}

      <Section title="Tarixlər" icon={Calendar}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '8px 0', borderBottom: '1px dashed var(--ces-line)' }}>
          <span style={{ fontSize: 12, color: 'var(--ces-muted)' }}>Başlanğıc</span>
          {project.status !== 'COMPLETED' ? (
            editingStartDate ? (
              <div className="flex items-center gap-1.5">
                <div className="ces-input sm" style={{ minHeight: 30, padding: '0 8px' }}>
                  <DateInput
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 12.5, padding: '6px 0', width: 120 }}
                  />
                </div>
                <button onClick={saveStartDate} disabled={savingStartDate} className="ces-btn ces-btn-xs" style={{ background: 'var(--ces-ok)', color: '#fff' }}>
                  {savingStartDate ? '...' : 'Saxla'}
                </button>
                <button onClick={() => setEditingStartDate(false)} className="ces-btn ces-btn-xs ces-btn-ghost">Ləğv</button>
              </div>
            ) : (
              <button
                onClick={() => setEditingStartDate(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, color: 'var(--ces-ink)', background: 'transparent', border: 0, cursor: 'pointer' }}
              >
                <Calendar size={11} style={{ color: 'var(--ces-mute2)' }} />
                <span className="mono">{fmt(project.startDate ?? project.planStartDate)}</span>
                <span style={{ fontSize: 10.5, color: 'var(--ces-gold-700)', marginLeft: 4 }}>(dəyiş)</span>
              </button>
            )
          ) : (
            <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{fmt(project.startDate ?? project.planStartDate)}</span>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '8px 0', borderBottom: '1px dashed var(--ces-line)' }}>
          <span style={{ fontSize: 12, color: 'var(--ces-muted)' }}>Bitmə</span>
          {project.status !== 'COMPLETED' ? (
            editingDate ? (
              <div className="flex items-center gap-1.5">
                <div className="ces-input sm" style={{ minHeight: 30, padding: '0 8px' }}>
                  <DateInput
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 12.5, padding: '6px 0', width: 120 }}
                  />
                </div>
                <button onClick={saveDate} disabled={savingDate} className="ces-btn ces-btn-xs" style={{ background: 'var(--ces-ok)', color: '#fff' }}>
                  {savingDate ? '...' : 'Saxla'}
                </button>
                <button onClick={() => setEditingDate(false)} className="ces-btn ces-btn-xs ces-btn-ghost">Ləğv</button>
              </div>
            ) : (
              <button
                onClick={() => setEditingDate(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, color: 'var(--ces-ink)', background: 'transparent', border: 0, cursor: 'pointer' }}
              >
                <Calendar size={11} style={{ color: 'var(--ces-mute2)' }} />
                <span className="mono">{fmt(project.endDate ?? project.planEndDate)}</span>
                <span style={{ fontSize: 10.5, color: 'var(--ces-gold-700)', marginLeft: 4 }}>(dəyiş)</span>
              </button>
            )
          ) : (
            <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{fmt(project.endDate ?? project.planEndDate)}</span>
          )}
        </div>
      </Section>

      <Section title="Müqavilə" icon={FileText}>
        <InfoRow label="Status">
          {project.hasContract ? (
            <span className="flex items-center gap-2">
              <span className="ces-pill ces-p-ok sm">
                <FileText size={10} />
                Yüklənib
              </span>
              <button
                onClick={handleDownloadContract}
                className="ces-btn ces-btn-xs ces-btn-ghost"
                style={{ color: 'var(--ces-gold-700)' }}
              >
                <Download size={11} />
                Endir
              </button>
            </span>
          ) : (
            <span className="ces-pill ces-p-warn sm">
              <AlertCircle size={10} />
              Gözlənilir
            </span>
          )}
        </InfoRow>
        {project.contractFileName && (
          <InfoRow label="Fayl adı" value={project.contractFileName} />
        )}
      </Section>

      {project.status === 'COMPLETED' && (
        <Section title="Bağlanış" icon={CheckCircle}>
          <InfoRow label="Evakuator">
            <span className="mono" style={{ color: 'var(--ces-danger)', fontWeight: 700 }}>{fmtMoney(project.evacuationCost)}</span>
          </InfoRow>
          <InfoRow label="Plan saat">
            {project.scheduledHours != null ? `${project.scheduledHours} saat` : '—'}
          </InfoRow>
          <InfoRow label="Faktiki saat">
            {project.actualHours != null ? (
              <span style={{
                fontWeight: 700,
                color: parseFloat(project.actualHours) >= parseFloat(project.scheduledHours) ? 'var(--ces-ok)' : 'var(--ces-danger)',
              }}>
                {project.actualHours} saat
              </span>
            ) : '—'}
          </InfoRow>
          {project.overtimeHours > 0 && (
            <>
              <InfoRow label="Əlavə saat">
                <span style={{ color: 'var(--ces-warn)', fontWeight: 700 }}>{project.overtimeHours} saat</span>
              </InfoRow>
              <InfoRow label="Əlavə dərəcə">
                <span style={{ color: 'var(--ces-warn)', fontWeight: 700 }}>{project.overtimeRate}×</span>
              </InfoRow>
              <InfoRow label="Əlavə haqqı">
                <span className="mono" style={{ color: 'var(--ces-warn)', fontWeight: 700 }}>{fmtMoney(project.overtimePay)}</span>
              </InfoRow>
            </>
          )}
        </Section>
      )}
    </div>
  )
}

// ─── Maliyyə Tab ──────────────────────────────────────────────────────────────

function FinanceTab({ project }) {
  const { confirm, ConfirmDialog } = useConfirm()
  const [finances, setFinances] = useState({ expenses: [], revenues: [] })
  const [loading, setLoading] = useState(true)
  const [expKey, setExpKey] = useState('')
  const [expVal, setExpVal] = useState('')
  const [revKey, setRevKey] = useState('')
  const [revVal, setRevVal] = useState('')
  const [addingExp, setAddingExp] = useState(false)
  const [addingRev, setAddingRev] = useState(false)
  const readOnly = project.status !== 'ACTIVE'

  const load = async () => {
    try {
      const res = await projectsApi.getFinances(project.id)
      setFinances(res.data.data || res.data || { expenses: [], revenues: [] })
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [project.id])

  const manualExp = (finances.expenses || []).reduce((s, e) => s + parseFloat(e.value || 0), 0)
  const manualRev = (finances.revenues || []).reduce((s, r) => s + parseFloat(r.value || 0), 0)
  const planExpenses = parseFloat(project.planTransportationPrice || 0)
                     + parseFloat(project.planOperatorPayment    || 0)
  const totalExp = manualExp + planExpenses
  const totalRev = manualRev
  const net = manualRev - (manualExp + planExpenses)

  const addExpense = async () => {
    if (!expKey.trim() || !expVal || parseFloat(expVal) <= 0) return toast.error('Növ və məbləğ daxil edin')
    setAddingExp(true)
    try {
      await projectsApi.addExpense(project.id, { key: expKey.trim(), value: parseFloat(expVal) })
      setExpKey(''); setExpVal('')
      load()
    } catch { } finally { setAddingExp(false) }
  }

  const delExpense = async (id) => {
    if (!(await confirm({ title: 'Xərci sil', message: 'Bu xərci silmək istəyirsiniz?' }))) return
    try { await projectsApi.deleteExpense(project.id, id); load() }
    catch {}
  }

  const addRevenue = async () => {
    if (!revKey.trim() || !revVal || parseFloat(revVal) <= 0) return toast.error('Növ və məbləğ daxil edin')
    setAddingRev(true)
    try {
      await projectsApi.addRevenue(project.id, { key: revKey.trim(), value: parseFloat(revVal) })
      setRevKey(''); setRevVal('')
      load()
    } catch { } finally { setAddingRev(false) }
  }

  const delRevenue = async (id) => {
    if (!(await confirm({ title: 'Gəliri sil', message: 'Bu gəliri silmək istəyirsiniz?' }))) return
    try { await projectsApi.deleteRevenue(project.id, id); load() }
    catch {}
  }

  const fmtMoney = (v) => parseFloat(v || 0).toLocaleString('az-AZ', { minimumFractionDigits: 2 })

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <span style={{ width: 22, height: 22, border: '2px solid var(--ces-line)', borderTopColor: 'var(--ces-gold)', borderRadius: 999, animation: 'ces-spin .8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Xərclər */}
      <div style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: 14, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', background: 'var(--ces-danger-100)', borderBottom: '1px solid #fce4ea',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingDown size={14} style={{ color: 'var(--ces-danger)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ces-danger)' }}>Xərclər</span>
          </div>
          <span className="mono" style={{ fontSize: 13, fontWeight: 800, color: 'var(--ces-danger)' }}>{fmtMoney(totalExp)} ₼</span>
        </div>
        <div>
          {project.planTransportationPrice > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', background: 'var(--ces-gold-50)', borderBottom: '1px solid var(--ces-line-2)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ces-graphite)' }}>
                  Daşınma <span style={{ fontSize: 10, color: 'var(--ces-gold-700)' }}>(plan)</span>
                </p>
              </div>
              <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ces-danger)' }}>{fmtMoney(project.planTransportationPrice)} ₼</span>
            </div>
          )}
          {project.planOperatorPayment > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', background: 'var(--ces-gold-50)', borderBottom: '1px solid var(--ces-line-2)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ces-graphite)' }}>
                  Operator haqqı <span style={{ fontSize: 10, color: 'var(--ces-gold-700)' }}>(plan)</span>
                </p>
              </div>
              <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ces-danger)' }}>{fmtMoney(project.planOperatorPayment)} ₼</span>
            </div>
          )}
          {finances.expenses?.length === 0 && planExpenses === 0 && (
            <p style={{ fontSize: 12.5, color: 'var(--ces-mute2)', textAlign: 'center', padding: 14 }}>Hələ xərc yoxdur</p>
          )}
          {finances.expenses?.map((e) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--ces-line-2)', background: 'var(--ces-surface)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ces-ink)' }} className="truncate">{e.key}</p>
                {e.date && <p className="mono" style={{ fontSize: 10.5, color: 'var(--ces-mute2)' }}>{fmtDate(e.date)}</p>}
              </div>
              <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ces-danger)' }}>{fmtMoney(e.value)} ₼</span>
              {!readOnly && (
                <button onClick={() => delExpense(e.id)} className="ces-row-act danger">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
        {!readOnly && (
          <div style={{ display: 'flex', gap: 6, padding: '10px 14px', borderTop: '1px solid #fce4ea', background: 'var(--ces-surface)' }}>
            <div className="ces-input sm" style={{ flex: 1, minWidth: 0 }}>
              <input
                value={expKey}
                onChange={(e) => setExpKey(e.target.value)}
                placeholder="Növ (Benzin...)"
                onKeyDown={(e) => e.key === 'Enter' && addExpense()}
              />
            </div>
            <div className="ces-input sm" style={{ width: 90 }}>
              <input
                className="mono"
                type="number"
                value={expVal}
                onChange={(e) => setExpVal(e.target.value)}
                placeholder="AZN"
                min="0" step="0.01"
                onKeyDown={(e) => e.key === 'Enter' && addExpense()}
              />
            </div>
            <button
              onClick={addExpense}
              disabled={addingExp}
              className="ces-btn ces-btn-sm"
              style={{ background: 'var(--ces-danger)', color: '#fff' }}
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Gəlirlər */}
      <div style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: 14, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', background: 'var(--ces-ok-100)', borderBottom: '1px solid #d8f3d0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={14} style={{ color: 'var(--ces-ok)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ces-ok)' }}>Gəlirlər</span>
          </div>
          <span className="mono" style={{ fontSize: 13, fontWeight: 800, color: 'var(--ces-ok)' }}>{fmtMoney(totalRev)} ₼</span>
        </div>
        <div>
          {finances.revenues?.length === 0 && (
            <p style={{ fontSize: 12.5, color: 'var(--ces-mute2)', textAlign: 'center', padding: 14 }}>Hələ gəlir yoxdur</p>
          )}
          {finances.revenues?.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--ces-line-2)', background: 'var(--ces-surface)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ces-ink)' }} className="truncate">{r.key}</p>
                {r.date && <p className="mono" style={{ fontSize: 10.5, color: 'var(--ces-mute2)' }}>{fmtDate(r.date)}</p>}
              </div>
              <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ces-ok)' }}>{fmtMoney(r.value)} ₼</span>
              {!readOnly && !r.key?.startsWith('Qaimə:') && (
                <button onClick={() => delRevenue(r.id)} className="ces-row-act danger">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
        {!readOnly && (
          <div style={{ display: 'flex', gap: 6, padding: '10px 14px', borderTop: '1px solid #d8f3d0', background: 'var(--ces-surface)' }}>
            <div className="ces-input sm" style={{ flex: 1, minWidth: 0 }}>
              <input
                value={revKey}
                onChange={(e) => setRevKey(e.target.value)}
                placeholder="Növ (Texnika icarəsi...)"
                onKeyDown={(e) => e.key === 'Enter' && addRevenue()}
              />
            </div>
            <div className="ces-input sm" style={{ width: 90 }}>
              <input
                className="mono"
                type="number"
                value={revVal}
                onChange={(e) => setRevVal(e.target.value)}
                placeholder="AZN"
                min="0" step="0.01"
                onKeyDown={(e) => e.key === 'Enter' && addRevenue()}
              />
            </div>
            <button
              onClick={addRevenue}
              disabled={addingRev}
              className="ces-btn ces-btn-sm"
              style={{ background: 'var(--ces-ok)', color: '#fff' }}
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Xalis gəlir */}
      <div
        style={{
          borderRadius: 14, padding: '14px 16px',
          border: '1px solid ' + (net >= 0 ? '#d8f3d0' : '#fce4ea'),
          background: net >= 0 ? 'var(--ces-ok-100)' : 'var(--ces-danger-100)',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--ces-muted)' }}>
          <span>Ümumi gəlir</span>
          <span className="mono" style={{ fontWeight: 700, color: 'var(--ces-ok)' }}>+{fmtMoney(totalRev)} ₼</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--ces-muted)' }}>
          <span>Ümumi xərc</span>
          <span className="mono" style={{ fontWeight: 700, color: 'var(--ces-danger)' }}>−{fmtMoney(totalExp)} ₼</span>
        </div>
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: '1px solid ' + (net >= 0 ? '#d8f3d0' : '#fce4ea'),
            paddingTop: 8,
          }}
        >
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ces-graphite)' }}>Xalis gəlir</span>
          <span className="mono" style={{ fontSize: 18, fontWeight: 800, color: net >= 0 ? 'var(--ces-ok)' : 'var(--ces-danger)' }}>
            {net >= 0 ? '+' : ''}{fmtMoney(net)} ₼
          </span>
        </div>
      </div>
      <ConfirmDialog />
    </div>
  )
}

// ─── Bağlanış Tab ─────────────────────────────────────────────────────────────

function SummaryRow({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--ces-line-2)' }}>
      <span style={{ fontSize: 12, color: 'var(--ces-muted)' }}>{label}</span>
      <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: valueColor || 'var(--ces-ink)' }}>{value}</span>
    </div>
  )
}

function CompleteTab({ project, onCompleted, onSwitchToQaime }) {
  const { confirm, ConfirmDialog } = useConfirm()
  const [form, setForm] = useState({ evacuationCost: project.evacuationCost ?? '' })
  const [saving, setSaving] = useState(false)
  const [invoiceCounts, setInvoiceCounts] = useState(null)
  const set = (f, v) => setForm((p) => ({ ...p, [f]: v }))

  const isCompleted = project.status === 'COMPLETED'
  const fmt = fmtDate
  const fmtMoney = (v) => v != null && v !== '' ? `${parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼` : '—'

  const effectiveDays = project.startDate && project.endDate
    ? Math.ceil((new Date(project.endDate) - new Date(project.startDate)) / 86400000)
    : (project.planDayCount || project.dayCount || 0)

  const planRevenue  = parseFloat(project.planEquipmentTotal || project.planEquipmentPrice || 0)
  const planExpenses = parseFloat(project.planTransportationPrice || 0)
                     + parseFloat(project.planOperatorPayment || 0)
  const actualRevenue = parseFloat(project.totalRevenue || 0)
  const actualExpense = parseFloat(project.totalExpense || 0) + planExpenses
  const evacCost      = isCompleted ? parseFloat(project.evacuationCost || 0) : parseFloat(form.evacuationCost || 0)
  const netProfit     = actualRevenue - actualExpense - (isCompleted ? evacCost : 0)

  useEffect(() => {
    accountingApi.getByProject(project.id)
      .then(res => {
        const invs = (res.data?.data || []).filter(i => i.type === 'INCOME')
        setInvoiceCounts({
          total:    invs.length,
          draft:    invs.filter(i => i.status === 'DRAFT').length,
          sent:     invs.filter(i => i.status === 'SENT').length,
          approved: invs.filter(i => i.status === 'APPROVED').length,
          returned: invs.filter(i => i.status === 'RETURNED').length,
          totalAmt: invs.reduce((s, i) => s + parseFloat(i.amount || 0), 0),
        })
      }).catch(() => {})
  }, [project.id])

  const handleComplete = async () => {
    if (form.evacuationCost === '' || parseFloat(form.evacuationCost) < 0)
      return toast.error('Evakuator xərcini daxil edin')

    const invoicesReady = await confirm({
      title: 'Qaimələr əlavə edilib?',
      message: 'Bütün qaimələr əlavə edilib və göndərilib?',
      confirmText: 'Bəli, davam et',
      cancelText: 'Xeyr, qaimə əlavə et',
    })
    if (!invoicesReady) { onSwitchToQaime?.(); return }

    const ok = await confirm({
      title: 'Layihəni bağla',
      message: 'Layihəni bağlamaq istəyirsiniz? Bu əməliyyat geri alına bilməz.',
      confirmText: 'Bağla',
    })
    if (!ok) return

    setSaving(true)
    try {
      await projectsApi.complete(project.id, { evacuationCost: parseFloat(form.evacuationCost) })
      toast.success('Layihə bağlandı')
      onCompleted()
    } catch {
    } finally {
      setSaving(false)
    }
  }

  if (project.status === 'PENDING') {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--ces-warn-100, #fff4dc)', color: 'var(--ces-warn)', display: 'inline-grid', placeItems: 'center', marginBottom: 12 }}>
          <AlertCircle size={28} />
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ces-graphite)' }}>Layihə hələ aktiv deyil</p>
        <p style={{ fontSize: 12.5, color: 'var(--ces-muted)', marginTop: 4 }}>Əvvəlcə müqavilə sənədi yükləyin</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Status banner */}
      {isCompleted ? (
        <div className="ces-alert" style={{ borderLeftColor: 'var(--ces-ok)', background: 'var(--ces-ok-100)' }}>
          <div className="ces-al-ic" style={{ background: '#e8fbe5', color: 'var(--ces-ok)' }}>
            <CheckCircle size={18} />
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ces-ok)', fontWeight: 600 }}>
            Layihə bağlanmışdır. Mühasibatlıq moduluna yönləndirilmişdir.
          </p>
        </div>
      ) : (
        <div className="ces-alert gold">
          <div className="ces-al-ic">
            <AlertCircle size={18} />
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ces-gold-700)' }}>
            Bağlamadan əvvəl bütün qaimələrin <strong>Qaimələr</strong> tabında əlavə edildiyinə əmin olun.
          </p>
        </div>
      )}

      {/* Layihə xülasəsi */}
      <div className="ces-card" style={{ padding: 16 }}>
        <p className="ces-sec-label" style={{ marginBottom: 10 }}>Layihə xülasəsi</p>
        <SummaryRow label="Şirkət" value={project.companyName || '—'} />
        {project.projectName && <SummaryRow label="Layihə" value={project.projectName} />}
        {project.region && <SummaryRow label="Bölgə" value={project.region} />}
        {project.equipmentName && (
          <SummaryRow label="Texnika" value={`${project.equipmentName}${project.equipmentCode ? ` (${project.equipmentCode})` : ''}`} />
        )}
        <SummaryRow label="Tip" value={PROJ_TYPE[project.projectType] || '—'} />
        <SummaryRow label="Başlanğıc" value={fmt(project.startDate ?? project.planStartDate)} />
        <SummaryRow label="Bitmə"     value={fmt(project.endDate ?? project.planEndDate)} />
      </div>

      {/* Qaimə statusu */}
      {invoiceCounts !== null && (
        <div className="ces-card" style={{ padding: 16 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <p className="ces-sec-label" style={{ margin: 0 }}>Qaimələr</p>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ces-ink)' }}>
              {invoiceCounts.total} ədəd · <span className="mono">{fmtMoney(invoiceCounts.totalAmt)}</span>
            </span>
          </div>
          {invoiceCounts.total === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--ces-mute2)', textAlign: 'center', padding: 8 }}>Hələ qaimə yoxdur</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {invoiceCounts.approved > 0 && (
                <span className="ces-pill ces-p-ok sm">
                  <CheckCircle size={11} /> Təsdiq: {invoiceCounts.approved}
                </span>
              )}
              {invoiceCounts.sent > 0 && (
                <span className="ces-pill ces-p-warn sm">
                  <Clock size={11} /> Göndərilib: {invoiceCounts.sent}
                </span>
              )}
              {invoiceCounts.draft > 0 && (
                <span className="ces-pill ces-p-mute sm">
                  <AlertCircle size={11} /> Qaralama: {invoiceCounts.draft}
                </span>
              )}
              {invoiceCounts.returned > 0 && (
                <span className="ces-pill ces-p-danger sm">
                  <AlertCircle size={11} /> Qaytarılıb: {invoiceCounts.returned}
                </span>
              )}
            </div>
          )}
          {!isCompleted && invoiceCounts.total > 0 && invoiceCounts.approved === 0 && (
            <p style={{ fontSize: 11, color: 'var(--ces-danger)', marginTop: 8 }}>⚠ Heç bir qaimə hələ təsdiqlənməyib</p>
          )}
        </div>
      )}

      {/* Maliyyə xülasəsi */}
      <div style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', background: 'var(--ces-graphite-50)', borderBottom: '1px solid var(--ces-line)' }}>
          <p className="ces-sec-label" style={{ margin: 0 }}>Maliyyə xülasəsi</p>
        </div>
        <div style={{ padding: '10px 16px' }}>
          <SummaryRow label="Plan gəlir (texnika)" value={fmtMoney(planRevenue)} valueColor="var(--ces-ok)" />
          {parseFloat(project.planTransportationPrice || 0) > 0 && (
            <SummaryRow label="Daşınma xərci" value={`−${fmtMoney(project.planTransportationPrice)}`} valueColor="var(--ces-danger)" />
          )}
          {parseFloat(project.planOperatorPayment || 0) > 0 && (
            <SummaryRow label="Operator haqqı" value={`−${fmtMoney(project.planOperatorPayment)}`} valueColor="var(--ces-danger)" />
          )}
          {evacCost > 0 && (
            <SummaryRow label="Evakuator xərci" value={`−${fmtMoney(evacCost)}`} valueColor="var(--ces-danger)" />
          )}
          {actualRevenue > 0 && (
            <SummaryRow label="Faktiki gəlir (qaimə)" value={fmtMoney(actualRevenue)} valueColor="var(--ces-ok)" />
          )}
        </div>
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            borderTop: '1px solid ' + (netProfit >= 0 ? '#d8f3d0' : '#fce4ea'),
            background: netProfit >= 0 ? 'var(--ces-ok-100)' : 'var(--ces-danger-100)',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ces-graphite)' }}>Xalis gəlir</span>
          <span className="mono" style={{ fontSize: 16, fontWeight: 800, color: netProfit >= 0 ? 'var(--ces-ok)' : 'var(--ces-danger)' }}>
            {netProfit >= 0 ? '+' : ''}{fmtMoney(netProfit)}
          </span>
        </div>
      </div>

      {/* Evakuator xərci */}
      <div className="ces-field" style={{ marginBottom: 0 }}>
        <label>
          Evakuator xərci (AZN) {!isCompleted && <span className="req">*</span>}
        </label>
        {isCompleted ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 14px', background: 'var(--ces-danger-100)',
              border: '1px solid #fce4ea', borderRadius: 12,
            }}
          >
            <span className="mono" style={{ fontSize: 14, fontWeight: 800, color: 'var(--ces-danger)' }}>{fmtMoney(project.evacuationCost)}</span>
            <span style={{ fontSize: 11, color: 'var(--ces-mute2)', marginLeft: 'auto' }}>Bağlanış xərci</span>
          </div>
        ) : (
          <div className="ces-input">
            <input
              className="mono"
              type="number"
              value={form.evacuationCost}
              onChange={(e) => set('evacuationCost', e.target.value)}
              placeholder="0.00"
              min="0" step="0.01"
            />
          </div>
        )}
      </div>

      {!isCompleted && (
        <button onClick={handleComplete} disabled={saving} className="ces-btn" style={{ background: 'var(--ces-ok)', color: '#fff', justifyContent: 'center' }}>
          {saving
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <CheckCircle size={15} />}
          {saving ? 'Bağlanır...' : 'Layihəni Bağla'}
        </button>
      )}
      <ConfirmDialog />
    </div>
  )
}

// ─── Main SlideOver ────────────────────────────────────────────────────────────

export default function ProjectSlideOver({ project, onClose, onSaved }) {
  const [activeTab, setActiveTab] = useState('info')
  useEscapeKey(onClose)
  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.PENDING

  return (
    <>
      <div className="ces-drawer-backdrop" onClick={onClose} />
      <div className="ces-drawer" style={{ maxWidth: 540 }}>
        {/* Header */}
        <div className="ces-drawer-head">
          <div className="ces-m-ic gold">
            <FolderKanban size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2" style={{ marginBottom: 2 }}>
              <h2 className="mono" style={{ fontSize: 17, fontWeight: 800, color: 'var(--ces-ink)', letterSpacing: '-.01em', margin: 0 }}>
                {project.projectCode || `PRJ-${String(project.id).padStart(4, '0')}`}
              </h2>
              <span className={clsx('ces-pill sm', status.pill)}>
                <span className="d"></span>
                {status.label}
              </span>
            </div>
            <p className="truncate" style={{ fontSize: 12.5, color: 'var(--ces-muted)' }}>{project.companyName}</p>
            {project.projectName && (
              <p className="truncate" style={{ fontSize: 12, color: 'var(--ces-mute2)' }}>{project.projectName}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <PrintButton />
            <button onClick={onClose} className="ces-row-act" title="Bağla">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="ces-tabs" style={{ padding: '0 12px', overflowX: 'auto', flexWrap: 'nowrap' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx('ces-tab', activeTab === id && 'on')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 14px', fontSize: 13, flex: 1 }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="ces-drawer-body">
          {activeTab === 'info' && (
            <InfoTab
              project={project}
              onEndDateUpdated={onSaved}
            />
          )}
          {activeTab === 'finance' && <FinanceTab project={project} />}
          {activeTab === 'qaime' && <ProjectQaimeTab project={project} />}
          {activeTab === 'complete' && (
            <CompleteTab project={project} onCompleted={onSaved} onSwitchToQaime={() => setActiveTab('qaime')} />
          )}
        </div>
      </div>
    </>
  )
}
