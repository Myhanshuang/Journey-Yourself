import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, MapPin, Search as SearchIcon, Navigation, Loader2 } from 'lucide-react'
import { amapApi } from '../../lib/api'

export default function LocationModal({ onSelect, onClose, currentSelection }: any) {
  const [q, setQ] = useState(''); 
  const [res, setRes] = useState<any[]>([])
  const [isLocating, setIsLocating] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = async () => {
    if (!q.trim()) return
    setIsSearching(true)
    try {
      const pois = await amapApi.search(q)
      setRes(Array.isArray(pois) ? pois : [])
    } catch (e) { console.error('POI Search Failed', e) } finally { setIsSearching(false) }
  }

  // 核心修改：获取位置后填充列表，而非直接 select
  const handleGetCurrent = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try { 
        const locStr = `${pos.coords.longitude},${pos.coords.latitude}`
        const pois = await amapApi.regeo(locStr)
        
        // 将获取到的周边 POI 放入列表，供用户挑选
        setRes(Array.isArray(pois) ? pois : [])
        if (pois.length === 0) alert('No nearby points found. Try manual search.')
      } catch (err) { alert('Failed to resolve nearby address.') } finally { setIsLocating(false) }
    }, (err) => { setIsLocating(false); alert(err.message); }, { timeout: 10000 })
  }

  return (
    <div className="fixed inset-0 z-[210] bg-black/5 backdrop-blur-md flex items-center justify-center p-6 text-slate-900">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white p-10 rounded-[48px] max-w-md w-full shadow-2xl border border-white space-y-8 flex flex-col max-h-[80vh]">
         <div className="flex items-center justify-between text-slate-900">
            <div className="space-y-1">
               <h4 className="text-3xl font-black tracking-tight flex items-center gap-3"><MapPin size={28} className="text-indigo-600"/> Location</h4>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Set the stage for your memory</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-300 transition-colors"><X/></button>
         </div>

         {/* 1. 触发当前位置 */}
         <button onClick={handleGetCurrent} disabled={isLocating} className="w-full flex items-center justify-center gap-3 py-5 bg-indigo-50 text-indigo-600 rounded-[24px] font-bold hover:bg-indigo-100 transition-all disabled:opacity-50 group">
            {isLocating ? <Loader2 className="animate-spin" size={20}/> : <Navigation size={20} className="group-hover:scale-110 transition-transform"/>}
            <span>{isLocating ? 'Scanning Nearby...' : 'Scan Nearby Places'}</span>
         </button>

         {/* 2. 手动搜索 */}
         <div className="relative">
            <input autoFocus className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-200" placeholder="Search a specific place..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key === 'Enter' && handleSearch()} />
            <button onClick={handleSearch} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-900 text-white rounded-xl shadow-lg transition-all active:scale-90">
               {isSearching ? <Loader2 className="animate-spin" size={16}/> : <SearchIcon size={16}/>}
            </button>
         </div>

         {/* 3. 结果挑选列表 (统一展示搜索结果和当前位置结果) */}
         <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
            {res.map((p: any) => (
              <button 
                key={p.id} 
                onClick={() => onSelect({ 
                  name: p.name, 
                  address: p.address, 
                  lat: p.location.split(',')[1], 
                  lng: p.location.split(',')[0] 
                })} 
                className="w-full text-left px-5 py-4 rounded-2xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100 group transition-all"
              >
                 <p className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{p.name}</p>
                 <p className="text-[10px] text-slate-400 font-medium truncate">{p.address}</p>
              </button>
            ))}
            {!isLocating && !isSearching && res.length === 0 && (
              <div className="py-10 text-center space-y-2 opacity-20 grayscale">
                 <MapPin size={40} className="mx-auto" />
                 <p className="text-xs font-black uppercase">No places listed</p>
              </div>
            )}
         </div>

         {currentSelection && <button onClick={() => onSelect(null)} className="w-full py-4 text-red-500 font-bold text-xs uppercase tracking-widest hover:text-red-600 transition-colors">Clear Selection</button>}
         <button onClick={onClose} className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs transition-all hover:bg-slate-100">Cancel</button>
      </motion.div>
    </div>
  )
}
