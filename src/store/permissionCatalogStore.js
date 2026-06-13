import { create } from 'zustand'
import { permissionsApi } from '../api/permissions'

/**
 * Mərkəzi icazə kataloqu store — modul kod→ad və icazə kod→etiket məlumatı
 * tək mənbədən (/api/permissions). RolesView və RoleModal eyni mənbədən işlədir.
 *
 *   catalog       — xam icazə siyahısı [{ id, code, action, moduleCode, moduleNameAz, labelAz }]
 *   moduleNameMap — { MODULE_CODE: 'Azərbaycan modul adı' }
 *   labelByCode   — { 'MODULE:ACTION': 'labelAz' }  (tam "Modul — Action" etiketi)
 */
export const usePermissionCatalogStore = create((set, get) => ({
  catalog: [],
  moduleNameMap: {},
  labelByCode: {},
  loaded: false,
  loading: false,

  fetchCatalog: async (force = false) => {
    if (get().loading) return
    if (get().loaded && !force) return
    set({ loading: true })
    try {
      const res = await permissionsApi.getAll()
      const catalog = res.data?.data || res.data || []
      const moduleNameMap = {}
      const labelByCode = {}
      catalog.forEach((p) => {
        if (p.moduleCode && !moduleNameMap[p.moduleCode]) {
          moduleNameMap[p.moduleCode] = p.moduleNameAz || p.moduleCode
        }
        if (p.code) labelByCode[p.code] = p.labelAz || p.action
      })
      set({ catalog, moduleNameMap, labelByCode, loaded: true, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
