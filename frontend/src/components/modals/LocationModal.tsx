import { useState } from 'react'
import { MapPin, Search as SearchIcon, Navigation, Loader2 } from 'lucide-react'
import { amapApi } from '../../lib/api'
import { Geolocation } from '@capacitor/geolocation'
import { SelectionModal } from '../ui/selection-modal'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Typography } from '../ui/typography'
import { Capacitor } from '@capacitor/core'
import { cn } from '../../lib/utils'

interface LocationModalProps {
  onSelect: (location: any) => void
  onClose: () => void
  currentSelection?: any
  isOpen?: boolean
}

export default function LocationModal({ onSelect, onClose, currentSelection, isOpen = true }: LocationModalProps) {
  const [q, setQ] = useState(''); 
  const [res, setRes] = useState<any[]>([])
  const [isLocating, setIsLocating] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPoint, setSelectedPoint] = useState<any>(currentSelection || null)

  const handleSearch = async () => {
    if (!q.trim()) return
    setIsSearching(true)
    try {
      const pois = await amapApi.search(q)
      setRes(Array.isArray(pois) ? pois : [])
    } catch (e) { console.error('POI Search Failed', e) } finally { setIsSearching(false) }
  }

  // Cross-platform Geolocation with correct regeo logic
  const handleGetCurrent = async () => {
    setIsLocating(true)
    try {
      let coords: { latitude: number; longitude: number } | null = null;

      if (Capacitor.isNativePlatform()) {
        let permStatus = await Geolocation.checkPermissions()
        if (permStatus.location !== 'granted' && permStatus.coarseLocation !== 'granted') {
          permStatus = await Geolocation.requestPermissions()
        }
        if (permStatus.location !== 'granted' && permStatus.coarseLocation !== 'granted') {
          throw new Error('Location permission denied')
        }
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0
        })
        coords = pos.coords
      } else {
        coords = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error('Geolocation not supported'))
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos.coords),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          )
        })
      }

      if (coords) {
        // Correct parameter format for Amap API: longitude,latitude
        const locStr = `${coords.longitude},${coords.latitude}`
        // Use 'gps' for regeo as we are sending raw GPS coordinates
        const pois = await amapApi.regeo(locStr, 'gps')
        setRes(Array.isArray(pois) ? pois : [])
        if (pois.length === 0) alert('No nearby points found. Try manual search.')
      }

    } catch (err: any) {
      console.error('Location error:', err)
      alert(err.message || 'Failed to get location')
    } finally {
      setIsLocating(false)
    }
  }

  const handleConfirm = () => {
    onSelect(selectedPoint)
    onClose()
  }

  return (
    <SelectionModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Location"
      subtitle="Where does this memory belong?"
      variant="sheet"
      className="md:max-w-md md:mx-auto" // Restrict width on desktop
    >
      {/* 1. 触发当前位置 */}
      <Button 
        onClick={handleGetCurrent} 
        disabled={isLocating} 
        variant="secondary"
        className="w-full flex items-center justify-center gap-3 py-6 rounded-[24px] font-bold mb-6 group bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-transparent shadow-none"
      >
        {isLocating ? <Loader2 className="animate-spin" size={20}/> : <Navigation size={20} className="group-hover:scale-110 transition-transform"/>}
        <span>{isLocating ? 'Scanning Nearby...' : 'Scan Nearby Places'}</span>
      </Button>

      {/* 2. 手动搜索 */}
      <div className="relative mb-6">
        <Input 
          autoFocus 
          className="pr-12 bg-slate-50 border-transparent focus:bg-white" 
          placeholder="Search a specific place..." 
          value={q} 
          onChange={e => setQ(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleSearch()} 
        />
        <Button 
          size="icon"
          onClick={handleSearch} 
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl shadow-lg bg-[#232f55] text-white hover:bg-[#232f55]/90"
        >
          {isSearching ? <Loader2 className="animate-spin" size={16}/> : <SearchIcon size={16}/>}
        </Button>
      </div>

      {/* 3. 结果挑选列表 */}
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {res.map((p: any) => {
          const isSelected = selectedPoint?.name === p.name
          return (
            <button 
              key={p.id} 
              onClick={() => setSelectedPoint({ 
                name: p.name, 
                address: p.address, 
                lat: p.location.split(',')[1], 
                lng: p.location.split(',')[0] 
              })} 
              className={cn(
                "w-full text-left px-5 py-4 rounded-2xl border transition-all group",
                isSelected 
                  ? "bg-indigo-50 border-indigo-200" 
                  : "bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-100"
              )}
            >
                <Typography variant="p" className={cn("font-bold m-0 p-0", isSelected ? "text-indigo-700" : "text-slate-800")}>{p.name}</Typography>
                <Typography variant="label" className="text-[10px] text-slate-400 font-medium truncate mt-1 block">{p.address}</Typography>
            </button>
          )
        })}
        {!isLocating && !isSearching && res.length === 0 && (
          <div className="py-10 text-center space-y-2 opacity-20 grayscale">
              <MapPin size={40} className="mx-auto text-slate-300" />
              <Typography variant="label" className="text-xs text-slate-300">No places listed</Typography>
          </div>
        )}
      </div>

      {/* Clear Selection */}
      {selectedPoint && (
        <button 
          onClick={() => setSelectedPoint(null)} 
          className="w-full py-3 text-red-500 font-bold text-xs uppercase tracking-widest hover:text-red-600 transition-colors mt-4"
        >
          Clear Selection
        </button>
      )}
    </SelectionModal>
  )
}
