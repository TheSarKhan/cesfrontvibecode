import { useState, useEffect } from 'react'
import { RefreshCw, Pencil } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import { expenseCategoryApi, expenseSourceApi } from '../../api/expenseConfig'
import toast from 'react-hot-toast'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { Field, Input, Textarea, Select, ModalShell } from './_shared'

const FREQ_OPTIONS = [
  { value: 'MONTHLY',   label: 'Aylıq' },
  { value: 'QUARTERLY', label: 'Rüblük' },
  { value: 'ANNUAL',    label: 'İllik' },
]

const EMPTY = {
  name: '', categoryKey: '', categoryLabel: '', sourceKey: '', sourceLabel: '',
  amount: '', frequency: 'MONTHLY', dayOfMonth: '', notes: '', active: true,
}

export default function RecurringExpenseModal({ editing, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState([])
  const [allSources, setAllSources] = useState([])
  const [loadingCfg, setLoadingCfg] = useState(true)

  useEffect(() => {
    Promise.all([
      expenseCategoryApi.getAllActive(),
      expenseSourceApi.getAllActive(),
    ]).then(([catRes, srcRes]) => {
      setCategories(catRes.data?.data || [])
      setAllSources(srcRes.data?.data || [])
    }).catch(() => {}).finally(() => setLoadingCfg(false))
  }, [])

  useEffect(() => {
    if (editing) {
      setForm({
        name:          editing.name          || '',
        categoryKey:   editing.categoryKey   || '',
        categoryLabel: editing.categoryLabel || '',
        sourceKey:     editing.sourceKey     || '',
        sourceLabel:   editing.sourceLabel   || '',
        amount:        editing.amount > 0 ? String(editing.amount) : '',
        frequency:     editing.frequency     || 'MONTHLY',
        dayOfMonth:    editing.dayOfMonth    ? String(editing.dayOfMonth) : '',
        notes:         editing.notes         || '',
        active:        editing.active !== false,
      })
    } else { setForm(EMPTY) }
  }, [editing])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const filteredSources = allSources.filter(s => !form.categoryKey || s.categoryCode === form.categoryKey)

  const handleCategoryChange = (catCode) => {
    const catItem = categories.find(c => c.code === catCode)
    set('categoryKey', catCode)
    set('categoryLabel', catItem?.name || catCode)
    set('sourceKey', '')
    set('sourceLabel', '')
  }
  const handleSourceChange = (srcCode) => {
    const srcItem = allSources.find(s => s.code === srcCode)
    set('sourceKey', srcCode)
    set('sourceLabel', srcItem?.name || srcCode)
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (!form.name.trim()) return toast.error('Ad daxil edin')
    if (!form.categoryKey) return toast.error('Kateqoriya seçin')
    if (!form.sourceKey)   return toast.error('Mənbə seçin')

    setSaving(true)
    try {
      const payload = {
        name:          form.name.trim(),
        categoryKey:   form.categoryKey,
        categoryLabel: form.categoryLabel,
        sourceKey:     form.sourceKey,
        sourceLabel:   form.sourceLabel,
        amount:        form.amount ? parseFloat(form.amount) : 0,
        frequency:     form.frequency,
        dayOfMonth:    form.dayOfMonth ? parseInt(form.dayOfMonth) : null,
        notes:         form.notes || null,
        active:        form.active,
      }
      if (editing) { await accountingApi.updateRecurring(editing.id, payload); toast.success('Daimi ödəniş yeniləndi') }
      else { await accountingApi.createRecurring(payload); toast.success('Daimi ödəniş yaradıldı') }
      onSaved()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    } finally { setSaving(false) }
  }

  return (
    <ModalShell
      icon={editing ? Pencil : RefreshCw}
      eyebrow={editing ? 'Redaktə' : 'Yeni qeyd'}
      title={editing ? 'Daimi ödənişi redaktə et' : 'Yeni daimi ödəniş'}
      subtitle="Hər dövr üçün qaimə şablonu"
      onClose={onClose}
      tone={editing ? 'gold' : 'graphite'}
      maxWidth="480px"
      footer={
        <>
          <button type="button" onClick={onClose} className="ces-btn ces-btn-ghost ces-btn-sm">Ləğv et</button>
          <button onClick={handleSubmit} disabled={saving} className="ces-btn ces-btn-primary">
            {saving && (
              <span className="w-3.5 h-3.5 rounded-full animate-spin"
                style={{ border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'var(--ces-on-primary)' }} />
            )}
            {editing ? 'Yadda saxla' : 'Yarat'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Field label="Ad" required>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Məs: Azercell Korporativ İnternet" autoFocus />
        </Field>

        <Field label="Kateqoriya" required>
          {loadingCfg ? (
            <div className="h-11 rounded-[11px] animate-pulse" style={{ background: 'var(--ces-graphite-50)' }} />
          ) : categories.length === 0 ? (
            <div className="text-[12px] p-3" style={{ background: 'var(--ces-gold-50)', color: 'var(--ces-gold-700)', borderRadius: '10px', border: '1px solid var(--ces-gold-100)' }}>
              Kateqoriya tapılmadı. Konfiqurasiya panelindən <strong>EXPENSE_CATEGORY</strong> əlavə edin.
            </div>
          ) : (
            <Select value={form.categoryKey} onChange={(e) => handleCategoryChange(e.target.value)}>
              <option value="">Kateqoriya seçin</option>
              {categories.map(c => <option key={c.id} value={c.code}>{c.name}</option>)}
            </Select>
          )}
        </Field>

        <Field label="Mənbə" required>
          {loadingCfg ? (
            <div className="h-11 rounded-[11px] animate-pulse" style={{ background: 'var(--ces-graphite-50)' }} />
          ) : filteredSources.length === 0 ? (
            <div className="text-[12px] p-3" style={{ background: 'var(--ces-gold-50)', color: 'var(--ces-gold-700)', borderRadius: '10px', border: '1px solid var(--ces-gold-100)' }}>
              {form.categoryKey
                ? `Bu kateqoriya üçün mənbə tapılmadı. Konfiqurasiya panelindən EXPENSE_SOURCE əlavə edin (description: "${form.categoryKey}").`
                : 'Əvvəlcə kateqoriya seçin.'}
            </div>
          ) : (
            <Select value={form.sourceKey} onChange={(e) => handleSourceChange(e.target.value)} disabled={!form.categoryKey}>
              <option value="">Mənbə seçin</option>
              {filteredSources.map(s => <option key={s.id} value={s.code}>{s.name}</option>)}
            </Select>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Məbləğ" hint="Boş = dəyişkən məbləğ">
            <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" suffix="₼" />
          </Field>
          <Field label="Tezlik" required>
            <Select value={form.frequency} onChange={(e) => set('frequency', e.target.value)}>
              {FREQ_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ödəniş günü" hint="1-31">
            <Input type="number" min="1" max="31" value={form.dayOfMonth} onChange={(e) => set('dayOfMonth', e.target.value)} placeholder="—" />
          </Field>
          <Field label="Status">
            <label
              className="flex items-center gap-2 px-3 cursor-pointer"
              style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '11px', minHeight: '44px' }}
            >
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set('active', e.target.checked)}
                className="w-4 h-4"
                style={{ accentColor: 'var(--ces-gold)' }}
              />
              <span className="text-[13.5px] font-semibold" style={{ color: 'var(--ces-ink)' }}>Aktivdir</span>
            </label>
          </Field>
        </div>

        <Field label="Qeyd">
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Əlavə məlumat..." />
        </Field>
      </form>
    </ModalShell>
  )
}
