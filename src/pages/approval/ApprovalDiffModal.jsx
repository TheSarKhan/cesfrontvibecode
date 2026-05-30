import { useState, useEffect } from 'react'
import { X, Check, XCircle, Trash2, Pencil } from 'lucide-react'
import { approvalApi } from '../../api/approval'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useEnumStore } from '../../store/enumStore'
import { enumLabel } from '../../utils/enumLabel'

const FIELD_LABELS = {
  createdAt: 'Yaradılma tarixi', updatedAt: 'Yenilənmə tarixi',
  companyName: 'Şirkət adı', voen: 'VÖEN', contactPerson: 'Əlaqə şəxsi',
  contactPhone: 'Əlaqə telefonu',
  phone: 'Telefon', address: 'Ünvan', notes: 'Qeydlər',
  status: 'Status', riskLevel: 'Risk səviyyəsi', rating: 'Reytinq',
  paymentType: 'Ödəniş növü', paymentTypes: 'Ödəniş növləri', email: 'E-poçt',
  investmentAmount: 'İnvestisiya məbləği', sharePercent: 'Pay faizi',
  firstName: 'Ad', lastName: 'Soyad', fullName: 'Tam ad',
  specialization: 'İxtisas', busy: 'Məşğul',
  documentsComplete: 'Sənədlər tamdır', uploadedDocumentTypes: 'Yüklənmiş sənəd növləri',
  directorName: 'Direktor',
  supplierPerson: 'Təchizatçı şəxs', supplierPhone: 'Təchizatçı telefonu',
  officeContactPerson: 'Ofis əlaqə şəxsi', officeContactPhone: 'Ofis telefonu',
  equipmentCode: 'Texnika kodu', name: 'Adı', type: 'Növ', brand: 'Marka', model: 'Model',
  serialNumber: 'Seriya nömrəsi', plateNumber: 'Qeydiyyat nişanı',
  yearOfManufacture: 'İstehsal ili', manufactureYear: 'İstehsal ili',
  ownershipType: 'Mülkiyyət növü',
  dailyRate: 'Günlük tarif', monthlyRate: 'Aylıq tarif',
  purchaseDate: 'Alış tarixi', purchasePrice: 'Alış qiyməti',
  currentMarketValue: 'Cari bazar dəyəri', depreciationRate: 'Amortizasiya faizi (%)',
  hourKmCounter: 'Saat/Km sayğacı', motoHours: 'Moto saatlar',
  weightTon: 'Çəki (ton)', storageLocation: 'Saxlanma yeri',
  responsibleUserName: 'Məsul şəxs',
  ownerContractorName: 'Sahibi (podratçı)', ownerContractorVoen: 'Sahibi VÖEN',
  ownerContractorPhone: 'Sahibi telefon', ownerContractorContact: 'Sahibi əlaqə şəxsi',
  ownerInvestorName: 'Sahibi (investor)', ownerInvestorVoen: 'Sahibi VÖEN',
  ownerInvestorPhone: 'Sahibi telefon',
  lastInspectionDate: 'Son texniki baxış', nextInspectionDate: 'Növbəti texniki baxış',
  technicalReadinessStatus: 'Texniki hazırlıq', repairStatus: 'Təmir statusu',
  safetyEquipment: 'Təhlükəsizlik avadanlığı',
  equipmentPrice: 'Texnika qiyməti', transportationPrice: 'Nəqliyyat qiyməti',
  operatorPayment: 'Operator haqqı', contractorDailyRate: 'Podratçı/İnvestor günlük', contractorPayment: 'Podratçı/İnvestor cəmi',
  dayCount: 'Gün sayı', startDate: 'Başlanğıc tarixi', endDate: 'Bitmə tarixi',
  operatorName: 'Operator', selectedEquipmentCode: 'Seçilmiş texnika',
  selectedEquipmentName: 'Seçilmiş texnika adı',
  invoiceNumber: 'Faktura nömrəsi', amount: 'Məbləğ', invoiceDate: 'Faktura tarixi',
  equipmentName: 'Texnika adı', serviceDescription: 'Xidmət təsviri',
  etaxesId: 'ETaxes ID', invoiceType: 'Faktura növü',
  projectCode: 'Layihə kodu', contractorName: 'Podratçı',
  requestCode: 'Sorğu kodu', requestType: 'Sorğu növü', projectType: 'Layihə növü',
  location: 'Yer', description: 'Təsvir', requestDate: 'Sorğu tarixi',
  createdByName: 'Yaradan',

  // Sorğu / Koordinator / Layihə (PM)
  projectName: 'Layihə adı', region: 'Region',
  transportationRequired: 'Nəqliyyat tələb olunur',
  requestStatus: 'Sorğu statusu',
  agreedEquipmentPrice: 'Razılaşdırılmış texnika qiyməti',
  agreedTransportPrice: 'Razılaşdırılmış nəqliyyat qiyməti',
  agreedTotalPrice: 'Razılaşdırılmış ümumi qiymət',
  customerOfficeContact: 'Ofis əlaqə şəxsi', customerOfficePhone: 'Ofis telefonu',
  agreementNote: 'Razılaşma qeydi',
  shortlistNotes: 'Qısa siyahı qeydi', shortlistItems: 'Qısa siyahı (namizədlər)',
  coordinatorOffer: 'Koordinator təklifi',
  contractUploaded: 'Müqavilə yükləndi', priceProtocolUploaded: 'Qiymət protokolu yükləndi',
  customerVoen: 'Müştəri VÖEN', customerAddress: 'Müştəri ünvanı',
  customerName: 'Müştəri',
  customerSupplierPerson: 'Müştəri təchizatçı şəxs', customerSupplierPhone: 'Müştəri təchizatçı telefonu',
  customerOfficeContactPerson: 'Müştəri ofis əlaqə şəxsi', customerOfficeContactPhone: 'Müştəri ofis telefonu',
  equipmentDocumentTypes: 'Texnika sənəd növləri',
  hasPendingSubmit: 'Təsdiq gözləyən təqdimat var',
  customerEquipmentPrice: 'Müştəri texnika qiyməti',
  transportContractorName: 'Nəqliyyat podratçısı',
  totalAmount: 'Ümumi məbləğ', companyProfit: 'Şirkət mənfəəti',
  planCreatedAt: 'Plan yaradılma tarixi',
  equipmentDocsVerified: 'Texnika sənədləri təsdiqlənib', equipmentDocsCheckedAt: 'Sənəd yoxlama tarixi',
  dispatchedAt: 'Göndərilmə tarixi', deliveredAt: 'Çatdırılma tarixi', deliveryNotes: 'Çatdırılma qeydi',
  winnerPartyType: 'Qalib tərəf növü', winnerPartyName: 'Qalib tərəf',
  winnerEquipmentName: 'Qalib texnika adı', winnerEquipmentCode: 'Qalib texnika kodu',

  // Qısa siyahı sətri (namizəd)
  partyType: 'Tərəf növü',
  contractorVoen: 'Podratçı VÖEN', contractorPhone: 'Podratçı telefonu',
  contractorContactPerson: 'Podratçı əlaqə şəxsi', contractorAddress: 'Podratçı ünvanı',
  investorName: 'İnvestor', investorVoen: 'İnvestor VÖEN', investorPhone: 'İnvestor telefonu',
  investorContactPerson: 'İnvestor əlaqə şəxsi', investorAddress: 'İnvestor ünvanı',
  equipmentType: 'Texnika növü', equipmentBrand: 'Texnika markası',
  equipmentModel: 'Texnika modeli', equipmentYear: 'Texnika ili',
  equipmentPlateNumber: 'Qeydiyyat nişanı', equipmentOwnership: 'Mülkiyyət növü',
  negotiatedPrice: 'Razılaşdırılmış qiymət', rank: 'Sıra',

  // Sənədlər / fayllar (iç-içə)
  documentName: 'Sənəd adı', documentType: 'Sənəd növü', documentDate: 'Sənəd tarixi',
  fileName: 'Fayl adı', fileType: 'Fayl növü',
  uploadedByUserName: 'Yükləyən', uploadedByName: 'Yükləyən', uploadedAt: 'Yükləmə tarixi',

  // Mühasibatlıq (faktura)
  typeLabel: 'Faktura növü',
  paidAmount: 'Ödənilmiş məbləğ', remainingAmount: 'Qalıq məbləğ',
  aktFileName: 'Akt faylı', aktFileUploaded: 'Akt yükləndi',
  projectCompanyName: 'Layihə şirkəti', projectNetProfit: 'Layihə xalis mənfəəti',
  periodMonth: 'Dövr (ay)', periodYear: 'Dövr (il)',
  standardDays: 'Standart günlər', extraDays: 'Əlavə günlər', extraHours: 'Əlavə saatlar',
  workingDaysInMonth: 'Aydakı iş günləri', workingHoursPerDay: 'Gündəlik iş saatı',
  overtimeRate: 'Əlavə iş tarifi',
  hasTransport: 'Nəqliyyat var', totalTransportAmount: 'Ümumi nəqliyyat məbləği',
  transports: 'Nəqliyyatlar', transportDate: 'Nəqliyyat tarixi',
  transportDirection: 'Nəqliyyat istiqaməti', transportAmount: 'Nəqliyyat məbləği',

  // İstifadəçi / Rol / Şöbə
  active: 'Aktiv', hasApproval: 'Təsdiq səlahiyyəti',
  departmentName: 'Şöbə', roleName: 'Rol', roleNames: 'Rollar',
  superAdmin: 'Tam giriş (Super Admin)', lastLoginAt: 'Son giriş',
  permissions: 'İcazələr', approvalDepartments: 'Təsdiq şöbələri',
  moduleCode: 'Modul kodu', moduleName: 'Modul', moduleNameAz: 'Modul',
  canGet: 'Oxumaq', canPost: 'Yazmaq', canPut: 'Redaktə', canDelete: 'Silmək',
}

const FIELD_EXCLUDE = new Set([
  'id', 'deleted', 'deletedAt', 'documents', 'images', 'inspections',
  'projectHistory', 'params', 'responsibleUserId',
  'ownerContractorId', 'ownerInvestorId', 'selectedEquipmentId', 'operatorId',
  // Xam texniki ID-lər — istifadəçiyə mənası yoxdur, anlamlı qarşılıqları (ad/kod) onsuz da görünür
  'requestId', 'customerId', 'shortlistId', 'equipmentId', 'planId',
  'transportContractorId', 'winnerItemId', 'contractorId', 'investorId',
  'projectId', 'accountingId', 'sourceInvoiceId',
  'departmentId', 'roleId', 'moduleId', 'performedByUserId', 'uploadedByUserId',
  // RBAC xam ID siyahıları — anlamlı qarşılıqları (roleNames, permissions code-ları) görünür
  'roleIds', 'grantedPermissionIds',
])

const MODULE_LABEL = {
  CUSTOMER_MANAGEMENT: 'Müştərilər',
  CONTRACTOR_MANAGEMENT: 'Podratçılar',
  INVESTORS: 'İnvestorlar',
  OPERATORS: 'Operatorlar',
  EMPLOYEE_MANAGEMENT: 'İşçilər',
  GARAGE: 'Qaraj',
  REQUESTS: 'Sorğular',
  COORDINATOR: 'Koordinator',
  PROJECTS: 'Layihələr',
  ACCOUNTING: 'Mühasibatlıq',
  SERVICE_MANAGEMENT: 'Texniki Servis',
}

// Etiket mərkəzi enum mənbəsindən (OperationStatus); pill stili lokal
const STATUS_CFG = {
  PENDING:  { pill: 'ces-p-warn',   get label() { return enumLabel('OperationStatus', 'PENDING') } },
  APPROVED: { pill: 'ces-p-ok',     get label() { return enumLabel('OperationStatus', 'APPROVED') } },
  REJECTED: { pill: 'ces-p-danger', get label() { return enumLabel('OperationStatus', 'REJECTED') } },
}

// Sahə açarı (+ lazım olduqda modul) → enum tipi. Diff-də enum kodlarını
// Azərbaycan etiketinə çevirmək üçün istifadə olunur.
const STATUS_ENUM_BY_MODULE = {
  CUSTOMER_MANAGEMENT: 'CustomerStatus',
  CONTRACTOR_MANAGEMENT: 'ContractorStatus',
  INVESTORS: 'ContractorStatus',
  GARAGE: 'EquipmentStatus',
  SERVICE_MANAGEMENT: 'EquipmentStatus',
  REQUESTS: 'RequestStatus',
  COORDINATOR: 'RequestStatus',
  PROJECTS: 'ProjectStatus',
  ACCOUNTING: 'InvoiceStatus',
  EMPLOYEE_MANAGEMENT: 'EmployeeStatus',
}
const FIELD_ENUM_TYPE = {
  requestStatus: 'RequestStatus',
  ownershipType: 'OwnershipType',
  equipmentOwnership: 'OwnershipType',
  partyType: 'PartyType',
  winnerPartyType: 'PartyType',
  riskLevel: 'RiskLevel',
  projectType: 'ProjectType',
  invoiceType: 'InvoiceType',
  operationType: 'OperationType',
  gender: 'Gender',
}
function resolveEnumType(key, moduleCode) {
  if (key === 'status') return STATUS_ENUM_BY_MODULE[moduleCode] || null
  if (key === 'type') return moduleCode === 'ACCOUNTING' ? 'InvoiceType' : null
  return FIELD_ENUM_TYPE[key] || null
}
// String dəyər enum kodudursa Azərbaycan etiketini qaytarır; deyilsə null
// (ad/ünvan/sərbəst mətn toxunulmaz qalsın deyə yalnız tanınan kodlar çevrilir).
function enumValueLabel(val, key, moduleCode) {
  if (typeof val !== 'string' || !val) return null
  const { enums, byCode } = useEnumStore.getState()
  const type = resolveEnumType(key, moduleCode)
  if (type && enums[type]) {
    const hit = enums[type].find(o => o.code === val)
    if (hit) return hit.label
  }
  if (Object.prototype.hasOwnProperty.call(byCode, val)) return byCode[val]
  return null
}

// Güvənlik şəbəkəsi: lüğətdə olmayan açarı son çarə olaraq oxunaqlı formata çevirir
// (camelCase/snake_case → "Sözlər", ilk hərf böyük). Əsas hədəf yuxarıdakı tam əhatədir.
function humanizeKey(key) {
  const s = String(key)
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function labelFor(key) {
  return FIELD_LABELS[key] || humanizeKey(key)
}

// ─── Koordinator planı snapshot-u: vahid (günlük/aylıq) göstərimi ───
// Per-vahid qiymət sahələri — etiketinə "(aylıq/günlük)", dəyərinə "₼/ay|₼/gün" əlavə olunur.
// (transportationPrice birdəfəlik, totalAmount/companyProfit cəm — vahid suffiksi almır.)
const COORD_PER_UNIT_FIELDS = new Set(['equipmentPrice', 'customerEquipmentPrice'])
// İstifadə olunmayan legacy sahələr — koordinator snapshot-unda gizlədilir (yeni flow doldurmur, 0 qalır).
const COORD_LEGACY_HIDDEN = new Set(['contractorDailyRate', 'contractorPayment'])

function coordUnit(projectType) {
  if (projectType === 'MONTHLY') return { labelSuffix: ' (aylıq)', valueSuffix: '₼/ay' }
  if (projectType === 'DAILY') return { labelSuffix: ' (günlük)', valueSuffix: '₼/gün' }
  return null
}
function isNumericVal(v) {
  return typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)))
}

function isBlank(v) {
  return v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)
}

// Sadə {id, name} kimi istinad obyekti? (ad göstərilir, xam ID yox)
function isSimpleRef(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false
  if (!obj.name) return false
  return Object.keys(obj).filter(k => !FIELD_EXCLUDE.has(k)).length <= 1
}

const nestedStyles = {
  wrap: { border: '1px solid var(--ces-line-2)', borderRadius: 8, overflow: 'hidden', margin: '2px 0' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tr: { borderBottom: '1px solid var(--ces-line-2)' },
  keyTd: { padding: '5px 9px', fontSize: 11.5, color: 'var(--ces-muted)', fontWeight: 600, width: '40%', verticalAlign: 'top', background: 'rgba(0,0,0,.015)' },
  valTd: { padding: '5px 9px', fontSize: 12, color: 'var(--ces-ink)', verticalAlign: 'top' },
  card: { border: '1px solid var(--ces-line-2)', borderRadius: 8, padding: 2, marginBottom: 6 },
  cardHead: { fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--ces-muted)', padding: '3px 9px' },
}

// İç-içə obyekti oxunaqlı alt-cədvəl kimi göstər (JSON yox, rekursiv)
function NestedObject({ obj, moduleCode }) {
  const keys = Object.keys(obj).filter(k => !FIELD_EXCLUDE.has(k) && !isBlank(obj[k]))
  if (keys.length === 0) return <span style={{ color: 'var(--ces-mute2)', fontStyle: 'italic', fontSize: 12 }}>—</span>
  return (
    <div style={nestedStyles.wrap}>
      <table style={nestedStyles.table}>
        <tbody>
          {keys.map(k => (
            <tr key={k} style={nestedStyles.tr}>
              <td style={nestedStyles.keyTd}>{labelFor(k)}</td>
              <td style={nestedStyles.valTd}>{formatValue(obj[k], k, moduleCode)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Obyekt massivini kartlar kimi göstər (rekursiv)
function NestedList({ arr, moduleCode }) {
  return (
    <div>
      {arr.map((item, i) => (
        <div key={i} style={nestedStyles.card}>
          <div style={nestedStyles.cardHead}>#{i + 1}</div>
          {item && typeof item === 'object' ? <NestedObject obj={item} moduleCode={moduleCode} /> : formatValue(item, undefined, moduleCode)}
        </div>
      ))}
    </div>
  )
}

function formatValue(val, key, moduleCode) {
  if (val === null || val === undefined) return <span style={{ color: 'var(--ces-mute2)', fontStyle: 'italic', fontSize: 12 }}>—</span>
  if (typeof val === 'boolean') return val ? 'Bəli' : 'Xeyr'
  if (Array.isArray(val)) {
    if (val.length === 0) return <span style={{ color: 'var(--ces-mute2)', fontStyle: 'italic', fontSize: 12 }}>Boş</span>
    // Sadə istinad siyahısı ({id, name}) → adları vergüllə birləşdir
    if (val.every(v => isSimpleRef(v))) {
      return <span style={{ fontSize: 12, color: 'var(--ces-muted)' }}>{val.map(v => v.name).join(', ')}</span>
    }
    // Zəngin obyekt massivi → oxunaqlı kartlar (xam JSON yox)
    if (val.some(v => v && typeof v === 'object')) {
      return <NestedList arr={val} moduleCode={moduleCode} />
    }
    // Primitiv massiv — elementlər enum kodu ola bilər
    return <span style={{ fontSize: 12, color: 'var(--ces-muted)' }}>{val.map(v => enumValueLabel(v, key, moduleCode) ?? v).join(', ')}</span>
  }
  if (typeof val === 'object') {
    if (isSimpleRef(val)) return String(val.name)
    // Zəngin obyekt → oxunaqlı alt-cədvəl (xam JSON yox)
    return <NestedObject obj={val} moduleCode={moduleCode} />
  }
  if (typeof val === 'string') {
    // Enum kodu → Azərbaycan etiketi (yalnız tanınan kodlar; sərbəst mətn toxunulmur)
    const el = enumValueLabel(val, key, moduleCode)
    if (el != null) return el
  }
  return String(val)
}

const diffStyles = {
  th: { textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ces-muted)', borderBottom: '1px solid var(--ces-line)' },
  tr: { borderBottom: '1px solid var(--ces-line-2)' },
  fieldTd: { padding: '10px 14px', fontSize: 12.5, color: 'var(--ces-muted)', fontWeight: 600 },
  valTd: { padding: '10px 14px', fontSize: 13, color: 'var(--ces-ink)' },
  oldVal: { background: 'rgba(212, 56, 90, .05)', color: 'var(--ces-danger)' },
  newVal: { background: 'rgba(15, 157, 106, .06)', color: 'var(--ces-ok)', fontWeight: 600 },
}

// İcazə kodu (MODULE:ACTION) → oxunaqlı "Modul — Aksiya"; başqa primitivlər olduğu kimi
const DIFF_ACTION_LABELS = {
  GET: 'Oxumaq', POST: 'Yazmaq', PUT: 'Redaktə', DELETE: 'Silmək',
  SEND_COORDINATOR: 'Koordinatora göndər', SUBMIT_OFFER: 'Təklif göndər',
  SEND_ACCOUNTING: 'Mühasibatlığa göndər', RETURN_PROJECT: 'Layihəyə qaytar',
  APPROVE_PM: 'PM təsdiqi', CHECK_DOCUMENTS: 'Sənəd təsdiqi',
  DISPATCH: 'Texnika göndər', DELIVER: 'Təhvil-təslim',
}
function codeLabel(v) {
  const s = String(v)
  const i = s.indexOf(':')
  if (i > 0 && /^[A-Z0-9_]+:[A-Z0-9_]+$/.test(s)) {
    const mod = s.slice(0, i), act = s.slice(i + 1)
    return `${MODULE_LABEL[mod] || mod} — ${DIFF_ACTION_LABELS[act] || act}`
  }
  return s
}
const isPrimArray = (x) => Array.isArray(x) && x.every(e => typeof e === 'string' || typeof e === 'number')

function ChipList({ items, tone }) {
  if (!items.length) return <span style={{ color: 'var(--ces-mute2)', fontStyle: 'italic', fontSize: 12 }}>—</span>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {items.map((v, i) => <span key={i} className={clsx('ces-pill sm', tone)}>{codeLabel(v)}</span>)}
    </div>
  )
}

function DiffTable({ oldSnap, newSnap, isDelete, moduleCode }) {
  if (!oldSnap) return <p className="text-sm py-4 text-center" style={{ color: 'var(--ces-mute2)' }}>Köhnə məlumat yoxdur</p>

  // Yalnız koordinator planı snapshot-una aiddir — digər modulların diff-i toxunulmaz qalır.
  const isCoordPlan = moduleCode === 'COORDINATOR'
  const coordU = isCoordPlan ? coordUnit(oldSnap?.projectType ?? newSnap?.projectType) : null
  const hideLegacy = (keys) => isCoordPlan ? keys.filter(k => !COORD_LEGACY_HIDDEN.has(k)) : keys
  const fieldLabel = (key) => {
    const base = labelFor(key)
    return (coordU && COORD_PER_UNIT_FIELDS.has(key)) ? base + coordU.labelSuffix : base
  }
  const fieldValue = (val, key) => {
    const rendered = formatValue(val, key, moduleCode)
    if (coordU && COORD_PER_UNIT_FIELDS.has(key) && isNumericVal(val)) {
      return <>{rendered} <span style={{ color: 'var(--ces-muted)', fontSize: 11.5, fontWeight: 600 }}>{coordU.valueSuffix}</span></>
    }
    return rendered
  }

  if (!isDelete && !newSnap) {
    const keys = hideLegacy(Object.keys(oldSnap).filter(k => !FIELD_EXCLUDE.has(k) && oldSnap[k] != null && oldSnap[k] !== '' && !(Array.isArray(oldSnap[k]) && oldSnap[k].length === 0)))
    return (
      <div>
        <div className="ces-alert gold mb-4">
          <div className="ces-al-ic"><Check size={18} /></div>
          <div style={{ fontSize: 13, color: 'var(--ces-graphite)' }}>
            Bu plan təsdiqləndikdən sonra <b>layihə kimi göndəriləcək</b> — status "Gözdən keçirilir" olaraq dəyişəcək.
          </div>
        </div>
        <p className="ces-sec-label mb-3">Planın cari vəziyyəti</p>
        <div className="overflow-x-auto" style={{ border: '1px solid var(--ces-line)', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {keys.map(key => (
                <tr key={key} style={diffStyles.tr}>
                  <td style={{ ...diffStyles.fieldTd, width: '32%' }}>{fieldLabel(key)}</td>
                  <td style={diffStyles.valTd}>{fieldValue(oldSnap[key], key)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const allKeys = hideLegacy(Array.from(new Set([
    ...Object.keys(oldSnap || {}),
    ...Object.keys(newSnap || {}),
  ])).filter(k => !FIELD_EXCLUDE.has(k)))

  if (isDelete) {
    return (
      <div className="overflow-x-auto" style={{ border: '1px solid var(--ces-line)', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...diffStyles.th, width: '32%' }}>Sahə</th>
              <th style={{ ...diffStyles.th, color: 'var(--ces-danger)' }}>Silinəcək dəyər</th>
            </tr>
          </thead>
          <tbody>
            {allKeys.map(key => (
              <tr key={key} style={diffStyles.tr}>
                <td style={diffStyles.fieldTd}>{fieldLabel(key)}</td>
                <td style={{ ...diffStyles.valTd, ...diffStyles.oldVal }}>
                  {fieldValue(oldSnap[key], key)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const changedKeys   = allKeys.filter(k => JSON.stringify(oldSnap?.[k]) !== JSON.stringify(newSnap?.[k]))
  const unchangedKeys = allKeys.filter(k => JSON.stringify(oldSnap?.[k]) === JSON.stringify(newSnap?.[k]))

  return (
    <div className="overflow-x-auto" style={{ border: '1px solid var(--ces-line)', borderRadius: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...diffStyles.th, width: '24%' }}>Sahə</th>
            <th style={{ ...diffStyles.th, color: 'var(--ces-danger)', width: '38%' }}>Köhnə dəyər</th>
            <th style={{ ...diffStyles.th, color: 'var(--ces-ok)', width: '38%' }}>Yeni dəyər</th>
          </tr>
        </thead>
        <tbody>
          {changedKeys.map(key => {
            const ov = oldSnap?.[key], nv = newSnap?.[key]
            // Primitiv massiv (məs. icazə kodları, roleNames) → "Çıxarılan / Əlavə olunan"
            if (isPrimArray(ov) && isPrimArray(nv)) {
              const oldSet = new Set(ov.map(String)), newSet = new Set(nv.map(String))
              const removed = ov.filter(v => !newSet.has(String(v)))
              const added = nv.filter(v => !oldSet.has(String(v)))
              return (
                <tr key={key} style={{ ...diffStyles.tr, background: 'rgba(255, 244, 220, .35)' }}>
                  <td style={{ ...diffStyles.fieldTd, color: 'var(--ces-ink)', fontWeight: 700 }}>{fieldLabel(key)}</td>
                  <td style={diffStyles.valTd}>
                    <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--ces-danger)', marginBottom: 4 }}>Çıxarılan</p>
                    <ChipList items={removed} tone="ces-p-danger" />
                  </td>
                  <td style={diffStyles.valTd}>
                    <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--ces-ok)', marginBottom: 4 }}>Əlavə olunan</p>
                    <ChipList items={added} tone="ces-p-ok" />
                  </td>
                </tr>
              )
            }
            return (
              <tr key={key} style={{ ...diffStyles.tr, background: 'rgba(255, 244, 220, .35)' }}>
                <td style={{ ...diffStyles.fieldTd, color: 'var(--ces-ink)', fontWeight: 700 }}>{fieldLabel(key)}</td>
                <td style={{ ...diffStyles.valTd, ...diffStyles.oldVal, textDecoration: 'line-through', textDecorationColor: 'rgba(212,56,90,.45)' }}>
                  {fieldValue(ov, key)}
                </td>
                <td style={{ ...diffStyles.valTd, ...diffStyles.newVal }}>
                  {fieldValue(nv, key)}
                </td>
              </tr>
            )
          })}
          {unchangedKeys.map(key => (
            <tr key={key} style={diffStyles.tr}>
              <td style={diffStyles.fieldTd}>{fieldLabel(key)}</td>
              {/* Dəyişməyən sahə — dəyər hər iki tərəfdə eyni; yanlış "→ —" göstərilmir */}
              <td style={{ ...diffStyles.valTd, color: 'var(--ces-muted)', fontSize: 12.5 }} colSpan={2}>
                {fieldValue(oldSnap?.[key], key)}
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ces-mute2)', fontStyle: 'italic' }}>(dəyişməyib)</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ApprovalDiffModal({ operationId, onClose, onActionDone }) {
  useEscapeKey(onClose)
  const { user } = useAuthStore()
  useEnumStore(s => s.loaded) // enum etiketləri yüklənəndə yenidən render olunsun
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [acting, setActing] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await approvalApi.getDetail(operationId)
        setDetail(res.data.data || res.data)
      } catch {
        onClose()
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [operationId])

  const canAct = user?.hasApproval && detail?.status === 'PENDING'

  const handleApprove = async () => {
    setActing(true)
    try {
      await approvalApi.approve(detail.id)
      toast.success('Əməliyyat təsdiqləndi')
      onActionDone()
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Təsdiq edilə bilmədi')
    } finally {
      setActing(false)
    }
  }

  const handleReject = async () => {
    setActing(true)
    try {
      await approvalApi.reject(detail.id, rejectReason.trim())
      toast.success('Əməliyyat rədd edildi')
      onActionDone()
    } catch (err) {
      if (!err._toasted) toast.error(err?.response?.data?.message || 'Rədd edilə bilmədi')
    } finally {
      setActing(false)
    }
  }

  const opType = detail?.operationType === 'DELETE'
    ? { pill: 'ces-p-danger', label: 'Silmə', Icon: Trash2 }
    : detail?.moduleCode === 'COORDINATOR'
      ? { pill: 'ces-p-gold', label: 'Təklif hazırlanması', Icon: Pencil }
      : { pill: 'ces-p-info', label: 'Redaktə', Icon: Pencil }
  const OpIcon = opType.Icon

  const statusCfg = detail ? STATUS_CFG[detail.status] : null

  return (
    <div className="ces-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="ces-modal" style={{ maxWidth: 880 }}>
        {/* Header */}
        <div className="ces-m-head">
          {loading ? (
            <div className="animate-pulse" style={{ height: 20, width: 240, borderRadius: 6, background: 'var(--ces-graphite-50)' }} />
          ) : (
            <>
              <div className="ces-m-ic gold">
                <OpIcon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="flex items-center gap-2 flex-wrap">
                  <span className={clsx('ces-pill sm', opType.pill)}>
                    <OpIcon size={11} />
                    {opType.label}
                  </span>
                  <span className="truncate">{detail?.entityLabel || '—'}</span>
                </h3>
                <p>{MODULE_LABEL[detail?.moduleCode] || detail?.moduleCode}</p>
              </div>
            </>
          )}
          <button onClick={onClose} className="ces-modal-x" type="button" aria-label="Bağla">
            <X size={16} />
          </button>
        </div>

        {/* Meta */}
        {!loading && detail && (
          <div
            className="flex flex-wrap gap-4 items-center"
            style={{
              padding: '14px 26px',
              borderBottom: '1px solid var(--ces-line)',
              background: '#fbfaf6',
              fontSize: 12.5,
            }}
          >
            <span style={{ color: 'var(--ces-muted)' }}>
              <b style={{ color: 'var(--ces-ink)', fontWeight: 600 }}>Edən:</b> {detail.performedByName || '—'}
            </span>
            <span style={{ color: 'var(--ces-muted)' }}>
              <b style={{ color: 'var(--ces-ink)', fontWeight: 600 }}>Şöbə:</b> {detail.performerDepartmentName || '—'}
            </span>
            <span className="mono" style={{ color: 'var(--ces-muted)' }}>
              <b style={{ color: 'var(--ces-ink)', fontWeight: 600 }}>Tarix:</b>{' '}
              {detail.createdAt ? new Date(detail.createdAt).toLocaleString('az-AZ') : '—'}
            </span>
            {statusCfg && (
              <span className={clsx('ces-pill sm', statusCfg.pill)}>
                <span className="d"></span>{statusCfg.label}
              </span>
            )}
            {detail.status === 'REJECTED' && detail.rejectReason && (
              <span style={{ color: 'var(--ces-danger)' }}>
                <b style={{ fontWeight: 600 }}>Səbəb:</b> {detail.rejectReason}
              </span>
            )}
          </div>
        )}

        {/* Diff */}
        <div className="ces-m-body">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse" style={{ height: 32, borderRadius: 8, background: 'var(--ces-graphite-50)' }} />
              ))}
            </div>
          ) : (
            <DiffTable
              oldSnap={detail?.oldSnapshot}
              newSnap={detail?.newSnapshot}
              isDelete={detail?.operationType === 'DELETE'}
              moduleCode={detail?.moduleCode}
            />
          )}
        </div>

        {/* Footer */}
        {canAct && !loading && (
          <div className="ces-m-foot" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
            {rejectMode ? (
              <>
                <div className="ces-input is-error" style={{ alignItems: 'flex-start', paddingTop: 4, paddingBottom: 4 }}>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Rədd etmə səbəbini yazın..."
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setRejectMode(false); setRejectReason('') }}
                    className="ces-btn ces-btn-ghost"
                  >
                    Ləğv et
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={acting}
                    className="ces-btn ces-btn-danger"
                  >
                    <XCircle size={14} />
                    {acting ? 'Göndərilir...' : 'Rədd et'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setRejectMode(true)}
                  className="ces-btn ces-btn-outline"
                  style={{ color: 'var(--ces-danger)', borderColor: 'rgba(212,56,90,.35)' }}
                >
                  <XCircle size={14} />
                  Rədd et
                </button>
                <button
                  onClick={handleApprove}
                  disabled={acting}
                  className="ces-btn"
                  style={{ background: 'var(--ces-ok)', color: '#fff' }}
                >
                  <Check size={14} />
                  {acting ? 'Göndərilir...' : 'Təsdiq et'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
