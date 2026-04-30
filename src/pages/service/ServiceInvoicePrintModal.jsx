import { X, Printer, CheckCircle } from 'lucide-react'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { clsx } from 'clsx'
import cesLogoUrl from '../../assets/filelogo.png'

const fmt = (d) => d ? new Date(d).toLocaleDateString('az-AZ') : '—'
const fmtMoney = (v) => v != null
  ? parseFloat(v).toLocaleString('az-AZ', { minimumFractionDigits: 2 }) + ' ₼'
  : '—'

export default function ServiceInvoicePrintModal({ record, onClose }) {
  useEscapeKey(onClose)

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=700')
    const checkedCount = record.checklistItems?.filter(i => i.checked).length || 0
    const totalCount   = record.checklistItems?.length || 0

    const checklistRows = (record.checklistItems || []).map(item => `
      <tr>
        <td style="padding:6px 12px; border-bottom:1px solid #e5e7eb; font-size:12px; color:#111827; ${item.checked ? 'text-decoration:line-through; color:#6b7280;' : ''}">
          ${item.itemName}
        </td>
        <td style="padding:6px 12px; border-bottom:1px solid #e5e7eb; text-align:center; font-size:12px;">
          ${item.checked
            ? '<span style="font-weight:bold; color:#111827;">&#10003; Yoxlandı</span>'
            : '<span style="color:#9ca3af;">—</span>'}
        </td>
        <td style="padding:6px 12px; border-bottom:1px solid #e5e7eb; font-size:11px; color:#374151; font-style:italic;">
          ${item.note || ''}
        </td>
      </tr>
    `).join('')

    const statusLabel = {
      AVAILABLE:     'Mövcud',
      UNDER_CHECK:   'Yoxlanılır',
      DEFECTIVE:     'Nasaz',
      IN_REPAIR:     'Təmirdə',
      IN_INSPECTION: 'Müayinədə',
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="az">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>Servis Qaiməsi — ${record.equipmentName}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Noto Sans', 'Arial Unicode MS', Arial, sans-serif;
            color: #111827;
            background: #fff;
            padding: 32px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            border-bottom: 2px solid #111827;
            padding-bottom: 14px;
          }
          .logo-img { height: 46px; display: block; }
          .company-sub { font-size: 10px; color: #6b7280; margin-top: 3px; }
          .doc-title { text-align: right; }
          .doc-title h1 { font-size: 16px; font-weight: 700; color: #111827; }
          .doc-title .doc-no { font-size: 11px; color: #374151; margin-top: 4px; }
          .section { margin-bottom: 20px; }
          .section-title {
            font-size: 10px;
            font-weight: 700;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            margin-bottom: 8px;
            border-bottom: 1px solid #374151;
            padding-bottom: 4px;
          }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .info-item label { font-size: 10px; color: #6b7280; display: block; margin-bottom: 2px; }
          .info-item span { font-size: 13px; font-weight: 600; color: #111827; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          thead tr { background: #f3f4f6; }
          th {
            padding: 8px 12px;
            text-align: left;
            font-size: 10px;
            font-weight: 700;
            color: #374151;
            text-transform: uppercase;
            border-bottom: 2px solid #374151;
          }
          .cost-box {
            border: 2px solid #374151;
            border-radius: 6px;
            padding: 14px 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 20px;
          }
          .cost-label { font-size: 13px; font-weight: 700; color: #111827; }
          .cost-amount { font-size: 22px; font-weight: 700; color: #111827; }
          .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            border: 1px solid #374151;
            color: #111827;
            background: #f9fafb;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #374151;
          }
          .sig-line {
            border-bottom: 1px solid #374151;
            padding-bottom: 4px;
            margin-bottom: 4px;
            height: 30px;
          }
          .sig-label { font-size: 10px; color: #6b7280; }
          .footer {
            margin-top: 28px;
            padding-top: 12px;
            border-top: 1px dashed #d1d5db;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
          }
          .progress { font-size: 11px; color: #374151; margin-top: 4px; }
          @media print {
            body { padding: 16px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <img src="${cesLogoUrl}" alt="CES Logo" class="logo-img" />
            <div class="company-sub">Construction Equipment Service LLC</div>
          </div>
          <div class="doc-title">
            <h1>Servis Qaiməsi</h1>
            <div class="doc-no">&#8470; SRV-${String(record.id).padStart(5, '0')} &nbsp;|&nbsp; ${fmt(record.serviceDate)}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Texnika Məlumatları</div>
          <div class="info-grid">
            <div class="info-item">
              <label>Texnika adı</label>
              <span>${record.equipmentName || '—'}</span>
            </div>
            <div class="info-item">
              <label>Qeydiyyat nişanı</label>
              <span>${record.plateNumber || '—'}</span>
            </div>
            <div class="info-item">
              <label>Servis növü</label>
              <span>${record.serviceType || '—'}</span>
            </div>
            <div class="info-item">
              <label>Motosaat</label>
              <span>${record.odometer ? record.odometer.toLocaleString() + ' saat' : '—'}</span>
            </div>
            <div class="info-item">
              <label>Status (əvvəl)</label>
              <span class="status-badge">${statusLabel[record.statusBefore] || record.statusBefore || '—'}</span>
            </div>
            <div class="info-item">
              <label>Status (sonra)</label>
              <span class="status-badge">${statusLabel[record.statusAfter] || record.statusAfter || '—'}</span>
            </div>
            ${record.notes ? `
            <div class="info-item" style="grid-column:1/-1;">
              <label>Qeydlər</label>
              <span style="font-weight:400; color:#374151;">${record.notes}</span>
            </div>` : ''}
          </div>
        </div>

        ${totalCount > 0 ? `
        <div class="section">
          <div class="section-title">
            Yoxlama Vərəqəsi
            <span class="progress">&nbsp;(${checkedCount}/${totalCount} tamamlandı)</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Maddə</th>
                <th style="text-align:center; width:110px;">Nəticə</th>
                <th style="width:200px;">Qeyd</th>
              </tr>
            </thead>
            <tbody>
              ${checklistRows}
            </tbody>
          </table>
        </div>` : ''}

        <div class="cost-box">
          <div class="cost-label">Ümumi Servis Xərci</div>
          <div class="cost-amount">${fmtMoney(record.cost)}</div>
        </div>

        <div class="signatures">
          <div>
            <div class="sig-line"></div>
            <div class="sig-label">Servis icraçısı / imza</div>
          </div>
          <div>
            <div class="sig-line"></div>
            <div class="sig-label">Texnika məsulu / imza</div>
          </div>
        </div>

        <div class="footer">
          Bu qaimə CES ERP sistemi tərəfindən yaradılıb &nbsp;|&nbsp; ${new Date().toLocaleString('az-AZ')}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const checkedCount = record.checklistItems?.filter(i => i.checked).length || 0
  const totalCount   = record.checklistItems?.length || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Printer size={16} className="text-amber-500" />
            Servis Qaiməsi
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Texnika info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{record.equipmentName}</p>
                {record.plateNumber && <p className="text-[10px] text-gray-400">{record.plateNumber}</p>}
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-1">{record.serviceType}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400">Tarix</p>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{fmt(record.serviceDate)}</p>
              </div>
            </div>
          </div>

          {/* Xərc */}
          {record.cost != null && (
            <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Servis Xərci</span>
              <span className="text-base font-bold text-gray-800 dark:text-gray-100">−{fmtMoney(record.cost)}</span>
            </div>
          )}

          {/* Checklist xülasəsi */}
          {totalCount > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Yoxlama vərəqəsi ({checkedCount}/{totalCount})
              </p>
              <div className="space-y-1">
                {record.checklistItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2.5 py-1">
                    <div className={clsx(
                      "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                      item.checked ? "bg-gray-700 border-gray-700" : "border-gray-300 dark:border-gray-600"
                    )}>
                      {item.checked && <CheckCircle size={10} className="text-white" />}
                    </div>
                    <span className={clsx(
                      "text-xs",
                      item.checked ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-200"
                    )}>
                      {item.itemName}
                    </span>
                    {item.note && <span className="text-[10px] text-gray-400 italic ml-auto">{item.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            Bağla
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Printer size={14} />
            Çap et
          </button>
        </div>
      </div>
    </div>
  )
}
