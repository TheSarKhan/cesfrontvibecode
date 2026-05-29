import { useEnumStore } from '../store/enumStore'

/**
 * Güvənlik şəbəkəsi: etiket tapılmayanda xam kodu oxunaqlı formata çevirir
 * (UPPER_SNAKE / camelCase → "Sözlər", ilk hərf böyük).
 */
export function humanizeKey(key) {
  const s = String(key ?? '')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

/**
 * Mərkəzi enum etiket helper-i (imperativ — komponent xaricində də işləyir).
 *   enumLabel('RequestStatus', 'PENDING')  → tip-məlumatlı (ən dəqiq)
 *   enumLabel('PENDING')                    → generic (byCode üzərindən)
 * Tapılmasa humanizeKey fallback.
 */
export function enumLabel(typeOrCode, code) {
  const { enums, byCode } = useEnumStore.getState()
  if (code !== undefined && code !== null) {
    const list = enums[typeOrCode]
    const hit = list && list.find(o => o.code === code)
    if (hit) return hit.label
    return byCode[code] ?? humanizeKey(code)
  }
  if (typeOrCode == null) return ''
  return byCode[typeOrCode] ?? humanizeKey(typeOrCode)
}

/**
 * Reaktiv variant — enum store yükləndikdə komponenti yenidən render edir.
 * Komponent içində: `const eLabel = useEnumLabel()` → `eLabel('EquipmentStatus', code)`.
 */
export function useEnumLabel() {
  // loaded-ə abunə oluruq ki, məlumat gələndə komponent yenilənsin
  useEnumStore(s => s.loaded)
  return enumLabel
}
