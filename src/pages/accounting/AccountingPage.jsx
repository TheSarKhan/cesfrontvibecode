import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Plus, Search, Pencil, Trash2, TrendingUp, TrendingDown, DollarSign,
  BarChart3, AlertCircle, CheckCircle, ChevronRight, Printer, Calculator,
  ArrowUpRight, ArrowDownRight, CreditCard, PiggyBank, FileText,
  Wallet, Receipt, Target, Download,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import * as XLSX from 'xlsx'
import { accountingApi } from '../../api/accounting'
import { projectsApi } from '../../api/projects'
import InvoiceModal from './InvoiceModal'
import InvoicePrintModal from './InvoicePrintModal'
import TransactionModal from './TransactionModal'
import PaymentModal from './PaymentModal'
import BudgetModal from './BudgetModal'
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
  { id: 'overview',     label: 'İcmal',           icon: BarChart3 },
  { id: 'invoices',     label: 'Qaimələr',        icon: Receipt },
  { id: 'transactions', label: 'Əməliyyatlar',    icon: ArrowUpRight },
  { id: 'payments',     label: 'Ödənişlər',       icon: CreditCard },
  { id: 'budget',       label: 'Büdcə',           icon: Target },
]

const TYPE_CONFIG = {
  INCOME:             { label: 'A — Gəlir',        short: 'A',  cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  CONTRACTOR_EXPENSE: { label: 'B1 — Podratçı',    short: 'B1', cls: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' },
  COMPANY_EXPENSE:    { label: 'B2 — Şirkət xərci', short: 'B2', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
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

/* ─── Stat Card ────────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color, textColor, onClick }) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3.5 flex items-center gap-3 transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:border-amber-200 dark:hover:border-amber-700'
      )}
    >
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

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function AccountingPage() {
  const hasPermission = useAuthStore(s => s.hasPermission)
  const canCreate = hasPermission('ACCOUNTING', 'canPost')
  const canEdit   = hasPermission('ACCOUNTING', 'canPut')
  const canDelete = hasPermission('ACCOUNTING', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [activeTab, setActiveTab] = useState('overview')
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
  const [transactionModal, setTransactionModal] = useState({ open: false, editing: null, defaultType: null })
  const [paymentModal, setPaymentModal] = useState({ open: false, editing: null })
  const [budgetModal, setBudgetModal] = useState({ open: false, editing: null })
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
    else if (activeTab === 'budget') setBudgetModal({ open: true, editing: null })
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
        accountingApi.getTransactions(),
        accountingApi.getPayments(),
        accountingApi.getBudgets(),
      ])
      const extract = (r) => r.status === 'fulfilled' ? (r.value?.data?.data || r.value?.data || []) : []
      setInvoices(extract(results[0]))
      setSummary(results[1].status === 'fulfilled' ? (results[1].value?.data?.data || results[1].value?.data) : null)
      setProjects(extract(results[2]))
      setTransactions(extract(results[3]))
      setPayments(extract(results[4]))
      setBudgets(extract(results[5]))
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

  const totalBudgetPlanned = useMemo(() =>
    budgets.reduce((s, b) => s + parseFloat(b.plannedAmount || 0), 0)
  , [budgets])

  const pendingProjects = useMemo(() => {
    const invoicedIds = new Set(invoices.filter(i => i.type === 'INCOME' && i.projectId).map(i => i.projectId))
    return projects.filter(p => p.status === 'COMPLETED' && !invoicedIds.has(p.id))
  }, [projects, invoices])

  /* ── Monthly chart data ── */
  const monthlyData = useMemo(() => {
    const months = {}
    const monthNames = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months[key] = { name: monthNames[d.getMonth()], income: 0, expense: 0 }
    }
    transactions.forEach(t => {
      const key = t.transactionDate?.slice(0, 7)
      if (months[key]) {
        if (t.type === 'INCOME') months[key].income += parseFloat(t.amount || 0)
        else months[key].expense += parseFloat(t.amount || 0)
      }
    })
    return Object.values(months)
  }, [transactions])

  /* ── Expense breakdown ── */
  const expenseBreakdown = useMemo(() => {
    const map = {}
    transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      const cat = t.category || 'OTHER_EXPENSE'
      map[cat] = (map[cat] || 0) + parseFloat(t.amount || 0)
    })
    return Object.entries(map)
      .map(([key, value]) => ({ name: CATEGORY_LABELS[key] || key, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

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

  /* ── Delete handlers ── */
  const handleDeleteInvoice = async (inv) => {
    if (!(await confirm({ title: 'Qaiməni sil', message: `"${inv.invoiceNumber || `#${inv.id}`}" silinsin?` }))) return
    try { await accountingApi.delete(inv.id); toast.success('Qaimə silindi'); loadAll(); loadInvoices() }
    catch (err) { if (!err?.isPending) return }
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

  const handleDeleteBudget = async (b) => {
    if (!(await confirm({ title: 'Büdcəni sil', message: `${CATEGORY_LABELS[b.category] || b.category} büdcəsi silinsin?` }))) return
    try { await accountingApi.deleteBudget(b.id); toast.success('Büdcə silindi'); loadAll() }
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
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Mühasibatlıq</h1>
          <p className="text-xs text-gray-400 mt-0.5">Maliyyə idarəetməsi və hesabatlar</p>
        </div>
        {canCreate && (
          <button
            onClick={handleNewAction}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            {activeTab === 'invoices' ? 'Yeni Qaimə' :
             activeTab === 'transactions' ? 'Yeni Əməliyyat' :
             activeTab === 'payments' ? 'Yeni Ödəniş' :
             activeTab === 'budget' ? 'Yeni Büdcə' : 'Yeni Əməliyyat'}
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

      {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={TrendingUp}
              label={`Gəlir (${transactions.filter(t => t.type === 'INCOME').length})`}
              value={fmtMoney(totalIncome)}
              color="bg-green-500"
              textColor="text-green-600 dark:text-green-400"
              onClick={() => { setActiveTab('transactions'); setTxnFilter('INCOME') }}
            />
            <StatCard
              icon={TrendingDown}
              label={`Xərc (${transactions.filter(t => t.type === 'EXPENSE').length})`}
              value={fmtMoney(totalExpense)}
              color="bg-red-500"
              textColor="text-red-600 dark:text-red-400"
              onClick={() => { setActiveTab('transactions'); setTxnFilter('EXPENSE') }}
            />
            <StatCard
              icon={Wallet}
              label="Xalis Balans"
              value={fmtMoney(totalIncome - totalExpense)}
              color={totalIncome - totalExpense >= 0 ? 'bg-amber-500' : 'bg-gray-500'}
              textColor={totalIncome - totalExpense >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}
            />
            <StatCard
              icon={CreditCard}
              label={`Gözləyən ödəniş (${payments.filter(p => p.status === 'PENDING').length})`}
              value={fmtMoney(totalPendingPayments)}
              color="bg-blue-500"
              textColor="text-blue-600 dark:text-blue-400"
              onClick={() => { setActiveTab('payments'); setPaymentFilter('PENDING') }}
            />
          </div>

          {/* Invoice summary from backend */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon={Receipt}
                label={`Qaimə Gəlir (${summary.incomeCount || 0})`}
                value={fmtMoney(summary.totalIncome)}
                sub="A növü qaimələr"
                color="bg-emerald-500"
                textColor="text-emerald-600 dark:text-emerald-400"
                onClick={() => { setActiveTab('invoices'); setInvoiceTab('INCOME') }}
              />
              <StatCard
                icon={FileText}
                label={`Podratçı (${summary.contractorExpenseCount || 0})`}
                value={fmtMoney(summary.totalContractorExpense)}
                sub="B1 qaimələr"
                color="bg-orange-500"
                textColor="text-orange-600 dark:text-orange-400"
                onClick={() => { setActiveTab('invoices'); setInvoiceTab('CONTRACTOR_EXPENSE') }}
              />
              <StatCard
                icon={DollarSign}
                label={`Şirkət xərci (${summary.companyExpenseCount || 0})`}
                value={fmtMoney(summary.totalCompanyExpense)}
                sub="B2 qaimələr"
                color="bg-rose-500"
                textColor="text-rose-600 dark:text-rose-400"
                onClick={() => { setActiveTab('invoices'); setInvoiceTab('COMPANY_EXPENSE') }}
              />
              <StatCard
                icon={PiggyBank}
                label="Qaimə Mənfəəti"
                value={fmtMoney(summary.netProfit)}
                sub="A − (B1 + B2)"
                color={parseFloat(summary.netProfit) >= 0 ? 'bg-teal-500' : 'bg-gray-500'}
                textColor={parseFloat(summary.netProfit) >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400'}
              />
            </div>
          )}

          {/* Pending projects alert */}
          {pendingProjects.length > 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200 dark:border-amber-800">
                <AlertCircle size={15} className="text-amber-600 shrink-0" />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  {pendingProjects.length} bağlanmış layihənin qaiməsi kəsilməyib
                </span>
              </div>
              <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
                {pendingProjects.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-mono font-bold text-green-600 dark:text-green-400">
                        {p.projectCode || `PRJ-${String(p.id).padStart(4, '0')}`}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">{p.companyName}</span>
                    </div>
                    <button
                      onClick={() => setInvoiceModal({ open: true, editing: null, defaultType: 'INCOME', preProject: p })}
                      className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-semibold rounded-lg transition-colors"
                    >
                      <Plus size={10} /> Qaimə
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly trend */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Aylıq Gəlir / Xərc Trendi</h3>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData} barGap={2}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={55}
                      tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}
                      formatter={(v) => fmtMoney(v)}
                    />
                    <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Gəlir" />
                    <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Xərc" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-12">Məlumat yoxdur</p>
              )}
            </div>

            {/* Expense pie */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Xərc Paylanması</h3>
              {expenseBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={expenseBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {expenseBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-12">Xərc məlumatı yoxdur</p>
              )}
            </div>
          </div>

          {/* Budget vs Actual quick view */}
          {budgets.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Büdcə İcmalı</h3>
                <button onClick={() => setActiveTab('budget')} className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                  Hamısını gör →
                </button>
              </div>
              <div className="space-y-2">
                {budgets.slice(0, 5).map(b => {
                  const actual = transactions
                    .filter(t => t.type === 'EXPENSE' && t.category === b.category)
                    .reduce((s, t) => s + parseFloat(t.amount || 0), 0)
                  const pct = b.plannedAmount > 0 ? Math.min((actual / parseFloat(b.plannedAmount)) * 100, 100) : 0
                  const isOver = actual > parseFloat(b.plannedAmount)
                  return (
                    <div key={b.id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 dark:text-gray-300 w-32 truncate">{CATEGORY_LABELS[b.category] || b.category}</span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={clsx('h-full rounded-full transition-all', isOver ? 'bg-red-500' : 'bg-amber-500')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={clsx('text-[10px] font-semibold w-20 text-right', isOver ? 'text-red-500' : 'text-gray-500')}>
                        {fmtMoney(actual)} / {fmtMoney(b.plannedAmount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ INVOICES TAB ═══════════════ */}
      {activeTab === 'invoices' && (
        <div>
          {/* Sub tabs */}
          <div className="flex gap-1 mb-4 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5">
            {[
              { id: '', label: 'Hamısı' },
              { id: 'INCOME', label: 'A — Gəlir' },
              { id: 'CONTRACTOR_EXPENSE', label: 'B1 — Podratçı' },
              { id: 'COMPANY_EXPENSE', label: 'B2 — Şirkət' },
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
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Növ</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qaimə / ID</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Məbləğ</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarix</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Şirkət</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Layihə</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <TableSkeleton cols={7} rows={5} /> : invoiceData.content.length === 0 ? (
                    <EmptyState icon={Receipt} title="Qaimə tapılmadı" description="Yeni qaimə əlavə edin"
                      action={canCreate ? () => setInvoiceModal({ open: true, editing: null, defaultType: invoiceTab || 'INCOME', preProject: null }) : undefined}
                      actionLabel="Yeni Qaimə" />
                  ) : invoiceData.content.map(inv => {
                    const typeCfg = TYPE_CONFIG[inv.type] || TYPE_CONFIG.INCOME
                    return (
                      <tr key={inv.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                        <td className="py-2.5 px-4">
                          <span className={clsx('px-2 py-0.5 rounded-md text-xs font-bold border', typeCfg.cls)}>{typeCfg.short}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <p className="text-xs font-mono font-semibold text-gray-800 dark:text-gray-200">{inv.invoiceNumber || '—'}</p>
                          {inv.etaxesId && <p className="text-[10px] font-mono text-amber-600">{inv.etaxesId}</p>}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={clsx('text-sm font-bold', inv.type === 'INCOME' ? 'text-green-600' : 'text-red-500')}>
                            {inv.type === 'INCOME' ? '+' : '−'}{fmtMoney(inv.amount)}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-gray-500 whitespace-nowrap">{fmt(inv.invoiceDate)}</td>
                        <td className="py-2.5 px-4">
                          <p className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{inv.companyName || inv.contractorName || '—'}</p>
                        </td>
                        <td className="py-2.5 px-4">
                          {inv.projectCode ? <span className="text-xs font-mono text-green-600">{inv.projectCode}</span> : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-0.5 justify-end">
                            <button onClick={() => setPrintInv(inv)} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"><Printer size={13} /></button>
                            {canEdit && <button onClick={() => setInvoiceModal({ open: true, editing: inv, defaultType: null })} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"><Pencil size={13} /></button>}
                            {canDelete && <button onClick={() => handleDeleteInvoice(inv)} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>}
                          </div>
                        </td>
                      </tr>
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

      {/* ═══════════════ BUDGET TAB ═══════════════ */}
      {activeTab === 'budget' && (
        <div>
          {/* Budget summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
              <p className="text-[11px] text-gray-500">Planlaşdırılmış</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{fmtMoney(totalBudgetPlanned)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
              <p className="text-[11px] text-gray-500">Xərclənmiş</p>
              <p className="text-lg font-bold text-red-600">{fmtMoney(totalExpense)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
              <p className="text-[11px] text-gray-500">Qalan</p>
              <p className={clsx('text-lg font-bold', totalBudgetPlanned - totalExpense >= 0 ? 'text-green-600' : 'text-red-500')}>
                {fmtMoney(totalBudgetPlanned - totalExpense)}
              </p>
            </div>
          </div>

          {/* Budget table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kateqoriya</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dövr</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Faktiki</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">İcra %</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fərq</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <TableSkeleton cols={7} rows={4} /> : budgets.length === 0 ? (
                    <EmptyState icon={Target} title="Büdcə tapılmadı" description="Yeni büdcə əlavə edin"
                      action={canCreate ? () => setBudgetModal({ open: true, editing: null }) : undefined}
                      actionLabel="Yeni Büdcə" />
                  ) : budgets.map(b => {
                    const actual = transactions
                      .filter(t => t.type === 'EXPENSE' && t.category === b.category)
                      .reduce((s, t) => s + parseFloat(t.amount || 0), 0)
                    const planned = parseFloat(b.plannedAmount || 0)
                    const pct = planned > 0 ? Math.round((actual / planned) * 100) : 0
                    const diff = planned - actual
                    const isOver = actual > planned
                    const periodLabel = b.period === 'MONTHLY' ? `${b.year} / ${b.month}-ci ay`
                      : b.period === 'QUARTERLY' ? `${b.year} / ${b.quarter}-cü rüb`
                      : `${b.year}`
                    return (
                      <tr key={b.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                        <td className="py-2.5 px-4 text-xs font-medium text-gray-700 dark:text-gray-300">{CATEGORY_LABELS[b.category] || b.category}</td>
                        <td className="py-2.5 px-4 text-xs text-gray-500">{periodLabel}</td>
                        <td className="py-2.5 px-4 text-xs font-semibold text-gray-700 dark:text-gray-200">{fmtMoney(planned)}</td>
                        <td className="py-2.5 px-4 text-xs font-semibold text-gray-700 dark:text-gray-200">{fmtMoney(actual)}</td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden max-w-[60px]">
                              <div className={clsx('h-full rounded-full', isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-green-500')}
                                style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <span className={clsx('text-[10px] font-bold', isOver ? 'text-red-500' : 'text-gray-500')}>{pct}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={clsx('text-xs font-semibold', isOver ? 'text-red-500' : 'text-green-600')}>
                            {isOver ? '−' : '+'}{fmtMoney(Math.abs(diff))}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-0.5 justify-end">
                            {canEdit && <button onClick={() => setBudgetModal({ open: true, editing: b })} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-600 transition-colors"><Pencil size={13} /></button>}
                            {canDelete && <button onClick={() => handleDeleteBudget(b)} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
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

      {budgetModal.open && (
        <BudgetModal
          editing={budgetModal.editing}
          onClose={() => setBudgetModal({ open: false, editing: null })}
          onSaved={() => { setBudgetModal({ open: false, editing: null }); loadAll() }}
        />
      )}

      {printInv && <InvoicePrintModal inv={printInv} onClose={() => setPrintInv(null)} />}
      <ConfirmDialog />
    </div>
  )
}
