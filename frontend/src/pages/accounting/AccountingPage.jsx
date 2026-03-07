import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2, TrendingUp, TrendingDown, DollarSign, BarChart3, AlertCircle, CheckCircle, ChevronRight, Printer } from 'lucide-react'
import { accountingApi } from '../../api/accounting'
import { projectsApi } from '../../api/projects'
import InvoiceModal from './InvoiceModal'
import InvoicePrintModal from './InvoicePrintModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useAuthStore } from '../../store/authStore'

const TYPE_CONFIG = {
  INCOME:             { label: 'A — Gəlir',        short: 'A',  cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  CONTRACTOR_EXPENSE: { label: 'B1 — Podratçı',    short: 'B1', cls: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' },
  COMPANY_EXPENSE:    { label: 'B2 — Şirkət xərci', short: 'B2', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
}

const TABS = [
  { id: '',                    label: 'Hamısı' },
  { id: 'INCOME',              label: 'A — Gəlir Qaimələri' },
  { id: 'CONTRACTOR_EXPENSE',  label: 'B1 — Podratçı' },
  { id: 'COMPANY_EXPENSE',     label: 'B2 — Şirkət Xərcləri' },
]

function StatCard({ icon: Icon, label, value, sub, color, textColor }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3.5 flex items-center gap-3">
      <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon size={16} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
        <p className={clsx('text-base font-bold leading-tight truncate', textColor || 'text-gray-800 dark:text-gray-100')}>{value}</p>
        {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

export default function AccountingPage() {
  const hasPermission = useAuthStore(s => s.hasPermission)
  const canCreate = hasPermission('ACCOUNTING', 'canPost')
  const canEdit   = hasPermission('ACCOUNTING', 'canPut')
  const canDelete = hasPermission('ACCOUNTING', 'canDelete')

  const [invoices, setInvoices] = useState([])
  const [summary, setSummary] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState({ open: false, editing: null, defaultType: null, preProject: null })
  const [printInv, setPrintInv] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [invRes, sumRes, projRes] = await Promise.all([
        accountingApi.getAll(),
        accountingApi.getSummary(),
        projectsApi.getAll(),
      ])
      setInvoices(invRes.data.data || invRes.data || [])
      setSummary(sumRes.data.data || sumRes.data)
      setProjects(projRes.data.data || projRes.data || [])
    } catch {
      toast.error('Məlumatlar yüklənmədi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // COMPLETED layihələrdən hansılarının hələ gəlir qaiməsi yoxdur
  const pendingProjects = useMemo(() => {
    const invoicedProjectIds = new Set(
      invoices.filter(i => i.type === 'INCOME' && i.projectId).map(i => i.projectId)
    )
    return projects.filter(p => p.status === 'COMPLETED' && !invoicedProjectIds.has(p.id))
  }, [projects, invoices])

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const matchTab = !activeTab || inv.type === activeTab
      const q = search.toLowerCase()
      const matchSearch = !q ||
        inv.invoiceNumber?.toLowerCase().includes(q) ||
        inv.etaxesId?.toLowerCase().includes(q) ||
        inv.companyName?.toLowerCase().includes(q) ||
        inv.equipmentName?.toLowerCase().includes(q) ||
        inv.contractorName?.toLowerCase().includes(q) ||
        inv.projectCode?.toLowerCase().includes(q) ||
        inv.serviceDescription?.toLowerCase().includes(q)
      return matchTab && matchSearch
    })
  }, [invoices, activeTab, search])

  const handleDelete = async (inv) => {
    if (!window.confirm(`"${inv.invoiceNumber || inv.etaxesId || `Qaimə #${inv.id}`}" silinsin?`)) return
    try {
      await accountingApi.delete(inv.id)
      toast.success('Qaimə silindi')
      load()
    } catch {
      toast.error('Silmə uğursuz oldu')
    }
  }

  const fmtMoney = (v) => v != null
    ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼'
    : '—'

  const fmt = (d) => d ? new Date(d).toLocaleDateString('az-AZ') : '—'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Mühasibatlıq — E-Qaimələr</h1>
          <p className="text-xs text-gray-400 mt-0.5">{invoices.length} qaimə</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setModal({ open: true, editing: null, defaultType: activeTab || 'INCOME', preProject: null })}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Yeni Qaimə
          </button>
        )}
      </div>

      {/* Gözləyən bağlanmış layihələr */}
      {pendingProjects.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200 dark:border-amber-800">
            <AlertCircle size={15} className="text-amber-600 shrink-0" />
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {pendingProjects.length} bağlanmış layihənin qaiməsi kəsilməyib
            </span>
          </div>
          <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
            {pendingProjects.map(p => {
              const net = parseFloat(p.netProfit ?? (parseFloat(p.totalRevenue ?? 0) - parseFloat(p.totalExpense ?? 0)))
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-green-600 dark:text-green-400">
                        {p.projectCode || `PRJ-${String(p.id).padStart(4,'0')}`}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600">
                        Bağlanmış
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{p.companyName}{p.projectName ? ` · ${p.projectName}` : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={clsx('text-xs font-bold', net >= 0 ? 'text-green-600' : 'text-red-500')}>
                      {net >= 0 ? '+' : ''}{fmtMoney(net)}
                    </p>
                    <p className="text-[10px] text-gray-400">xalis gəlir</p>
                  </div>
                  <button
                    onClick={() => setModal({ open: true, editing: null, defaultType: 'INCOME', preProject: p })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
                  >
                    <Plus size={12} />
                    Qaimə kəs
                  </button>
                  <ChevronRight size={14} className="text-amber-400 shrink-0" />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Hamısı qaimə kəsilmişsə — uğur mesajı */}
      {!loading && projects.filter(p => p.status === 'COMPLETED').length > 0 && pendingProjects.length === 0 && (
        <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
          <CheckCircle size={15} className="text-green-600 shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">
            Bütün bağlanmış layihələrin qaiməsi kəsilmişdir.
          </p>
        </div>
      )}

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard
            icon={TrendingUp}
            label={`Gəlir Qaimələri (${summary.incomeCount})`}
            value={fmtMoney(summary.totalIncome)}
            sub="A növü qaimələr"
            color="bg-green-500"
            textColor="text-green-600 dark:text-green-400"
          />
          <StatCard
            icon={TrendingDown}
            label={`Podratçı Xərci (${summary.contractorExpenseCount})`}
            value={fmtMoney(summary.totalContractorExpense)}
            sub="B1 növü qaimələr"
            color="bg-orange-500"
            textColor="text-orange-600 dark:text-orange-400"
          />
          <StatCard
            icon={DollarSign}
            label={`Şirkət Xərci (${summary.companyExpenseCount})`}
            value={fmtMoney(summary.totalCompanyExpense)}
            sub="B2 növü qaimələr"
            color="bg-red-500"
            textColor="text-red-600 dark:text-red-400"
          />
          <StatCard
            icon={BarChart3}
            label="Xalis Mənfəət"
            value={fmtMoney(summary.netProfit)}
            sub="Gəlir − Bütün xərclər"
            color={parseFloat(summary.netProfit) >= 0 ? 'bg-amber-500' : 'bg-gray-500'}
            textColor={parseFloat(summary.netProfit) >= 0
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-red-600 dark:text-red-400'}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-amber-600 text-white'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            {tab.label}
            {tab.id && (
              <span className="ml-1 opacity-70">
                ({invoices.filter(i => i.type === tab.id).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Qaimə nömrəsi, ETaxes ID, şirkət, texnika, podratçı, layihə..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Növ</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qaimə / ID</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Məbləğ</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarix</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Şirkət / Texnika</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Layihə</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Xalis Gəlir</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="py-3 px-4">
                        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-sm text-gray-400">
                    {invoices.length === 0 ? 'Hələ qaimə yoxdur' : 'Filtrlərə uyğun nəticə tapılmadı'}
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => {
                  const typeCfg = TYPE_CONFIG[inv.type] || TYPE_CONFIG.INCOME
                  return (
                    <tr key={inv.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      {/* Növ */}
                      <td className="py-3 px-4">
                        <span className={clsx('px-2 py-0.5 rounded-md text-xs font-bold border', typeCfg.cls)}>
                          {typeCfg.short}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
                          {inv.typeLabel?.split(' — ')[1]}
                        </p>
                      </td>

                      {/* Qaimə / ID */}
                      <td className="py-3 px-4">
                        {inv.invoiceNumber ? (
                          <p className="text-xs font-mono font-semibold text-gray-800 dark:text-gray-200">{inv.invoiceNumber}</p>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Nömrəsiz</span>
                        )}
                        {inv.etaxesId && (
                          <p className="text-[10px] font-mono text-amber-600 dark:text-amber-400">{inv.etaxesId}</p>
                        )}
                      </td>

                      {/* Məbləğ */}
                      <td className="py-3 px-4">
                        <span className={clsx('text-sm font-bold',
                          inv.type === 'INCOME' ? 'text-green-600' : 'text-red-500')}>
                          {inv.type === 'INCOME' ? '+' : '−'}{fmtMoney(inv.amount)}
                        </span>
                      </td>

                      {/* Tarix */}
                      <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {fmt(inv.invoiceDate)}
                      </td>

                      {/* Şirkət / Texnika / Podratçı */}
                      <td className="py-3 px-4">
                        {inv.companyName && (
                          <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{inv.companyName}</p>
                        )}
                        {inv.contractorName && (
                          <p className="text-xs text-orange-600 dark:text-orange-400">{inv.contractorName}</p>
                        )}
                        {inv.equipmentName && (
                          <p className="text-[10px] text-gray-400">{inv.equipmentName}</p>
                        )}
                        {inv.serviceDescription && (
                          <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{inv.serviceDescription}</p>
                        )}
                      </td>

                      {/* Layihə */}
                      <td className="py-3 px-4">
                        {inv.projectCode ? (
                          <div>
                            <p className="text-xs font-mono font-semibold text-green-600 dark:text-green-400">{inv.projectCode}</p>
                            <p className="text-[10px] text-gray-400 truncate max-w-[120px]">
                              {inv.projectCompanyName || inv.projectName}
                            </p>
                          </div>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>

                      {/* Xalis Gəlir (yalnız A üçün) */}
                      <td className="py-3 px-4">
                        {inv.type === 'INCOME' && inv.projectNetProfit != null ? (
                          <span className={clsx('text-xs font-semibold',
                            parseFloat(inv.projectNetProfit) >= 0 ? 'text-green-600' : 'text-red-500')}>
                            {parseFloat(inv.projectNetProfit) >= 0 ? '+' : ''}
                            {fmtMoney(inv.projectNetProfit)}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>

                      {/* Əməliyyat */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setPrintInv(inv)}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Çap et"
                          >
                            <Printer size={14} />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => setModal({ open: true, editing: inv, defaultType: null })}
                              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"
                              title="Redaktə et"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(inv)}
                              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"
                              title="Sil"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer totals */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-end gap-6 px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            <span className="text-xs text-gray-500 dark:text-gray-400">{filtered.length} qaimə</span>
            {activeTab === '' || activeTab === 'INCOME' ? (
              <span className="text-xs font-semibold text-green-600">
                Gəlir: +{fmtMoney(filtered.filter(i => i.type === 'INCOME').reduce((s, i) => s + parseFloat(i.amount || 0), 0))}
              </span>
            ) : null}
            {activeTab === '' || activeTab === 'CONTRACTOR_EXPENSE' ? (
              <span className="text-xs font-semibold text-orange-600">
                B1: −{fmtMoney(filtered.filter(i => i.type === 'CONTRACTOR_EXPENSE').reduce((s, i) => s + parseFloat(i.amount || 0), 0))}
              </span>
            ) : null}
            {activeTab === '' || activeTab === 'COMPANY_EXPENSE' ? (
              <span className="text-xs font-semibold text-red-500">
                B2: −{fmtMoney(filtered.filter(i => i.type === 'COMPANY_EXPENSE').reduce((s, i) => s + parseFloat(i.amount || 0), 0))}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {modal.open && (
        <InvoiceModal
          editing={modal.editing}
          defaultType={modal.defaultType}
          preProject={modal.preProject}
          onClose={() => setModal({ open: false, editing: null, defaultType: null, preProject: null })}
          onSaved={() => { setModal({ open: false, editing: null, defaultType: null, preProject: null }); load() }}
        />
      )}

      {printInv && (
        <InvoicePrintModal inv={printInv} onClose={() => setPrintInv(null)} />
      )}
    </div>
  )
}
