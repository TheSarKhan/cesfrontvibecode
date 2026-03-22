import { useState, useEffect } from 'react'
import { X, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'

function EntryRow({ entry, onDelete, readOnly }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{entry.key}</p>
      </div>
      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {parseFloat(entry.value || 0).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
      </div>
      <div className="text-xs text-gray-400 whitespace-nowrap w-24 text-right">
        {entry.date ? new Date(entry.date).toLocaleDateString('az-AZ') : '—'}
      </div>
      {!readOnly && (
        <button
          onClick={() => onDelete(entry.id)}
          className="ml-1 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

function AddEntryForm({ onAdd }) {
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!key.trim() || !value || parseFloat(value) <= 0) {
      toast.error('Növ və məbləğ daxil edin')
      return
    }
    setSaving(true)
    try {
      await onAdd({ key: key.trim(), value: parseFloat(value) })
      setKey('')
      setValue('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700 mt-1">
      <input
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="Növ (məs: Benzin)"
        className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="AZN"
        min="0"
        step="0.01"
        className="w-28 px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
      <button
        onClick={submit}
        disabled={saving}
        className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
      >
        <Plus size={13} />
        Əlavə et
      </button>
    </div>
  )
}

export default function ProjectFinanceModal({ project, onClose, onSaved }) {
  const { confirm, ConfirmDialog } = useConfirm()
  const [finances, setFinances] = useState({ expenses: [], revenues: [] })
  const [loading, setLoading] = useState(true)
  const readOnly = project.status === 'COMPLETED'

  const load = async () => {
    setLoading(true)
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

  const handleAddExpense = async (data) => {
    try {
      await projectsApi.addExpense(project.id, data)
      toast.success('Xərc əlavə edildi')
      await load()
      onSaved?.()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xərc əlavə edilmədi')
      throw err
    }
  }

  const handleDeleteExpense = async (expenseId) => {
    if (!(await confirm({ title: 'Xərci sil', message: 'Bu xərci silmək istəyirsiniz?' }))) return
    try {
      await projectsApi.deleteExpense(project.id, expenseId)
      toast.success('Xərc silindi')
      load()
      onSaved?.()
    } catch {
      toast.error('Silmə uğursuz oldu')
    }
  }

  const handleAddRevenue = async (data) => {
    try {
      await projectsApi.addRevenue(project.id, data)
      toast.success('Gəlir əlavə edildi')
      await load()
      onSaved?.()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Gəlir əlavə edilmədi')
      throw err
    }
  }

  const handleDeleteRevenue = async (revenueId) => {
    if (!(await confirm({ title: 'Gəliri sil', message: 'Bu gəliri silmək istəyirsiniz?' }))) return
    try {
      await projectsApi.deleteRevenue(project.id, revenueId)
      toast.success('Gəlir silindi')
      load()
      onSaved?.()
    } catch {
      toast.error('Silmə uğursuz oldu')
    }
  }

  const totalExpense = (finances.expenses || []).reduce((s, e) => s + parseFloat(e.value || 0), 0)
  const totalRevenue = (finances.revenues || []).reduce((s, r) => s + parseFloat(r.value || 0), 0)
  const netProfit = totalRevenue - totalExpense

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Maliyyə — {project.projectCode || project.requestCode}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{project.companyName}{project.projectName ? ` · ${project.projectName}` : ''}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">Yüklənir...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Expenses */}
              <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown size={16} className="text-red-500" />
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Xərclər</h3>
                  <span className="ml-auto text-xs font-semibold text-red-600 dark:text-red-400">
                    {totalExpense.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
                  </span>
                </div>

                <div className="min-h-[80px]">
                  {finances.expenses?.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">Hələ xərc yoxdur</p>
                  ) : (
                    finances.expenses.map((e) => (
                      <EntryRow key={e.id} entry={e} onDelete={handleDeleteExpense} readOnly={readOnly} />
                    ))
                  )}
                </div>

                {!readOnly && <AddEntryForm onAdd={handleAddExpense} />}
              </div>

              {/* Revenues */}
              <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-green-600" />
                  <h3 className="text-sm font-semibold text-green-700 dark:text-green-400">Gəlirlər</h3>
                  <span className="ml-auto text-xs font-semibold text-green-600 dark:text-green-400">
                    {totalRevenue.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
                  </span>
                </div>

                <div className="min-h-[80px]">
                  {finances.revenues?.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">Hələ gəlir yoxdur</p>
                  ) : (
                    finances.revenues.map((r) => (
                      <EntryRow key={r.id} entry={r} onDelete={handleDeleteRevenue} readOnly={readOnly} />
                    ))
                  )}
                </div>

                {!readOnly && <AddEntryForm onAdd={handleAddRevenue} />}
              </div>
            </div>
          )}
        </div>

        {/* Footer — Net Profit */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-5 py-3">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Xalis Gəlir</span>
            <span className={clsx(
              'text-lg font-bold',
              netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}>
              {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
            </span>
          </div>
        </div>
      </div>
      <ConfirmDialog />
    </div>
  )
}
