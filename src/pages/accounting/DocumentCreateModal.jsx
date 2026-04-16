import { useState, useEffect, useMemo, useCallback } from 'react'
import { X, FileText, ChevronRight, ChevronLeft, Plus, Trash2, RefreshCw, Check } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import { customersApi } from '../../api/customers'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

/* ─── Sabitlər ──────────────────────────────────────────────────────────────── */
const DOC_TYPES = [
  {
    id: 'HESAB_FAKTURA',
    label: 'Hesab-Faktura',
    desc: 'AZ dilində rəsmi hesab-faktura',
    color: 'blue',
  },
  {
    id: 'TEHVIL_TESLIM_AKTI',
    label: 'Təhvil-Təslim Aktı',
    desc: 'İki tərəf imza bloku ilə akt',
    color: 'purple',
  },
  {
    id: 'ENGLISH_INVOICE',
    label: 'English Invoice',
    desc: 'International invoice in English',
    color: 'green',
  },
]

const COLOR_MAP = {
  blue:   { card: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',    badge: 'bg-blue-500 text-white' },
  purple: { card: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20', badge: 'bg-purple-500 text-white' },
  green:  { card: 'border-green-500 bg-green-50 dark:bg-green-900/20', badge: 'bg-green-500 text-white' },
}

const fmtMoney = (v) => v != null
  ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼'
  : '—'
const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('az-AZ') : '—'

const emptyLine = () => ({ description: '', unit: 'gün', quantity: '1', unitPrice: '', sourceInvoiceId: null })

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function DocumentCreateModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1)

  // Step 1
  const [docType, setDocType]         = useState(null)
  const [source, setSource]           = useState('invoices')  // 'invoices' | 'manual'
  const [allInvoices, setAllInvoices] = useState([])
  const [selectedInvIds, setSelectedInvIds] = useState([])
  const [lockedCustomerId, setLockedCustomerId] = useState(null)
  const [loadingInvoices, setLoadingInvoices]   = useState(false)
  const [previewLoading, setPreviewLoading]     = useState(false)

  // Step 2
  const [lines, setLines]       = useState([emptyLine()])
  const [contractNumber, setContractNumber] = useState('')
  const [contractDate, setContractDate]     = useState('')
  const [notes, setNotes]       = useState('')
  const [customerId, setCustomerId]   = useState(null)
  const [customers, setCustomers]     = useState([])
  const [vatRate, setVatRate]         = useState(18)
  const [saving, setSaving]           = useState(false)

  // ─── Qaimələri yüklə ───────────────────────────────────────────────────────
  useEffect(() => {
    if (source === 'invoices') {
      setLoadingInvoices(true)
      accountingApi.getAllPaged({ page: 0, size: 200, status: 'APPROVED', type: 'INCOME' })
        .then(res => {
          const data = res.data.data || res.data
          setAllInvoices(data.content || [])
        })
        .catch(() => {})
        .finally(() => setLoadingInvoices(false))
    }
  }, [source])

  // ─── Müştəriləri yüklə (manual seçim üçün) ────────────────────────────────
  useEffect(() => {
    customersApi.getAll().then(res => {
      const data = res.data.data || res.data || []
      setCustomers(Array.isArray(data) ? data : data.content || [])
    }).catch(() => {})
  }, [])

  // ─── ƏDV rate yüklə ────────────────────────────────────────────────────────
  useEffect(() => {
    // Config-dən götür (isteğe bağlı — fallback 18%)
    import('../../api/config').then(m => {
      m.configApi?.getByCategory?.('DOCUMENT_VAT_RATE')
        .then(res => {
          const items = res.data.data || res.data || []
          if (items.length > 0) {
            const v = parseFloat(items[0].value)
            if (!isNaN(v)) setVatRate(v)
          }
        }).catch(() => {})
    }).catch(() => {})
  }, [])

  // ─── Qaimə seçimi ─────────────────────────────────────────────────────────
  const toggleInvoice = (inv) => {
    const id = inv.id
    if (selectedInvIds.includes(id)) {
      setSelectedInvIds(prev => prev.filter(x => x !== id))
      if (selectedInvIds.length <= 1) setLockedCustomerId(null)
    } else {
      // İlk seçim → müştərini kilid
      const custId = inv.project?.customer?.id ?? inv.customerId ?? null
      if (lockedCustomerId === null && selectedInvIds.length === 0) {
        setLockedCustomerId(custId)
        setCustomerId(custId)
      }
      setSelectedInvIds(prev => [...prev, id])
    }
  }

  // ─── Mövcud müştəriyə uyğun qaimələr ─────────────────────────────────────
  const availableInvoices = useMemo(() => {
    if (!lockedCustomerId) return allInvoices
    return allInvoices.filter(inv => {
      const custId = inv.project?.customer?.id ?? inv.customerId ?? null
      return custId === lockedCustomerId
    })
  }, [allInvoices, lockedCustomerId])

  // ─── Növbəti addıma keç ────────────────────────────────────────────────────
  const handleStep1Next = async () => {
    if (!docType) { toast.error('Sənəd növü seçin'); return }
    if (source === 'invoices') {
      if (selectedInvIds.length === 0) { toast.error('Ən azı bir qaimə seçin'); return }
      setPreviewLoading(true)
      try {
        const res = await accountingApi.previewDocumentLines({ invoiceIds: selectedInvIds })
        const previewLines = res.data.data || res.data || []
        setLines(previewLines.map(l => ({
          description: l.description || '',
          unit: l.unit || 'gün',
          quantity: String(l.quantity || 1),
          unitPrice: String(l.unitPrice || ''),
          sourceInvoiceId: l.sourceInvoiceId || null,
        })))
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Ön baxış yüklənə bilmədi')
        setPreviewLoading(false)
        return
      } finally {
        setPreviewLoading(false)
      }
    } else {
      // Manual — boş sətir
      setLines([emptyLine()])
    }
    setStep(2)
  }

  // ─── Hesablama ─────────────────────────────────────────────────────────────
  const subtotal = useMemo(() => {
    return lines.reduce((sum, l) => {
      const q = parseFloat(l.quantity) || 0
      const p = parseFloat(l.unitPrice) || 0
      return sum + q * p
    }, 0)
  }, [lines])

  const vatAmount  = useMemo(() => (subtotal * vatRate / 100), [subtotal, vatRate])
  const grandTotal = useMemo(() => subtotal + vatAmount, [subtotal, vatAmount])

  // ─── Sətir əməliyyatları ───────────────────────────────────────────────────
  const updateLine = (idx, field, value) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  const addLine = () => setLines(prev => [...prev, emptyLine()])

  const removeLine = (idx) => {
    if (lines.length <= 1) return
    setLines(prev => prev.filter((_, i) => i !== idx))
  }

  // ─── Yarat ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!customerId && source === 'manual') { toast.error('Müştəri seçin'); return }
    const finalCustomerId = source === 'invoices' ? lockedCustomerId : customerId
    if (!finalCustomerId) { toast.error('Müştəri tapılmadı'); return }

    const validLines = lines.filter(l => l.description.trim() && parseFloat(l.unitPrice) > 0)
    if (validLines.length === 0) { toast.error('Ən azı bir etibarlı sətir lazımdır'); return }

    setSaving(true)
    try {
      const payload = {
        documentType: docType,
        customerId: finalCustomerId,
        contractNumber: contractNumber || null,
        contractDate: contractDate || null,
        notes: notes || null,
        sourceInvoiceIds: selectedInvIds.length > 0 ? selectedInvIds : null,
        lines: validLines.map((l, i) => ({
          description: l.description.trim(),
          unit: l.unit || 'ədəd',
          quantity: parseFloat(l.quantity) || 1,
          unitPrice: parseFloat(l.unitPrice) || 0,
          sourceInvoiceId: l.sourceInvoiceId || null,
        })),
      }
      await accountingApi.createDocument(payload)
      toast.success('Sənəd yaradıldı!')
      onCreated?.()
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Sənəd yaradıla bilmədi')
    } finally {
      setSaving(false)
    }
  }

  /* ─── Render ── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-600 to-amber-500">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-white" />
            <div>
              <h2 className="text-base font-bold text-white">Yeni Sənəd Yarat</h2>
              <p className="text-xs text-amber-100">Addım {step} / 2</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── Progress bar ── */}
        <div className="h-1 bg-amber-100 dark:bg-gray-700">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${(step / 2) * 100}%` }}
          />
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ═══ ADDIM 1 ═══ */}
          {step === 1 && (
            <div className="p-6 space-y-6">

              {/* Sənəd növü seçimi */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Sənəd Növü</p>
                <div className="grid grid-cols-3 gap-3">
                  {DOC_TYPES.map(dt => {
                    const selected = docType === dt.id
                    const colors = COLOR_MAP[dt.color]
                    return (
                      <button
                        key={dt.id}
                        onClick={() => setDocType(dt.id)}
                        className={clsx(
                          'relative p-4 rounded-xl border-2 text-left transition-all',
                          selected
                            ? colors.card + ' border-opacity-100 shadow-md'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-gray-800'
                        )}
                      >
                        {selected && (
                          <span className={clsx('absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center', colors.badge)}>
                            <Check size={11} />
                          </span>
                        )}
                        <FileText size={18} className={selected ? `text-${dt.color}-600` : 'text-gray-400'} />
                        <p className={clsx('mt-2 font-semibold text-sm', selected ? `text-${dt.color}-700 dark:text-${dt.color}-400` : 'text-gray-700 dark:text-gray-300')}>
                          {dt.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{dt.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Mənbə seçimi */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Mənbə</p>
                <div className="flex gap-3">
                  {[
                    { id: 'invoices', label: 'Qaimələrdən', desc: 'APPROVED qaimələrdən avtomatik' },
                    { id: 'manual',   label: 'Manual',      desc: 'Sətirləri özünüz daxil edin' },
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSource(s.id); setSelectedInvIds([]); setLockedCustomerId(null) }}
                      className={clsx(
                        'flex-1 p-3 rounded-xl border-2 text-left transition-all',
                        source === s.id
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-gray-800'
                      )}
                    >
                      <p className={clsx('font-semibold text-sm', source === s.id ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300')}>
                        {s.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Qaimə siyahısı */}
              {source === 'invoices' && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                    Qaiməlr seçin
                    {lockedCustomerId && (
                      <span className="ml-2 text-amber-600 normal-case font-normal">
                        — müştəri kilidlənib
                      </span>
                    )}
                  </p>
                  {loadingInvoices ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Yüklənir...</div>
                  ) : allInvoices.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Təsdiqlənmiş gəlir qaiməsi tapılmadı</div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {allInvoices.map(inv => {
                        const selected = selectedInvIds.includes(inv.id)
                        const custId = inv.project?.customer?.id ?? inv.customerId ?? null
                        const disabled = lockedCustomerId !== null && custId !== lockedCustomerId && !selected
                        return (
                          <button
                            key={inv.id}
                            disabled={disabled}
                            onClick={() => toggleInvoice(inv)}
                            className={clsx(
                              'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
                              selected
                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                : disabled
                                  ? 'border-gray-100 dark:border-gray-700 opacity-40 cursor-not-allowed bg-gray-50 dark:bg-gray-800'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-amber-300 bg-white dark:bg-gray-800'
                            )}
                          >
                            <div className={clsx(
                              'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                              selected ? 'bg-amber-500 border-amber-500' : 'border-gray-300'
                            )}>
                              {selected && <Check size={10} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                                {inv.invoiceNumber || `#${inv.id}`}
                                {inv.equipmentName && ` — ${inv.equipmentName}`}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {inv.companyName || inv.project?.customer?.companyName || ''}
                                {inv.periodMonth && ` · ${inv.periodMonth}/${inv.periodYear}`}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-amber-600 shrink-0">
                              {fmtMoney(inv.amount)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ ADDIM 2 ═══ */}
          {step === 2 && (
            <div className="p-6 space-y-5">

              {/* Manual müştəri seçimi */}
              {source === 'manual' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                    Müştəri *
                  </label>
                  <select
                    value={customerId || ''}
                    onChange={e => setCustomerId(Number(e.target.value) || null)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Müştəri seçin...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.companyName}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Müqavilə sahələri (Hesab-Faktura üçün) */}
              {(docType === 'HESAB_FAKTURA' || docType === 'ENGLISH_INVOICE') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                      Müqavilə №
                    </label>
                    <input
                      value={contractNumber}
                      onChange={e => setContractNumber(e.target.value)}
                      placeholder="MÜQ-2025-001"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                      Müqavilə tarixi
                    </label>
                    <input
                      type="date"
                      value={contractDate}
                      onChange={e => setContractDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Sətir cədvəli */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Xidmət Sətirləri</p>
                  <button
                    onClick={addLine}
                    className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-semibold"
                  >
                    <Plus size={13} /> Sətir əlavə et
                  </button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[3fr_1fr_1fr_1.5fr_1.5fr_auto] gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                    <span>Təsvir</span>
                    <span>Vahid</span>
                    <span>Miqdar</span>
                    <span>Vahid qiymət</span>
                    <span className="text-right">Cəmi</span>
                    <span></span>
                  </div>

                  {lines.map((line, idx) => {
                    const total = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0)
                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-[3fr_1fr_1fr_1.5fr_1.5fr_auto] gap-1 items-center px-3 py-2 border-t border-gray-200 dark:border-gray-700"
                      >
                        <input
                          value={line.description}
                          onChange={e => updateLine(idx, 'description', e.target.value)}
                          placeholder="Xidmətin adı..."
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <input
                          value={line.unit}
                          onChange={e => updateLine(idx, 'unit', e.target.value)}
                          placeholder="gün"
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <input
                          type="number"
                          value={line.quantity}
                          onChange={e => updateLine(idx, 'quantity', e.target.value)}
                          min="0"
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <input
                          type="number"
                          value={line.unitPrice}
                          onChange={e => updateLine(idx, 'unitPrice', e.target.value)}
                          min="0"
                          placeholder="0.00"
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-right">
                          {fmtMoney(total)}
                        </span>
                        <button
                          onClick={() => removeLine(idx)}
                          disabled={lines.length <= 1}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 disabled:opacity-30 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Qeyd */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Qeyd</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Əlavə qeydlər..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Maliyyə xülasəsi */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cəmi (ƏDV-siz):</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{fmtMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ƏDV ({vatRate}%):</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{fmtMoney(vatAmount)}</span>
                </div>
                <div className="flex justify-between text-base pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span className="font-bold text-gray-700 dark:text-gray-300">YEKUNa:</span>
                  <span className="font-bold text-amber-600 text-lg">{fmtMoney(grandTotal)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft size={16} />
            {step === 1 ? 'Ləğv et' : 'Geri'}
          </button>

          {step === 1 && (
            <button
              onClick={handleStep1Next}
              disabled={previewLoading || !docType}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {previewLoading ? <RefreshCw size={15} className="animate-spin" /> : null}
              Davam et
              <ChevronRight size={16} />
            </button>
          )}

          {step === 2 && (
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {saving ? <RefreshCw size={15} className="animate-spin" /> : null}
              Yarat
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
