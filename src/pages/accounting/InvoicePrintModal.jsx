import { X, Printer } from 'lucide-react'
import cesLogo from '../../assets/filelogo.png'

/* ── Update these with real company bank details ─────────────────────────── */
const BANK_DETAILS = {
  bankName:      'International Bank of Azerbaijan (IBA)',
  accountNo:     '________________',
  swift:         'IBAZAZ2X',
  voen:          '________________',
  iban:          'AZ__ IBAZ ____ ____ ____ ____ ____',
  correspondent: '________________',
}

const TYPE_LABEL = {
  INCOME:             'Income Invoice',
  CONTRACTOR_EXPENSE: 'Payment Invoice',
  COMPANY_EXPENSE:    'Expense Invoice',
}

const fmt = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '—'
const fmtMoney = (v) => v != null
  ? parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' AZN'
  : '—'

export default function InvoicePrintModal({ inv, onClose }) {
  const handlePrint = () => window.print()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&display=swap');
        @media print {
          body > * { display: none !important; }
          #invoice-print-root {
            display: block !important;
            position: fixed;
            inset: 0;
            background: white;
            z-index: 9999;
            padding: 36px 40px;
            font-family: 'Noto Sans', 'Arial Unicode MS', Arial, sans-serif;
            color: #111827;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        #invoice-print-root { display: none; }
      `}</style>

      {/* Print-only full-page content */}
      <div id="invoice-print-root">
        <PrintContent inv={inv} />
      </div>

      {/* Screen modal */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Invoice Print</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="border border-gray-200 rounded-xl p-6 bg-white text-gray-800 text-sm">
            <PrintContent inv={inv} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            Bağla
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-lg transition-colors">
            <Printer size={15} />
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Shared row components ─────────────────────────────────────────────────── */
function Row({ label, value }) {
  if (value == null || value === '' || value === false) return null
  return (
    <tr>
      <td style={{ padding: '6px 20px 6px 0', fontSize: '11px', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', verticalAlign: 'top', width: '38%' }}>
        {label}
      </td>
      <td style={{ padding: '6px 0', fontSize: '12px', color: '#111827', borderBottom: '1px solid #f3f4f6' }}>
        {value}
      </td>
    </tr>
  )
}

function BankRow({ label, value }) {
  if (!value) return null
  return (
    <tr>
      <td style={{ padding: '4px 16px 4px 0', fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap', width: '38%' }}>{label}</td>
      <td style={{ padding: '4px 0', fontSize: '11px', fontWeight: 500, color: '#111827' }}>{value}</td>
    </tr>
  )
}

/* ── The actual printed content ───────────────────────────────────────────── */
function PrintContent({ inv }) {
  const typeLabel = TYPE_LABEL[inv.type] || inv.type
  const isIncome  = inv.type === 'INCOME'
  const isB1      = inv.type === 'CONTRACTOR_EXPENSE'

  return (
    <div style={{ fontFamily: "'Noto Sans', 'Arial Unicode MS', Arial, sans-serif", color: '#111827' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <img src={cesLogo} alt="CES Logo" style={{ height: 46, display: 'block' }} />
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3 }}>
            Construction Equipment Services LLC
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {typeLabel}
          </div>
          {inv.invoiceNumber && (
            <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#374151', marginTop: 4 }}>
              No.&nbsp;{inv.invoiceNumber}
            </div>
          )}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '2px solid #111827', margin: '0 0 18px' }} />

      {/* ── Invoice details ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <tbody>
          <Row label="Date"               value={fmt(inv.invoiceDate)} />
          <Row label="Amount"             value={<strong style={{ fontSize: 15 }}>{fmtMoney(inv.amount)}</strong>} />
          {isIncome && <Row label="E-Tax ID"          value={inv.etaxesId} />}
          {isIncome && <Row label="Customer"          value={inv.companyName} />}
          {isB1     && <Row label="Contractor"        value={inv.contractorName || inv.companyName} />}
          {!isIncome && !isB1 && <Row label="Service Company"  value={inv.companyName} />}
          <Row label="Equipment"          value={inv.equipmentName} />
          <Row label="Service Type"       value={inv.serviceDescription} />
          <Row label="Project"            value={inv.projectCode
            ? `${inv.projectCode}${inv.projectCompanyName ? ` · ${inv.projectCompanyName}` : ''}`
            : null}
          />
          {inv.projectNetProfit != null && isIncome && (
            <Row label="Project Net Profit" value={fmtMoney(inv.projectNetProfit)} />
          )}
          <Row label="Notes"              value={inv.notes} />
        </tbody>
      </table>

      {/* ── Bank Details ── */}
      <div style={{ borderTop: '1px solid #374151', paddingTop: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
          Bank Details
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <BankRow label="Bank Name"       value={BANK_DETAILS.bankName} />
            <BankRow label="Account No."     value={BANK_DETAILS.accountNo} />
            <BankRow label="SWIFT / BIC"     value={BANK_DETAILS.swift} />
            <BankRow label="TIN / VÖEN"      value={BANK_DETAILS.voen} />
            <BankRow label="IBAN"            value={BANK_DETAILS.iban} />
            <BankRow label="Correspondent"   value={BANK_DETAILS.correspondent} />
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <hr style={{ border: 'none', borderTop: '1px dashed #d1d5db', margin: '20px 0 8px' }} />
      <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>
        This document was generated by CES ERP System &nbsp;·&nbsp; {fmt(new Date().toISOString())}
      </div>
    </div>
  )
}
