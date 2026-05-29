import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, CheckCircle2, Trash2, ArrowLeft, History, SlidersHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'
import DeductionConfigModal from './DeductionConfigModal'
import { PageHeader, Pill } from './_shared'

export default function TaxConfigPage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canEdit   = hasPermission('HR_MANAGEMENT', 'canPut')
  const canDelete = hasPermission('HR_MANAGEMENT', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setVersions((await hrApi.getDeductionVersions()).data?.data ?? []) }
    catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Yüklənmədi') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const activate = async (v) => {
    if (!(await confirm({ title: 'Aktivləşdir', message: `v${v.versionNo} (${v.effectiveDate}) aktiv versiya kimi seçilsin?` }))) return
    try { await hrApi.activateDeductionVersion(v.id); toast.success('Aktivləşdirildi'); load() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const remove = async (v) => {
    if (!(await confirm({ title: 'Sil', message: `v${v.versionNo} silinsin?` }))) return
    try { await hrApi.deleteDeductionVersion(v.id); toast.success('Silindi'); load() }
    catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }

  return (
    <div style={{ color: 'var(--ces-ink)' }}>
      <ConfirmDialog />

      <PageHeader
        title="Vergi və sığorta tutulmaları"
        subtitle="Tutulma dərəcələri, maaş aralıqları və versiya tarixçəsi"
        right={
          <>
            <button onClick={() => navigate('/hr')} className="ces-btn ces-btn-outline ces-btn-sm">
              <ArrowLeft size={14} /> HR
            </button>
            <button onClick={() => setModalOpen(true)} className="ces-btn ces-btn-primary">
              <SlidersHorizontal size={16} /> Konfiqurasiyanı aç
            </button>
          </>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-48 gap-2" style={{ color: 'var(--ces-muted)' }}>
          <span className="w-4 h-4 rounded-full animate-spin"
            style={{ border: '2px solid var(--ces-line)', borderTopColor: 'var(--ces-gold)' }} />
          <span className="text-[13px] font-medium">Yüklənir...</span>
        </div>
      ) : versions.length === 0 ? (
        <div className="text-center py-16" style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: 'var(--ces-radius-lg)' }}>
          <div className="w-12 h-12 rounded-2xl mx-auto mb-3 grid place-items-center" style={{ background: 'var(--ces-graphite-50)' }}>
            <Settings size={20} style={{ color: 'var(--ces-mute2)' }} />
          </div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--ces-ink)' }}>Hələ heç bir versiya yoxdur</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {versions.map((v) => (
            <div key={v.id} className="flex overflow-hidden"
              style={{
                background: 'var(--ces-surface)',
                border: `1px solid ${v.active ? 'var(--ces-gold)' : 'var(--ces-line)'}`,
                borderRadius: 'var(--ces-radius-lg)',
                boxShadow: v.active ? '0 0 0 3px rgba(200,147,42,.08), var(--ces-shadow-sm)' : 'var(--ces-shadow-sm)',
              }}>
              {v.active && <div style={{ width: '6px', background: 'var(--ces-gold)' }} />}
              <div className="flex-1 p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[20px] font-extrabold tracking-[-.02em]" style={{ color: 'var(--ces-graphite-900)' }}>v{v.versionNo}</h3>
                      {v.active && <Pill tone="gold" sm dot>Aktiv</Pill>}
                    </div>
                    <p className="text-[12px] mt-1 flex items-center gap-1" style={{ color: 'var(--ces-muted)' }}>
                      <History size={11} /> Qüvvəyə minir: {v.effectiveDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-none">
                    {canEdit && !v.active && <button onClick={() => activate(v)} className="ces-row-act gold" title="Aktivləşdir"><CheckCircle2 size={14} /></button>}
                    {canDelete && !v.active && <button onClick={() => remove(v)} className="ces-row-act danger" title="Sil"><Trash2 size={14} /></button>}
                  </div>
                </div>
                {v.note && <p className="text-[12px] leading-relaxed mt-2" style={{ color: 'var(--ces-muted)' }}>{v.note}</p>}
                {v.createdBy && <p className="text-[11px] mt-2" style={{ color: 'var(--ces-mute2)' }}>Yaradan: {v.createdBy}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <DeductionConfigModal
          canEdit={canEdit}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load() }}
        />
      )}
    </div>
  )
}
