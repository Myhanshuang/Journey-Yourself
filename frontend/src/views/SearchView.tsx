import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Smile, Sun, Tag as TagIcon, Loader2, Check, Book } from 'lucide-react'
import { cn, DiaryItemCard } from '../components/ui/JourneyUI'
import { useQuery } from '@tanstack/react-query'
import { timelineApi, notebookApi } from '../lib/api'
import api from '../lib/api'
import { useNavigate } from 'react-router-dom'

const MOOD_OPTIONS = ['Happy', 'Excited', 'Celebrate', 'Inspired', 'Thoughtful', 'Relaxed', 'Chill', 'Sad', 'Angry', 'Tired']
const WEATHER_OPTIONS = ['☀️', '⛅️', '☁️', '🌧️', '⛈️', '❄️', '💨']

export default function SearchView() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState<any>({ mood: null, weather: null, tag: null, notebook_id: null })
  const [activePicker, setActivePicker] = useState<'mood' | 'weather' | 'tag' | 'notebook' | null>(null)

  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: () => api.get('/tags/').then(r => r.data) })
  const { data: notebooks = [] } = useQuery({ queryKey: ['notebooks'], queryFn: notebookApi.list })

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', q, filters],
    queryFn: () => timelineApi.search({ q, ...filters }),
    enabled: q.length > 0 || Object.values(filters).some(v => v !== null)
  })

  const selectedNotebookName = notebooks.find((n: any) => n.id === filters.notebook_id)?.name

  const handleDiaryClick = (diary: any) => {
    navigate(`/diaries/${diary.id}`)
  }

  const handleClose = () => {
    navigate(-1)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-[#f2f4f2]/95 backdrop-blur-3xl overflow-y-auto text-[#232f55]">
      <div className="max-w-[1000px] mx-auto py-20 px-8 space-y-12">
        {/* 搜索框 */}
        <div className="relative group">
          <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-[#232f55]/20 group-focus-within:text-[#6ebeea] transition-colors" size={32} strokeWidth={3} />
          <input
            autoFocus className="w-full bg-white border-none rounded-[40px] py-10 pl-24 pr-12 text-4xl font-black tracking-tighter shadow-2xl focus:ring-8 focus:ring-[#6ebeea]/10 transition-all placeholder:text-[#232f55]/5 outline-none"
            placeholder="Search memories or collections..." value={q} onChange={e => setQ(e.target.value)}
          />
          <button onClick={handleClose} className="absolute right-8 top-1/2 -translate-y-1/2 p-4 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={24} /></button>
        </div>

        {/* 过滤器交互条 */}
        <div className="flex flex-wrap items-center gap-4 relative">
          <FilterButton
            icon={<Book size={16} />} label={selectedNotebookName || "Collection"} active={!!filters.notebook_id}
            onClick={() => setActivePicker('notebook')} onClear={() => setFilters({ ...filters, notebook_id: null })}
          />
          <FilterButton
            icon={<Smile size={16} />} label={filters.mood || "Mood"} active={!!filters.mood}
            onClick={() => setActivePicker('mood')} onClear={() => setFilters({ ...filters, mood: null })}
          />
          <FilterButton
            icon={<Sun size={16} />} label={filters.weather || "Weather"} active={!!filters.weather}
            onClick={() => setActivePicker('weather')} onClear={() => setFilters({ ...filters, weather: null })}
          />
          <FilterButton
            icon={<TagIcon size={16} />} label={filters.tag || "Tag"} active={!!filters.tag}
            onClick={() => setActivePicker('tag')} onClear={() => setFilters({ ...filters, tag: null })}
          />

          <AnimatePresence>
            {activePicker && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 mt-4 p-6 bg-white rounded-[32px] shadow-2xl border border-white z-50 min-w-[320px]">
                <div className="flex justify-between items-center mb-4 px-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#232f55]/30">Filter by {activePicker}</span>
                  <button onClick={() => setActivePicker(null)} className="text-slate-400 hover:text-slate-900 transition-colors"><X size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {activePicker === 'notebook' && notebooks.map((n: any) => (
                    <button key={n.id} onClick={() => { setFilters({ ...filters, notebook_id: n.id }); setActivePicker(null); }} className="px-4 py-3 rounded-xl bg-slate-50 hover:bg-[#6ebeea]/10 text-sm font-bold transition-all text-left flex justify-between items-center truncate">{n.name} {filters.notebook_id === n.id && <Check size={12} />}</button>
                  ))}
                  {activePicker === 'mood' && MOOD_OPTIONS.map(m => (
                    <button key={m} onClick={() => { setFilters({ ...filters, mood: m }); setActivePicker(null); }} className="px-4 py-3 rounded-xl bg-slate-50 hover:bg-[#6ebeea]/10 text-sm font-bold transition-all text-left flex justify-between items-center">{m} {filters.mood === m && <Check size={12} />}</button>
                  ))}
                  {activePicker === 'weather' && WEATHER_OPTIONS.map(w => (
                    <button key={w} onClick={() => { setFilters({ ...filters, weather: w }); setActivePicker(null); }} className="px-4 py-3 rounded-xl bg-slate-50 hover:bg-[#6ebeea]/10 text-lg transition-all text-center">{w}</button>
                  ))}
                  {activePicker === 'tag' && allTags.map((t: string) => (
                    <button key={t} onClick={() => { setFilters({ ...filters, tag: t }); setActivePicker(null); }} className="px-4 py-3 rounded-xl bg-slate-50 hover:bg-[#6ebeea]/10 text-sm font-bold transition-all flex items-center gap-2 truncate"><TagIcon size={12} className="opacity-30" /> {t}</button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 结果区域 */}
        <div className="space-y-10 min-h-[400px]">
          {isLoading ? (
            <div className="py-20 text-center animate-pulse"><Loader2 className="animate-spin mx-auto text-[#6ebeea] mb-4" size={48} /><p className="text-xs font-black uppercase text-[#232f55]/20 tracking-widest">Scanning ripples...</p></div>
          ) : results.length > 0 ? (
            <div className="grid gap-8">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6ebeea] ml-4">{results.length} Matches Found</p>
              {results.map((d: any) => <DiaryItemCard key={d.id} diary={d} size="md" onClick={() => handleDiaryClick(d)} />)}
            </div>
          ) : (q.length > 0 || Object.values(filters).some(v => v !== null)) && (
            <div className="py-40 text-center space-y-6">
              <div className="text-8xl opacity-10">🍃</div>
              <p className="text-2xl font-black text-[#232f55]/20 tracking-tight italic">Nothing found in this current.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function FilterButton({ icon, label, active, onClick, onClear }: any) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={cn(
          "flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-sm transition-all border",
          active ? "bg-[#232f55] text-white border-[#232f55] shadow-xl" : "bg-white border-white text-[#232f55]/40 hover:border-[#6ebeea]/30"
        )}
      >
        {icon} <span className="max-w-[120px] truncate">{label}</span>
      </button>
      {active && (
        <button
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-[#232f55] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all border-2 border-[#f2f4f2]"
        >
          <X size={10} strokeWidth={4} />
        </button>
      )}
    </div>
  )
}