import { create } from 'zustand'
import { enumsApi } from '../api/enums'

/**
 * Mərkəzi enum store — bütün enum kod→etiket məlumatı tək mənbədən (/api/enums).
 * Tətbiq açılanda (auth sonrası) bir dəfə çəkilir və cache-lənir.
 *
 *   enums  — { EnumAdı: [{ code, label }, ...] }  (tip-məlumatlı axtarış üçün)
 *   byCode — { KOD: 'Etiket' }                     (generic axtarış üçün; son qeyd qalır)
 */
export const useEnumStore = create((set, get) => ({
  enums: {},
  byCode: {},
  loaded: false,
  loading: false,

  fetchEnums: async () => {
    if (get().loaded || get().loading) return
    set({ loading: true })
    try {
      const res = await enumsApi.getAll()
      const enums = res.data?.data || res.data || {}
      const byCode = {}
      Object.values(enums).forEach(list =>
        (list || []).forEach(opt => { if (opt && opt.code != null) byCode[opt.code] = opt.label })
      )
      set({ enums, byCode, loaded: true, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
