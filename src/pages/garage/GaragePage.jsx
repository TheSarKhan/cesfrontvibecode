import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight,
  FileText, Image, Truck, Download, LayoutGrid, List,
  ChevronUp, Wrench, CheckCircle, AlertTriangle, XCircle, Eye,
  ChevronsLeft, ChevronsRight, ChevronLeft, RefreshCw, SlidersHorizontal,
  Copy, Columns, X, Scale, CalendarClock,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useSearchParams } from 'react-router-dom'
import { garageApi } from '../../api/garage'
import { useAuthStore } from '../../store/authStore'
import EquipmentModal from './EquipmentModal'
import EquipmentSlideOver, { AuthImage } from './EquipmentSlideOver'
import StatusChangeModal from './StatusChangeModal'
import CompareModal from './CompareModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'

/* ─── Sabitlər ───────────────────────────────────────────────────────────── */
const STATUS_CFG = {
  AVAILABLE:      { label: 'Mövcud',              cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
  RENTED:         { label: 'İcarədə',             cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  IN_TRANSIT:     { label: 'Yolda',               cls: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' },
  IN_INSPECTION:  { label: 'Baxışdadır',          cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' },
  DEFECTIVE:      { label: 'Nasaz',               cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
  OUT_OF_SERVICE: { label: 'Xidmətdən kənarda',   cls: 'bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
}
const OWN_LABEL  = { COMPANY: 'Şirkət', INVESTOR: 'İnvestor', CONTRACTOR: 'Podratçı' }
const fmtMoney   = (v) => v != null ? `${Number(v).toLocaleString()} ₼` : '—'
const fmtDate    = (d) => d ? new Date(d).toLocaleDateString('az-AZ', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—'
const dash       = (v) => (v != null && v !== '') ? v : '—'
const PAGE_SIZES = [15, 25, 50, 100]

const STAT_CARDS = [
  { id: 'ALL',            label: 'Cəmi',              icon: Truck,         color: 'text-gray-700 dark:text-gray-200' },
  { id: 'AVAILABLE',      label: 'Mövcud',            icon: CheckCircle,   color: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'RENTED',         label: 'İcarədə',           icon: Wrench,        color: 'text-blue-600 dark:text-blue-400' },
  { id: 'IN_TRANSIT',     label: 'Yolda',             icon: Truck,         color: 'text-orange-600 dark:text-orange-400' },
  { id: 'IN_INSPECTION',  label: 'Baxışdadır',        icon: Search,        color: 'text-purple-600 dark:text-purple-400' },
  { id: 'DEFECTIVE',      label: 'Nasaz',             icon: AlertTriangle, color: 'text-red-500 dark:text-red-400' },
  { id: 'OUT_OF_SERVICE', label: 'Xidmətdən kənarda', icon: XCircle,       color: 'text-gray-500 dark:text-gray-400' },
]

const ALL_COLUMNS = [
  { id: 'name',       label: 'Texnika',       field: 'name',              alwaysVisible: true },
  { id: 'type',       label: 'Növ',           field: 'type' },
  { id: 'brand',      label: 'Brend / Model', field: 'brand' },
  { id: 'motoHours',  label: 'Moto saat',     field: 'motoHours' },
  { id: 'status',     label: 'Status' },
  { id: 'ownership',  label: 'Mülkiyyət' },
  { id: 'inspection', label: 'Son baxış',     field: 'lastInspectionDate' },
]
const DEFAULT_COLS = ALL_COLUMNS.map(c => c.id)

function getStoredCols() {
  try { const v = JSON.parse(localStorage.getItem('garage_columns')); return Array.isArray(v) ? v : DEFAULT_COLS } catch { return DEFAULT_COLS }
}

/* ─── Genişləndirilmiş sıra ──────────────────────────────────────────────── */
function ExpandedRow({ item }) {
  return (
    <tr>
      <td colSpan={99} className="border-b border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-gray-900/40 p-0">
        <div className="px-10 py-3 grid grid-cols-3 gap-3">
          <div className="grid grid-cols-2 col-span-2 gap-3">
            <Block title="Maliyyə">
              <FR l="Alış qiyməti"  v={fmtMoney(item.purchasePrice)} />
              <FR l="Bazar dəyəri"  v={fmtMoney(item.currentMarketValue)} />
              <FR l="Amortizasiya"  v={item.depreciationRate != null ? `${item.depreciationRate}%` : '—'} />
              <FR l="Saat / KM"     v={dash(item.hourKmCounter)} />
              <FR l="Moto saatlar"  v={dash(item.motoHours)} last />
            </Block>
            <Block title="Texniki baxış">
              <FR l="Son baxış"     v={fmtDate(item.lastInspectionDate)} />
              <FR l="Növbəti baxış" v={fmtDate(item.nextInspectionDate)} />
              <FR l="Saxlanma yeri" v={dash(item.storageLocation)} last />
            </Block>
            <Block title="Mülkiyyət məlumatları" className="col-span-2">
              {item.ownershipType === 'INVESTOR' && (
                <div className="grid grid-cols-3 gap-x-6">
                  <FR l="Ad, soyad" v={dash(item.ownerInvestorName)} />
                  <FR l="VÖEN"      v={dash(item.ownerInvestorVoen)} />
                  <FR l="Telefon"   v={dash(item.ownerInvestorPhone)} last />
                </div>
              )}
              {item.ownershipType === 'CONTRACTOR' && (
                <div className="grid grid-cols-4 gap-x-6">
                  <FR l="Podratçı"  v={dash(item.ownerContractorName)} />
                  <FR l="VÖEN"      v={dash(item.ownerContractorVoen)} />
                  <FR l="Tel"       v={dash(item.ownerContractorPhone)} />
                  <FR l="Əlaqədar"  v={dash(item.ownerContractorContact)} last />
                </div>
              )}
              {item.ownershipType === 'COMPANY' && (
                <p className="text-xs text-gray-400 italic">Şirkətin öz texnikasıdır</p>
              )}
            </Block>
          </div>
          <div className="flex flex-col gap-3">
            {item.notes && (
              <Block title="Qeydlər" className="flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{item.notes}</p>
              </Block>
            )}
            <Block title="Fayllar">
              <div className="flex gap-4">
                <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <FileText size={12} className="text-amber-500" /> {item.documents?.length ?? 0} sənəd
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Image size={12} className="text-amber-500" /> {item.images?.length ?? 0} şəkil
                </span>
              </div>
            </Block>
          </div>
        </div>
      </td>
    </tr>
  )
}

function Block({ title, children, className }) {
  return (
    <div className={clsx('bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-2.5', className)}>
      <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-2">{title}</p>
      {children}
    </div>
  )
}
function FR({ l, v, last }) {
  return (
    <div className={clsx('flex justify-between items-baseline py-0.5', !last && 'border-b border-gray-50 dark:border-gray-700/50')}>
      <span className="text-[10px] text-gray-400 shrink-0 pr-2">{l}</span>
      <span className="text-[10px] font-medium text-gray-700 dark:text-gray-200 text-right truncate max-w-[55%]">{v}</span>
    </div>
  )
}

/* ─── Equipment Card (grid view) ─────────────────────────────────────────── */
function EquipmentCard({ item, firstImage, onOpen, onEdit, onDelete, canEdit, canDelete, onStatusChange }) {
  const status = STATUS_CFG[item.status] || STATUS_CFG.AVAILABLE
  return (
    <div
      onClick={() => onOpen(item)}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-amber-200 dark:hover:border-amber-700 transition-all cursor-pointer group"
    >
      <div className="h-36 bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
        {firstImage
          ? <AuthImage equipmentId={item.id} imageId={firstImage.id} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          : <Truck size={32} className="text-gray-300 dark:text-gray-600" />
        }
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{item.name}</p>
            <p className="text-[10px] font-mono text-gray-400">{item.equipmentCode}</p>
          </div>
          <span className={clsx('px-1.5 py-0.5 rounded text-[9px] font-semibold border shrink-0', status.cls)}>
            {status.label}
          </span>
        </div>
        <div className="space-y-1 text-[11px] text-gray-500 dark:text-gray-400">
          {item.brand && <p>{item.brand} {item.model || ''}</p>}
          {item.type && <p className="text-gray-400">{item.type}</p>}
        </div>
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <span>{OWN_LABEL[item.ownershipType] || '—'}</span>
            <span>·</span>
            <span className="flex items-center gap-0.5"><FileText size={9} />{item.documents?.length ?? 0}</span>
            <span className="flex items-center gap-0.5"><Image size={9} />{item.images?.length ?? 0}</span>
          </div>
          <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
            {canEdit && (
              <button
                onClick={() => onStatusChange(item)}
                className={clsx('text-[10px] py-0.5 px-1.5 border rounded font-medium hover:ring-1 hover:ring-amber-400 transition-all', (STATUS_CFG[item.status] || STATUS_CFG.AVAILABLE).cls)}
              >
                {(STATUS_CFG[item.status] || STATUS_CFG.AVAILABLE).label}
              </button>
            )}
            {canEdit && (
              <button onClick={() => onEdit(item)} className="p-1 rounded text-gray-400 hover:text-amber-600 transition-colors" title="Redaktə">
                <Pencil size={12} />
              </button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(item)} className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors" title="Sil">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Sort Icon ──────────────────────────────────────────────────────────── */
function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronUp size={12} className="text-gray-300 dark:text-gray-600" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-amber-500" />
    : <ChevronDown size={12} className="text-amber-500" />
}

/* ─── GaragePage ──────────────────────────────────────────────────────────── */
export default function GaragePage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('GARAGE', 'canPost')
  const canEdit   = hasPermission('GARAGE', 'canPut')
  const canDelete = hasPermission('GARAGE', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, editing: null })
  const [slideOver, setSlideOver] = useState(null)
  const [expanded, setExpanded] = useState(new Set())
  const [selected, setSelected] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [ownershipFilter, setOwnershipFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [yearMin, setYearMin] = useState('')
  const [yearMax, setYearMax] = useState('')
  const [motoMin, setMotoMin] = useState('')
  const [motoMax, setMotoMax] = useState('')
  const [quickFilter, setQuickFilter] = useState('ALL')
  const [statusModal, setStatusModal] = useState(null)
  const [viewMode, setViewMode] = useState('table')
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const searchRef = useRef(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef(null)

  // Column visibility
  const [visibleCols, setVisibleCols] = useState(getStoredCols)
  const [colMenuOpen, setColMenuOpen] = useState(false)
  const colMenuRef = useRef(null)
  const toggleCol = (colId) => {
    setVisibleCols(prev => {
      const next = prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId]
      localStorage.setItem('garage_columns', JSON.stringify(next))
      return next
    })
  }
  const isColVisible = (colId) => visibleCols.includes(colId)

  // Compare
  const [compareOpen, setCompareOpen] = useState(false)

  // URL-based filters sync
  const [searchParams, setSearchParams] = useSearchParams()

  usePageShortcuts({
    onNew: canCreate ? () => setModal({ open: true, editing: null }) : undefined,
    searchRef,
  })

  // Read URL params on mount
  useEffect(() => {
    const p = Object.fromEntries(searchParams)
    if (p.q) setSearch(p.q)
    if (p.status) setStatusFilter(p.status)
    if (p.ownership) setOwnershipFilter(p.ownership)
    if (p.type) setTypeFilter(p.type)
    if (p.location) setLocationFilter(p.location)
    if (p.brand) setBrandFilter(p.brand)
    if (p.quick && p.quick !== 'ALL') setQuickFilter(p.quick)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync filters → URL
  useEffect(() => {
    const p = {}
    if (search) p.q = search
    if (statusFilter) p.status = statusFilter
    if (ownershipFilter) p.ownership = ownershipFilter
    if (typeFilter) p.type = typeFilter
    if (locationFilter) p.location = locationFilter
    if (brandFilter) p.brand = brandFilter
    if (quickFilter !== 'ALL') p.quick = quickFilter
    setSearchParams(p, { replace: true })
  }, [search, statusFilter, ownershipFilter, typeFilter, locationFilter, brandFilter, quickFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close popovers on click outside
  useEffect(() => {
    if (!filterOpen && !colMenuOpen) return
    const handler = (e) => {
      if (filterOpen && filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false)
      if (colMenuOpen && colMenuRef.current && !colMenuRef.current.contains(e.target)) setColMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen, colMenuOpen])

  const load = async () => {
    setLoading(true)
    try {
      const res = await garageApi.getAll()
      const data = res.data.data || res.data || []
      setEquipment(data)
      setSelected(new Set())
      setSlideOver(prev => prev ? (data.find(e => e.id === prev.id) ?? prev) : null)
    } catch { toast.error('Texnikalar yüklənmədi') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  /* ── Unique values for filter dropdowns ── */
  const uniqueTypes = useMemo(() => [...new Set(equipment.map(e => e.type).filter(Boolean))].sort(), [equipment])
  const uniqueLocations = useMemo(() => [...new Set(equipment.map(e => e.storageLocation).filter(Boolean))].sort(), [equipment])
  const uniqueBrands = useMemo(() => [...new Set(equipment.map(e => e.brand).filter(Boolean))].sort(), [equipment])
  const uniqueYears = useMemo(() => [...new Set(equipment.map(e => e.manufactureYear).filter(Boolean))].sort((a, b) => b - a), [equipment])

  /* ── Stats ── */
  const stats = useMemo(() => {
    const s = { ALL: equipment.length }
    Object.keys(STATUS_CFG).forEach(k => { s[k] = equipment.filter(e => e.status === k).length })
    return s
  }, [equipment])

  /* ── Mini stats ── */
  const miniStats = useMemo(() => {
    if (!equipment.length) return null
    const totalValue = equipment.reduce((s, e) => s + (Number(e.currentMarketValue) || 0), 0)
    const motoArr = equipment.map(e => Number(e.motoHours) || 0).filter(Boolean)
    const avgMoto = motoArr.length ? Math.round(motoArr.reduce((a, b) => a + b, 0) / motoArr.length) : 0
    return { totalValue, avgMoto }
  }, [equipment])

  /* ── Inspection warnings ── */
  const inspectionWarnings = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return equipment.filter(e => {
      if (!e.nextInspectionDate) return false
      const next = new Date(e.nextInspectionDate); next.setHours(0, 0, 0, 0)
      const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
      return diff <= 7
    })
  }, [equipment])

  /* ── Filtered ── */
  const filtered = useMemo(() => equipment.filter((e) => {
    const q = search.toLowerCase()
    if (q && !(e.name?.toLowerCase().includes(q) || e.brand?.toLowerCase().includes(q) ||
      e.model?.toLowerCase().includes(q) || e.equipmentCode?.toLowerCase().includes(q) ||
      e.serialNumber?.toLowerCase().includes(q) || e.storageLocation?.toLowerCase().includes(q))) return false
    if (statusFilter && e.status !== statusFilter) return false
    if (ownershipFilter && e.ownershipType !== ownershipFilter) return false
    if (typeFilter && e.type !== typeFilter) return false
    if (locationFilter && e.storageLocation !== locationFilter) return false
    if (brandFilter && e.brand !== brandFilter) return false
    if (quickFilter !== 'ALL' && e.status !== quickFilter) return false
    const price = Number(e.purchasePrice) || 0
    if (priceMin && price < Number(priceMin)) return false
    if (priceMax && price > Number(priceMax)) return false
    const year = Number(e.manufactureYear) || 0
    if (yearMin && year < Number(yearMin)) return false
    if (yearMax && year > Number(yearMax)) return false
    const moto = Number(e.motoHours) || 0
    if (motoMin && moto < Number(motoMin)) return false
    if (motoMax && moto > Number(motoMax)) return false
    return true
  }), [equipment, search, statusFilter, ownershipFilter, typeFilter, locationFilter, brandFilter, quickFilter, priceMin, priceMax, yearMin, yearMax, motoMin, motoMax])

  /* ── Sorted ── */
  const handleSort = (field) => {
    setSortDir(prev => sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'asc')
    setSortField(field)
  }

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av = a[sortField] ?? ''
      let bv = b[sortField] ?? ''
      if (sortField === 'purchasePrice' || sortField === 'currentMarketValue' || sortField === 'motoHours') {
        av = Number(av) || 0
        bv = Number(bv) || 0
        return sortDir === 'asc' ? av - bv : bv - av
      }
      const cmp = String(av).localeCompare(String(bv), 'az')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortField, sortDir])

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = useMemo(() => sorted.slice((safePage - 1) * pageSize, safePage * pageSize), [sorted, safePage, pageSize])

  // Reset page on filter/search change
  useEffect(() => { setPage(1) }, [search, statusFilter, ownershipFilter, typeFilter, locationFilter, brandFilter, quickFilter, priceMin, priceMax, yearMin, yearMax, motoMin, motoMax, pageSize])

  /* ── Selection ── */
  const toggleExpand = (id) => setExpanded(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })
  const toggleSelect = (id) => setSelected(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })
  const toggleAll = () =>
    setSelected(selected.size === paged.length ? new Set() : new Set(paged.map(e => e.id)))

  /* ── Actions ── */
  const handleDelete = async (item) => {
    if (!(await confirm({ title: 'Texnikanı sil', message: `"${item.name}" silmək istəyirsiniz?` }))) return
    try {
      await garageApi.delete(item.id)
      toast.success('Texnika silindi')
      if (slideOver?.id === item.id) setSlideOver(null)
      load()
    } catch (err) { if (err?.isPending) return; toast.error('Silmə uğursuz oldu') }
  }

  const handleBulkDelete = async () => {
    if (!(await confirm({ title: 'Toplu silmə', message: `${selected.size} texnika silinsin?` }))) return
    setBulkLoading(true)
    try {
      await Promise.all([...selected].map(id => garageApi.delete(id)))
      toast.success(`${selected.size} texnika silindi`)
      setSelected(new Set())
      load()
    } catch {
      toast.error('Silinmə zamanı xəta baş verdi')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleStatusChange = async (item, newStatus, reason) => {
    // Optimistic update
    const prevEquipment = [...equipment]
    setEquipment(prev => prev.map(e => e.id === item.id ? { ...e, status: newStatus } : e))
    if (slideOver?.id === item.id) setSlideOver(prev => ({ ...prev, status: newStatus }))
    try {
      await garageApi.updateStatus(item.id, newStatus, reason)
      toast.success(`Status: ${STATUS_CFG[newStatus]?.label}`)
      load()
    } catch (err) {
      // Rollback
      setEquipment(prevEquipment)
      if (slideOver?.id === item.id) setSlideOver(prev => ({ ...prev, status: item.status }))
      toast.error(err?.response?.data?.message || 'Status dəyişilmədi')
      throw err
    }
  }

  const [bulkStatusModal, setBulkStatusModal] = useState(false)
  const handleBulkStatusChange = async (_item, newStatus, reason) => {
    setBulkLoading(true)
    let ok = 0; let fail = 0
    for (const id of selected) {
      try {
        await garageApi.updateStatus(id, newStatus, reason)
        ok++
      } catch { fail++ }
    }
    setBulkLoading(false)
    setBulkStatusModal(false)
    if (ok) toast.success(`${ok} texnikanın statusu dəyişdirildi`)
    if (fail) toast.error(`${fail} texnikanın statusu dəyişdirilmədi`)
    setSelected(new Set())
    load()
  }

  const openEdit = (item) => { setSlideOver(null); setModal({ open: true, editing: item }) }
  const openClone = (item) => {
    const clone = { ...item, id: undefined, equipmentCode: '', name: `${item.name} (kopya)`, _clone: true }
    setSlideOver(null)
    setModal({ open: true, editing: clone })
  }
  const firstImg = (item) => item.images?.length ? item.images[0] : null

  /* ── Excel export ── */
  const exportExcel = () => {
    const rows = sorted.map(e => ({
      'Kod':             e.equipmentCode || '',
      'Ad':              e.name || '',
      'Növ':             e.type || '',
      'Marka':           e.brand || '',
      'Model':           e.model || '',
      'Seriya №':        e.serialNumber || '',
      'İl':              e.manufactureYear || '',
      'Alış qiyməti':    e.purchasePrice || '',
      'Bazar dəyəri':    e.currentMarketValue || '',
      'Status':          STATUS_CFG[e.status]?.label || e.status,
      'Mülkiyyət':       OWN_LABEL[e.ownershipType] || '',
      'Saxlanma yeri':   e.storageLocation || '',
      'Moto saatlar':    e.motoHours ?? '',
      'Qeyd':            e.notes || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [12, 28, 18, 14, 14, 18, 8, 14, 14, 14, 12, 20, 14, 28].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Texnikalar')
    XLSX.writeFile(wb, 'texnikalar.xlsx')
  }

  const activeFilterCount = [statusFilter, ownershipFilter, typeFilter, locationFilter, brandFilter, priceMin, priceMax, yearMin, yearMax, motoMin, motoMax].filter(Boolean).length
  const hasAnyFilter = search || activeFilterCount > 0
  const clearFilters = () => { setSearch(''); setStatusFilter(''); setOwnershipFilter(''); setTypeFilter(''); setLocationFilter(''); setBrandFilter(''); setPriceMin(''); setPriceMax(''); setYearMin(''); setYearMax(''); setMotoMin(''); setMotoMax(''); setFilterOpen(false) }

  /* ── TH component ── */
  const TH = ({ children, className, field }) => (
    <th
      onClick={field ? () => handleSort(field) : undefined}
      className={clsx(
        'sticky top-0 z-10 py-2.5 px-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-left whitespace-nowrap',
        'bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700',
        field && 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none',
        className
      )}
    >
      <div className="flex items-center gap-1">
        {children}
        {field && <SortIcon field={field} sortField={sortField} sortDir={sortDir} />}
      </div>
    </th>
  )

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 80px)' }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">Qaraj</h1>
            {inspectionWarnings.length > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 animate-pulse">
                <CalendarClock size={11} />
                {inspectionWarnings.length} baxış yaxınlaşır
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <span>{equipment.length} texnika · {filtered.length} göstərilir</span>
            {miniStats && (
              <>
                <span>·</span>
                <span>Ümumi dəyər: <strong className="text-gray-600 dark:text-gray-300">{Number(miniStats.totalValue).toLocaleString()} ₼</strong></span>
                {miniStats.avgMoto > 0 && (
                  <>
                    <span>·</span>
                    <span>Ort. moto: <strong className="text-gray-600 dark:text-gray-300">{miniStats.avgMoto.toLocaleString()} s</strong></span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={clsx('p-1.5 transition-colors', viewMode === 'table' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700')}
              title="Cədvəl"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={clsx('p-1.5 transition-colors', viewMode === 'grid' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700')}
              title="Kartlar"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
          {/* Column toggle */}
          {viewMode === 'table' && (
            <div className="relative" ref={colMenuRef}>
              <button
                onClick={() => setColMenuOpen(p => !p)}
                className="p-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title="Sütunlar"
              >
                <Columns size={14} />
              </button>
              {colMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-30 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 space-y-1">
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Sütunlar</p>
                  {ALL_COLUMNS.map(col => (
                    <label key={col.id} className="flex items-center gap-2 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleCols.includes(col.id)}
                        disabled={col.alwaysVisible}
                        onChange={() => toggleCol(col.id)}
                        className="rounded border-gray-300 text-amber-500 focus:ring-amber-500 focus:ring-1 disabled:opacity-40"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Compare */}
          {selected.size >= 2 && selected.size <= 5 && (
            <button
              onClick={() => setCompareOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-purple-300 dark:border-purple-600 rounded-lg text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              <Scale size={13} /> Müqayisə ({selected.size})
            </button>
          )}
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download size={13} /> Excel
          </button>
          {canCreate && (
            <button
              onClick={() => setModal({ open: true, editing: null })}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shrink-0"
            >
              <Plus size={14} /> Yeni texnika
            </button>
          )}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="flex gap-2 mb-3 shrink-0 overflow-x-auto scrollbar-none">
        {STAT_CARDS.map(s => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => setQuickFilter(s.id)}
              className={clsx(
                'rounded-xl border px-3 py-2 text-left transition-colors shrink-0 min-w-[100px]',
                quickFilter === s.id
                  ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-700'
              )}
            >
              <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Icon size={10} className={s.color} />
                {s.label}
              </p>
              <p className={clsx('text-lg font-bold mt-0.5', s.color)}>{stats[s.id] ?? 0}</p>
            </button>
          )
        })}
      </div>

      {/* ── Search + Filter popover ── */}
      <div className="flex gap-2 mb-3 shrink-0">
        <div className="relative flex-1 min-w-0">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, marka, kod, seriya, yer..."
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(p => !p)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs border rounded-lg transition-colors',
              activeFilterCount > 0
                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
          >
            <SlidersHorizontal size={13} />
            Filtrlər
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 flex items-center justify-center rounded-full bg-amber-600 text-white text-[9px] font-bold">{activeFilterCount}</span>
            )}
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-30 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 max-h-[70vh] overflow-y-auto space-y-3">
              {/* Status */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">Hamısı</option>
                  {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              {/* Mülkiyyət */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Mülkiyyət</label>
                <select value={ownershipFilter} onChange={(e) => setOwnershipFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">Hamısı</option>
                  {Object.entries(OWN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {/* Növ + Brend yan-yana */}
              <div className="grid grid-cols-2 gap-2">
                {uniqueTypes.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Növ</label>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500">
                      <option value="">Hamısı</option>
                      {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
                {uniqueBrands.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Brend</label>
                    <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500">
                      <option value="">Hamısı</option>
                      {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {/* Saxlanma yeri */}
              {uniqueLocations.length > 0 && (
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Saxlanma yeri</label>
                  <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="">Hamısı</option>
                    {uniqueLocations.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}
              {/* Qiymət aralığı */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Alış qiyməti (₼)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="Min" min="0"
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  <input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="Max" min="0"
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
              </div>
              {/* İstehsal ili aralığı */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">İstehsal ili</label>
                <div className="grid grid-cols-2 gap-2">
                  <select value={yearMin} onChange={(e) => setYearMin(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="">Min</option>
                    {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select value={yearMax} onChange={(e) => setYearMax(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="">Max</option>
                    {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              {/* Moto saatlar aralığı */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Moto saatlar</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={motoMin} onChange={(e) => setMotoMin(e.target.value)}
                    placeholder="Min" min="0"
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  <input type="number" value={motoMax} onChange={(e) => setMotoMax(e.target.value)}
                    placeholder="Max" min="0"
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
              </div>
              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                {activeFilterCount > 0 ? (
                  <button onClick={clearFilters}
                    className="text-[11px] text-red-500 hover:text-red-600 font-medium transition-colors">
                    Filtrləri təmizlə
                  </button>
                ) : <span />}
                <button onClick={() => setFilterOpen(false)}
                  className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold transition-colors">
                  Bağla
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk action toolbar */}
      {(canDelete || canEdit) && selected.size > 0 && viewMode === 'table' && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl mb-3 shrink-0">
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            {selected.size} element seçildi
          </span>
          <div className="flex-1" />
          {canEdit && (
            <button
              onClick={() => setBulkStatusModal(true)}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
            >
              <RefreshCw size={13} /> Status dəyiş ({selected.size})
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
            >
              {bulkLoading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 size={13} />}
              Seçilənləri sil ({selected.size})
            </button>
          )}
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            Ləğv et
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {viewMode === 'grid' ? (
        /* ── Grid View ── */
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 h-64 animate-pulse">
                  <div className="h-36 bg-gray-100 dark:bg-gray-700" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Truck size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Texnika tapılmadı</p>
                <p className="text-xs text-gray-400 mt-1">Axtarış şərtlərini dəyişin və ya yeni texnika əlavə edin</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-4">
              {sorted.map(item => (
                <EquipmentCard
                  key={item.id}
                  item={item}
                  firstImage={firstImg(item)}
                  onOpen={setSlideOver}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onStatusChange={(item) => setStatusModal(item)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Table View ── */
        <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <TH className="w-10">
                    <input type="checkbox" checked={selected.size === paged.length && paged.length > 0}
                      onChange={toggleAll}
                      className="rounded border-gray-300 text-amber-500 focus:ring-amber-500 focus:ring-1" />
                  </TH>
                  {isColVisible('name') && <TH field="name">Texnika</TH>}
                  {isColVisible('type') && <TH field="type">Növ</TH>}
                  {isColVisible('brand') && <TH field="brand">Brend / Model</TH>}
                  {isColVisible('motoHours') && <TH field="motoHours">Moto saat</TH>}
                  {isColVisible('status') && <TH>Status</TH>}
                  {isColVisible('ownership') && <TH>Mülkiyyət</TH>}
                  {isColVisible('inspection') && <TH field="lastInspectionDate">Son baxış</TH>}
                  <TH className="text-center w-20">Əməliyyat</TH>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <TableSkeleton cols={visibleCols.length + 2} rows={7} />
                ) : paged.length === 0 ? (
                  <EmptyState
                    icon={Truck}
                    title="Texnika tapılmadı"
                    description="Axtarış şərtlərini dəyişin və ya yeni texnika əlavə edin"
                    action={canCreate ? () => setModal({ open: true, editing: null }) : undefined}
                    actionLabel={canCreate ? 'Yeni Texnika' : undefined}
                  />
                ) : (
                  paged.flatMap((item) => {
                    const isExp = expanded.has(item.id)
                    const isSel = selected.has(item.id)
                    const status = STATUS_CFG[item.status] || STATUS_CFG.AVAILABLE
                    const firstImage = firstImg(item)

                    const mainRow = (
                      <tr
                        key={item.id}
                        className={clsx(
                          'border-b border-gray-100 dark:border-gray-700 transition-colors',
                          isExp ? 'bg-amber-50/40 dark:bg-amber-900/5' : 'hover:bg-gray-50/70 dark:hover:bg-gray-700/30',
                          isSel && !isExp && 'bg-amber-50/60 dark:bg-amber-900/10'
                        )}
                      >
                        <td className="py-2 px-3 align-middle w-10" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={isSel} onChange={() => toggleSelect(item.id)}
                            className="rounded border-gray-300 text-amber-500 focus:ring-amber-500 focus:ring-1" />
                        </td>
                        {isColVisible('name') && (
                          <td className="py-2 px-3 cursor-pointer align-middle" onClick={() => toggleExpand(item.id)}>
                            <div className="flex items-center gap-2">
                              <span className="shrink-0 text-gray-300 dark:text-gray-600">
                                {isExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                              </span>
                              <div className="w-9 h-7 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0 flex items-center justify-center">
                                {firstImage
                                  ? <AuthImage equipmentId={item.id} imageId={firstImage.id} alt="" className="w-full h-full object-cover" />
                                  : <Truck size={12} className="text-gray-300 dark:text-gray-600" />
                                }
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">{item.name}</p>
                                <p className="text-[10px] text-gray-400 font-mono leading-tight">{item.equipmentCode}</p>
                              </div>
                            </div>
                          </td>
                        )}
                        {isColVisible('type') && (
                          <td className="py-2 px-3 align-middle">
                            <span className="text-gray-600 dark:text-gray-300 truncate block">{item.type || '—'}</span>
                          </td>
                        )}
                        {isColVisible('brand') && (
                          <td className="py-2 px-3 align-middle">
                            <p className="font-medium text-gray-700 dark:text-gray-200 truncate">{item.brand || '—'}</p>
                            <p className="text-[10px] text-gray-400 truncate">{item.model || ''}</p>
                          </td>
                        )}
                        {isColVisible('motoHours') && (
                          <td className="py-2 px-3 align-middle">
                            <span className="text-gray-600 dark:text-gray-300 tabular-nums">{item.motoHours != null ? `${Number(item.motoHours).toLocaleString()} s` : '—'}</span>
                          </td>
                        )}
                        {isColVisible('status') && (
                          <td className="py-2 px-3 align-middle" onClick={e => e.stopPropagation()}>
                            {canEdit ? (
                              <button
                                onClick={() => setStatusModal(item)}
                                className={clsx('px-2 py-0.5 rounded text-[9px] font-semibold border cursor-pointer hover:ring-2 hover:ring-amber-300 dark:hover:ring-amber-600 transition-all', status.cls)}
                                title="Status dəyişdir"
                              >
                                {status.label}
                              </button>
                            ) : (
                              <span className={clsx('px-2 py-0.5 rounded text-[9px] font-semibold border block w-fit', status.cls)}>
                                {status.label}
                              </span>
                            )}
                          </td>
                        )}
                        {isColVisible('ownership') && (
                          <td className="py-2 px-3 align-middle">
                            <p className="font-medium text-gray-700 dark:text-gray-200 text-[11px]">{OWN_LABEL[item.ownershipType] || '—'}</p>
                            {item.ownerContractorName && <p className="text-[10px] text-gray-400 truncate">{item.ownerContractorName}</p>}
                            {item.ownerInvestorName && <p className="text-[10px] text-gray-400 truncate">{item.ownerInvestorName}</p>}
                          </td>
                        )}
                        {isColVisible('inspection') && (
                          <td className="py-2 px-3 align-middle">
                            <p className="text-gray-600 dark:text-gray-300 text-[11px]">{fmtDate(item.lastInspectionDate)}</p>
                            {item.nextInspectionDate && <p className="text-[10px] text-amber-500">{fmtDate(item.nextInspectionDate)}</p>}
                          </td>
                        )}
                        <td className="py-2 px-2 align-middle" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-0.5">
                            <button onClick={() => setSlideOver(item)} title="Ətraflı"
                              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors">
                              <Eye size={14} />
                            </button>
                            {canCreate && (
                              <button onClick={() => openClone(item)} title="Kopyala"
                                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-purple-500 transition-colors">
                                <Copy size={13} />
                              </button>
                            )}
                            {canEdit && (
                              <button onClick={() => openEdit(item)} title="Redaktə"
                                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors">
                                <Pencil size={13} />
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => handleDelete(item)} title="Sil"
                                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )

                    return isExp
                      ? [mainRow, <ExpandedRow key={`exp-${item.id}`} item={item} />]
                      : [mainRow]
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {!loading && sorted.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
              <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                <span>{sorted.length} nəticədən {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)}</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-1.5 py-0.5 text-[11px] border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
                >
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / səhifə</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={safePage === 1}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (safePage <= 3) {
                    pageNum = i + 1
                  } else if (safePage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = safePage - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={clsx(
                        'w-7 h-7 rounded text-[11px] font-medium transition-colors',
                        safePage === pageNum
                          ? 'bg-amber-600 text-white'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={safePage === totalPages}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {modal.open && (
        <EquipmentModal
          editing={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => { setModal({ open: false, editing: null }); load() }}
        />
      )}
      {slideOver && (
        <EquipmentSlideOver
          equipment={slideOver}
          onClose={() => setSlideOver(null)}
          onEdit={() => openEdit(slideOver)}
          onClone={canCreate ? () => openClone(slideOver) : undefined}
        />
      )}
      {statusModal && (
        <StatusChangeModal
          item={statusModal}
          onClose={() => setStatusModal(null)}
          onConfirm={handleStatusChange}
        />
      )}
      {bulkStatusModal && (
        <StatusChangeModal
          item={{ status: 'AVAILABLE', name: `${selected.size} texnika` }}
          onClose={() => setBulkStatusModal(false)}
          onConfirm={handleBulkStatusChange}
          bulkMode
        />
      )}
      {compareOpen && (
        <CompareModal
          items={equipment.filter(e => selected.has(e.id))}
          onClose={() => setCompareOpen(false)}
        />
      )}
      <ConfirmDialog />
    </div>
  )
}
