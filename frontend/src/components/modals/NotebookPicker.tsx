import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Book, Search, Check } from 'lucide-react'
import { cn, Card } from '../ui/JourneyUI'

export default function NotebookPicker({ notebooks, selectedId, onSelect, onClose }: any) {
  const [q, setQ] = useState('')
  
  const filtered = notebooks.filter((nb: any) => 
    nb.name.toLowerCase().includes(q.toLowerCase()) || 
    nb.description?.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-[210] bg-black/5 backdrop-blur-md flex items-center justify-center p-6 text-slate-900">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white p-10 rounded-[48px] max-w-2xl w-full shadow-2xl border border-white flex flex-col max-h-[80vh]">
         <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
               <h4 className="text-3xl font-black tracking-tight flex items-center gap-3"><Book size={28} className="text-indigo-600"/> Select Collection</h4>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Where does this memory belong?</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-300"><X/></button>
         </div>

         {/* 搜索框 */}
         <div className="relative mb-8">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
            <input 
              autoFocus className="w-full px-16 py-5 bg-slate-50 rounded-[24px] outline-none font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-slate-200" 
              placeholder="Search volumes..." value={q} onChange={e=>setQ(e.target.value)} 
            />
         </div>

         {/* 列表区域 */}
         <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
            {filtered.map((nb: any) => (
              <button 
                key={nb.id} 
                onClick={() => onSelect(nb.id)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-[28px] border-2 transition-all text-left group",
                  selectedId === nb.id ? "border-indigo-600 bg-indigo-50/50 shadow-lg shadow-indigo-100" : "border-transparent bg-slate-50 hover:bg-white hover:border-slate-200"
                )}
              >
                 <div className="w-16 h-20 rounded-xl overflow-hidden shadow-sm bg-slate-200 flex-shrink-0">
                    <img src={nb.cover_url} className="w-full h-full object-cover" />
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className={cn("font-black truncate", selectedId === nb.id ? "text-indigo-600" : "text-slate-900")}>{nb.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{nb.stats_snapshot?.total_entries || 0} Entries</p>
                 </div>
                 {selectedId === nb.id && <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg"><Check size={16} strokeWidth={4}/></div>}
              </button>
            ))}
         </div>

         <button onClick={onClose} className="w-full mt-6 py-5 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Close</button>
      </motion.div>
    </div>
  )
}
