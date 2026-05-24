import { useState, useEffect } from 'react'
import { X, Send, CheckCircle, Plus, Trash2, FileText, MessageSquare, ListChecks, Info } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { projectManagerApi } from '../../api/projectManager'
import { contractorsApi } from '../../api/contractors'
import { investorsApi } from '../../api/investors'
import { garageApi } from '../../api/garage'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { STATUS_CFG } from '../../constants/requests'

const tabBtn = (active) => clsx(
  'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors',
  active
    ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
)

const inputCls = 'w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500'
const labelCls = 'block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1'

export default function PmRequestSlideOver({ requestId, onClose, onChanged }) {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canPut = hasPermission('PROJECT_MANAGER', 'canPut')
  const canApprove = hasPermission('PROJECT_MANAGER', 'canApproveByPm')
  const { confirm, ConfirmDialog } = useConfirm()

  const [tab, setTab] = useState('details')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  // Shortlist edit state
  const [shortlistItems, setShortlistItems] = useState([])
  const [shortlistNotes, setShortlistNotes] = useState('')
  const [contractors, setContractors] = useState([])
  const [investors, setInvestors] = useState([])
  const [equipmentList, setEquipmentList] = useState([])

  // Customer agreement state
  const [agreedPrice, setAgreedPrice] = useState('')
  const [agreementNote, setAgreementNote] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await projectManagerApi.getRequest(requestId)
      const d = res.data.data
      setData(d)
      setShortlistItems(d.shortlistItems || [])
      setShortlistNotes(d.shortlistNotes || '')
      setAgreedPrice(d.agreedTotalPrice || '')
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [requestId])

  useEffect(() => {
    contractorsApi.getAll().then(r => setContractors(r.data.data || [])).catch(() => {})
    investorsApi.getAll().then(r => setInvestors(r.data.data || [])).catch(() => {})
    garageApi.getAll().then(r => setEquipmentList(r.data.data || [])).catch(() => {})
  }, [])

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0" style={{background:"rgba(0,0,0,0.08)"}} />
        <div className="relative z-10 ml-auto h-full w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl flex items-center justify-center">
          <div className="text-sm text-gray-400">Yüklənir...</div>
        </div>
      </div>
    )
  }

  const status = STATUS_CFG[data.status] || { label: data.status, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
  const offer = data.coordinatorOffer
  const isEditableShortlist = ['PM_REVIEW', 'PM_SHORTLIST_READY'].includes(data.status)
  const isInNegotiation = ['COORDINATOR_PROPOSED', 'PM_PRICE_NEGOTIATION'].includes(data.status)

  // Shortlist actions
  const addRow = (partyType = 'CONTRACTOR') => {
    setShortlistItems([...shortlistItems, {
      id: null, partyType, contractorId: null, investorId: null,
      equipmentId: null, negotiatedPrice: null, notes: '',
    }])
  }

  const updateRow = (idx, patch) => {
    const next = [...shortlistItems]
    next[idx] = { ...next[idx], ...patch }
    // partyType dəyişəndə qarşı tərəfi sıfırla
    if (patch.partyType === 'CONTRACTOR') next[idx].investorId = null
    if (patch.partyType === 'INVESTOR') next[idx].contractorId = null
    setShortlistItems(next)
  }

  const removeRow = (idx) => {
    const row = shortlistItems[idx]
    if (row.id) {
      // backend-də mövcuddur → API ilə sil
      projectManagerApi.deleteShortlistItem(requestId, row.id)
        .then(() => {
          toast.success('Sətir silindi')
          load()
          onChanged?.()
        })
    } else {
      setShortlistItems(shortlistItems.filter((_, i) => i !== idx))
    }
  }

  const saveShortlist = async () => {
    // Validate
    for (const item of shortlistItems) {
      if (!item.partyType) return toast.error('Hər sətrin tipi seçilməlidir')
      if (item.partyType === 'CONTRACTOR' && !item.contractorId) return toast.error('Podratçı seçilməlidir')
      if (item.partyType === 'INVESTOR' && !item.investorId) return toast.error('Investor seçilməlidir')
    }
    setBusy(true)
    try {
      await projectManagerApi.saveShortlist(requestId, {
        notes: shortlistNotes,
        items: shortlistItems,
      })
      toast.success('Shortlist yadda saxlandı')
      await load()
      onChanged?.()
    } catch {} finally {
      setBusy(false)
    }
  }

  const sendToCoordinator = async () => {
    if (!(await confirm({ title: 'Koordinatora göndər', message: 'Shortlist koordinatora göndərilsin?' }))) return
    setBusy(true)
    try {
      await projectManagerApi.sendToCoordinator(requestId)
      toast.success('Koordinatora göndərildi')
      await load()
      onChanged?.()
    } catch {} finally {
      setBusy(false)
    }
  }

  const saveAgreement = async () => {
    setBusy(true)
    try {
      await projectManagerApi.saveCustomerAgreement(requestId, {
        agreedTotalPrice: agreedPrice ? parseFloat(agreedPrice) : null,
        agreementNote: agreementNote || null,
      })
      toast.success('Razılaşma yadda saxlandı')
      setAgreementNote('')
      await load()
      onChanged?.()
    } catch {} finally {
      setBusy(false)
    }
  }

  const approve = async () => {
    if (!(await confirm({
      title: 'Sorğunu təsdiqlə',
      message: 'Sorğunun təsdiqi layihə yaradacaq və mühasibatlığa göndərəcək. Davam edək?',
      danger: false,
    }))) return
    setBusy(true)
    try {
      await projectManagerApi.approve(requestId)
      toast.success('Sorğu təsdiqləndi — layihə yaradıldı')
      await load()
      onChanged?.()
    } catch {} finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0" style={{background:"rgba(0,0,0,0.08)"}} />
      <div className="relative z-10 ml-auto h-full w-full max-w-3xl bg-white dark:bg-gray-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">{data.requestCode}</span>
              <span className={clsx('px-2 py-0.5 rounded-md text-[10px] font-medium border', status.cls)}>{status.label}</span>
            </div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{data.companyName}</h2>
            {data.projectName && <p className="text-xs text-gray-500 mt-0.5">{data.projectName}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 p-1.5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 py-2 border-b border-gray-100 dark:border-gray-700 flex gap-1">
          <button onClick={() => setTab('details')} className={tabBtn(tab === 'details')}>
            <Info size={13} /> Sorğu
          </button>
          <button onClick={() => setTab('shortlist')} className={tabBtn(tab === 'shortlist')}>
            <ListChecks size={13} /> Shortlist {data.shortlistItems?.length ? `(${data.shortlistItems.length})` : ''}
          </button>
          <button onClick={() => setTab('offer')} className={tabBtn(tab === 'offer')} disabled={!offer}>
            <FileText size={13} /> Koordinator təklifi
          </button>
          <button onClick={() => setTab('agreement')} className={tabBtn(tab === 'agreement')}>
            <MessageSquare size={13} /> Sifarişçi razılaşması
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === 'details' && <DetailsTab data={data} />}

          {tab === 'shortlist' && (
            <ShortlistTab
              items={shortlistItems}
              notes={shortlistNotes}
              setNotes={setShortlistNotes}
              addRow={addRow}
              updateRow={updateRow}
              removeRow={removeRow}
              contractors={contractors}
              investors={investors}
              equipmentList={equipmentList}
              readonly={!isEditableShortlist || !canPut}
            />
          )}

          {tab === 'offer' && (
            offer ? <OfferTab offer={offer} /> : (
              <div className="text-center py-10 text-sm text-gray-400">Koordinator hələ təklif göndərməyib</div>
            )
          )}

          {tab === 'agreement' && (
            <AgreementTab
              data={data}
              offer={offer}
              agreedPrice={agreedPrice}
              setAgreedPrice={setAgreedPrice}
              agreementNote={agreementNote}
              setAgreementNote={setAgreementNote}
              readonly={!isInNegotiation || !canPut}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between gap-2">
          <div className="text-xs text-gray-400">
            {data.agreedTotalPrice && (
              <span>Razılaşdırılmış: <b className="text-gray-700 dark:text-gray-300">
                {parseFloat(data.agreedTotalPrice).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼</b></span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {tab === 'shortlist' && isEditableShortlist && canPut && (
              <>
                <button
                  onClick={saveShortlist}
                  disabled={busy}
                  className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg disabled:opacity-50"
                >
                  Shortlist saxla
                </button>
                <button
                  onClick={sendToCoordinator}
                  disabled={busy || !shortlistItems.length}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
                >
                  <Send size={13} /> Koordinatora göndər
                </button>
              </>
            )}
            {tab === 'agreement' && isInNegotiation && canPut && (
              <>
                <button
                  onClick={saveAgreement}
                  disabled={busy}
                  className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg disabled:opacity-50"
                >
                  Razılaşmanı saxla
                </button>
                {canApprove && (
                  <button
                    onClick={approve}
                    disabled={busy || data.status !== 'PM_PRICE_NEGOTIATION'}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                  >
                    <CheckCircle size={13} /> Təsdiqlə (Layihə yarat)
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function DetailsTab({ data }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 text-xs">
        <Field label="Müştəri" value={data.companyName} />
        <Field label="Əlaqə şəxsi" value={data.contactPerson} />
        <Field label="Telefon" value={data.contactPhone} />
        <Field label="Bölgə" value={data.region} />
        <Field label="Növ" value={data.projectType === 'DAILY' ? 'Günlük' : data.projectType === 'MONTHLY' ? 'Aylıq' : '—'} />
        <Field label="Müddət" value={data.dayCount ? `${data.dayCount} ${data.projectType === 'DAILY' ? 'gün' : 'ay'}` : '—'} />
        <Field label="Daşınma" value={data.transportationRequired ? 'Lazımdır' : 'Lazım deyil'} />
        <Field label="Tarix" value={data.requestDate || '—'} />
      </div>
      {data.params?.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Texniki Parametrlər</div>
          <div className="space-y-1">
            {data.params.map((p, i) => (
              <div key={i} className="flex justify-between text-xs px-3 py-1.5 bg-gray-50 dark:bg-gray-900/50 rounded">
                <span className="text-gray-500">{p.paramKey}</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{p.paramValue}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.notes && (
        <div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Qeyd</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded p-2 whitespace-pre-wrap">{data.notes}</div>
        </div>
      )}
    </div>
  )
}

function ShortlistTab({ items, notes, setNotes, addRow, updateRow, removeRow, contractors, investors, equipmentList, readonly }) {
  return (
    <div className="space-y-3">
      {!readonly && (
        <div className="flex gap-2">
          <button onClick={() => addRow('CONTRACTOR')} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg">
            <Plus size={13} /> Podratçı
          </button>
          <button onClick={() => addRow('INVESTOR')} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg">
            <Plus size={13} /> Investor
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-8 text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          Shortlist boşdur. {!readonly && 'Yuxarıdan sətir əlavə edin.'}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <select
                  disabled={readonly}
                  value={it.partyType}
                  onChange={(e) => updateRow(idx, { partyType: e.target.value })}
                  className="text-[10px] font-semibold uppercase tracking-wide bg-transparent border-none focus:ring-0 text-amber-700"
                >
                  <option value="CONTRACTOR">Podratçı</option>
                  <option value="INVESTOR">Investor</option>
                </select>
                {!readonly && (
                  <button onClick={() => removeRow(idx)} className="text-red-500 hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {it.partyType === 'CONTRACTOR' ? (
                  <div>
                    <label className={labelCls}>Podratçı</label>
                    <select
                      disabled={readonly}
                      value={it.contractorId || ''}
                      onChange={(e) => updateRow(idx, { contractorId: e.target.value ? Number(e.target.value) : null })}
                      className={inputCls}
                    >
                      <option value="">Seçin...</option>
                      {contractors.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className={labelCls}>Investor</label>
                    <select
                      disabled={readonly}
                      value={it.investorId || ''}
                      onChange={(e) => updateRow(idx, { investorId: e.target.value ? Number(e.target.value) : null })}
                      className={inputCls}
                    >
                      <option value="">Seçin...</option>
                      {investors.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className={labelCls}>Texnika</label>
                  <select
                    disabled={readonly}
                    value={it.equipmentId || ''}
                    onChange={(e) => updateRow(idx, { equipmentId: e.target.value ? Number(e.target.value) : null })}
                    className={inputCls}
                  >
                    <option value="">Seçin...</option>
                    {equipmentList.map(eq => <option key={eq.id} value={eq.id}>{eq.name} ({eq.equipmentCode})</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Qeyd</label>
                <input
                  disabled={readonly}
                  value={it.notes || ''}
                  onChange={(e) => updateRow(idx, { notes: e.target.value })}
                  className={inputCls}
                  placeholder="Bu sətir haqqında qeyd..."
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <label className={labelCls}>Ümumi qeyd</label>
        <textarea
          disabled={readonly}
          value={notes || ''}
          onChange={(e) => setNotes(e.target.value)}
          className={clsx(inputCls, 'min-h-[60px] resize-y')}
          placeholder="Shortlistə dair ümumi qeyd..."
        />
      </div>
    </div>
  )
}

function OfferTab({ offer }) {
  const total = parseFloat(offer.totalAmount || 0)
  const profit = parseFloat(offer.companyProfit || 0)
  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Texnika" value={offer.equipmentName ? `${offer.equipmentName} (${offer.equipmentCode})` : '—'} />
        <Field label="Operator" value={offer.operatorName || '—'} />
        <Field label="Texnika qiyməti" value={offer.equipmentPrice != null ? `${parseFloat(offer.equipmentPrice).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼` : '—'} />
        <Field label="Müddət" value={offer.dayCount ? `${offer.dayCount}` : '—'} />
        <Field label="Podratçıya ödəniş" value={offer.contractorPayment != null ? `${parseFloat(offer.contractorPayment).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼` : '—'} />
        <Field label="Operator ödənişi" value={offer.operatorPayment != null ? `${parseFloat(offer.operatorPayment).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼` : '—'} />
        <Field label="Daşınma qiyməti" value={offer.transportationPrice != null ? `${parseFloat(offer.transportationPrice).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼` : '—'} />
        <Field label="Daşınma podratçısı" value={offer.transportContractorName || '—'} />
        <Field label="Başlanğıc" value={offer.startDate || '—'} />
        <Field label="Bitmə" value={offer.endDate || '—'} />
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3 grid grid-cols-2 gap-3">
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
          <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Ümumi məbləğ</div>
          <div className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-1">
            {total.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
          </div>
        </div>
        <div className={clsx('rounded-xl p-3', profit >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20')}>
          <div className={clsx('text-[10px] font-semibold uppercase tracking-wide', profit >= 0 ? 'text-green-700' : 'text-red-700')}>Şirkət xeyri</div>
          <div className={clsx('text-lg font-bold mt-1', profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
            {profit.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
          </div>
        </div>
      </div>
      {offer.notes && (
        <div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Koordinator qeydi</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded p-2 whitespace-pre-wrap">{offer.notes}</div>
        </div>
      )}
    </div>
  )
}

function AgreementTab({ data, offer, agreedPrice, setAgreedPrice, agreementNote, setAgreementNote, readonly }) {
  return (
    <div className="space-y-3">
      {offer && (
        <div className="text-xs bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Koordinator təklifi</div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Ümumi məbləğ</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {parseFloat(offer.totalAmount || 0).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
            </span>
          </div>
        </div>
      )}
      <div>
        <label className={labelCls}>Sifarişçi ilə razılaşdırılmış son qiymət (₼)</label>
        <input
          disabled={readonly}
          type="number"
          step="0.01"
          value={agreedPrice}
          onChange={(e) => setAgreedPrice(e.target.value)}
          className={inputCls}
          placeholder="0.00"
        />
      </div>
      <div>
        <label className={labelCls}>Razılaşma qeydi (yeni qeyd əlavə olunacaq)</label>
        <textarea
          disabled={readonly}
          value={agreementNote}
          onChange={(e) => setAgreementNote(e.target.value)}
          className={clsx(inputCls, 'min-h-[80px] resize-y')}
          placeholder="Sifarişçi ilə əldə edilmiş razılaşma haqqında qeyd..."
        />
      </div>
      {data.notes && (
        <div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Bütün qeydlər</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded p-2 whitespace-pre-wrap">{data.notes}</div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{value ?? '—'}</div>
    </div>
  )
}
