import { X, Printer } from 'lucide-react'

const TYPE_LABEL = {
  INCOME:             'A — Gəlir Qaiməsi',
  CONTRACTOR_EXPENSE: 'B1 — Podratçı Qaiməsi',
  COMPANY_EXPENSE:    'B2 — Şirkət Xərci',
}

const fmt = (d) => d ? new Date(d).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
const fmtMoney = (v) => v != null
  ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼'
  : '—'

export default function InvoicePrintModal({ inv, onClose }) {
  const handlePrint = () => window.print()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm print:hidden-overlay">
      {/* Print stylesheet injected via style tag */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #invoice-print-root { display: block !important; position: fixed; inset: 0; background: white; z-index: 9999; padding: 32px; }
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
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Qaimə Çapı</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="border border-gray-200 rounded-xl p-6 bg-white text-gray-800 text-sm space-y-4">
            <PrintContent inv={inv} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            Bağla
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Printer size={15} />
            Çap et / PDF saxla
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <tr>
      <td style={{ padding: '6px 12px 6px 0', color: '#6b7280', fontSize: '12px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{label}</td>
      <td style={{ padding: '6px 0', fontSize: '13px', fontWeight: 500 }}>{value}</td>
    </tr>
  )
}

function PrintContent({ inv }) {
  const typeLabel = TYPE_LABEL[inv.type] || inv.type
  const isIncome = inv.type === 'INCOME'
  const isB1     = inv.type === 'CONTRACTOR_EXPENSE'

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#111827' }}>
      {/* Company header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#d97706' }}>CES MMC</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Construction Equipment Services</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{typeLabel}</div>
          {inv.invoiceNumber && (
            <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#374151', marginTop: 2 }}>{inv.invoiceNumber}</div>
          )}
        </div>
      </div>

      <hr style={{ borderColor: '#e5e7eb', marginBottom: 20 }} />

      {/* Details table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <Row label="Tarix"         value={fmt(inv.invoiceDate)} />
          <Row label="Məbləğ"        value={<strong style={{ fontSize: 16 }}>{fmtMoney(inv.amount)}</strong>} />
          {isIncome && <Row label="ETaxes ID"    value={inv.etaxesId} />}
          {isIncome && <Row label="Müştəri"      value={inv.companyName} />}
          {isB1     && <Row label="Podratçı"     value={inv.contractorName || inv.companyName} />}
          {!isIncome && !isB1 && <Row label="Xidmət şirkəti" value={inv.companyName} />}
          <Row label="Texnika"       value={inv.equipmentName} />
          <Row label="Xidmət növü"  value={inv.serviceDescription} />
          <Row label="Layihə"        value={inv.projectCode ? `${inv.projectCode}${inv.projectCompanyName ? ` · ${inv.projectCompanyName}` : ''}` : null} />
          {inv.projectNetProfit != null && isIncome && (
            <Row label="Layihə xalis gəlir" value={fmtMoney(inv.projectNetProfit)} />
          )}
          <Row label="Qeydlər"      value={inv.notes} />
        </tbody>
      </table>

      <hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />

      <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
        Bu sənəd CES ERP sistemi tərəfindən yaradılmışdır · {fmt(new Date().toISOString())}
      </div>
    </div>
  )
}
