import DateInput from '../../components/common/DateInput'
import { useState, useEffect, useMemo, useRef, useCallback, Fragment } from 'react'
import {
  Plus, Search, Pencil, Trash2, ArrowUpRight, ArrowDownRight, CreditCard,
  Receipt, Download, PenLine, CheckCircle, Undo2,
  ChevronDown, ArrowLeft, ChevronRight, FileText, RefreshCw, Paperclip, Upload,
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
import { fmtDate, fmtPeriod } from '../../utils/date'
import { PageHeader, Pill, Field, Input, Textarea, ModalShell, TableWrap } from './_shared'
import { fmtMoney } from './_constants'

/* ─── Helpers ─── */
const fmtD = fmtDate

const MAIN_TABS = [
  { id: 'invoices', label: 'Qaimələr', icon: Receipt },
  { id: 'documents', label: 'Sənədlər', icon: FileText },
]

const TYPE_LABEL = {
  INCOME:             'Gəlir',
  CONTRACTOR_EXPENSE: 'Ödəmə',
  COMPANY_EXPENSE:    'Xərc',
  INVESTOR_EXPENSE:   'İnvestor',
}
const TYPE_TONE = {
  INCOME:             'ok',
  CONTRACTOR_EXPENSE: 'info',
  COMPANY_EXPENSE:    'danger',
  INVESTOR_EXPENSE:   'gold',
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

const METHOD_LABELS = { CASH: 'Nağd', BANK_TRANSFER: 'Bank', CARD: 'Kart', CHECK: 'Çek', OFFSET: 'Hesablaşma' }

const PAYMENT_STATUS_TONE = {
  PENDING: 'warn', COMPLETED: 'ok', CANCELLED: 'muted', OVERDUE: 'danger',
}
const PAYMENT_STATUS_LABEL = {
  PENDING: 'Gözləyir', COMPLETED: 'Tamamlanıb', CANCELLED: 'Ləğv edilib', OVERDUE: 'Gecikib',
}

const TONE_TO_BG = {
  ok:     { bg: 'var(--ces-ok-100)',                 color: 'var(--ces-ok)' },
  warn:   { bg: 'var(--ces-warn-100)',                 color: 'var(--ces-warn)' },
  danger: { bg: 'var(--ces-danger-100)',                 color: 'var(--ces-danger)' },
  info:   { bg: 'var(--ces-info-100)',                 color: 'var(--ces-info)' },
  gold:   { bg: 'var(--ces-gold-100)',     color: 'var(--ces-gold-700)' },
  muted:  { bg: 'var(--ces-graphite-100)', color: 'var(--ces-muted)' },
}

const TONE_TO_BORDER = {
  ok: 'var(--ces-ok)', warn: 'var(--ces-warn)', danger: 'var(--ces-danger)',
  info: 'var(--ces-info)', gold: 'var(--ces-gold)', muted: 'var(--ces-line)',
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function AccountingInvoicesPage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore(s => s.hasPermission)
  const canCreate = hasPermission('ACCOUNTING', 'canPost')
  const canEdit   = hasPermission('ACCOUNTING', 'canPut')
  const canDelete = hasPermission('ACCOUNTING', 'canDelete')
  const { confirm, ConfirmDialog } = useConfirm()

  const [activeTab, setActiveTab] = useState('invoices')
  const [invoices, setInvoices] = useState([])
  const [invoiceData, setInvoiceData] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 15 })
  const [invoicePage, setInvoicePage] = useState(0)
  const [invoicePageSize, setInvoicePageSize] = useState(15)
  const [transactions, setTransactions] = useState([])
  const [payments, setPayments] = useState([])
  const [, setBudgets] = useState([])
  const [, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  // Modals
  const [invoiceModal, setInvoiceModal]               = useState({ open: false, editing: null, defaultType: null, preProject: null })
  const [fieldsModal, setFieldsModal]                 = useState({ open: false, inv: null, saving: false, form: { invoiceNumber: '', invoiceDate: '', notes: '' } })
  const [expandedId, setExpandedId]                   = useState(null)
  const [inlineForm, setInlineForm]                   = useState({ invoiceNumber: '', invoiceDate: '', notes: '' })
  const [inlineSaving, setInlineSaving]               = useState(false)
  const [transactionModal, setTransactionModal]       = useState({ open: false, editing: null, defaultType: null })
  const [paymentModal, setPaymentModal]               = useState({ open: false, editing: null })
  const [printInv, setPrintInv]                       = useState(null)
  const [docCreateModal, setDocCreateModal]           = useState(false)
  const [docRefreshKey, setDocRefreshKey]             = useState(0)

  // Recurring
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

  /* ── Data ── */
  const loadRecurring = useCallback(async () => {
    try {
      const res = await accountingApi.getRecurring()
      setRecurring(res.data?.data || [])
    } catch { /* silent */ }
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
      setTransactions([])
      setPayments([])
      setBudgets([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    setPendingForms(prev => {
      const updates = {}
      invoices.filter(i => i.status === 'DRAFT' || i.status === 'SENT').forEach(inv => {
        if (prev[inv.id] === undefined) {
          updates[inv.id] = {
            invoiceNumber: inv.invoiceNumber || '',
            invoiceDate:   inv.invoiceDate   || '',
            notes:         inv.notes         || '',
          }
        }
      })
      return Object.keys(updates).length ? { ...prev, ...updates } : prev
    })
  }, [invoices])

  useEffect(() => { setInvoicePage(0) }, [invoiceTab, search])

  const loadInvoices = useCallback(async () => {
    if (activeTab !== 'invoices' || invoiceTab === 'pending') return
    try {
      const params = { page: invoicePage, size: invoicePageSize, status: 'APPROVED' }
      if (invoiceTab === 'PAYMENT')      params.types = 'CONTRACTOR_EXPENSE,INVESTOR_EXPENSE'
      else if (invoiceTab)               params.type  = invoiceTab
      if (search) params.q = search
      const res = await accountingApi.getAllPaged(params)
      setInvoiceData(res.data.data || res.data)
    } catch { /* silent */ }
  }, [activeTab, invoicePage, invoicePageSize, invoiceTab, search])

  useEffect(() => { loadInvoices() }, [loadInvoices])

  /* ── Computed ── */
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

  const tableItems = useMemo(() => invoiceData.content.map(inv => ({ ...inv, _rowType: 'invoice' })), [invoiceData.content])

  const displayItems = useMemo(() => {
    if (invoiceTab !== '' || tableItems.length === 0) return tableItems
    const ORDER = ['INCOME', 'CONTRACTOR_EXPENSE', 'INVESTOR_EXPENSE', 'COMPANY_EXPENSE']
    const groups = {}
    ORDER.forEach(t => { groups[t] = [] })
    tableItems.forEach(item => { if (groups[item.type]) groups[item.type].push(item) })
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

  const pendingGroups = useMemo(() => {
    const pending = invoices.filter(i => i.status === 'DRAFT' || i.status === 'SENT')
    const incomes  = pending.filter(i => i.type === 'INCOME')
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
    if (expandedId === item.id) setExpandedId(null)
    else {
      setExpandedId(item.id)
      setInlineForm({ invoiceNumber: item.invoiceNumber || '', invoiceDate: item.invoiceDate || '', notes: item.notes || '' })
    }
  }

  const handleInlineSave = async (inv) => {
    setInlineSaving(true)
    try {
      await accountingApi.patchFields(inv.id, {
        invoiceNumber: inlineForm.invoiceNumber || null,
        invoiceDate:   inlineForm.invoiceDate   || null,
        notes:         inlineForm.notes         || null,
      })
      toast.success('Sahələr yeniləndi')
      loadInvoices()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    } finally { setInlineSaving(false) }
  }

  /* ── Actions ── */
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
      loadAll(); loadInvoices()
    } catch (err) { toast.error(err?.response?.data?.message || 'Xəta baş verdi') }
  }

  const handleReturnToProject = async (inv) => {
    if (!(await confirm({ title: 'Layihəyə geri göndər', message: `"${inv.accountingId || inv.invoiceNumber || `#${inv.id}`}" layihəyə geri qaytarılsın?` }))) return
    try { await accountingApi.returnToProject(inv.id); toast.success('Qaimə geri qaytarıldı'); loadAll(); loadInvoices() }
    catch (err) { toast.error(err?.response?.data?.message || 'Xəta baş verdi') }
  }

  const handleReturnToDraft = async (inv) => {
    try {
      const res = await accountingApi.returnToDraft(inv.id)
      toast.success('Qaimə DRAFT-a çevrildi')
      loadAll(); loadInvoices()
      setInvoiceModal({ open: true, editing: res.data.data, defaultType: null, preProject: null })
    } catch (err) { toast.error(err?.response?.data?.message || 'Xəta baş verdi') }
  }

  /* ── Pending helpers ── */
  const getPendingForm = (invId, inv) => pendingForms[invId] ?? {
    invoiceNumber: inv?.invoiceNumber || '',
    invoiceDate:   inv?.invoiceDate   || '',
    notes:         inv?.notes         || '',
  }
  const setPendingField = (invId, field, value) => {
    setPendingForms(prev => ({ ...prev, [invId]: { ...(prev[invId] || {}), [field]: value } }))
  }

  const handlePendingSave = async (inv) => {
    setPendingSaving(prev => ({ ...prev, [inv.id]: true }))
    try {
      const form = getPendingForm(inv.id, inv)
      await accountingApi.patchFields(inv.id, {
        invoiceNumber: form.invoiceNumber || null,
        invoiceDate:   form.invoiceDate   || null,
        notes:         form.notes         || null,
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
    if (!(await confirm({ title: 'Qaiməni təsdiqlə', message: `"${inv.accountingId || getPendingForm(inv.id, inv).invoiceNumber || `#${inv.id}`}" təsdiqlənsin?` }))) return
    setPendingSaving(prev => ({ ...prev, [inv.id]: true }))
    try {
      const form = getPendingForm(inv.id, inv)
      await accountingApi.patchFields(inv.id, {
        invoiceNumber: form.invoiceNumber || null,
        invoiceDate:   form.invoiceDate   || null,
        notes:         form.notes         || null,
      })
      await accountingApi.approve(inv.id)
      toast.success('Qaimə təsdiqləndi')
      setPendingForms(prev => { const n = { ...prev }; delete n[inv.id]; return n })
      loadAll(); loadInvoices()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi')
    } finally {
      setPendingSaving(prev => ({ ...prev, [inv.id]: false }))
    }
  }

  const handlePendingApproveGroup = async (group) => {
    const all = [group.income, ...group.expenses].filter(Boolean)
    if (all.length === 0) return
    if (!(await confirm({ title: 'Hər ikisini təsdiqlə', message: `Bu layihəyə aid ${all.length} qaimə bir anda təsdiqlənsin?` }))) return
    const idsObj = all.reduce((acc, inv) => ({ ...acc, [inv.id]: true }), {})
    setPendingSaving(prev => ({ ...prev, ...idsObj }))
    try {
      for (const inv of all) {
        const form = getPendingForm(inv.id, inv)
        await accountingApi.patchFields(inv.id, {
          invoiceNumber: form.invoiceNumber || null,
          invoiceDate:   form.invoiceDate   || null,
          notes:         form.notes         || null,
        })
        await accountingApi.approve(inv.id)
      }
      toast.success(`${all.length} qaimə təsdiqləndi`)
      setPendingForms(prev => {
        const n = { ...prev }
        all.forEach(inv => delete n[inv.id])
        return n
      })
      loadAll(); loadInvoices()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Xəta baş verdi')
      loadAll(); loadInvoices()
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

  const exportTransactions = () => {
    const rows = filteredTransactions.map(t => ({
      'Növ':           t.type === 'INCOME' ? 'Gəlir' : 'Xərc',
      'Kateqoriya':    CATEGORY_LABELS[t.category] || t.category,
      'Məbləğ':        t.amount,
      'Tarix':         t.transactionDate,
      'Ödəniş üsulu':  METHOD_LABELS[t.paymentMethod] || t.paymentMethod,
      'İstinad':       t.referenceNumber || '',
      'Açıqlama':      t.description || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Əməliyyatlar')
    XLSX.writeFile(wb, `əməliyyatlar-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ color: 'var(--ces-ink)' }}>
      <ConfirmDialog />

      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/accounting')}
            className="w-9 h-9 rounded-[10px] grid place-items-center transition-colors"
            style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', color: 'var(--ces-graphite)' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-[28px] font-extrabold tracking-[-.022em] leading-none" style={{ color: 'var(--ces-graphite-900)' }}>
              Qaimələr
            </h1>
            <p className="text-[13px] mt-1.5" style={{ color: 'var(--ces-muted)' }}>E-qaimələrin idarə edilməsi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* MAIN TABS — segmented control */}
          {MAIN_TABS.length > 1 && (
            <div
              className="inline-flex gap-1 p-1"
              style={{ background: 'var(--ces-graphite-50)', border: '1px solid var(--ces-line)', borderRadius: '10px' }}
            >
              {MAIN_TABS.map(tab => {
                const Icon = tab.icon
                const on = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setSearch('') }}
                    className="flex items-center gap-1.5 py-1.5 px-3 text-[12.5px] font-semibold rounded-[7px] transition-colors whitespace-nowrap"
                    style={{
                      background: on ? 'var(--ces-surface)' : 'transparent',
                      color: on ? 'var(--ces-graphite)' : 'var(--ces-muted)',
                      boxShadow: on ? 'var(--ces-shadow-sm)' : 'none',
                    }}
                  >
                    <Icon size={13} /> {tab.label}
                  </button>
                )
              })}
            </div>
          )}
          {canCreate && (
            <button onClick={handleNewAction} className="ces-btn ces-btn-primary">
              <Plus size={15} />
              {activeTab === 'invoices'     ? 'Yeni Qaimə'
              : activeTab === 'documents'   ? 'Yeni Sənəd'
              : activeTab === 'transactions' ? 'Yeni Əməliyyat'
              : activeTab === 'payments'     ? 'Yeni Ödəniş'
              : 'Yeni Əməliyyat'}
            </button>
          )}
        </div>
      </div>

      {/* DOCUMENTS TAB */}
      {activeTab === 'documents' && <DocumentsTab onCreateNew={() => setDocCreateModal(true)} refreshKey={docRefreshKey} />}

      {/* INVOICES TAB */}
      {activeTab === 'invoices' && (
        <div>
          {/* Sub tabs */}
          <div
            className="flex gap-1 mb-4 p-0.5"
            style={{ background: 'var(--ces-graphite-50)', border: '1px solid var(--ces-line)', borderRadius: '10px' }}
          >
            {[
              { id: 'pending',          label: 'Gözləyənlər' },
              { id: '',                 label: 'Hamısı' },
              { id: 'INCOME',           label: 'Gəlirlər' },
              { id: 'PAYMENT',          label: 'Podratçı' },
              { id: 'COMPANY_EXPENSE',  label: 'Təchizatçı' },
            ].map(tab => {
              const on = invoiceTab === tab.id
              const counts = {
                '':                 invoices.filter(i => i.status === 'APPROVED').length,
                INCOME:             invoices.filter(i => i.type === 'INCOME' && i.status === 'APPROVED').length,
                PAYMENT:            invoices.filter(i => (i.type === 'CONTRACTOR_EXPENSE' || i.type === 'INVESTOR_EXPENSE') && i.status === 'APPROVED').length,
                COMPANY_EXPENSE:    invoices.filter(i => i.type === 'COMPANY_EXPENSE' && i.status === 'APPROVED').length,
              }
              return (
                <button
                  key={tab.id}
                  onClick={() => { setInvoiceTab(tab.id); setSearch('') }}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[11.5px] font-semibold rounded-md transition-colors"
                  style={{
                    background: on ? 'var(--ces-surface)' : 'transparent',
                    color: on ? 'var(--ces-graphite)' : 'var(--ces-muted)',
                    boxShadow: on ? 'var(--ces-shadow-sm)' : 'none',
                  }}
                >
                  {tab.label}
                  {tab.id === 'pending' && pendingCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                      style={{ background: 'var(--ces-gold)', color: 'var(--ces-on-gold)' }}>
                      {pendingCount}
                    </span>
                  )}
                  {tab.id !== 'pending' && counts[tab.id] != null && <span className="ml-1 opacity-60">({counts[tab.id]})</span>}
                </button>
              )
            })}
          </div>

          {/* Search */}
          {invoiceTab !== 'pending' && (
            <div className="mb-4">
              <div
                className="flex items-center gap-2 max-w-[480px]"
                style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '10px', padding: '0 12px', minHeight: '40px' }}
              >
                <Search size={14} style={{ color: 'var(--ces-mute2)' }} />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Qaimə nömrəsi, şirkət, layihə..."
                  className="flex-1 outline-none bg-transparent text-[13px]"
                  style={{ color: 'var(--ces-ink)' }}
                />
              </div>
            </div>
          )}

          {/* ── PENDING INVOICES ── */}
          {invoiceTab === 'pending' && (
            <div className="space-y-4">
              {loading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="h-44 rounded-[14px] animate-pulse" style={{ background: 'var(--ces-graphite-50)' }} />
                ))
              ) : pendingGroups.length === 0 ? (
                <div
                  className="text-center py-14"
                  style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: 'var(--ces-radius-lg)' }}
                >
                  <div className="w-12 h-12 rounded-2xl mx-auto mb-3 grid place-items-center" style={{ background: '#e8fbe5' }}>
                    <CheckCircle size={20} style={{ color: 'var(--ces-ok)' }} />
                  </div>
                  <p className="text-[14px] font-semibold" style={{ color: 'var(--ces-ink)' }}>Gözləyən qaimə yoxdur</p>
                  <p className="text-[12px] mt-1" style={{ color: 'var(--ces-muted)' }}>Bütün qaimələr təsdiqlənib</p>
                  {canCreate && (
                    <button
                      onClick={() => setInvoiceModal({ open: true, editing: null, defaultType: 'INCOME', preProject: null })}
                      className="ces-btn ces-btn-primary ces-btn-sm mt-4"
                    >
                      <Plus size={13} /> Yeni Qaimə
                    </button>
                  )}
                </div>
              ) : pendingGroups.map(group => {
                const hasIncome = !!group.income
                const hasExpenses = group.expenses.length > 0
                const isPair = hasIncome && hasExpenses
                const firstInv = group.income || group.expenses[0]
                const incomeAmt  = group.income ? parseFloat(group.income.amount || 0) : 0
                const expenseAmt = group.expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
                const margin    = incomeAmt - expenseAmt
                const marginPct = incomeAmt > 0 ? (margin / incomeAmt * 100) : 0

                const renderInvoicePanel = (inv) => {
                  const form = getPendingForm(inv.id, inv)
                  const saving = !!pendingSaving[inv.id]
                  const tone = TYPE_TONE[inv.type] || 'muted'
                  const accentBg = TONE_TO_BG[tone]
                  const isIncome = inv.type === 'INCOME'
                  const fieldsComplete = !!form.invoiceDate

                  return (
                    <div
                      key={inv.id}
                      className="p-4 space-y-3"
                      style={{ borderLeft: `4px solid ${TONE_TO_BORDER[tone]}`, background: `${accentBg.bg}30` }}
                    >
                      {/* Header: type + amount */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Pill tone={tone} sm dot>
                              {isIncome ? 'Müştəridən gələn'
                                : inv.type === 'INVESTOR_EXPENSE' ? 'İnvestora ödəniş'
                                : inv.type === 'COMPANY_EXPENSE'  ? 'Şirkət xərci'
                                : 'Podratçıya ödəniş'}
                            </Pill>
                            <Pill tone={inv.status === 'SENT' ? 'info' : 'muted'} sm>
                              {inv.status === 'SENT' ? 'Göndərilib' : 'Qaralama'}
                            </Pill>
                            {fieldsComplete && (
                              <span title="Bütün sahələr doldurulub" className="inline-flex items-center justify-center w-4 h-4 rounded-full"
                                style={{ background: '#e8fbe5' }}>
                                <CheckCircle size={10} style={{ color: 'var(--ces-ok)' }} />
                              </span>
                            )}
                          </div>
                          <div className="text-[14px] font-bold truncate" style={{ color: 'var(--ces-ink)' }}>
                            {inv.customerName || inv.contractorName || inv.companyName || (isIncome ? 'Müştəri' : 'Tərəf-müqabil')}
                          </div>
                          {inv.equipmentName && (
                            <div className="text-[11.5px] mt-0.5 truncate" style={{ color: 'var(--ces-mute2)' }}>{inv.equipmentName}</div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[18px] font-extrabold num"
                            style={{ color: isIncome ? 'var(--ces-ok)' : 'var(--ces-danger)' }}>
                            {isIncome ? '+' : '−'}{fmtMoney(inv.amount)}
                          </div>
                          {inv.accountingId && (
                            <div className="text-[10.5px] font-mono font-bold mt-0.5" style={{ color: 'var(--ces-gold-700)' }}>
                              {inv.accountingId}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Period & days */}
                      {(inv.periodMonth || inv.standardDays != null || inv.extraDays != null || inv.extraHours != null) && (
                        <div
                          className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]"
                          style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '8px', padding: '7px 10px' }}
                        >
                          {inv.periodMonth && inv.periodYear && (
                            <span className="font-semibold" style={{ color: 'var(--ces-gold-700)' }}>
                              {fmtPeriod(inv.periodYear, inv.periodMonth)}
                            </span>
                          )}
                          {inv.standardDays != null && <span style={{ color: 'var(--ces-muted)' }}>Standart: <b style={{ color: 'var(--ces-ink)' }}>{inv.standardDays} gün</b></span>}
                          {inv.extraDays != null && parseFloat(inv.extraDays) > 0 && <span style={{ color: 'var(--ces-muted)' }}>Əlavə: <b style={{ color: 'var(--ces-ink)' }}>{inv.extraDays} gün</b></span>}
                          {inv.extraHours != null && parseFloat(inv.extraHours) > 0 && <span style={{ color: 'var(--ces-muted)' }}>+<b style={{ color: 'var(--ces-ink)' }}>{inv.extraHours} saat</b></span>}
                          {(inv.transports || []).length > 0 && (
                            <span style={{ color: 'var(--ces-info)' }}>Daşınma: <b>{(inv.transports || []).length}× {fmtMoney(inv.totalTransportAmount)}</b></span>
                          )}
                        </div>
                      )}

                      {inv.serviceDescription && (
                        <div className="text-[11.5px] italic line-clamp-2 px-1" style={{ color: 'var(--ces-muted)' }}>
                          {inv.serviceDescription}
                        </div>
                      )}

                      {/* Transports list */}
                      {(() => {
                        const transports = inv.transports || []
                        if (transports.length === 0) return null
                        const total = parseFloat(inv.totalTransportAmount || 0)
                        return (
                          <div className="overflow-hidden" style={{ borderRadius: '8px', border: '1px solid #e3edfb' }}>
                            <div className="flex items-center justify-between px-2.5 py-1.5"
                              style={{ background: '#e3edfb', borderBottom: '1px solid #e3edfb' }}>
                              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--ces-info)' }}>Daşınma</span>
                              <span className="text-[10.5px] font-bold" style={{ color: 'var(--ces-info)' }}>{fmtMoney(total)}</span>
                            </div>
                            {transports.map((t, i) => (
                              <div key={i} className="flex items-center justify-between px-2.5 py-1.5 text-[11px]"
                                style={{ borderBottom: i < transports.length - 1 ? '1px solid var(--ces-line-2)' : 'none' }}>
                                <div className="flex items-center gap-2">
                                  {t.transportDate && <span style={{ color: 'var(--ces-mute2)' }}>{fmtD(t.transportDate)}</span>}
                                  <span style={{ color: 'var(--ces-ink)' }}>{t.transportDirection || '—'}</span>
                                </div>
                                <span className="font-semibold" style={{ color: 'var(--ces-info)' }}>{fmtMoney(parseFloat(t.transportAmount) || 0)}</span>
                              </div>
                            ))}
                          </div>
                        )
                      })()}

                      {/* Inline form */}
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Field label={<>Əsl qaimə № <span style={{ color: 'var(--ces-mute2)' }}>(könüllü)</span></>}>
                            <Input value={form.invoiceNumber} onChange={(e) => setPendingField(inv.id, 'invoiceNumber', e.target.value)}
                              placeholder="MT20250419..." mono />
                          </Field>
                          <Field label="Tarix" required>
                            <div
                              className="flex items-center px-[13px]"
                              style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '11px', minHeight: '44px' }}
                            >
                              <DateInput
                                value={form.invoiceDate}
                                onChange={(e) => setPendingField(inv.id, 'invoiceDate', e.target.value)}
                                className="flex-1 border-0 outline-0 bg-transparent text-[14px] py-[11px] w-full"
                              />
                            </div>
                          </Field>
                        </div>
                        <Field label="Qeyd">
                          <Textarea
                            value={form.notes}
                            onChange={(e) => setPendingField(inv.id, 'notes', e.target.value)}
                            rows={2}
                            placeholder="Əlavə qeyd, müqavilə № və ya digər məlumatlar..."
                          />
                        </Field>
                      </div>

                      {/* AKT + Actions */}
                      <div
                        className="flex items-center gap-1.5 flex-wrap pt-3"
                        style={{ borderTop: '1px solid var(--ces-line)', marginTop: '4px' }}
                      >
                        {/* AKT (income only) */}
                        {isIncome && (
                          inv.aktFileUploaded ? (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await accountingApi.downloadAkt(inv.id)
                                  const url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' }))
                                  window.open(url, '_blank')
                                  setTimeout(() => URL.revokeObjectURL(url), 5000)
                                } catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Fayl açıla bilmədi') }
                              }}
                              className="ces-btn ces-btn-sm"
                              style={{ background: '#e3edfb', color: 'var(--ces-info)', border: '1px solid rgba(37,99,200,.2)', maxWidth: '180px' }}
                              title={inv.aktFileName}
                            >
                              <Paperclip size={11} />
                              <span className="truncate">Akt yükləndi</span>
                            </button>
                          ) : (
                            <label className="ces-btn ces-btn-sm ces-btn-outline cursor-pointer">
                              <Upload size={11} /> Akt yüklə
                              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
                                onChange={async (e) => {
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
                          )
                        )}

                        <button onClick={() => handlePendingSave(inv)} disabled={saving} className="ces-btn ces-btn-outline ces-btn-sm" title="Yadda saxla">
                          <PenLine size={11} /> {saving ? 'Saxlanır...' : 'Saxla'}
                        </button>
                        <button
                          onClick={() => handlePendingApprove(inv)}
                          disabled={saving}
                          className="ces-btn ces-btn-sm"
                          style={{ background: 'var(--ces-ok)', color: '#fff' }}
                          title="Qaiməni təsdiqlə"
                        >
                          <CheckCircle size={11} /> Təsdiqlə
                        </button>
                        {inv.projectId && (inv.type === 'INCOME' || inv.type === 'COMPANY_EXPENSE') && (
                          <button onClick={() => handleReturnToProject(inv)} className="ces-btn ces-btn-sm"
                            style={{ background: '#fff4dc', color: 'var(--ces-warn)', border: '1px solid rgba(224,138,0,.2)' }}
                            title="Layihəyə geri qaytar"
                          >
                            <Undo2 size={11} /> Geri
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDeleteInvoice(inv)} title="Sil" className="ces-row-act danger ml-auto">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={group.id}
                    className="overflow-hidden"
                    style={{
                      background: 'var(--ces-surface)',
                      border: `1px solid ${isPair ? 'var(--ces-gold-100)' : 'var(--ces-line)'}`,
                      borderRadius: 'var(--ces-radius-lg)',
                      boxShadow: 'var(--ces-shadow-sm)',
                    }}
                  >
                    {/* Group header */}
                    <div
                      className="px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap"
                      style={{
                        background: isPair ? 'var(--ces-gold-50)' : 'var(--ces-graphite-50)',
                        borderBottom: `1px solid ${isPair ? 'var(--ces-gold-100)' : 'var(--ces-line)'}`,
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {firstInv.projectCode && (
                          <span className="font-mono text-[11.5px] font-bold px-2 py-0.5 rounded-md"
                            style={{ background: '#e8fbe5', color: 'var(--ces-ok)' }}>
                            {firstInv.projectCode}
                          </span>
                        )}
                        <div className="min-w-0">
                          {firstInv.projectName && (
                            <div className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--ces-ink)' }}>{firstInv.projectName}</div>
                          )}
                          <div className="flex items-center gap-2 text-[10.5px]" style={{ color: 'var(--ces-muted)' }}>
                            {firstInv.periodMonth && firstInv.periodYear && (
                              <span className="font-semibold" style={{ color: 'var(--ces-gold-700)' }}>
                                {fmtPeriod(firstInv.periodYear, firstInv.periodMonth)}
                              </span>
                            )}
                            <span>{fmtD(firstInv.invoiceDate || firstInv.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {isPair ? (
                        <div className="flex items-center gap-2 text-[10.5px]">
                          <span className="font-bold num" style={{ color: 'var(--ces-ok)' }}>+{fmtMoney(incomeAmt)}</span>
                          <ChevronRight size={12} style={{ color: 'var(--ces-mute2)' }} />
                          <span className="font-bold num" style={{ color: 'var(--ces-danger)' }}>−{fmtMoney(expenseAmt)}</span>
                          <span style={{ color: 'var(--ces-mute2)' }}>=</span>
                          <Pill tone={margin >= 0 ? 'ok' : 'danger'} sm>
                            {margin >= 0 ? '+' : ''}{fmtMoney(margin)}
                            {incomeAmt > 0 && <span className="opacity-70">({marginPct.toFixed(0)}%)</span>}
                          </Pill>
                        </div>
                      ) : (
                        <span className="text-[10.5px] italic" style={{ color: 'var(--ces-mute2)' }}>
                          {hasIncome ? 'Tək gəlir qaiməsi' : 'Tək xərc qaiməsi'}
                        </span>
                      )}
                    </div>

                    <div className={clsx(isPair && 'grid grid-cols-1 lg:grid-cols-2')}
                      style={isPair ? { divideRight: '1px solid var(--ces-line)' } : {}}>
                      {hasIncome && renderInvoicePanel(group.income)}
                      {group.expenses.map(exp => renderInvoicePanel(exp))}
                    </div>

                    {isPair && (() => {
                      const all = [group.income, ...group.expenses]
                      const anySaving = all.some(inv => pendingSaving[inv.id])
                      return (
                        <div
                          className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
                          style={{ background: 'var(--ces-gold-50)', borderTop: '1px solid var(--ces-gold-100)' }}
                        >
                          <div className="text-[11.5px] flex items-center gap-1.5" style={{ color: 'var(--ces-gold-700)' }}>
                            <CheckCircle size={12} />
                            <span>Bu layihənin gəlir və xərc qaimələri eyni anda təsdiqlənə bilər</span>
                          </div>
                          <button
                            onClick={() => handlePendingApproveGroup(group)}
                            disabled={anySaving}
                            className="ces-btn ces-btn-sm"
                            style={{ background: 'var(--ces-gold)', color: 'var(--ces-on-gold)' }}
                          >
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

          {/* Summary stats for "Hamısı" */}
          {invoiceTab === '' && invoices.length > 0 && (() => {
            const stats = [
              { label: 'Gəlir',              types: ['INCOME'],             sign: '+', tone: 'ok' },
              { label: 'Podratçı Ödəməsi',   types: ['CONTRACTOR_EXPENSE'], sign: '−', tone: 'info' },
              { label: 'İnvestor Ödəməsi',   types: ['INVESTOR_EXPENSE'],   sign: '−', tone: 'gold' },
              { label: 'Şirkət Xərci',       types: ['COMPANY_EXPENSE'],    sign: '−', tone: 'danger' },
            ]
            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                {stats.map(s => {
                  const total = invoices.filter(i => s.types.includes(i.type) && i.status === 'APPROVED').reduce((sum, i) => sum + parseFloat(i.amount || 0), 0)
                  const count = invoices.filter(i => s.types.includes(i.type) && i.status === 'APPROVED').length
                  const t = TONE_TO_BG[s.tone]
                  return (
                    <div key={s.label} className="px-3 py-2.5"
                      style={{ background: t.bg, borderRadius: '12px', color: t.color }}>
                      <p className="font-medium opacity-80 text-[11.5px]">{s.label}</p>
                      <p className="text-[14px] font-extrabold mt-0.5 num">{s.sign}{fmtMoney(total)}</p>
                      <p className="opacity-60 text-[10px]">{count} qaimə</p>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {/* Recurring expenses (Company Expense tab only) */}
          {invoiceTab === 'COMPANY_EXPENSE' && (
            <div
              className="mb-4 overflow-visible"
              style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: 'var(--ces-radius-lg)' }}
            >
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                onClick={() => setRecurringCollapsed(c => !c)}>
                <div className="flex items-center gap-2">
                  <RefreshCw size={14} style={{ color: 'var(--ces-gold)' }} />
                  <span className="text-[13px] font-bold" style={{ color: 'var(--ces-ink)' }}>Daimi Ödənişlər</span>
                  <Pill tone="gold" sm>{recurring.length}</Pill>
                </div>
                <div className="flex items-center gap-2">
                  {canCreate && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setRecurringModal({ open: true, editing: null }) }}
                      className="ces-btn ces-btn-sm"
                      style={{ background: 'var(--ces-gold)', color: 'var(--ces-on-gold)' }}
                    >
                      <Plus size={11} /> Yeni
                    </button>
                  )}
                  <ChevronDown size={14}
                    style={{ color: 'var(--ces-mute2)', transform: recurringCollapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform .15s' }} />
                </div>
              </div>

              {!recurringCollapsed && (
                <div className="p-3" style={{ borderTop: '1px solid var(--ces-line)' }}>
                  {recurring.length === 0 ? (
                    <div className="text-center py-6 text-[13px]" style={{ color: 'var(--ces-mute2)' }}>
                      <RefreshCw size={24} className="mx-auto mb-2 opacity-30" />
                      Daimi ödəniş şablonu yoxdur
                    </div>
                  ) : (() => {
                    const grouped = {}
                    recurring.forEach(r => {
                      const cat = r.categoryLabel || r.categoryKey
                      if (!grouped[cat]) grouped[cat] = []
                      grouped[cat].push(r)
                    })
                    return Object.entries(grouped).map(([cat, items]) => (
                      <div key={cat} className="mb-3 last:mb-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 px-1" style={{ color: 'var(--ces-muted)' }}>{cat}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                          {items.map(rec => (
                            <div
                              key={rec.id}
                              className="relative p-3"
                              style={{
                                background: rec.active ? 'var(--ces-graphite-50)' : 'var(--ces-surface)',
                                borderRadius: '10px',
                                border: rec.active ? '1px solid var(--ces-line)' : '1px dashed var(--ces-line)',
                                opacity: rec.active ? 1 : 0.6,
                              }}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                  <p className="text-[12.5px] font-bold leading-tight" style={{ color: 'var(--ces-ink)' }}>{rec.sourceLabel}</p>
                                  <p className="text-[10.5px] mt-0.5 leading-tight" style={{ color: 'var(--ces-muted)' }}>{rec.name}</p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  {canEdit && (
                                    <button onClick={() => setRecurringModal({ open: true, editing: rec })} className="ces-row-act gold">
                                      <Pencil size={11} />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button onClick={async () => {
                                      if (!await confirm({ title: 'Daimi ödənişi sil', message: `"${rec.name}" silinsin?` })) return
                                      await accountingApi.deleteRecurring(rec.id)
                                      loadRecurring()
                                    }} className="ces-row-act danger">
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[10.5px] mb-2">
                                <span className="font-extrabold text-[14px] num"
                                  style={{ color: rec.variableAmount ? 'var(--ces-mute2)' : 'var(--ces-danger)' }}>
                                  {rec.variableAmount ? 'Dəyişkən' : `−${fmtMoney(rec.amount)}`}
                                </span>
                                <span className="px-1.5 py-0.5 rounded font-medium"
                                  style={{ background: 'var(--ces-graphite-100)', color: 'var(--ces-muted)' }}>
                                  {rec.frequencyLabel}
                                  {rec.dayOfMonth ? ` · ${rec.dayOfMonth}-ci gün` : ''}
                                </span>
                              </div>
                              {canCreate && rec.active && (
                                <button
                                  onClick={() => {
                                    setGenerateModal({ open: true, rec })
                                    setGenerateForm({
                                      invoiceDate: new Date().toISOString().slice(0, 10),
                                      amountOverride: rec.variableAmount ? '' : String(rec.amount),
                                    })
                                  }}
                                  className="w-full py-1.5 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
                                  style={{ background: '#fdeaef', color: 'var(--ces-danger)', border: '1px solid rgba(212,56,90,.2)' }}
                                >
                                  <Receipt size={11} /> Qaimə Yarat
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TABLE — non-pending tabs */}
          {invoiceTab !== 'pending' && (
            <TableWrap>
              <div className="overflow-x-auto">
                <table className="ces-tbl w-full min-w-[800px]">
                  <thead>
                    <tr>
                      <th className="w-8"></th>
                      <th>Növ</th>
                      <th>Sistem ID / Qaimə №</th>
                      <th>Məbləğ</th>
                      <th>Tarix</th>
                      {invoiceTab !== 'COMPANY_EXPENSE' && <th>Dövr</th>}
                      <th>Şirkət / Təchizatçı</th>
                      {invoiceTab !== 'COMPANY_EXPENSE' && <th>Layihə</th>}
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? <TableSkeleton cols={9} rows={5} /> : displayItems.length === 0 ? (
                      <EmptyState icon={Receipt} title="Məlumat tapılmadı" description="Hələlik heç bir qaimə yoxdur"
                        action={canCreate ? () => setInvoiceModal({ open: true, editing: null, defaultType: invoiceTab || 'INCOME', preProject: null }) : undefined}
                        actionLabel="Yeni Qaimə" />
                    ) : displayItems.map(item => {
                      if (item._isGroupHeader) {
                        const tone = TYPE_TONE[item.type] || 'muted'
                        const t = TONE_TO_BG[tone]
                        return (
                          <tr key={`grp-${item.type}`}>
                            <td colSpan={9} className="py-1.5 px-4"
                              style={{ background: t.bg, color: t.color, borderBottom: '1px solid var(--ces-line)' }}>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wide">{TYPE_LABEL[item.type]}</span>
                                <span className="text-[10px] opacity-60">{item.count} qaimə</span>
                                <span className="ml-auto text-[12.5px] font-semibold num">
                                  {item.type === 'INCOME' ? '+' : '−'}{fmtMoney(item.total)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )
                      }

                      const isExpanded = expandedId === item.id
                      const inv = item
                      const tone = TYPE_TONE[inv.type] || 'muted'
                      return (
                        <Fragment key={inv.id}>
                          <tr
                            onClick={() => toggleExpand(inv)}
                            className="cursor-pointer transition-colors"
                            style={{
                              background: isExpanded ? 'var(--ces-gold-50)' : 'transparent',
                              borderLeft: invoiceTab === '' ? `3px solid ${TONE_TO_BORDER[tone]}` : 'none',
                            }}
                          >
                            <td className="text-center">
                              <ChevronDown size={14} style={{ color: 'var(--ces-mute2)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                            </td>
                            <td><Pill tone={tone} sm dot>{TYPE_LABEL[inv.type]}</Pill></td>
                            <td>
                              <div className="flex flex-col">
                                {inv.accountingId
                                  ? <p className="text-[12.5px] font-mono font-bold" style={{ color: 'var(--ces-gold-700)' }}>{inv.accountingId}</p>
                                  : <p className="text-[12px] italic" style={{ color: 'var(--ces-mute2)' }}>—</p>}
                                {inv.invoiceNumber && (
                                  <p className="text-[10.5px] font-mono" style={{ color: 'var(--ces-muted)' }}>{inv.invoiceNumber}</p>
                                )}
                                {inv.type === 'COMPANY_EXPENSE' && (
                                  <span className="text-[10.5px] italic truncate max-w-[180px]" style={{ color: 'var(--ces-mute2)' }}>{inv.serviceDescription}</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="text-[14px] font-bold num"
                                style={{ color: inv.type === 'INCOME' ? 'var(--ces-ok)' : 'var(--ces-danger)' }}>
                                {inv.type === 'INCOME' ? '+' : '−'}{fmtMoney(inv.amount)}
                              </span>
                            </td>
                            <td className="text-[12px] whitespace-nowrap" style={{ color: 'var(--ces-muted)' }}>{fmtD(inv.invoiceDate)}</td>
                            {invoiceTab !== 'COMPANY_EXPENSE' && (
                              <td>
                                {inv.periodMonth && inv.periodYear ? (
                                  <span className="text-[12px] font-medium whitespace-nowrap" style={{ color: 'var(--ces-gold-700)' }}>
                                    {fmtPeriod(inv.periodYear, inv.periodMonth)}
                                  </span>
                                ) : <span className="text-[12px]" style={{ color: 'var(--ces-mute2)' }}>—</span>}
                              </td>
                            )}
                            <td>
                              <p className="text-[12.5px] truncate max-w-[150px]" style={{ color: 'var(--ces-ink)' }}>
                                {inv.companyName || inv.contractorName || inv.investorName || '—'}
                              </p>
                            </td>
                            {invoiceTab !== 'COMPANY_EXPENSE' && (
                              <td>
                                {inv.projectCode ? <span className="text-[12px] font-mono" style={{ color: 'var(--ces-ok)' }}>{inv.projectCode}</span>
                                  : <span className="text-[12px]" style={{ color: 'var(--ces-mute2)' }}>—</span>}
                              </td>
                            )}
                            <td>
                              {inv.status === 'APPROVED'
                                ? <Pill tone="ok" sm><CheckCircle size={11} /> Təsdiqlənib</Pill>
                                : <Pill tone="warn" sm>Gözləyir</Pill>}
                            </td>
                          </tr>
                          {/* Expanded panel */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={9} style={{ padding: 0 }}>
                                <div style={{ background: 'var(--ces-graphite-50)', borderBottom: '1px solid var(--ces-line)', padding: '20px 24px' }}>
                                  {inv.status !== 'APPROVED' && inv.status !== 'RETURNED' ? (
                                    <div className="space-y-4">
                                      <p className="text-[10.5px] font-bold uppercase tracking-widest" style={{ color: 'var(--ces-muted)' }}>Sahələri doldur</p>
                                      <div className="grid grid-cols-3 gap-3">
                                        <Field label={<>Əsl qaimə № <span style={{ color: 'var(--ces-mute2)' }}>(könüllü)</span></>}>
                                          <Input value={inlineForm.invoiceNumber}
                                            onChange={(e) => setInlineForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                                            placeholder="MT20250419..." mono />
                                        </Field>
                                        <Field label="Tarix">
                                          <div className="flex items-center px-[13px]" style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '11px', minHeight: '44px' }}>
                                            <DateInput value={inlineForm.invoiceDate}
                                              onChange={(e) => setInlineForm(f => ({ ...f, invoiceDate: e.target.value }))}
                                              className="flex-1 border-0 outline-0 bg-transparent text-[14px] py-[11px] w-full" />
                                          </div>
                                        </Field>
                                        <Field label="Qeydlər">
                                          <Input value={inlineForm.notes}
                                            onChange={(e) => setInlineForm(f => ({ ...f, notes: e.target.value }))}
                                            placeholder="Əlavə qeyd..." />
                                        </Field>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); handleInlineSave(inv) }} disabled={inlineSaving} className="ces-btn ces-btn-primary ces-btn-sm">
                                          <PenLine size={12} /> {inlineSaving ? 'Saxlanılır...' : 'Saxla'}
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleApprove(inv) }} className="ces-btn ces-btn-sm" style={{ background: 'var(--ces-ok)', color: '#fff' }}>
                                          <CheckCircle size={12} /> Təsdiqlə
                                        </button>
                                        {inv.projectId && (
                                          <button onClick={(e) => { e.stopPropagation(); handleReturnToProject(inv) }} className="ces-btn ces-btn-sm"
                                            style={{ background: '#fff4dc', color: 'var(--ces-warn)', border: '1px solid rgba(224,138,0,.2)' }}>
                                            <Undo2 size={12} /> Geri Qaytar
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ) : inv.status === 'APPROVED' ? (
                                    <>
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                          <CheckCircle size={14} style={{ color: 'var(--ces-ok)' }} />
                                          <span className="text-[12.5px] font-semibold" style={{ color: 'var(--ces-ok)' }}>Təsdiqlənmiş qaimə</span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-4 text-[12px]">
                                          <div>
                                            <span style={{ color: 'var(--ces-muted)' }}>Sistem ID</span>
                                            <p className="font-mono font-bold" style={{ color: 'var(--ces-gold-700)' }}>{inv.accountingId || '—'}</p>
                                          </div>
                                          <div>
                                            <span style={{ color: 'var(--ces-muted)' }}>Əsl qaimə № <span className="text-[9px]">(könüllü)</span></span>
                                            <div className="flex items-center gap-1 mt-0.5">
                                              <Input value={inlineForm.invoiceNumber}
                                                onChange={(e) => setInlineForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                                                placeholder="MT20250419..." mono />
                                              <button onClick={(e) => { e.stopPropagation(); handleInlineSave(inv) }} disabled={inlineSaving}
                                                className="ces-btn ces-btn-primary ces-btn-xs whitespace-nowrap">
                                                {inlineSaving ? '...' : 'Saxla'}
                                              </button>
                                            </div>
                                          </div>
                                          <div>
                                            <span style={{ color: 'var(--ces-muted)' }}>Tarix</span>
                                            <p className="font-semibold" style={{ color: 'var(--ces-ink)' }}>{fmtD(inv.invoiceDate)}</p>
                                          </div>
                                          <div>
                                            <span style={{ color: 'var(--ces-muted)' }}>Qeydlər</span>
                                            <p style={{ color: 'var(--ces-ink)' }}>{inv.notes || '—'}</p>
                                          </div>
                                        </div>
                                      </div>
                                      {inv.type === 'INCOME' && (
                                        <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--ces-line)' }}>
                                          <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ces-muted)' }}>Akt:</span>
                                          {inv.aktFileUploaded ? (
                                            <button
                                              onClick={async (e) => {
                                                e.stopPropagation()
                                                try {
                                                  const res = await accountingApi.downloadAkt(inv.id)
                                                  const url = URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' }))
                                                  window.open(url, '_blank')
                                                  setTimeout(() => URL.revokeObjectURL(url), 5000)
                                                } catch (err) { if (!err._toasted) toast.error(err?.response?.data?.message || 'Fayl açıla bilmədi') }
                                              }}
                                              className="ces-btn ces-btn-sm"
                                              style={{ background: '#e3edfb', color: 'var(--ces-info)', border: '1px solid rgba(37,99,200,.2)' }}>
                                              <Paperclip size={11} /> {inv.aktFileName || 'Fayla bax'}
                                            </button>
                                          ) : (
                                            <label className="ces-btn ces-btn-sm cursor-pointer"
                                              style={{ background: 'var(--ces-gold-50)', color: 'var(--ces-gold-700)', border: '1px solid var(--ces-gold-100)' }}>
                                              <Upload size={11} /> Akt yüklə
                                              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={async (e) => {
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
                                        </div>
                                      )}
                                    </>
                                  ) : inv.status === 'RETURNED' ? (
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2">
                                        <Undo2 size={14} style={{ color: 'var(--ces-warn)' }} />
                                        <span className="text-[12.5px] font-semibold" style={{ color: 'var(--ces-warn)' }}>Geri qaytarılmış qaimə</span>
                                      </div>
                                      <p className="text-[12px]" style={{ color: 'var(--ces-muted)' }}>Bu qaiməni düzəldib yenidən göndərmək üçün DRAFT-a çevirin.</p>
                                      {canEdit && (
                                        <button onClick={(e) => { e.stopPropagation(); handleReturnToDraft(inv) }} className="ces-btn ces-btn-primary ces-btn-sm">
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
              <Pagination
                page={invoiceData.page + 1}
                pageSize={invoiceData.size}
                totalPages={invoiceData.totalPages}
                totalElements={invoiceData.totalElements}
                onPage={(p) => setInvoicePage(p - 1)}
                onPageSize={(s) => { setInvoicePageSize(s); setInvoicePage(0) }}
              />
            </TableWrap>
          )}
        </div>
      )}

      {/* TRANSACTIONS TAB */}
      {activeTab === 'transactions' && (
        <div>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex gap-1 p-0.5"
              style={{ background: 'var(--ces-graphite-50)', border: '1px solid var(--ces-line)', borderRadius: '10px' }}>
              {[{ id: '', label: 'Hamısı' }, { id: 'INCOME', label: 'Gəlir' }, { id: 'EXPENSE', label: 'Xərc' }].map(f => {
                const on = txnFilter === f.id
                return (
                  <button key={f.id} onClick={() => setTxnFilter(f.id)}
                    className="py-1.5 px-3 text-[11.5px] font-semibold rounded-md transition-colors"
                    style={{ background: on ? 'var(--ces-surface)' : 'transparent', color: on ? 'var(--ces-graphite)' : 'var(--ces-muted)', boxShadow: on ? 'var(--ces-shadow-sm)' : 'none' }}>
                    {f.label}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-[420px]"
              style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '10px', padding: '0 12px', minHeight: '38px' }}>
              <Search size={14} style={{ color: 'var(--ces-mute2)' }} />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Açıqlama, kateqoriya, istinad..."
                className="flex-1 outline-none bg-transparent text-[13px]" />
            </div>
            <button onClick={exportTransactions} className="ces-btn ces-btn-outline ces-btn-sm">
              <Download size={13} /> Excel
            </button>
          </div>

          <TableWrap>
            <div className="overflow-x-auto">
              <table className="ces-tbl w-full min-w-[750px]">
                <thead>
                  <tr>
                    <th>Növ</th>
                    <th>Kateqoriya</th>
                    <th>Məbləğ</th>
                    <th>Tarix</th>
                    <th>Ödəniş</th>
                    <th>Açıqlama</th>
                    <th className="r w-act">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <TableSkeleton cols={7} rows={5} /> : filteredTransactions.length === 0 ? (
                    <EmptyState icon={ArrowUpRight} title="Əməliyyat tapılmadı" description="Yeni əməliyyat əlavə edin"
                      action={canCreate ? () => setTransactionModal({ open: true, editing: null, defaultType: txnFilter || 'INCOME' }) : undefined}
                      actionLabel="Yeni Əməliyyat" />
                  ) : filteredTransactions.map(t => (
                    <tr key={t.id}>
                      <td>
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold"
                          style={{ color: t.type === 'INCOME' ? 'var(--ces-ok)' : 'var(--ces-danger)' }}>
                          {t.type === 'INCOME' ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                          {t.type === 'INCOME' ? 'Gəlir' : 'Xərc'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--ces-ink)' }}>{CATEGORY_LABELS[t.category] || t.category || '—'}</td>
                      <td>
                        <span className="text-[14px] font-bold num"
                          style={{ color: t.type === 'INCOME' ? 'var(--ces-ok)' : 'var(--ces-danger)' }}>
                          {t.type === 'INCOME' ? '+' : '−'}{fmtMoney(t.amount)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap" style={{ color: 'var(--ces-muted)' }}>{fmtD(t.transactionDate)}</td>
                      <td style={{ color: 'var(--ces-muted)' }}>{METHOD_LABELS[t.paymentMethod] || t.paymentMethod || '—'}</td>
                      <td className="truncate max-w-[180px]" style={{ color: 'var(--ces-muted)' }}>{t.description || '—'}</td>
                      <td className="r">
                        <div className="flex items-center gap-0.5 justify-end">
                          {canEdit   && <button onClick={() => setTransactionModal({ open: true, editing: t })}    className="ces-row-act gold"   title="Redaktə"><Pencil size={13} /></button>}
                          {canDelete && <button onClick={() => handleDeleteTransaction(t)}                          className="ces-row-act danger" title="Sil"><Trash2 size={13} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredTransactions.length > 0 && (
              <div className="flex items-center justify-end gap-4 px-4 py-2.5 text-[12px]"
                style={{ borderTop: '1px solid var(--ces-line)', background: 'var(--ces-graphite-50)' }}>
                <span style={{ color: 'var(--ces-muted)' }}>{filteredTransactions.length} əməliyyat</span>
                <span className="font-semibold num" style={{ color: 'var(--ces-ok)' }}>
                  +{fmtMoney(filteredTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + parseFloat(t.amount || 0), 0))}
                </span>
                <span className="font-semibold num" style={{ color: 'var(--ces-danger)' }}>
                  −{fmtMoney(filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + parseFloat(t.amount || 0), 0))}
                </span>
              </div>
            )}
          </TableWrap>
        </div>
      )}

      {/* PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <div>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex gap-1 p-0.5"
              style={{ background: 'var(--ces-graphite-50)', border: '1px solid var(--ces-line)', borderRadius: '10px' }}>
              {[
                { id: '',          label: 'Hamısı' },
                { id: 'PENDING',   label: 'Gözləyir' },
                { id: 'COMPLETED', label: 'Tamamlanıb' },
                { id: 'OVERDUE',   label: 'Gecikib' },
              ].map(f => {
                const on = paymentFilter === f.id
                return (
                  <button key={f.id} onClick={() => setPaymentFilter(f.id)}
                    className="py-1.5 px-3 text-[11.5px] font-semibold rounded-md transition-colors"
                    style={{ background: on ? 'var(--ces-surface)' : 'transparent', color: on ? 'var(--ces-graphite)' : 'var(--ces-muted)', boxShadow: on ? 'var(--ces-shadow-sm)' : 'none' }}>
                    {f.label}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-[420px]"
              style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '10px', padding: '0 12px', minHeight: '38px' }}>
              <Search size={14} style={{ color: 'var(--ces-mute2)' }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Tərəf, açıqlama, istinad..."
                className="flex-1 outline-none bg-transparent text-[13px]" />
            </div>
          </div>

          <TableWrap>
            <div className="overflow-x-auto">
              <table className="ces-tbl w-full min-w-[820px]">
                <thead>
                  <tr>
                    <th>İstiqamət</th>
                    <th>Tərəf</th>
                    <th>Məbləğ</th>
                    <th>Tarix</th>
                    <th>Son tarix</th>
                    <th>Status</th>
                    <th>Üsul</th>
                    <th className="r w-act">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <TableSkeleton cols={8} rows={5} /> : filteredPayments.length === 0 ? (
                    <EmptyState icon={CreditCard} title="Ödəniş tapılmadı" description="Yeni ödəniş əlavə edin"
                      action={canCreate ? () => setPaymentModal({ open: true, editing: null }) : undefined}
                      actionLabel="Yeni Ödəniş" />
                  ) : filteredPayments.map(p => (
                    <tr key={p.id}>
                      <td>
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold"
                          style={{ color: p.direction === 'INCOMING' ? 'var(--ces-ok)' : 'var(--ces-danger)' }}>
                          {p.direction === 'INCOMING' ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                          {p.direction === 'INCOMING' ? 'Daxil' : 'Çıxan'}
                        </span>
                      </td>
                      <td className="truncate max-w-[140px]" style={{ color: 'var(--ces-ink)' }}>{p.partyName || '—'}</td>
                      <td>
                        <span className="text-[14px] font-bold num"
                          style={{ color: p.direction === 'INCOMING' ? 'var(--ces-ok)' : 'var(--ces-danger)' }}>
                          {p.direction === 'INCOMING' ? '+' : '−'}{fmtMoney(p.amount)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap" style={{ color: 'var(--ces-muted)' }}>{fmtD(p.paymentDate)}</td>
                      <td className="whitespace-nowrap" style={{ color: 'var(--ces-muted)' }}>{fmtD(p.dueDate)}</td>
                      <td><Pill tone={PAYMENT_STATUS_TONE[p.status] || 'muted'} sm dot>{PAYMENT_STATUS_LABEL[p.status] || p.status}</Pill></td>
                      <td style={{ color: 'var(--ces-muted)' }}>{METHOD_LABELS[p.paymentMethod] || '—'}</td>
                      <td className="r">
                        <div className="flex items-center gap-0.5 justify-end">
                          {canEdit   && <button onClick={() => setPaymentModal({ open: true, editing: p })} className="ces-row-act gold"   title="Redaktə"><Pencil size={13} /></button>}
                          {canDelete && <button onClick={() => handleDeletePayment(p)}                       className="ces-row-act danger" title="Sil"><Trash2 size={13} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredPayments.length > 0 && (
              <div className="flex items-center justify-end gap-4 px-4 py-2.5 text-[12px]"
                style={{ borderTop: '1px solid var(--ces-line)', background: 'var(--ces-graphite-50)' }}>
                <span style={{ color: 'var(--ces-muted)' }}>{filteredPayments.length} ödəniş</span>
                <span className="font-semibold num" style={{ color: 'var(--ces-ok)' }}>
                  Daxil: +{fmtMoney(filteredPayments.filter(p => p.direction === 'INCOMING').reduce((s, p) => s + parseFloat(p.amount || 0), 0))}
                </span>
                <span className="font-semibold num" style={{ color: 'var(--ces-danger)' }}>
                  Çıxan: −{fmtMoney(filteredPayments.filter(p => p.direction === 'OUTGOING').reduce((s, p) => s + parseFloat(p.amount || 0), 0))}
                </span>
              </div>
            )}
          </TableWrap>
        </div>
      )}

      {/* MODALS */}
      {invoiceModal.open && (
        <InvoiceModal
          editing={invoiceModal.editing}
          defaultType={invoiceModal.defaultType}
          preProject={invoiceModal.preProject}
          onClose={() => setInvoiceModal({ open: false, editing: null, defaultType: null, preProject: null })}
          onSaved={() => {
            setInvoiceModal({ open: false, editing: null, defaultType: null, preProject: null })
            setSearch('')
            setInvoicePage(0)
            loadAll(); loadInvoices()
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

      {/* Sahələri Doldur */}
      {fieldsModal.open && fieldsModal.inv && (
        <ModalShell
          icon={PenLine}
          eyebrow="Sahələr"
          title="Sahələri doldur"
          subtitle={<>
            {fieldsModal.inv.projectCode && <span className="font-mono" style={{ color: 'var(--ces-ok)' }}>{fieldsModal.inv.projectCode} · </span>}
            {fieldsModal.inv.companyName || '—'}
            {fieldsModal.inv.periodMonth && fieldsModal.inv.periodYear && (
              <span style={{ color: 'var(--ces-gold-700)' }}> · {fmtPeriod(fieldsModal.inv.periodYear, fieldsModal.inv.periodMonth)}</span>
            )}
          </>}
          onClose={() => setFieldsModal(s => ({ ...s, open: false }))}
          maxWidth="440px"
          footer={
            <>
              <button onClick={() => setFieldsModal(s => ({ ...s, open: false }))} className="ces-btn ces-btn-ghost ces-btn-sm">Ləğv et</button>
              <button
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
                disabled={fieldsModal.saving}
                className="ces-btn ces-btn-primary"
              >
                {fieldsModal.saving ? 'Saxlanır...' : 'Saxla'}
              </button>
            </>
          }
        >
          <div className="p-6 space-y-4">
            <Field label={<>Əsl qaimə № <span style={{ color: 'var(--ces-mute2)' }}>(könüllü)</span></>}>
              <Input value={fieldsModal.form.invoiceNumber}
                onChange={(e) => setFieldsModal(s => ({ ...s, form: { ...s.form, invoiceNumber: e.target.value } }))}
                placeholder="MT20250419..." mono autoFocus />
            </Field>
            <Field label="Tarix">
              <div className="flex items-center px-[13px]"
                style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '11px', minHeight: '44px' }}>
                <DateInput
                  value={fieldsModal.form.invoiceDate}
                  onChange={(e) => setFieldsModal(s => ({ ...s, form: { ...s.form, invoiceDate: e.target.value } }))}
                  className="flex-1 border-0 outline-0 bg-transparent text-[14px] py-[11px] w-full"
                />
              </div>
            </Field>
            <Field label="Qeydlər">
              <Textarea value={fieldsModal.form.notes}
                onChange={(e) => setFieldsModal(s => ({ ...s, form: { ...s.form, notes: e.target.value } }))}
                rows={2} placeholder="Əlavə qeyd..." />
            </Field>
          </div>
        </ModalShell>
      )}

      {printInv && <InvoicePrintModal inv={printInv} onClose={() => setPrintInv(null)} />}

      {docCreateModal && (
        <DocumentCreateModal
          onClose={() => setDocCreateModal(false)}
          onCreated={() => { setDocCreateModal(false); setDocRefreshKey(k => k + 1) }}
        />
      )}

      {/* Daimi Ödəniş Modal */}
      {recurringModal.open && (
        <RecurringExpenseModal
          editing={recurringModal.editing}
          onClose={() => setRecurringModal({ open: false, editing: null })}
          onSaved={() => { setRecurringModal({ open: false, editing: null }); loadRecurring() }}
        />
      )}

      {/* Qaimə Yarat (recurring-dən) */}
      {generateModal.open && generateModal.rec && (
        <ModalShell
          icon={Receipt}
          eyebrow="Yeni qeyd"
          title="Qaimə Yarat"
          subtitle={<>
            {generateModal.rec.categoryLabel} · <span className="font-semibold" style={{ color: 'var(--ces-ink)' }}>{generateModal.rec.sourceLabel}</span>
            <div className="text-[11px] mt-0.5">{generateModal.rec.name}</div>
          </>}
          onClose={() => setGenerateModal({ open: false, rec: null })}
          maxWidth="440px"
          footer={
            <>
              <button onClick={() => setGenerateModal({ open: false, rec: null })} className="ces-btn ces-btn-ghost ces-btn-sm">Ləğv et</button>
              <button
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
                    loadAll(); loadInvoices()
                  } catch (err) {
                    toast.error(err?.response?.data?.message || 'Xəta baş verdi')
                  } finally { setGenerateSaving(false) }
                }}
                disabled={generateSaving}
                className="ces-btn"
                style={{ background: 'var(--ces-danger)', color: '#fff' }}
              >
                {generateSaving && (
                  <span className="w-3.5 h-3.5 rounded-full animate-spin"
                    style={{ border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'var(--ces-on-primary)' }} />
                )}
                Qaimə Yarat
              </button>
            </>
          }
        >
          <div className="p-6 space-y-4">
            <Field label="Tarix" required>
              <div className="flex items-center px-[13px]"
                style={{ background: 'var(--ces-surface)', border: '1px solid var(--ces-line)', borderRadius: '11px', minHeight: '44px' }}>
                <DateInput
                  value={generateForm.invoiceDate}
                  onChange={(e) => setGenerateForm(f => ({ ...f, invoiceDate: e.target.value }))}
                  className="flex-1 border-0 outline-0 bg-transparent text-[14px] py-[11px] w-full"
                />
              </div>
            </Field>
            <Field
              label="Məbləğ"
              required={generateModal.rec.variableAmount}
              hint={!generateModal.rec.variableAmount ? 'Dəyişdirə bilərsiniz' : undefined}
            >
              <Input type="number" min="0.01" step="0.01"
                value={generateForm.amountOverride}
                onChange={(e) => setGenerateForm(f => ({ ...f, amountOverride: e.target.value }))}
                placeholder="0.00" suffix="₼" />
            </Field>
          </div>
        </ModalShell>
      )}
    </div>
  )
}

