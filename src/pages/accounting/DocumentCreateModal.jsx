import { useState, useEffect, useMemo, useRef } from 'react'
import { FileText, ChevronRight, ChevronLeft, Plus, Trash2, RefreshCw, Check, X } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import { customersApi } from '../../api/customers'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { Field, Input, Textarea, Select, ModalShell } from './_shared'
import { fmtMoney } from './_constants'
import { onlyDecimal, decimalKeyDown, makePasteHandler } from '../../utils/validation'

const DOC_TYPES = [
  { id: 'HESAB_FAKTURA',      label: 'Hesab-Faktura',      desc: 'AZ dilində rəsmi hesab-faktura' },
  { id: 'TEHVIL_TESLIM_AKTI', label: 'Təhvil-Təslim Aktı', desc: 'İki tərəf imza bloku ilə akt' },
  { id: 'ENGLISH_INVOICE',    label: 'English Invoice',    desc: 'International invoice in English' },
]

const emptyLine = (isAkt = false) => ({
  description: '', unit: isAkt ? 'xidmət' : 'ədəd', quantity: '1', unitPrice: '', sourceInvoiceId: null,
})

export default function DocumentCreateModal({ onClose, onCreated }) {
  useEscapeKey(onClose)
  const [step, setStep] = useState(1)
  const composingRef = useRef(false)

  // Step 1
  const [docType, setDocType]                   = useState(null)
  const [source, setSource]                     = useState('invoices')
  const [allInvoices, setAllInvoices]           = useState([])
  const [selectedInvIds, setSelectedInvIds]     = useState([])
  const [lockedCustomerId, setLockedCustomerId] = useState(null)
  const [loadingInvoices, setLoadingInvoices]   = useState(false)
  const [previewLoading, setPreviewLoading]     = useState(false)

  // Step 2
  const [lines, setLines]                       = useState([emptyLine()])
  const [contractNumber, setContractNumber]     = useState('')
  const [contractDate, setContractDate]         = useState('')
  const [notes, setNotes]                       = useState('')
  const [customerId, setCustomerId]             = useState(null)
  const [customers, setCustomers]               = useState([])
  const [vatRate, setVatRate]                   = useState(18)
  const [saving, setSaving]                     = useState(false)
  const [addendums, setAddendums]               = useState([])
  const [addendumInput, setAddendumInput]       = useState('')
  const [banks, setBanks]                       = useState([])
  const [selectedBankIdx, setSelectedBankIdx]   = useState(0)

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

  useEffect(() => {
    customersApi.getAll().then(res => {
      const data = res.data.data || res.data || []
      setCustomers(Array.isArray(data) ? data : data.content || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    import('../../api/config').then(m => {
      m.configApi?.getByCategory?.('DOCUMENT_VAT_RATE')
        .then(res => {
          const items = res.data.data || res.data || []
          if (items.length > 0) {
            const v = parseFloat(items[0].value)
            if (!isNaN(v)) setVatRate(v)
          }
        }).catch(() => {})

      import('../../api/banks').then(b => {
        b.banksApi.getAll().then(res => {
          const list = res.data?.data || res.data || []
          setBanks(list)
          if (list.length > 0) setSelectedBankIdx(0)
        }).catch(() => {})
      }).catch(() => {})
    }).catch(() => {})
  }, [])

  const toggleInvoice = (inv) => {
    const id = inv.id
    if (selectedInvIds.includes(id)) {
      setSelectedInvIds(prev => prev.filter(x => x !== id))
      if (selectedInvIds.length <= 1) setLockedCustomerId(null)
    } else {
      const custId = inv.customerId ?? null
      if (lockedCustomerId === null && selectedInvIds.length === 0) {
        setLockedCustomerId(custId)
        setCustomerId(custId)
      }
      setSelectedInvIds(prev => [...prev, id])
    }
  }

  const availableInvoices = useMemo(() => {
    if (!lockedCustomerId) return allInvoices
    return allInvoices.filter(inv => (inv.customerId ?? null) === lockedCustomerId)
  }, [allInvoices, lockedCustomerId])

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
      setLines([emptyLine(docType === 'TEHVIL_TESLIM_AKTI')])
    }
    setStep(2)
  }

  const subtotal   = useMemo(() => lines.reduce((s, l) => s + (parseFloat(l.unitPrice) || 0), 0), [lines])
  const vatAmount  = useMemo(() => (subtotal * vatRate / 100), [subtotal, vatRate])
  const grandTotal = useMemo(() => subtotal + vatAmount, [subtotal, vatAmount])

  const updateLine = (idx, field, value) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }
  const addLine = () => setLines(prev => [...prev, emptyLine(docType === 'TEHVIL_TESLIM_AKTI')])
  const removeLine = (idx) => {
    if (lines.length <= 1) return
    setLines(prev => prev.filter((_, i) => i !== idx))
  }

  const addAddendum = () => {
    const n = parseInt(addendumInput)
    if (n > 0 && !addendums.includes(n)) {
      setAddendums(prev => [...prev, n].sort((a, b) => a - b))
      setAddendumInput('')
    }
  }

  const handleCreate = async () => {
    if (!customerId && source === 'manual') { toast.error('Müştəri seçin'); return }
    const finalCustomerId = source === 'invoices' ? lockedCustomerId : customerId
    if (!finalCustomerId) { toast.error('Müştəri tapılmadı'); return }

    const validLines = lines.filter(l => l.description.trim() && parseFloat(l.unitPrice) > 0)
    if (validLines.length === 0) { toast.error('Ən azı bir etibarlı sətir lazımdır'); return }

    setSaving(true)
    try {
      const selectedBank = banks[selectedBankIdx] || null
      const payload = {
        documentType:     docType,
        customerId:       finalCustomerId,
        contractNumber:   contractNumber || null,
        contractDate:     contractDate   || null,
        addendumNumbers:  addendums.length > 0 ? addendums : null,
        notes:            notes || null,
        sourceInvoiceIds: selectedInvIds.length > 0 ? selectedInvIds : null,
        bankName:  selectedBank?.bankName             || null,
        bankCode:  selectedBank?.bankCode             || null,
        bankSwift: selectedBank?.swift                || null,
        bankIban:  selectedBank?.iban                 || null,
        bankMh:    selectedBank?.correspondentAccount || null,
        bankHh:    selectedBank?.settlementAccount    || null,
        lines: validLines.map(l => ({
          description:     l.description.trim(),
          unit:            l.unit || 'ədəd',
          quantity:        1,
          unitPrice:       parseFloat(l.unitPrice) || 0,
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
    <ModalShell
      icon={FileText}
      eyebrow={`Addım ${step} / 2`}
      title="Yeni Sənəd Yarat"
      subtitle={step === 1 ? 'Sənəd növünü və mənbəni seçin' : 'Sətirləri və müqavilə məlumatlarını daxil edin'}
      onClose={onClose}
      tone="gold"
      maxWidth="820px"
      footer={
        <>
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="ces-btn ces-btn-ghost ces-btn-sm"
          >
            <ChevronLeft size={14} />
            {step === 1 ? 'Ləğv et' : 'Geri'}
          </button>
          {step === 1 ? (
            <button onClick={handleStep1Next} disabled={previewLoading || !docType} className="ces-btn ces-btn-primary">
              {previewLoading && <RefreshCw size={14} className="animate-spin" />}
              Davam et
              <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={handleCreate} disabled={saving} className="ces-btn ces-btn-primary">
              {saving && <RefreshCw size={14} className="animate-spin" />}
              Yarat
            </button>
          )}
        </>
      }
    >
      {/* Progress bar */}
      <div className="h-1" style={{ background: 'var(--ces-graphite-50)' }}>
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${(step / 2) * 100}%`, background: 'var(--ces-gold)' }}
        />
      </div>

      {step === 1 && (
        <div className="p-6 space-y-6">
          {/* Doc type */}
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[.16em] mb-3" style={{ color: 'var(--ces-muted)' }}>Sənəd növü</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DOC_TYPES.map(dt => {
                const selected = docType === dt.id
                return (
                  <button
                    key={dt.id}
                    onClick={() => setDocType(dt.id)}
                    className="relative p-4 text-left transition-all"
                    style={{
                      background: selected ? 'var(--ces-gold-100)' : 'var(--ces-surface)',
                      border: `2px solid ${selected ? 'var(--ces-gold)' : 'var(--ces-line)'}`,
                      borderRadius: '12px',
                      boxShadow: selected ? '0 4px 12px rgba(200,147,42,.15)' : 'none',
                    }}
                  >
                    {selected && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full grid place-items-center"
                        style={{ background: 'var(--ces-gold)', color: 'var(--ces-on-gold)' }}>
                        <Check size={11} />
                      </span>
                    )}
                    <FileText size={20} style={{ color: selected ? 'var(--ces-gold-700)' : 'var(--ces-mute2)' }} />
                    <p className="mt-2 font-bold text-[13.5px]" style={{ color: selected ? 'var(--ces-gold-700)' : 'var(--ces-ink)' }}>
                      {dt.label}
                    </p>
                    <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--ces-mute2)' }}>{dt.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Source */}
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[.16em] mb-3" style={{ color: 'var(--ces-muted)' }}>Mənbə</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'invoices', label: 'Qaimələrdən', desc: 'Təsdiqlənmiş qaimələrdən avtomatik' },
                { id: 'manual',   label: 'Manual',      desc: 'Sətirləri özünüz daxil edin' },
              ].map(s => {
                const selected = source === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => { setSource(s.id); setSelectedInvIds([]); setLockedCustomerId(null) }}
                    className="p-3 text-left transition-all"
                    style={{
                      background: selected ? 'var(--ces-graphite-50)' : 'var(--ces-surface)',
                      border: `2px solid ${selected ? 'var(--ces-graphite)' : 'var(--ces-line)'}`,
                      borderRadius: '12px',
                    }}
                  >
                    <p className="font-bold text-[13.5px]" style={{ color: selected ? 'var(--ces-graphite-900)' : 'var(--ces-ink)' }}>
                      {s.label}
                    </p>
                    <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--ces-mute2)' }}>{s.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Invoice list */}
          {source === 'invoices' && (
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[.16em] mb-3" style={{ color: 'var(--ces-muted)' }}>
                Qaimələr seçin
                {lockedCustomerId && (
                  <span className="ml-2 font-normal normal-case" style={{ color: 'var(--ces-gold-700)' }}>
                    — müştəri kilidlənib
                  </span>
                )}
              </p>
              {loadingInvoices ? (
                <div className="text-center py-8 text-[13px]" style={{ color: 'var(--ces-mute2)' }}>Yüklənir...</div>
              ) : allInvoices.length === 0 ? (
                <div className="text-center py-8 text-[13px]" style={{ color: 'var(--ces-mute2)' }}>
                  Təsdiqlənmiş gəlir qaiməsi tapılmadı
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {availableInvoices.map(inv => {
                    const selected = selectedInvIds.includes(inv.id)
                    const custId = inv.customerId ?? null
                    const disabled = lockedCustomerId !== null && custId !== lockedCustomerId && !selected
                    return (
                      <button
                        key={inv.id}
                        disabled={disabled}
                        onClick={() => toggleInvoice(inv)}
                        className="w-full flex items-center gap-3 p-3 text-left transition-all"
                        style={{
                          background: selected ? 'var(--ces-gold-50)' : disabled ? 'var(--ces-graphite-50)' : 'var(--ces-surface)',
                          border: `1.5px solid ${selected ? 'var(--ces-gold)' : 'var(--ces-line)'}`,
                          borderRadius: '10px',
                          opacity: disabled ? 0.5 : 1,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded grid place-items-center flex-none"
                          style={{
                            background: selected ? 'var(--ces-gold)' : 'transparent',
                            border: `2px solid ${selected ? 'var(--ces-gold)' : 'var(--ces-line)'}`,
                          }}
                        >
                          {selected && <Check size={10} style={{ color: 'var(--ces-on-gold)' }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-bold truncate" style={{ color: 'var(--ces-ink)' }}>
                            {inv.invoiceNumber || `#${inv.id}`}
                            {inv.equipmentName && ` — ${inv.equipmentName}`}
                          </p>
                          <p className="text-[10.5px]" style={{ color: 'var(--ces-mute2)' }}>
                            {inv.companyName || inv.project?.customer?.companyName || ''}
                            {inv.periodMonth && ` · ${inv.periodMonth}/${inv.periodYear}`}
                          </p>
                        </div>
                        <span className="text-[12.5px] font-bold num flex-none" style={{ color: 'var(--ces-gold-700)' }}>
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

      {step === 2 && (
        <div className="p-6 space-y-5">
          {source === 'manual' && (
            <Field label="Müştəri" required>
              <Select value={customerId || ''} onChange={(e) => setCustomerId(Number(e.target.value) || null)}>
                <option value="">Müştəri seçin...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </Select>
            </Field>
          )}

          {banks.length > 0 && (
            <Field label="Bank" required>
              {banks.length === 1 ? (
                <div className="flex items-center gap-3 p-3"
                  style={{ background: 'var(--ces-gold-100)', border: '1px solid var(--ces-gold)', borderRadius: '11px' }}>
                  <div className="w-2 h-2 rounded-full flex-none" style={{ background: 'var(--ces-gold)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-bold" style={{ color: 'var(--ces-ink)' }}>{banks[0].bankName}</p>
                    <p className="text-[11.5px] mono" style={{ color: 'var(--ces-mute2)' }}>{banks[0].iban || banks[0].bankCode}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {banks.map((bank, idx) => {
                    const selected = selectedBankIdx === idx
                    return (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => setSelectedBankIdx(idx)}
                        className="w-full flex items-center gap-3 p-3 text-left transition-all"
                        style={{
                          background: selected ? 'var(--ces-gold-100)' : 'var(--ces-surface)',
                          border: `2px solid ${selected ? 'var(--ces-gold)' : 'var(--ces-line)'}`,
                          borderRadius: '11px',
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded-full grid place-items-center flex-none"
                          style={{
                            background: selected ? 'var(--ces-gold)' : 'transparent',
                            border: `2px solid ${selected ? 'var(--ces-gold)' : 'var(--ces-line)'}`,
                          }}
                        >
                          {selected && <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ces-surface)' }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13.5px] font-bold" style={{ color: 'var(--ces-ink)' }}>{bank.bankName}</p>
                          <p className="text-[11.5px] mono" style={{ color: 'var(--ces-mute2)' }}>{bank.iban || bank.bankCode}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </Field>
          )}

          {(docType === 'HESAB_FAKTURA' || docType === 'ENGLISH_INVOICE') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Müqavilə №">
                <Input
                  value={contractNumber}
                  onChange={(e) => { if (!composingRef.current) setContractNumber(e.target.value) }}
                  placeholder="MÜQ-2025-001"
                />
              </Field>
              <Field label="Müqavilə tarixi">
                <Input type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
              </Field>
            </div>
          )}

          {docType === 'TEHVIL_TESLIM_AKTI' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Müqavilə tarixi">
                <Input type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
              </Field>
              <Field label="Əlavə №">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="1"
                      value={addendumInput}
                      onChange={(e) => setAddendumInput(e.target.value)}
                      placeholder="2"
                    />
                  </div>
                  <button type="button" onClick={addAddendum} className="ces-btn ces-btn-primary ces-btn-sm">
                    <Plus size={14} />
                  </button>
                </div>
                {addendums.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {addendums.map(n => (
                      <span
                        key={n}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full"
                        style={{ background: 'var(--ces-gold-100)', color: 'var(--ces-gold-700)' }}
                      >
                        {n} saylı
                        <button type="button" onClick={() => setAddendums(prev => prev.filter(x => x !== n))}
                          className="transition-colors"
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ces-danger)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ces-gold-700)' }}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>
            </div>
          )}

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10.5px] font-bold uppercase tracking-[.16em]" style={{ color: 'var(--ces-muted)' }}>Xidmət sətirləri</p>
              <button onClick={addLine} className="flex items-center gap-1 text-[12px] font-bold transition-colors"
                style={{ color: 'var(--ces-gold-700)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ces-graphite-900)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ces-gold-700)' }}
              >
                <Plus size={13} /> Sətir əlavə et
              </button>
            </div>

            <div className="overflow-hidden" style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '12px' }}>
              <div
                className="grid grid-cols-[3fr_1fr_1.5fr_1.5fr_auto] gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-[.14em]"
                style={{ background: 'var(--ces-graphite-50)', color: 'var(--ces-muted)' }}
              >
                <span>Təsvir</span>
                <span>Vahid</span>
                <span>Qiymət</span>
                <span className="text-right">Məbləğ</span>
                <span></span>
              </div>

              {lines.map((line, idx) => {
                const isAkt = docType === 'TEHVIL_TESLIM_AKTI'
                const price = parseFloat(line.unitPrice) || 0
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-[3fr_1fr_1.5fr_1.5fr_auto] gap-2 items-center px-3 py-2"
                    style={{ borderTop: '1px solid var(--ces-line)' }}
                  >
                    <input
                      value={line.description}
                      onCompositionStart={() => { composingRef.current = true }}
                      onCompositionEnd={(e) => { composingRef.current = false; updateLine(idx, 'description', e.target.value) }}
                      onChange={(e) => { if (!composingRef.current) updateLine(idx, 'description', e.target.value) }}
                      placeholder="Xidmətin adı..."
                      className="w-full px-2 py-1.5 text-[12.5px] outline-none transition-all"
                      style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '8px', color: 'var(--ces-ink)' }}
                    />
                    {isAkt ? (
                      <span className="px-2 py-1.5 text-[12px]" style={{ color: 'var(--ces-mute2)' }}>xidmət</span>
                    ) : (
                      <input
                        value={line.unit}
                        onCompositionStart={() => { composingRef.current = true }}
                        onCompositionEnd={(e) => { composingRef.current = false; updateLine(idx, 'unit', e.target.value) }}
                        onChange={(e) => { if (!composingRef.current) updateLine(idx, 'unit', e.target.value) }}
                        placeholder="ədəd"
                        className="w-full px-2 py-1.5 text-[12.5px] outline-none"
                        style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '8px', color: 'var(--ces-ink)' }}
                      />
                    )}
                    <input
                      type="text"
                      inputMode="decimal"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(idx, 'unitPrice', onlyDecimal(e.target.value))}
                      onKeyDown={decimalKeyDown}
                      onPaste={makePasteHandler(onlyDecimal)}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 text-[12.5px] outline-none num"
                      style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '8px', color: 'var(--ces-ink)' }}
                    />
                    <span className="text-[12.5px] font-bold text-right num" style={{ color: 'var(--ces-ink)' }}>
                      {fmtMoney(price)}
                    </span>
                    <button
                      onClick={() => removeLine(idx)}
                      disabled={lines.length <= 1}
                      className={clsx('ces-row-act danger', lines.length <= 1 && 'opacity-30 cursor-not-allowed')}
                      title="Sil"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <Field label="Qeyd">
            <Textarea
              value={notes}
              onChange={(e) => { if (!composingRef.current) setNotes(e.target.value) }}
              rows={2}
              placeholder="Əlavə qeydlər..."
            />
          </Field>

          {/* Totals */}
          <div
            className="p-4 space-y-2"
            style={{ background: 'var(--ces-graphite-50)', border: '1px solid var(--ces-line)', borderRadius: '12px' }}
          >
            <div className="flex justify-between text-[13px]">
              <span style={{ color: 'var(--ces-muted)' }}>Cəmi (ƏDV-siz):</span>
              <span className="font-bold num" style={{ color: 'var(--ces-ink)' }}>{fmtMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span style={{ color: 'var(--ces-muted)' }}>ƏDV ({vatRate}%):</span>
              <span className="font-bold num" style={{ color: 'var(--ces-ink)' }}>{fmtMoney(vatAmount)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2" style={{ borderTop: '1px solid var(--ces-line)' }}>
              <span className="text-[12.5px] font-bold uppercase tracking-[.12em]" style={{ color: 'var(--ces-muted)' }}>Yekun:</span>
              <span className="text-[18px] font-extrabold num" style={{ color: 'var(--ces-gold-700)' }}>{fmtMoney(grandTotal)}</span>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  )
}
