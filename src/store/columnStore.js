import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Default visible columns per page
export const DEFAULT_COLUMNS = {
  customers: ['status', 'risk', 'contactPerson', 'phone', 'address'],
  contractors: ['status', 'risk', 'contactPerson', 'phone', 'voen'],
  users: ['department', 'role', 'phone', 'status'],
  garage: ['status', 'ownership', 'serialNumber', 'year', 'responsible'],
  requests: ['status', 'customer', 'equipment', 'date', 'transportation'],
}

export const COLUMN_LABELS = {
  customers: {
    status: 'Status', risk: 'Risk', contactPerson: 'Əlaqədar', phone: 'Telefon', address: 'Ünvan',
  },
  contractors: {
    status: 'Status', risk: 'Risk', contactPerson: 'Əlaqədar', phone: 'Telefon', voen: 'VÖEN',
  },
  users: {
    department: 'Şöbə', role: 'Rol', phone: 'Telefon', status: 'Status',
  },
  garage: {
    status: 'Status', ownership: 'Sahiblik', serialNumber: 'Seriya №', year: 'İl', responsible: 'Məsul',
  },
  requests: {
    status: 'Status', customer: 'Müştəri', equipment: 'Texnika', date: 'Tarix', transportation: 'Nəqliyyat',
  },
}

export const useColumnStore = create(
  persist(
    (set, get) => ({
      columns: { ...DEFAULT_COLUMNS },
      isVisible: (page, key) => get().columns[page]?.includes(key) ?? true,
      toggle: (page, key) => set(state => {
        const current = state.columns[page] ?? DEFAULT_COLUMNS[page] ?? []
        const next = current.includes(key)
          ? current.filter(k => k !== key)
          : [...current, key]
        return { columns: { ...state.columns, [page]: next } }
      }),
      reset: (page) => set(state => ({
        columns: { ...state.columns, [page]: [...(DEFAULT_COLUMNS[page] ?? [])] }
      })),
    }),
    { name: 'ces-columns' }
  )
)
