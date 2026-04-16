import { useState, useEffect } from 'react'
import { X, FileText, Download, Trash2, RefreshCw, CheckCircle } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

/* ─── Köməkçi funksiyalar ──────────────────────────────────────────────────── */
const fmtMoney = (v) => v != null
  ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼'
  : '—'
const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('az-AZ') : '—'

const DOC_TYPE_LABELS = {
  HESAB_FAKTURA:      { label: 'Hesab-Faktura', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  TEHVIL_TESLIM_AKTI: { label: 'Təhvil-Təslim Aktı', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  ENGLISH_INVOICE:    { label: 'English Invoice', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function DocumentDetailModal({ docId, onClose, onDeleted }) {
  const { confirm, ConfirmDialog } = useConfirm()
  const canDelete = useAuthStore(s => s.hasPermission)('ACCOUNTING', 'canDelete')

  const [doc, setDoc]           = useState(null)
  const [loading, setLoading]   = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    if (!docId) return
    setLoading(true)
    accountingApi.getDocument(docId)
      .then(res => setDoc(res.data.data || res.data))
      .catch(() => toast.error('Sənəd yüklənə bilmədi'))
      .finally(() => setLoading(false))
  }, [docId])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await accountingApi.downloadDocumentPdf(docId)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = (doc?.documentNumber || 'sened') + '.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('PDF yüklənə bilmədi')
    } finally {
      setDownloading(false)
    }
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const res = await accountingApi.regenerateDocumentPdf(docId)
      setDoc(res.data.data || res.data)
      toast.success('PDF yenidən yaradıldı')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'PDF yaradıla bilmədi')
    } finally {
      setRegenerating(false)
    }
  }

  const handleDelete = async () => {
    if (!(await confirm({
      title: 'Sənədi sil',
      message: `"${doc?.documentNumber}" sənədi silinsin?`,
    }))) return
    try {
      await accountingApi.deleteDocument(docId)
      toast.success('Sənəd silindi')
      onDeleted?.()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    }
  }

  const typeCfg = doc ? (DOC_TYPE_LABELS[doc.documentType] || DOC_TYPE_LABELS.HESAB_FAKTURA) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        <ConfirmDialog />

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-amber-600" />
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {loading ? 'Yüklənir...' : `Sənəd #${doc?.documentNumber}`}
              </h2>
              {doc && (
                <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', typeCfg?.cls)}>
                  {typeCfg?.label}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />)}
            </div>
          ) : !doc ? (
            <p className="text-center text-gray-400 py-12">Sənəd tapılmadı</p>
          ) : (
            <div className="space-y-6">

              {/* Müştəri + Tarix */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Müştəri</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{doc.customerName}</p>
                  {doc.customerVoen && <p className="text-xs text-gray-400 font-mono">VÖEN: {doc.customerVoen}</p>}
                  {doc.customerAddress && <p className="text-xs text-gray-500">{doc.customerAddress}</p>}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sənəd Məlumatları</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tarix: <span className="font-semibold text-gray-800 dark:text-gray-200">{fmt(doc.documentDate)}</span></p>
                  {doc.contractNumber && <p className="text-sm text-gray-600 dark:text-gray-400">Müqavilə №: <span className="font-semibold text-gray-800 dark:text-gray-200">{doc.contractNumber}</span></p>}
                  {doc.contractDate && <p className="text-sm text-gray-600 dark:text-gray-400">Müqavilə tarixi: <span className="font-semibold text-gray-800 dark:text-gray-200">{fmt(doc.contractDate)}</span></p>}
                </div>
              </div>

              {/* Sətir cədvəli */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Xidmətlər</p>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="grid grid-cols-[3fr_1fr_1fr_1.5fr_1.5fr] text-[10px] font-bold text-gray-500 uppercase px-4 py-2 bg-gray-100 dark:bg-gray-700">
                    <span>Xidmət</span>
                    <span>Vahid</span>
                    <span>Miqdar</span>
                    <span className="text-right">Vahid qiymət</span>
                    <span className="text-right">Cəmi</span>
                  </div>
                  {(doc.lines || []).map((line, idx) => (
                    <div
                      key={line.id}
                      className="grid grid-cols-[3fr_1fr_1fr_1.5fr_1.5fr] px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 text-sm"
                    >
                      <span className="text-gray-800 dark:text-gray-200">{line.description}</span>
                      <span className="text-gray-500">{line.unit}</span>
                      <span className="text-gray-500">{line.quantity}</span>
                      <span className="text-right text-gray-600 dark:text-gray-400">{fmtMoney(line.unitPrice)}</span>
                      <span className="text-right font-semibold text-gray-800 dark:text-gray-200">{fmtMoney(line.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Maliyyə xülasəsi */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2 ml-auto max-w-xs w-full">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cəmi:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{fmtMoney(doc.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ƏDV ({parseFloat(doc.vatRate || 0).toFixed(0)}%):</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{fmtMoney(doc.vatAmount)}</span>
                </div>
                <div className="flex justify-between text-base pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span className="font-bold text-gray-700 dark:text-gray-300">YEKUNa:</span>
                  <span className="font-bold text-amber-600 text-lg">{fmtMoney(doc.grandTotal)}</span>
                </div>
              </div>

              {/* Qeyd */}
              {doc.notes && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Qeyd</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    {doc.notes}
                  </p>
                </div>
              )}

              {/* PDF status */}
              <div className="flex items-center gap-2">
                {doc.pdfFilePath ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle size={13} />
                    PDF mövcuddur
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">PDF mövcud deyil</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!loading && doc && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-red-200 dark:border-red-800"
                >
                  <Trash2 size={13} />
                  Sil
                </button>
              )}
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                title="PDF-i yenidən yarat"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
              >
                <RefreshCw size={13} className={regenerating ? 'animate-spin' : ''} />
                Yenilə
              </button>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading || !doc.pdfFilePath}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {downloading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              PDF Yüklə
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
