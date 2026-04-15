import DateInput from '../../components/common/DateInput'
import { useState, useEffect, useRef } from 'react'
import {
  X, Info, DollarSign, CheckCircle,
  Upload, FileText, Plus, Trash2, Download,
  TrendingUp, TrendingDown, Calendar,
  AlertCircle, Phone, User, MapPin, Wrench, Building2,
  Clock
} from 'lucide-react'
import { projectsApi } from '../../api/projects'
import { accountingApi } from '../../api/accounting'
import ProjectQaimeTab from './ProjectQaimeTab'
import axiosInstance from '../../api/axios'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'
import PrintButton from '../../components/common/PrintButton'

const STATUS_CONFIG = {
  PENDING:   { label: 'Gözləmədə',  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  ACTIVE:    { label: 'Aktiv',       cls: 'bg-green-50 text-green-700 border-green-200' },
  COMPLETED: { label: 'Bağlanmış',   cls: 'bg-gray-100 text-gray-600 border-gray-200' },
}

const TABS = [
  { id: 'info',     label: 'Məlumat',   icon: Info },
  { id: 'finance',  label: 'Maliyyə',   icon: DollarSign },
  { id: 'qaime',    label: 'Qaimələr',  icon: FileText },
  { id: 'complete', label: 'Bağlanış',  icon: CheckCircle },
]

const OWNERSHIP = { COMPANY: 'Şirkət', INVESTOR: 'İnvestor', CONTRACTOR: 'Podratçı' }
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
    <div className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0 gap-4">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right">
        {children ?? (value || '—')}
      </span>
    </div>
  )
}

function Section({ children, title }) {
  return (
    <>
      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest pt-4 pb-1.5">{title}</p>
      {children}
    </>
  )
}

// ─── Start Date Dialog ─────────────────────────────────────────────────────────

function StartDateDialog({ onConfirm, onCancel }) {
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10))

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-white rounded-2xl p-6 w-80 shadow-2xl">
        <h3 className="text-sm font-bold text-gray-800 mb-1">Başlanğıc tarixini seçin</h3>
        <p className="text-xs text-gray-400 mb-4">Layihənin başlanğıc tarixi. Boş buraxsanız bu gün istifadə ediləcək.</p>
        <DateInput
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4"
        />
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Ləğv
          </button>
          <button onClick={() => onConfirm(date)}
            className="flex-1 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors">
            Davam et
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Məlumat Tab ──────────────────────────────────────────────────────────────

function InfoTab({ project, onContractUploaded, onEndDateUpdated }) {
  const inputRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [showStartDateDialog, setShowStartDateDialog] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)

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
    } catch {
      toast.error('Fayl yüklənmədi')
    }
  }

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setShowStartDateDialog(true)
    e.target.value = ''
  }

  const handleContractUpload = async (startDate) => {
    setShowStartDateDialog(false)
    if (!pendingFile) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', pendingFile)
      await projectsApi.uploadContract(project.id, fd, startDate)
      toast.success('Müqavilə yükləndi. Layihə aktiv oldu.')
      onContractUploaded()
    } catch {
    } finally {
      setUploading(false)
      setPendingFile(null)
    }
  }

  const saveDate = async () => {
    if (!date) return
    setSavingDate(true)
    try {
      await projectsApi.updateEndDate(project.id, { endDate: date })
      toast.success('Bitmə tarixi yeniləndi')
      setEditingDate(false)
      onEndDateUpdated()
    } catch {
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

  const fmt = (d) => d ? new Date(d).toLocaleDateString('az-AZ') : '—'
  const fmtMoney = (v) => v != null ? `${parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼` : '—'

  return (
    <div>
      {showStartDateDialog && (
        <StartDateDialog
          onConfirm={handleContractUpload}
          onCancel={() => { setShowStartDateDialog(false); setPendingFile(null) }}
        />
      )}

      {/* Layihə məlumatları */}
      <Section title="Layihə məlumatları">
        <InfoRow label="Şirkət" value={project.companyName} />
        <InfoRow label="Əlaqədar şəxs">
          {project.contactPerson ? (
            <span className="flex items-center gap-1">
              <User size={10} className="text-gray-400" />
              {project.contactPerson}
            </span>
          ) : '—'}
        </InfoRow>
        <InfoRow label="Telefon">
          {project.contactPhone ? (
            <a href={`tel:${project.contactPhone}`} className="flex items-center gap-1 text-amber-600 hover:underline">
              <Phone size={10} />
              {project.contactPhone}
            </a>
          ) : '—'}
        </InfoRow>
        <InfoRow label="Layihə adı" value={project.projectName} />
        <InfoRow label="Bölgə">
          {project.region ? (
            <span className="flex items-center gap-1">
              <MapPin size={10} className="text-gray-400" />
              {project.region}
            </span>
          ) : '—'}
        </InfoRow>
        <InfoRow label="Növ / Müddət">
          {project.projectType
            ? `${PROJ_TYPE[project.projectType] || project.projectType} · ${calcDuration(project, editingStartDate ? startDate : null, editingDate ? date : null)}`
            : '—'}
        </InfoRow>
        {project.transportationRequired && (
          <InfoRow label="Daşınma">
            <span className="text-blue-600 font-semibold text-[10px]">Tələb olunur</span>
          </InfoRow>
        )}
        {project.requestDate && (
          <InfoRow label="Sorğu tarixi" value={fmt(project.requestDate)} />
        )}
      </Section>

      {/* Texniki parametrlər */}
      {project.requestParams?.length > 0 && (
        <Section title="Texniki parametrlər">
          {project.requestParams.map((p, i) => (
            <InfoRow key={i} label={p.key} value={p.value} />
          ))}
        </Section>
      )}

      {/* Texnika */}
      <Section title="Texnika">
        <InfoRow label="Ad" value={project.equipmentName} />
        <InfoRow label="Kod" value={project.equipmentCode} />
        {project.equipmentType && <InfoRow label="Növ" value={project.equipmentType} />}
        {project.equipmentBrand && <InfoRow label="Brend" value={project.equipmentBrand} />}
        {project.equipmentModel && <InfoRow label="Model" value={project.equipmentModel} />}
        {project.equipmentSerialNumber && <InfoRow label="Seriya №" value={project.equipmentSerialNumber} />}
        {project.equipmentPlateNumber && <InfoRow label="Qeydiyyat nişanı" value={project.equipmentPlateNumber} />}
        <InfoRow label="Mülkiyyət növü">
          {project.ownershipType ? (
            <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-semibold border',
              project.ownershipType === 'CONTRACTOR' ? 'bg-orange-50 text-orange-600 border-orange-200' :
              project.ownershipType === 'INVESTOR'   ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                       'bg-green-50 text-green-600 border-green-200'
            )}>
              {OWNERSHIP[project.ownershipType] || project.ownershipType}
            </span>
          ) : '—'}
        </InfoRow>
      </Section>

      {/* Podratçı məlumatları */}
      {project.ownershipType === 'CONTRACTOR' && (
        <Section title="Podratçı">
          <InfoRow label="Şirkət">
            <span className="flex items-center gap-1">
              <Building2 size={10} className="text-orange-500" />
              {project.contractorName || '—'}
            </span>
          </InfoRow>
          {project.contractorVoen && <InfoRow label="VÖEN" value={project.contractorVoen} />}
          {project.contractorPhone && (
            <InfoRow label="Telefon">
              <a href={`tel:${project.contractorPhone}`} className="flex items-center gap-1 text-amber-600 hover:underline">
                <Phone size={10} />
                {project.contractorPhone}
              </a>
            </InfoRow>
          )}
          {project.contractorContactPerson && (
            <InfoRow label="Əlaqədar şəxs">
              <span className="flex items-center gap-1">
                <User size={10} className="text-gray-400" />
                {project.contractorContactPerson}
              </span>
            </InfoRow>
          )}
          {project.contractorPayment != null && (
            <InfoRow label="Podratçı ödənişi">
              <span className="text-orange-600 font-semibold">{fmtMoney(project.contractorPayment)}</span>
            </InfoRow>
          )}
        </Section>
      )}

      {/* İnvestor məlumatları */}
      {project.ownershipType === 'INVESTOR' && (
        <Section title="İnvestor">
          <InfoRow label="Ad" value={project.investorName} />
          {project.investorVoen && <InfoRow label="VÖEN" value={project.investorVoen} />}
          {project.investorPhone && (
            <InfoRow label="Telefon">
              <a href={`tel:${project.investorPhone}`} className="flex items-center gap-1 text-amber-600 hover:underline">
                <Phone size={10} />
                {project.investorPhone}
              </a>
            </InfoRow>
          )}
        </Section>
      )}

      {/* Koordinator planı */}
      {(project.planEquipmentPrice != null || project.operatorName || project.planDayCount) && (
        <Section title="Koordinator planı">
          {project.planDayCount && <InfoRow label="Planlaşdırılan gün" value={`${project.planDayCount} gün`} />}
          {project.planStartDate && <InfoRow label="Plan başlanğıc" value={fmt(project.planStartDate)} />}
          {project.planEndDate && <InfoRow label="Plan bitmə" value={fmt(project.planEndDate)} />}
          {project.operatorName && (
            <InfoRow label="Operator">
              <span className="flex items-center gap-1">
                <User size={10} className="text-gray-400" />
                {project.operatorName}
              </span>
            </InfoRow>
          )}
          {project.planEquipmentPrice != null && (
            <InfoRow label={project.projectType === 'DAILY' ? 'Texnika qiyməti (gündəlik)' : 'Texnika qiyməti'}>
              {project.projectType === 'DAILY' && project.planDayCount > 0 ? (
                <span className="text-amber-600 font-semibold text-right">
                  {fmtMoney(project.planEquipmentPrice)} × {project.planDayCount} gün = {fmtMoney(project.planEquipmentTotal)}
                </span>
              ) : (
                <span className="text-amber-600 font-semibold">{fmtMoney(project.planEquipmentTotal ?? project.planEquipmentPrice)}</span>
              )}
            </InfoRow>
          )}
          {project.planTransportationPrice != null && (
            <InfoRow label="Nəqliyyat xərci">
              <span className="font-semibold">{fmtMoney(project.planTransportationPrice)}</span>
            </InfoRow>
          )}
          {project.planOperatorPayment != null && (
            <InfoRow label="Operator haqqı">
              <span className="font-semibold">{fmtMoney(project.planOperatorPayment)}</span>
            </InfoRow>
          )}
          {project.planNotes && <InfoRow label="Qeyd" value={project.planNotes} />}
        </Section>
      )}

      {/* Müddət */}
      <Section title="Müddət">
        <div className="flex justify-between items-center py-2 border-b border-gray-100 gap-4">
          <span className="text-xs text-gray-500 shrink-0">Başlanğıc tarixi</span>
          {project.status !== 'COMPLETED' ? (
            editingStartDate ? (
              <div className="flex items-center gap-1.5">
                <DateInput
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button onClick={saveStartDate} disabled={savingStartDate}
                  className="text-xs text-green-600 font-semibold hover:text-green-700 disabled:opacity-50">
                  {savingStartDate ? '...' : 'Saxla'}
                </button>
                <button onClick={() => setEditingStartDate(false)} className="text-xs text-gray-400 hover:text-gray-600">Ləğv</button>
              </div>
            ) : (
              <button onClick={() => setEditingStartDate(true)}
                className="flex items-center gap-1 text-xs font-medium text-gray-800 hover:text-amber-600 transition-colors">
                <Calendar size={11} className="text-gray-400" />
                {fmt(project.startDate ?? project.planStartDate)}
                <span className="text-[10px] text-amber-600 ml-1">(dəyiş)</span>
              </button>
            )
          ) : (
            <span className="text-xs font-medium text-gray-800">{fmt(project.startDate ?? project.planStartDate)}</span>
          )}
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100 gap-4">
          <span className="text-xs text-gray-500 shrink-0">Bitmə tarixi</span>
          {project.status !== 'COMPLETED' ? (
            editingDate ? (
              <div className="flex items-center gap-1.5">
                <DateInput
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button onClick={saveDate} disabled={savingDate}
                  className="text-xs text-green-600 font-semibold hover:text-green-700 disabled:opacity-50">
                  {savingDate ? '...' : 'Saxla'}
                </button>
                <button onClick={() => setEditingDate(false)} className="text-xs text-gray-400 hover:text-gray-600">Ləğv</button>
              </div>
            ) : (
              <button onClick={() => setEditingDate(true)}
                className="flex items-center gap-1 text-xs font-medium text-gray-800 hover:text-amber-600 transition-colors">
                <Calendar size={11} className="text-gray-400" />
                {fmt(project.endDate ?? project.planEndDate)}
                <span className="text-[10px] text-amber-600 ml-1">(dəyiş)</span>
              </button>
            )
          ) : (
            <span className="text-xs font-medium text-gray-800">{fmt(project.endDate ?? project.planEndDate)}</span>
          )}
        </div>
      </Section>

      {/* Müqavilə */}
      <Section title="Müqavilə">
        <InfoRow label="Status">
          {project.hasContract ? (
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-green-600 font-semibold">
                <FileText size={11} />
                Yüklənib
              </span>
              <button
                onClick={handleDownloadContract}
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
              >
                <Download size={11} />
                Endir
              </button>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertCircle size={11} />
              Gözlənilir
            </span>
          )}
        </InfoRow>
        {project.contractFileName && (
          <InfoRow label="Fayl adı" value={project.contractFileName} />
        )}
        {project.status === 'PENDING' && (
          <div className="pt-2">
            <input ref={inputRef} type="file" className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.png" onChange={handleFileSelected} />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-amber-300 rounded-xl text-xs font-medium text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
            >
              <Upload size={13} />
              {uploading ? 'Yüklənir...' : 'Müqavilə sənədini yüklə'}
            </button>
          </div>
        )}
      </Section>

      {/* Bağlanış nəticəsi (COMPLETED) */}
      {project.status === 'COMPLETED' && (
        <Section title="Bağlanış məlumatları">
          <InfoRow label="Evakuator xərci">
            <span className="text-red-500 font-semibold">{fmtMoney(project.evacuationCost)}</span>
          </InfoRow>
          <InfoRow label="Planlaşdırılan saat">
            {project.scheduledHours != null ? `${project.scheduledHours} saat` : '—'}
          </InfoRow>
          <InfoRow label="Faktiki saat">
            {project.actualHours != null ? (
              <span className={clsx('font-semibold',
                parseFloat(project.actualHours) >= parseFloat(project.scheduledHours)
                  ? 'text-green-600' : 'text-red-500')}>
                {project.actualHours} saat
              </span>
            ) : '—'}
          </InfoRow>
          {project.overtimeHours > 0 && (
            <>
              <InfoRow label="Əlavə vaxt saatı">
                <span className="text-orange-600 font-semibold">{project.overtimeHours} saat</span>
              </InfoRow>
              <InfoRow label="Əlavə vaxt dərəcəsi">
                <span className="text-orange-600 font-semibold">{project.overtimeRate}×</span>
              </InfoRow>
              <InfoRow label="Əlavə vaxt haqqı">
                <span className="text-orange-600 font-semibold">{fmtMoney(project.overtimePay)}</span>
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
                     + parseFloat(project.contractorPayment      || 0)
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

  if (loading) return <div className="py-10 text-center text-sm text-gray-400">Yüklənir...</div>

  return (
    <div className="space-y-4">
      {/* Xərclər */}
      <div className="rounded-xl border border-red-100 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 bg-red-50">
          <div className="flex items-center gap-1.5">
            <TrendingDown size={13} className="text-red-500" />
            <span className="text-xs font-semibold text-red-700">Xərclər</span>
          </div>
          <span className="text-xs font-bold text-red-600">{fmtMoney(totalExp)} ₼</span>
        </div>
        <div className="divide-y divide-gray-100">
          {/* Plan xərcləri */}
          {project.planTransportationPrice > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50/50">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600">Daşınma <span className="text-[10px] text-amber-500">(plan)</span></p>
              </div>
              <span className="text-xs font-semibold text-red-500 whitespace-nowrap">{fmtMoney(project.planTransportationPrice)} ₼</span>
            </div>
          )}
          {project.planOperatorPayment > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50/50">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600">Operator haqqı <span className="text-[10px] text-amber-500">(plan)</span></p>
              </div>
              <span className="text-xs font-semibold text-red-500 whitespace-nowrap">{fmtMoney(project.planOperatorPayment)} ₼</span>
            </div>
          )}
          {project.contractorPayment > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50/50">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600">Podratçı ödənişi <span className="text-[10px] text-amber-500">(plan)</span></p>
              </div>
              <span className="text-xs font-semibold text-red-500 whitespace-nowrap">{fmtMoney(project.contractorPayment)} ₼</span>
            </div>
          )}
          {finances.expenses?.length === 0 && planExpenses === 0 && (
            <p className="text-xs text-gray-400 py-3 text-center">Hələ xərc yoxdur</p>
          )}
          {finances.expenses?.map((e) => (
            <div key={e.id} className="flex items-center gap-2 px-3 py-2 bg-white">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{e.key}</p>
                <p className="text-[10px] text-gray-400">
                  {e.date ? new Date(e.date).toLocaleDateString('az-AZ') : ''}
                </p>
              </div>
              <span className="text-xs font-semibold text-red-600 whitespace-nowrap">{fmtMoney(e.value)} ₼</span>
              {!readOnly && (
                <button onClick={() => delExpense(e.id)}
                  className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
        {!readOnly && (
          <div className="flex gap-2 px-3 py-2.5 border-t border-red-100 bg-white">
            <input value={expKey} onChange={(e) => setExpKey(e.target.value)}
              placeholder="Növ (Benzin...)" onKeyDown={(e) => e.key === 'Enter' && addExpense()}
              className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            <input type="number" value={expVal} onChange={(e) => setExpVal(e.target.value)}
              placeholder="AZN" min="0" step="0.01" onKeyDown={(e) => e.key === 'Enter' && addExpense()}
              className="w-20 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            <button onClick={addExpense} disabled={addingExp}
              className="px-2.5 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg transition-colors">
              <Plus size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Gəlirlər */}
      <div className="rounded-xl border border-green-100 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 bg-green-50">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={13} className="text-green-600" />
            <span className="text-xs font-semibold text-green-700">Gəlirlər</span>
          </div>
          <span className="text-xs font-bold text-green-600">{fmtMoney(totalRev)} ₼</span>
        </div>
        <div className="divide-y divide-gray-100">
          {finances.revenues?.length === 0 && (
            <p className="text-xs text-gray-400 py-3 text-center">Hələ gəlir yoxdur</p>
          )}
          {finances.revenues?.map((r) => (
            <div key={r.id} className="flex items-center gap-2 px-3 py-2 bg-white">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{r.key}</p>
                <p className="text-[10px] text-gray-400">
                  {r.date ? new Date(r.date).toLocaleDateString('az-AZ') : ''}
                </p>
              </div>
              <span className="text-xs font-semibold text-green-600 whitespace-nowrap">{fmtMoney(r.value)} ₼</span>
              {!readOnly && !r.key?.startsWith('Qaimə:') && (
                <button onClick={() => delRevenue(r.id)}
                  className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
        {!readOnly && (
          <div className="flex gap-2 px-3 py-2.5 border-t border-green-100 bg-white">
            <input value={revKey} onChange={(e) => setRevKey(e.target.value)}
              placeholder="Növ (Texnika icarəsi...)" onKeyDown={(e) => e.key === 'Enter' && addRevenue()}
              className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            <input type="number" value={revVal} onChange={(e) => setRevVal(e.target.value)}
              placeholder="AZN" min="0" step="0.01" onKeyDown={(e) => e.key === 'Enter' && addRevenue()}
              className="w-20 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            <button onClick={addRevenue} disabled={addingRev}
              className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors">
              <Plus size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Xalis gəlir */}
      <div className={clsx(
        'rounded-xl px-4 py-3 border space-y-1.5',
        net >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
      )}>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Ümumi gəlir</span>
          <span className="font-semibold text-green-600">
            +{fmtMoney(totalRev)} ₼
          </span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Ümumi xərc</span>
          <span className="font-semibold text-red-500">
            −{fmtMoney(totalExp)} ₼
          </span>
        </div>
        <div className={clsx('flex items-center justify-between border-t pt-1.5',
          net >= 0 ? 'border-green-200' : 'border-red-200')}>
          <span className="text-sm font-semibold text-gray-700">Xalis Gəlir</span>
          <span className={clsx('text-lg font-bold', net >= 0 ? 'text-green-600' : 'text-red-600')}>
            {net >= 0 ? '+' : ''}{fmtMoney(net)} ₼
          </span>
        </div>
      </div>
      <ConfirmDialog />
    </div>
  )
}

// ─── Bağlanış Tab ─────────────────────────────────────────────────────────────

function SummaryRow({ label, value, valueClass = '' }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className={clsx('text-[11px] font-semibold text-gray-800', valueClass)}>{value}</span>
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
  const fmt = (d) => d ? new Date(d).toLocaleDateString('az-AZ') : '—'
  const fmtMoney = (v) => v != null && v !== '' ? `${parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼` : '—'

  const effectiveDays = project.startDate && project.endDate
    ? Math.ceil((new Date(project.endDate) - new Date(project.startDate)) / 86400000)
    : (project.planDayCount || project.dayCount || 0)
  const scheduledHours = effectiveDays * 9

  // Maliyyə xülasəsi — DAILY: unitPrice × dayCount, MONTHLY: sabit unitPrice
  const planRevenue  = parseFloat(project.planEquipmentTotal || project.planEquipmentPrice || 0)
  const planExpenses = parseFloat(project.planTransportationPrice || 0)
                     + parseFloat(project.planOperatorPayment || 0)
                     + parseFloat(project.contractorPayment || 0)
  const actualRevenue = parseFloat(project.totalRevenue || 0)
  const actualExpense = parseFloat(project.totalExpense || 0) + planExpenses
  const evacCost      = isCompleted ? parseFloat(project.evacuationCost || 0) : parseFloat(form.evacuationCost || 0)
  const netProfit     = actualRevenue - actualExpense - (isCompleted ? evacCost : 0)

  // Qaimə sayları
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
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle size={36} className="text-amber-400 mb-3" />
        <p className="text-sm font-medium text-gray-600">Layihə hələ aktiv deyil</p>
        <p className="text-xs text-gray-400 mt-1">Əvvəlcə müqavilə sənədi yükləyin</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Status banner */}
      {isCompleted ? (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle size={15} className="text-green-600 shrink-0" />
          <p className="text-xs text-green-700 font-medium">Layihə bağlanmışdır. Mühasibatlıq moduluna yönləndirilmişdir.</p>
        </div>
      ) : (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Bağlamadan əvvəl bütün qaimələrin <strong>Qaimələr</strong> tabında əlavə edildiyinə əmin olun.
          </p>
        </div>
      )}

      {/* ── Layihə xülasəsi ── */}
      <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-0.5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Layihə xülasəsi</p>
        <SummaryRow label="Şirkət" value={project.companyName || '—'} />
        {project.projectName && <SummaryRow label="Layihə" value={project.projectName} />}
        {project.region && <SummaryRow label="Bölgə" value={project.region} />}
        {project.equipmentName && (
          <SummaryRow label="Texnika" value={`${project.equipmentName}${project.equipmentCode ? ` (${project.equipmentCode})` : ''}`} />
        )}
        <SummaryRow label="Tip"
          value={project.projectType === 'MONTHLY' ? 'Aylıq' : project.projectType === 'DAILY' ? 'Günlük' : '—'} />
        <SummaryRow label="Başlanğıc" value={fmt(project.startDate ?? project.planStartDate)} />
        <SummaryRow label="Bitmə"     value={fmt(project.endDate ?? project.planEndDate)} />
        <SummaryRow label="Müddət"
          value={effectiveDays > 0
            ? (project.projectType === 'MONTHLY' ? `${Math.round(effectiveDays / 30)} ay` : `${effectiveDays} gün`)
            : '—'} />
      </div>

      {/* ── Qaimə statusu ── */}
      {invoiceCounts !== null && (
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Qaimələr</p>
            <span className="text-xs font-bold text-gray-700">{invoiceCounts.total} ədəd · {fmtMoney(invoiceCounts.totalAmt)}</span>
          </div>
          {invoiceCounts.total === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">Hələ qaimə yoxdur</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {invoiceCounts.approved > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-[11px] font-semibold">
                  <CheckCircle size={10} /> Təsdiq: {invoiceCounts.approved}
                </span>
              )}
              {invoiceCounts.sent > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[11px] font-semibold">
                  <Clock size={10} /> Göndərilib: {invoiceCounts.sent}
                </span>
              )}
              {invoiceCounts.draft > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-[11px] font-semibold">
                  <AlertCircle size={10} /> Qaralama: {invoiceCounts.draft}
                </span>
              )}
              {invoiceCounts.returned > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-600 rounded-lg text-[11px] font-semibold">
                  <AlertCircle size={10} /> Qaytarılıb: {invoiceCounts.returned}
                </span>
              )}
            </div>
          )}
          {!isCompleted && invoiceCounts.total > 0 && invoiceCounts.approved === 0 && (
            <p className="text-[10px] text-red-500 mt-2">⚠ Heç bir qaimə hələ təsdiqlənməyib</p>
          )}
        </div>
      )}

      {/* ── Maliyyə xülasəsi ── */}
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Maliyyə xülasəsi</p>
        </div>
        <div className="px-4 py-2 divide-y divide-gray-50">
          <SummaryRow label="Plan gəlir (texnika)" value={fmtMoney(planRevenue)} valueClass="text-green-600" />
          {parseFloat(project.planTransportationPrice || 0) > 0 && (
            <SummaryRow label="Daşınma xərci" value={`−${fmtMoney(project.planTransportationPrice)}`} valueClass="text-red-500" />
          )}
          {parseFloat(project.planOperatorPayment || 0) > 0 && (
            <SummaryRow label="Operator haqqı" value={`−${fmtMoney(project.planOperatorPayment)}`} valueClass="text-red-500" />
          )}
          {parseFloat(project.contractorPayment || 0) > 0 && (
            <SummaryRow label="Podratçı ödənişi" value={`−${fmtMoney(project.contractorPayment)}`} valueClass="text-red-500" />
          )}
          {evacCost > 0 && (
            <SummaryRow label="Evakuator xərci" value={`−${fmtMoney(evacCost)}`} valueClass="text-red-500" />
          )}
          {actualRevenue > 0 && (
            <SummaryRow label="Faktiki gəlir (qaimə)" value={fmtMoney(actualRevenue)} valueClass="text-green-600" />
          )}
        </div>
        <div className={clsx('flex items-center justify-between px-4 py-2.5 border-t',
          netProfit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100')}>
          <span className="text-xs font-bold text-gray-700">Xalis gəlir</span>
          <span className={clsx('text-sm font-bold', netProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
            {netProfit >= 0 ? '+' : ''}{fmtMoney(netProfit)}
          </span>
        </div>
      </div>

      {/* ── Evakuator xərci input ── */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          Evakuator Xərci (AZN) {!isCompleted && <span className="text-red-500">*</span>}
        </label>
        {isCompleted ? (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
            <span className="text-sm font-bold text-red-600">{fmtMoney(project.evacuationCost)}</span>
            <span className="text-[10px] text-red-400 ml-auto">Bağlanış xərci</span>
          </div>
        ) : (
          <input type="number" value={form.evacuationCost} onChange={(e) => set('evacuationCost', e.target.value)}
            placeholder="0.00" min="0" step="0.01"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        )}
      </div>

      {!isCompleted && (
        <button onClick={handleComplete} disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
          <CheckCircle size={15} />
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
  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.PENDING

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-base font-bold text-gray-800">
                {project.projectCode || `PRJ-${String(project.id).padStart(4, '0')}`}
              </h2>
              <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0', status.cls)}>
                {status.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 truncate">{project.companyName}</p>
            {project.projectName && (
              <p className="text-xs text-gray-400 truncate">{project.projectName}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PrintButton />
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors shrink-0"
            >
              <X size={14} className="text-white" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2',
                activeTab === id
                  ? 'border-amber-600 text-amber-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'info' && (
            <InfoTab
              project={project}
              onContractUploaded={onSaved}
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
