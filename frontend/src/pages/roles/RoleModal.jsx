import { useState, useEffect } from 'react'
import { X, ChevronLeft } from 'lucide-react'
import { rolesApi } from '../../api/roles'
import { modulesApi } from '../../api/modules'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

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
}

export default function RoleModal({ editing, currentDept, departments, onClose, onSaved }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: editing?.name || '',
    description: editing?.description || '',
    departmentId: editing?.departmentId ?? currentDept?.id ?? '',
  })
  const [modules, setModules] = useState([])
  const [permMap, setPermMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [modulesLoading, setModulesLoading] = useState(true)

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
          }
        })
        setPermMap(map)
      })
      .catch(() => toast.error('Modullar yüklənmədi'))
      .finally(() => setModulesLoading(false))
  }, [editing])

  const togglePerm = (moduleId, key) => {
    setPermMap((prev) => ({
      ...prev,
      [moduleId]: { ...prev[moduleId], [key]: !prev[moduleId]?.[key] },
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const permissions = Object.entries(permMap)
        .filter(([, p]) => p.canGet || p.canPost || p.canPut || p.canDelete)
        .map(([moduleId, p]) => ({ moduleId: Number(moduleId), ...p }))

      const payload = {
        name: form.name,
        description: form.description,
        departmentId: Number(form.departmentId),
        permissions,
      }

      if (editing) {
        await rolesApi.update(editing.id, payload)
        toast.success('Rol yeniləndi')
      } else {
        await rolesApi.create(payload)
        toast.success('Rol yaradıldı')
      }
      onSaved()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Əməliyyat uğursuz oldu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden">
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
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              {editing ? 'Rolu redaktə et' : 'Yeni rol əlavə et'}
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              Rol əlavə etmək üçün rolun adını, istifadəçilərini və təsvirini daxil et
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Rolun adı</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Rolun adı"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Departament</label>
                <select
                  value={form.departmentId}
                  onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                >
                  <option value="">Departament seçin</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Rolu təsvir et</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-dashed border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  placeholder="Rolu təsvir et"
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (!form.name.trim()) return toast.error('Rol adı mütləqdir')
                if (!form.departmentId) return toast.error('Departament seçin')
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
            <h2 className="text-xl font-bold text-gray-800 mb-1">İcazə səviyyələrini təyin et</h2>
            <p className="text-sm text-gray-400 mb-5">
              Əlavə etdiyiniz rol üçün icazə səviyyələrini təyin edin
            </p>

            {modulesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto scrollbar-thin -mx-1 px-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 w-40">Modul</th>
                      {PERM_COLS.map((c) => (
                        <th key={c.key} className="text-left py-2 text-xs font-semibold text-gray-500">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((mod) => (
                      <tr key={mod.id} className="border-b border-gray-50">
                        <td className="py-2.5 pr-4 text-sm text-gray-700 font-medium">{MODULE_LABELS[mod.code] || mod.nameAz}</td>
                        {PERM_COLS.map((c) => (
                          <td key={c.key} className="py-2.5 pr-6">
                            <input
                              type="checkbox"
                              checked={permMap[mod.id]?.[c.key] || false}
                              onChange={() => togglePerm(mod.id, c.key)}
                              className="accent-amber-600 w-4 h-4 cursor-pointer"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
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
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
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
