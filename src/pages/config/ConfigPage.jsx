import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2, Settings, Search, GripVertical, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react'
import { configApi } from '../../api/config'
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
}

const categoryLabel = (cat) => CATEGORY_LABELS[cat] || cat

export default function ConfigPage() {
  const [catData, setCatData] = useState({})   // { category: [items] } for sidebar counts
  const [categories, setCategories] = useState([])
  const [tableData, setTableData] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [loadingCats, setLoadingCats] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [modal, setModal] = useState({ open: false, editing: null })
  const [searchParams, setSearchParams] = useSearchParams()
  const searchRef = useRef(null)

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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Konfiqurasiya</h1>
          <p className="text-xs text-gray-400 mt-0.5">{categories.length} kateqoriya, {totalCount} element</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reload} className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors" title="Yenilə">
            <RefreshCw size={14} />
          </button>
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
      </div>

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
              <Pagination
                page={tableData.page + 1}
                pageSize={tableData.size}
                totalPages={tableData.totalPages}
                totalElements={tableData.totalElements}
                onPage={(p) => setPage(p - 1)}
                onPageSize={(s) => { setPageSize(s); setPage(0) }}
              />

            )}
            {!activeCategory ? (
              <div className="p-12 text-center">
                <Settings size={40} className="mx-auto text-gray-200 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-400">Kateqoriya seçin</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide w-8">#</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Açar / Ad</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dəyər</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Təsvir</th>
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
                          <td className="py-2.5 px-4 text-xs text-gray-400 max-w-[200px] truncate">{item.description || '—'}</td>
                          <td className="py-2.5 px-4 text-center">
                            {canEdit ? (
                              <button
                                onClick={() => handleToggleActive(item)}
                                title={item.active ? 'Deaktiv et' : 'Aktiv et'}
                                className="transition-colors"
                              >
                                {item.active ? (
                                  <ToggleRight size={20} className="text-green-500 hover:text-green-600" />
                                ) : (
                                  <ToggleLeft size={20} className="text-gray-300 hover:text-gray-400" />
                                )}
                              </button>
                            ) : (
                              <span className={clsx(
                                'px-2 py-0.5 rounded text-[10px] font-medium',
                                item.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                              )}>
                                {item.active ? 'Aktiv' : 'Deaktiv'}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-1 justify-end">
                              {canEdit && (
                                <button
                                  onClick={() => setModal({ open: true, editing: item })}
                                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
                                  title="Redaktə et"
                                >
                                  <Pencil size={14} />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"
                                  title="Sil"
                                >
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
        </div>
      </div>

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
