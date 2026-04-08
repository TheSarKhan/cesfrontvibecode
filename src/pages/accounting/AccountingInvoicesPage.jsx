import DateInput from '../../components/common/DateInput'
import { useState, useEffect, useMemo, useRef, useCallback, Fragment } from 'react'
import {
  Plus, Search, Pencil, Trash2,
  ArrowUpRight, ArrowDownRight, CreditCard,
  Receipt, Download, PenLine, X, CheckCircle, Undo2,
  ChevronDown, ArrowLeft,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { accountingApi } from '../../api/accounting'
import { projectsApi } from '../../api/projects'
import InvoiceModal from './InvoiceModal'
import InvoicePrintModal from './InvoicePrintModal'
import TransactionModal from './TransactionModal'
import PaymentModal from './PaymentModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'
import Pagination from '../../components/common/Pagination'

/* ─── Sabitlər ─────────────────────────────────────────────────────────────── */
const fmtMoney = (v) => v != null
  ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼'
  : '—'
const fmt = (d) => d ? new Date(d).toLocaleDateString('az-AZ') : '—'
const dash = (v) => (v != null && v !== '') ? v : '—'

const MAIN_TABS = [
  { id: 'invoices',     label: 'Qaimələr',        icon: Receipt },
  { id: 'transactions', label: 'Əməliyyatlar',    icon: ArrowUpRight },
  { id: 'payments',     label: 'Ödənişlər',       icon: CreditCard },
]

const TYPE_CONFIG = {
  INCOME:             { label: 'Gəlir',  short: 'Gəlir',  cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  CONTRACTOR_EXPENSE: { label: 'Ödəmə',  short: 'Ödəmə',  cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  COMPANY_EXPENSE:    { label: 'Xərc',   short: 'Xərc',   cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
}

const PAYMENT_STATUS_CFG = {
  PENDING:   { label: 'Gözləyir',      cls: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800' },
  COMPLETED: { label: 'Tamamlanıb',    cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  CANCELLED: { label: 'Ləğv edilib',    cls: 'bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' },
  OVERDUE:   { label: 'Gecikib',       cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
}

const CATEGORY_LABELS = {
  RENTAL_INCOME: 'İcarə gəliri', SERVICE_INCOME: 'Xidmət gəliri', PROJECT_INCOME: 'Layihə gəliri',
  TRANSPORT_INCOME: 'Daşıma gəliri', PENALTY_INCOME: 'Cərimə gəliri', OTHER_INCOME: 'Digər gəlir',
  FUEL: 'Yanacaq', MAINTENANCE: 'Texniki xidmət', SPARE_PARTS: 'Ehtiyat hissələri',
  SALARY: 'Əmək haqqı', INSURANCE: 'Sığorta', TAX: 'Vergi', RENT: 'İcarə xərci',
  TRANSPORT: 'Daşıma', UTILITIES: 'Kommunal', OFFICE: 'Ofis', CONTRACTOR_PAYMENT: 'Podratçı ödənişi',
  EQUIPMENT_PURCHASE: 'Texnika alışı', DEPRECIATION: 'Amortizasiya', PENALTY_EXPENSE: 'Cərimə xərci',
  OTHER_EXPENSE: 'Digər xərc', MARKETING: 'Marketinq', LEGAL: 'Hüquqi', OTHER: 'Digər',
}

const METHOD_LABELS = {
  CASH: 'Nağd', BANK_TRANSFER: 'Bank', CARD: 'Kart', CHECK: 'Çek', OFFSET: 'Hesablaşma',
}

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1']

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function AccountingInvoicesPage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore(s => s.hasPermission)
  const canCreate = hasPermission('ACCOUNTING', 'canPost')
  const canEdit   = hasPermission('ACCOUNTING', 'canPut')
  const canDelete = hasPermission('ACCOUNTING', 'canDelete')
  const canReturn = hasPermission('ACCOUNTING', 'canReturnToProject')
  const { confirm, ConfirmDialog } = useConfirm()

  const [activeTab, setActiveTab] = useState('invoices')
  const [invoices, setInvoices] = useState([])
  const [invoiceData, setInvoiceData] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [invoicePage, setInvoicePage] = useState(0)
  const [invoicePageSize, setInvoicePageSize] = useState(15)
  const [transactions, setTransactions] = useState([])
  const [payments, setPayments] = useState([])
  const [budgets, setBudgets] = useState([])
  const [summary, setSummary] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [invoiceModal, setInvoiceModal] = useState({ open: false, editing: null, defaultType: null, preProject: null })
  const [fieldsModal, setFieldsModal] = useState({ open: false, inv: null, saving: false, form: { invoiceNumber: '', invoiceDate: '', notes: '' } })
  const [expandedId, setExpandedId] = useState(null)
  const [inlineForm, setInlineForm] = useState({ invoiceNumber: '', invoiceDate: '', notes: '' })
  const [inlineSaving, setInlineSaving] = useState(false)
  const [transactionModal, setTransactionModal] = useState({ open: false, editing: null, defaultType: null })
  const [paymentModal, setPaymentModal] = useState({ open: false, editing: null })
  const [printInv, setPrintInv] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [invoiceTab, setInvoiceTab] = useState('')
  const [txnFilter, setTxnFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const searchRef = useRef(null)

  usePageShortcuts({
    onNew: canCreate ? () => handleNewAction() : undefined,
    searchRef,
  })

  const handleNewAction = () => {
    if (activeTab === 'invoices') setInvoiceModal({ open: true, editing: null, defaultType: 'INCOME', preProject: null })
    else if (activeTab === 'transactions') setTransactionModal({ open: true, editing: null, defaultType: 'INCOME' })
    else if (activeTab === 'payments') setPaymentModal({ open: true, editing: null })
    else setTransactionModal({ open: true, editing: null, defaultType: 'INCOME' })
  }

  /* ── Data Loading ── */
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const results = await Promise.allSettled([
        accountingApi.getAll(),
        accountingApi.getSummary(),
        projectsApi.getAll(),
        // TODO: API endpoints hazır olmadığında dəstəklənəcək
        // accountingApi.getTransactions(),
        // accountingApi.getPayments(),
        // accountingApi.getBudgets(),
      ])
      const extract = (r) => r.status === 'fulfilled' ? (r.value?.data?.data || r.value?.data || []) : []
      setInvoices(extract(results[0]))
      setSummary(results[1].status === 'fulfilled' ? (results[1].value?.data?.data || results[1].value?.data) : null)
      setProjects(extract(results[2]))
      // Hələlik boş
      setTransactions([])
      setPayments([])
      setBudgets([])
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // Reset invoice page when filters change
  useEffect(() => { setInvoicePage(0) }, [invoiceTab, search])

  // ── Paged invoices for the table ──
  const loadInvoices = useCallback(async () => {
    if (activeTab !== 'invoices') return
    try {
      const params = { page: invoicePage, size: invoicePageSize }
      if (invoiceTab) params.type = invoiceTab
      if (search) params.q = search
      const res = await accountingApi.getAllPaged(params)
      setInvoiceData(res.data.data || res.data)
    } catch { /* silent */ }
  }, [activeTab, invoicePage, invoicePageSize, invoiceTab, search])

  useEffect(() => { loadInvoices() }, [loadInvoices])

  /* ── Computed ── */
  const totalIncome = useMemo(() =>
    transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + parseFloat(t.amount || 0), 0)
  , [transactions])

  const totalExpense = useMemo(() =>
    transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + parseFloat(t.amount || 0), 0)
  , [transactions])

  const totalPendingPayments = useMemo(() =>
    payments.filter(p => p.status === 'PENDING').reduce((s, p) => s + parseFloat(p.amount || 0), 0)
  , [payments])

const filteredTransactions = useMemo(() => {
    const q = search.toLowerCase()
    return transactions.filter(t => {
      const matchType = !txnFilter || t.type === txnFilter
      const matchSearch = !q ||
        t.description?.toLowerCase().includes(q) ||
        t.referenceNumber?.toLowerCase().includes(q) ||
        (CATEGORY_LABELS[t.category] || '').toLowerCase().includes(q)
      return matchType && matchSearch
    })
  }, [transactions, txnFilter, search])

  const filteredPayments = useMemo(() => {
    const q = search.toLowerCase()
    return payments.filter(p => {
      const matchStatus = !paymentFilter || p.status === paymentFilter
      const matchSearch = !q ||
        p.partyName?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.referenceNumber?.toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [payments, paymentFilter, search])

  const toggleExpand = (inv) => {
    if (expandedId === inv.id) {
      setExpandedId(null)
    } else {
      setExpandedId(inv.id)
      setInlineForm({ invoiceNumber: inv.invoiceNumber || '', invoiceDate: inv.invoiceDate || '', notes: inv.notes || '' })
    }
  }

  const handleInlineSave = async (inv) => {
    setInlineSaving(true)
    try {
      await accountingApi.patchFields(inv.id, {
        invoiceNumber: inlineForm.invoiceNumber || null,
        invoiceDate: inlineForm.invoiceDate || null,
        notes: inlineForm.notes || null,
      })
      toast.success('Sahələr yeniləndi')
      loadInvoices()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    } finally {
      setInlineSaving(false)
    }
  }

  /* ── Delete handlers ── */
  const handleDeleteInvoice = async (inv) => {
    if (!(await confirm({ title: 'Qaiməni sil', message: `"${inv.invoiceNumber || `#${inv.id}`}" silinsin?` }))) return
    try { await accountingApi.delete(inv.id); toast.success('Qaimə silindi'); loadAll(); loadInvoices() }
    catch (err) { if (!err?.isPending) return }
  }

  const handleApprove = async (inv) => {
    if (!(await confirm({ title: 'Qaiməni təsdiqlə', message: `"${inv.invoiceNumber || `#${inv.id}`}" təsdiqlənsin? Layihənin maliyyə hissəsinə gəlir olaraq əlavə ediləcək.` }))) return
    try { await accountingApi.approve(inv.id); toast.success('Qaimə təsdiqləndi'); loadAll(); loadInvoices() }
    catch (err) { toast.error(err?.response?.data?.message || 'Xəta baş verdi') }
  }

  const handleReturnToProject = async (inv) => {
    if (!(await confirm({ title: 'Layihəyə geri göndər', message: `"${inv.invoiceNumber || `#${inv.id}`}" layihəyə geri qaytarılsın? Bu əməliyyat geri qaytarıla bilməz.` }))) return
    try { await accountingApi.returnToProject(inv.id); toast.success('Qaimə geri qaytarıldı'); loadAll(); loadInvoices() }
    catch (err) { toast.error(err?.response?.data?.message || 'Xəta baş verdi') }
  }

  const handleDeleteTransaction = async (t) => {
    if (!(await confirm({ title: 'Əməliyyatı sil', message: `${fmtMoney(t.amount)} məbləğli əməliyyat silinsin?` }))) return
    try { await accountingApi.deleteTransaction(t.id); toast.success('Əməliyyat silindi'); loadAll() }
    catch (err) { if (!err?.isPending) return }
  }

  const handleDeletePayment = async (p) => {
    if (!(await confirm({ title: 'Ödənişi sil', message: `${fmtMoney(p.amount)} ödəniş silinsin?` }))) return
    try { await accountingApi.deletePayment(p.id); toast.success('Ödəniş silindi'); loadAll() }
    catch (err) { if (!err?.isPending) return }
  }

  /* ── Excel export ── */
  const exportTransactions = () => {
    const rows = filteredTransactions.map(t => ({
      'Növ': t.type === 'INCOME' ? 'Gəlir' : 'Xərc',
      'Kateqoriya': CATEGORY_LABELS[t.category] || t.category,
      'Məbləğ': t.amount,
      'Tarix': t.transactionDate,
      'Ödəniş üsulu': METHOD_LABELS[t.paymentMethod] || t.paymentMethod,
      'İstinad': t.referenceNumber || '',
      'Açıqlama': t.description || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Əməliyyatlar')
    XLSX.writeFile(wb, `əməliyyatlar-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/accounting')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Qaimələr</h1>
            <p className="text-xs text-gray-400 mt-0.5">E-qaimələrin idarə edilməsi</p>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={handleNewAction}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            {activeTab === 'invoices' ? 'Yeni Qaimə' :
             activeTab === 'transactions' ? 'Yeni Əməliyyat' :
             activeTab === 'payments' ? 'Yeni Ödəniş' : 'Yeni Əməliyyat'}
          </button>
        )}
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 mb-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
        {MAIN_TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch('') }}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-lg transition-colors',
                activeTab === tab.id
                  ? 'bg-amber-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>


      {/* ═══════════════ INVOICES TAB ═══════════════ */}
      {activeTab === 'invoices' && (
        <div>
          {/* Sub tabs */}
          <div className="flex gap-1 mb-4 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5">
            {[
              { id: '', label: 'Hamısı' },
              { id: 'INCOME', label: 'Gəlirlər' },
              { id: 'CONTRACTOR_EXPENSE', label: 'Ödəmələr' },
              { id: 'COMPANY_EXPENSE', label: 'Xərclər' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setInvoiceTab(tab.id)}
                className={clsx('flex-1 py-1.5 px-2 text-[11px] font-medium rounded-md transition-colors',
                  invoiceTab === tab.id ? 'bg-white dark:bg-gray-800 shadow-sm text-amber-600' : 'text-gray-500 hover:text-gray-700'
                )}>
                {tab.label}
                {tab.id && <span className="ml-1 opacity-60">({invoices.filter(i => i.type === tab.id).length})</span>}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Qaimə nömrəsi, şirkət, layihə..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                    <th className="w-8 py-3 px-2"></th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Növ</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qaimə nömrəsi</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Məbləğ</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarix</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dövr</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Şirkət</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Layihə</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <TableSkeleton cols={9} rows={5} /> : invoiceData.content.length === 0 ? (
                    <EmptyState icon={Receipt} title="Qaimə tapılmadı" description="Yeni qaimə əlavə edin"
                      action={canCreate ? () => setInvoiceModal({ open: true, editing: null, defaultType: invoiceTab || 'INCOME', preProject: null }) : undefined}
                      actionLabel="Yeni Qaimə" />
                  ) : invoiceData.content.map(inv => {
                    const typeCfg = TYPE_CONFIG[inv.type] || TYPE_CONFIG.INCOME
                    const isExpanded = expandedId === inv.id
                    return (
                      <Fragment key={inv.id}>
                        <tr
                          onClick={() => toggleExpand(inv)}
                          className={clsx(
                            'border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors',
                            isExpanded ? 'bg-amber-50/40 dark:bg-amber-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                          )}
                        >
                          <td className="py-2.5 px-2 text-center">
                            <ChevronDown size={14} className={clsx('text-gray-400 transition-transform mx-auto', isExpanded && 'rotate-180')} />
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={clsx('px-2 py-0.5 rounded-md text-xs font-bold border', typeCfg.cls)}>{typeCfg.short}</span>
                          </td>
                          <td className="py-2.5 px-4">
                            <p className="text-xs font-mono font-semibold text-gray-800 dark:text-gray-200">{inv.invoiceNumber || <span className="text-gray-400 italic font-normal">doldurulmayıb</span>}</p>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={clsx('text-sm font-bold', inv.type === 'INCOME' ? 'text-green-600' : 'text-red-500')}>
                              {inv.type === 'INCOME' ? '+' : '−'}{fmtMoney(inv.amount)}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-xs text-gray-500 whitespace-nowrap">{fmt(inv.invoiceDate)}</td>
                          <td className="py-2.5 px-4">
                            {inv.periodMonth && inv.periodYear ? (
                              <span className="text-xs text-indigo-600 font-medium whitespace-nowrap">
                                {new Date(inv.periodYear, inv.periodMonth - 1).toLocaleDateString('az-AZ', { month: 'short', year: 'numeric' })}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4">
                            <p className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{inv.companyName || inv.contractorName || '—'}</p>
                          </td>
                          <td className="py-2.5 px-4">
                            {inv.projectCode ? <span className="text-xs font-mono text-green-600">{inv.projectCode}</span> : <span className="text-xs text-gray-400">—</span>}
                          </td>
                          <td className="py-2.5 px-4">
                            {inv.status === 'APPROVED'
                              ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-50 text-green-600 border border-green-200"><CheckCircle size={11} /> Təsdiqlənib</span>
                              : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">Gözləyir</span>
                            }
                          </td>
                        </tr>
                        {/* Expanded detail panel */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="p-0">
                              <div className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                                {inv.status === 'SENT' && canEdit ? (
                                  <div className="space-y-4">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sahələri doldur</p>
                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Qaimə nömrəsi</label>
                                        <input
                                          value={inlineForm.invoiceNumber}
                                          onChange={e => setInlineForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                                          onClick={e => e.stopPropagation()}
                                          placeholder="MT251010637360"
                                          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white dark:bg-gray-800"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Tarix</label>
                                        <DateInput
                                          value={inlineForm.invoiceDate}
                                          onChange={e => setInlineForm(f => ({ ...f, invoiceDate: e.target.value }))}
                                          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white dark:bg-gray-800"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Qeydlər</label>
                                        <input
                                          value={inlineForm.notes}
                                          onChange={e => setInlineForm(f => ({ ...f, notes: e.target.value }))}
                                          onClick={e => e.stopPropagation()}
                                          placeholder="Əlavə qeyd..."
                                          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white dark:bg-gray-800"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleInlineSave(inv) }}
                                        disabled={inlineSaving}
                                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white transition-colors flex items-center gap-1.5"
                                      >
                                        <PenLine size={12} /> {inlineSaving ? 'Saxlanılır...' : 'Saxla'}
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleApprove(inv) }}
                                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center gap-1.5"
                                      >
                                        <CheckCircle size={12} /> Təsdiqlə
                                      </button>
                                      {inv.projectId && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleReturnToProject(inv) }}
                                          className="px-4 py-2 text-xs font-semibold rounded-lg bg-white hover:bg-orange-50 text-orange-600 border border-orange-200 transition-colors flex items-center gap-1.5"
                                        >
                                          <Undo2 size={12} /> Geri Qaytar
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : inv.status === 'APPROVED' ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle size={14} className="text-green-500" />
                                      <span className="text-xs font-semibold text-green-700">Təsdiqlənmiş qaimə</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-xs">
                                      <div>
                                        <span className="text-gray-400">Qaimə №</span>
                                        <p className="font-mono font-semibold text-gray-800 dark:text-gray-200">{inv.invoiceNumber || '—'}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Tarix</span>
                                        <p className="font-semibold text-gray-800 dark:text-gray-200">{fmt(inv.invoiceDate)}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Qeydlər</span>
                                        <p className="text-gray-600 dark:text-gray-300">{inv.notes || '—'}</p>
                                      </div>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {invoiceData.totalElements > 0 && (
              <div className="flex items-center justify-end gap-4 px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 text-xs">
                <span className="text-gray-500">{invoiceData.totalElements} qaimə</span>
              </div>
            )}
            <Pagination
              page={invoiceData.page + 1}
              pageSize={invoiceData.size}
              totalPages={invoiceData.totalPages}
              totalElements={invoiceData.totalElements}
              onPage={(p) => setInvoicePage(p - 1)}
              onPageSize={(s) => { setInvoicePageSize(s); setInvoicePage(0) }}
            />
          </div>
        </div>
      )}

      {/* ═══════════════ TRANSACTIONS TAB ═══════════════ */}
      {activeTab === 'transactions' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex gap-1 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5">
              {[
                { id: '', label: 'Hamısı' },
                { id: 'INCOME', label: 'Gəlir' },
                { id: 'EXPENSE', label: 'Xərc' },
              ].map(f => (
                <button key={f.id} onClick={() => setTxnFilter(f.id)}
                  className={clsx('py-1.5 px-3 text-[11px] font-medium rounded-md transition-colors',
                    txnFilter === f.id ? 'bg-white dark:bg-gray-800 shadow-sm text-amber-600' : 'text-gray-500'
                  )}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Açıqlama, kateqoriya, istinad..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <button onClick={exportTransactions} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Download size={13} /> Excel
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Növ</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kateqoriya</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Məbləğ</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarix</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ödəniş</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Açıqlama</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <TableSkeleton cols={7} rows={5} /> : filteredTransactions.length === 0 ? (
                    <EmptyState icon={ArrowUpRight} title="Əməliyyat tapılmadı" description="Yeni əməliyyat əlavə edin"
                      action={canCreate ? () => setTransactionModal({ open: true, editing: null, defaultType: txnFilter || 'INCOME' }) : undefined}
                      actionLabel="Yeni Əməliyyat" />
                  ) : filteredTransactions.map(t => (
                    <tr key={t.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="py-2.5 px-4">
                        <span className={clsx('inline-flex items-center gap-1 text-xs font-semibold',
                          t.type === 'INCOME' ? 'text-green-600' : 'text-red-500')}>
                          {t.type === 'INCOME' ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                          {t.type === 'INCOME' ? 'Gəlir' : 'Xərc'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-gray-700 dark:text-gray-300">{CATEGORY_LABELS[t.category] || t.category || '—'}</td>
                      <td className="py-2.5 px-4">
                        <span className={clsx('text-sm font-bold', t.type === 'INCOME' ? 'text-green-600' : 'text-red-500')}>
                          {t.type === 'INCOME' ? '+' : '−'}{fmtMoney(t.amount)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-gray-500 whitespace-nowrap">{fmt(t.transactionDate)}</td>
                      <td className="py-2.5 px-4 text-xs text-gray-500">{METHOD_LABELS[t.paymentMethod] || t.paymentMethod || '—'}</td>
                      <td className="py-2.5 px-4 text-xs text-gray-600 dark:text-gray-400 truncate max-w-[180px]">{t.description || '—'}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-0.5 justify-end">
                          {canEdit && <button onClick={() => setTransactionModal({ open: true, editing: t })} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"><Pencil size={13} /></button>}
                          {canDelete && <button onClick={() => handleDeleteTransaction(t)} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredTransactions.length > 0 && (
              <div className="flex items-center justify-end gap-4 px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 text-xs">
                <span className="text-gray-500">{filteredTransactions.length} əməliyyat</span>
                <span className="font-semibold text-green-600">+{fmtMoney(filteredTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + parseFloat(t.amount || 0), 0))}</span>
                <span className="font-semibold text-red-500">−{fmtMoney(filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + parseFloat(t.amount || 0), 0))}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ PAYMENTS TAB ═══════════════ */}
      {activeTab === 'payments' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex gap-1 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5">
              {[
                { id: '', label: 'Hamısı' },
                { id: 'PENDING', label: 'Gözləyir' },
                { id: 'COMPLETED', label: 'Tamamlanıb' },
                { id: 'OVERDUE', label: 'Gecikib' },
              ].map(f => (
                <button key={f.id} onClick={() => setPaymentFilter(f.id)}
                  className={clsx('py-1.5 px-3 text-[11px] font-medium rounded-md transition-colors',
                    paymentFilter === f.id ? 'bg-white dark:bg-gray-800 shadow-sm text-amber-600' : 'text-gray-500'
                  )}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Tərəf, açıqlama, istinad..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">İstiqamət</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tərəf</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Məbləğ</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarix</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Son tarix</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Üsul</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <TableSkeleton cols={8} rows={5} /> : filteredPayments.length === 0 ? (
                    <EmptyState icon={CreditCard} title="Ödəniş tapılmadı" description="Yeni ödəniş əlavə edin"
                      action={canCreate ? () => setPaymentModal({ open: true, editing: null }) : undefined}
                      actionLabel="Yeni Ödəniş" />
                  ) : filteredPayments.map(p => {
                    const statusCfg = PAYMENT_STATUS_CFG[p.status] || PAYMENT_STATUS_CFG.PENDING
                    return (
                      <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                        <td className="py-2.5 px-4">
                          <span className={clsx('inline-flex items-center gap-1 text-xs font-semibold',
                            p.direction === 'INCOMING' ? 'text-green-600' : 'text-red-500')}>
                            {p.direction === 'INCOMING' ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                            {p.direction === 'INCOMING' ? 'Daxil' : 'Çıxan'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-gray-700 dark:text-gray-300 truncate max-w-[140px]">{p.partyName || '—'}</td>
                        <td className="py-2.5 px-4">
                          <span className={clsx('text-sm font-bold', p.direction === 'INCOMING' ? 'text-green-600' : 'text-red-500')}>
                            {p.direction === 'INCOMING' ? '+' : '−'}{fmtMoney(p.amount)}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-gray-500 whitespace-nowrap">{fmt(p.paymentDate)}</td>
                        <td className="py-2.5 px-4 text-xs text-gray-500 whitespace-nowrap">{fmt(p.dueDate)}</td>
                        <td className="py-2.5 px-4">
                          <span className={clsx('px-2 py-0.5 rounded text-[10px] font-semibold border', statusCfg.cls)}>{statusCfg.label}</span>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-gray-500">{METHOD_LABELS[p.paymentMethod] || '—'}</td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-0.5 justify-end">
                            {canEdit && <button onClick={() => setPaymentModal({ open: true, editing: p })} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"><Pencil size={13} /></button>}
                            {canDelete && <button onClick={() => handleDeletePayment(p)} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {filteredPayments.length > 0 && (
              <div className="flex items-center justify-end gap-4 px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 text-xs">
                <span className="text-gray-500">{filteredPayments.length} ödəniş</span>
                <span className="font-semibold text-green-600">Daxil: +{fmtMoney(filteredPayments.filter(p => p.direction === 'INCOMING').reduce((s, p) => s + parseFloat(p.amount || 0), 0))}</span>
                <span className="font-semibold text-red-500">Çıxan: −{fmtMoney(filteredPayments.filter(p => p.direction === 'OUTGOING').reduce((s, p) => s + parseFloat(p.amount || 0), 0))}</span>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ═══════════════ MODALS ═══════════════ */}
      {invoiceModal.open && (
        <InvoiceModal
          editing={invoiceModal.editing}
          defaultType={invoiceModal.defaultType}
          preProject={invoiceModal.preProject}
          onClose={() => setInvoiceModal({ open: false, editing: null, defaultType: null, preProject: null })}
          onSaved={() => { setInvoiceModal({ open: false, editing: null, defaultType: null, preProject: null }); loadAll(); loadInvoices() }}
        />
      )}

      {transactionModal.open && (
        <TransactionModal
          editing={transactionModal.editing}
          defaultType={transactionModal.defaultType}
          onClose={() => setTransactionModal({ open: false, editing: null, defaultType: null })}
          onSaved={() => { setTransactionModal({ open: false, editing: null, defaultType: null }); loadAll() }}
        />
      )}

      {paymentModal.open && (
        <PaymentModal
          editing={paymentModal.editing}
          onClose={() => setPaymentModal({ open: false, editing: null })}
          onSaved={() => { setPaymentModal({ open: false, editing: null }); loadAll() }}
        />
      )}


      {/* ═══ Sahələri Doldur Modal ═══ */}
      {fieldsModal.open && fieldsModal.inv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Sahələri Doldur</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {fieldsModal.inv.projectCode && <span className="font-mono text-green-600">{fieldsModal.inv.projectCode} · </span>}
                  {fieldsModal.inv.companyName || '—'}
                  {fieldsModal.inv.periodMonth && fieldsModal.inv.periodYear && (
                    <span className="ml-1 text-indigo-600">
                      · {new Date(fieldsModal.inv.periodYear, fieldsModal.inv.periodMonth - 1).toLocaleDateString('az-AZ', { month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </p>
              </div>
              <button onClick={() => setFieldsModal(s => ({ ...s, open: false }))} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            {/* Form */}
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Qaimə nömrəsi</label>
                <input
                  value={fieldsModal.form.invoiceNumber}
                  onChange={e => setFieldsModal(s => ({ ...s, form: { ...s.form, invoiceNumber: e.target.value } }))}
                  placeholder="MT251010637360"
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Tarix</label>
                <DateInput
                  value={fieldsModal.form.invoiceDate}
                  onChange={e => setFieldsModal(s => ({ ...s, form: { ...s.form, invoiceDate: e.target.value } }))}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Qeydlər</label>
                <textarea
                  value={fieldsModal.form.notes}
                  onChange={e => setFieldsModal(s => ({ ...s, form: { ...s.form, notes: e.target.value } }))}
                  rows={2}
                  placeholder="Əlavə qeyd..."
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            {/* Footer */}
            <div className="flex gap-2 px-5 pb-4">
              <button
                onClick={() => setFieldsModal(s => ({ ...s, open: false }))}
                className="flex-1 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Ləğv et
              </button>
              <button
                disabled={fieldsModal.saving}
                onClick={async () => {
                  setFieldsModal(s => ({ ...s, saving: true }))
                  try {
                    await accountingApi.patchFields(fieldsModal.inv.id, {
                      invoiceNumber: fieldsModal.form.invoiceNumber || null,
                      invoiceDate:   fieldsModal.form.invoiceDate    || null,
                      notes:         fieldsModal.form.notes          || null,
                    })
                    toast.success('Sahələr yeniləndi')
                    setFieldsModal(s => ({ ...s, open: false }))
                    loadInvoices()
                  } catch (err) {
                    toast.error(err?.response?.data?.message || 'Xəta baş verdi')
                    setFieldsModal(s => ({ ...s, saving: false }))
                  }
                }}
                className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {fieldsModal.saving ? 'Saxlanır...' : 'Saxla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {printInv && <InvoicePrintModal inv={printInv} onClose={() => setPrintInv(null)} />}
      <ConfirmDialog />
    </div>
  )
}
