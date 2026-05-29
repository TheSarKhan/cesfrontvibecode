import { useState, useEffect, useRef, useMemo } from 'react'
import { X, ChevronLeft, ChevronDown, ChevronRight, Shield, Pencil, ArrowRight } from 'lucide-react'
import { rolesApi } from '../../api/roles'
import { permissionsApi } from '../../api/permissions'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { v } from '../../utils/validation'

const APPROVAL_MODULE_CODE = 'OPERATIONS_APPROVAL'
const CRUD = new Set(['GET', 'POST', 'PUT', 'DELETE'])

// İcazə kataloqunu modul üzrə qruplaşdır
function groupCatalog(perms) {
  const map = new Map()
  perms.forEach((p) => {
    if (!map.has(p.moduleCode)) {
      map.set(p.moduleCode, { moduleCode: p.moduleCode, moduleNameAz: p.moduleNameAz || p.moduleCode, perms: [] })
    }
    map.get(p.moduleCode).perms.push(p)
  })
  return Array.from(map.values())
}

// labelAz "Modul — Action" formatındadır; checkbox üçün yalnız action hissəsini göstər
function shortLabel(p) {
  if (p.labelAz && p.labelAz.includes(' — ')) return p.labelAz.split(' — ').slice(1).join(' — ')
  return p.labelAz || p.action
}

export default function RoleModal({ editing, currentDept, departments, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: editing?.name || '',
    description: editing?.description || '',
    departmentId: editing?.departmentId ?? currentDept?.id ?? '',
  })
  const [catalog, setCatalog] = useState([])
  const [selectedIds, setSelectedIds] = useState(() => new Set(editing?.grantedPermissionIds || []))
  const initialSelected = useRef(JSON.stringify([...(editing?.grantedPermissionIds || [])].sort()))
  const [approvalDeptIds, setApprovalDeptIds] = useState(
    () => editing?.approvalDepartments?.map((d) => d.id) || []
  )
  const initialApprovalDeptIds = useRef(editing?.approvalDepartments?.map((d) => d.id) || [])
  const initialRoleForm = useRef({ name: editing?.name || '', description: editing?.description || '', departmentId: editing?.departmentId ?? currentDept?.id ?? '' })
  const [approvalExpanded, setApprovalExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setCatalogLoading(true)
    permissionsApi.getAll()
      .then((res) => {
        setCatalog(res.data.data || [])
        if (editing?.approvalDepartments?.length > 0) setApprovalExpanded(true)
      })
      .catch(() => {})
      .finally(() => setCatalogLoading(false))
  }, [editing])

  const groups = useMemo(() => groupCatalog(catalog), [catalog])
  const moduleCodeById = useMemo(() => {
    const m = {}
    catalog.forEach((p) => { m[p.id] = p.moduleCode })
    return m
  }, [catalog])

  // OPERATIONS_APPROVAL modulundan hər hansı icazə seçilibsə approval şöbələri aktivləşir
  const hasApprovalPerm = useMemo(
    () => [...selectedIds].some((id) => moduleCodeById[id] === APPROVAL_MODULE_CODE),
    [selectedIds, moduleCodeById]
  )

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

  const togglePerm = (permId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(permId) ? next.delete(permId) : next.add(permId)
      return next
    })
  }

  const toggleAllForModule = (group) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const allChecked = group.perms.every((p) => next.has(p.id))
      group.perms.forEach((p) => { allChecked ? next.delete(p.id) : next.add(p.id) })
      return next
    })
  }

  const toggleApprovalDept = (deptId) => {
    setApprovalDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    )
  }

  const handleSave = async () => {
    if (selectedIds.size === 0) {
      toast.error('Ən azı bir icazə seçilməlidir')
      return
    }

    if (editing) {
      const formDirty = JSON.stringify(form) !== JSON.stringify(initialRoleForm.current)
      const permDirty = JSON.stringify([...selectedIds].sort()) !== initialSelected.current
      const approvalDirty = JSON.stringify([...approvalDeptIds].sort()) !== JSON.stringify([...initialApprovalDeptIds.current].sort())
      if (!formDirty && !permDirty && !approvalDirty) {
        toast('Dəyişiklik edilməyib', { icon: 'ℹ️' })
        return
      }
    }
    setLoading(true)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        departmentId: Number(form.departmentId),
        permissionIds: [...selectedIds],
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
      /* xəta interceptor-də göstərilir */
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
              {catalogLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-10 rounded-lg" style={{ background: 'var(--ces-graphite-50)' }} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {groups.map((group) => (
                    <ModuleRow
                      key={group.moduleCode}
                      group={group}
                      selectedIds={selectedIds}
                      isApproval={group.moduleCode === APPROVAL_MODULE_CODE}
                      hasApprovalPerm={hasApprovalPerm}
                      approvalExpanded={approvalExpanded}
                      approvalDeptIds={approvalDeptIds}
                      departments={departments}
                      onTogglePerm={togglePerm}
                      onToggleAll={() => toggleAllForModule(group)}
                      onToggleApprovalExpand={() => setApprovalExpanded((v2) => !v2)}
                      onToggleApprovalDept={toggleApprovalDept}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="ces-m-foot">
              <button type="button" onClick={() => setStep(1)} className="ces-btn ces-btn-ghost">
                <ChevronLeft size={16} />
                Geriyə
              </button>
              <div className="flex-1" />
              <button type="button" onClick={onClose} className="ces-btn ces-btn-ghost">
                Ləğv et
              </button>
              <button type="button" onClick={handleSave} disabled={loading} className="ces-btn ces-btn-primary">
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
        style={{ color: active ? 'var(--ces-ink)' : 'var(--ces-muted)', letterSpacing: '.08em', textTransform: 'uppercase' }}
      >
        {label}
      </span>
    </button>
  )
}

// Bir modul və onun dinamik icazə checkbox-ları (kataloqdan)
function ModuleRow({
  group, selectedIds, isApproval, hasApprovalPerm,
  approvalExpanded, approvalDeptIds, departments,
  onTogglePerm, onToggleAll, onToggleApprovalExpand, onToggleApprovalDept,
}) {
  const allChecked = group.perms.every((p) => selectedIds.has(p.id))
  const showApprovalExpand = isApproval && hasApprovalPerm

  return (
    <div className="rounded-xl border" style={{ borderColor: 'var(--ces-line)', overflow: 'hidden' }}>
      <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ background: 'var(--ces-graphite-50)' }}>
        <div className="flex items-center gap-1.5 min-w-0">
          {showApprovalExpand && (
            <button
              type="button"
              onClick={onToggleApprovalExpand}
              className="inline-grid place-items-center w-6 h-6 rounded-md"
              style={{ color: 'var(--ces-gold-700)' }}
            >
              {approvalExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          <span className="font-semibold text-[var(--ces-ink)] truncate">{group.moduleNameAz}</span>
        </div>
        <label className="ces-chk shrink-0" title="Hamısını seç/ləğv et" style={{ gap: 6 }}>
          <input type="checkbox" checked={allChecked} onChange={onToggleAll} />
          <span className="ces-cb" />
          <span className="text-xs" style={{ color: 'var(--ces-muted)' }}>Hamısı</span>
        </label>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-3 py-2.5">
        {group.perms.map((p) => (
          <label key={p.id} className="ces-chk" style={{ gap: 6, whiteSpace: 'nowrap' }} title={p.code}>
            <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => onTogglePerm(p.id)} />
            <span className="ces-cb" />
            <span
              className="text-xs font-semibold"
              style={{ color: CRUD.has(p.action) ? 'var(--ces-ink)' : 'var(--ces-info)' }}
            >
              {shortLabel(p)}
            </span>
          </label>
        ))}
      </div>

      {showApprovalExpand && approvalExpanded && (
        <div className="px-3 py-2.5" style={{ background: 'var(--ces-gold-50)', borderTop: '1px solid var(--ces-line)' }}>
          <p className="text-xs font-bold mb-2" style={{ color: 'var(--ces-gold-700)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Təsdiq edə biləcəyi şöbələr
          </p>
          <div className="flex flex-wrap gap-2 mb-1">
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
        </div>
      )}
    </div>
  )
}
