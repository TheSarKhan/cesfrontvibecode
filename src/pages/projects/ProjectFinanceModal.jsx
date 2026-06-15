import { useState, useEffect } from 'react'
import { X, Plus, Trash2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import { fmtDate } from '../../utils/date'
import toast from 'react-hot-toast'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import NumberInput from '../../components/common/NumberInput'

function EntryRow({ entry, onDelete, readOnly }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 0',
        borderBottom: '1px solid var(--ces-line-2)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ces-ink)' }}>{entry.key}</p>
      </div>
      <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ces-graphite)', whiteSpace: 'nowrap' }}>
        {parseFloat(entry.value || 0).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
      </div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--ces-mute2)', whiteSpace: 'nowrap', width: 96, textAlign: 'right' }}>
        {fmtDate(entry.date)}
      </div>
      {!readOnly && (
        <button onClick={() => onDelete(entry.id)} className="ces-row-act danger">
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

function AddEntryForm({ onAdd, accentColor }) {
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 12, borderTop: '1px solid var(--ces-line)', marginTop: 4 }}>
      <div className="ces-input sm" style={{ flex: 1, minWidth: 0 }}>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Növ (məs: Benzin)"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
      <div className="ces-input sm" style={{ width: 100, flexShrink: 0 }}>
        <NumberInput
          decimal
          className="mono"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="AZN"
          min="0"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
      <button
        onClick={submit}
        disabled={saving}
        className="ces-btn ces-btn-sm"
        style={{ background: accentColor, color: '#fff' }}
      >
        <Plus size={13} />
      </button>
    </div>
  )
}

export default function ProjectFinanceModal({ project, onClose, onSaved }) {
  useEscapeKey(onClose)
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
    }
  }

  const handleAddRevenue = async (data) => {
    try {
      await projectsApi.addRevenue(project.id, data)
      toast.success('Gəlir əlavə edildi')
      await load()
      onSaved?.()
    } catch (err) {
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
    }
  }

  const totalExpense = (finances.expenses || []).reduce((s, e) => s + parseFloat(e.value || 0), 0)
  const totalRevenue = (finances.revenues || []).reduce((s, r) => s + parseFloat(r.value || 0), 0)
  const netProfit = totalRevenue - totalExpense

  return (
    <div className="ces-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ces-modal" style={{ maxWidth: 720 }}>
        <div className="ces-m-head">
          <div className="ces-m-ic gold"><DollarSign size={20} /></div>
          <div className="flex-1 min-w-0">
            <h3 className="mono">Maliyyə — {project.projectCode || project.requestCode}</h3>
            <p className="truncate">{project.companyName}{project.projectName ? ` · ${project.projectName}` : ''}</p>
          </div>
          <button onClick={onClose} className="ces-modal-x" type="button" aria-label="Bağla">
            <X size={16} />
          </button>
        </div>

        <div className="ces-m-body">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <span style={{ width: 26, height: 26, border: '2px solid var(--ces-line)', borderTopColor: 'var(--ces-gold)', borderRadius: 999, animation: 'ces-spin .8s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {/* Expenses */}
              <div style={{ background: 'var(--ces-danger-100)', border: '1px solid #fce4ea', borderRadius: 14, padding: 16 }}>
                <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
                  <TrendingDown size={15} style={{ color: 'var(--ces-danger)' }} />
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ces-danger)', margin: 0 }}>Xərclər</h3>
                  <span className="mono" style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 800, color: 'var(--ces-danger)' }}>
                    {totalExpense.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
                  </span>
                </div>

                <div style={{ minHeight: 80 }}>
                  {finances.expenses?.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--ces-mute2)', padding: '16px 0', textAlign: 'center' }}>Hələ xərc yoxdur</p>
                  ) : (
                    finances.expenses.map((e) => (
                      <EntryRow key={e.id} entry={e} onDelete={handleDeleteExpense} readOnly={readOnly} />
                    ))
                  )}
                </div>

                {!readOnly && <AddEntryForm onAdd={handleAddExpense} accentColor="var(--ces-danger)" />}
              </div>

              {/* Revenues */}
              <div style={{ background: 'var(--ces-ok-100)', border: '1px solid #d8f3d0', borderRadius: 14, padding: 16 }}>
                <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
                  <TrendingUp size={15} style={{ color: 'var(--ces-ok)' }} />
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ces-ok)', margin: 0 }}>Gəlirlər</h3>
                  <span className="mono" style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 800, color: 'var(--ces-ok)' }}>
                    {totalRevenue.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
                  </span>
                </div>

                <div style={{ minHeight: 80 }}>
                  {finances.revenues?.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--ces-mute2)', padding: '16px 0', textAlign: 'center' }}>Hələ gəlir yoxdur</p>
                  ) : (
                    finances.revenues.map((r) => (
                      <EntryRow key={r.id} entry={r} onDelete={handleDeleteRevenue} readOnly={readOnly} />
                    ))
                  )}
                </div>

                {!readOnly && <AddEntryForm onAdd={handleAddRevenue} accentColor="var(--ces-ok)" />}
              </div>
            </div>
          )}
        </div>

        {/* Footer — Net Profit */}
        <div
          className="ces-m-foot"
          style={{
            justifyContent: 'space-between',
            background: netProfit >= 0 ? 'var(--ces-ok-100)' : 'var(--ces-danger-100)',
            borderTop: `1px solid ${netProfit >= 0 ? '#d8f3d0' : '#fce4ea'}`,
          }}
        >
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ces-graphite)' }}>Xalis gəlir</span>
          <span
            className="mono"
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: netProfit >= 0 ? 'var(--ces-ok)' : 'var(--ces-danger)',
            }}
          >
            {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
          </span>
        </div>
      </div>
      <ConfirmDialog />
    </div>
  )
}
