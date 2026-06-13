import { useState, useEffect, useCallback } from 'react'
import { FileText, Search, Download, Eye, Trash2, RefreshCw } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'
import Pagination from '../../components/common/Pagination'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import DocumentDetailModal from './DocumentDetailModal'
import toast from 'react-hot-toast'
import { fmtDate } from '../../utils/date'
import { Pill, TableWrap, Select } from './_shared'
import { fmtMoney } from './_constants'

const DOC_TYPE_CONFIG = {
  HESAB_FAKTURA:      { label: 'Hesab-Faktura', tone: 'info' },
  TEHVIL_TESLIM_AKTI: { label: 'Akt',           tone: 'gold' },
  ENGLISH_INVOICE:    { label: 'Invoice',       tone: 'ok'   },
}

export default function DocumentsTab({ onCreateNew, refreshKey }) {
  const { confirm, ConfirmDialog } = useConfirm()
  const canDelete = useAuthStore(s => s.hasPermission)('ACCOUNTING', 'canDelete')

  const [docs, setDocs]               = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [page, setPage]               = useState(0)
  const [size]                        = useState(15)
  const [search, setSearch]           = useState('')
  const [typeFilter, setTypeFilter]   = useState('')
  const [loading, setLoading]         = useState(true)
  const [detailDoc, setDetailDoc]     = useState(null)
  const [downloading, setDownloading] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, size }
      if (search) params.q = search
      if (typeFilter) params.type = typeFilter
      const res = await accountingApi.getDocumentsPaged(params)
      setDocs(res.data.data || res.data)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [page, size, search, typeFilter])

  useEffect(() => { load() }, [load])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (refreshKey) load() }, [refreshKey])
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
      const typeLabel = DOC_TYPE_CONFIG[doc.documentType]?.label || 'Sened'
      const safeName = typeLabel.replace(/\s+/g, '-')
      a.download = `${safeName}-${doc.documentNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'PDF yüklənə bilmədi')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div>
      <ConfirmDialog />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-[360px]"
          style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '10px', padding: '0 12px', minHeight: '40px' }}>
          <Search size={14} style={{ color: 'var(--ces-mute2)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sənəd nömrəsi, müştəri..."
            className="flex-1 outline-none bg-transparent text-[13px]"
          />
        </div>
        <div className="min-w-[170px]">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Bütün növlər</option>
            <option value="HESAB_FAKTURA">Hesab-Faktura</option>
            <option value="TEHVIL_TESLIM_AKTI">Akt</option>
            <option value="ENGLISH_INVOICE">Invoice</option>
          </Select>
        </div>
      </div>

      <TableWrap>
        <div className="overflow-x-auto">
          <table className="ces-tbl w-full min-w-[760px]">
            <thead>
              <tr>
                <th>№</th>
                <th>Növ</th>
                <th>Müştəri</th>
                <th>Tarix</th>
                <th className="r">Yekun məbləğ</th>
                <th className="w-act"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={6} rows={6} />
              ) : docs.content.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Sənəd tapılmadı"
                  description={search || typeFilter ? 'Axtarış şərtlərini dəyişin' : 'Yeni sənəd yaratmaq üçün yuxarıdakı düyməni istifadə edin'}
                />
              ) : docs.content.map(doc => {
                const typeCfg = DOC_TYPE_CONFIG[doc.documentType] || DOC_TYPE_CONFIG.HESAB_FAKTURA
                return (
                  <tr key={doc.id}>
                    <td className="mono" style={{ color: 'var(--ces-ink)', fontSize: '12.5px', fontWeight: 600 }}>
                      {doc.documentNumber}
                    </td>
                    <td>
                      <Pill tone={typeCfg.tone} sm>{typeCfg.label}</Pill>
                    </td>
                    <td>
                      <p className="text-[13.5px] font-bold" style={{ color: 'var(--ces-ink)' }}>{doc.customerName || '—'}</p>
                      {doc.customerVoen && (
                        <p className="text-[10.5px] mono" style={{ color: 'var(--ces-mute2)' }}>VÖEN: {doc.customerVoen}</p>
                      )}
                    </td>
                    <td style={{ color: 'var(--ces-muted)', fontSize: '12px' }}>{fmtDate(doc.documentDate)}</td>
                    <td className="r">
                      <span className="text-[14px] font-bold num" style={{ color: 'var(--ces-graphite-900)' }}>
                        {fmtMoney(doc.grandTotal)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleDownload(doc)}
                          disabled={downloading === doc.id || !doc.pdfFilePath}
                          title="PDF Yüklə"
                          className="ces-row-act ok"
                          style={{ opacity: (downloading === doc.id || !doc.pdfFilePath) ? 0.4 : 1 }}
                        >
                          {downloading === doc.id
                            ? <RefreshCw size={14} className="animate-spin" />
                            : <Download size={14} />}
                        </button>
                        <button onClick={() => setDetailDoc(doc)} className="ces-row-act info" title="Bax">
                          <Eye size={14} />
                        </button>
                        {canDelete && (
                          <button onClick={() => handleDelete(doc)} className="ces-row-act danger" title="Sil">
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

        {docs.content.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--ces-line)', background: 'var(--ces-graphite-50)' }}>
            <span className="text-[12px]" style={{ color: 'var(--ces-muted)' }}>{docs.totalElements} sənəd</span>
            <Pagination
              page={page}
              totalPages={docs.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </TableWrap>

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
