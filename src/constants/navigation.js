import {
  Users,
  Building2,
  HardHat,
  UserCog,
  Truck,
  ClipboardList,
  GitBranch,
  FolderKanban,
  Calculator,
  Wrench,
  Banknote,
  UserCheck,
  ClipboardCheck,
  Trash2,
  LayoutDashboard,
  History,
  Settings,
  Briefcase,
} from 'lucide-react'

// UI kit-də .sd-lab ilə qruplaşma. Hər item-də `section` field-i bölmə adı təyin edir.
export const NAV_SECTIONS = [
  { key: 'main',       label: 'Əsas' },
  { key: 'partners',   label: 'Tərəfdaşlar' },
  { key: 'operations', label: 'Əməliyyatlar' },
  { key: 'finance',    label: 'Maliyyə və HR' },
  { key: 'system',     label: 'Sistem' },
]

export const NAV_ITEMS = [
  // ───────── ƏSAS ─────────
  {
    id: 'dashboard',
    label: 'İdarə Paneli',
    path: '/',
    icon: LayoutDashboard,
    module: 'DASHBOARD',
    section: 'main',
  },

  // ───────── TƏRƏFDAŞLAR ─────────
  {
    id: 'customers',
    label: 'Müştərilər',
    path: '/customers',
    icon: Building2,
    module: 'CUSTOMER_MANAGEMENT',
    section: 'partners',
  },
  {
    id: 'contractors',
    label: 'Podratçılar',
    path: '/contractors',
    icon: HardHat,
    module: 'CONTRACTOR_MANAGEMENT',
    section: 'partners',
  },
  {
    id: 'investors',
    label: 'İnvestorlar',
    path: '/investors',
    icon: Banknote,
    module: 'INVESTORS',
    section: 'partners',
  },
  {
    id: 'operators',
    label: 'Operatorlar',
    path: '/operators',
    icon: UserCheck,
    module: 'OPERATORS',
    section: 'partners',
  },

  // ───────── ƏMƏLİYYATLAR ─────────
  {
    id: 'garage',
    label: 'Qaraj',
    path: '/garage',
    icon: Truck,
    module: 'GARAGE',
    section: 'operations',
  },
  {
    id: 'requests',
    label: 'Sorğular',
    path: '/requests',
    icon: ClipboardList,
    module: 'REQUESTS',
    section: 'operations',
  },
  {
    id: 'project-manager',
    label: 'Layihə Meneceri',
    path: '/project-manager',
    icon: ClipboardCheck,
    module: 'PROJECT_MANAGER',
    section: 'operations',
  },
  {
    id: 'coordinator',
    label: 'Koordinator',
    path: '/coordinator',
    icon: GitBranch,
    module: 'COORDINATOR',
    section: 'operations',
  },
  {
    id: 'projects',
    label: 'Layihələr',
    path: '/projects',
    icon: FolderKanban,
    module: 'PROJECTS',
    section: 'operations',
  },
  {
    id: 'service',
    label: 'Texniki Servis',
    path: '/service',
    icon: Wrench,
    module: 'SERVICE_MANAGEMENT',
    comingSoon: true,
    section: 'operations',
  },
  {
    id: 'approval',
    label: 'Təsdiq Növbəsi',
    path: '/approval',
    icon: ClipboardCheck,
    module: 'OPERATIONS_APPROVAL',
    section: 'operations',
  },

  // ───────── MALİYYƏ VƏ HR ─────────
  {
    id: 'accounting',
    label: 'Mühasibatlıq',
    path: '/accounting',
    icon: Calculator,
    module: 'ACCOUNTING',
    section: 'finance',
  },
  {
    id: 'hr',
    label: 'İnsan Resursları',
    path: '/hr',
    icon: Briefcase,
    module: 'HR_MANAGEMENT',
    section: 'finance',
  },

  // ───────── SİSTEM ─────────
  {
    id: 'users',
    label: 'İstifadəçilər',
    path: '/users',
    icon: Users,
    module: 'EMPLOYEE_MANAGEMENT',
    section: 'system',
  },
  {
    id: 'roles',
    label: 'Rollar və icazələr',
    path: '/roles',
    icon: UserCog,
    module: 'ROLE_PERMISSION',
    section: 'system',
  },
  {
    id: 'config',
    label: 'Konfiqurasiya',
    path: '/config',
    icon: Settings,
    module: 'CONFIG',
    section: 'system',
  },
  {
    id: 'audit',
    label: 'Audit',
    path: '/audit',
    icon: History,
    module: 'AUDIT_LOG',
    section: 'system',
  },
  {
    id: 'trash',
    label: 'Silinmiş məlumatlar',
    path: '/trash',
    icon: Trash2,
    module: 'TRASH',
    section: 'system',
  },
]

export function getFirstAccessibleRoute(user) {
  if (!user) return '/login'

  const role = user.role || (Array.isArray(user.roleNames) ? user.roleNames[0] : '')
  const roleNames = Array.isArray(user.roleNames) ? user.roleNames : [role].filter(Boolean)
  const permissions = Array.isArray(user.permissions) ? user.permissions : []

  // Administrator or CEO -> full access to Dashboard
  if (roleNames.some(r => r === 'Administrator' || r === 'CEO' || r === 'Admin')) {
    return '/'
  }

  // If user has DASHBOARD permission
  if (permissions.some(p => typeof p === 'string' && p.startsWith('DASHBOARD:'))) {
    return '/'
  }

  // Find first accessible item from NAV_ITEMS
  for (const item of NAV_ITEMS) {
    if (item.path === '/') continue
    if (!item.module) return item.path
    if (permissions.some(p => typeof p === 'string' && p.startsWith(item.module + ':'))) {
      return item.path
    }
  }

  return '/profile'
}

