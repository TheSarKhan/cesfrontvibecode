import { useState, useEffect } from 'react'
import { Save, RefreshCw, Plus, Trash2, Pencil, FileText } from 'lucide-react'
import { configApi } from '../../api/config'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

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
          list.forEach(item => {
            const k = mk(item.category, item.key)
            map[k] = item
            vals[k] = item.value || ''
          })
        } else {
          const bankMap = {}
          list.forEach(item => {
            if (!bankMap[item.key]) bankMap[item.key] = {}
            bankMap[item.key] = { id: item.id, value: item.value, item }
          })

          if (Object.keys(bankMap).length > 0) {
            newBanks.push({
              BANK_NAME:             bankMap.BANK_NAME?.value || '',
              BANK_CODE:             bankMap.BANK_CODE?.value || '',
              SWIFT:                 bankMap.SWIFT?.value || '',
              IBAN:                  bankMap.IBAN?.value || '',
              CORRESPONDENT_ACCOUNT: bankMap.CORRESPONDENT_ACCOUNT?.value || '',
              ids: {
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
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Məlumatlar yüklənə bilmədi')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = []

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
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Xəta baş verdi')
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

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="ces-m-ic gold">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="ces-page-title">Sənəd Konfiqurasiyası</h1>
            <p className="ces-page-sub">PDF sənədlərə çap olunan rekvizit və parametrlər</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="ces-btn ces-btn-primary"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          Yadda saxla
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-40 rounded-2xl" style={{ background: 'var(--ces-graphite-50)' }} />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {SECTIONS.map(section => (
            <div key={section.category} className="ces-card">
              <h2 className="text-base font-bold text-[var(--ces-ink)] mb-4 pb-3 border-b border-[var(--ces-line)] m-0">
                {section.title}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
                {section.fields.map(field => {
                  const k = mk(section.category, field.key)
                  return (
                    <div key={field.key} className="ces-field">
                      <label>{field.label}</label>
                      <div className="ces-input">
                        <input
                          type="text"
                          value={values[k] ?? ''}
                          onChange={e => setValues(v => ({ ...v, [k]: e.target.value }))}
                          placeholder={field.placeholder}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Banks Table */}
          <div className="ces-table-wrap">
            <div className="ces-table-tools">
              <div>
                <h2 className="text-base font-bold text-[var(--ces-ink)] m-0">Bank Məlumatları</h2>
                <p className="text-xs text-[var(--ces-muted)] mt-1">Sənədlərdə görünən bank rekvizitləri</p>
              </div>
              <button onClick={handleAddBank} className="ces-btn ces-btn-primary ces-btn-sm">
                <Plus size={14} />
                Yeni Bank
              </button>
            </div>

            {editingBankIdx !== null && (
              <div className="p-5 border-b border-[var(--ces-line)]" style={{ background: 'var(--ces-gold-50)' }}>
                <p className="ces-sec-label mb-4" style={{ color: 'var(--ces-gold-700)' }}>
                  {editingBankIdx === banks.length ? 'Yeni Bank' : 'Bankı Redaktə Et'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-0">
                  {BANK_FIELDS.map(field => (
                    <div key={field.key} className="ces-field">
                      <label>{field.label}</label>
                      <div className="ces-input">
                        <input
                          type="text"
                          value={bankForm[field.key] || ''}
                          onChange={e => setBankForm(f => ({ ...f, [field.key]: e.target.value }))}
                          placeholder={field.label}
                          className={['BANK_CODE', 'SWIFT', 'IBAN', 'CORRESPONDENT_ACCOUNT'].includes(field.key) ? 'mono' : ''}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-end mt-2">
                  <button
                    onClick={() => { setEditingBankIdx(null); setBankForm({}) }}
                    className="ces-btn ces-btn-ghost ces-btn-sm"
                  >
                    Ləğv et
                  </button>
                  <button onClick={handleSaveBank} className="ces-btn ces-btn-primary ces-btn-sm">
                    Saxla
                  </button>
                </div>
              </div>
            )}

            {editingBankIdx === null && (
              <div className="overflow-x-auto">
                <table className="ces-tbl" style={{ minWidth: 760 }}>
                  <thead>
                    <tr>
                      <th>Bank Adı</th>
                      <th>Kod</th>
                      <th>SWIFT</th>
                      <th>IBAN</th>
                      <th>M./h</th>
                      <th className="r" style={{ width: 110 }}>Əməliyyat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {banks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-sm" style={{ color: 'var(--ces-muted)' }}>
                          Hələ bank əlavə edilməyib
                        </td>
                      </tr>
                    ) : (
                      banks.map((bank, idx) => (
                        <tr key={idx}>
                          <td className="font-semibold text-[var(--ces-ink)]">{bank.BANK_NAME || '—'}</td>
                          <td className="mono" style={{ color: 'var(--ces-muted)' }}>{bank.BANK_CODE || '—'}</td>
                          <td className="mono" style={{ color: 'var(--ces-muted)' }}>{bank.SWIFT || '—'}</td>
                          <td className="mono" style={{ color: 'var(--ces-muted)' }}>{bank.IBAN || '—'}</td>
                          <td className="mono" style={{ color: 'var(--ces-muted)' }}>{bank.CORRESPONDENT_ACCOUNT || '—'}</td>
                          <td>
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => handleEditBank(idx)}
                                className="ces-row-act gold"
                                title="Redaktə et"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteBank(idx)}
                                className="ces-row-act danger"
                                title="Sil"
                              >
                                <Trash2 size={15} />
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
        </div>
      )}
    </div>
  )
}
