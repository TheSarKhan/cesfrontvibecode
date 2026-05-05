import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Plus, CheckCircle2, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { hrApi } from '../../api/hr'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'
import TaxConfigModal from './TaxConfigModal'

export default function TaxConfigPage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission('HR_MANAGEMENT', 'canPost')
  const canEdit = hasPermission('HR_MANAGEMENT', 'canPut')
  const canDelete = hasPermission('HR_MANAGEMENT', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, editing: null })

  const load = async () => {
    setLoading(true)
    try { setList((await hrApi.getTaxRates()).data?.data ?? []) }
    catch { toast.error('Yüklənmədi') } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const activate = async (cfg) => {
    if (!(await confirm({ title: 'Aktivləşdir', message: `${cfg.year} ili tarifi aktiv tarif kimi seçilsin?` }))) return
    try { await hrApi.activateTaxRate(cfg.id); toast.success('Aktivləşdirildi'); load() } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }
  const remove = async (cfg) => {
    if (!(await confirm({ title: 'Sil', message: `${cfg.year} ili tarifini silmək istəyirsiniz?` }))) return
    try { await hrApi.deleteTaxRate(cfg.id); toast.success('Silindi'); load() } catch (e) { toast.error(e?.response?.data?.message || 'Xəta') }
  }

  return (
    <div>
      {ConfirmDialog}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Settings size={22} className="text-violet-600" />
            Vergi Tarifləri
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">İllik vergi və sığorta faizləri</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/hr')} className="px-3 py-2 text-xs font-medium text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50">← HR</button>
          {canCreate && (
            <button onClick={() => setModal({ open: true, editing: null })} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              <Plus size={16} /> Yeni il
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Yüklənir...</div>
      ) : list.length === 0 ? (
        <div className="text-center py-10 text-gray-400">Hələ heç bir tarif yoxdur</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {list.map(cfg => (
            <div key={cfg.id} className={`rounded-2xl border p-5 ${cfg.active ? 'border-violet-300 bg-violet-50/50 dark:bg-violet-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{cfg.year}</h3>
                    {cfg.active && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-violet-600 text-white">Aktiv</span>
                    )}
                  </div>
                  {cfg.notes && <p className="text-xs text-gray-500 mt-1">{cfg.notes}</p>}
                </div>
                <div className="flex items-center gap-1">
                  {canEdit && !cfg.active && (
                    <button onClick={() => activate(cfg)} className="p-1.5 rounded hover:bg-violet-100 text-violet-600" title="Aktivləşdir"><CheckCircle2 size={14} /></button>
                  )}
                  {canEdit && (
                    <button onClick={() => setModal({ open: true, editing: cfg })} className="p-1.5 rounded hover:bg-amber-50 text-amber-600" title="Redaktə"><Pencil size={14} /></button>
                  )}
                  {canDelete && !cfg.active && (
                    <button onClick={() => remove(cfg)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Sil"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <Stat label="İşçi pensiya" value={`${pct(cfg.employeePensionRateBelow)} / ${pct(cfg.employeePensionRateAbove)}`} sub={`thr ${cfg.employeePensionThreshold}₼`} />
                <Stat label="İGÖ pensiya" value={`${pct(cfg.employerPensionRateBelow)} / ${pct(cfg.employerPensionRateAbove)}`} sub={`thr ${cfg.employerPensionThreshold}₼`} />
                <Stat label="İşsizlik (işçi/igö)" value={`${pct(cfg.employeeUnemploymentRate)} / ${pct(cfg.employerUnemploymentRate)}`} />
                <Stat label="Tibbi (işçi)" value={`${pct(cfg.employeeMedicalRateBelow)} / ${pct(cfg.employeeMedicalRateAbove)}`} sub={`thr ${cfg.employeeMedicalThreshold}₼`} />
                <Stat label="Tibbi (işəgötürən)" value={`${pct(cfg.employerMedicalRateBelow)} / ${pct(cfg.employerMedicalRateAbove)}`} sub={`thr ${cfg.employerMedicalThreshold}₼`} />
                <Stat label="Gəlir vergisi" value={`${pct(cfg.incomeTaxRateBelow)} / ${pct(cfg.incomeTaxRateAbove)}`} sub={`thr ${cfg.incomeTaxThreshold}₼`} />
              </div>

              {cfg.deductSocialFromTaxBase && (
                <p className="text-[11px] text-violet-600 mt-3">⓵ Sosial töhfələr gəlir vergisi base-ından çıxılır</p>
              )}
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

const pct = (v) => `${(Number(v) * 100).toFixed(2).replace(/\.?0+$/, '')}%`

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2">
      <p className="text-[10px] uppercase text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
