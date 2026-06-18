import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Search, RefreshCw, Upload, FileText, Download, Trash2, CheckCircle, X, FileCheck, FileClock, FileX, Files, CornerUpLeft } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { documentCheckApi } from '../../api/documentCheck'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'
import ReasonPromptModal from '../../components/common/ReasonPromptModal'

const STAT_CARDS = [
  { id: 'ALL',     label: 'Hamısı',     icon: Files,     color: 'text-gray-500' },
  { id: 'EMPTY',   label: 'Sənədsiz',   icon: FileX,     color: 'text-red-500' },
  { id: 'PARTIAL', label: 'Yarımçıq',   icon: FileClock, color: 'text-amber-500' },
  { id: 'READY',   label: 'Tam',        icon: FileCheck, color: 'text-green-500' },
]

// Çoxlu texnika: hər sənəd növü üçün BÜTÜN xətlər tam olmalıdır.
// 'full' = bütün xətlərdə var, 'partial' = bəzisində, 'none' = heç birində.
// (Sorğu səviyyəli/köhnə sənəd bütün xətlər üçün keçərli sayılır.)
const rowReadiness = (r) => {
  const lines = r.equipmentLines || []
  const docs = r.documents || []
  if (lines.length === 0) {
    return {
      contract: r.contractUploaded ? 'full' : 'none',
      protocol: r.priceProtocolUploaded ? 'full' : 'none',
    }
  }
  const genContract = docs.some((d) => d.docType === 'CONTRACT' && d.planItemId == null)
  const genProtocol = docs.some((d) => d.docType === 'PRICE_PROTOCOL' && d.planItemId == null)
  const genOwnerContract = docs.some((d) => d.docType === 'OWNER_CONTRACT' && d.planItemId == null)
  const genOwnerProtocol = docs.some((d) => d.docType === 'OWNER_PRICE_PROTOCOL' && d.planItemId == null)
  const has = (ln, t, gen) => gen || docs.some((d) => d.docType === t && d.planItemId === ln.planItemId)
  // Sahib (podratçı/investor) xəttində müştəri + sahib sənədi birlikdə tələb olunur
  const cOk = (ln) => has(ln, 'CONTRACT', genContract) && (!ln.ownerDocsRequired || has(ln, 'OWNER_CONTRACT', genOwnerContract))
  const pOk = (ln) => has(ln, 'PRICE_PROTOCOL', genProtocol) && (!ln.ownerDocsRequired || has(ln, 'OWNER_PRICE_PROTOCOL', genOwnerProtocol))
  const cCount = lines.filter(cOk).length
  const pCount = lines.filter(pOk).length
  const state = (cnt) => (cnt === 0 ? 'none' : cnt === lines.length ? 'full' : 'partial')
  return { contract: state(cCount), protocol: state(pCount) }
}

const classifyRow = (r) => {
  const { contract, protocol } = rowReadiness(r)
  if (contract === 'full' && protocol === 'full') return 'READY'
  if (contract === 'none' && protocol === 'none') return 'EMPTY'
  return 'PARTIAL'
}

export default function DocumentCheckPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canPost = hasPermission('ACCOUNTING', 'canPost')
  const canDelete = hasPermission('ACCOUNTING', 'canDelete')
  const canComplete = hasPermission('ACCOUNTING', 'canCheckDocuments')
  const { confirm, ConfirmDialog } = useConfirm()

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [quickFilter, setQuickFilter] = useState('ALL')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await documentCheckApi.getPending()
      setList(res.data.data || [])
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Focus / visibility avtomatik yeniləmə
  useEffect(() => {
    const refresh = () => load()
    window.addEventListener('focus', refresh)
    const visHandler = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', visHandler)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', visHandler)
    }
  }, [load])

  const stats = useMemo(() => {
    const s = { ALL: list.length, EMPTY: 0, PARTIAL: 0, READY: 0 }
    list.forEach((r) => { s[classifyRow(r)]++ })
    return s
  }, [list])

  const filtered = list.filter(r => {
    if (quickFilter !== 'ALL' && classifyRow(r) !== quickFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return r.requestCode?.toLowerCase().includes(q)
        || r.companyName?.toLowerCase().includes(q)
        || r.projectName?.toLowerCase().includes(q)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Sənəd Yoxlanışı</h1>
          <p className="text-xs text-gray-400 mt-0.5">{list.length} sorğu sənəd yoxlamasını gözləyir</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none">
        {STAT_CARDS.map((s) => {
          const Icon = s.icon
          const active = quickFilter === s.id
          return (
            <button
              key={s.id}
              onClick={() => setQuickFilter(s.id)}
              className={clsx(
                'rounded-xl border px-3 py-2 text-left transition-colors shrink-0 min-w-[110px]',
                active
                  ? 'bg-cyan-50 border-cyan-200 dark:bg-cyan-900/10 dark:border-cyan-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-cyan-200 dark:hover:border-cyan-700',
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

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1 min-w-0">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sorğu ID, şirkət, layihə..."
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <button onClick={load} title="Yenilə" className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 hover:text-cyan-600 transition-colors">
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Şirkət / Layihə</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Razılaşma</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Müqavilə</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Protokol</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                  {list.length === 0 ? 'Sənəd yoxlamasını gözləyən sorğu yoxdur' : 'Filtrlərə uyğun nəticə tapılmadı'}
                </td></tr>
              ) : (
                filtered.map(r => {
                  const rd = rowReadiness(r)
                  return (
                  <tr
                    key={r.requestId}
                    onClick={() => setSelected(r)}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4"><span className="text-xs font-mono font-semibold text-amber-600">{r.requestCode}</span></td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.companyName}</p>
                      {r.projectName && <p className="text-xs text-gray-400">{r.projectName}</p>}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {r.agreedTotalPrice ? `${parseFloat(r.agreedTotalPrice).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <DocBadge status={rd.contract} label="Müqavilə" />
                    </td>
                    <td className="py-3 px-4">
                      <DocBadge status={rd.protocol} label="Protokol" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelected(r) }}
                          className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 px-2.5 py-1.5 rounded-lg hover:bg-amber-50"
                        >
                          <FileText size={13} /> Aç
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <CheckSlideOver
          requestId={selected.requestId}
          canPost={canPost}
          canDelete={canDelete}
          canComplete={canComplete}
          confirm={confirm}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
      <ConfirmDialog />
    </div>
  )
}

// status: 'full' (Tam/OK) | 'partial' (Natamam) | 'none' (Yoxdur)
function DocBadge({ status, label }) {
  const cfg = status === 'full'
    ? { cls: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle size={11} />, text: `${label} OK`.trim() }
    : status === 'partial'
      ? { cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: <FileClock size={11} />, text: `${label} natamam`.trim() }
      : { cls: 'bg-gray-100 text-gray-500 border-gray-200', icon: <FileX size={11} />, text: `${label} yoxdur`.trim() }
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border',
      cfg.cls,
    )}>
      {cfg.icon}
      {cfg.text}
    </span>
  )
}

function CheckSlideOver({ requestId, canPost, canDelete, canComplete, confirm, onClose, onChanged }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const contractRef = useRef(null)
  const protocolRef = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await documentCheckApi.get(requestId)
      setData(res.data.data)
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [requestId])

  const uploadContract = async (file) => {
    setBusy(true)
    try {
      await documentCheckApi.uploadContract(requestId, file)
      toast.success('Müqavilə yükləndi')
      await load()
      onChanged?.()
    } catch {} finally {
      setBusy(false)
    }
  }
  const uploadProtocol = async (file) => {
    setBusy(true)
    try {
      await documentCheckApi.uploadPriceProtocol(requestId, file)
      toast.success('Protokol yükləndi')
      await load()
      onChanged?.()
    } catch {} finally {
      setBusy(false)
    }
  }

  // Çoxlu texnika — xətt üzrə yükləmə (mühasib də yükləyə bilər)
  const uploadItem = async (type, planItemId, file) => {
    setBusy(true)
    try {
      if (type === 'CONTRACT') await documentCheckApi.uploadContractItem(requestId, planItemId, file)
      else if (type === 'PRICE_PROTOCOL') await documentCheckApi.uploadPriceProtocolItem(requestId, planItemId, file)
      else if (type === 'OWNER_CONTRACT') await documentCheckApi.uploadOwnerContractItem(requestId, planItemId, file)
      else await documentCheckApi.uploadOwnerPriceProtocolItem(requestId, planItemId, file)
      toast.success('Sənəd yükləndi')
      await load()
      onChanged?.()
    } catch {} finally {
      setBusy(false)
    }
  }

  const handleDelete = async (doc) => {
    if (!(await confirm({ title: 'Sənədi sil', message: `"${doc.fileName}" silinsin?`, danger: true }))) return
    setBusy(true)
    try {
      await documentCheckApi.deleteDocument(requestId, doc.id)
      toast.success('Sənəd silindi')
      await load()
      onChanged?.()
    } catch {} finally {
      setBusy(false)
    }
  }

  const complete = async () => {
    if (!(await confirm({ title: 'Yoxlamanı tamamla', message: 'Sənədlər təsdiqlənərək koordinatora göndərilsin?' }))) return
    setBusy(true)
    try {
      await documentCheckApi.completeCheck(requestId)
      toast.success('Yoxlama tamamlandı — koordinatora göndərildi')
      onChanged?.()
      onClose()
    } catch {} finally {
      setBusy(false)
    }
  }

  const [sendBackOpen, setSendBackOpen] = useState(false)
  const handleSendBack = async (reason) => {
    setBusy(true)
    try {
      await documentCheckApi.sendBack(requestId, reason)
      toast.success('Sorğu LM-ə geri qaytarıldı')
      setSendBackOpen(false)
      onChanged?.()
      onClose()
    } catch { /* xəta interceptor-də göstərilir */ } finally {
      setBusy(false)
    }
  }

  if (loading || !data) {
    return (
      <div
        className="fixed inset-0 z-[900] flex justify-end"
        style={{background:"rgba(0,0,0,0.25)"}}
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          className="h-full w-full max-w-xl bg-white dark:bg-gray-800 shadow-2xl flex items-center justify-center text-sm text-gray-400"
          onMouseDown={(e) => e.stopPropagation()}
        >
          Yüklənir...
        </div>
      </div>
    )
  }

  const allReady = data.contractUploaded && data.priceProtocolUploaded

  // Çoxlu texnika: BÜTÜN texnika xətləri göstərilir (sənədi olmasa belə),
  // hər xəttin sənədləri planItemId üzrə tapılır.
  const equipmentLines = data.equipmentLines || []
  const hasPerLine = equipmentLines.length > 0
  const lineGroups = equipmentLines.map((ln) => {
    const lineDocs = (data.documents || []).filter((d) => d.planItemId === ln.planItemId)
    return {
      planItemId: ln.planItemId,
      equipmentName: ln.equipmentName,
      equipmentCode: ln.equipmentCode,
      ownerDocsRequired: ln.ownerDocsRequired,
      ownershipType: ln.ownershipType,
      ownerName: ln.ownerName,
      contract: lineDocs.find((d) => d.docType === 'CONTRACT') || null,
      protocol: lineDocs.find((d) => d.docType === 'PRICE_PROTOCOL') || null,
      ownerContract: lineDocs.find((d) => d.docType === 'OWNER_CONTRACT') || null,
      ownerProtocol: lineDocs.find((d) => d.docType === 'OWNER_PRICE_PROTOCOL') || null,
    }
  })
  // Sorğu səviyyəli (xəttə bağlı olmayan) sənədlər — köhnə yol / əlavə
  const generalContract = (data.documents || []).find((d) => d.docType === 'CONTRACT' && d.planItemId == null)
  const generalProtocol = (data.documents || []).find((d) => d.docType === 'PRICE_PROTOCOL' && d.planItemId == null)
  const lineReady = (g) => {
    const cust = (g.contract || generalContract) && (g.protocol || generalProtocol)
    if (!g.ownerDocsRequired) return !!cust
    return !!cust && !!g.ownerContract && !!g.ownerProtocol
  }
  const perLineReady = hasPerLine && lineGroups.every(lineReady)
  const effectiveReady = hasPerLine ? perLineReady : allReady

  return (
    <div
      className="fixed inset-0 z-[900] flex justify-end"
      style={{background:"rgba(0,0,0,0.25)"}}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="h-full w-full max-w-xl bg-white dark:bg-gray-800 shadow-2xl flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
          <div>
            <span className="text-xs font-mono font-semibold text-amber-600">{data.requestCode}</span>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mt-0.5">{data.companyName}</h2>
            {data.projectName && <p className="text-xs text-gray-500">{data.projectName}</p>}
            {data.agreedTotalPrice && (
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                Razılaşma: <b>{parseFloat(data.agreedTotalPrice).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼</b>
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-600 p-1.5 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {hasPerLine ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Texnika üzrə sənədlər</p>
              {lineGroups.map((g) => {
                const contract = g.contract || generalContract
                const protocol = g.protocol || generalProtocol
                const ready = lineReady(g)
                return (
                  <div key={g.planItemId} className={clsx('rounded-xl border p-3', ready ? 'border-green-200 dark:border-green-800' : 'border-amber-200 dark:border-amber-800')}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {g.equipmentName || `Xətt #${g.planItemId}`}
                        {g.equipmentCode && <span className="font-mono text-gray-400 font-normal"> ({g.equipmentCode})</span>}
                      </span>
                      {ready
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-green-50 text-green-700 border-green-200"><CheckCircle size={10} /> Tam</span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200">Yarımçıq</span>}
                    </div>
                    <p className="text-[10px] uppercase tracking-wide font-bold text-gray-400 mb-1">Müştəri tərəfi</p>
                    <div className="grid grid-cols-2 gap-2">
                      <AccLineDoc label="Müqavilə" type="CONTRACT" doc={contract} shared={!g.contract && !!generalContract} planItemId={g.planItemId} requestId={requestId} canPost={canPost} canDelete={canDelete} onUpload={uploadItem} onDelete={handleDelete} busy={busy} />
                      <AccLineDoc label="Qiymət protokolu" type="PRICE_PROTOCOL" doc={protocol} shared={!g.protocol && !!generalProtocol} planItemId={g.planItemId} requestId={requestId} canPost={canPost} canDelete={canDelete} onUpload={uploadItem} onDelete={handleDelete} busy={busy} />
                    </div>
                    {g.ownerDocsRequired && (
                      <>
                        <p className="text-[10px] uppercase tracking-wide font-bold text-gray-400 mb-1 mt-2.5">
                          Sahib tərəfi ({g.ownershipType === 'CONTRACTOR' ? 'Podratçı' : 'İnvestor'}{g.ownerName ? ` · ${g.ownerName}` : ''})
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <AccLineDoc label="Sahib müqaviləsi" type="OWNER_CONTRACT" doc={g.ownerContract} shared={false} planItemId={g.planItemId} requestId={requestId} canPost={canPost} canDelete={canDelete} onUpload={uploadItem} onDelete={handleDelete} busy={busy} />
                          <AccLineDoc label="Sahib protokolu" type="OWNER_PRICE_PROTOCOL" doc={g.ownerProtocol} shared={false} planItemId={g.planItemId} requestId={requestId} canPost={canPost} canDelete={canDelete} onUpload={uploadItem} onDelete={handleDelete} busy={busy} />
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
              <p className="text-[11px] text-gray-400">Sənədlər LM (Razılaşma) mərhələsində hər texnika üçün yüklənir. Sahib texnikasında həm müştəri, həm sahib sənədləri lazımdır. Əskik varsa “LM-ə geri qaytar”.</p>
            </div>
          ) : (
            <>
              <DocSection
                title="Müqavilə"
                type="CONTRACT"
                uploaded={data.contractUploaded}
                doc={data.documents?.find(d => d.docType === 'CONTRACT')}
                fileRef={contractRef}
                onUpload={uploadContract}
                onDelete={handleDelete}
                requestId={requestId}
                canPost={canPost}
                canDelete={canDelete}
                busy={busy}
              />
              <DocSection
                title="Qiymət razılaşma protokolu"
                type="PRICE_PROTOCOL"
                uploaded={data.priceProtocolUploaded}
                doc={data.documents?.find(d => d.docType === 'PRICE_PROTOCOL')}
                fileRef={protocolRef}
                onUpload={uploadProtocol}
                onDelete={handleDelete}
                requestId={requestId}
                canPost={canPost}
                canDelete={canDelete}
                busy={busy}
              />
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {effectiveReady ? 'Bütün sənədlər tam' : 'Hər texnika üçün Müqavilə + Protokol yüklənməlidir'}
          </div>
          <div className="flex items-center gap-2">
            {canComplete && (
              <button
                onClick={() => setSendBackOpen(true)}
                disabled={busy}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-700 border border-amber-300 hover:bg-amber-50 rounded-lg disabled:opacity-50"
              >
                <CornerUpLeft size={13} /> LM-ə geri qaytar
              </button>
            )}
            {canComplete && (
              <button
                onClick={complete}
                disabled={!effectiveReady || busy}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
              >
                <CheckCircle size={13} /> Yoxlamanı tamamla
              </button>
            )}
          </div>
        </div>
      </div>

      {sendBackOpen && (
        <ReasonPromptModal
          title="LM-ə geri qaytar"
          message="Sənədlərdə əskiklik/səhv var — sorğu Layihə Menecerinə (qiymət danışığına) geri qaytarılır."
          confirmLabel="Geri qaytar"
          loading={busy}
          onConfirm={handleSendBack}
          onClose={() => setSendBackOpen(false)}
        />
      )}
    </div>
  )
}

function DocSection({ title, type, uploaded, doc, fileRef, onUpload, onDelete, requestId, canPost, canDelete, busy }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm text-gray-800 dark:text-gray-200">{title}</div>
        <DocBadge status={uploaded ? 'full' : 'none'} label="" />
      </div>
      {doc ? (
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-amber-600" />
            <div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{doc.fileName}</div>
              <div className="text-[10px] text-gray-400">{doc.uploadedByName} • {new Date(doc.uploadedAt).toLocaleString('az-AZ')}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <a
              href={documentCheckApi.getDownloadUrl(requestId, doc.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"
              title="Yüklə"
            >
              <Download size={13} />
            </a>
            {canDelete && (
              <button
                disabled={busy}
                onClick={() => onDelete(doc)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
                title="Sil"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-xs text-gray-400">Hələ yüklənməyib</div>
      )}
      {canPost && (
        <>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                onUpload(e.target.files[0])
                e.target.value = ''
              }
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg disabled:opacity-50"
          >
            <Upload size={13} /> {doc ? 'Yenidən yüklə' : 'Yüklə'}
          </button>
        </>
      )}
    </div>
  )
}

/* Çoxlu texnika: bir xəttin bir sənədi (oxu/endir/sil + mühasib yükləyə bilər) */
function AccLineDoc({ label, type, doc, shared, planItemId, requestId, canPost, canDelete, onUpload, onDelete, busy }) {
  const fileRef = useRef(null)
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 bg-gray-50/50 dark:bg-gray-900/30">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{label}</span>
        {doc
          ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border bg-green-50 text-green-700 border-green-200"><CheckCircle size={9} /> Var{shared ? ' (ümumi)' : ''}</span>
          : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border bg-gray-50 text-gray-400 border-gray-200">Yoxdur</span>}
      </div>
      {doc ? (
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded px-2 py-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <FileText size={11} className="text-amber-600 shrink-0" />
            <span className="text-[11px] text-gray-700 dark:text-gray-200 truncate">{doc.fileName}</span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <a href={documentCheckApi.getDownloadUrl(requestId, doc.id)} target="_blank" rel="noopener noreferrer" className="p-1 text-amber-600 hover:bg-amber-50 rounded" title="Yüklə"><Download size={11} /></a>
            {canDelete && !shared && (
              <button disabled={busy} onClick={() => onDelete(doc)} className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-50" title="Sil"><Trash2 size={11} /></button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-gray-400">Hələ yüklənməyib</div>
      )}
      {canPost && (
        <>
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { onUpload(type, planItemId, e.target.files[0]); e.target.value = '' } }} />
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="mt-1.5 w-full inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border border-dashed border-amber-300 hover:border-amber-500 hover:bg-amber-50 text-amber-700 disabled:opacity-50">
            <Upload size={10} /> {doc ? 'Yenidən yüklə' : 'Yüklə'}
          </button>
        </>
      )}
    </div>
  )
}
