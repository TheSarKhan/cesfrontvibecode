import { useState, useEffect } from 'react'
import { FileText, Download, Trash2, RefreshCw, CheckCircle } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { useAuthStore } from '../../store/authStore'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import toast from 'react-hot-toast'
import { fmtDate } from '../../utils/date'
import { Pill, ModalShell } from './_shared'
import { fmtMoney } from './_constants'

const DOC_TYPE_LABELS = {
  HESAB_FAKTURA:      { label: 'Hesab-Faktura',      tone: 'info' },
  TEHVIL_TESLIM_AKTI: { label: 'Təhvil-Təslim Aktı', tone: 'gold' },
  ENGLISH_INVOICE:    { label: 'English Invoice',    tone: 'ok'   },
}

export default function DocumentDetailModal({ docId, onClose, onDeleted }) {
  useEscapeKey(onClose)
  const { confirm, ConfirmDialog } = useConfirm()
  const canDelete = useAuthStore(s => s.hasPermission)('ACCOUNTING', 'canDelete')

  const [doc, setDoc]                   = useState(null)
  const [loading, setLoading]           = useState(true)
  const [downloading, setDownloading]   = useState(false)
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
      const typeLabel = DOC_TYPE_LABELS[doc?.documentType]?.label || 'Sənəd'
      const safeName = typeLabel.replace(/\s+/g, '-')
      a.download = `${safeName}-${doc?.documentNumber || ''}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'PDF yüklənə bilmədi')
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
    <>
      <ConfirmDialog />
      <ModalShell
        icon={FileText}
        eyebrow="Sənəd"
        title={loading ? 'Yüklənir...' : `#${doc?.documentNumber || ''}`}
        subtitle={typeCfg?.label}
        onClose={onClose}
        tone="gold"
        maxWidth="720px"
        footer={
          !loading && doc && (
            <>
              {canDelete && (
                <button onClick={handleDelete} className="ces-btn ces-btn-ghost ces-btn-sm" style={{ color: 'var(--ces-danger)' }}>
                  <Trash2 size={13} /> Sil
                </button>
              )}
              <button onClick={handleRegenerate} disabled={regenerating} className="ces-btn ces-btn-outline ces-btn-sm">
                <RefreshCw size={13} className={regenerating ? 'animate-spin' : ''} /> Yenilə
              </button>
              <button onClick={handleDownload} disabled={downloading || !doc.pdfFilePath} className="ces-btn ces-btn-primary">
                {downloading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                PDF Yüklə
              </button>
            </>
          )
        }
      >
        <div className="p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 rounded-[10px] animate-pulse" style={{ background: 'var(--ces-graphite-50)' }} />
              ))}
            </div>
          ) : !doc ? (
            <p className="text-center py-12 text-[13px]" style={{ color: 'var(--ces-mute2)' }}>Sənəd tapılmadı</p>
          ) : (
            <div className="space-y-5">
              {/* Header info */}
              <div className="flex items-center gap-2">
                {typeCfg && <Pill tone={typeCfg.tone} sm>{typeCfg.label}</Pill>}
                {doc.pdfFilePath ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--ces-ok)' }}>
                    <CheckCircle size={12} /> PDF mövcuddur
                  </span>
                ) : (
                  <span className="text-[11px]" style={{ color: 'var(--ces-mute2)' }}>PDF mövcud deyil</span>
                )}
              </div>

              {/* Customer + Document info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[.16em] mb-1.5" style={{ color: 'var(--ces-muted)' }}>Müştəri</p>
                  <p className="text-[14px] font-bold" style={{ color: 'var(--ces-ink)' }}>{doc.customerName}</p>
                  {doc.customerVoen && (
                    <p className="text-[11.5px] mono mt-1" style={{ color: 'var(--ces-mute2)' }}>VÖEN: {doc.customerVoen}</p>
                  )}
                  {doc.customerAddress && (
                    <p className="text-[12px] mt-1" style={{ color: 'var(--ces-muted)' }}>{doc.customerAddress}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[.16em] mb-1.5" style={{ color: 'var(--ces-muted)' }}>Sənəd məlumatları</p>
                  <div className="space-y-1">
                    <p className="text-[12.5px]" style={{ color: 'var(--ces-muted)' }}>
                      Tarix: <span className="font-bold" style={{ color: 'var(--ces-ink)' }}>{fmtDate(doc.documentDate)}</span>
                    </p>
                    {doc.contractNumber && (
                      <p className="text-[12.5px]" style={{ color: 'var(--ces-muted)' }}>
                        Müqavilə №: <span className="font-bold" style={{ color: 'var(--ces-ink)' }}>{doc.contractNumber}</span>
                      </p>
                    )}
                    {doc.contractDate && (
                      <p className="text-[12.5px]" style={{ color: 'var(--ces-muted)' }}>
                        Müqavilə tarixi: <span className="font-bold" style={{ color: 'var(--ces-ink)' }}>{fmtDate(doc.contractDate)}</span>
                      </p>
                    )}
                    {doc.addendumNumbers?.length > 0 && (
                      <p className="text-[12.5px]" style={{ color: 'var(--ces-muted)' }}>
                        Əlavələr: <span className="font-bold" style={{ color: 'var(--ces-ink)' }}>{doc.addendumNumbers.map(n => `${n} saylı`).join(', ')}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Service lines */}
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[.16em] mb-2" style={{ color: 'var(--ces-muted)' }}>Xidmətlər</p>
                <div
                  className="overflow-hidden"
                  style={{ border: '1px solid var(--ces-line)', borderRadius: '12px', background: 'var(--ces-surface)' }}
                >
                  <div
                    className="grid grid-cols-[3fr_1fr_1fr_1.5fr_1.5fr] text-[10.5px] font-bold uppercase tracking-[.14em] px-4 py-2.5"
                    style={{ background: 'var(--ces-graphite-50)', color: 'var(--ces-muted)' }}
                  >
                    <span>Xidmət</span>
                    <span>Vahid</span>
                    <span>Miqdar</span>
                    <span className="text-right">Vahid qiymət</span>
                    <span className="text-right">Cəmi</span>
                  </div>
                  {(doc.lines || []).map((line) => (
                    <div
                      key={line.id}
                      className="grid grid-cols-[3fr_1fr_1fr_1.5fr_1.5fr] px-4 py-2.5 text-[13px]"
                      style={{ borderTop: '1px solid var(--ces-line)' }}
                    >
                      <span style={{ color: 'var(--ces-ink)' }}>{line.description}</span>
                      <span style={{ color: 'var(--ces-muted)' }}>{line.unit}</span>
                      <span className="num" style={{ color: 'var(--ces-muted)' }}>{line.quantity}</span>
                      <span className="text-right num" style={{ color: 'var(--ces-muted)' }}>{fmtMoney(line.unitPrice)}</span>
                      <span className="text-right font-bold num" style={{ color: 'var(--ces-ink)' }}>{fmtMoney(line.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="ml-auto w-full max-w-xs">
                <div
                  className="space-y-2 p-4"
                  style={{ background: 'var(--ces-graphite-50)', border: '1px solid var(--ces-line)', borderRadius: '12px' }}
                >
                  <div className="flex justify-between text-[13px]">
                    <span style={{ color: 'var(--ces-muted)' }}>Cəmi:</span>
                    <span className="font-bold num" style={{ color: 'var(--ces-ink)' }}>{fmtMoney(doc.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span style={{ color: 'var(--ces-muted)' }}>ƏDV ({parseFloat(doc.vatRate || 0).toFixed(0)}%):</span>
                    <span className="font-bold num" style={{ color: 'var(--ces-ink)' }}>{fmtMoney(doc.vatAmount)}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2" style={{ borderTop: '1px solid var(--ces-line)' }}>
                    <span className="text-[12.5px] font-bold uppercase tracking-[.12em]" style={{ color: 'var(--ces-muted)' }}>Yekun:</span>
                    <span className="text-[18px] font-extrabold num" style={{ color: 'var(--ces-gold-700)' }}>{fmtMoney(doc.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {doc.notes && (
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[.16em] mb-1.5" style={{ color: 'var(--ces-muted)' }}>Qeyd</p>
                  <p
                    className="text-[12.5px] p-3"
                    style={{ color: 'var(--ces-ink)', background: 'var(--ces-graphite-50)', border: '1px solid var(--ces-line)', borderRadius: '10px' }}
                  >
                    {doc.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </ModalShell>
    </>
  )
}
