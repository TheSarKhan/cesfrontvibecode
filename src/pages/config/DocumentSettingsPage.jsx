import { useState, useEffect } from 'react'
import { Save, RefreshCw, Plus, Trash2, Pencil } from 'lucide-react'
import { configApi } from '../../api/config'
import toast from 'react-hot-toast'

const SECTIONS = [
  {
    title: 'Şirkət Məlumatları',
    category: 'COMPANY_INFO',
    fields: [
      { key: 'COMPANY_NAME',  label: 'Hesabı təqdim edən',  placeholder: 'Şirkətin tam adı' },
      { key: 'VOEN',          label: 'VÖEN',                placeholder: '10 rəqəmli' },
      { key: 'ADDRESS',       label: 'Ünvan',               placeholder: 'Şəhər, küçə' },
      { key: 'DIRECTOR_NAME', label: 'Direktor',            placeholder: 'Ad Soyad' },
      { key: 'PHONE',         label: 'Telefon',             placeholder: '+994...' },
      { key: 'EMAIL',         label: 'E-poçt',              placeholder: 'info@example.com' },
    ],
  },
  {
    title: 'Sənəd Parametrləri',
    category: 'DOCUMENT_VAT_RATE',
    fields: [
      { key: 'DEFAULT', label: 'ƏDV dərəcəsi (%)', placeholder: '18' },
    ],
  },
]

const BANK_FIELDS = [
  { key: 'BANK_NAME',             label: 'Bank Adı' },
  { key: 'BANK_CODE',             label: 'Kod' },
  { key: 'SWIFT',                 label: 'SWIFT' },
  { key: 'IBAN',                  label: 'H./h (IBAN)' },
  { key: 'CORRESPONDENT_ACCOUNT', label: 'M./h (Müxbir)' },
]

export default function DocumentSettingsPage() {
  const [items, setItems]     = useState({})
  const [values, setValues]   = useState({})
  const [banks, setBanks]     = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [editingBankIdx, setEditingBankIdx] = useState(null)
  const [bankForm, setBankForm] = useState({})

  const mk = (cat, key) => `${cat}__${key}`
  const bankMk = (idx, key) => `BANK_${idx}__${key}`

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const results = await Promise.all([
        ...SECTIONS.map(s => configApi.getActiveByCategory(s.category)),
        configApi.getActiveByCategory('COMPANY_BANK_DETAILS')
      ])

      const map = {}
      const vals = {}
      const newBanks = []

      results.forEach((res, idx) => {
        const list = res.data?.data || res.data || []
        if (idx < SECTIONS.length) {
          // Standard sections
          list.forEach(item => {
            const k = mk(item.category, item.key)
            map[k] = item
            vals[k] = item.value || ''
          })
        } else {
          // Bank details
          const bankMap = {}
          list.forEach(item => {
            if (!bankMap[item.key]) bankMap[item.key] = {}
            bankMap[item.key] = { id: item.id, value: item.value, item }
          })

          // Group by implicit bank index (assuming single bank set for now, can extend)
          if (Object.keys(bankMap).length > 0) {
            newBanks.push({
              BANK_NAME:             bankMap.BANK_NAME?.value || '',
              BANK_CODE:             bankMap.BANK_CODE?.value || '',
              SWIFT:                 bankMap.SWIFT?.value || '',
              IBAN:                  bankMap.IBAN?.value || '',
              CORRESPONDENT_ACCOUNT: bankMap.CORRESPONDENT_ACCOUNT?.value || '',
              ids: { // store IDs for updates
                BANK_NAME:             bankMap.BANK_NAME?.id,
                BANK_CODE:             bankMap.BANK_CODE?.id,
                SWIFT:                 bankMap.SWIFT?.id,
                IBAN:                  bankMap.IBAN?.id,
                CORRESPONDENT_ACCOUNT: bankMap.CORRESPONDENT_ACCOUNT?.id,
              }
            })
          }
        }
      })

      setItems(map)
      setValues(vals)
      setBanks(newBanks)
    } catch {
      toast.error('Məlumatlar yüklənə bilmədi')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = []

      // Update standard config items
      Object.entries(values).forEach(([k, val]) => {
        const item = items[k]
        if (item && val !== (item.value || '')) {
          updates.push(configApi.update(item.id, {
            category: item.category,
            key: item.key,
            value: val,
            description: item.description || '',
            sortOrder: item.sortOrder,
            active: item.active,
          }))
        }
      })

      // Update bank details
      banks.forEach(bank => {
        BANK_FIELDS.forEach(field => {
          const id = bank.ids?.[field.key]
          if (id) {
            updates.push(configApi.update(id, {
              category: 'COMPANY_BANK_DETAILS',
              key: field.key,
              value: bank[field.key] || '',
              description: '',
              sortOrder: 0,
              active: true,
            }))
          }
        })
      })

      if (updates.length === 0) { toast.success('Dəyişiklik yoxdur'); return }
      await Promise.all(updates)
      toast.success('Saxlandı')
      load()
    } catch {
      toast.error('Xəta baş verdi')
    } finally {
      setSaving(false)
    }
  }

  const handleAddBank = () => {
    setEditingBankIdx(banks.length)
    setBankForm({
      BANK_NAME: '', BANK_CODE: '', SWIFT: '', IBAN: '', CORRESPONDENT_ACCOUNT: '', ids: {}
    })
  }

  const handleEditBank = (idx) => {
    setEditingBankIdx(idx)
    setBankForm({ ...banks[idx] })
  }

  const handleSaveBank = () => {
    if (!bankForm.BANK_NAME?.trim()) {
      toast.error('Bank adı tələbdir')
      return
    }
    const newBanks = [...banks]
    newBanks[editingBankIdx] = bankForm
    setBanks(newBanks)
    setEditingBankIdx(null)
    setBankForm({})
    toast.success('Bank əlavə edildi')
  }

  const handleDeleteBank = (idx) => {
    setBanks(b => b.filter((_, i) => i !== idx))
    toast.success('Bank silindi')
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sənəd Konfiqurasiyası</h1>
          <p className="text-sm text-gray-500 mt-0.5">PDF sənədlərə çap olunan məlumatlar</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          Yadda saxla
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {SECTIONS.map(section => (
            <div key={section.category} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                {section.title}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {section.fields.map(field => {
                  const k = mk(section.category, field.key)
                  return (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={values[k] ?? ''}
                        onChange={e => setValues(v => ({ ...v, [k]: e.target.value }))}
                        placeholder={field.placeholder}
                        className={inputCls}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Banks Table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">Bank Məlumatları</h2>
              <button
                onClick={handleAddBank}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus size={13} />
                Yeni Bank
              </button>
            </div>

            {editingBankIdx !== null && (
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {BANK_FIELDS.map(field => (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={bankForm[field.key] || ''}
                        onChange={e => setBankForm(f => ({ ...f, [field.key]: e.target.value }))}
                        placeholder={field.label}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => { setEditingBankIdx(null); setBankForm({}) }}
                    className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Ləğv et
                  </button>
                  <button
                    onClick={handleSaveBank}
                    className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700"
                  >
                    Saxla
                  </button>
                </div>
              </div>
            )}

            {!editingBankIdx && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Bank Adı</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Kod</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">SWIFT</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">IBAN</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">M./h</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300">Hərəkət</th>
                    </tr>
                  </thead>
                  <tbody>
                    {banks.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-400">
                          Hələ bank əlavə edilməyib
                        </td>
                      </tr>
                    ) : (
                      banks.map((bank, idx) => (
                        <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">{bank.BANK_NAME || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{bank.BANK_CODE || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{bank.SWIFT || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{bank.IBAN || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{bank.CORRESPONDENT_ACCOUNT || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEditBank(idx)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                title="Redaktə et"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteBank(idx)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Sil"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
