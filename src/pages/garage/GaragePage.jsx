import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight,
  FileText, Image as ImageIcon, Truck, Download, LayoutGrid, List,
  ChevronUp, Wrench, CheckCircle, AlertTriangle, XCircle, Eye,
  ChevronsLeft, ChevronsRight, ChevronLeft, RefreshCw, SlidersHorizontal,
  Copy, X, Scale, CalendarClock, Save, Bookmark,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useSearchParams } from 'react-router-dom'
import { garageApi } from '../../api/garage'
import { contractorsApi } from '../../api/contractors'
import { investorsApi } from '../../api/investors'
import { configApi } from '../../api/config'
import { useAuthStore } from '../../store/authStore'
import { useColumnStore, COLUMN_LABELS } from '../../store/columnStore'
import EquipmentModal from './EquipmentModal'
import EquipmentSlideOver, { AuthImage } from './EquipmentSlideOver'
import StatusChangeModal from './StatusChangeModal'
import CompareModal from './CompareModal'
import BulkEditModal from './BulkEditModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useConfirm } from '../../components/common/ConfirmDialog'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'
import { STATUS_CFG, OWN_LABEL, fmtMoney, fmtDate, dash, INSPECTION_THRESHOLDS } from '../../constants/garage'
import { useGarageWebSocket } from '../../hooks/useGarageWebSocket'

const PAGE_SIZES = [15, 25, 50, 100]

const STAT_CARDS = [
  { id: 'ALL',            label: 'Cəmi',              icon: Truck,         tone: 'graphite' },
  { id: 'AVAILABLE',      label: 'Mövcud',            icon: CheckCircle,   tone: 'ok' },
  { id: 'RENTED',         label: 'İcarədə',           icon: Wrench,        tone: 'info' },
  { id: 'IN_TRANSIT',     label: 'Yolda',             icon: Truck,         tone: 'warn' },
  { id: 'IN_INSPECTION',  label: 'Servisdədir',        icon: Search,        tone: 'gold' },
  { id: 'UNDER_CHECK',    label: 'Baxışda',           icon: Eye,           tone: 'violet' },
  { id: 'IN_REPAIR',      label: 'Təmirdə',           icon: Wrench,        tone: 'warn' },
  { id: 'DEFECTIVE',      label: 'Nasaz',             icon: AlertTriangle, tone: 'danger' },
  { id: 'OUT_OF_SERVICE', label: 'Xidmətdən kənarda', icon: XCircle,       tone: 'mute' },
]

const TONE_CLS = {
  graphite: 'bg-[var(--ces-graphite-50)] text-[var(--ces-graphite)]',
  ok:       'bg-[var(--ces-ok-100)] text-[var(--ces-ok)]',
  info:     'bg-[var(--ces-info-100)] text-[var(--ces-info)]',
  warn:     'bg-[var(--ces-warn-100)] text-[var(--ces-warn)]',
  gold:     'bg-[var(--ces-gold-100)] text-[var(--ces-gold-700)]',
  violet:   'bg-[#ece4ff] text-[#5e3bbf]',
  danger:   'bg-[var(--ces-danger-100)] text-[var(--ces-danger)]',
  mute:     'bg-[var(--ces-graphite-100)] text-[var(--ces-muted)]',
}

/* Cədvəl indi sabit qruplara bölünür — sütun toggle yoxdur,
   hər qrup özündə bir neçə key:value satrı saxlayır. */

function KV({ k, v, mono, bold, gold, accent }) {
  return (
    <div className="flex items-baseline gap-2 text-[11.5px] leading-[1.35]">
      <span className="text-[var(--ces-muted)] font-medium shrink-0">{k}:</span>
      <span className={clsx(
        'truncate',
        bold ? 'font-bold' : 'font-semibold',
        gold ? 'text-[var(--ces-gold-700)]' : accent || 'text-[var(--ces-ink)]',
        mono && 'font-mono tabular-nums'
      )}>{v ?? '—'}</span>
    </div>
  )
}

/* ─── Genişləndirilmiş sıra (extra sahələr) ──────────────────────────────── */
function ExpandedRow({ item, colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} className="border-b border-[var(--ces-line-2)] bg-[var(--ces-gold-50)] p-0">
        <div className="px-8 py-5 grid grid-cols-12 gap-4">
          <Block title="Maliyyə detalları" className="col-span-4">
            <div className="space-y-1.5">
              <KV k="Alınma tarixi"     v={fmtDate(item.purchaseDate)} mono />
              <KV k="Alış qiyməti"      v={fmtMoney(item.purchasePrice)} mono />
              <KV k="Bazar dəyəri"      v={fmtMoney(item.currentMarketValue)} mono />
              <KV k="Amortizasiya"      v={item.depreciationRate != null ? `${item.depreciationRate}%` : '—'} mono />
              <KV k="Saat / KM"         v={dash(item.hourKmCounter)} mono />
              <KV k="Seriya №"          v={dash(item.serialNumber)} mono />
            </div>
          </Block>

          <Block title="Mülkiyyət məlumatları" className="col-span-4">
            {item.ownershipType === 'INVESTOR' && (
              <div className="space-y-1.5">
                <KV k="Tip"       v="İnvestor" gold />
                <KV k="Ad, soyad" v={dash(item.ownerInvestorName)} />
                <KV k="VÖEN"      v={dash(item.ownerInvestorVoen)} mono />
                <KV k="Telefon"   v={dash(item.ownerInvestorPhone)} mono />
              </div>
            )}
            {item.ownershipType === 'CONTRACTOR' && (
              <div className="space-y-1.5">
                <KV k="Tip"       v="Podratçı" gold />
                <KV k="Şirkət"    v={dash(item.ownerContractorName)} />
                <KV k="VÖEN"      v={dash(item.ownerContractorVoen)} mono />
                <KV k="Telefon"   v={dash(item.ownerContractorPhone)} mono />
                <KV k="Əlaqədar"  v={dash(item.ownerContractorContact)} />
              </div>
            )}
            {item.ownershipType === 'COMPANY' && (
              <div className="space-y-1.5">
                <KV k="Tip" v="Şirkət" gold />
                <p className="text-[11.5px] text-[var(--ces-muted)] italic mt-1">Şirkətin öz texnikasıdır</p>
              </div>
            )}
          </Block>

          <Block title="Əlavə" className="col-span-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 text-[11.5px] font-semibold text-[var(--ces-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <FileText size={12} className="text-[var(--ces-gold-700)]" />
                  <span className="text-[var(--ces-ink)] font-bold tabular-nums">{item.documents?.length ?? 0}</span> sənəd
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ImageIcon size={12} className="text-[var(--ces-gold-700)]" />
                  <span className="text-[var(--ces-ink)] font-bold tabular-nums">{item.images?.length ?? 0}</span> şəkil
                </span>
              </div>
              {item.notes ? (
                <div className="mt-2 pt-2 border-t border-dashed border-[var(--ces-line)]">
                  <p className="text-[10px] tracking-[0.12em] uppercase font-bold text-[var(--ces-muted)] mb-1">Qeyd</p>
                  <p className="text-[11.5px] text-[var(--ces-ink)] leading-relaxed">{item.notes}</p>
                </div>
              ) : (
                <p className="text-[11.5px] text-[var(--ces-muted)] italic mt-1">Qeyd yoxdur</p>
              )}
            </div>
          </Block>
        </div>
      </td>
    </tr>
  )
}

function Block({ title, children, className }) {
  return (
    <div className={clsx('bg-white rounded-[12px] border border-[var(--ces-line)] p-3.5', className)}>
      <p className="text-[10px] font-bold text-[var(--ces-gold-700)] uppercase tracking-[0.16em] mb-3">{title}</p>
      {children}
    </div>
  )
}

/* ─── Equipment Card (grid view) ─────────────────────────────────────────── */
function EquipmentCard({ item, firstImage, onOpen, onEdit, onDelete, canEdit, canDelete, onStatusChange }) {
  const status = STATUS_CFG[item.status] || STATUS_CFG.AVAILABLE
  return (
    <div
      onClick={() => onOpen(item)}
      className="bg-[var(--ces-surface)] rounded-[16px] border border-[var(--ces-line)] overflow-hidden hover:shadow-[0_8px_24px_-12px_rgba(58,58,58,0.18)] hover:border-[var(--ces-gold-100)] hover:-translate-y-[1px] transition-all cursor-pointer group"
    >
      <div className="h-36 bg-[var(--ces-graphite-50)] flex items-center justify-center overflow-hidden">
        {firstImage
          ? <AuthImage equipmentId={item.id} imageId={firstImage.id} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          : <Truck size={32} className="text-[var(--ces-mute2)]" />
        }
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--ces-ink)] truncate">{item.name}</p>
            <p className="text-[10.5px] font-mono text-[var(--ces-muted)] mt-0.5">{item.equipmentCode}</p>
          </div>
          <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0', status.cls)}>
            <span className="w-1 h-1 rounded-full bg-current" />
            {status.label}
          </span>
        </div>
        <div className="space-y-0.5 text-[11.5px] text-[var(--ces-muted)] font-medium">
          {item.brand && <p>{item.brand} {item.model || ''}</p>}
          {item.type && <p className="text-[var(--ces-mute2)]">{item.type}</p>}
        </div>
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--ces-line)]">
          <div className="flex items-center gap-2 text-[10.5px] font-semibold text-[var(--ces-muted)]">
            <span>{OWN_LABEL[item.ownershipType] || '—'}</span>
            <span>·</span>
            <span className="flex items-center gap-0.5"><FileText size={9} />{item.documents?.length ?? 0}</span>
            <span className="flex items-center gap-0.5"><ImageIcon size={9} />{item.images?.length ?? 0}</span>
          </div>
          <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
            {canEdit && (
              <button onClick={() => onEdit(item)} className="w-7 h-7 grid place-items-center rounded-[6px] text-[var(--ces-muted)] hover:bg-[var(--ces-gold-100)] hover:text-[var(--ces-gold-700)] transition-colors" title="Redaktə">
                <Pencil size={12} />
              </button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(item)} className="w-7 h-7 grid place-items-center rounded-[6px] text-[var(--ces-muted)] hover:bg-[var(--ces-danger-100)] hover:text-[var(--ces-danger)] transition-colors" title="Sil">
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
  if (sortField !== field) return <ChevronUp size={11} className="text-[var(--ces-mute2)] opacity-50" />
  return sortDir === 'asc'
    ? <ChevronUp size={11} className="text-[var(--ces-gold)]" />
    : <ChevronDown size={11} className="text-[var(--ces-gold)]" />
}

/* ─── GaragePage ──────────────────────────────────────────────────────────── */
export default function GaragePage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('GARAGE', 'canPost')
  const canEdit   = hasPermission('GARAGE', 'canPut')
  const canDelete = hasPermission('GARAGE', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const isVisible = useColumnStore(s => s.isVisible)
  const isColVisible = (key) =>
    Object.prototype.hasOwnProperty.call(COLUMN_LABELS.garage || {}, key)
      ? isVisible('garage', key)
      : true

  const TOGGLEABLE_COL_KEYS = ['name', 'code', 'type', 'brand', 'model', 'motoHours', 'status', 'ownership', 'storageLocation', 'lastInspection', 'nextInspection']
  const visibleColCount = 2 + TOGGLEABLE_COL_KEYS.filter(isColVisible).length

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

  const [compareOpen, setCompareOpen] = useState(false)

  const [searchParams, setSearchParams] = useSearchParams()

  usePageShortcuts({
    onNew: canCreate ? () => setModal({ open: true, editing: null }) : undefined,
    searchRef,
  })

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

  useEffect(() => {
    if (!filterOpen) return
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen])

  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [allEquipment, setAllEquipment] = useState([])

  const [contractors, setContractors] = useState([])
  const [investors, setInvestors] = useState([])
  const [safetyTypes, setSafetyTypes] = useState([])

  useEffect(() => {
    contractorsApi.getAll().then(r => setContractors(r.data.data || r.data || [])).catch(() => {})
    investorsApi.getAll().then(r => setInvestors(r.data.data || r.data || [])).catch(() => {})
    configApi.getActiveByCategory('SAFETY_EQUIPMENT').then(r => setSafetyTypes(r.data.data || [])).catch(() => {})
  }, [])

  const [presets, setPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('garage_filter_presets')) || [] } catch { return [] }
  })

  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [inspectionPopoverOpen, setInspectionPopoverOpen] = useState(false)

  const loadStats = useCallback(async () => {
    try {
      const res = await garageApi.getAll()
      const data = res.data.data || res.data || []
      setAllEquipment(data)
    } catch { /* silent */ }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const effectiveStatus = quickFilter !== 'ALL' ? quickFilter : (statusFilter || undefined)
      const params = {
        page: page - 1,
        size: pageSize,
        sortBy: sortField,
        sortDir,
        search: search || undefined,
        status: effectiveStatus,
        ownershipType: ownershipFilter || undefined,
        type: typeFilter || undefined,
        brand: brandFilter || undefined,
        location: locationFilter || undefined,
        priceMin: priceMin || undefined,
        priceMax: priceMax || undefined,
        yearMin: yearMin || undefined,
        yearMax: yearMax || undefined,
        motoMin: motoMin || undefined,
        motoMax: motoMax || undefined,
      }
      const res = await garageApi.getAllPaged(params)
      const paged = res.data.data || res.data
      setEquipment(paged.content || [])
      setTotalElements(paged.totalElements || 0)
      setTotalPages(paged.totalPages || 1)
      setSelected(new Set())
      setSlideOver(prev => prev ? ((paged.content || []).find(e => e.id === prev.id) ?? prev) : null)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [page, pageSize, sortField, sortDir, search, statusFilter, ownershipFilter, typeFilter, locationFilter, brandFilter, quickFilter, priceMin, priceMax, yearMin, yearMax, motoMin, motoMax])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadStats() }, [loadStats])

  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId) return
    garageApi.getById(Number(openId))
      .then(res => setSlideOver(res.data.data || res.data))
      .catch(() => {})
    setSearchParams(p => { const n = new URLSearchParams(p); n.delete('open'); return n }, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useGarageWebSocket(useCallback(() => {
    load()
    loadStats()
  }, [load, loadStats]))

  const uniqueTypes = useMemo(() => [...new Set(allEquipment.map(e => e.type).filter(Boolean))].sort(), [allEquipment])
  const uniqueLocations = useMemo(() => [...new Set(allEquipment.map(e => e.storageLocation).filter(Boolean))].sort(), [allEquipment])
  const uniqueBrands = useMemo(() => [...new Set(allEquipment.map(e => e.brand).filter(Boolean))].sort(), [allEquipment])
  const uniqueYears = useMemo(() => [...new Set(allEquipment.map(e => e.manufactureYear).filter(Boolean))].sort((a, b) => b - a), [allEquipment])

  const stats = useMemo(() => {
    const s = { ALL: allEquipment.length }
    Object.keys(STATUS_CFG).forEach(k => { s[k] = allEquipment.filter(e => e.status === k).length })
    return s
  }, [allEquipment])

  const miniStats = useMemo(() => {
    if (!allEquipment.length) return null
    const totalValue = allEquipment.reduce((s, e) => s + (Number(e.currentMarketValue) || 0), 0)
    const motoArr = allEquipment.map(e => Number(e.motoHours) || 0).filter(Boolean)
    const avgMoto = motoArr.length ? Math.round(motoArr.reduce((a, b) => a + b, 0) / motoArr.length) : 0
    return { totalValue, avgMoto }
  }, [allEquipment])

  const inspectionWarnings = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return allEquipment.filter(e => {
      if (!e.nextInspectionDate) return false
      const next = new Date(e.nextInspectionDate); next.setHours(0, 0, 0, 0)
      const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
      return diff <= INSPECTION_THRESHOLDS.URGENT
    })
  }, [allEquipment])

  const handleSort = (field) => {
    setSortDir(prev => sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'asc')
    setSortField(field)
  }

  const paged = equipment
  const sorted = equipment
  const safePage = page

  useEffect(() => { setPage(1) }, [search, statusFilter, ownershipFilter, typeFilter, locationFilter, brandFilter, quickFilter, priceMin, priceMax, yearMin, yearMax, motoMin, motoMax, pageSize])

  const savePreset = () => {
    const name = prompt('Filter preset adı:')
    if (!name?.trim()) return
    const preset = {
      name: name.trim(),
      filters: { search, statusFilter, ownershipFilter, typeFilter, locationFilter, brandFilter, priceMin, priceMax, yearMin, yearMax, motoMin, motoMax },
    }
    const updated = [...presets.filter(p => p.name !== preset.name), preset]
    setPresets(updated)
    localStorage.setItem('garage_filter_presets', JSON.stringify(updated))
    toast.success(`"${name}" preset saxlandı`)
  }

  const loadPreset = (preset) => {
    const f = preset.filters
    setSearch(f.search || '')
    setStatusFilter(f.statusFilter || '')
    setOwnershipFilter(f.ownershipFilter || '')
    setTypeFilter(f.typeFilter || '')
    setLocationFilter(f.locationFilter || '')
    setBrandFilter(f.brandFilter || '')
    setPriceMin(f.priceMin || '')
    setPriceMax(f.priceMax || '')
    setYearMin(f.yearMin || '')
    setYearMax(f.yearMax || '')
    setMotoMin(f.motoMin || '')
    setMotoMax(f.motoMax || '')
    toast.success(`"${preset.name}" tətbiq edildi`)
  }

  const deletePreset = (name) => {
    const updated = presets.filter(p => p.name !== name)
    setPresets(updated)
    localStorage.setItem('garage_filter_presets', JSON.stringify(updated))
  }

  const toggleExpand = (id) => setExpanded(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })
  const toggleSelect = (id) => setSelected(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })
  const toggleAll = () =>
    setSelected(selected.size === paged.length ? new Set() : new Set(paged.map(e => e.id)))

  const handleDelete = async (item) => {
    if (!(await confirm({ title: 'Texnikanı sil', message: `"${item.name}" silmək istəyirsiniz?` }))) return
    try {
      await garageApi.delete(item.id)
      toast.success('Texnika silindi')
      if (slideOver?.id === item.id) setSlideOver(null)
      load()
    } catch (err) { if (err?.isPending) return }
  }

  const handleBulkDelete = async () => {
    if (!(await confirm({ title: 'Toplu silmə', message: `${selected.size} texnika silinsin?`, confirmText: 'Sil' }))) return
    setBulkLoading(true)
    let ok = 0, pending = 0, fail = 0
    for (const id of [...selected]) {
      try {
        await garageApi.delete(id)
        ok++
      } catch (err) {
        if (err?.isPending) pending++
        else fail++
      }
    }
    setBulkLoading(false)
    if (ok) toast.success(`${ok} texnika silindi`)
    if (pending) toast.success(`${pending} texnikanın silinməsi təsdiq növbəsinə göndərildi`)
    if (fail) toast.error(`${fail} texnika silinmədi`)
    setSelected(new Set())
    load()
  }

  const handleStatusChange = async (item, newStatus, reason) => {
    const prevEquipment = [...equipment]
    setEquipment(prev => prev.map(e => e.id === item.id ? { ...e, status: newStatus } : e))
    if (slideOver?.id === item.id) setSlideOver(prev => ({ ...prev, status: newStatus }))
    try {
      await garageApi.updateStatus(item.id, newStatus, reason)
      toast.success(`Status: ${STATUS_CFG[newStatus]?.label}`)
      load()
    } catch (err) {
      setEquipment(prevEquipment)
      if (slideOver?.id === item.id) setSlideOver(prev => ({ ...prev, status: item.status }))
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

  const exportExcel = async () => {
    const exportData = allEquipment
    if (totalElements > allEquipment.length) {
      toast('Bütün data yüklənir...', { icon: '⏳' })
    }
    const rows = exportData.map(e => ({
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
  const clearFilters = () => { setSearch(''); setStatusFilter(''); setOwnershipFilter(''); setTypeFilter(''); setLocationFilter(''); setBrandFilter(''); setPriceMin(''); setPriceMax(''); setYearMin(''); setYearMax(''); setMotoMin(''); setMotoMax(''); setFilterOpen(false) }

  /* ── TH component ── */
  const TH = ({ children, className, field, width }) => (
    <th
      onClick={field ? () => handleSort(field) : undefined}
      className={clsx(
        'sticky top-0 z-10 py-2.5 px-3 text-[10.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.12em] text-left whitespace-nowrap align-bottom',
        'bg-white border-b border-[var(--ces-line)]',
        field && 'cursor-pointer hover:text-[var(--ces-graphite)] select-none',
        width,
        className
      )}
    >
      <div className="flex items-center gap-0.5">
        {children}
        {field && <SortIcon field={field} sortField={sortField} sortDir={sortDir} />}
      </div>
    </th>
  )

  const selectCls = 'w-full px-3 py-2 text-[12.5px] bg-white border border-[var(--ces-line)] rounded-[10px] text-[var(--ces-ink)] focus:outline-none focus:border-[var(--ces-graphite)] focus:ring-[3px] focus:ring-[rgba(58,58,58,0.1)] transition-all cursor-pointer'
  const numInputCls = 'w-full px-3 py-2 text-[12.5px] bg-white border border-[var(--ces-line)] rounded-[10px] text-[var(--ces-ink)] placeholder-[var(--ces-mute2)] focus:outline-none focus:border-[var(--ces-graphite)] focus:ring-[3px] focus:ring-[rgba(58,58,58,0.1)] transition-all'

  return (
    <div className="ces-font flex flex-col h-full" style={{ height: 'calc(100vh - 80px)' }}>

      {/* ── Top bar ── */}
      <div className="flex items-end justify-between mb-5 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-extrabold tracking-tight text-[var(--ces-ink)] leading-tight">Qaraj</h1>
            {inspectionWarnings.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setInspectionPopoverOpen(v => !v)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[var(--ces-danger-100)] text-[var(--ces-danger)] hover:bg-[#fad8e0] animate-pulse hover:animate-none transition-colors"
                >
                  <CalendarClock size={11} />
                  {inspectionWarnings.length} baxış yaxınlaşır
                </button>
                {inspectionPopoverOpen && (
                  <div className="absolute left-0 top-full mt-2 z-50 bg-white border border-[var(--ces-line)] rounded-[14px] shadow-[0_24px_48px_-20px_rgba(58,58,58,0.28),0_6px_14px_rgba(58,58,58,0.08)] w-80 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ces-line)]">
                      <span className="text-[12.5px] font-bold text-[var(--ces-ink)]">Yaxınlaşan baxışlar</span>
                      <button onClick={() => setInspectionPopoverOpen(false)} className="text-[var(--ces-muted)] hover:text-[var(--ces-graphite)]">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-[var(--ces-line-2)]">
                      {inspectionWarnings
                        .slice()
                        .sort((a, b) => new Date(a.nextInspectionDate) - new Date(b.nextInspectionDate))
                        .map(e => {
                          const today = new Date(); today.setHours(0,0,0,0)
                          const next = new Date(e.nextInspectionDate); next.setHours(0,0,0,0)
                          const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
                          const urgent = diff <= 0
                          return (
                            <button
                              key={e.id}
                              onClick={() => { setSlideOver(e); setInspectionPopoverOpen(false) }}
                              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[var(--ces-graphite-50)] text-left transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="text-[12.5px] font-bold text-[var(--ces-ink)] truncate">{e.name}</p>
                                <p className="text-[10.5px] text-[var(--ces-muted)] font-mono mt-0.5">{e.equipmentCode}</p>
                              </div>
                              <span className={clsx(
                                'ml-2 shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold',
                                urgent
                                  ? 'bg-[var(--ces-danger-100)] text-[var(--ces-danger)]'
                                  : 'bg-[var(--ces-warn-100)] text-[var(--ces-warn)]'
                              )}>
                                {urgent ? 'Vaxtı keçib' : `${diff} gün`}
                              </span>
                            </button>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-[12px] text-[var(--ces-muted)] mt-1.5">
            <span><span className="font-semibold text-[var(--ces-ink)]">{allEquipment.length}</span> texnika · <span className="font-semibold text-[var(--ces-ink)]">{totalElements}</span> göstərilir</span>
            {miniStats && (
              <>
                <span>·</span>
                <span>Ümumi dəyər: <strong className="text-[var(--ces-ink)] font-bold tabular-nums">{Number(miniStats.totalValue).toLocaleString()} ₼</strong></span>
                {miniStats.avgMoto > 0 && (
                  <>
                    <span>·</span>
                    <span>Ort. moto: <strong className="text-[var(--ces-ink)] font-bold tabular-nums">{miniStats.avgMoto.toLocaleString()} s</strong></span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center bg-[var(--ces-graphite-50)] p-1 rounded-[10px]">
            <button
              onClick={() => setViewMode('table')}
              className={clsx('w-8 h-8 grid place-items-center rounded-[7px] transition-colors',
                viewMode === 'table' ? 'bg-white text-[var(--ces-graphite)] shadow-[0_1px_2px_rgba(58,58,58,0.06)]' : 'text-[var(--ces-muted)] hover:text-[var(--ces-graphite)]'
              )}
              title="Cədvəl"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={clsx('w-8 h-8 grid place-items-center rounded-[7px] transition-colors',
                viewMode === 'grid' ? 'bg-white text-[var(--ces-graphite)] shadow-[0_1px_2px_rgba(58,58,58,0.06)]' : 'text-[var(--ces-muted)] hover:text-[var(--ces-graphite)]'
              )}
              title="Kartlar"
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          {selected.size >= 2 && selected.size <= 5 && (
            <button
              onClick={() => setCompareOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-bold border border-[#d9c4ff] bg-[#ece4ff] text-[#5e3bbf] rounded-[10px] hover:bg-[#dfd0ff] transition-colors"
            >
              <Scale size={13} /> Müqayisə ({selected.size})
            </button>
          )}
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[var(--ces-graphite)] bg-white border border-[var(--ces-line)] rounded-[10px] hover:border-[var(--ces-graphite)] transition-colors"
          >
            <Download size={14} /> Excel
          </button>
          {canCreate && (
            <button
              onClick={() => setModal({ open: true, editing: null })}
              className="inline-flex items-center gap-2 bg-[var(--ces-gold)] hover:bg-[var(--ces-gold-700)] text-[var(--ces-on-gold)] text-sm font-semibold px-4 py-2.5 rounded-[10px] transition-colors shadow-[0_8px_24px_-12px_rgba(200,147,42,0.55)]"
            >
              <Plus size={16} /> Yeni texnika
            </button>
          )}
        </div>
      </div>

      {/* ── Stat cards (compact strip) ── */}
      <div className="flex gap-2.5 mb-4 shrink-0 overflow-x-auto scrollbar-none pb-1">
        {STAT_CARDS.map(s => {
          const Icon = s.icon
          const on = quickFilter === s.id
          return (
            <button
              key={s.id}
              onClick={() => setQuickFilter(s.id)}
              className={clsx(
                'rounded-[14px] border px-3.5 py-2.5 text-left transition-all shrink-0 min-w-[112px] bg-[var(--ces-surface)]',
                on
                  ? 'border-[var(--ces-graphite)] shadow-[0_8px_24px_-12px_rgba(58,58,58,0.18)] -translate-y-[1px]'
                  : 'border-[var(--ces-line)] hover:border-[var(--ces-graphite)]'
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={clsx('w-6 h-6 rounded-[7px] grid place-items-center', TONE_CLS[s.tone])}>
                  <Icon size={12} />
                </span>
                <span className="text-[10.5px] font-bold text-[var(--ces-muted)] uppercase tracking-[0.1em]">{s.label}</span>
              </div>
              <p className="text-[20px] font-extrabold tracking-tight leading-none text-[var(--ces-ink)] tabular-nums">{stats[s.id] ?? 0}</p>
            </button>
          )
        })}
      </div>

      {/* ── Search + Filter popover ── */}
      <div className="flex gap-2 mb-4 shrink-0">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ces-mute2)]" />
          <input
            ref={searchRef}
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, marka, kod, seriya, yer..."
            className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-[var(--ces-line)] rounded-[11px] text-[var(--ces-ink)] placeholder-[var(--ces-mute2)] focus:outline-none focus:border-[var(--ces-graphite)] focus:ring-[3px] focus:ring-[rgba(58,58,58,0.1)] transition-all"
          />
        </div>
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(p => !p)}
            className={clsx(
              'inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-[11px] transition-colors',
              activeFilterCount > 0
                ? 'bg-[var(--ces-gold)] text-[var(--ces-on-gold)] hover:bg-[var(--ces-gold-700)]'
                : 'bg-white text-[var(--ces-graphite)] border border-[var(--ces-line)] hover:border-[var(--ces-graphite)]'
            )}
          >
            <SlidersHorizontal size={14} />
            Filtrlər
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 grid place-items-center rounded-full bg-white text-[var(--ces-gold-700)] text-[10px] font-extrabold">{activeFilterCount}</span>
            )}
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full mt-2 z-30 w-96 bg-white border border-[var(--ces-line)] rounded-[14px] shadow-[0_24px_48px_-20px_rgba(58,58,58,0.28),0_6px_14px_rgba(58,58,58,0.08)] p-5 max-h-[75vh] overflow-y-auto space-y-4">
              <div>
                <label className="block text-[11px] tracking-[0.14em] uppercase font-bold text-[var(--ces-muted)] mb-1.5">Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
                  <option value="">Hamısı</option>
                  {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] tracking-[0.14em] uppercase font-bold text-[var(--ces-muted)] mb-1.5">Mülkiyyət</label>
                <select value={ownershipFilter} onChange={(e) => setOwnershipFilter(e.target.value)} className={selectCls}>
                  <option value="">Hamısı</option>
                  {Object.entries(OWN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {uniqueTypes.length > 0 && (
                  <div>
                    <label className="block text-[11px] tracking-[0.14em] uppercase font-bold text-[var(--ces-muted)] mb-1.5">Növ</label>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectCls}>
                      <option value="">Hamısı</option>
                      {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
                {uniqueBrands.length > 0 && (
                  <div>
                    <label className="block text-[11px] tracking-[0.14em] uppercase font-bold text-[var(--ces-muted)] mb-1.5">Brend</label>
                    <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className={selectCls}>
                      <option value="">Hamısı</option>
                      {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {uniqueLocations.length > 0 && (
                <div>
                  <label className="block text-[11px] tracking-[0.14em] uppercase font-bold text-[var(--ces-muted)] mb-1.5">Saxlanma yeri</label>
                  <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className={selectCls}>
                    <option value="">Hamısı</option>
                    {uniqueLocations.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[11px] tracking-[0.14em] uppercase font-bold text-[var(--ces-muted)] mb-1.5">Alış qiyməti (₼)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="Min" min="0" className={numInputCls} />
                  <input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="Max" min="0" className={numInputCls} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] tracking-[0.14em] uppercase font-bold text-[var(--ces-muted)] mb-1.5">İstehsal ili</label>
                <div className="grid grid-cols-2 gap-2">
                  <select value={yearMin}
                    onChange={(e) => { const val = e.target.value; setYearMin(val); if (yearMax && val && Number(val) > Number(yearMax)) setYearMax('') }}
                    className={selectCls}>
                    <option value="">Min</option>
                    {uniqueYears.filter(y => !yearMax || y <= Number(yearMax)).map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select value={yearMax}
                    onChange={(e) => { const val = e.target.value; setYearMax(val); if (yearMin && val && Number(val) < Number(yearMin)) setYearMin('') }}
                    className={selectCls}>
                    <option value="">Max</option>
                    {uniqueYears.filter(y => !yearMin || y >= Number(yearMin)).map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] tracking-[0.14em] uppercase font-bold text-[var(--ces-muted)] mb-1.5">Moto saatlar</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={motoMin} onChange={(e) => setMotoMin(e.target.value)} placeholder="Min" min="0" className={numInputCls} />
                  <input type="number" value={motoMax} onChange={(e) => setMotoMax(e.target.value)} placeholder="Max" min="0" className={numInputCls} />
                </div>
              </div>
              {presets.length > 0 && (
                <div>
                  <label className="block text-[11px] tracking-[0.14em] uppercase font-bold text-[var(--ces-muted)] mb-1.5">Saxlanmış filtrlər</label>
                  <div className="space-y-1">
                    {presets.map(p => (
                      <div key={p.name} className="flex items-center gap-1">
                        <button
                          onClick={() => loadPreset(p)}
                          className="flex-1 text-left px-2.5 py-1.5 text-[12.5px] rounded-[8px] hover:bg-[var(--ces-gold-50)] text-[var(--ces-ink)] font-semibold transition-colors"
                        >
                          <Bookmark size={11} className="inline mr-1 text-[var(--ces-gold)]" />{p.name}
                        </button>
                        <button onClick={() => deletePreset(p.name)} className="p-1 text-[var(--ces-muted)] hover:text-[var(--ces-danger)] transition-colors">
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--ces-line)]">
                <div className="flex items-center gap-3">
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters}
                      className="text-[12px] text-[var(--ces-danger)] hover:text-[#b62b4a] font-bold transition-colors">
                      Filtrləri təmizlə
                    </button>
                  )}
                  {activeFilterCount > 0 && (
                    <button onClick={savePreset}
                      className="inline-flex items-center gap-1 text-[12px] text-[var(--ces-info)] hover:text-[#1d4fa8] font-bold transition-colors">
                      <Save size={11} /> Preset saxla
                    </button>
                  )}
                </div>
                <button onClick={() => setFilterOpen(false)}
                  className="text-[12px] text-[var(--ces-graphite)] hover:text-[var(--ces-ink)] font-bold transition-colors">
                  Bağla
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk action toolbar */}
      {(canDelete || canEdit) && selected.size > 0 && viewMode === 'table' && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[var(--ces-gold-50)] border border-[var(--ces-gold-100)] rounded-[14px] mb-4 shrink-0">
          <span className="text-sm font-bold text-[var(--ces-gold-700)]">
            {selected.size} element seçildi
          </span>
          <div className="flex-1" />
          {canEdit && (
            <button
              onClick={() => setBulkStatusModal(true)}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--ces-gold)] hover:bg-[var(--ces-gold-700)] text-[var(--ces-on-gold)] text-xs font-bold rounded-[8px] transition-colors disabled:opacity-60"
            >
              <RefreshCw size={13} /> Status dəyiş ({selected.size})
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => setBulkEditOpen(true)}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--ces-info)] hover:bg-[#1d4fa8] text-white text-xs font-bold rounded-[8px] transition-colors disabled:opacity-60"
            >
              <Pencil size={13} /> Toplu redaktə ({selected.size})
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--ces-danger)] hover:bg-[#b62b4a] text-white text-xs font-bold rounded-[8px] transition-colors disabled:opacity-60"
            >
              {bulkLoading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 size={13} />}
              Sil ({selected.size})
            </button>
          )}
          <button onClick={() => setSelected(new Set())} className="text-xs font-semibold text-[var(--ces-muted)] hover:text-[var(--ces-graphite)]">
            Ləğv et
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {viewMode === 'grid' ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-[var(--ces-surface)] rounded-[16px] border border-[var(--ces-line)] h-64 animate-pulse">
                  <div className="h-36 bg-[var(--ces-graphite-100)]" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-[var(--ces-graphite-100)] rounded w-3/4" />
                    <div className="h-3 bg-[var(--ces-graphite-100)] rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center bg-[var(--ces-surface)] border border-[var(--ces-line)] rounded-[16px] p-12">
                <div className="w-16 h-16 rounded-[18px] bg-[var(--ces-gold-50)] grid place-items-center mx-auto mb-4 border border-[var(--ces-gold-100)]">
                  <Truck size={28} className="text-[var(--ces-gold-700)]" />
                </div>
                <h3 className="text-[17px] font-extrabold text-[var(--ces-ink)] tracking-tight">Texnika tapılmadı</h3>
                <p className="text-[13px] text-[var(--ces-muted)] mt-1.5">Axtarış şərtlərini dəyişin və ya yeni texnika əlavə edin</p>
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
        <div className="flex-1 min-h-0 flex flex-col rounded-[20px] border border-[var(--ces-line)] overflow-hidden bg-[var(--ces-surface)] shadow-[0_1px_2px_rgba(58,58,58,0.06),0_1px_1px_rgba(58,58,58,0.04)]">
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-[12.5px] table-fixed">
              <colgroup>
                <col style={{ width: '44px' }} />
                <col />
                <col />
                <col />
                <col />
                <col />
                <col />
                <col style={{ width: '110px' }} />
              </colgroup>
              <thead>
                <tr>
                  <TH className="px-2">
                    <input type="checkbox" checked={selected.size === paged.length && paged.length > 0}
                      onChange={toggleAll}
                      className="w-3.5 h-3.5 accent-[var(--ces-graphite)] cursor-pointer" />
                  </TH>
                  <TH field="name">Texnika</TH>
                  <TH>Texniki məlumat</TH>
                  <TH>İstismar</TH>
                  <TH>Status</TH>
                  <TH>Mülkiyyət</TH>
                  <TH>Texniki baxış</TH>
                  <TH className="text-center">Əməliyyat</TH>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <TableSkeleton cols={visibleColCount} rows={7} />
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

                    const ownerName = item.ownershipType === 'INVESTOR'
                      ? item.ownerInvestorName
                      : item.ownershipType === 'CONTRACTOR'
                        ? item.ownerContractorName
                        : null

                    const mainRow = (
                      <tr
                        key={item.id}
                        className={clsx(
                          'border-b border-[var(--ces-line-2)] transition-colors',
                          isExp
                            ? 'bg-[var(--ces-gold-50)]'
                            : isSel
                              ? 'bg-[var(--ces-gold-50)]/60'
                              : 'hover:bg-[var(--ces-graphite-50)]'
                        )}
                      >
                        {/* checkbox */}
                        <td className="py-3 px-2 align-top" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={isSel} onChange={() => toggleSelect(item.id)}
                            className="w-3.5 h-3.5 accent-[var(--ces-graphite)] cursor-pointer mt-1" />
                        </td>

                        {/* Texnika — thumbnail + ad + kod + status */}
                        <td className="py-3 px-3 align-top">
                          <div className="flex gap-3">
                            <div className="w-12 h-12 rounded-[8px] overflow-hidden bg-[var(--ces-graphite-50)] shrink-0 grid place-items-center">
                              {firstImage
                                ? <AuthImage equipmentId={item.id} imageId={firstImage.id} alt="" className="w-full h-full object-cover" />
                                : <Truck size={16} className="text-[var(--ces-mute2)]" />
                              }
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-[13.5px] text-[var(--ces-ink)] truncate leading-tight">{item.name}</p>
                              <p className="text-[11px] font-mono text-[var(--ces-muted)] truncate mt-0.5">{item.equipmentCode}</p>
                              {canEdit ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setStatusModal(item) }}
                                  className={clsx('mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold hover:ring-2 hover:ring-[rgba(58,58,58,0.15)] transition-all whitespace-nowrap', status.cls)}
                                >
                                  <span className="w-1 h-1 rounded-full bg-current" />
                                  {status.label}
                                </button>
                              ) : (
                                <span className={clsx('mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold whitespace-nowrap', status.cls)}>
                                  <span className="w-1 h-1 rounded-full bg-current" />
                                  {status.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Texniki məlumat — Növ, Brend, Model, İstehsal ili */}
                        <td className="py-3 px-3 align-top">
                          <div className="space-y-1">
                            <KV k="Növ"    v={dash(item.type)} />
                            <KV k="Brend"  v={dash(item.brand)} />
                            <KV k="Model"  v={dash(item.model)} />
                            <KV k="İl"     v={dash(item.manufactureYear)} mono />
                          </div>
                        </td>

                        {/* İstismar — Moto, Saat/KM, Saxlanma */}
                        <td className="py-3 px-3 align-top">
                          <div className="space-y-1">
                            <KV k="Moto"     v={item.motoHours != null ? `${Number(item.motoHours).toLocaleString()} s` : '—'} mono />
                            <KV k="Saat/KM"  v={dash(item.hourKmCounter)} mono />
                            <KV k="Saxlanma" v={dash(item.storageLocation)} />
                          </div>
                        </td>

                        {/* Status & Qiymət — Bazar dəyəri */}
                        <td className="py-3 px-3 align-top">
                          <div className="space-y-1">
                            <KV k="Alış"    v={fmtMoney(item.purchasePrice)} mono />
                            <KV k="Bazar"   v={fmtMoney(item.currentMarketValue)} mono gold />
                            <KV k="Amort."  v={item.depreciationRate != null ? `${item.depreciationRate}%` : '—'} mono />
                          </div>
                        </td>

                        {/* Mülkiyyət — Tip + Sahib */}
                        <td className="py-3 px-3 align-top">
                          <div className="space-y-1">
                            <KV k="Tip" v={OWN_LABEL[item.ownershipType] || '—'} gold />
                            {item.ownershipType === 'COMPANY' ? (
                              <p className="text-[11px] text-[var(--ces-muted)] italic">Şirkətin texnikası</p>
                            ) : (
                              <>
                                <KV k="Sahib" v={dash(ownerName)} />
                                <KV
                                  k="VÖEN"
                                  v={dash(item.ownershipType === 'INVESTOR' ? item.ownerInvestorVoen : item.ownerContractorVoen)}
                                  mono
                                />
                              </>
                            )}
                          </div>
                        </td>

                        {/* Texniki baxış — Son / Növbəti countdown */}
                        <td className="py-3 px-3 align-top">
                          <div className="space-y-1">
                            <KV k="Son"     v={item.lastInspectionDate ? fmtDate(item.lastInspectionDate) : '—'} mono />
                            <KV k="Növbəti" v={item.nextInspectionDate ? fmtDate(item.nextInspectionDate) : '—'} mono gold />
                          </div>
                        </td>

                        {/* Actions + expand */}
                        <td className="py-3 px-2 align-top" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-0.5">
                            <button onClick={() => setSlideOver(item)} title="Ətraflı"
                              className="w-7 h-7 grid place-items-center rounded-[6px] text-[var(--ces-muted)] hover:bg-white hover:text-[var(--ces-graphite)] transition-colors">
                              <Eye size={13} />
                            </button>
                            {canEdit && (
                              <button onClick={() => openEdit(item)} title="Redaktə"
                                className="w-7 h-7 grid place-items-center rounded-[6px] text-[var(--ces-muted)] hover:bg-[var(--ces-gold-100)] hover:text-[var(--ces-gold-700)] transition-colors">
                                <Pencil size={12} />
                              </button>
                            )}
                            {canCreate && (
                              <button onClick={() => openClone(item)} title="Kopyala"
                                className="w-7 h-7 grid place-items-center rounded-[6px] text-[var(--ces-muted)] hover:bg-[var(--ces-info-100)] hover:text-[var(--ces-info)] transition-colors">
                                <Copy size={12} />
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => handleDelete(item)} title="Sil"
                                className="w-7 h-7 grid place-items-center rounded-[6px] text-[var(--ces-muted)] hover:bg-[var(--ces-danger-100)] hover:text-[var(--ces-danger)] transition-colors">
                                <Trash2 size={12} />
                              </button>
                            )}
                            <button onClick={() => toggleExpand(item.id)} title={isExp ? 'Bağla' : 'Genişləndir'}
                              className={clsx(
                                'w-7 h-7 grid place-items-center rounded-[6px] transition-colors ml-0.5',
                                isExp
                                  ? 'bg-[var(--ces-graphite)] text-[var(--ces-on-primary)]'
                                  : 'text-[var(--ces-muted)] hover:bg-white hover:text-[var(--ces-graphite)]'
                              )}>
                              {isExp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )

                    return isExp
                      ? [mainRow, <ExpandedRow key={`exp-${item.id}`} item={item} colSpan={8} />]
                      : [mainRow]
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {!loading && totalElements > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--ces-line)] bg-white shrink-0">
              <div className="flex items-center gap-3 text-[12.5px] text-[var(--ces-muted)]">
                <span><span className="font-semibold text-[var(--ces-ink)] tabular-nums">{totalElements}</span> nəticədən <span className="font-semibold text-[var(--ces-ink)] tabular-nums">{(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, totalElements)}</span></span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 text-[12px] bg-white border border-[var(--ces-line)] rounded-[7px] text-[var(--ces-graphite)] font-semibold focus:outline-none cursor-pointer"
                >
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / səhifə</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={safePage === 1} className="w-8 h-8 grid place-items-center rounded-[7px] bg-white border border-[var(--ces-line)] text-[var(--ces-graphite)] hover:border-[var(--ces-graphite)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronsLeft size={14} />
                </button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="w-8 h-8 grid place-items-center rounded-[7px] bg-white border border-[var(--ces-line)] text-[var(--ces-graphite)] hover:border-[var(--ces-graphite)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) pageNum = i + 1
                  else if (safePage <= 3) pageNum = i + 1
                  else if (safePage >= totalPages - 2) pageNum = totalPages - 4 + i
                  else pageNum = safePage - 2 + i
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={clsx(
                        'min-w-8 h-8 px-2.5 rounded-[7px] text-[12.5px] font-bold transition-colors',
                        safePage === pageNum
                          ? 'bg-[var(--ces-graphite)] text-[var(--ces-on-primary)] border border-[var(--ces-graphite)]'
                          : 'bg-white border border-[var(--ces-line)] text-[var(--ces-graphite)] hover:border-[var(--ces-graphite)]'
                      )}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="w-8 h-8 grid place-items-center rounded-[7px] bg-white border border-[var(--ces-line)] text-[var(--ces-graphite)] hover:border-[var(--ces-graphite)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight size={14} />
                </button>
                <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} className="w-8 h-8 grid place-items-center rounded-[7px] bg-white border border-[var(--ces-line)] text-[var(--ces-graphite)] hover:border-[var(--ces-graphite)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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
          contractors={contractors}
          investors={investors}
          safetyTypes={safetyTypes}
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
          onDelete={canDelete ? () => handleDelete(slideOver) : undefined}
          onSaved={load}
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
          items={allEquipment.filter(e => selected.has(e.id))}
          onClose={() => setCompareOpen(false)}
        />
      )}
      {bulkEditOpen && (
        <BulkEditModal
          selectedIds={[...selected]}
          onClose={() => setBulkEditOpen(false)}
          onSaved={() => { setBulkEditOpen(false); setSelected(new Set()); load(); loadStats() }}
        />
      )}
      <ConfirmDialog />
    </div>
  )
}
