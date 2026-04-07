import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronDown, ChevronRight } from 'lucide-react'
import { rolesApi } from '../../api/roles'
import { modulesApi } from '../../api/modules'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const PERM_COLS = [
  { key: 'canGet', label: 'Oxumaq' },
  { key: 'canPost', label: 'Yazmaq' },
  { key: 'canPut', label: 'Redaktə' },
  { key: 'canDelete', label: 'Silmək' },
]

const MODULE_LABELS = {
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
  const [approvalDeptIds, setApprovalDeptIds] = useState(
    () => editing?.approvalDepartments?.map((d) => d.id) || []
  )
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
        // Auto-expand if editing and already has approval depts
        if (editing?.approvalDepartments?.length > 0) setApprovalExpanded(true)
      })
      .catch(() => {})
      .finally(() => setModulesLoading(false))
  }, [editing])

  const inputCls = (field) => clsx(
    'w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    errors[field]
      ? 'border-red-400 dark:border-red-500 focus:ring-red-400'
      : 'border-gray-300 dark:border-gray-600 focus:ring-amber-500'
  )

  const validateStep1 = () => {
    const errs = {}
    if (!form.name?.trim()) errs.name = 'Rol adı mütləqdir'
    if (!form.departmentId) errs.departmentId = 'Departament seçin'
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

  // Check if OPERATIONS_APPROVAL module has any perm checked
  const approvalModuleId = modules.find((m) => m.code === APPROVAL_MODULE_CODE)?.id
  const hasApprovalPerm = approvalModuleId && PERM_COLS.some((c) => permMap[approvalModuleId]?.[c.key])

  const handleSave = async () => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors z-10"
        >
          <X size={14} className="text-white" />
        </button>

        {/* ── STEP 1 ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="p-7">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">
              {editing ? 'Rolu redaktə et' : 'Yeni rol əlavə et'}
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              Rol əlavə etmək üçün rolun adını, istifadəçilərini və təsvirini daxil et
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Rolun adı</label>
                <input
                  value={form.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }))
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
                  }}
                  className={inputCls('name')}
                  placeholder="Rolun adı"
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Departament</label>
                <select
                  value={form.departmentId}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, departmentId: e.target.value }))
                    if (errors.departmentId) setErrors((prev) => ({ ...prev, departmentId: undefined }))
                  }}
                  disabled={!!currentDept}
                  className={clsx(inputCls('departmentId'), currentDept && 'opacity-60 cursor-not-allowed')}
                >
                  <option value="">Departament seçin</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {errors.departmentId && <p className="mt-1 text-xs text-red-500">{errors.departmentId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Rolu təsvir et</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  placeholder="Rolu təsvir et"
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (!validateStep1()) return
                setStep(2)
              }}
              className="mt-6 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
            >
              Davam et
            </button>
          </div>
        )}

        {/* ── STEP 2 ─────────────────────────────────────────── */}
        {step === 2 && (
          <div className="p-7">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">İcazə səviyyələrini təyin et</h2>
            <p className="text-sm text-gray-400 mb-5">
              Əlavə etdiyiniz rol üçün icazə səviyyələrini təyin edin
            </p>

            {modulesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto scrollbar-thin -mx-1 px-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 w-40">Modul</th>
                      {PERM_COLS.map((c) => (
                        <th key={c.key} className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">{c.label}</th>
                      ))}
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Hamısı</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Əlavə</th>
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

            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium transition-colors"
              >
                <ChevronLeft size={16} />
                Geriyə
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
              >
                {loading && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Yadda saxla
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Ləğv et
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ModuleRow({
  mod, permMap, allChecked, isApproval, anyPerm,
  approvalExpanded, approvalDeptIds, departments,
  onTogglePerm, onToggleAll, onToggleApprovalExpand, onToggleApprovalDept,
}) {
  return (
    <>
      <tr className={clsx(
        'border-b border-gray-50 dark:border-gray-700/50',
        isApproval && anyPerm && 'bg-amber-50/30 dark:bg-amber-900/10'
      )}>
        <td className="py-2.5 pr-4">
          <div className="flex items-center gap-1.5">
            {isApproval && anyPerm && (
              <button
                type="button"
                onClick={onToggleApprovalExpand}
                className="text-amber-600 hover:text-amber-700 transition-colors"
              >
                {approvalExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              {MODULE_LABELS[mod.code] || mod.nameAz}
            </span>
          </div>
        </td>
        {PERM_COLS.map((c) => (
          <td key={c.key} className="py-2.5 pr-6">
            <input
              type="checkbox"
              checked={permMap[mod.id]?.[c.key] || false}
              onChange={() => onTogglePerm(mod.id, c.key)}
              className="accent-amber-600 w-4 h-4 cursor-pointer"
            />
          </td>
        ))}
        <td className="py-2.5 pr-4">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={onToggleAll}
            className="accent-amber-600 w-4 h-4 cursor-pointer"
            title="Hamısını seç/ləğv et"
          />
        </td>
        <td className="py-2.5">
          {mod.code === 'REQUESTS' ? (
            <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={permMap[mod.id]?.canSendToCoordinator || false}
                onChange={() => onTogglePerm(mod.id, 'canSendToCoordinator')}
                className="accent-purple-600 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Kordinatora göndər</span>
            </label>
          ) : mod.code === 'COORDINATOR' ? (
            <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={permMap[mod.id]?.canSubmitOffer || false}
                onChange={() => onTogglePerm(mod.id, 'canSubmitOffer')}
                className="accent-purple-600 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Təklif göndər</span>
            </label>
          ) : mod.code === 'ACCOUNTING' ? (
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={permMap[mod.id]?.canSendToAccounting || false}
                  onChange={() => onTogglePerm(mod.id, 'canSendToAccounting')}
                  className="accent-purple-600 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Mühasibatlığa göndər</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={permMap[mod.id]?.canReturnToProject || false}
                  onChange={() => onTogglePerm(mod.id, 'canReturnToProject')}
                  className="accent-purple-600 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Layihəyə geri göndər</span>
              </label>
            </div>
          ) : <span />}
        </td>
      </tr>

      {/* Approval departments sub-row */}
      {isApproval && anyPerm && approvalExpanded && (
        <tr className="bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700/50">
          <td colSpan={7} className="py-3 px-4 pl-8">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Təsdiq edə biləcəyi şöbələr:
            </p>
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => {
                const checked = approvalDeptIds.includes(dept.id)
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => onToggleApprovalDept(dept.id)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      checked
                        ? 'bg-amber-50 border-amber-400 text-amber-700 dark:bg-amber-900/30 dark:border-amber-500 dark:text-amber-400'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500'
                    )}
                  >
                    {dept.name}
                  </button>
                )
              })}
            </div>
            {approvalDeptIds.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">
                Heç bir şöbə seçilməyib — bütün şöbələrin əməliyyatlarını təsdiq edə biləcək
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
