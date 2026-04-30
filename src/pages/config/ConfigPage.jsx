import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2, Settings, Search, GripVertical, ToggleLeft, ToggleRight, RefreshCw, Save, FileText } from 'lucide-react'
import { configApi } from '../../api/config'
import { banksApi } from '../../api/banks'
import { useAuthStore } from '../../store/authStore'
import ConfigItemModal from './ConfigItemModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import Pagination from '../../components/common/Pagination'
import { useSearchParams } from 'react-router-dom'

const CATEGORY_LABELS = {
  EQUIPMENT_BRAND:   'Texnika brendləri',
  EQUIPMENT_TYPE:    'Texnika növləri',
  REGION:            'Bölgələr',
  TECH_PARAM:        'Texniki parametrlər',
  SAFETY_EQUIPMENT:  'Təhlükəsizlik avadanlıqları',
  SERVICE_CHECKLIST: 'Servis Checklist Şablonları',
  DOCUMENT_VAT_RATE: 'Sənəd ƏDV Dərəcəsi',
  COMPANY_INFO:      'Şirkət Məlumatları',
  EXPENSE_CATEGORY:  'Xərc Kateqoriyaları',
  EXPENSE_SOURCE:    'Xərc Mənbələri',
}

const categoryLabel = (cat) => CATEGORY_LABELS[cat] || cat

export default function ConfigPage() {
  const [tab, setTab] = useState('categories')
  const [catData, setCatData] = useState({})   // { category: [items] } for sidebar counts
  const [categories, setCategories] = useState([])
  const [tableData, setTableData] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [loadingCats, setLoadingCats] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [modal, setModal] = useState({ open: false, editing: null })
  const [searchParams, setSearchParams] = useSearchParams()
  const searchRef = useRef(null)

  // Document settings state
  const [docItems, setDocItems]     = useState({})
  const [docValues, setDocValues]   = useState({})
  const [banks, setBanks]     = useState([])
  const [docLoading, setDocLoading] = useState(true)
  const [docSaving, setDocSaving]   = useState(false)
  const [editingBankIdx, setEditingBankIdx] = useState(null)
  const [bankForm, setBankForm] = useState({})

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

  // Document settings
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
      sectionsResults.forEach((res, idx) => {
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
    } catch {
      toast.error('Məlumatlar yüklənə bilmədi')
    } finally {
      setDocLoading(false)
    }
  }

  const handleDocSave = async () => {
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
    } catch {
      toast.error('Xəta baş verdi')
    } finally {
      setDocSaving(false)
    }
  }

  const loadBanks = async () => {
    try {
      const res = await banksApi.getAll()
      setBanks(res.data?.data || res.data || [])
    } catch {
      toast.error('Banklar yüklənə bilmədi')
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

  const handleSaveBank = async () => {
    if (!bankForm.bankName?.trim()) { toast.error('Bank adı tələbdir'); return }
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
    } catch {
      toast.error('Xəta baş verdi')
    } finally {
      setDocSaving(false)
    }
  }

  const handleDeleteBank = async (bank) => {
    setDocSaving(true)
    try {
      await banksApi.delete(bank.id)
      toast.success('Bank silindi')
      await loadBanks()
    } catch {
      toast.error('Xəta baş verdi')
    } finally {
      setDocSaving(false)
    }
  }

  const loadCategories = async () => {
    setLoadingCats(true)
    try {
      const res = await configApi.getAll()
      const grouped = res.data.data || {}
      setCatData(grouped)
      const cats = Object.keys(grouped)
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

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500'

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Konfiqurasiya</h1>

        {/* Tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('categories')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                tab === 'categories'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              <Settings size={14} />
              Kateqoriyalar
            </button>
            <button
              onClick={() => setTab('documents')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                tab === 'documents'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              <FileText size={14} />
              Sənəd Konfiqurasiyası
            </button>
          </div>
          {tab === 'categories' && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-400">{categories.length} kateqoriya, {totalCount} element</p>
              <button onClick={reload} className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors" title="Yenilə">
                <RefreshCw size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {tab === 'categories' && (
      <div className="flex gap-4">
        {/* Category sidebar */}
        <div className="w-56 shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kateqoriyalar</p>
            </div>
            {loadingCats ? (
              <div className="p-4 space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />)}
              </div>
            ) : categories.length === 0 ? (
              <p className="p-4 text-xs text-gray-400 text-center">Kateqoriya yoxdur</p>
            ) : (
              <div className="py-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={clsx(
                      'w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors',
                      activeCategory === cat
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium border-r-2 border-amber-500'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750'
                    )}
                  >
                    <span className="truncate">{categoryLabel(cat)}</span>
                    <span className={clsx(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                      activeCategory === cat
                        ? 'bg-amber-200/50 dark:bg-amber-800/30 text-amber-700 dark:text-amber-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                    )}>
                      {catData[cat]?.length || 0}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Items table */}
        <div className="flex-1 min-w-0">
          {/* Search */}
          {activeCategory && (
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`${categoryLabel(activeCategory)} içində axtar...`}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {activeCategory && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                  <div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{categoryLabel(activeCategory)}</span>
                    {activeCategory === 'EXPENSE_SOURCE' && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                        Hər mənbənin <strong>Təsvir</strong> sahəsinə üst kateqoriyanın açarını yazın (məs: <code>PROVIDER</code>)
                      </p>
                    )}
                  </div>
                  {canCreate && (
                    <button
                      onClick={() => setModal({ open: true, editing: null })}
                      className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                      <Plus size={16} />
                      Yeni element
                    </button>
                  )}
                </div>
              )}
              {!activeCategory ? (
                <div className="p-12 text-center">
                  <Settings size={40} className="mx-auto text-gray-200 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-400">Kateqoriya seçin</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide w-8">#</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Açar / Ad</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dəyər (Display Adı)</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {activeCategory === 'EXPENSE_SOURCE' ? 'Üst Kateqoriya açarı' : 'Təsvir'}
                          </th>
                          <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                          <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Əməliyyat</th>
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
                            action={canCreate ? () => setModal({ open: true, editing: null }) : undefined}
                            actionLabel={canCreate ? 'Yeni Element' : undefined}
                          />
                        ) : (
                          tableData.content.map((item, idx) => (
                            <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                              <td className="py-2.5 px-4 text-xs text-gray-400">{idx + 1}</td>
                              <td className="py-2.5 px-4">
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.key}</span>
                              </td>
                              <td className="py-2.5 px-4 text-sm text-gray-600 dark:text-gray-400">{item.value || '—'}</td>
                              <td className="py-2.5 px-4 text-xs max-w-[200px] truncate">
                                {activeCategory === 'EXPENSE_SOURCE' && item.description
                                  ? <span className="font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">{item.description}</span>
                                  : <span className="text-gray-400">{item.description || '—'}</span>
                                }
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                {canEdit ? (
                                  <button onClick={() => handleToggleActive(item)} title={item.active ? 'Deaktiv et' : 'Aktiv et'} className="transition-colors">
                                    {item.active ? (
                                      <ToggleRight size={20} className="text-green-500 hover:text-green-600" />
                                    ) : (
                                      <ToggleLeft size={20} className="text-gray-300 hover:text-gray-400" />
                                    )}
                                  </button>
                                ) : (
                                  <span className={clsx('px-2 py-0.5 rounded text-[10px] font-medium', item.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400')}>
                                    {item.active ? 'Aktiv' : 'Deaktiv'}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-1 justify-end">
                                  {canEdit && (
                                    <button onClick={() => setModal({ open: true, editing: item })} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors" title="Redaktə et">
                                      <Pencil size={14} />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button onClick={() => handleDelete(item)} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors" title="Sil">
                                      <Trash2 size={14} />
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
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                      <Pagination
                        page={tableData.page + 1}
                        pageSize={tableData.size}
                        totalPages={tableData.totalPages}
                        totalElements={tableData.totalElements}
                        onPage={(p) => setPage(p - 1)}
                        onPageSize={(s) => { setPageSize(s); setPage(0) }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
        </div>
      </div>
      )}

      {tab === 'documents' && (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Sənəd Konfiqurasiyası</h2>
            <p className="text-sm text-gray-500 mt-0.5">PDF sənədlərə çap olunan məlumatlar</p>
          </div>
          <button
            onClick={handleDocSave}
            disabled={docSaving || docLoading}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {docSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Yadda saxla
          </button>
        </div>

        {docLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {SECTIONS.map(section => (
              <div key={section.category} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                  {section.title}
                </h3>
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
                          value={docValues[k] ?? ''}
                          onChange={e => setDocValues(v => ({ ...v, [k]: e.target.value }))}
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
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Bank Məlumatları</h3>
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

              {editingBankIdx === null && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Bank Adı</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Kod</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">SWIFT</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">IBAN</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">M./h</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">H./h</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Əməliyyat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {banks.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-4 py-8 text-center text-sm text-gray-400">Hələ bank əlavə edilməyib</td>
                        </tr>
                      ) : (
                        banks.map((bank) => (
                          <tr key={bank.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">{bank.bankName || '—'}</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{bank.bankCode || '—'}</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{bank.swift || '—'}</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{bank.iban || '—'}</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{bank.correspondentAccount || '—'}</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{bank.settlementAccount || '—'}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {canEdit && (
                                  <button onClick={() => handleEditBank(bank)} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Redaktə et">
                                    <Pencil size={14} />
                                  </button>
                                )}
                                {canDelete && (
                                  <button onClick={() => handleDeleteBank(bank)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Sil">
                                    <Trash2 size={14} />
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

      {/* Modal */}
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
