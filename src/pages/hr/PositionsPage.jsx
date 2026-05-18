import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Plus, Pencil, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import { departmentsApi } from '../../api/departments'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'

const fmt = (n) => Number(n ?? 0).toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function PositionsPage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('HR_MANAGEMENT', 'canPost')
  const canEdit = hasPermission('HR_MANAGEMENT', 'canPut')
  const canDelete = hasPermission('HR_MANAGEMENT', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [list, setList] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, editing: null })
  const [form, setForm] = useState({ name: '', description: '', defaultSalary: '', departmentId: '', active: true })

  const load = async () => {
    setLoading(true)
    try { setList((await hrApi.getPositions()).data?.data ?? []) }
    catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Yüklənmədi') } finally { setLoading(false) }
  }
  useEffect(() => {
    load()
    departmentsApi.getAll().then(r => setDepartments(r.data?.data ?? r.data ?? [])).catch(() => {})
  }, [])

  const open = (p) => {
    setForm(p ? { ...p, departmentId: p.departmentId || '' } : { name: '', description: '', defaultSalary: '', departmentId: '', active: true })
    setModal({ open: true, editing: p })
  }

  const save = async () => {
    if (!form.name?.trim()) { toast.error('Ad mütləqdir'); return }
    if (!form.departmentId) { toast.error('Şöbə seçilməlidir'); return }
    try {
      const payload = {
        ...form,
        defaultSalary: form.defaultSalary ? Number(form.defaultSalary) : null,
        departmentId: form.departmentId ? Number(form.departmentId) : null,
      }
      if (modal.editing?.id) await hrApi.updatePosition(modal.editing.id, payload)
      else await hrApi.createPosition(payload)
      toast.success(modal.editing ? 'Yeniləndi' : 'Yaradıldı')
      setModal({ open: false, editing: null })
      load()
    } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }

  const remove = async (p) => {
    if (!(await confirm({ title: 'Vəzifəni sil', message: `"${p.name}" silinsin?` }))) return
    try { await hrApi.deletePosition(p.id); toast.success('Silindi'); load() } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }

  return (
    <div>
      <ConfirmDialog />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Briefcase size={22} className="text-sky-600" />
            Vəzifələr
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{list.length} vəzifə</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/hr')} className="px-3 py-2 text-xs font-medium text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50">← HR</button>
          {canCreate && (
            <button onClick={() => open(null)} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              <Plus size={16} /> Yeni vəzifə
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium">Ad</th>
              <th className="px-3 py-2.5 text-left font-medium">Şöbə</th>
              <th className="px-3 py-2.5 text-right font-medium">Default əməkhaqqı</th>
              <th className="px-3 py-2.5 text-left font-medium">Təsvir</th>
              <th className="px-3 py-2.5 text-right font-medium w-[100px]">Əməliyyat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? <tr><td colSpan={5} className="text-center py-6 text-gray-400">Yüklənir...</td></tr>
              : list.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-gray-400">Vəzifə yoxdur</td></tr>
              : list.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-3 py-2.5 font-medium text-gray-800 dark:text-gray-100">{p.name}</td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300">{p.departmentName || '—'}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{p.defaultSalary != null ? `${fmt(p.defaultSalary)} ₼` : '—'}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs">{p.description || '—'}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {canEdit && <button onClick={() => open(p)} className="p-1.5 rounded hover:bg-amber-50 text-amber-600"><Pencil size={14} /></button>}
                      {canDelete && <button onClick={() => remove(p)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setModal({ open: false, editing: null })}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">{modal.editing ? 'Vəzifəni redaktə et' : 'Yeni vəzifə'}</h2>
              <button onClick={() => setModal({ open: false, editing: null })} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ad *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Şöbə *</label>
                <select value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700">
                  <option value="">—</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Default əməkhaqqı (₼)</label>
                <input type="number" step="0.01" value={form.defaultSalary} onChange={e => setForm({ ...form, defaultSalary: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Təsvir</label>
                <textarea rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModal({ open: false, editing: null })} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Ləğv</button>
              <button onClick={save} className="px-5 py-2 text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg">Yadda saxla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
