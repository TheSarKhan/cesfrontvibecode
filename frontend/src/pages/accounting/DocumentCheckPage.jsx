import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, RefreshCw, Upload, FileText, Download, Trash2, CheckCircle, X } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { documentCheckApi } from '../../api/documentCheck'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'

export default function DocumentCheckPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canPost = hasPermission('ACCOUNTING', 'canPost')
  const canDelete = hasPermission('ACCOUNTING', 'canDelete')
  const canComplete = hasPermission('ACCOUNTING', 'canCheckDocuments')
  const { confirm, ConfirmDialog } = useConfirm()

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
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

  const filtered = list.filter(r => {
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

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1 min-w-0">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sorğu ID, şirkət, layihə..."
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <button onClick={load} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors">
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
                <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400">Sənəd yoxlamasını gözləyən sorğu yoxdur</td></tr>
              ) : (
                filtered.map(r => (
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
                      <DocBadge ok={r.contractUploaded} label="Müqavilə" />
                    </td>
                    <td className="py-3 px-4">
                      <DocBadge ok={r.priceProtocolUploaded} label="Protokol" />
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
                ))
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

function DocBadge({ ok, label }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border',
      ok
        ? 'bg-green-50 text-green-700 border-green-200'
        : 'bg-gray-100 text-gray-500 border-gray-200'
    )}>
      {ok ? <CheckCircle size={11} /> : <FileText size={11} />}
      {ok ? `${label} OK` : `${label} yoxdur`}
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

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="ml-auto h-full w-full max-w-xl bg-white dark:bg-gray-800 shadow-2xl flex items-center justify-center text-sm text-gray-400">
          Yüklənir...
        </div>
      </div>
    )
  }

  const allReady = data.contractUploaded && data.priceProtocolUploaded

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="ml-auto h-full w-full max-w-xl bg-white dark:bg-gray-800 shadow-2xl flex flex-col">
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
        </div>

        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {allReady ? 'Bütün sənədlər tam' : 'Müqavilə + Protokol yüklənməlidir'}
          </div>
          {canComplete && (
            <button
              onClick={complete}
              disabled={!allReady || busy}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
            >
              <CheckCircle size={13} /> Yoxlamanı tamamla
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function DocSection({ title, type, uploaded, doc, fileRef, onUpload, onDelete, requestId, canPost, canDelete, busy }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm text-gray-800 dark:text-gray-200">{title}</div>
        <DocBadge ok={uploaded} label="" />
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
