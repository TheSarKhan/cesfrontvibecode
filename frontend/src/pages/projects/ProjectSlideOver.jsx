import { useState, useEffect, useRef } from 'react'
import {
  X, Info, DollarSign, CheckCircle,
  Upload, FileText, Plus, Trash2,
  TrendingUp, TrendingDown, Calendar,
  AlertCircle, Phone, User, MapPin, Wrench, Building2
} from 'lucide-react'
import { projectsApi } from '../../api/projects'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const STATUS_CONFIG = {
  PENDING:   { label: 'Gözləmədə',  cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  ACTIVE:    { label: 'Aktiv',       cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  COMPLETED: { label: 'Bağlanmış',   cls: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
}

const TABS = [
  { id: 'info',     label: 'Məlumat',   icon: Info },
  { id: 'finance',  label: 'Maliyyə',   icon: DollarSign },
  { id: 'complete', label: 'Bağlanış',  icon: CheckCircle },
]

function InfoRow({ label, value, children }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 gap-4">
      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-800 dark:text-gray-200 text-right">
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

// ─── Məlumat Tab ──────────────────────────────────────────────────────────────

function InfoTab({ project, onContractUploaded, onEndDateUpdated }) {
  const inputRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [editingDate, setEditingDate] = useState(false)
  const [date, setDate] = useState(project.endDate?.substring(0, 10) || '')
  const [savingDate, setSavingDate] = useState(false)

  const handleContractUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await projectsApi.uploadContract(project.id, fd)
      toast.success('Müqavilə yükləndi. Layihə aktiv oldu.')
      onContractUploaded()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Müqavilə yüklənmədi')
    } finally {
      setUploading(false)
      e.target.value = ''
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
      toast.error('Tarix yenilənmədi')
    } finally {
      setSavingDate(false)
    }
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString('az-AZ') : '—'
  const fmtMoney = (v) => v != null ? `${parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼` : '—'
  const OWNERSHIP = { COMPANY: 'Şirkət', INVESTOR: 'İnvestor', CONTRACTOR: 'Podratçı' }
  const PROJ_TYPE = { DAILY: 'Günlük', MONTHLY: 'Aylıq' }

  return (
    <div>
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
            ? `${PROJ_TYPE[project.projectType] || project.projectType} · ${project.dayCount || '—'} gün`
            : '—'}
        </InfoRow>
      </Section>

      {/* Texnika */}
      <Section title="Texnika">
        <InfoRow label="Texnika adı" value={project.equipmentName} />
        <InfoRow label="Texnika kodu" value={project.equipmentCode} />
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
        {project.ownershipType === 'CONTRACTOR' && (
          <InfoRow label="Podratçı">
            <span className="flex items-center gap-1">
              <Building2 size={10} className="text-orange-500" />
              {project.contractorName || '—'}
            </span>
          </InfoRow>
        )}
        {project.ownershipType === 'CONTRACTOR' && (
          <InfoRow label="Podratçı ödənişi">
            <span className="text-orange-600 font-semibold">
              {fmtMoney(project.contractorAmount)}
            </span>
          </InfoRow>
        )}
      </Section>

      {/* Müddət */}
      <Section title="Müddət">
        <InfoRow label="Başlanğıc tarixi" value={fmt(project.startDate)} />
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 gap-4">
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Bitmə tarixi</span>
          {project.status === 'ACTIVE' ? (
            editingDate ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button onClick={saveDate} disabled={savingDate}
                  className="text-xs text-green-600 font-semibold hover:text-green-700 disabled:opacity-50">
                  {savingDate ? '...' : 'Saxla'}
                </button>
                <button onClick={() => setEditingDate(false)} className="text-xs text-gray-400 hover:text-gray-600">Ləğv</button>
              </div>
            ) : (
              <button onClick={() => setEditingDate(true)}
                className="flex items-center gap-1 text-xs font-medium text-gray-800 dark:text-gray-200 hover:text-amber-600 transition-colors">
                <Calendar size={11} className="text-gray-400" />
                {fmt(project.endDate)}
                <span className="text-[10px] text-amber-600 ml-1">(dəyiş)</span>
              </button>
            )
          ) : (
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{fmt(project.endDate)}</span>
          )}
        </div>
      </Section>

      {/* Müqavilə */}
      <Section title="Müqavilə">
        <InfoRow label="Status">
          {project.hasContract ? (
            <span className="flex items-center gap-1 text-green-600 font-semibold">
              <FileText size={11} />
              Yüklənib
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
              accept=".pdf,.doc,.docx,.jpg,.png" onChange={handleContractUpload} />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-xl text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
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
          <InfoRow label="Planlaşdırılan iş saatı">
            {project.scheduledHours != null ? `${project.scheduledHours} saat` : '—'}
          </InfoRow>
          <InfoRow label="Faktiki iş saatı">
            {project.actualHours != null ? (
              <span className={clsx('font-semibold',
                parseFloat(project.actualHours) >= parseFloat(project.scheduledHours)
                  ? 'text-green-600' : 'text-red-500')}>
                {project.actualHours} saat
              </span>
            ) : '—'}
          </InfoRow>
        </Section>
      )}
    </div>
  )
}

// ─── Maliyyə Tab ──────────────────────────────────────────────────────────────

function FinanceTab({ project }) {
  const [finances, setFinances] = useState({ expenses: [], revenues: [] })
  const [loading, setLoading] = useState(true)
  const [expKey, setExpKey] = useState('')
  const [expVal, setExpVal] = useState('')
  const [revKey, setRevKey] = useState('')
  const [revVal, setRevVal] = useState('')
  const [addingExp, setAddingExp] = useState(false)
  const [addingRev, setAddingRev] = useState(false)
  const readOnly = project.status === 'COMPLETED'

  const load = async () => {
    try {
      const res = await projectsApi.getFinances(project.id)
      setFinances(res.data.data || res.data || { expenses: [], revenues: [] })
    } catch {
      toast.error('Maliyyə məlumatları yüklənmədi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [project.id])

  const totalExp = (finances.expenses || []).reduce((s, e) => s + parseFloat(e.value || 0), 0)
  const totalRev = (finances.revenues || []).reduce((s, r) => s + parseFloat(r.value || 0), 0)
  const net = totalRev - totalExp

  const addExpense = async () => {
    if (!expKey.trim() || !expVal || parseFloat(expVal) <= 0) return toast.error('Növ və məbləğ daxil edin')
    setAddingExp(true)
    try {
      await projectsApi.addExpense(project.id, { key: expKey.trim(), value: parseFloat(expVal) })
      setExpKey(''); setExpVal('')
      load()
    } catch (err) { toast.error(err?.response?.data?.message || 'Xərc əlavə edilmədi') }
    finally { setAddingExp(false) }
  }

  const delExpense = async (id) => {
    if (!window.confirm('Bu xərci silmək istəyirsiniz?')) return
    try { await projectsApi.deleteExpense(project.id, id); load() }
    catch { toast.error('Silmə uğursuz oldu') }
  }

  const addRevenue = async () => {
    if (!revKey.trim() || !revVal || parseFloat(revVal) <= 0) return toast.error('Növ və məbləğ daxil edin')
    setAddingRev(true)
    try {
      await projectsApi.addRevenue(project.id, { key: revKey.trim(), value: parseFloat(revVal) })
      setRevKey(''); setRevVal('')
      load()
    } catch (err) { toast.error(err?.response?.data?.message || 'Gəlir əlavə edilmədi') }
    finally { setAddingRev(false) }
  }

  const delRevenue = async (id) => {
    if (!window.confirm('Bu gəliri silmək istəyirsiniz?')) return
    try { await projectsApi.deleteRevenue(project.id, id); load() }
    catch { toast.error('Silmə uğursuz oldu') }
  }

  const fmtMoney = (v) => parseFloat(v || 0).toLocaleString('az-AZ', { minimumFractionDigits: 2 })

  if (loading) return <div className="py-10 text-center text-sm text-gray-400">Yüklənir...</div>

  return (
    <div className="space-y-4">
      {/* Xərclər */}
      <div className="rounded-xl border border-red-100 dark:border-red-900/30 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-1.5">
            <TrendingDown size={13} className="text-red-500" />
            <span className="text-xs font-semibold text-red-700 dark:text-red-400">Xərclər</span>
          </div>
          <span className="text-xs font-bold text-red-600 dark:text-red-400">{fmtMoney(totalExp)} ₼</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {finances.expenses?.length === 0 && (
            <p className="text-xs text-gray-400 py-3 text-center">Hələ xərc yoxdur</p>
          )}
          {finances.expenses?.map((e) => (
            <div key={e.id} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{e.key}</p>
                <p className="text-[10px] text-gray-400">
                  {e.date ? new Date(e.date).toLocaleDateString('az-AZ') : ''}
                </p>
              </div>
              <span className="text-xs font-semibold text-red-600 whitespace-nowrap">{fmtMoney(e.value)} ₼</span>
              {!readOnly && (
                <button onClick={() => delExpense(e.id)}
                  className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
        {!readOnly && (
          <div className="flex gap-2 px-3 py-2.5 border-t border-red-100 dark:border-red-900/30 bg-white dark:bg-gray-800">
            <input value={expKey} onChange={(e) => setExpKey(e.target.value)}
              placeholder="Növ (Benzin...)" onKeyDown={(e) => e.key === 'Enter' && addExpense()}
              className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            <input type="number" value={expVal} onChange={(e) => setExpVal(e.target.value)}
              placeholder="AZN" min="0" step="0.01" onKeyDown={(e) => e.key === 'Enter' && addExpense()}
              className="w-20 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            <button onClick={addExpense} disabled={addingExp}
              className="px-2.5 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg transition-colors">
              <Plus size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Gəlirlər */}
      <div className="rounded-xl border border-green-100 dark:border-green-900/30 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={13} className="text-green-600" />
            <span className="text-xs font-semibold text-green-700 dark:text-green-400">Gəlirlər</span>
          </div>
          <span className="text-xs font-bold text-green-600 dark:text-green-400">{fmtMoney(totalRev)} ₼</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {finances.revenues?.length === 0 && (
            <p className="text-xs text-gray-400 py-3 text-center">Hələ gəlir yoxdur</p>
          )}
          {finances.revenues?.map((r) => (
            <div key={r.id} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{r.key}</p>
                <p className="text-[10px] text-gray-400">
                  {r.date ? new Date(r.date).toLocaleDateString('az-AZ') : ''}
                </p>
              </div>
              <span className="text-xs font-semibold text-green-600 whitespace-nowrap">{fmtMoney(r.value)} ₼</span>
              {!readOnly && (
                <button onClick={() => delRevenue(r.id)}
                  className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
        {!readOnly && (
          <div className="flex gap-2 px-3 py-2.5 border-t border-green-100 dark:border-green-900/30 bg-white dark:bg-gray-800">
            <input value={revKey} onChange={(e) => setRevKey(e.target.value)}
              placeholder="Növ (Texnika icarəsi...)" onKeyDown={(e) => e.key === 'Enter' && addRevenue()}
              className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            <input type="number" value={revVal} onChange={(e) => setRevVal(e.target.value)}
              placeholder="AZN" min="0" step="0.01" onKeyDown={(e) => e.key === 'Enter' && addRevenue()}
              className="w-20 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            <button onClick={addRevenue} disabled={addingRev}
              className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors">
              <Plus size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Xalis gəlir */}
      <div className={clsx(
        'flex items-center justify-between rounded-xl px-4 py-3 border',
        net >= 0
          ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30'
          : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
      )}>
        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Xalis Gəlir</span>
        <span className={clsx('text-lg font-bold', net >= 0 ? 'text-green-600' : 'text-red-600')}>
          {net >= 0 ? '+' : ''}{fmtMoney(net)} ₼
        </span>
      </div>
    </div>
  )
}

// ─── Bağlanış Tab ─────────────────────────────────────────────────────────────

function CompleteTab({ project, onCompleted }) {
  const [form, setForm] = useState({
    evacuationCost: project.evacuationCost ?? '',
    scheduledHours: project.scheduledHours ?? '',
    actualHours:    project.actualHours    ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (f, v) => setForm((p) => ({ ...p, [f]: v }))
  const isCompleted = project.status === 'COMPLETED'
  const fmtMoney = (v) => v != null ? `${parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼` : '—'

  const handleComplete = async () => {
    if (!form.evacuationCost || parseFloat(form.evacuationCost) < 0) return toast.error('Evakuator xərcini daxil edin')
    if (!form.scheduledHours || parseFloat(form.scheduledHours) <= 0) return toast.error('Planlaşdırılan iş saatını daxil edin')
    if (!form.actualHours   || parseFloat(form.actualHours)    <= 0) return toast.error('Faktiki iş saatını daxil edin')
    if (!window.confirm('Layihəni bağlamaq istəyirsiniz? Bu əməliyyat geri alına bilməz.')) return

    setSaving(true)
    try {
      await projectsApi.complete(project.id, {
        evacuationCost: parseFloat(form.evacuationCost),
        scheduledHours: parseFloat(form.scheduledHours),
        actualHours:    parseFloat(form.actualHours),
      })
      toast.success('Layihə bağlandı. Mühasibatlığa yönləndirildi.')
      onCompleted()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Layihə bağlanmadı')
    } finally {
      setSaving(false)
    }
  }

  if (project.status === 'PENDING') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle size={36} className="text-amber-400 mb-3" />
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Layihə hələ aktiv deyil</p>
        <p className="text-xs text-gray-400 mt-1">Əvvəlcə müqavilə sənədi yükləyin</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {isCompleted && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
          <CheckCircle size={15} className="text-green-600 shrink-0" />
          <p className="text-xs text-green-700 dark:text-green-400 font-medium">
            Layihə bağlanmışdır. Mühasibatlıq moduluna yönləndirilmişdir.
          </p>
        </div>
      )}

      {!isCompleted && (
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Bağlandıqdan sonra layihə <strong>Mühasibatlıq</strong> moduluna avtomatik yönləndiriləcək.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
            Evakuator Xərci (AZN) {!isCompleted && <span className="text-red-500">*</span>}
          </label>
          {isCompleted ? (
            <p className="text-sm font-bold text-red-500">{fmtMoney(project.evacuationCost)}</p>
          ) : (
            <input type="number" value={form.evacuationCost} onChange={(e) => set('evacuationCost', e.target.value)}
              placeholder="0.00" min="0" step="0.01"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              Planlaşdırılan Saat {!isCompleted && <span className="text-red-500">*</span>}
            </label>
            {isCompleted ? (
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{project.scheduledHours} saat</p>
            ) : (
              <input type="number" value={form.scheduledHours} onChange={(e) => set('scheduledHours', e.target.value)}
                placeholder="0" min="0" step="0.5"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              Faktiki Saat {!isCompleted && <span className="text-red-500">*</span>}
            </label>
            {isCompleted ? (
              <p className={clsx('text-sm font-bold',
                parseFloat(project.actualHours) >= parseFloat(project.scheduledHours) ? 'text-green-600' : 'text-red-500')}>
                {project.actualHours} saat
              </p>
            ) : (
              <input type="number" value={form.actualHours} onChange={(e) => set('actualHours', e.target.value)}
                placeholder="0" min="0" step="0.5"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            )}
          </div>
        </div>

        {/* Preview */}
        {!isCompleted && (form.scheduledHours || form.actualHours || form.evacuationCost) && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 space-y-1.5">
            {form.scheduledHours && form.actualHours && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Saat fərqi (faktiki − planlı)</span>
                <span className={parseFloat(form.actualHours) >= parseFloat(form.scheduledHours) ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                  {(parseFloat(form.actualHours || 0) - parseFloat(form.scheduledHours || 0)).toFixed(1)} saat
                </span>
              </div>
            )}
            {form.evacuationCost && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Evakuator xərci</span>
                <span className="text-red-500 font-semibold">−{parseFloat(form.evacuationCost || 0).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼</span>
              </div>
            )}
          </div>
        )}
      </div>

      {!isCompleted && (
        <button onClick={handleComplete} disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
          <CheckCircle size={15} />
          {saving ? 'Bağlanır...' : 'Layihəni Bağla'}
        </button>
      )}
    </div>
  )
}

// ─── Main SlideOver ────────────────────────────────────────────────────────────

export default function ProjectSlideOver({ project, onClose, onSaved }) {
  const [activeTab, setActiveTab] = useState('info')
  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.PENDING

  const tabs = project.status === 'PENDING'
    ? TABS.filter(t => t.id !== 'complete') // hide complete tab for PENDING with no contract
    : TABS

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
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
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors shrink-0"
          >
            <X size={14} className="text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2',
                activeTab === id
                  ? 'border-amber-600 text-amber-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
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
          {activeTab === 'complete' && (
            <CompleteTab project={project} onCompleted={onSaved} />
          )}
        </div>
      </div>
    </>
  )
}
