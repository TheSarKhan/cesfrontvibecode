import DateInput from '../../components/common/DateInput'
import { useState, useEffect, useMemo, useRef, useCallback, Fragment } from 'react'
import {
  Plus, Search, Pencil, Trash2,
  ArrowUpRight, ArrowDownRight, CreditCard,
  Receipt, Download, PenLine, X, CheckCircle, Undo2,
  ChevronDown, ArrowLeft, ChevronRight, Banknote,
  Eye, AlertTriangle, Printer, FileText, RefreshCw,
  Paperclip, Upload
} from 'lucide-react'
import RecurringExpenseModal from './RecurringExpenseModal'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { accountingApi } from '../../api/accounting'
import InvoiceModal from './InvoiceModal'
import InvoicePrintModal from './InvoicePrintModal'
import TransactionModal from './TransactionModal'
import PaymentModal from './PaymentModal'
import DocumentsTab from './DocumentsTab'
import DocumentCreateModal from './DocumentCreateModal'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useAuthStore } from '../../store/authStore'
import { useConfirm } from '../../components/common/ConfirmDialog'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { usePageShortcuts } from '../../hooks/usePageShortcuts'
import Pagination from '../../components/common/Pagination'
import { validateFileUpload } from '../../utils/fileValidation'

/* ─── Sabitlər ─────────────────────────────────────────────────────────────── */
const fmtMoney = (v) => v != null
  ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼'
  : '—'
import { fmtDate } from '../../utils/date'
const fmt = fmtDate
const dash = (v) => (v != null && v !== '') ? v : '—'

const MAIN_TABS = [
  { id: 'invoices',     label: 'Qaimələr',        icon: Receipt },
  { id: 'documents',    label: 'Sənədlər',        icon: FileText },
]

const TYPE_CONFIG = {
  INCOME:             { label: 'Gəlir',  short: 'Gəlir',  cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  CONTRACTOR_EXPENSE: { label: 'Ödəmə',           short: 'Ödəmə',    cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  COMPANY_EXPENSE:    { label: 'Xərc',            short: 'Xərc',     cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
  INVESTOR_EXPENSE:   { label: 'İnvestor Ödəməsi', short: 'İnvestor', cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' },
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
  const [docCreateModal, setDocCreateModal] = useState(false)
  const [docRefreshKey, setDocRefreshKey]   = useState(0)

  // Daimi Ödənişlər (Recurring Expenses)
  const [recurring, setRecurring]                     = useState([])
  const [recurringModal, setRecurringModal]           = useState({ open: false, editing: null })
  const [generateModal, setGenerateModal]             = useState({ open: false, rec: null })
  const [generateForm, setGenerateForm]               = useState({ invoiceDate: new Date().toISOString().slice(0, 10), amountOverride: '' })
  const [generateSaving, setGenerateSaving]           = useState(false)
  const [recurringCollapsed, setRecurringCollapsed]   = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [invoiceTab, setInvoiceTab] = useState('pending')
  const [txnFilter, setTxnFilter] = useState('')
  const [pendingForms, setPendingForms] = useState({})
  const [pendingSaving, setPendingSaving] = useState({})
  const [paymentFilter, setPaymentFilter] = useState('')
  const searchRef = useRef(null)

  usePageShortcuts({
    onNew: canCreate ? () => handleNewAction() : undefined,
    searchRef,
  })

  const handleNewAction = () => {
    if (activeTab === 'invoices') setInvoiceModal({ open: true, editing: null, defaultType: invoiceTab || 'INCOME', preProject: null })
    else if (activeTab === 'documents') setDocCreateModal(true)
    else if (activeTab === 'transactions') setTransactionModal({ open: true, editing: null, defaultType: 'INCOME' })
    else if (activeTab === 'payments') setPaymentModal({ open: true, editing: null })
    else if (activeTab === 'expenses') setInvoiceModal({ open: true, editing: null, defaultType: 'COMPANY_EXPENSE', preProject: null })
    else setTransactionModal({ open: true, editing: null, defaultType: 'INCOME' })
  }

  /* ── Data Loading ── */
  const loadRecurring = useCallback(async () => {
    try {
      const res = await accountingApi.getRecurring()
      setRecurring(res.data?.data || [])
    } catch {}
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const results = await Promise.allSettled([
        accountingApi.getAll(),
        accountingApi.getSummary(),
        accountingApi.getRecurring(),
      ])
      const extract = (r) => r.status === 'fulfilled' ? (r.value?.data?.data || r.value?.data || []) : []
      setInvoices(extract(results[0]))
      setSummary(results[1].status === 'fulfilled' ? (results[1].value?.data?.data || results[1].value?.data) : null)
      setRecurring(extract(results[2]))
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

  // Initialize form state for newly loaded pending invoices (preserve in-progress edits)
  useEffect(() => {
    setPendingForms(prev => {
      const updates = {}
      invoices
        .filter(i => i.status === 'DRAFT' || i.status === 'SENT')
        .forEach(inv => {
          if (prev[inv.id] === undefined) {
            updates[inv.id] = {
              invoiceNumber: inv.invoiceNumber || '',
              invoiceDate: inv.invoiceDate || '',
              notes: inv.notes || '',
            }
          }
        })
      return Object.keys(updates).length ? { ...prev, ...updates } : prev
    })
  }, [invoices])

  // Reset invoice page when filters change
  useEffect(() => { setInvoicePage(0) }, [invoiceTab, search])

  // ── Paged invoices for the table (only APPROVED) ──
  const loadInvoices = useCallback(async () => {
    if (activeTab !== 'invoices' || invoiceTab === 'pending') return
    try {
      const params = { page: invoicePage, size: invoicePageSize, status: 'APPROVED' }
      if (invoiceTab === 'PAYMENT') {
        params.types = 'CONTRACTOR_EXPENSE,INVESTOR_EXPENSE'
      } else if (invoiceTab) {
        params.type = invoiceTab
      }
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

  // Merged items for the Invoices table
  const tableItems = useMemo(() => {
    return invoiceData.content.map(inv => ({ ...inv, _rowType: 'invoice' }))
  }, [invoiceData.content])

  // Grouped display items for "Hamısı" tab
  const displayItems = useMemo(() => {
    if (invoiceTab !== '' || tableItems.length === 0) return tableItems
    const ORDER = ['INCOME', 'CONTRACTOR_EXPENSE', 'INVESTOR_EXPENSE', 'COMPANY_EXPENSE']
    const groups = {}
    ORDER.forEach(t => { groups[t] = [] })
    tableItems.forEach(item => {
      if (groups[item.type]) groups[item.type].push(item)
    })
    const result = []
    ORDER.forEach(type => {
      const group = groups[type]
      if (!group || group.length === 0) return
      const groupTotal = group.reduce((s, i) => s + parseFloat(i.amount || 0), 0)
      result.push({ _isGroupHeader: true, type, count: group.length, total: groupTotal })
      group.forEach(item => result.push(item))
    })
    return result
  }, [tableItems, invoiceTab])

  // Pending invoice groups for "Gözləyənlər" tab
  const pendingGroups = useMemo(() => {
    const pending = invoices.filter(i => i.status === 'DRAFT' || i.status === 'SENT')
    const incomes = pending.filter(i => i.type === 'INCOME')
    const expenses = pending.filter(i => i.type !== 'INCOME')
    const groups = []
    const usedExpenseIds = new Set()
    incomes.forEach(income => {
      const linked = expenses.filter(e => e.sourceInvoiceId === income.id)
      linked.forEach(e => usedExpenseIds.add(e.id))
      groups.push({ id: `inc-${income.id}`, income, expenses: linked })
    })
    expenses.filter(e => !usedExpenseIds.has(e.id)).forEach(exp => {
      groups.push({ id: `exp-${exp.id}`, income: null, expenses: [exp] })
    })
    return groups
  }, [invoices])

  const pendingCount = useMemo(() =>
    invoices.filter(i => i.status === 'DRAFT' || i.status === 'SENT').length
  , [invoices])

  const toggleExpand = (item) => {
    if (expandedId === item.id) {
      setExpandedId(null)
    } else {
      setExpandedId(item.id)
      setInlineForm({ invoiceNumber: item.invoiceNumber || '', invoiceDate: item.invoiceDate || '', notes: item.notes || '' })
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
    if (!(await confirm({ title: 'Qaiməni sil', message: `"${inv.accountingId || inv.invoiceNumber || `#${inv.id}`}" silinsin?` }))) return
    try { await accountingApi.delete(inv.id); toast.success('Qaimə silindi'); loadAll(); loadInvoices() }
    catch (err) { if (!err?.isPending) return }
  }

  const handleApprove = async (inv) => {
    if (!(await confirm({ title: 'Qaiməni təsdiqlə', message: `"${inv.accountingId || inv.invoiceNumber || `#${inv.id}`}" təsdiqlənsin? Layihənin maliyyə hissəsinə gəlir olaraq əlavə ediləcək.` }))) return
    try {
      if (expandedId === inv.id) {
        await accountingApi.patchFields(inv.id, {
          invoiceNumber: inlineForm.invoiceNumber || null,
          invoiceDate:   inlineForm.invoiceDate   || null,
          notes:         inlineForm.notes         || null,
        })
      }
      await accountingApi.approve(inv.id)
      toast.success('Qaimə təsdiqləndi')
      loadAll()
      loadInvoices()
    }
    catch (err) { toast.error(err?.response?.data?.message || 'Xəta baş verdi') }
  }

  const handleReturnToProject = async (inv) => {
    if (!(await confirm({ title: 'Layihəyə geri göndər', message: `"${inv.accountingId || inv.invoiceNumber || `#${inv.id}`}" layihəyə geri qaytarılsın? Bu əməliyyat geri qaytarıla bilməz.` }))) return
    try { await accountingApi.returnToProject(inv.id); toast.success('Qaimə geri qaytarıldı'); loadAll(); loadInvoices() }
    catch (err) { toast.error(err?.response?.data?.message || 'Xəta baş verdi') }
  }

  const handleReturnToDraft = async (inv) => {
    try {
      const res = await accountingApi.returnToDraft(inv.id)
      toast.success('Qaimə DRAFT-a çevrildi')
      loadAll()
      loadInvoices()
      setInvoiceModal({ open: true, editing: res.data.data, defaultType: null, preProject: null })
    }
    catch (err) { toast.error(err?.response?.data?.message || 'Xəta baş verdi') }
  }

  /* ── Pending invoice helpers ── */
  const getPendingForm = (invId, inv) => pendingForms[invId] ?? {
    invoiceNumber: inv?.invoiceNumber || '',
    invoiceDate: inv?.invoiceDate || '',
    notes: inv?.notes || '',
  }

  const setPendingField = (invId, field, value) => {
    setPendingForms(prev => ({
      ...prev,
      [invId]: { ...(prev[invId] || {}), [field]: value },
    }))
  }

  const handlePendingSave = async (inv) => {
    setPendingSaving(prev => ({ ...prev, [inv.id]: true }))
    try {
      const form = getPendingForm(inv.id, inv)
      await accountingApi.patchFields(inv.id, {
        invoiceNumber: form.invoiceNumber || null,
        invoiceDate: form.invoiceDate || null,
        notes: form.notes || null,
      })
      toast.success('Sahələr saxlanıldı')
      loadAll()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    } finally {
      setPendingSaving(prev => ({ ...prev, [inv.id]: false }))
    }
  }

  const handlePendingApprove = async (inv) => {
    if (!(await confirm({ title: 'Qaiməni təsdiqlə', message: `"${inv.accountingId || getPendingForm(inv.id, inv).invoiceNumber || `#${inv.id}`}" təsdiqlənsin? Qaimə əsas cədvələ keçəcək.` }))) return
    setPendingSaving(prev => ({ ...prev, [inv.id]: true }))
    try {
      const form = getPendingForm(inv.id, inv)
      await accountingApi.patchFields(inv.id, {
        invoiceNumber: form.invoiceNumber || null,
        invoiceDate: form.invoiceDate || null,
        notes: form.notes || null,
      })
      await accountingApi.approve(inv.id)
      toast.success('Qaimə təsdiqləndi — əsas cədvələ keçdi')
      setPendingForms(prev => { const n = { ...prev }; delete n[inv.id]; return n })
      loadAll()
      loadInvoices()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    } finally {
      setPendingSaving(prev => ({ ...prev, [inv.id]: false }))
    }
  }

  const handlePendingApproveGroup = async (group) => {
    const all = [group.income, ...group.expenses].filter(Boolean)
    if (all.length === 0) return
    if (!(await confirm({
      title: 'Hər ikisini təsdiqlə',
      message: `Bu layihəyə aid ${all.length} qaimə (gəlir + xərc) bir anda təsdiqlənsin? Hər biri əsas cədvələ keçəcək.`
    }))) return
    const idsObj = all.reduce((acc, inv) => ({ ...acc, [inv.id]: true }), {})
    setPendingSaving(prev => ({ ...prev, ...idsObj }))
    try {
      for (const inv of all) {
        const form = getPendingForm(inv.id, inv)
        await accountingApi.patchFields(inv.id, {
          invoiceNumber: form.invoiceNumber || null,
          invoiceDate: form.invoiceDate || null,
          notes: form.notes || null,
        })
        await accountingApi.approve(inv.id)
      }
      toast.success(`${all.length} qaimə təsdiqləndi`)
      setPendingForms(prev => {
        const n = { ...prev }
        all.forEach(inv => delete n[inv.id])
        return n
      })
      loadAll()
      loadInvoices()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi — bəzi qaimələr təsdiqlənmədi')
      loadAll()
      loadInvoices()
    } finally {
      const reset = all.reduce((acc, inv) => ({ ...acc, [inv.id]: false }), {})
      setPendingSaving(prev => ({ ...prev, ...reset }))
    }
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
             activeTab === 'documents' ? 'Yeni Sənəd' :
             activeTab === 'transactions' ? 'Yeni Əməliyyat' :
             activeTab === 'payments' ? 'Yeni Ödəniş' : 'Yeni Əməliyyat'}
          </button>
        )}
      </div>

      {/* Main Tabs (Hidden as there is only one left) */}
      {MAIN_TABS.length > 1 && (
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
      )}


      {/* ═══════════════ DOCUMENTS TAB ═══════════════ */}
      {activeTab === 'documents' && <DocumentsTab onCreateNew={() => setDocCreateModal(true)} refreshKey={docRefreshKey} />}

      {/* ═══════════════ INVOICES TAB ═══════════════ */}
      {activeTab === 'invoices' && (
        <div>
          {/* Sub tabs */}
          <div className="flex gap-1 mb-4 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5">
            {[
              { id: 'pending', label: 'Gözləyənlər' },
              { id: '', label: 'Hamısı' },
              { id: 'INCOME', label: 'Gəlirlər' },
              { id: 'PAYMENT', label: 'Podratçı' },
              { id: 'COMPANY_EXPENSE', label: 'Təchizatçı' },
            ].map(tab => (
              <button key={tab.id} onClick={() => { setInvoiceTab(tab.id); setSearch('') }}
                className={clsx('flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-medium rounded-md transition-colors',
                  invoiceTab === tab.id
                    ? 'bg-white dark:bg-gray-800 shadow-sm text-amber-600'
                    : 'text-gray-500 hover:text-gray-700'
                )}>
                {tab.label}
                {tab.id === 'pending' && pendingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white">{pendingCount}</span>
                )}
                {tab.id === '' && <span className="ml-1 opacity-60">({invoices.filter(i => i.status === 'APPROVED').length})</span>}
                {tab.id === 'INCOME' && <span className="ml-1 opacity-60">({invoices.filter(i => i.type === 'INCOME' && i.status === 'APPROVED').length})</span>}
                {tab.id === 'PAYMENT' && <span className="ml-1 opacity-60">({invoices.filter(i => (i.type === 'CONTRACTOR_EXPENSE' || i.type === 'INVESTOR_EXPENSE') && i.status === 'APPROVED').length})</span>}
                {tab.id === 'COMPANY_EXPENSE' && <span className="ml-1 opacity-60">({invoices.filter(i => i.type === 'COMPANY_EXPENSE' && i.status === 'APPROVED').length})</span>}
              </button>
            ))}
          </div>

          {/* Search */}
          {invoiceTab !== 'pending' && (
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Qaimə nömrəsi, şirkət, layihə..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          )}

          {/* ── Gözləyən Qaimələr bölməsi ── */}
          {invoiceTab === 'pending' && (
            <div className="space-y-4">
              {loading ? (
                [1, 2, 3].map(i => <div key={i} className="h-44 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)
              ) : pendingGroups.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
                  <CheckCircle size={36} className="text-green-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Gözləyən qaimə yoxdur</p>
                  <p className="text-xs text-gray-400 mt-1">Bütün qaimələr mühasib tərəfindən təsdiqlənib</p>
                  {canCreate && (
                    <button onClick={() => setInvoiceModal({ open: true, editing: null, defaultType: 'INCOME', preProject: null })}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors">
                      <Plus size={13} /> Yeni Qaimə
                    </button>
                  )}
                </div>
              ) : pendingGroups.map(group => {
                const hasIncome = !!group.income
                const hasExpenses = group.expenses.length > 0
                const isPair = hasIncome && hasExpenses
                const firstInv = group.income || group.expenses[0]
                const incomeAmt = group.income ? parseFloat(group.income.amount || 0) : 0
                const expenseAmt = group.expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
                const margin = incomeAmt - expenseAmt
                const marginPct = incomeAmt > 0 ? (margin / incomeAmt * 100) : 0

                const renderInvoicePanel = (inv) => {
                  const form = getPendingForm(inv.id, inv)
                  const saving = !!pendingSaving[inv.id]
                  const typeCfg = TYPE_CONFIG[inv.type] || TYPE_CONFIG.INCOME
                  const isIncome = inv.type === 'INCOME'
                  const accentClasses = isIncome
                    ? 'border-l-green-500 bg-green-50/30 dark:bg-green-900/10'
                    : inv.type === 'INVESTOR_EXPENSE'
                      ? 'border-l-purple-500 bg-purple-50/30 dark:bg-purple-900/10'
                      : inv.type === 'COMPANY_EXPENSE'
                        ? 'border-l-red-500 bg-red-50/30 dark:bg-red-900/10'
                        : 'border-l-blue-500 bg-blue-50/30 dark:bg-blue-900/10'
                  const fieldsComplete = !!(form.invoiceNumber && form.invoiceDate)
                  return (
                    <div key={inv.id} className={clsx('p-4 space-y-3 border-l-4', accentClasses)}>
                      {/* Header: type + counterparty + amount */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={clsx('px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wide', typeCfg.cls)}>
                              {isIncome ? 'Müştəridən gələn' : inv.type === 'INVESTOR_EXPENSE' ? 'İnvestora ödəniş' : inv.type === 'COMPANY_EXPENSE' ? 'Şirkət xərci' : 'Podratçıya ödəniş'}
                            </span>
                            <span className={clsx('px-1.5 py-0.5 rounded text-[9px] font-semibold border',
                              inv.status === 'SENT'
                                ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                                : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                            )}>
                              {inv.status === 'SENT' ? 'Göndərilib' : 'Qaralama'}
                            </span>
                            {fieldsComplete && (
                              <span title="Bütün məcburi sahələr doldurulub" className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/30">
                                <CheckCircle size={10} className="text-green-600 dark:text-green-400" />
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {inv.customerName || inv.contractorName || inv.companyName || (isIncome ? 'Müştəri' : 'Tərəf-müqabil')}
                          </div>
                          {inv.equipmentName && (
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                              {inv.equipmentName}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className={clsx('text-lg font-bold tabular-nums', isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400')}>
                            {isIncome ? '+' : '−'}{fmtMoney(inv.amount)}
                          </div>
                          {inv.accountingId && (
                            <div className="text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                              {inv.accountingId}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Period & days breakdown */}
                      {(inv.periodMonth || inv.standardDays != null || inv.extraDays != null || inv.extraHours != null) && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] bg-white/60 dark:bg-gray-800/40 rounded-lg px-2.5 py-1.5 border border-gray-100 dark:border-gray-700">
                          {inv.periodMonth && inv.periodYear && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                              {new Date(inv.periodYear, inv.periodMonth - 1).toLocaleDateString('az-AZ', { month: 'long', year: 'numeric' })}
                            </span>
                          )}
                          {inv.standardDays != null && <span className="text-gray-500">Standart: <b className="text-gray-700 dark:text-gray-300">{inv.standardDays} gün</b></span>}
                          {inv.extraDays != null && parseFloat(inv.extraDays) > 0 && <span className="text-gray-500">Əlavə: <b className="text-gray-700 dark:text-gray-300">{inv.extraDays} gün</b></span>}
                          {inv.extraHours != null && parseFloat(inv.extraHours) > 0 && <span className="text-gray-500">+<b className="text-gray-700 dark:text-gray-300">{inv.extraHours} saat</b></span>}
                          {(inv.transports || []).length > 0 && (
                            <span className="text-blue-600">Daşınma: <b>{(inv.transports || []).length}× {fmtMoney(inv.totalTransportAmount)}</b></span>
                          )}
                        </div>
                      )}

                      {/* Service description */}
                      {inv.serviceDescription && (
                        <div className="text-[11px] text-gray-600 dark:text-gray-400 italic line-clamp-2 px-1">
                          {inv.serviceDescription}
                        </div>
                      )}

                      {/* Transportations */}
                      {(() => {
                        const transports = inv.transports || []
                        if (transports.length === 0) return null
                        const total = parseFloat(inv.totalTransportAmount || 0)
                        return (
                          <div className="rounded-lg border border-blue-100 dark:border-blue-800/40 overflow-hidden">
                            <div className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/40 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Daşınma</span>
                              <span className="text-[10px] font-bold text-blue-600">{fmtMoney(total)}</span>
                            </div>
                            {transports.map((t, i) => (
                              <div key={i} className="flex items-center justify-between px-2.5 py-1 text-[11px] border-b border-gray-50 dark:border-gray-700 last:border-0">
                                <div className="flex items-center gap-2">
                                  {t.transportDate && <span className="text-gray-400">{new Date(t.transportDate).toLocaleDateString('az-AZ')}</span>}
                                  <span className="text-gray-600 dark:text-gray-300">{t.transportDirection || '—'}</span>
                                </div>
                                <span className="font-semibold text-blue-600">{fmtMoney(parseFloat(t.transportAmount) || 0)}</span>
                              </div>
                            ))}
                          </div>
                        )
                      })()}

                      {/* Accountant fields */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Əsl qaimə № <span className="text-gray-400">(könüllü)</span></label>
                          <input
                            value={form.invoiceNumber}
                            onChange={e => setPendingField(inv.id, 'invoiceNumber', e.target.value)}
                            placeholder="MT20250419..."
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Tarix</label>
                          <DateInput
                            value={form.invoiceDate}
                            onChange={e => setPendingField(inv.id, 'invoiceDate', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white dark:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Qeyd</label>
                          <input
                            value={form.notes}
                            onChange={e => setPendingField(inv.id, 'notes', e.target.value)}
                            placeholder="Əlavə qeyd..."
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                          />
                        </div>
                      </div>

                      {/* Təhvil-Təslim Aktı — yalnız gəlir qaimələri üçün */}
                      {isIncome && <div className="flex items-center gap-2 pt-1">
                        {inv.aktFileUploaded ? (
                          <button
                            onClick={async () => {
                              try {
                                const res = await accountingApi.downloadAkt(inv.id)
                                const url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' }))
                                window.open(url, '_blank')
                                setTimeout(() => URL.revokeObjectURL(url), 5000)
                              } catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Fayl açıla bilmədi') }
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800 transition-colors"
                            title={inv.aktFileName}
                          >
                            <Paperclip size={10} /> Akt: {inv.aktFileName || 'Fayla bax'}
                          </button>
                        ) : (
                          <label className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-gray-50 hover:bg-amber-50 text-gray-500 hover:text-amber-700 border border-gray-200 hover:border-amber-300 dark:bg-gray-700 dark:hover:bg-amber-900/20 dark:border-gray-600 cursor-pointer transition-colors">
                            <Upload size={10} /> Akt yüklə
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
                              onChange={async e => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                const fileError = validateFileUpload(file)
                                if (fileError) { toast.error(fileError); e.target.value = ''; return }
                                try {
                                  await accountingApi.uploadAkt(inv.id, file)
                                  toast.success('Akt yükləndi')
                                  loadInvoices()
                                } catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Akt yüklənmədi') }
                              }} />
                          </label>
                        )}
                      </div>}

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <button onClick={() => handlePendingSave(inv)} disabled={saving}
                          className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 transition-colors flex items-center gap-1">
                          <PenLine size={10} /> {saving ? 'Saxlanır...' : 'Saxla'}
                        </button>
                        <button onClick={() => handlePendingApprove(inv)} disabled={saving}
                          className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 transition-colors flex items-center gap-1">
                          <CheckCircle size={10} /> Təsdiqlə
                        </button>
                        {inv.projectId && (inv.type === 'INCOME' || inv.type === 'COMPANY_EXPENSE') && (
                          <button onClick={() => handleReturnToProject(inv)}
                            className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-white hover:bg-orange-50 dark:bg-gray-700 dark:hover:bg-orange-900/20 text-orange-600 border border-orange-200 dark:border-orange-800 transition-colors flex items-center gap-1">
                            <Undo2 size={10} /> Geri
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDeleteInvoice(inv)} title="Sil"
                            className="ml-auto p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 bg-white dark:bg-gray-700 transition-colors">
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={group.id} className={clsx(
                    'bg-white dark:bg-gray-800 border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow',
                    isPair ? 'border-amber-200 dark:border-amber-800/50' : 'border-gray-200 dark:border-gray-700'
                  )}>
                    {/* Card header — project info + cash flow summary */}
                    <div className={clsx(
                      'px-4 py-2.5 border-b flex items-center justify-between gap-3 flex-wrap',
                      isPair
                        ? 'bg-gradient-to-r from-amber-50/60 via-white to-amber-50/60 dark:from-amber-900/10 dark:via-gray-800 dark:to-amber-900/10 border-amber-100 dark:border-amber-900/30'
                        : 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700'
                    )}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        {firstInv.projectCode && (
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                            {firstInv.projectCode}
                          </span>
                        )}
                        <div className="min-w-0">
                          {firstInv.projectName && (
                            <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{firstInv.projectName}</div>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            {firstInv.periodMonth && firstInv.periodYear && (
                              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                {new Date(firstInv.periodYear, firstInv.periodMonth - 1).toLocaleDateString('az-AZ', { month: 'long', year: 'numeric' })}
                              </span>
                            )}
                            <span>{fmt(firstInv.invoiceDate || firstInv.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right-side: cash flow / margin or single amount */}
                      {isPair ? (
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-green-600 dark:text-green-400 font-bold tabular-nums">+{fmtMoney(incomeAmt)}</span>
                          <ChevronRight size={12} className="text-gray-400" />
                          <span className="text-red-500 font-bold tabular-nums">−{fmtMoney(expenseAmt)}</span>
                          <span className="text-gray-300 dark:text-gray-600">=</span>
                          <span className={clsx(
                            'px-2 py-0.5 rounded-md font-bold tabular-nums border',
                            margin >= 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                              : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                          )}>
                            {margin >= 0 ? '+' : ''}{fmtMoney(margin)}
                            {incomeAmt > 0 && <span className="ml-1 opacity-70">({marginPct.toFixed(0)}%)</span>}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">
                          {hasIncome ? 'Tək gəlir qaiməsi' : 'Tək xərc qaiməsi'}
                        </span>
                      )}
                    </div>

                    {/* Invoice panels — side by side when paired */}
                    <div className={clsx(isPair && 'grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 dark:divide-gray-700')}>
                      {hasIncome && renderInvoicePanel(group.income)}
                      {group.expenses.map(exp => renderInvoicePanel(exp))}
                    </div>

                    {/* Unified approve action — only when both income & expense exist */}
                    {isPair && (() => {
                      const all = [group.income, ...group.expenses]
                      const anySaving = all.some(inv => pendingSaving[inv.id])
                      return (
                        <div className="px-4 py-3 bg-gradient-to-r from-amber-50/80 via-amber-50/40 to-amber-50/80 dark:from-amber-900/20 dark:via-amber-900/10 dark:to-amber-900/20 border-t border-amber-100 dark:border-amber-900/30 flex items-center justify-between gap-3 flex-wrap">
                          <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            <CheckCircle size={12} />
                            <span>Bu layihənin gəlir və xərc qaimələri eyni anda təsdiqlənə bilər</span>
                          </div>
                          <button
                            onClick={() => handlePendingApproveGroup(group)}
                            disabled={anySaving}
                            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm">
                            <CheckCircle size={13} />
                            {anySaving ? 'Təsdiqlənir...' : `Hər ikisini təsdiqlə (${all.length})`}
                          </button>
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          )}

          {/* Summary stats for "Hamısı" tab */}
          {invoiceTab === '' && invoices.length > 0 && (() => {
            const stats = [
              { label: 'Gəlir', types: ['INCOME'], sign: '+', cls: 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' },
              { label: 'Podratçı Ödəməsi', types: ['CONTRACTOR_EXPENSE'], sign: '−', cls: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' },
              { label: 'İnvestor Ödəməsi', types: ['INVESTOR_EXPENSE'], sign: '−', cls: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400' },
              { label: 'Şirkət Xərci', types: ['COMPANY_EXPENSE'], sign: '−', cls: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' },
            ]
            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                {stats.map(s => {
                  const total = invoices.filter(i => s.types.includes(i.type) && i.status === 'APPROVED').reduce((sum, i) => sum + parseFloat(i.amount || 0), 0)
                  const count = invoices.filter(i => s.types.includes(i.type) && i.status === 'APPROVED').length
                  return (
                    <div key={s.label} className={clsx('px-3 py-2.5 rounded-lg border text-xs', s.cls)}>
                      <p className="font-medium opacity-80">{s.label}</p>
                      <p className="text-sm font-bold mt-0.5">{s.sign}{fmtMoney(total)}</p>
                      <p className="opacity-60 text-[10px]">{count} qaimə (cəmi)</p>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {/* ── Daimi Ödənişlər bölməsi (yalnız Təchizatçı tabı) ── */}
          {invoiceTab === 'COMPANY_EXPENSE' && (
            <div className="mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-visible">
              {/* Section Header */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                onClick={() => setRecurringCollapsed(c => !c)}
              >
                <div className="flex items-center gap-2">
                  <RefreshCw size={14} className="text-amber-500" />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Daimi Ödənişlər</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {recurring.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {canCreate && (
                    <button
                      onClick={e => { e.stopPropagation(); setRecurringModal({ open: true, editing: null }) }}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                    >
                      <Plus size={11} /> Yeni
                    </button>
                  )}
                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${recurringCollapsed ? '' : 'rotate-180'}`} />
                </div>
              </div>

              {/* Recurring Cards */}
              {!recurringCollapsed && (
                <div className="border-t border-gray-100 dark:border-gray-700 p-3">
                  {recurring.length === 0 ? (
                    <div className="text-center py-6 text-sm text-gray-400">
                      <RefreshCw size={24} className="mx-auto mb-2 opacity-30" />
                      Daimi ödəniş şablonu yoxdur
                    </div>
                  ) : (
                    (() => {
                      // Group by category
                      const grouped = {}
                      recurring.forEach(r => {
                        const cat = r.categoryLabel || r.categoryKey
                        if (!grouped[cat]) grouped[cat] = []
                        grouped[cat].push(r)
                      })
                      return Object.entries(grouped).map(([cat, items]) => (
                        <div key={cat} className="mb-3 last:mb-0">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-1">{cat}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                            {items.map(rec => (
                              <div
                                key={rec.id}
                                className={`relative rounded-lg border p-3 transition-all ${rec.active
                                  ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750'
                                  : 'border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 opacity-60'
                                }`}
                              >
                                {/* Card header */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div>
                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight">{rec.sourceLabel}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{rec.name}</p>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    {canEdit && (
                                      <button
                                        onClick={() => setRecurringModal({ open: true, editing: rec })}
                                        className="p-1 rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                      >
                                        <Pencil size={11} />
                                      </button>
                                    )}
                                    {canDelete && (
                                      <button
                                        onClick={async () => {
                                          if (!await confirm({ title: 'Daimi ödənişi sil', message: `"${rec.name}" silinsin?` })) return
                                          await accountingApi.deleteRecurring(rec.id)
                                          loadRecurring()
                                        }}
                                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Amount + Freq */}
                                <div className="flex items-center justify-between text-[10px] mb-2">
                                  <span className={`font-bold text-sm ${rec.variableAmount ? 'text-gray-400 italic' : 'text-red-500'}`}>
                                    {rec.variableAmount ? 'Dəyişkən' : `−${fmtMoney(rec.amount)}`}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                                    {rec.frequencyLabel}
                                    {rec.dayOfMonth ? ` · ${rec.dayOfMonth}-ci gün` : ''}
                                  </span>
                                </div>

                                {/* Generate button */}
                                {canCreate && rec.active && (
                                  <button
                                    onClick={() => {
                                      setGenerateModal({ open: true, rec })
                                      setGenerateForm({
                                        invoiceDate: new Date().toISOString().slice(0, 10),
                                        amountOverride: rec.variableAmount ? '' : String(rec.amount),
                                      })
                                    }}
                                    className="w-full py-1.5 text-[11px] font-semibold bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg transition-colors flex items-center justify-center gap-1"
                                  >
                                    <Receipt size={11} /> Qaimə Yarat
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    })()
                  )}
                </div>
              )}
            </div>
          )}

          {/* Table — only for non-pending tabs */}
          {invoiceTab !== 'pending' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                    <th className="w-8 py-3 px-2"></th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Növ</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sistem ID / Qaimə №</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Məbləğ</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarix</th>
                    {invoiceTab !== 'COMPANY_EXPENSE' && (
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dövr</th>
                    )}
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Şirkət / Təchizatçı</th>
                    {invoiceTab !== 'COMPANY_EXPENSE' && (
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Layihə</th>
                    )}
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <TableSkeleton cols={9} rows={5} /> : displayItems.length === 0 ? (
                    <EmptyState icon={Receipt} title="Məlumat tapılmadı" description="Hələlik heç bir qaimə yoxdur"
                      action={canCreate ? () => setInvoiceModal({ open: true, editing: null, defaultType: invoiceTab || 'INCOME', preProject: null }) : undefined}
                      actionLabel="Yeni Qaimə" />
                  ) : displayItems.map(item => {
                    // Group header row for "Hamısı" tab
                    if (item._isGroupHeader) {
                      const cfg = TYPE_CONFIG[item.type]
                      return (
                        <tr key={`grp-${item.type}`} className="border-b border-gray-200 dark:border-gray-600">
                          <td colSpan={9} className={clsx('py-1.5 px-4', cfg.cls)}>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-wide">{cfg.label}</span>
                              <span className="text-[10px] opacity-60">{item.count} qaimə</span>
                              <span className="ml-auto text-xs font-semibold">{item.type === 'INCOME' ? '+' : '−'}{fmtMoney(item.total)}</span>
                            </div>
                          </td>
                        </tr>
                      )
                    }

                    const isExpanded = expandedId === item.id

                    const inv = item
                    const typeCfg = TYPE_CONFIG[inv.type] || TYPE_CONFIG.INCOME
                    const typeBorderCls = invoiceTab === '' ? ({
                      INCOME: 'border-l-2 border-l-green-400',
                      CONTRACTOR_EXPENSE: 'border-l-2 border-l-blue-400',
                      INVESTOR_EXPENSE: 'border-l-2 border-l-purple-400',
                      COMPANY_EXPENSE: 'border-l-2 border-l-red-400',
                    }[inv.type] || '') : ''
                    return (
                      <Fragment key={inv.id}>
                        <tr
                          onClick={() => toggleExpand(inv)}
                          className={clsx(
                            'border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors',
                            typeBorderCls,
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
                            <div className="flex flex-col">
                              {inv.accountingId
                                ? <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{inv.accountingId}</p>
                                : <p className="text-xs text-gray-400 italic">—</p>
                              }
                              {inv.invoiceNumber && (
                                <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{inv.invoiceNumber}</p>
                              )}
                              {inv.type === 'COMPANY_EXPENSE' && (
                                <span className="text-[10px] text-gray-400 italic truncate max-w-[180px]">{inv.serviceDescription}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={clsx('text-sm font-bold', inv.type === 'INCOME' ? 'text-green-600' : 'text-red-500')}>
                              {inv.type === 'INCOME' ? '+' : '−'}{fmtMoney(inv.amount)}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-xs text-gray-500 whitespace-nowrap">{fmt(inv.invoiceDate)}</td>
                          {invoiceTab !== 'COMPANY_EXPENSE' && (
                            <td className="py-2.5 px-4">
                              {inv.periodMonth && inv.periodYear ? (
                                <span className="text-xs text-indigo-600 font-medium whitespace-nowrap">
                                  {new Date(inv.periodYear, inv.periodMonth - 1).toLocaleDateString('az-AZ', { month: 'short', year: 'numeric' })}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                          )}
                          <td className="py-2.5 px-4">
                            <p className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{inv.companyName || inv.contractorName || inv.investorName || '—'}</p>
                          </td>
                          {invoiceTab !== 'COMPANY_EXPENSE' && (
                            <td className="py-2.5 px-4">
                              {inv.projectCode ? <span className="text-xs font-mono text-green-600">{inv.projectCode}</span> : <span className="text-xs text-gray-400">—</span>}
                            </td>
                          )}
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
                                {inv.status !== 'APPROVED' && inv.status !== 'RETURNED' ? (
                                  <div className="space-y-4">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sahələri doldur</p>
                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Əsl qaimə № <span className="text-gray-400">(könüllü)</span></label>
                                        <input
                                          value={inlineForm.invoiceNumber}
                                          onChange={e => setInlineForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                                          onClick={e => e.stopPropagation()}
                                          placeholder="MT20250419..."
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
                                  <>
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle size={14} className="text-green-500" />
                                      <span className="text-xs font-semibold text-green-700">Təsdiqlənmiş qaimə</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4 text-xs">
                                      <div>
                                        <span className="text-gray-400">Sistem ID</span>
                                        <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{inv.accountingId || '—'}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-400">Əsl qaimə № <span className="text-[9px]">(könüllü)</span></span>
                                        <div className="flex items-center gap-1 mt-0.5">
                                          <input
                                            value={inlineForm.invoiceNumber}
                                            onChange={e => setInlineForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                                            onClick={e => e.stopPropagation()}
                                            placeholder="MT20250419..."
                                            className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white dark:bg-gray-800"
                                          />
                                          <button
                                            onClick={e => { e.stopPropagation(); handleInlineSave(inv) }}
                                            disabled={inlineSaving}
                                            className="px-2 py-1 text-[10px] font-semibold rounded bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 whitespace-nowrap"
                                          >
                                            {inlineSaving ? '...' : 'Saxla'}
                                          </button>
                                        </div>
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
                                    {(() => {
                                      const transports = inv.transports || []
                                      if (transports.length === 0) return null
                                      const total = parseFloat(inv.totalTransportAmount || 0)
                                      return (
                                        <div className="rounded-lg border border-blue-100 dark:border-blue-800/40 overflow-hidden">
                                          <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/40 flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Texnika daşınmaları</span>
                                            <span className="text-[10px] font-bold text-blue-600">{fmtMoney(total)}</span>
                                          </div>
                                          {transports.map((t, i) => (
                                            <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs border-b border-gray-50 dark:border-gray-700 last:border-0">
                                              <div className="flex items-center gap-3">
                                                {t.transportDate && <span className="text-gray-400">{new Date(t.transportDate).toLocaleDateString('az-AZ')}</span>}
                                                <span className="text-gray-700 dark:text-gray-300">{t.transportDirection || '—'}</span>
                                              </div>
                                              <span className="font-semibold text-blue-600">{fmtMoney(parseFloat(t.transportAmount) || 0)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )
                                    })()}
                                  </div>
                                  {inv.type === 'INCOME' && <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Akt:</span>
                                    {inv.aktFileUploaded ? (
                                      <button
                                        onClick={async e => {
                                          e.stopPropagation()
                                          try {
                                            const res = await accountingApi.downloadAkt(inv.id)
                                            const url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' }))
                                            window.open(url, '_blank')
                                            setTimeout(() => URL.revokeObjectURL(url), 5000)
                                          } catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Fayl açıla bilmədi') }
                                        }}
                                        className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-colors">
                                        <Paperclip size={10} /> {inv.aktFileName || 'Fayla bax'}
                                      </button>
                                    ) : (
                                      <label className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 cursor-pointer transition-colors">
                                        <Upload size={10} /> Akt yüklə
                                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
                                          onClick={e => e.stopPropagation()}
                                          onChange={async e => {
                                            const file = e.target.files?.[0]
                                            if (!file) return
                                            const fileError = validateFileUpload(file)
                                            if (fileError) { toast.error(fileError); e.target.value = ''; return }
                                            try {
                                              await accountingApi.uploadAkt(inv.id, file)
                                              toast.success('Akt yükləndi')
                                              loadInvoices()
                                            } catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Akt yüklənmədi') }
                                          }} />
                                      </label>
                                    )}
                                  </div>}
                                  </>
                                ) : inv.status === 'RETURNED' ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Undo2 size={14} className="text-orange-500" />
                                      <span className="text-xs font-semibold text-orange-700">Geri qaytarılmış qaimə</span>
                                    </div>
                                    <p className="text-xs text-gray-500">Bu qaiməni düzəldib yenidən göndərmək üçün DRAFT-a çevirin.</p>
                                    {canEdit && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleReturnToDraft(inv) }}
                                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors flex items-center gap-1.5"
                                      >
                                        <PenLine size={12} /> Düzəliş et
                                      </button>
                                    )}
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
          )}
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
          onSaved={() => { 
            setInvoiceModal({ open: false, editing: null, defaultType: null, preProject: null }); 
            setSearch('');
            setInvoicePage(0);
            loadAll(); 
            loadInvoices(); 
          }}
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
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Əsl qaimə № <span className="text-gray-400">(könüllü)</span></label>
                <input
                  value={fieldsModal.form.invoiceNumber}
                  onChange={e => setFieldsModal(s => ({ ...s, form: { ...s.form, invoiceNumber: e.target.value } }))}
                  placeholder="MT20250419..."
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
      {docCreateModal && <DocumentCreateModal onClose={() => setDocCreateModal(false)} onCreated={() => { setDocCreateModal(false); setDocRefreshKey(k => k + 1) }} />}

      {/* ═══ Daimi Ödəniş Modal ═══ */}
      {recurringModal.open && (
        <RecurringExpenseModal
          editing={recurringModal.editing}
          onClose={() => setRecurringModal({ open: false, editing: null })}
          onSaved={() => { setRecurringModal({ open: false, editing: null }); loadRecurring() }}
        />
      )}

      {/* ═══ Qaimə Yarat Modal (Generate from Recurring) ═══ */}
      {generateModal.open && generateModal.rec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Receipt size={14} className="text-red-500" /> Qaimə Yarat
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {generateModal.rec.categoryLabel} · <span className="font-semibold text-gray-600 dark:text-gray-300">{generateModal.rec.sourceLabel}</span>
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{generateModal.rec.name}</p>
              </div>
              <button onClick={() => setGenerateModal({ open: false, rec: null })} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X size={14} className="text-gray-500" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tarix *</label>
                <DateInput
                  value={generateForm.invoiceDate}
                  onChange={e => setGenerateForm(f => ({ ...f, invoiceDate: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Məbləğ {generateModal.rec.variableAmount ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal">(dəyişə bilər)</span>}
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={generateForm.amountOverride}
                  onChange={e => setGenerateForm(f => ({ ...f, amountOverride: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                disabled={generateSaving}
                onClick={async () => {
                  if (!generateForm.invoiceDate) return toast.error('Tarix seçin')
                  const amount = parseFloat(generateForm.amountOverride) || 0
                  if (generateModal.rec.variableAmount && amount <= 0) return toast.error('Məbləğ daxil edin')
                  setGenerateSaving(true)
                  try {
                    await accountingApi.generateFromRecurring(generateModal.rec.id, {
                      invoiceDate: generateForm.invoiceDate,
                      amountOverride: amount > 0 ? amount : null,
                    })
                    toast.success('Qaimə yaradıldı — gözləyənlərə əlavə edildi')
                    setGenerateModal({ open: false, rec: null })
                    loadAll()
                    loadInvoices()
                  } catch (err) {
                    toast.error(err?.response?.data?.message || 'Xəta baş verdi')
                  } finally {
                    setGenerateSaving(false)
                  }
                }}
                className="flex-1 py-2.5 text-sm font-semibold bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {generateSaving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Qaimə Yarat
              </button>
              <button
                onClick={() => setGenerateModal({ open: false, rec: null })}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Ləğv et
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
