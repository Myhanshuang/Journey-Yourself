import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Tag as TagIcon, Plus, Search } from 'lucide-react'
import { cn, useToast } from '../ui/JourneyUI'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'

export default function TagPicker({ selectedTags, onUpdate, onClose }: any) {
  const [q, setQ] = useState('')
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: () => api.get('/tags/').then(r => r.data) })

  const toggleTag = (name: string) => {
    const next = selectedTags.includes(name) ? selectedTags.filter((t:any) => t !== name) : [...selectedTags, name]
    onUpdate(next)
  }

  const handleAdd = () => {
    if (!q.trim()) return
    if (!selectedTags.includes(q.trim())) toggleTag(q.trim())
    setQ('')
  }

  const filtered = allTags.filter((t:string) => t.toLowerCase().includes(q.toLowerCase()) && !selectedTags.includes(t))

  return (
    <div className="fixed inset-0 z-[210] bg-black/5 backdrop-blur-md flex items-center justify-center p-6 text-slate-900">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white p-10 rounded-[48px] max-w-md w-full shadow-2xl border border-white space-y-8">
         <div className="flex items-center justify-between">
            <h4 className="text-2xl font-black tracking-tight flex items-center gap-3"><TagIcon size={24}/> Collections Tags</h4>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-300"><X/></button>
         </div>

         {/* 已选标签 */}
         <div className="flex flex-wrap gap-2 min-h-[40px]">
            {selectedTags.map((t: string) => (
              <span key={t} onClick={() => toggleTag(t)} className="px-4 py-2 bg-indigo-600 text-white rounded-full text-xs font-black cursor-pointer hover:bg-red-500 transition-colors flex items-center gap-2 group">
                 {t} <X size={12} className="opacity-50 group-hover:opacity-100" />
              </span>
            ))}
            {selectedTags.length === 0 && <p className="text-xs text-slate-300 font-bold italic">No tags selected...</p>}
         </div>

         <div className="relative">
            <input 
              autoFocus className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 transition-all" 
              placeholder="Search or Create Tag..." 
              value={q} onChange={e=>setQ(e.target.value)} 
              onKeyDown={e=>e.key === 'Enter' && handleAdd()} 
            />
            <button onClick={handleAdd} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-900 text-white rounded-xl shadow-lg"><Plus size={16}/></button>
         </div>

         {/* 建议标签 */}
         <div className="max-h-48 overflow-y-auto space-y-2 no-scrollbar">
            {filtered.map((t: string) => (
              <button key={t} onClick={() => toggleTag(t)} className="w-full text-left px-5 py-3 rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100 group transition-all text-sm font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-3">
                 <TagIcon size={14} className="opacity-30" /> {t}
              </button>
            ))}
         </div>

         <button onClick={onClose} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Done</button>
      </motion.div>
    </div>
  )
}
