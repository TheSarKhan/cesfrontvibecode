import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Plus, CheckCircle2, Pencil, Trash2, ArrowLeft, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'
import TaxConfigModal from './TaxConfigModal'
import { PageHeader, Pill } from './_shared'
import { pct } from './_constants'

export default function TaxConfigPage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('HR_MANAGEMENT', 'canPost')
  const canEdit   = hasPermission('HR_MANAGEMENT', 'canPut')
  const canDelete = hasPermission('HR_MANAGEMENT', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [list, setList]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState({ open: false, editing: null })

  const load = async () => {
    setLoading(true)
    try { setList((await hrApi.getTaxRates()).data?.data ?? []) }
    catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Yüklənmədi') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const activate = async (cfg) => {
    if (!(await confirm({ title: 'Aktivləşdir', message: `${cfg.year} ili tarifi aktiv tarif kimi seçilsin?` }))) return
    try { await hrApi.activateTaxRate(cfg.id); toast.success('Aktivləşdirildi'); load() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const remove = async (cfg) => {
    if (!(await confirm({ title: 'Sil', message: `${cfg.year} ili tarifini silmək istəyirsiniz?` }))) return
    try { await hrApi.deleteTaxRate(cfg.id); toast.success('Silindi'); load() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }

  return (
    <div style={{ color: 'var(--ces-ink)' }}>
      <ConfirmDialog />

      <PageHeader
        eyebrow="HR · Tariflər"
        title="Vergi və sığorta tarifləri"
        subtitle="İllik vergi və sığorta faizlərinin konfiqurasiyası"
        right={
          <>
            <button onClick={() => navigate('/hr')} className="ces-btn ces-btn-outline ces-btn-sm">
              <ArrowLeft size={14} /> HR
            </button>
            {canCreate && (
              <button onClick={() => setModal({ open: true, editing: null })} className="ces-btn ces-btn-primary">
                <Plus size={16} /> Yeni il
              </button>
            )}
          </>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-48 gap-2" style={{ color: 'var(--ces-muted)' }}>
          <span className="w-4 h-4 rounded-full animate-spin"
            style={{ border: '2px solid var(--ces-line)', borderTopColor: 'var(--ces-gold)' }} />
          <span className="text-[13px] font-medium">Yüklənir...</span>
        </div>
      ) : list.length === 0 ? (
        <div
          className="text-center py-16"
          style={{
            background: 'var(--ces-surface)',
            border: '1px solid var(--ces-line)',
            borderRadius: 'var(--ces-radius-lg)',
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl mx-auto mb-3 grid place-items-center"
            style={{ background: 'var(--ces-graphite-50)' }}
          >
            <Settings size={20} style={{ color: 'var(--ces-mute2)' }} />
          </div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--ces-ink)' }}>Hələ heç bir tarif yoxdur</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {list.map((cfg) => (
            <div
              key={cfg.id}
              className="overflow-hidden flex"
              style={{
                background: 'var(--ces-surface)',
                border: `1px solid ${cfg.active ? 'var(--ces-gold)' : 'var(--ces-line)'}`,
                borderRadius: 'var(--ces-radius-lg)',
                boxShadow: cfg.active ? '0 0 0 3px rgba(200,147,42,.08), var(--ces-shadow-sm)' : 'var(--ces-shadow-sm)',
              }}
            >
              {cfg.active && <div style={{ width: '6px', background: 'var(--ces-gold)' }} />}
              <div className="flex-1 p-5">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[28px] font-extrabold tracking-[-.022em] leading-none num" style={{ color: 'var(--ces-graphite-900)' }}>
                        {cfg.year}
                      </h3>
                      {cfg.active && <Pill tone="gold" sm dot>Aktiv tarif</Pill>}
                    </div>
                    {cfg.notes && (
                      <p className="text-[12px] mt-2 leading-relaxed" style={{ color: 'var(--ces-muted)' }}>{cfg.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-none">
                    {canEdit   && !cfg.active && <button onClick={() => activate(cfg)} className="ces-row-act gold"   title="Aktivləşdir"><CheckCircle2 size={14} /></button>}
                    {canEdit   &&                <button onClick={() => setModal({ open: true, editing: cfg })} className="ces-row-act gold" title="Redaktə"><Pencil size={14} /></button>}
                    {canDelete && !cfg.active && <button onClick={() => remove(cfg)}   className="ces-row-act danger" title="Sil"><Trash2 size={14} /></button>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <Stat label="İşçi pensiya"     value={`${pct(cfg.employeePensionRateBelow)} / ${pct(cfg.employeePensionRateAbove)}`} sub={`thr ${cfg.employeePensionThreshold}₼`} />
                  <Stat label="İGÖ pensiya"      value={`${pct(cfg.employerPensionRateBelow)} / ${pct(cfg.employerPensionRateAbove)}`} sub={`thr ${cfg.employerPensionThreshold}₼`} />
                  <Stat label="İşsizlik · işçi/igö" value={`${pct(cfg.employeeUnemploymentRate)} / ${pct(cfg.employerUnemploymentRate)}`} />
                  <Stat label="Tibbi · işçi"     value={`${pct(cfg.employeeMedicalRateBelow)} / ${pct(cfg.employeeMedicalRateAbove)}`} sub={`thr ${cfg.employeeMedicalThreshold}₼`} />
                  <Stat label="Tibbi · igö"      value={`${pct(cfg.employerMedicalRateBelow)} / ${pct(cfg.employerMedicalRateAbove)}`} sub={`thr ${cfg.employerMedicalThreshold}₼`} />
                  <Stat label="Gəlir vergisi"    value={`${pct(cfg.incomeTaxRateBelow)} / ${pct(cfg.incomeTaxRateAbove)}`} sub={`thr ${cfg.incomeTaxThreshold}₼`} />
                </div>

                {cfg.deductSocialFromTaxBase && (
                  <div
                    className="flex items-start gap-2 mt-3 px-3 py-2 text-[11.5px] font-semibold"
                    style={{
                      borderRadius: '8px',
                      background: 'rgba(200,147,42,.08)',
                      color: 'var(--ces-gold-700)',
                    }}
                  >
                    <Info size={12} className="flex-none mt-0.5" />
                    Sosial töhfələr gəlir vergisi base-ından çıxılır
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <TaxConfigModal
          editing={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => { setModal({ open: false, editing: null }); load() }}
        />
      )}
    </div>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div
      style={{
        background: 'var(--ces-graphite-50)',
        border: '1px solid var(--ces-line)',
        borderRadius: '10px',
        padding: '10px 12px',
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[.12em]" style={{ color: 'var(--ces-muted)' }}>{label}</p>
      <p className="text-[13px] font-extrabold num mt-0.5" style={{ color: 'var(--ces-ink)' }}>{value}</p>
      {sub && <p className="text-[10px] mt-0.5 num" style={{ color: 'var(--ces-mute2)' }}>{sub}</p>}
    </div>
  )
}
