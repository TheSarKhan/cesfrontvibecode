import { useEffect, useMemo, useRef, useState } from 'react'
import { Settings, Plus, Trash2, History, CheckCircle2, Calculator, Layers, Info, Pencil, Infinity as InfinityIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { ModalShell, Field, Input, Select, Pill } from './_shared'
import { fmtMoney } from './_constants'

const APPLIES = [
  { v: 'ISCI', label: 'İşçi' },
  { v: 'ISEGOTUREN', label: 'İşəgötürən' },
  { v: 'HER_IKISI', label: 'Hər ikisi' },
]
const appliesLabel = (v) => APPLIES.find((a) => a.v === v)?.label ?? v
const allows = (appliesTo, party) =>
  appliesTo === 'HER_IKISI' || appliesTo === party

const todayIso = () => new Date().toISOString().slice(0, 10)
const num = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v))

/** Bir aralıq üçün boş sətir. */
const emptyBracket = () => ({ lowerBound: 0, upperBound: '', fixedAmount: 0, rate: 0 })

/** Versiya cavabındakı qrupları redaktə üçün dərin kopyala. */
function cloneGroups(groups) {
  return (groups ?? []).map((g) => ({
    deductionTypeId: g.deductionTypeId,
    code: g.code,
    name: g.name,
    appliesTo: g.appliesTo,
    deductedFromNet: g.deductedFromNet,
    isciBrackets: (g.isciBrackets ?? []).map(cloneBracket),
    isegoturenBrackets: (g.isegoturenBrackets ?? []).map(cloneBracket),
  }))
}
const cloneBracket = (b) => ({
  lowerBound: b.lowerBound ?? 0,
  // null = sonsuz (∞), '' = boş (hələ rəqəm daxil edilməyib). Hər ikisi saxlanarkən null olur.
  upperBound: b.upperBound === null || b.upperBound === undefined ? null : b.upperBound,
  fixedAmount: b.fixedAmount ?? 0,
  rate: b.rate ?? 0,
})
const isInfinite = (u) => u === '' || u === null || u === undefined

/** Bir tərəfin aralıqlarını yoxla: faiz 0–100, alt<üst, boşluq/overlap yoxdur. */
function validateBrackets(list, typeName, partyLabel) {
  if (!list || list.length === 0) return null
  const sorted = [...list].sort((a, b) => num(a.lowerBound) - num(b.lowerBound))
  let prevUpper = null
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]
    const lower = num(b.lowerBound)
    const upper = b.upperBound === '' || b.upperBound === null ? null : num(b.upperBound)
    const rate = num(b.rate)
    if (rate < 0 || rate > 1) return `${typeName} (${partyLabel}): faiz 0–100% aralığında olmalıdır`
    if (lower < 0) return `${typeName} (${partyLabel}): alt hədd mənfi ola bilməz`
    if (upper !== null && upper <= lower) return `${typeName} (${partyLabel}): alt hədd üst həddən kiçik olmalıdır`
    if (prevUpper === null) {
      if (i > 0) return `${typeName} (${partyLabel}): yalnız sonuncu aralıq sonsuz (üst hədd boş) ola bilər`
    } else if (lower !== prevUpper) {
      return `${typeName} (${partyLabel}): aralıqlar arasında boşluq və ya üst-üstə düşmə var`
    }
    prevUpper = upper
  }
  return null
}

export default function DeductionConfigModal({ onClose, onSaved, canEdit }) {
  useEscapeKey(onClose)

  const [versions, setVersions] = useState([])
  const [selectedVersionId, setSelectedVersionId] = useState(null)
  const [groups, setGroups] = useState([])
  const [effectiveDate, setEffectiveDate] = useState(todayIso())
  const [note, setNote] = useState('')
  const [makeActive, setMakeActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Canlı önizləmə
  const [previewBase, setPreviewBase] = useState(3000)
  const [preview, setPreview] = useState(null)
  const previewTimer = useRef(null)

  // Yeni tutulma növü
  const [newType, setNewType] = useState(null) // {code,name,appliesTo,deductedFromNet}

  const loadVersion = async (id) => {
    const v = (await hrApi.getDeductionVersion(id)).data?.data
    setSelectedVersionId(v.id)
    setGroups(cloneGroups(v.groups))
    setNote('')
    setEffectiveDate(todayIso())
  }

  const init = async () => {
    setLoading(true)
    try {
      const vers = (await hrApi.getDeductionVersions()).data?.data ?? []
      setVersions(vers)
      const active = vers.find((v) => v.active) ?? vers[0]
      if (active) await loadVersion(active.id)
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Konfiqurasiya yüklənmədi')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { init() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Canlı önizləmə — base və ya groups dəyişəndə (debounce)
  useEffect(() => {
    if (loading) return
    if (previewTimer.current) clearTimeout(previewTimer.current)
    previewTimer.current = setTimeout(async () => {
      try {
        const payload = {
          base: num(previewBase),
          groups: groups.map((g) => ({
            code: g.code,
            name: g.name,
            appliesTo: g.appliesTo,
            deductedFromNet: g.deductedFromNet,
            isciBrackets: serializeBrackets(g.isciBrackets),
            isegoturenBrackets: serializeBrackets(g.isegoturenBrackets),
          })),
        }
        const res = (await hrApi.previewDeductions(payload)).data?.data
        setPreview(res)
      } catch { /* önizləmə xətası səssiz */ }
    }, 350)
    return () => previewTimer.current && clearTimeout(previewTimer.current)
  }, [previewBase, groups, loading])

  const serializeBrackets = (list) =>
    (list ?? []).map((b, i) => ({
      lowerBound: num(b.lowerBound),
      upperBound: b.upperBound === '' || b.upperBound === null ? null : num(b.upperBound),
      fixedAmount: num(b.fixedAmount),
      rate: num(b.rate),
      sortOrder: i,
    }))

  // ── Bracket mutasiyaları ──
  const mutate = (gi, party, fn) => {
    setGroups((prev) => {
      const next = prev.map((g) => ({ ...g, isciBrackets: [...g.isciBrackets], isegoturenBrackets: [...g.isegoturenBrackets] }))
      const key = party === 'ISCI' ? 'isciBrackets' : 'isegoturenBrackets'
      next[gi][key] = fn(next[gi][key])
      return next
    })
  }
  const setCell = (gi, party, ri, field, value) =>
    mutate(gi, party, (rows) => rows.map((r, i) => (i === ri ? { ...r, [field]: value } : r)))
  const addRow = (gi, party) =>
    mutate(gi, party, (rows) => {
      const last = rows[rows.length - 1]
      const lower = last ? (isInfinite(last.upperBound) ? num(last.lowerBound) : num(last.upperBound)) : 0
      return [...rows, { ...emptyBracket(), lowerBound: lower }]
    })
  const removeRow = (gi, party, ri) =>
    mutate(gi, party, (rows) => rows.filter((_, i) => i !== ri))

  // ── Yeni tutulma növü ──
  const submitNewType = async () => {
    if (!newType?.code?.trim() || !newType?.name?.trim()) { toast.error('Kod və ad tələb olunur'); return }
    try {
      const created = (await hrApi.createDeductionType({
        code: newType.code.trim().toUpperCase(),
        name: newType.name.trim(),
        appliesTo: newType.appliesTo,
        deductedFromNet: newType.deductedFromNet,
        displayOrder: groups.length + 1,
        active: true,
      })).data?.data
      setGroups((prev) => [...prev, {
        deductionTypeId: created.id, code: created.code, name: created.name,
        appliesTo: created.appliesTo, deductedFromNet: created.deductedFromNet,
        isciBrackets: [], isegoturenBrackets: [],
      }])
      setNewType(null)
      toast.success('Tutulma növü əlavə edildi')
    } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }

  // ── Saxla (yeni versiya yarat) ──
  const validateAll = () => {
    for (const g of groups) {
      if (allows(g.appliesTo, 'ISCI')) {
        const err = validateBrackets(g.isciBrackets, g.name, 'İşçi')
        if (err) return err
      }
      if (allows(g.appliesTo, 'ISEGOTUREN')) {
        const err = validateBrackets(g.isegoturenBrackets, g.name, 'İşəgötürən')
        if (err) return err
      }
    }
    return null
  }

  const save = async () => {
    const err = validateAll()
    if (err) { toast.error(err); return }
    if (!effectiveDate) { toast.error('Qüvvəyə minmə tarixi tələb olunur'); return }
    setSaving(true)
    try {
      const payload = {
        effectiveDate,
        active: makeActive,
        note: note || null,
        groups: groups.map((g) => ({
          deductionTypeId: g.deductionTypeId,
          isciBrackets: allows(g.appliesTo, 'ISCI') ? serializeBrackets(g.isciBrackets) : [],
          isegoturenBrackets: allows(g.appliesTo, 'ISEGOTUREN') ? serializeBrackets(g.isegoturenBrackets) : [],
        })),
      }
      await hrApi.createDeductionVersion(payload)
      toast.success('Yeni versiya yadda saxlanıldı')
      onSaved?.()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Saxlanmadı')
    } finally { setSaving(false) }
  }

  const activate = async (id) => {
    try { await hrApi.activateDeductionVersion(id); toast.success('Aktivləşdirildi'); await init() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const removeVersion = async (id) => {
    try { await hrApi.deleteDeductionVersion(id); toast.success('Silindi'); await init() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }

  const selectedVersion = useMemo(
    () => versions.find((v) => v.id === selectedVersionId),
    [versions, selectedVersionId])

  return (
    <ModalShell
      icon={Settings}
      eyebrow="HR · Tutulma konfiqurasiyası"
      title="Vergi və sığorta tutulmaları"
      subtitle="Maaş aralıqları, dərəcələr və versiya tarixçəsi"
      onClose={onClose}
      tone="gold"
      maxWidth="1180px"
      footer={
        <>
          <button onClick={onClose} className="ces-btn ces-btn-ghost ces-btn-sm">Bağla</button>
          {canEdit && (
            <button onClick={save} disabled={saving || loading} className="ces-btn ces-btn-primary">
              {saving && <span className="w-3.5 h-3.5 rounded-full animate-spin"
                style={{ border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'var(--ces-on-primary)' }} />}
              {saving ? '...' : 'Yeni versiya kimi saxla'}
            </button>
          )}
        </>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center h-64 gap-2" style={{ color: 'var(--ces-muted)' }}>
          <span className="w-4 h-4 rounded-full animate-spin"
            style={{ border: '2px solid var(--ces-line)', borderTopColor: 'var(--ces-gold)' }} />
          <span className="text-[13px] font-medium">Yüklənir...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
          {/* ─── Sol: versiya seçimi + qruplar ─── */}
          <div className="p-6 space-y-5 min-w-0">
            {/* Versiya tarixçəsi */}
            <div className="flex flex-wrap items-end gap-3 pb-4" style={{ borderBottom: '1px solid var(--ces-line)' }}>
              <div className="min-w-[220px]">
                <label className="block text-[11px] font-bold uppercase tracking-[.12em] mb-1.5" style={{ color: 'var(--ces-muted)' }}>
                  <History size={11} className="inline mr-1" /> Versiya tarixçəsi
                </label>
                <Select value={selectedVersionId ?? ''} onChange={(e) => loadVersion(Number(e.target.value))}>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNo} — {v.effectiveDate}{v.active ? ' (aktiv)' : ''}
                    </option>
                  ))}
                </Select>
              </div>
              {selectedVersion && !selectedVersion.active && canEdit && (
                <button onClick={() => activate(selectedVersion.id)} className="ces-btn ces-btn-outline ces-btn-sm">
                  <CheckCircle2 size={14} /> Aktiv et
                </button>
              )}
              {selectedVersion && !selectedVersion.active && canEdit && (
                <button onClick={() => removeVersion(selectedVersion.id)} className="ces-btn ces-btn-ghost ces-btn-sm" style={{ color: 'var(--ces-danger)' }}>
                  <Trash2 size={14} /> Sil
                </button>
              )}
              {selectedVersion?.note && (
                <p className="text-[11.5px] flex-1 min-w-[200px]" style={{ color: 'var(--ces-muted)' }}>{selectedVersion.note}</p>
              )}
            </div>

            {/* Qruplar */}
            {groups.map((g, gi) => (
              <div key={g.deductionTypeId ?? g.code} className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--ces-line)' }}>
                <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'var(--ces-graphite-50)' }}>
                  <Layers size={14} style={{ color: 'var(--ces-gold)' }} />
                  <span className="text-[13.5px] font-bold" style={{ color: 'var(--ces-ink)' }}>{g.name}</span>
                  <Pill tone="muted" sm>{g.code}</Pill>
                  <Pill tone="info" sm>{appliesLabel(g.appliesTo)}</Pill>
                  {g.deductedFromNet && <Pill tone="gold" sm>Net-dən çıxılır</Pill>}
                </div>
                <div className="p-4 space-y-4">
                  {allows(g.appliesTo, 'ISCI') && (
                    <BracketTable title="İşçi tərəfi" rows={g.isciBrackets} readOnly={!canEdit}
                      onCell={(ri, f, v) => setCell(gi, 'ISCI', ri, f, v)}
                      onAdd={() => addRow(gi, 'ISCI')} onRemove={(ri) => removeRow(gi, 'ISCI', ri)} />
                  )}
                  {allows(g.appliesTo, 'ISEGOTUREN') && (
                    <BracketTable title="İşəgötürən tərəfi" rows={g.isegoturenBrackets} readOnly={!canEdit}
                      onCell={(ri, f, v) => setCell(gi, 'ISEGOTUREN', ri, f, v)}
                      onAdd={() => addRow(gi, 'ISEGOTUREN')} onRemove={(ri) => removeRow(gi, 'ISEGOTUREN', ri)} />
                  )}
                </div>
              </div>
            ))}

            {/* Yeni tutulma növü */}
            {canEdit && (newType ? (
              <div className="rounded-xl p-4 space-y-3" style={{ border: '1px dashed var(--ces-gold)' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Kod" required>
                    <Input value={newType.code} onChange={(e) => setNewType({ ...newType, code: e.target.value })} placeholder="məs. ƏMÇ" />
                  </Field>
                  <Field label="Ad" required>
                    <Input value={newType.name} onChange={(e) => setNewType({ ...newType, name: e.target.value })} placeholder="Tutulmanın adı" />
                  </Field>
                  <Field label="Tərəf">
                    <Select value={newType.appliesTo} onChange={(e) => setNewType({ ...newType, appliesTo: e.target.value })}>
                      {APPLIES.map((a) => <option key={a.v} value={a.v}>{a.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Net-dən çıxılsın?">
                    <label className="flex items-center gap-2 px-3" style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '11px', minHeight: '44px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={newType.deductedFromNet} onChange={(e) => setNewType({ ...newType, deductedFromNet: e.target.checked })} className="w-4 h-4" style={{ accentColor: 'var(--ces-gold)' }} />
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--ces-ink)' }}>İşçi tutulması net-dən çıxılır</span>
                    </label>
                  </Field>
                </div>
                <div className="flex gap-2">
                  <button onClick={submitNewType} className="ces-btn ces-btn-primary ces-btn-sm">Əlavə et</button>
                  <button onClick={() => setNewType(null)} className="ces-btn ces-btn-ghost ces-btn-sm">Ləğv et</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setNewType({ code: '', name: '', appliesTo: 'HER_IKISI', deductedFromNet: true })}
                className="ces-btn ces-btn-outline ces-btn-sm">
                <Plus size={14} /> Yeni tutulma növü
              </button>
            ))}

            {/* Yeni versiya meta */}
            {canEdit && (
              <div className="rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ background: 'var(--ces-graphite-50)', border: '1px solid var(--ces-line)' }}>
                <Field label="Qüvvəyə minmə tarixi" required>
                  <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
                </Field>
                <Field label="Qeyd">
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Dəyişiklik açıqlaması" />
                </Field>
                <Field label="Status">
                  <label className="flex items-center gap-2 px-3" style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '11px', minHeight: '44px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={makeActive} onChange={(e) => setMakeActive(e.target.checked)} className="w-4 h-4" style={{ accentColor: 'var(--ces-gold)' }} />
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--ces-ink)' }}>Saxlandıqda aktiv et</span>
                  </label>
                </Field>
              </div>
            )}
          </div>

          {/* ─── Sağ: canlı önizləmə ─── */}
          <div className="p-6 lg:border-l" style={{ borderColor: 'var(--ces-line)', background: 'var(--ces-graphite-50)' }}>
            <div className="sticky top-0 space-y-4">
              <div className="flex items-center gap-2">
                <Calculator size={15} style={{ color: 'var(--ces-gold)' }} />
                <h3 className="text-[13px] font-bold" style={{ color: 'var(--ces-ink)' }}>Canlı önizləmə</h3>
              </div>
              <Field label="Nümunə baza (gross)">
                <Input type="number" value={previewBase} onChange={(e) => setPreviewBase(e.target.value)} suffix="₼" />
              </Field>

              {preview ? (
                <div className="space-y-2">
                  {preview.lines.map((l) => (
                    <div key={l.code} className="rounded-lg px-3 py-2" style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold" style={{ color: 'var(--ces-ink)' }}>{l.name}</span>
                        {l.deductedFromNet
                          ? <Pill tone="muted" sm>net</Pill>
                          : <Pill tone="info" sm>işəg.</Pill>}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11.5px]" style={{ color: 'var(--ces-muted)' }}>
                        <span>İşçi: <b style={{ color: 'var(--ces-ink)' }}>{fmtMoney(l.employeeAmount)}</b></span>
                        <span>İşəg.: <b style={{ color: 'var(--ces-ink)' }}>{fmtMoney(l.employerAmount)}</b></span>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-lg px-3 py-2.5 mt-3" style={{ background: 'var(--ces-gold-100)' }}>
                    <Row label="İşçi tutulmaları" value={preview.totalEmployeeDeductions} />
                    <Row label="İşəgötürən töhfələri" value={preview.totalEmployerContributions} />
                    <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: '1px solid var(--ces-gold)' }}>
                      <span className="text-[13px] font-extrabold" style={{ color: 'var(--ces-gold-700)' }}>Net (ödənilməli)</span>
                      <span className="text-[16px] font-extrabold num" style={{ color: 'var(--ces-gold-700)' }}>{fmtMoney(preview.netPay)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-[12px] px-3 py-3 rounded-lg" style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', color: 'var(--ces-muted)' }}>
                  <Info size={13} className="flex-none mt-0.5" /> Baza daxil edin — nəticə anında hesablanacaq.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span style={{ color: 'var(--ces-gold-700)' }}>{label}</span>
      <span className="num font-bold" style={{ color: 'var(--ces-gold-700)' }}>{fmtMoney(value)}</span>
    </div>
  )
}

/** İnline redaktə olunan aralıq cədvəli. */
function BracketTable({ title, rows, onCell, onAdd, onRemove, readOnly }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[.12em]" style={{ color: 'var(--ces-muted)' }}>{title}</span>
        {!readOnly && (
          <button onClick={onAdd} className="text-[11.5px] font-semibold flex items-center gap-1" style={{ color: 'var(--ces-gold-700)' }}>
            <Plus size={12} /> Aralıq
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--ces-mute2)' }} className="text-[10.5px] font-bold uppercase tracking-[.1em]">
              <th className="text-left py-1 pr-2 font-bold">Alt hədd ₼</th>
              <th className="text-left py-1 pr-2 font-bold">Üst hədd ₼</th>
              <th className="text-left py-1 pr-2 font-bold">Sabit məbləğ ₼</th>
              <th className="text-left py-1 pr-2 font-bold">Faiz %</th>
              {!readOnly && <th className="w-8"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={readOnly ? 4 : 5} className="py-2 text-[11.5px]" style={{ color: 'var(--ces-mute2)' }}>Aralıq yoxdur</td></tr>
            )}
            {rows.map((r, ri) => (
              <tr key={ri}>
                <td className="py-1 pr-2"><Cell value={r.lowerBound} onChange={(v) => onCell(ri, 'lowerBound', v)} readOnly={readOnly} /></td>
                <td className="py-1 pr-2"><UpperCell value={r.upperBound} onChange={(v) => onCell(ri, 'upperBound', v)} readOnly={readOnly} /></td>
                <td className="py-1 pr-2"><Cell value={r.fixedAmount} onChange={(v) => onCell(ri, 'fixedAmount', v)} readOnly={readOnly} /></td>
                <td className="py-1 pr-2"><PctCell value={r.rate} onChange={(v) => onCell(ri, 'rate', v)} readOnly={readOnly} /></td>
                {!readOnly && (
                  <td className="py-1">
                    <button onClick={() => onRemove(ri)} className="grid place-items-center w-6 h-6 rounded" style={{ color: 'var(--ces-danger)' }} title="Sil">
                      <Trash2 size={13} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Cell({ value, onChange, readOnly, placeholder }) {
  return (
    <input
      type="number"
      step="0.01"
      value={value ?? ''}
      placeholder={placeholder}
      disabled={readOnly}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      className="w-full px-2 py-1.5 text-[12.5px] num outline-none"
      style={{ background: readOnly ? 'var(--ces-graphite-50)' : 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '7px', color: 'var(--ces-ink)' }}
    />
  )
}

/** Üst hədd hücrəsi — ya rəqəm, ya da "∞ sonsuz" (ən yuxarı dilim). */
function UpperCell({ value, onChange, readOnly }) {
  // null/undefined = açıq-aşkar sonsuz (∞ chip); '' = boş, redaktə olunan input
  if (value === null || value === undefined) {
    return (
      <div className="flex items-center gap-1">
        <span className="flex-1 px-2 py-1.5 text-[12px] font-bold rounded-[7px] text-center inline-flex items-center justify-center gap-1"
          style={{ background: 'var(--ces-gold-100)', color: 'var(--ces-gold-700)', border: '1px solid var(--ces-line)' }}>
          <InfinityIcon size={13} /> sonsuz
        </span>
        {!readOnly && (
          <button type="button" onClick={() => onChange(0)} title="Rəqəm daxil et"
            className="grid place-items-center w-6 h-6 rounded flex-none" style={{ color: 'var(--ces-muted)' }}>
            <Pencil size={12} />
          </button>
        )}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1">
      <input
        type="number" step="0.01" value={value ?? ''} placeholder="rəqəm və ya ∞" disabled={readOnly}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className="w-full px-2 py-1.5 text-[12.5px] num outline-none"
        style={{ background: readOnly ? 'var(--ces-graphite-50)' : 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '7px', color: 'var(--ces-ink)' }}
      />
      {!readOnly && (
        <button type="button" onClick={() => onChange(null)} title="Sonsuz et (ən yuxarı dilim)"
          className="grid place-items-center w-6 h-6 rounded flex-none" style={{ color: 'var(--ces-gold-700)' }}>
          <InfinityIcon size={14} />
        </button>
      )}
    </div>
  )
}

/** Faiz hücrəsi — daxili fraction (0.03), göstərilən %. */
function PctCell({ value, onChange, readOnly }) {
  const display = value === '' || value === null || value === undefined ? '' : +(Number(value) * 100).toFixed(4)
  return (
    <input
      type="number"
      step="0.01"
      value={display}
      disabled={readOnly}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value) / 100)}
      className="w-full px-2 py-1.5 text-[12.5px] num outline-none"
      style={{ background: readOnly ? 'var(--ces-graphite-50)' : 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '7px', color: 'var(--ces-ink)' }}
    />
  )
}
