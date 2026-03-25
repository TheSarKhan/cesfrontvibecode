import { useState, useEffect, useRef } from 'react'
import { X, MapPin, Loader } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEscapeKey } from '../../hooks/useEscapeKey'

// Fix default marker icon issue in Leaflet + bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Azerbaijan center
const AZ_CENTER = [40.4093, 49.8671]
const AZ_ZOOM = 7

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click: (e) => onSelect(e.latlng),
  })
  return null
}

export default function MapPickerModal({ onClose, onSelect }) {
  useEscapeKey(onClose)
  const [marker, setMarker] = useState(null)
  const [regionName, setRegionName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleMapClick = async (latlng) => {
    setMarker(latlng)
    setLoading(true)
    setRegionName('')
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json&zoom=10&addressdetails=1&accept-language=az`
      )
      const data = await res.json()
      const addr = data.address || {}
      // Rayon/şəhər səviyyəsində bölgə tap — ölkə adını göstərmə
      const name = addr.city || addr.town || addr.county || addr.state_district
        || addr.municipality || addr.district || addr.village || addr.state
        || addr.suburb || addr.hamlet || addr.province || ''
      setRegionName(name)
    } catch {
      setRegionName('')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (regionName) {
      onSelect(regionName)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Xəritədən bölgə seç</h2>
            <p className="text-xs text-gray-400 mt-0.5">Xəritədə istədiyiniz nöqtəyə klikləyin</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors shrink-0">
            <X size={14} className="text-white" />
          </button>
        </div>

        {/* Map */}
        <div className="h-[400px] relative">
          <MapContainer center={AZ_CENTER} zoom={AZ_ZOOM} className="h-full w-full z-0">
            <TileLayer
              attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onSelect={handleMapClick} />
            {marker && <Marker position={marker} />}
          </MapContainer>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4 border-t border-gray-100 dark:border-gray-700">
          {marker ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin size={16} className="text-amber-500 shrink-0" />
              {loading ? (
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Loader size={14} className="animate-spin" />
                  Bölgə müəyyən edilir...
                </div>
              ) : regionName ? (
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{regionName}</span>
              ) : (
                <span className="text-sm text-gray-400">Bölgə tapılmadı, başqa nöqtə seçin</span>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 flex-1">Xəritədə bir nöqtə seçin</p>
          )}

          <button
            onClick={handleConfirm}
            disabled={!regionName || loading}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Seç
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            Ləğv et
          </button>
        </div>
      </div>
    </div>
  )
}
