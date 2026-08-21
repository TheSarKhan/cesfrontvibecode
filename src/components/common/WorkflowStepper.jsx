import React from 'react'
import { CheckCircle2, Clock, FileText, UserCheck, Truck, ShieldCheck, Check, AlertCircle, XCircle } from 'lucide-react'

const STAGES = [
  { id: 'request', label: 'Sorğu', icon: FileText, statuses: ['DRAFT', 'PENDING'] },
  { id: 'pm_shortlist', label: 'PM Shortlist', icon: UserCheck, statuses: ['PM_REVIEW', 'PM_SHORTLIST_READY'] },
  { id: 'coordinator', label: 'Koordinator Planı', icon: Clock, statuses: ['COORDINATOR_NEGOTIATING', 'COORDINATOR_PROPOSED'] },
  { id: 'accounting', label: 'Mühasibatlıq', icon: ShieldCheck, statuses: ['PM_PRICE_NEGOTIATION', 'PM_APPROVED', 'ACCOUNTING_DOCS_CHECK'] },
  { id: 'dispatch', label: 'Operator & Yola Salma', icon: Truck, statuses: ['EXECUTION_READY', 'OPERATOR_ASSIGNED', 'EQUIPMENT_DISPATCHED'] },
  { id: 'active', label: 'Təhvil & Layihə', icon: CheckCircle2, statuses: ['DELIVERED', 'ACTIVE', 'COMPLETED'] },
]

function getStageIndex(status) {
  if (!status) return 0
  if (status === 'REJECTED') return -1
  for (let i = 0; i < STAGES.length; i++) {
    if (STAGES[i].statuses.includes(status)) return i
  }
  return 0
}

function getActionOwner(status) {
  switch (status) {
    case 'DRAFT':
    case 'PENDING':
      return { role: 'Satış / PM', label: 'Sorğu təsdiqi və PM-ə yönləndirmə gözlənilir', badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20' }
    case 'PM_REVIEW':
    case 'PM_SHORTLIST_READY':
      return { role: 'Layihə Meneceri', label: 'Shortlist tərtib edilməsi və Koordinatora göndərilməsi gözlənilir', badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20' }
    case 'COORDINATOR_NEGOTIATING':
      return { role: 'Koordinator', label: 'Texnika seçimi, qiymət planlaşdırması və təklif gözlənilir', badgeClass: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' }
    case 'COORDINATOR_PROPOSED':
    case 'PM_PRICE_NEGOTIATION':
      return { role: 'Layihə Meneceri', label: 'Müştəri ilə qiymət razılaşması və təsdiq gözlənilir', badgeClass: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' }
    case 'PM_APPROVED':
    case 'ACCOUNTING_DOCS_CHECK':
      return { role: 'Mühasibatlıq', label: 'Müqavilə və Qiymət Razılaşma Protokolunun yoxlanması gözlənilir', badgeClass: 'bg-purple-500/10 text-purple-500 border-purple-500/20' }
    case 'EXECUTION_READY':
    case 'OPERATOR_ASSIGNED':
      return { role: 'Koordinator', label: 'Operator təyini, sənəd yoxlanışı və yola salma (dispatch) gözlənilir', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
    case 'EQUIPMENT_DISPATCHED':
      return { role: 'Koordinator', label: 'Sahədə təhvil-təslim aktının təsdiqi (deliver) gözlənilir', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
    case 'DELIVERED':
    case 'ACTIVE':
      return { role: 'Aktiv Layihə', label: 'Texnika sahədə icradadır', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
    case 'COMPLETED':
      return { role: 'Tamamlandı', label: 'Layihə və hesablaşmalar başa çatdı', badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20' }
    case 'REJECTED':
      return { role: 'Rədd Edilib', label: 'Sorğu prosesdən çıxarılıb', badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20' }
    default:
      return { role: 'İcrada', label: status, badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20' }
  }
}

export default function WorkflowStepper({ status, className = '' }) {
  const currentIndex = getStageIndex(status)
  const isRejected = status === 'REJECTED'
  const actionOwner = getActionOwner(status)

  return (
    <div className={`p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm ${className}`}>
      {/* Üst Məsul Şəxs Kartı */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">İş Axını Mərhələsi:</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium border flex items-center gap-1.5 ${actionOwner.badgeClass}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {actionOwner.role}
          </span>
        </div>
        <div className="text-xs text-slate-400 italic">
          {actionOwner.label}
        </div>
      </div>

      {/* Rədd edilmiş sorğu banneri */}
      {isRejected ? (
        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <span>Bu sorğu rədd edilib və icra prosesindən çıxarılıb.</span>
        </div>
      ) : (
        /* Stepper Xətti */
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 relative">
          {STAGES.map((stage, idx) => {
            const isCompleted = currentIndex > idx
            const isCurrent = currentIndex === idx
            const isPending = currentIndex < idx
            const Icon = stage.icon

            let circleClass = 'bg-slate-800 text-slate-500 border-slate-700'
            let textClass = 'text-slate-500'
            let barColor = 'bg-slate-800'

            if (isCompleted) {
              circleClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
              textClass = 'text-emerald-300 font-medium'
              barColor = 'bg-emerald-500'
            } else if (isCurrent) {
              circleClass = 'bg-blue-500/20 text-blue-400 border-blue-500 shadow-md shadow-blue-500/20 ring-2 ring-blue-500/20'
              textClass = 'text-blue-300 font-semibold'
              barColor = 'bg-blue-500/50'
            }

            return (
              <div key={stage.id} className="flex flex-col items-center text-center relative group">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-200 ${circleClass}`}>
                  {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className={`text-[11px] mt-1.5 transition-colors line-clamp-1 ${textClass}`}>
                  {stage.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
