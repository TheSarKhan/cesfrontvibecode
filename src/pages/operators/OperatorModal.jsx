import { useState, useEffect } from 'react'
import { X, UserCog, Pencil } from 'lucide-react'
import { operatorsApi } from '../../api/operators'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const EMPTY = { firstName: '', lastName: '', address: '', phone: '', email: '', specialization: '', notes: '' }

export default function OperatorModal({ editing, onClose, onSaved }) {
  useEscapeKey(onClose)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editing) {
      setForm({
        firstName: editing.firstName || '',
        lastName: editing.lastName || '',
        address: editing.address || '',
        phone: editing.phone || '',
        email: editing.email || '',
        specialization: editing.specialization || '',
        notes: editing.notes || '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [editing])

  const set = (k) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [k]: value }))
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }))
  }

  const inputCls = (field) => clsx(
    'w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2',
    errors[field]
      ? 'border-red-400 dark:border-red-500 focus:ring-red-400'
      : 'border-gray-200 dark:border-gray-600 focus:ring-amber-500'
  )

  const validate = () => {
    const errs = {}
    if (!form.firstName?.trim()) errs.firstName = 'Ad tələb olunur'
    if (!form.lastName?.trim()) errs.lastName = 'Soyad tələb olunur'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      if (editing) {
        await operatorsApi.update(editing.id, form)
        toast.success('Operator yeniləndi')
      } else {
        await operatorsApi.create(form)
        toast.success('Operator əlavə edildi')
      }
      onSaved()
    } catch (err) {
      if (err?.isPending) { onClose?.(); return }
    } finally {
      setSaving(false)
    }
  }

  const Field = ({ label, name, type = 'text', placeholder }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={form[name]}
        onChange={set(name)}
        placeholder={placeholder}
        className={inputCls('')}
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            {editing ? <Pencil size={16} className="text-amber-500 shrink-0" /> : <UserCog size={16} className="text-amber-500 shrink-0" />}
            {editing ? 'Operatoru redaktə et' : 'Yeni operator'}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center">
            <X size={14} className="text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ad <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.firstName}
                onChange={set('firstName')}
                placeholder="Əli"
                className={inputCls('firstName')}
              />
              {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Soyad <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.lastName}
                onChange={set('lastName')}
                placeholder="Məmmədov"
                className={inputCls('lastName')}
              />
              {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>}
            </div>
          </div>
          <Field label="Ünvan" name="address" placeholder="Bakı, Nərimanov r." />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefon" name="phone" type="tel" placeholder="+994 50 000 00 00" />
            <Field label="E-mail" name="email" type="email" placeholder="ali@mail.com" />
          </div>
          <Field label="İxtisas" name="specialization" placeholder="Ekskavator operatoru, Kran operatoru..." />
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Qeyd</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={2}
              placeholder="Əlavə qeydlər..."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              Ləğv et
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors">
              {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editing ? 'Yadda saxla' : 'Əlavə et'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
