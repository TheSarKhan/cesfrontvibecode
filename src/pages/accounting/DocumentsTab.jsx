import { useState, useEffect, useCallback } from 'react'
import { FileText, Search, Download, Eye, Trash2, Plus, RefreshCw } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'
import Pagination from '../../components/common/Pagination'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import DocumentDetailModal from './DocumentDetailModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

/* ─── Köməkçi funksiyalar ──────────────────────────────────────────────────── */
const fmtMoney = (v) => v != null
  ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼'
  : '—'
const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('az-AZ') : '—'

const DOC_TYPE_CONFIG = {
  HESAB_FAKTURA: {
    label: 'Hesab-Faktura',
    cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  },
  TEHVIL_TESLIM_AKTI: {
    label: 'Akt',
    cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
  },
  ENGLISH_INVOICE: {
    label: 'Invoice',
    cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  },
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function DocumentsTab({ onCreateNew }) {
  const { confirm, ConfirmDialog } = useConfirm()
  const canDelete = useAuthStore(s => s.hasPermission)('ACCOUNTING', 'canDelete')

  const [docs, setDocs]           = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [page, setPage]           = useState(0)
  const [size]                    = useState(15)
  const [search, setSearch]       = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading]     = useState(true)
  const [detailDoc, setDetailDoc] = useState(null)
  const [downloading, setDownloading] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, size }
      if (search) params.q = search
      if (typeFilter) params.type = typeFilter
      const res = await accountingApi.getDocumentsPaged(params)
      setDocs(res.data.data || res.data)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [page, size, search, typeFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(0) }, [search, typeFilter])

  const handleDelete = async (doc) => {
    if (!(await confirm({
      title: 'Sənədi sil',
      message: `"${doc.documentNumber}" sənədi silinsin? Bu əməliyyat geri qaytarıla bilməz.`,
    }))) return
    try {
      await accountingApi.deleteDocument(doc.id)
      toast.success('Sənəd silindi')
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    }
  }

  const handleDownload = async (doc) => {
    setDownloading(doc.id)
    try {
      const res = await accountingApi.downloadDocumentPdf(doc.id)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.documentNumber + '.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('PDF yüklənə bilmədi')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div>
      <ConfirmDialog />

      {/* ── Filter sətiri ── */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Sənəd nömrəsi, müştəri..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Hamısı</option>
          <option value="HESAB_FAKTURA">Hesab-Faktura</option>
          <option value="TEHVIL_TESLIM_AKTI">Akt</option>
          <option value="ENGLISH_INVOICE">Invoice</option>
        </select>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Yeni Sənəd
        </button>
      </div>

      {/* ── Cədvəl ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">№</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Növ</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Müştəri</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarix</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Yekun məbləğ</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hərəkətlər</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={6} rows={5} />
              ) : docs.content.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Hələ heç bir sənəd yaradılmayıb"
                  description="Yeni sənəd yaratmaq üçün yuxarıdakı düyməni istifadə edin"
                />
              ) : docs.content.map(doc => {
                const typeCfg = DOC_TYPE_CONFIG[doc.documentType] || DOC_TYPE_CONFIG.HESAB_FAKTURA
                return (
                  <tr
                    key={doc.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-sm text-gray-800 dark:text-gray-200">
                        {doc.documentNumber}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx('px-2 py-0.5 rounded-md text-xs font-bold border', typeCfg.cls)}>
                        {typeCfg.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{doc.customerName}</p>
                        {doc.customerVoen && (
                          <p className="text-[10px] text-gray-400 font-mono">VÖEN: {doc.customerVoen}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{fmt(doc.documentDate)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-gray-800 dark:text-gray-200">{fmtMoney(doc.grandTotal)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        {/* PDF Yüklə */}
                        <button
                          onClick={() => handleDownload(doc)}
                          disabled={downloading === doc.id || !doc.pdfFilePath}
                          title="PDF Yüklə"
                          className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 disabled:opacity-40 transition-colors"
                        >
                          {downloading === doc.id
                            ? <RefreshCw size={14} className="animate-spin" />
                            : <Download size={14} />}
                        </button>
                        {/* Bax */}
                        <button
                          onClick={() => setDetailDoc(doc)}
                          title="Bax"
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                        {/* Sil */}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(doc)}
                            title="Sil"
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {docs.content.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            <span className="text-xs text-gray-500">{docs.totalElements} sənəd</span>
            <Pagination
              page={page}
              totalPages={docs.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailDoc && (
        <DocumentDetailModal
          docId={detailDoc.id}
          onClose={() => setDetailDoc(null)}
          onDeleted={() => { setDetailDoc(null); load() }}
        />
      )}
    </div>
  )
}
