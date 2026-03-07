import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight, FileText, Image, SlidersHorizontal } from 'lucide-react'
import { garageApi } from '../../api/garage'
import EquipmentModal from './EquipmentModal'
import EquipmentSlideOver from './EquipmentSlideOver'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

/* ─── Sabitlər ───────────────────────────────────────────────────────────── */
const STATUS_CFG = {
  AVAILABLE:     { label: 'Mövcud',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
  RENTED:        { label: 'İcarədə',  cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  DEFECTIVE:     { label: 'Nasaz',    cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
  OUT_OF_SERVICE:{ label: 'Xidmətdən kənarda', cls: 'bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
}
const REPAIR_CFG = {
  'Hazır':      'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  'Təmirdədir': 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
}
const OWN_LABEL = { COMPANY: 'Şirkət', INVESTOR: 'İnvestor', CONTRACTOR: 'Podratçı' }
const fmtMoney = (v) => v != null ? `${Number(v).toLocaleString()} ₼` : '—'
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('az-AZ', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—'
const dash     = (v) => (v != null && v !== '') ? v : '—'

/* ─── Genişləndirilmiş sıra ──────────────────────────────────────────────── */
function ExpandedRow({ item }) {
  return (
    <tr>
      <td colSpan={99} className="border-b border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-gray-900/40 p-0">
        <div className="px-10 py-3 grid grid-cols-3 gap-3">

          {/* Maliyyə + Texniki */}
          <div className="grid grid-cols-2 col-span-2 gap-3">
            <Block title="Maliyyə">
              <FR l="Alış qiyməti"    v={fmtMoney(item.purchasePrice)} />
              <FR l="Bazar dəyəri"    v={fmtMoney(item.currentMarketValue)} />
              <FR l="Amortizasiya"    v={item.depreciationRate != null ? `${item.depreciationRate}%` : '—'} />
              <FR l="Saat / KM"       v={dash(item.hourKmCounter)} />
              <FR l="Moto saatlar"    v={dash(item.motoHours)} last />
            </Block>
            <Block title="Texniki baxış">
              <FR l="Son baxış"       v={fmtDate(item.lastInspectionDate)} />
              <FR l="Növbəti baxış"   v={fmtDate(item.nextInspectionDate)} />
              <FR l="Hazırlıq"        v={dash(item.technicalReadinessStatus)} />
              <FR l="Təmir statusu"   v={dash(item.repairStatus)} />
              <FR l="Saxlanma yeri"   v={dash(item.storageLocation)} last />
            </Block>
            <Block title="Mülkiyyət məlumatları" className="col-span-2">
              {item.ownershipType === 'INVESTOR' && (
                <div className="grid grid-cols-3 gap-x-6">
                  <FR l="Ad, soyad"  v={dash(item.ownerInvestorName)} />
                  <FR l="VÖEN"       v={dash(item.ownerInvestorVoen)} />
                  <FR l="Telefon"    v={dash(item.ownerInvestorPhone)} last />
                </div>
              )}
              {item.ownershipType === 'CONTRACTOR' && (
                <div className="grid grid-cols-4 gap-x-6">
                  <FR l="Podratçı"   v={dash(item.ownerContractorName)} />
                  <FR l="VÖEN"       v={dash(item.ownerContractorVoen)} />
                  <FR l="Tel"        v={dash(item.ownerContractorPhone)} />
                  <FR l="Əlaqədar"   v={dash(item.ownerContractorContact)} last />
                </div>
              )}
              {item.ownershipType === 'COMPANY' && (
                <p className="text-xs text-gray-400 italic">Şirkətin öz texnikasıdır</p>
              )}
            </Block>
          </div>

          {/* Qeydlər + Fayllar */}
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

/* ─── GaragePage ──────────────────────────────────────────────────────────── */
export default function GaragePage() {
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, editing: null })
  const [slideOver, setSlideOver] = useState(null)
  const [expanded, setExpanded] = useState(new Set())
  const [selected, setSelected] = useState(new Set())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [ownershipFilter, setOwnershipFilter] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await garageApi.getAll()
      setEquipment(res.data.data || res.data || [])
    } catch { toast.error('Texnikalar yüklənmədi') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => equipment.filter((e) => {
    const q = search.toLowerCase()
    return (
      (!q || e.name?.toLowerCase().includes(q) || e.brand?.toLowerCase().includes(q) ||
        e.model?.toLowerCase().includes(q) || e.equipmentCode?.toLowerCase().includes(q) ||
        e.serialNumber?.toLowerCase().includes(q)) &&
      (!statusFilter || e.status === statusFilter) &&
      (!ownershipFilter || e.ownershipType === ownershipFilter)
    )
  }), [equipment, search, statusFilter, ownershipFilter])

  const toggleExpand = (id) => setExpanded(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })
  const toggleSelect = (id) => setSelected(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })
  const toggleAll = () =>
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(e => e.id)))

  const handleDelete = async (item) => {
    if (!window.confirm(`"${item.name}" silmək istəyirsiniz?`)) return
    try {
      await garageApi.delete(item.id)
      toast.success('Texnika silindi')
      if (slideOver?.id === item.id) setSlideOver(null)
      load()
    } catch { toast.error('Silmə uğursuz oldu') }
  }

  const openEdit = (item) => { setSlideOver(null); setModal({ open: true, editing: item }) }

  const firstImg = (item) => item.images?.length ? garageApi.getImageViewUrl(item.id, item.images[0].id) : null

  /* ── Column definitions ── */
  const TH = ({ children, className, style }) => (
    <th className={clsx(
      'sticky top-0 z-10 py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-left whitespace-nowrap',
      'bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700',
      className
    )} style={style}>{children}</th>
  )

  return (
    /* Full-height flex column so table fills viewport */
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 80px)' }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">Qaraj</h1>
          <p className="text-[11px] text-gray-400">{equipment.length} texnika · {filtered.length} göstərilir</p>
        </div>
        <button
          onClick={() => setModal({ open: true, editing: null })}
          className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shrink-0"
        >
          <Plus size={14} /> Yeni texnika
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 mb-3 shrink-0">
        <div className="relative flex-1 min-w-0">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, marka, kod, seriya..."
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">Bütün statuslar</option>
          <option value="AVAILABLE">Mövcud</option>
          <option value="RENTED">İcarədə</option>
          <option value="DEFECTIVE">Nasaz</option>
          <option value="OUT_OF_SERVICE">Xidmətdən kənarda</option>
        </select>
        <select value={ownershipFilter} onChange={(e) => setOwnershipFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">Bütün mülkiyyət</option>
          <option value="COMPANY">Şirkət</option>
          <option value="INVESTOR">İnvestor</option>
          <option value="CONTRACTOR">Podratçı</option>
        </select>
        {(search || statusFilter || ownershipFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setOwnershipFilter('') }}
            className="px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <SlidersHorizontal size={13} />
          </button>
        )}
      </div>

      {/* ── Table (fills remaining height, scrolls vertically only) ── */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
        <div className="h-full overflow-y-auto overflow-x-hidden">
          <table className="w-full table-fixed border-collapse text-xs">
            <colgroup>
              <col style={{ width: '2.5%' }} />  {/* # */}
              <col style={{ width: '18%' }} />   {/* Texnika */}
              <col style={{ width: '7%' }} />    {/* Növ */}
              <col style={{ width: '10%' }} />   {/* Brend/Model */}
              <col style={{ width: '7%' }} />    {/* Seriya/İl */}
              <col style={{ width: '9%' }} />    {/* Alış */}
              <col style={{ width: '9%' }} />    {/* Bazar */}
              <col style={{ width: '9%' }} />    {/* Status */}
              <col style={{ width: '9%' }} />    {/* Mülkiyyət */}
              <col style={{ width: '9%' }} />    {/* Hazırlıq */}
              <col style={{ width: '8%' }} />    {/* Baxış tarixi */}
              <col style={{ width: '3%' }} />    {/* Fayllar */}
              <col style={{ width: '9%' }} />    {/* Actions */}
            </colgroup>

            <thead>
              {/* Group header */}
              <tr>
                <th colSpan={2} className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700" />
                <th colSpan={3} className="sticky top-0 z-10 py-1 text-[9px] font-bold text-amber-600 uppercase tracking-widest text-center bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
                  Texniki məlumatlar
                </th>
                <th colSpan={2} className="sticky top-0 z-10 py-1 text-[9px] font-bold text-blue-600 uppercase tracking-widest text-center bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                  Maliyyə
                </th>
                <th colSpan={3} className="sticky top-0 z-10 py-1 text-[9px] font-bold text-emerald-600 uppercase tracking-widest text-center bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800">
                  Status &amp; Bayraqlar
                </th>
                <th colSpan={2} className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700" />
              </tr>

              {/* Column header */}
              <tr>
                {/* # */}
                <TH>
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-amber-500 focus:ring-amber-500 focus:ring-1" />
                </TH>
                <TH>Texnika</TH>
                {/* Technical — amber tint */}
                <TH className="bg-amber-50/60 dark:bg-amber-900/10">Növ</TH>
                <TH className="bg-amber-50/60 dark:bg-amber-900/10">Brend / Model</TH>
                <TH className="bg-amber-50/60 dark:bg-amber-900/10">Seriya / İl</TH>
                {/* Financial — blue tint */}
                <TH className="bg-blue-50/60 dark:bg-blue-900/10">Alış qiyməti</TH>
                <TH className="bg-blue-50/60 dark:bg-blue-900/10">Bazar dəyəri</TH>
                {/* Status — green tint */}
                <TH className="bg-emerald-50/60 dark:bg-emerald-900/10">Status</TH>
                <TH className="bg-emerald-50/60 dark:bg-emerald-900/10">Mülkiyyət</TH>
                <TH className="bg-emerald-50/60 dark:bg-emerald-900/10">Hazırlıq</TH>
                {/* Misc */}
                <TH>Son baxış</TH>
                <TH className="text-center">📄</TH>
                <TH>Əməliyyat</TH>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    {Array.from({ length: 13 }).map((_, j) => (
                      <td key={j} className="py-2.5 px-2">
                        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-sm text-gray-400">
                    {equipment.length === 0 ? 'Hələ texnika yoxdur' : 'Nəticə tapılmadı'}
                  </td>
                </tr>
              ) : (
                filtered.flatMap((item, idx) => {
                  const isExp = expanded.has(item.id)
                  const isSel = selected.has(item.id)
                  const status = STATUS_CFG[item.status] || STATUS_CFG.AVAILABLE
                  const imgUrl = firstImg(item)

                  const mainRow = (
                    <tr
                      key={item.id}
                      className={clsx(
                        'border-b border-gray-100 dark:border-gray-700 transition-colors',
                        isExp ? 'bg-amber-50/40 dark:bg-amber-900/5' : 'hover:bg-gray-50/70 dark:hover:bg-gray-700/30',
                        isSel && !isExp && 'bg-amber-50/60 dark:bg-amber-900/10'
                      )}
                    >
                      {/* # checkbox */}
                      <td className="py-2 px-2 align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <input type="checkbox" checked={isSel} onChange={() => toggleSelect(item.id)}
                            className="rounded border-gray-300 text-amber-500 focus:ring-amber-500 focus:ring-1" />
                        </div>
                      </td>

                      {/* Texnika */}
                      <td className="py-2 px-2 cursor-pointer align-middle" onClick={() => toggleExpand(item.id)}>
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 text-gray-300 dark:text-gray-600">
                            {isExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </span>
                          <div className="w-10 h-8 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0 flex items-center justify-center">
                            {imgUrl
                              ? <img src={imgUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                              : <span className="text-[7px] text-gray-300 leading-tight text-center">YOX</span>
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">{item.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono leading-tight">{item.equipmentCode}</p>
                          </div>
                        </div>
                      </td>

                      {/* Növ */}
                      <td className="py-2 px-2 align-middle bg-amber-50/20 dark:bg-amber-900/5">
                        <span className="text-gray-600 dark:text-gray-300 truncate block">{item.type || '—'}</span>
                      </td>

                      {/* Brend / Model */}
                      <td className="py-2 px-2 align-middle bg-amber-50/20 dark:bg-amber-900/5">
                        <p className="font-medium text-gray-700 dark:text-gray-200 truncate">{item.brand || '—'}</p>
                        <p className="text-[10px] text-gray-400 truncate">{item.model || ''}</p>
                      </td>

                      {/* Seriya / İl */}
                      <td className="py-2 px-2 align-middle bg-amber-50/20 dark:bg-amber-900/5">
                        <p className="font-mono text-gray-600 dark:text-gray-300 truncate text-[10px]">{item.serialNumber || '—'}</p>
                        <p className="text-[10px] text-gray-400">{item.manufactureYear || ''}</p>
                      </td>

                      {/* Alış qiyməti */}
                      <td className="py-2 px-2 align-middle bg-blue-50/20 dark:bg-blue-900/5">
                        <span className="text-gray-700 dark:text-gray-200 font-medium">{fmtMoney(item.purchasePrice)}</span>
                      </td>

                      {/* Bazar dəyəri */}
                      <td className="py-2 px-2 align-middle bg-blue-50/20 dark:bg-blue-900/5">
                        <span className="text-gray-600 dark:text-gray-300">{fmtMoney(item.currentMarketValue)}</span>
                      </td>

                      {/* Status */}
                      <td className="py-2 px-2 align-middle bg-emerald-50/20 dark:bg-emerald-900/5">
                        <span className={clsx('px-1.5 py-0.5 rounded text-[9px] font-semibold border block w-fit mb-0.5', status.cls)}>
                          {status.label}
                        </span>
                        {item.repairStatus && (
                          <span className={clsx('px-1.5 py-0.5 rounded text-[9px] font-medium block w-fit', REPAIR_CFG[item.repairStatus] || 'bg-gray-50 text-gray-400')}>
                            {item.repairStatus}
                          </span>
                        )}
                      </td>

                      {/* Mülkiyyət */}
                      <td className="py-2 px-2 align-middle bg-emerald-50/20 dark:bg-emerald-900/5">
                        <p className="font-medium text-gray-700 dark:text-gray-200">{OWN_LABEL[item.ownershipType] || '—'}</p>
                        {item.ownerContractorName && (
                          <p className="text-[10px] text-gray-400 truncate">{item.ownerContractorName}</p>
                        )}
                        {item.ownerInvestorName && (
                          <p className="text-[10px] text-gray-400 truncate">{item.ownerInvestorName}</p>
                        )}
                      </td>

                      {/* Texniki hazırlıq */}
                      <td className="py-2 px-2 align-middle bg-emerald-50/20 dark:bg-emerald-900/5">
                        <span className="text-gray-500 dark:text-gray-400 truncate block">
                          {item.technicalReadinessStatus || '—'}
                        </span>
                      </td>

                      {/* Son baxış tarixi */}
                      <td className="py-2 px-2 align-middle">
                        <p className="text-gray-600 dark:text-gray-300">{fmtDate(item.lastInspectionDate)}</p>
                        {item.nextInspectionDate && (
                          <p className="text-[10px] text-amber-500">{fmtDate(item.nextInspectionDate)}</p>
                        )}
                      </td>

                      {/* Fayllar */}
                      <td className="py-2 px-1 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSlideOver(item)} className="flex flex-col items-center gap-0.5 mx-auto text-gray-300 hover:text-amber-500 transition-colors">
                          <span className="text-[9px]">{item.documents?.length ?? 0}📄</span>
                          <span className="text-[9px]">{item.images?.length ?? 0}🖼</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-2 align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => setSlideOver(item)}
                            title="Ətraflı"
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors">
                            <ChevronRight size={13} />
                          </button>
                          <button onClick={() => openEdit(item)}
                            title="Redaktə"
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDelete(item)}
                            title="Sil"
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
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
      </div>

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
        />
      )}
    </div>
  )
}
