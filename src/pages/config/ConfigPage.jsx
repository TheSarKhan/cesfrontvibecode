import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2, Settings, Search, ToggleLeft, ToggleRight, RefreshCw, Save, FileText, Layers, Tags } from 'lucide-react'
import { configApi } from '../../api/config'
import { banksApi } from '../../api/banks'
import { expenseCategoryApi, expenseSourceApi } from '../../api/expenseConfig'
import { useAuthStore } from '../../store/authStore'
import { v } from '../../utils/validation'
import ConfigItemModal from './ConfigItemModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import Pagination from '../../components/common/Pagination'
import { useSearchParams } from 'react-router-dom'

export const CATEGORY_LABELS = {
  EQUIPMENT_BRAND:   'Texnika brendləri',
  EQUIPMENT_TYPE:    'Texnika növləri',
  REGION:            'Bölgələr',
  TECH_PARAM:        'Texniki parametrlər',
  SAFETY_EQUIPMENT:  'Təhlükəsizlik avadanlıqları',
  SERVICE_CHECKLIST: 'Servis Checklist Şablonları',
  EXPENSE_CATEGORY:  'Xərc Kateqoriyaları',
  EXPENSE_SOURCE:    'Xərc Mənbələri',
}

const HIDDEN_CATEGORIES = new Set(['COMPANY_INFO', 'COMPANY_BANK_DETAILS', 'DOCUMENT_VAT_RATE'])

const categoryLabel = (cat) => CATEGORY_LABELS[cat] || cat

export default function ConfigPage() {
  const [tab, setTab] = useState('categories')
  const [catData, setCatData] = useState({})
  const [categories, setCategories] = useState([])
  const [tableData, setTableData] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [loadingCats, setLoadingCats] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [modal, setModal] = useState({ open: false, editing: null })
  const [searchParams, setSearchParams] = useSearchParams()
  const searchRef = useRef(null)

  const [docItems, setDocItems]     = useState({})
  const [docValues, setDocValues]   = useState({})
  const [docErrors, setDocErrors]   = useState({})
  const [banks, setBanks]     = useState([])
  const [docLoading, setDocLoading] = useState(true)
  const [docSaving, setDocSaving]   = useState(false)
  const [editingBankIdx, setEditingBankIdx] = useState(null)
  const [bankForm, setBankForm] = useState({})
  const [bankErrors, setBankErrors] = useState({})

  const [expCats, setExpCats]             = useState([])
  const [expSrcs, setExpSrcs]             = useState([])
  const [expLoading, setExpLoading]       = useState(false)
  const [editingCatIdx, setEditingCatIdx] = useState(null)
  const [catForm, setCatForm]             = useState({})
  const [editingSrcIdx, setEditingSrcIdx] = useState(null)
  const [srcForm, setSrcForm]             = useState({})

  const activeCategory = searchParams.get('category') || null
  const search = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page') || '0')
  const pageSize = parseInt(searchParams.get('size') || '15')

  const setActiveCategory = (cat) => setSearchParams(p => { const n = new URLSearchParams(p); cat ? n.set('category', cat) : n.delete('category'); n.delete('page'); n.delete('q'); return n }, { replace: true })
  const setSearch = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set('q', v) : n.delete('q'); n.delete('page'); return n }, { replace: true })
  const setPage = (p) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('page', String(p)); return n }, { replace: true })
  const setPageSize = (s) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('size', String(s)); n.delete('page'); return n }, { replace: true })

  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('CONFIG', 'canPost')
  const canEdit = hasPermission('CONFIG', 'canPut')
  const canDelete = hasPermission('CONFIG', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  usePageShortcuts({
    onNew: canCreate ? () => setModal({ open: true, editing: null }) : undefined,
    searchRef,
  })

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
    { key: 'bankName',             label: 'Bank Adı' },
    { key: 'bankCode',             label: 'Kod' },
    { key: 'swift',                label: 'SWIFT' },
    { key: 'iban',                 label: 'IBAN' },
    { key: 'correspondentAccount', label: 'M./h' },
    { key: 'settlementAccount',    label: 'H./h' },
  ]

  const mk = (cat, key) => `${cat}__${key}`

  const loadDocSettings = async () => {
    setDocLoading(true)
    try {
      const [sectionsResults, banksRes] = await Promise.all([
        Promise.all(SECTIONS.map(s => configApi.getActiveByCategory(s.category))),
        banksApi.getAll(),
      ])

      const map = {}
      const vals = {}
      sectionsResults.forEach((res) => {
        const list = res.data?.data || res.data || []
        list.forEach(item => {
          const k = mk(item.category, item.key)
          map[k] = item
          vals[k] = item.value || ''
        })
      })

      setDocItems(map)
      setDocValues(vals)
      setBanks(banksRes.data?.data || banksRes.data || [])
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Məlumatlar yüklənə bilmədi')
    } finally {
      setDocLoading(false)
    }
  }

  const validateDocFields = () => {
    const errs = {}
    const val = (cat, key) => docValues[mk(cat, key)] || ''

    const voenVal = val('COMPANY_INFO', 'VOEN')
    if (voenVal.trim()) { const e = v.voen(voenVal); if (e) errs[mk('COMPANY_INFO', 'VOEN')] = e }

    const phoneVal = val('COMPANY_INFO', 'PHONE')
    if (phoneVal.trim()) { const e = v.phone(phoneVal); if (e) errs[mk('COMPANY_INFO', 'PHONE')] = e }

    const emailVal = val('COMPANY_INFO', 'EMAIL')
    if (emailVal.trim()) { const e = v.email(emailVal); if (e) errs[mk('COMPANY_INFO', 'EMAIL')] = e }

    setDocErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleDocSave = async () => {
    if (!validateDocFields()) { toast.error('Xahiş edirik xətaları düzəldin'); return }
    setDocSaving(true)
    try {
      const updates = Object.entries(docValues)
        .filter(([k, val]) => docItems[k] && val !== (docItems[k].value || ''))
        .map(([k, val]) => {
          const item = docItems[k]
          return configApi.update(item.id, {
            category: item.category, key: item.key, value: val,
            description: item.description || '', sortOrder: item.sortOrder, active: item.active,
          })
        })

      if (updates.length === 0) { toast.success('Dəyişiklik yoxdur'); return }
      await Promise.all(updates)
      toast.success('Saxlandı')
      loadDocSettings()
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    } finally {
      setDocSaving(false)
    }
  }

  const loadExpenseConfig = async () => {
    setExpLoading(true)
    try {
      const [catRes, srcRes] = await Promise.all([
        expenseCategoryApi.getAll(),
        expenseSourceApi.getAll(),
      ])
      setExpCats(catRes.data?.data || [])
      setExpSrcs(srcRes.data?.data || [])
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Yüklənə bilmədi')
    } finally {
      setExpLoading(false)
    }
  }

  const handleSaveCat = async () => {
    if (!catForm.code?.trim()) { toast.error('Kod tələbdir'); return }
    if (!catForm.name?.trim()) { toast.error('Ad tələbdir'); return }
    try {
      const payload = { code: catForm.code.trim().toUpperCase(), name: catForm.name.trim(), description: catForm.description || '', active: catForm.active !== false }
      if (editingCatIdx === 'new') { await expenseCategoryApi.create(payload); toast.success('Kateqoriya əlavə edildi') }
      else { await expenseCategoryApi.update(editingCatIdx, payload); toast.success('Kateqoriya yeniləndi') }
      setEditingCatIdx(null); setCatForm({}); loadExpenseConfig()
    } catch (err) { toast.error(err?.response?.data?.message || 'Xəta baş verdi') }
  }

  const handleDeleteCat = async (item) => {
    if (!(await confirm({ title: 'Kateqoriyanı sil', message: `"${item.name}" silinsin?` }))) return
    try { await expenseCategoryApi.delete(item.id); toast.success('Silindi'); loadExpenseConfig() }
    catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Xəta baş verdi') }
  }

  const handleSaveSrc = async () => {
    if (!srcForm.code?.trim())       { toast.error('Kod tələbdir'); return }
    if (!srcForm.name?.trim())       { toast.error('Ad tələbdir'); return }
    if (!srcForm.categoryId)         { toast.error('Kateqoriya seçin'); return }
    try {
      const payload = { code: srcForm.code.trim().toUpperCase(), name: srcForm.name.trim(), categoryId: srcForm.categoryId, active: srcForm.active !== false }
      if (editingSrcIdx === 'new') { await expenseSourceApi.create(payload); toast.success('Mənbə əlavə edildi') }
      else { await expenseSourceApi.update(editingSrcIdx, payload); toast.success('Mənbə yeniləndi') }
      setEditingSrcIdx(null); setSrcForm({}); loadExpenseConfig()
    } catch (err) { toast.error(err?.response?.data?.message || 'Xəta baş verdi') }
  }

  const handleDeleteSrc = async (item) => {
    if (!(await confirm({ title: 'Mənbəni sil', message: `"${item.name}" silinsin?` }))) return
    try { await expenseSourceApi.delete(item.id); toast.success('Silindi'); loadExpenseConfig() }
    catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Xəta baş verdi') }
  }

  const loadBanks = async () => {
    try {
      const res = await banksApi.getAll()
      setBanks(res.data?.data || res.data || [])
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Banklar yüklənə bilmədi')
    }
  }

  const handleAddBank = () => {
    setEditingBankIdx('new')
    setBankForm({ bankName: '', bankCode: '', swift: '', iban: '', correspondentAccount: '', settlementAccount: '' })
  }

  const handleEditBank = (bank) => {
    setEditingBankIdx(bank.id)
    setBankForm({ ...bank })
  }

  const validateBankForm = () => {
    const errs = {}
    const e = (field, ...rules) => { const err = v.chain(bankForm[field] || '', ...rules); if (err) errs[field] = err }
    e('bankName', v.required, v.minLen(2), v.realContent, v.maxLen(100))
    e('bankCode', v.required, v.minLen(2), v.maxLen(20))
    e('iban', v.required, v.minLen(10), v.maxLen(34))
    setBankErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSaveBank = async () => {
    if (!validateBankForm()) return
    setDocSaving(true)
    try {
      if (editingBankIdx === 'new') {
        await banksApi.create(bankForm)
        toast.success('Bank əlavə edildi')
      } else {
        await banksApi.update(editingBankIdx, bankForm)
        toast.success('Bank yeniləndi')
      }
      setEditingBankIdx(null)
      setBankForm({})
      await loadBanks()
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    } finally {
      setDocSaving(false)
    }
  }

  const handleDeleteBank = async (bank) => {
    if (!(await confirm({ title: 'Bankı sil', message: `"${bank.bankName}" silinsin?` }))) return
    setDocSaving(true)
    try {
      await banksApi.delete(bank.id)
      toast.success('Bank silindi')
      await loadBanks()
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    } finally {
      setDocSaving(false)
    }
  }

  const loadCategories = async () => {
    setLoadingCats(true)
    try {
      const res = await configApi.getAll()
      const grouped = res.data.data || {}
      const filteredGrouped = Object.fromEntries(Object.entries(grouped).filter(([k]) => !HIDDEN_CATEGORIES.has(k)))
      setCatData(filteredGrouped)
      const cats = Object.keys(filteredGrouped)
      setCategories(cats)
      if (cats.length > 0 && (!activeCategory || !cats.includes(activeCategory))) {
        setActiveCategory(cats[0])
      }
    } catch {
    } finally {
      setLoadingCats(false)
    }
  }

  const loadItems = useCallback(async () => {
    if (!activeCategory) return
    setLoadingItems(true)
    try {
      const params = { category: activeCategory, page, size: pageSize }
      if (search) params.q = search
      const res = await configApi.getAllPaged(params)
      setTableData(res.data.data || res.data)
    } catch {
    } finally {
      setLoadingItems(false)
    }
  }, [activeCategory, page, pageSize, search])

  useEffect(() => { loadCategories() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadItems() }, [loadItems])
  useEffect(() => {
    if (tab === 'documents') loadDocSettings()
    if (tab === 'expenses')  loadExpenseConfig()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const reload = () => { loadCategories(); loadItems() }

  const handleDelete = async (item) => {
    if (!(await confirm({ title: 'Elementi sil', message: `"${item.key}" elementini silmək istəyirsiniz?` }))) return
    try {
      await configApi.delete(item.id)
      toast.success('Element silindi')
      reload()
    } catch {
    }
  }

  const handleToggleActive = async (item) => {
    try {
      await configApi.update(item.id, { ...item, active: !item.active })
      toast.success(item.active ? 'Deaktiv edildi' : 'Aktiv edildi')
      reload()
    } catch {
    }
  }

  const totalCount = Object.values(catData).reduce((sum, arr) => sum + arr.length, 0)

  const TABS = [
    { id: 'categories', label: 'Kateqoriyalar',          icon: Layers },
    { id: 'documents',  label: 'Sənəd Konfiqurasiyası',  icon: FileText },
    { id: 'expenses',   label: 'Daimi Ödənişlər',        icon: Tags },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="ces-page-title">Konfiqurasiya</h1>
          <p className="ces-page-sub">
            Sistem parametrləri, sənəd konfiqurasiyası və daimi ödənişlər
          </p>
        </div>
        {tab === 'categories' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--ces-muted)] font-medium">
              {categories.length} kateqoriya · {totalCount} element
            </span>
            <button onClick={reload} className="ces-btn ces-btn-outline ces-btn-sm" title="Yenilə">
              <RefreshCw size={14} />
              Yenilə
            </button>
          </div>
        )}
        {tab === 'documents' && (
          <button
            onClick={handleDocSave}
            disabled={docSaving || docLoading}
            className="ces-btn ces-btn-primary"
          >
            {docSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Yadda saxla
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="ces-tabs mb-6">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx('ces-tab', tab === t.id && 'on')}
            >
              <span className="inline-flex items-center gap-2">
                <Icon size={15} />
                {t.label}
              </span>
            </button>
          )
        })}
      </div>

      {tab === 'categories' && (
        <div className="grid gap-5" style={{ gridTemplateColumns: '260px 1fr' }}>
          {/* Category sidebar */}
          <div>
            <div className="ces-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="px-4 py-3 border-b border-[var(--ces-line)]">
                <p className="ces-sec-label">Kateqoriyalar</p>
              </div>
              {loadingCats ? (
                <div className="p-3 space-y-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-9 rounded-lg" style={{ background: 'var(--ces-graphite-50)' }} />
                  ))}
                </div>
              ) : categories.length === 0 ? (
                <p className="p-6 text-xs text-center text-[var(--ces-muted)]">Kateqoriya yoxdur</p>
              ) : (
                <div className="py-1">
                  {categories.map(cat => {
                    const isActive = activeCategory === cat
                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={clsx(
                          'w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors border-l-2',
                          isActive
                            ? 'border-[var(--ces-gold)] bg-[var(--ces-gold-50)] text-[var(--ces-ink)] font-semibold'
                            : 'border-transparent text-[var(--ces-muted)] hover:bg-[var(--ces-graphite-50)] hover:text-[var(--ces-graphite)]'
                        )}
                      >
                        <span className="truncate">{categoryLabel(cat)}</span>
                        <span className={clsx('ces-pill sm', isActive ? 'ces-p-gold' : 'ces-p-mute')}>
                          {catData[cat]?.length || 0}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Items area */}
          <div className="min-w-0">
            {activeCategory && (
              <div className="flex flex-wrap gap-3 mb-4 items-center">
                <div className="ces-input has-icon sm flex-1 min-w-[240px]">
                  <Search size={15} />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`${categoryLabel(activeCategory)} içində axtar...`}
                  />
                </div>
                <button
                  onClick={() => {
                    if (!canCreate) { toast.error('Bu əməliyyat üçün icazəniz yoxdur'); return }
                    setModal({ open: true, editing: null })
                  }}
                  className="ces-btn ces-btn-primary"
                >
                  <Plus size={16} />
                  Yeni element
                </button>
              </div>
            )}

            <div className="ces-table-wrap">
              {activeCategory && (
                <div className="ces-table-tools">
                  <div>
                    <h3 className="text-base font-bold text-[var(--ces-ink)] m-0">{categoryLabel(activeCategory)}</h3>
                    {activeCategory === 'EXPENSE_SOURCE' && (
                      <p className="text-[11px] text-[var(--ces-gold-700)] mt-1 font-medium">
                        Hər mənbənin <strong>Təsvir</strong> sahəsinə üst kateqoriyanın açarını yazın (məs: <code className="mono">PROVIDER</code>)
                      </p>
                    )}
                  </div>
                  <span className="ces-pill ces-p-mute sm">
                    {tableData.totalElements || 0} element
                  </span>
                </div>
              )}

              {!activeCategory ? (
                <div className="p-12 text-center">
                  <div className="inline-flex w-14 h-14 rounded-full mb-3 items-center justify-center" style={{ background: 'var(--ces-graphite-50)', color: 'var(--ces-mute2)' }}>
                    <Settings size={26} />
                  </div>
                  <p className="text-sm text-[var(--ces-muted)] m-0">Kateqoriya seçin</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="ces-tbl">
                      <thead>
                        <tr>
                          <th style={{ width: 50 }}>#</th>
                          <th>Açar / Ad</th>
                          <th>Dəyər</th>
                          <th>{activeCategory === 'EXPENSE_SOURCE' ? 'Üst Kateqoriya açarı' : 'Təsvir'}</th>
                          <th style={{ width: 100, textAlign: 'center' }}>Status</th>
                          <th className="r" style={{ width: 110 }}>Əməliyyat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingItems ? (
                          <TableSkeleton cols={6} rows={5} />
                        ) : tableData.content.length === 0 ? (
                          <EmptyState
                            icon={Settings}
                            title="Element tapılmadı"
                            description={search ? 'Axtarış şərtlərini dəyişin' : 'Bu kateqoriyada element yoxdur'}
                            action={() => {
                              if (!canCreate) { toast.error('Bu əməliyyat üçün icazəniz yoxdur'); return }
                              setModal({ open: true, editing: null })
                            }}
                            actionLabel="Yeni Element"
                          />
                        ) : (
                          tableData.content.map((item, idx) => (
                            <tr key={item.id}>
                              <td className="mono" style={{ color: 'var(--ces-mute2)', fontSize: 12 }}>{page * pageSize + idx + 1}</td>
                              <td>
                                <span className="font-semibold text-[var(--ces-ink)]">{item.key}</span>
                              </td>
                              <td style={{ color: 'var(--ces-muted)' }}>{item.value || '—'}</td>
                              <td className="max-w-[260px] truncate">
                                {activeCategory === 'EXPENSE_SOURCE' && item.description
                                  ? <span className="ces-pill ces-p-gold sm mono">{item.description}</span>
                                  : <span style={{ color: 'var(--ces-muted)', fontSize: 12.5 }}>{item.description || '—'}</span>
                                }
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {canEdit ? (
                                  <button onClick={() => handleToggleActive(item)} title={item.active ? 'Deaktiv et' : 'Aktiv et'} className="transition-colors">
                                    {item.active ? (
                                      <ToggleRight size={22} color="var(--ces-ok)" />
                                    ) : (
                                      <ToggleLeft size={22} color="var(--ces-mute2)" />
                                    )}
                                  </button>
                                ) : (
                                  <span className={clsx('ces-pill sm', item.active ? 'ces-p-ok' : 'ces-p-mute')}>
                                    <span className="d" />
                                    {item.active ? 'Aktiv' : 'Deaktiv'}
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className="flex items-center gap-1 justify-end">
                                  <button
                                    onClick={() => {
                                      if (!canEdit) { toast.error('Redaktə icazəniz yoxdur'); return }
                                      setModal({ open: true, editing: item })
                                    }}
                                    className="ces-row-act gold"
                                    title="Redaktə et"
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  {canDelete && (
                                    <button onClick={() => handleDelete(item)} className="ces-row-act danger" title="Sil">
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {tableData.totalPages > 1 && (
                    <Pagination
                      page={tableData.page + 1}
                      pageSize={tableData.size}
                      totalPages={tableData.totalPages}
                      totalElements={tableData.totalElements}
                      onPage={(p) => setPage(p - 1)}
                      onPageSize={(s) => { setPageSize(s); setPage(0) }}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-5">
          {docLoading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-40 rounded-2xl" style={{ background: 'var(--ces-graphite-50)' }} />
              ))}
            </div>
          ) : (
            <>
              {SECTIONS.map(section => (
                <div key={section.category} className="ces-card">
                  <h3 className="text-base font-bold text-[var(--ces-ink)] mb-4 pb-3 border-b border-[var(--ces-line)] m-0">
                    {section.title}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
                    {section.fields.map(field => {
                      const k = mk(section.category, field.key)
                      const err = docErrors[k]
                      return (
                        <div key={field.key} className="ces-field">
                          <label>{field.label}</label>
                          <div className={clsx('ces-input', err && 'is-error')}>
                            <input
                              type="text"
                              value={docValues[k] ?? ''}
                              onChange={e => {
                                setDocValues(prev => ({ ...prev, [k]: e.target.value }))
                                if (err) setDocErrors(prev => { const n = { ...prev }; delete n[k]; return n })
                              }}
                              placeholder={field.placeholder}
                            />
                          </div>
                          {err && <span className="ces-err">{err}</span>}
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
                    <h3 className="text-base font-bold text-[var(--ces-ink)] m-0">Bank Məlumatları</h3>
                    <p className="text-xs text-[var(--ces-muted)] mt-1">Sənədlərdə görünən bank rekvizitləri</p>
                  </div>
                  {canCreate && editingBankIdx === null && (
                    <button onClick={handleAddBank} className="ces-btn ces-btn-primary ces-btn-sm">
                      <Plus size={14} />
                      Yeni Bank
                    </button>
                  )}
                </div>

                {editingBankIdx !== null && (
                  <div className="p-5 border-b border-[var(--ces-line)]" style={{ background: 'var(--ces-gold-50)' }}>
                    <p className="ces-sec-label mb-4" style={{ color: 'var(--ces-gold-700)' }}>
                      {editingBankIdx === 'new' ? 'Yeni Bank' : 'Bankı Redaktə Et'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-0">
                      {BANK_FIELDS.map(field => {
                        const err = bankErrors[field.key]
                        const required = ['bankName', 'bankCode', 'iban'].includes(field.key)
                        return (
                          <div key={field.key} className="ces-field">
                            <label>
                              {field.label} {required && <span className="req">*</span>}
                            </label>
                            <div className={clsx('ces-input', err && 'is-error')}>
                              <input
                                type="text"
                                value={bankForm[field.key] || ''}
                                onChange={e => {
                                  setBankForm(f => ({ ...f, [field.key]: e.target.value }))
                                  if (err) setBankErrors(prev => { const n = { ...prev }; delete n[field.key]; return n })
                                }}
                                placeholder={field.label}
                              />
                            </div>
                            {err && <span className="ces-err">{err}</span>}
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex gap-2 justify-end mt-2">
                      <button
                        onClick={() => { setEditingBankIdx(null); setBankForm({}); setBankErrors({}) }}
                        className="ces-btn ces-btn-ghost ces-btn-sm"
                      >
                        Ləğv et
                      </button>
                      <button onClick={handleSaveBank} disabled={docSaving} className="ces-btn ces-btn-primary ces-btn-sm">
                        {docSaving && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        Saxla
                      </button>
                    </div>
                  </div>
                )}

                {editingBankIdx === null && (
                  <div className="overflow-x-auto">
                    <table className="ces-tbl" style={{ minWidth: 880 }}>
                      <thead>
                        <tr>
                          <th>Bank Adı</th>
                          <th>Kod</th>
                          <th>SWIFT</th>
                          <th>IBAN</th>
                          <th>M./h</th>
                          <th>H./h</th>
                          <th className="r" style={{ width: 110 }}>Əməliyyat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {banks.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-sm" style={{ color: 'var(--ces-muted)' }}>
                              Hələ bank əlavə edilməyib
                            </td>
                          </tr>
                        ) : (
                          banks.map((bank) => (
                            <tr key={bank.id}>
                              <td className="font-semibold text-[var(--ces-ink)]">{bank.bankName || '—'}</td>
                              <td className="mono" style={{ color: 'var(--ces-muted)' }}>{bank.bankCode || '—'}</td>
                              <td className="mono" style={{ color: 'var(--ces-muted)' }}>{bank.swift || '—'}</td>
                              <td className="mono" style={{ color: 'var(--ces-muted)' }}>{bank.iban || '—'}</td>
                              <td className="mono" style={{ color: 'var(--ces-muted)' }}>{bank.correspondentAccount || '—'}</td>
                              <td className="mono" style={{ color: 'var(--ces-muted)' }}>{bank.settlementAccount || '—'}</td>
                              <td>
                                <div className="flex items-center gap-1 justify-end">
                                  {canEdit && (
                                    <button onClick={() => handleEditBank(bank)} className="ces-row-act gold" title="Redaktə et">
                                      <Pencil size={15} />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button onClick={() => handleDeleteBank(bank)} className="ces-row-act danger" title="Sil">
                                      <Trash2 size={15} />
                                    </button>
                                  )}
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
      )}

      {tab === 'expenses' && (
        <div className="space-y-5">
          {expLoading ? (
            <div className="space-y-4">
              {[1,2].map(i => (
                <div key={i} className="h-48 rounded-2xl" style={{ background: 'var(--ces-graphite-50)' }} />
              ))}
            </div>
          ) : (
            <>
              {/* EXPENSE_CATEGORY table */}
              <div className="ces-table-wrap">
                <div className="ces-table-tools">
                  <div>
                    <h3 className="text-base font-bold text-[var(--ces-ink)] m-0">Xərc Kateqoriyaları</h3>
                    <p className="text-xs text-[var(--ces-muted)] mt-1">Daimi ödənişlər üçün üst səviyyəli qruplar</p>
                  </div>
                  {canCreate && editingCatIdx === null && (
                    <button
                      onClick={() => { setEditingCatIdx('new'); setCatForm({ code: '', name: '', active: true }) }}
                      className="ces-btn ces-btn-primary ces-btn-sm"
                    >
                      <Plus size={14} />
                      Yeni Kateqoriya
                    </button>
                  )}
                </div>

                {editingCatIdx !== null && (
                  <div className="p-5 border-b border-[var(--ces-line)]" style={{ background: 'var(--ces-gold-50)' }}>
                    <p className="ces-sec-label mb-4" style={{ color: 'var(--ces-gold-700)' }}>
                      {editingCatIdx === 'new' ? 'Yeni Kateqoriya' : 'Kateqoriyanı Redaktə Et'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-0">
                      <div className="ces-field">
                        <label>Kod <span className="req">*</span></label>
                        <div className="ces-input">
                          <input
                            value={catForm.code || ''}
                            onChange={e => setCatForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                            placeholder="MƏS: KOMMUNAL"
                            className="mono"
                          />
                        </div>
                      </div>
                      <div className="ces-field">
                        <label>Ad <span className="req">*</span></label>
                        <div className="ces-input">
                          <input
                            value={catForm.name || ''}
                            onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Məs: Kommunal xərclər"
                          />
                        </div>
                      </div>
                      <div className="ces-field flex items-end">
                        <label className="ces-chk" style={{ marginBottom: 12 }}>
                          <input
                            type="checkbox"
                            checked={catForm.active !== false}
                            onChange={e => setCatForm(f => ({ ...f, active: e.target.checked }))}
                          />
                          <span className="ces-cb" />
                          <span>Aktivdir</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end mt-2">
                      <button onClick={() => { setEditingCatIdx(null); setCatForm({}) }} className="ces-btn ces-btn-ghost ces-btn-sm">Ləğv et</button>
                      <button onClick={handleSaveCat} className="ces-btn ces-btn-primary ces-btn-sm">Saxla</button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="ces-tbl">
                    <thead>
                      <tr>
                        <th style={{ width: 50 }}>#</th>
                        <th>Kod</th>
                        <th>Ad</th>
                        <th style={{ width: 100, textAlign: 'center' }}>Status</th>
                        <th className="r" style={{ width: 110 }}>Əməliyyat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expCats.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-sm" style={{ color: 'var(--ces-muted)' }}>
                            Kateqoriya yoxdur
                          </td>
                        </tr>
                      ) : expCats.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="mono" style={{ color: 'var(--ces-mute2)', fontSize: 12 }}>{idx + 1}</td>
                          <td>
                            <span className="ces-pill ces-p-mute sm mono">{item.code}</span>
                          </td>
                          <td className="font-semibold text-[var(--ces-ink)]">{item.name || '—'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={clsx('ces-pill sm', item.active ? 'ces-p-ok' : 'ces-p-mute')}>
                              <span className="d" />
                              {item.active ? 'Aktiv' : 'Deaktiv'}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-1 justify-end">
                              {canEdit && (
                                <button
                                  onClick={() => { setEditingCatIdx(item.id); setCatForm({ code: item.code, name: item.name || '', description: item.description || '', active: item.active }) }}
                                  className="ces-row-act gold"
                                  title="Redaktə et"
                                >
                                  <Pencil size={15} />
                                </button>
                              )}
                              {canDelete && (
                                <button onClick={() => handleDeleteCat(item)} className="ces-row-act danger" title="Sil">
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* EXPENSE_SOURCE table */}
              <div className="ces-table-wrap">
                <div className="ces-table-tools">
                  <div>
                    <h3 className="text-base font-bold text-[var(--ces-ink)] m-0">Xərc Mənbələri</h3>
                    <p className="text-xs text-[var(--ces-muted)] mt-1">Hər mənbə bir kateqoriyaya bağlıdır</p>
                  </div>
                  {canCreate && editingSrcIdx === null && (
                    <button
                      onClick={() => { setEditingSrcIdx('new'); setSrcForm({ code: '', name: '', active: true }) }}
                      className="ces-btn ces-btn-primary ces-btn-sm"
                    >
                      <Plus size={14} />
                      Yeni Mənbə
                    </button>
                  )}
                </div>

                {editingSrcIdx !== null && (
                  <div className="p-5 border-b border-[var(--ces-line)]" style={{ background: 'var(--ces-gold-50)' }}>
                    <p className="ces-sec-label mb-4" style={{ color: 'var(--ces-gold-700)' }}>
                      {editingSrcIdx === 'new' ? 'Yeni Mənbə' : 'Mənbəni Redaktə Et'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
                      <div className="ces-field">
                        <label>Kod <span className="req">*</span></label>
                        <div className="ces-input">
                          <input
                            value={srcForm.code || ''}
                            onChange={e => setSrcForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                            placeholder="MƏS: AZERCELL"
                            className="mono"
                          />
                        </div>
                      </div>
                      <div className="ces-field">
                        <label>Ad <span className="req">*</span></label>
                        <div className="ces-input">
                          <input
                            value={srcForm.name || ''}
                            onChange={e => setSrcForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Məs: Azercell"
                          />
                        </div>
                      </div>
                      <div className="ces-field">
                        <label>Kateqoriya <span className="req">*</span></label>
                        <select
                          value={srcForm.categoryId || ''}
                          onChange={e => setSrcForm(f => ({ ...f, categoryId: e.target.value ? Number(e.target.value) : null }))}
                          className="ces-select"
                        >
                          <option value="">Kateqoriya seçin</option>
                          {expCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="ces-field flex items-end">
                        <label className="ces-chk" style={{ marginBottom: 12 }}>
                          <input
                            type="checkbox"
                            checked={srcForm.active !== false}
                            onChange={e => setSrcForm(f => ({ ...f, active: e.target.checked }))}
                          />
                          <span className="ces-cb" />
                          <span>Aktivdir</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end mt-2">
                      <button onClick={() => { setEditingSrcIdx(null); setSrcForm({}) }} className="ces-btn ces-btn-ghost ces-btn-sm">Ləğv et</button>
                      <button onClick={handleSaveSrc} className="ces-btn ces-btn-primary ces-btn-sm">Saxla</button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="ces-tbl">
                    <thead>
                      <tr>
                        <th style={{ width: 50 }}>#</th>
                        <th>Kod</th>
                        <th>Ad</th>
                        <th>Kateqoriya</th>
                        <th style={{ width: 100, textAlign: 'center' }}>Status</th>
                        <th className="r" style={{ width: 110 }}>Əməliyyat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expSrcs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-sm" style={{ color: 'var(--ces-muted)' }}>
                            Mənbə yoxdur
                          </td>
                        </tr>
                      ) : expSrcs.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="mono" style={{ color: 'var(--ces-mute2)', fontSize: 12 }}>{idx + 1}</td>
                          <td>
                            <span className="ces-pill ces-p-mute sm mono">{item.code}</span>
                          </td>
                          <td className="font-semibold text-[var(--ces-ink)]">{item.name || '—'}</td>
                          <td>
                            {item.categoryName ? (
                              <span className="ces-pill ces-p-gold sm">{item.categoryName}</span>
                            ) : <span style={{ color: 'var(--ces-mute2)' }}>—</span>}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={clsx('ces-pill sm', item.active ? 'ces-p-ok' : 'ces-p-mute')}>
                              <span className="d" />
                              {item.active ? 'Aktiv' : 'Deaktiv'}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-1 justify-end">
                              {canEdit && (
                                <button
                                  onClick={() => { setEditingSrcIdx(item.id); setSrcForm({ code: item.code, name: item.name || '', categoryId: item.categoryId, active: item.active }) }}
                                  className="ces-row-act gold"
                                  title="Redaktə et"
                                >
                                  <Pencil size={15} />
                                </button>
                              )}
                              {canDelete && (
                                <button onClick={() => handleDeleteSrc(item)} className="ces-row-act danger" title="Sil">
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {modal.open && (
        <ConfigItemModal
          editing={modal.editing}
          categories={categories}
          currentCategory={activeCategory}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => { setModal({ open: false, editing: null }); reload() }}
        />
      )}
      <ConfirmDialog />
    </div>
  )
}
