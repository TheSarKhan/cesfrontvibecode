import { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronDown, ChevronRight, Shield, Pencil, ArrowRight } from 'lucide-react'
import { rolesApi } from '../../api/roles'
import { modulesApi } from '../../api/modules'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { v } from '../../utils/validation'

const PERM_COLS = [
  { key: 'canGet', label: 'Oxumaq' },
  { key: 'canPost', label: 'Yazmaq' },
  { key: 'canPut', label: 'Redaktə' },
  { key: 'canDelete', label: 'Silmək' },
]

const MODULE_LABELS = {
  DASHBOARD:            'İdarə Paneli',
  CUSTOMER_MANAGEMENT:  'Müştəri İdarəetməsi',
  CONTRACTOR_MANAGEMENT:'Podratçı İdarəetməsi',
  ROLE_PERMISSION:      'Rol və İcazə İdarəetməsi',
  EMPLOYEE_MANAGEMENT:  'İstifadəçi İdarəetməsi',
  GARAGE:               'Qaraj Modulu',
  REQUESTS:             'Sorğular Modulu',
  COORDINATOR:          'Koordinator Modulu',
  PROJECTS:             'Layihələr Modulu',
  ACCOUNTING:           'Mühasibatlıq Modulu',
  SERVICE_MANAGEMENT:   'Texniki Servis Modulu',
  OPERATIONS_APPROVAL:  'Əməliyyat Təsdiqi',
}

const EXTRA_PERMS = {
  REQUESTS:    { key: 'canSendToCoordinator', label: 'Kordinatora göndər' },
  COORDINATOR: { key: 'canSubmitOffer',       label: 'Təklif göndər' },
  PROJECTS:    { key: 'canSendToAccounting',  label: 'Mühasibatlığa göndər' },
  ACCOUNTING:  { key: 'canReturnToProject',   label: 'Layihəyə geri göndər' },
}

const APPROVAL_MODULE_CODE = 'OPERATIONS_APPROVAL'

export default function RoleModal({ editing, currentDept, departments, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: editing?.name || '',
    description: editing?.description || '',
    departmentId: editing?.departmentId ?? currentDept?.id ?? '',
  })
  const [modules, setModules] = useState([])
  const [permMap, setPermMap] = useState({})
  const [initialPermMap, setInitialPermMap] = useState(null)
  const [approvalDeptIds, setApprovalDeptIds] = useState(
    () => editing?.approvalDepartments?.map((d) => d.id) || []
  )
  const initialApprovalDeptIds = useRef(editing?.approvalDepartments?.map((d) => d.id) || [])
  const initialRoleForm = useRef({ name: editing?.name || '', description: editing?.description || '', departmentId: editing?.departmentId ?? currentDept?.id ?? '' })
  const [approvalExpanded, setApprovalExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [modulesLoading, setModulesLoading] = useState(true)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setModulesLoading(true)
    modulesApi.getAll()
      .then((res) => {
        const mods = res.data.data || []
        setModules(mods)
        const map = {}
        mods.forEach((mod) => {
          const existing = editing?.permissions?.find((p) => p.moduleId === mod.id)
          map[mod.id] = {
            canGet: existing?.canGet || false,
            canPost: existing?.canPost || false,
            canPut: existing?.canPut || false,
            canDelete: existing?.canDelete || false,
            canSendToCoordinator: existing?.canSendToCoordinator || false,
            canSubmitOffer: existing?.canSubmitOffer || false,
            canSendToAccounting: existing?.canSendToAccounting || false,
            canReturnToProject: existing?.canReturnToProject || false,
          }
        })
        setPermMap(map)
        setInitialPermMap(map)
        if (editing?.approvalDepartments?.length > 0) setApprovalExpanded(true)
      })
      .catch(() => {})
      .finally(() => setModulesLoading(false))
  }, [editing])

  const validateStep1 = () => {
    const errs = {}
    const nameErr = v.chain(
      form.name || '',
      v.required,
      (val) => v.minLen(val, 2),
      v.realContent,
      (val) => v.maxLen(val, 100),
    )
    if (nameErr) errs.name = nameErr
    if (!form.departmentId) errs.departmentId = 'Şöbə seçilməlidir'
    if (form.description?.trim()) {
      const descErr = v.maxLen(form.description, 500)
      if (descErr) errs.description = descErr
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const togglePerm = (moduleId, key) => {
    setPermMap((prev) => ({
      ...prev,
      [moduleId]: { ...prev[moduleId], [key]: !prev[moduleId]?.[key] },
    }))
  }

  const toggleAllForModule = (moduleId) => {
    setPermMap((prev) => {
      const cur = prev[moduleId] || {}
      const allChecked = PERM_COLS.every((c) => cur[c.key])
      const updated = { ...cur }
      PERM_COLS.forEach((c) => { updated[c.key] = !allChecked })
      return { ...prev, [moduleId]: updated }
    })
  }

  const toggleApprovalDept = (deptId) => {
    setApprovalDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    )
  }

  const approvalModuleId = modules.find((m) => m.code === APPROVAL_MODULE_CODE)?.id
  const hasApprovalPerm = approvalModuleId && PERM_COLS.some((c) => permMap[approvalModuleId]?.[c.key])

  const handleSave = async () => {
    const hasAnyPerm = Object.values(permMap).some(p =>
      p.canGet || p.canPost || p.canPut || p.canDelete || p.canSendToCoordinator || p.canSubmitOffer || p.canSendToAccounting || p.canReturnToProject
    )
    if (!hasAnyPerm) {
      toast.error('Ən azı bir modul üçün icazə seçilməlidir')
      return
    }

    if (editing && initialPermMap) {
      const formDirty = JSON.stringify(form) !== JSON.stringify(initialRoleForm.current)
      const permDirty = JSON.stringify(permMap) !== JSON.stringify(initialPermMap)
      const approvalDirty = JSON.stringify([...approvalDeptIds].sort()) !== JSON.stringify([...initialApprovalDeptIds.current].sort())
      if (!formDirty && !permDirty && !approvalDirty) {
        toast('Dəyişiklik edilməyib', { icon: 'ℹ️' })
        return
      }
    }
    setLoading(true)
    try {
      const permissions = Object.entries(permMap)
        .filter(([, p]) => p.canGet || p.canPost || p.canPut || p.canDelete || p.canSendToCoordinator || p.canSubmitOffer || p.canSendToAccounting || p.canReturnToProject)
        .map(([moduleId, p]) => ({ moduleId: Number(moduleId), ...p }))

      const payload = {
        name: form.name,
        description: form.description,
        departmentId: Number(form.departmentId),
        permissions,
        approvalDepartmentIds: hasApprovalPerm ? approvalDeptIds : [],
      }

      if (editing) {
        await rolesApi.update(editing.id, payload)
        toast.success('Rol yeniləndi')
      } else {
        await rolesApi.create(payload)
        toast.success('Rol yaradıldı')
      }
      onSaved()
    } catch {
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ces-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="ces-modal" style={{ maxWidth: 880 }}>
        <div className="ces-m-head">
          <div className={clsx('ces-m-ic', editing ? 'gold' : '')}>
            {editing ? <Pencil size={20} /> : <Shield size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3>{editing ? 'Rolu redaktə et' : 'Yeni rol'}</h3>
            <p>
              {step === 1
                ? 'Rolun adını, şöbəsini və təsvirini daxil edin'
                : 'Bu rol üçün icazələri təyin edin'}
            </p>
          </div>
          <button onClick={onClose} className="ces-modal-x" type="button" aria-label="Bağla">
            <X size={16} />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 px-7 py-3" style={{ background: 'var(--ces-graphite-50)', borderBottom: '1px solid var(--ces-line)' }}>
          <StepIndicator num={1} label="Məlumat" active={step === 1} done={step > 1} onClick={() => editing && setStep(1)} />
          <ArrowRight size={14} style={{ color: 'var(--ces-mute2)' }} />
          <StepIndicator num={2} label="İcazələr" active={step === 2} />
        </div>

        {step === 1 && (
          <>
            <div className="ces-m-body">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
                <div className="ces-field">
                  <label>Rolun adı <span className="req">*</span></label>
                  <div className={clsx('ces-input', errors.name && 'is-error')}>
                    <input
                      value={form.name}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, name: e.target.value }))
                        if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
                      }}
                      placeholder="Məs: Layihə meneceri"
                      autoFocus
                    />
                  </div>
                  {errors.name && <span className="ces-err">{errors.name}</span>}
                </div>

                <div className="ces-field">
                  <label>Departament <span className="req">*</span></label>
                  <select
                    value={form.departmentId}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, departmentId: e.target.value }))
                      if (errors.departmentId) setErrors((prev) => ({ ...prev, departmentId: undefined }))
                    }}
                    disabled={!!currentDept}
                    className={clsx('ces-select', errors.departmentId && 'is-error')}
                    style={currentDept ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                  >
                    <option value="">Şöbə seçin</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {errors.departmentId && <span className="ces-err">{errors.departmentId}</span>}
                </div>
              </div>

              <div className="ces-field">
                <label>Təsvir</label>
                <div className={clsx('ces-input', errors.description && 'is-error')} style={{ alignItems: 'flex-start', paddingTop: 4, paddingBottom: 4 }}>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Rolu təsvir edin..."
                  />
                </div>
                {errors.description && <span className="ces-err">{errors.description}</span>}
              </div>
            </div>

            <div className="ces-m-foot">
              <button type="button" onClick={onClose} className="ces-btn ces-btn-ghost">
                Ləğv et
              </button>
              <button
                type="button"
                onClick={() => { if (validateStep1()) setStep(2) }}
                className="ces-btn ces-btn-primary"
              >
                Davam et
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="ces-m-body" style={{ maxHeight: '60vh' }}>
              {modulesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-10 rounded-lg" style={{ background: 'var(--ces-graphite-50)' }} />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="ces-tbl" style={{ minWidth: 720 }}>
                    <thead>
                      <tr>
                        <th>Modul</th>
                        {PERM_COLS.map((c) => (
                          <th key={c.key} style={{ textAlign: 'center', width: 70 }}>{c.label}</th>
                        ))}
                        <th style={{ textAlign: 'center', width: 60 }}>Hamısı</th>
                        <th>Əlavə</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map((mod) => {
                        const allChecked = PERM_COLS.every((c) => permMap[mod.id]?.[c.key])
                        const isApproval = mod.code === APPROVAL_MODULE_CODE
                        const anyPerm = PERM_COLS.some((c) => permMap[mod.id]?.[c.key])

                        return (
                          <ModuleRow
                            key={mod.id}
                            mod={mod}
                            permMap={permMap}
                            allChecked={allChecked}
                            isApproval={isApproval}
                            anyPerm={anyPerm}
                            approvalExpanded={approvalExpanded}
                            approvalDeptIds={approvalDeptIds}
                            departments={departments}
                            onTogglePerm={togglePerm}
                            onToggleAll={() => toggleAllForModule(mod.id)}
                            onToggleApprovalExpand={() => setApprovalExpanded((v) => !v)}
                            onToggleApprovalDept={toggleApprovalDept}
                          />
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="ces-m-foot">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="ces-btn ces-btn-ghost"
              >
                <ChevronLeft size={16} />
                Geriyə
              </button>
              <div className="flex-1" />
              <button type="button" onClick={onClose} className="ces-btn ces-btn-ghost">
                Ləğv et
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="ces-btn ces-btn-primary"
              >
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editing ? 'Yadda saxla' : 'Yarat'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StepIndicator({ num, label, active, done, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="inline-flex items-center gap-2 transition-colors"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <span
        className="inline-grid place-items-center rounded-full text-xs font-bold mono"
        style={{
          width: 22,
          height: 22,
          background: active ? 'var(--ces-gold)' : (done ? 'var(--ces-graphite)' : 'var(--ces-graphite-100)'),
          color: active ? 'var(--ces-on-gold)' : (done ? 'var(--ces-gold)' : 'var(--ces-muted)'),
          boxShadow: active ? '0 0 0 3px var(--ces-gold-100)' : 'none',
        }}
      >
        {num}
      </span>
      <span
        className="text-xs font-bold"
        style={{
          color: active ? 'var(--ces-ink)' : 'var(--ces-muted)',
          letterSpacing: '.08em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </button>
  )
}

function ModuleRow({
  mod, permMap, allChecked, isApproval, anyPerm,
  approvalExpanded, approvalDeptIds, departments,
  onTogglePerm, onToggleAll, onToggleApprovalExpand, onToggleApprovalDept,
}) {
  const extra = EXTRA_PERMS[mod.code]
  return (
    <>
      <tr style={isApproval && anyPerm ? { background: 'var(--ces-gold-50)' } : undefined}>
        <td>
          <div className="flex items-center gap-1.5">
            {isApproval && anyPerm && (
              <button
                type="button"
                onClick={onToggleApprovalExpand}
                className="inline-grid place-items-center w-6 h-6 rounded-md transition-colors"
                style={{ color: 'var(--ces-gold-700)' }}
              >
                {approvalExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
            <span className="font-semibold text-[var(--ces-ink)]">
              {MODULE_LABELS[mod.code] || mod.nameAz}
            </span>
          </div>
        </td>
        {PERM_COLS.map((c) => (
          <td key={c.key} style={{ textAlign: 'center' }}>
            <label className="ces-chk" style={{ justifyContent: 'center' }}>
              <input
                type="checkbox"
                checked={permMap[mod.id]?.[c.key] || false}
                onChange={() => onTogglePerm(mod.id, c.key)}
              />
              <span className="ces-cb" />
            </label>
          </td>
        ))}
        <td style={{ textAlign: 'center' }}>
          <label className="ces-chk" style={{ justifyContent: 'center' }} title="Hamısını seç">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={onToggleAll}
            />
            <span className="ces-cb" />
          </label>
        </td>
        <td>
          {extra ? (
            <label className="ces-chk" style={{ whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={permMap[mod.id]?.[extra.key] || false}
                onChange={() => onTogglePerm(mod.id, extra.key)}
              />
              <span className="ces-cb" />
              <span className="text-xs font-semibold" style={{ color: 'var(--ces-info)' }}>
                {extra.label}
              </span>
            </label>
          ) : null}
        </td>
      </tr>

      {isApproval && anyPerm && approvalExpanded && (
        <tr style={{ background: 'var(--ces-gold-50)' }}>
          <td colSpan={7} style={{ paddingLeft: 36 }}>
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--ces-gold-700)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
              Təsdiq edə biləcəyi şöbələr
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {departments.map((dept) => {
                const checked = approvalDeptIds.includes(dept.id)
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => onToggleApprovalDept(dept.id)}
                    className={clsx('ces-btn ces-btn-xs', checked ? 'ces-btn-gold' : 'ces-btn-outline')}
                  >
                    {dept.name}
                  </button>
                )
              })}
            </div>
            {approvalDeptIds.length === 0 && (
              <p className="text-xs italic m-0" style={{ color: 'var(--ces-mute2)' }}>
                Heç bir şöbə seçilməyib — bütün şöbələrin əməliyyatlarını təsdiq edə biləcək
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
