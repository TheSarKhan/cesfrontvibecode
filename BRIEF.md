# CES ERP — Frontend Brief

## Sistem nədir?
**Construction Equipment Services** şirkəti üçün hazırlanmış ERP sistemi.
Tikinti avadanlıqlarının icarəsi, daşınması və texniki xidmətini idarə edir.
Fərqli departamentlər istifadə edir: mühasibat, koordinasiya, anbar, layihələr və s.
**1-2 həftə ərzində production-a çıxacaq.**

---

## Texniki stack
- React 19, Vite, Tailwind CSS v4
- Zustand (authStore, notificationStore, themeStore)
- Axios (JWT interceptor, auto-refresh 401, request queue)
- React Router v7 (`ProtectedRoute`, `GuestRoute`)
- lucide-react (ikonlar), react-hot-toast (bildirişlər)
- WebSocket (real-vaxt bildirişlər)

---

## Əsas biznes axını
```
Sorğu → Koordinator → Layihə → Mühasibatlıq
```

---

## Mühasibatlıq alt-modulları (Accounting)

### Sənədlər tab (`DocumentsTab`, `DocumentCreateModal`, `DocumentDetailModal`)
- **Məqsəd:** Rəsmi PDF sənədlər yaratmaq və endirmək
- **Növlər:** `HESAB_FAKTURA` (AZ dilində), `TEHVIL_TESLIM_AKTI` (imza bloklu akt), `ENGLISH_INVOICE` (beynəlxalq)
- **Yaratma:** Çox addımlı modal — 1) növ seçimi + mənbə (mövcud qaimədir ya manual), 2) müştəri + tarix, 3) sətir əlavə
- **PDF:** backend `accountingApi.downloadDocumentPdf(id)` → blob endirmə
- **Backend entity:** `GeneratedDocument` + `DocumentLine` (subtotal, vatRate, vatAmount, grandTotal)
- **İcazə:** `ACCOUNTING:GET/POST/DELETE`

### Daimi ödənişlər (`RecurringExpenseModal`)
- **Məqsəd:** Aylıq/rüblük/illik sabit xərclər üçün şablon (internet, icarə, maaş və s.)
- **Sahələr:** ad, kateqoriya (`EXPENSE_CATEGORY` config), mənbə (`EXPENSE_SOURCE` config), məbləğ (boş = dəyişkən), tezlik (MONTHLY/QUARTERLY/ANNUAL), ödəniş günü (1-31), aktiv
- **Qeyd:** Kateqoriya seçiləndə mənbə siyahısı filtrlənir (`description = categoryKey`)
- **Backend entity:** `RecurringExpense`

### Sənəd konfiqurasiyası (`DocumentSettingsPage`)
- **Məqsəd:** PDF-lərdə çap olunan şirkət məlumatlarını idarə etmək
- **Bölmələr:**
  - `COMPANY_INFO`: COMPANY_NAME, VOEN, ADDRESS, DIRECTOR_NAME, PHONE, EMAIL
  - `DOCUMENT_VAT_RATE`: DEFAULT (ƏDV dərəcəsi %, məs: 18)
  - `COMPANY_BANK_DETAILS`: BANK_NAME, BANK_CODE, SWIFT, IBAN, CORRESPONDENT_ACCOUNT
- **Saxlama:** Hamısı `config_items` cədvəlindədir, `configApi.update(id, data)` ilə yenilənir

### Banklar (`banksApi`)
- **Məqsəd:** Alacaq/borc ödənişlərini qeyd edərkən bank seçimi üçün sadə siyahı
- **Endpoint:** `/api/banks` — `getAll`, `create`, `update`, `delete`
- **Fərq:** `COMPANY_BANK_DETAILS` (sənəd konfiqurasiyasında) şirkətin öz bank rekvizitləridir; `banks` isə ödənişi qəbul edən banklar siyahısıdır

---

## Route xəritəsi

**Guest routes** (auth tələb etmir):
- `/login` — LoginPage
- `/forgot-password` — ForgotPasswordPage
- `/reset-password` — ResetPasswordPage

**Protected routes** (MainLayout içərisində):

| Route | Səhifə | Modul kodu |
|---|---|---|
| `/` | DashboardPage | — |
| `/customers` | CustomersPage | CUSTOMER_MANAGEMENT |
| `/contractors` | ContractorsPage | CONTRACTOR_MANAGEMENT |
| `/investors` | InvestorsPage | INVESTORS |
| `/users` | UsersPage | EMPLOYEE_MANAGEMENT |
| `/roles` | RolesPage | ROLE_PERMISSION |
| `/garage` | GaragePage | GARAGE |
| `/requests` | RequestsPage | REQUESTS |
| `/coordinator` | CoordinatorPage | COORDINATOR |
| `/projects` | ProjectsPage | PROJECTS |
| `/accounting` | AccountingPage | ACCOUNTING |
| `/accounting/invoices` | AccountingInvoicesPage | ACCOUNTING |
| `/accounting/debitor` | DebitCreditPage | ACCOUNTING |
| `/accounting/kreditor` | KreditorPage | ACCOUNTING |
| `/accounting/reports` | AccountingReportsPage | ACCOUNTING |
| `/service` | ServicePage | SERVICE_MANAGEMENT |
| `/operators` | OperatorsPage | OPERATORS |
| `/approval` | ApprovalPage | OPERATIONS_APPROVAL |
| `/audit` | AuditPage | AUDIT_LOG |
| `/trash` | TrashPage | TRASH |
| `/config` | ConfigPage | CONFIG |

---

## authStore strukturu

```javascript
{
  user: {
    id, email, fullName, phone,
    department: { id, name },
    role: { id, name },
    permissions: [
      { moduleCode: "ACCOUNTING", canGet, canPost, canPut, canDelete,
        canSendToCoordinator, canSubmitOffer, canSendToAccounting, canReturnToProject }
    ]
  },
  accessToken, refreshToken, isAuthenticated,

  login(credentials),   // token + user saxlayır
  logout(),             // hamısını silir
  hasPermission(moduleCode, action = "canGet")  // → boolean
}
```

---

## İcazə yoxlaması

```jsx
const { hasPermission } = useAuthStore()

// Route səviyyəsində
hasPermission('ACCOUNTING')           // canGet default

// Düymə səviyyəsində
hasPermission('ACCOUNTING', 'canPost')
hasPermission('PROJECTS', 'canPut')
hasPermission('REQUESTS', 'canSendToCoordinator')
```

**Xüsusi icazə sahələri:**
- `canSendToCoordinator` — sorğunu koordinatora göndərə bilər
- `canSubmitOffer` — koordinator təklif göndərə bilər
- `canSendToAccounting` — qaiməni mühasibata göndərə bilər
- `canReturnToProject` — qaiməni geri qaytara bilər

---

## API strukturu (`src/api/`)

22 API modulu — hər biri `api.get/post/put/delete/patch` istifadə edir:

```
accounting.js, approval.js, audit.js, auth.js, banks.js,
contractors.js, coordinator.js, customers.js, dashboard.js,
departments.js, garage.js, investors.js, modules.js,
operators.js, projects.js, requests.js, roles.js,
search.js, service.js, trash.js, users.js, config.js
```

Axios interceptor:
- Hər sorğuya `Authorization: Bearer {accessToken}` əlavə edir
- 401 gələndə refresh token ilə yeni token alır
- Refresh uğursuz olarsa → logout + `/login`-ə yönləndirir

---

## Ümumi komponentlər (`src/components/`)

**Layout:**
- `MainLayout` — sidebar + topbar
- `ProtectedRoute` — auth yoxlaması
- `GuestRoute` — auth varsa dashboard-a yönləndirir

**UI:**
- `ConfirmDialog` — silmə təsdiqi
- `Pagination` — cədvəl səhifələnməsi
- `ColumnToggle` — sütun göstər/gizlət
- `EmptyState` — məlumat yoxdursa
- `TableSkeleton` — yükləmə skeleti
- `CommandPalette` — Ctrl+K qlobal axtarış
- `DateInput` — tarix seçimi
- `ComboInput` — avtotamamlama
- `PrintButton` — çap funksiyası

**Dashboard:**
- `ActivityFeed`, `ProjectStatusChart`, `RevenueBarChart`, `EquipmentPieChart`

**Dashboard KPI-ları** (`/api/dashboard/stats` cavabı):
- Aktiv layihələr, aktiv sorğular, təsdiq gözləyən, aktiv işçilər, silinmiş məlumatlar, bitmiş layihələr
- Müştərilər, podratçılar, investorlar, operatorlar (biznes göstəriciləri)
- Texnika statusu bar (mövcud, icarədə, nasaz, mövcud deyil)
- Maliyyə xülasəsi: ümumi gəlir, podratçı/şirkət xərcləri, xalis mənfəət
- **Ödənilməmiş alacaqlar** (`totalUnpaidReceivables`) — PENDING+PARTIAL+OVERDUE receivable qalığı
- **Ödənilməmiş borclar** (`totalUnpaidPayables`) — PENDING+PARTIAL+OVERDUE payable qalığı
- Aktiv layihələr siyahısı (deadline badge ilə), gözləmədəki sorğular, bitmiş layihələr cədvəli
- Widget ayarları localStorage-da saxlanır (`dashboard_widgets`)

---

## Cədvəl səhifəsi şablonu

Bütün modul səhifələri eyni pattern izləyir:
1. Başlıq + "Yeni əlavə et" düyməsi
2. Axtarış + filtr dropdownları
3. Cədvəl (sütun toggle, bulk seçim)
4. Sıralama + səhifələmə
5. Sıra üzərində: düzəliş, sil, slide-over
6. Modal: yaratma/redaktə formu

---

## Dizayn tokenləri
- **Accent**: `amber-600` (#D97706) — düymələr, checkboxlar, aktiv vəziyyətlər
- **Sidebar aktiv**: `orange-500`
- **Kartlar**: `rounded-xl border-gray-200 hover:shadow-md`
- **Modals**: `rounded-2xl` + amber X düyməsi

---

## Ümumi qaydalar
- Bütün UI mətnləri **Azərbaycanca**
- Silmə: `window.confirm` + soft delete (hard delete yoxdur)
- İcazə yoxlaması hər düymədə: `hasPermission(module, action)`
- API proxy: `/api/*` → backend `:8083`-ə
- Toast bildirişlər: `react-hot-toast` (uğur/xəta)
- Status badge-lər rəng kodlu: ACTIVE=yaşıl, PENDING=sarı, REJECTED=qırmızı
