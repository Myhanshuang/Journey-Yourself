import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Smile, Sun, Tag as TagIcon, Loader2, Check, Book, Bookmark, ExternalLink } from 'lucide-react'
import { cn, DiaryItemCard, useIsMobile } from '../components/ui/JourneyUI'
import { useQuery } from '@tanstack/react-query'
import { timelineApi, notebookApi, searchApi } from '../lib/api'
import api from '../lib/api'
import { useNavigate } from 'react-router-dom'

const MOOD_OPTIONS = ['Happy', 'Excited', 'Celebrate', 'Inspired', 'Thoughtful', 'Relaxed', 'Chill', 'Sad', 'Angry', 'Tired']
const WEATHER_OPTIONS = ['☀️', '⛅️', '☁️', '🌧️', '⛈️', '❄️', '💨']

export default function SearchView() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState<any>({ mood: null, weather: null, tag: null, notebook_id: null, include_diaries: true, include_bookmarks: true })
  const [activePicker, setActivePicker] = useState<'mood' | 'weather' | 'tag' | 'notebook' | null>(null)
  const isMobile = useIsMobile()

  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: () => api.get('/tags/').then(r => r.data) })
  const { data: notebooks = [] } = useQuery({ queryKey: ['notebooks'], queryFn: notebookApi.list })

  const { data: results = { diaries: [], bookmarks: [] }, isLoading } = useQuery({
    queryKey: ['search', q, filters],
    queryFn: () => searchApi.unified({ q, ...filters }),
    enabled: q.length > 0 || Object.values(filters).some((v: any) => v !== null && v !== true) // logic adjust
  })

  const selectedNotebookName = notebooks.find((n: any) => n.id === filters.notebook_id)?.name

  const handleDiaryClick = (diary: any) => {
    navigate(`/diaries/${diary.id}`)
  }

  const handleClose = () => {
    navigate(-1)
  }

  const hasResults = results.diaries.length > 0 || results.bookmarks.length > 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-[#f2f4f2]/95 backdrop-blur-3xl overflow-y-auto text-[#232f55]">
      <div className={cn("max-w-[1000px] mx-auto space-y-8 md:space-y-12", isMobile ? "py-6 px-4" : "py-20 px-8")}>
        {/* 搜索框 */}
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#232f55]/20 group-focus-within:text-[#6ebeea] transition-colors" size={isMobile ? 24 : 32} strokeWidth={3} />
          <input
            autoFocus className={cn("w-full bg-white border-none rounded-[40px] pl-16 pr-12 font-black tracking-tighter shadow-2xl focus:ring-8 focus:ring-[#6ebeea]/10 transition-all placeholder:text-[#232f55]/5 outline-none", isMobile ? "py-5 text-xl" : "py-10 text-4xl")}
            placeholder="Search memories..." value={q} onChange={e => setQ(e.target.value)}
          />
          <button onClick={handleClose} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={isMobile ? 18 : 24} /></button>
        </div>

        {/* 过滤器交互条 */}
        <div className="flex flex-wrap items-center gap-3 md:gap-4 relative">
          <FilterToggle 
            label="Diaries" active={filters.include_diaries} 
            onClick={() => setFilters({...filters, include_diaries: !filters.include_diaries})} 
          />
          <FilterToggle 
            label="Bookmarks" active={filters.include_bookmarks} 
            onClick={() => setFilters({...filters, include_bookmarks: !filters.include_bookmarks})} 
          />
          <div className="w-px h-6 bg-slate-300 mx-2" />
          <FilterButton
            icon={<Book size={14} />} label={selectedNotebookName || "Collection"} active={!!filters.notebook_id}
            onClick={() => setActivePicker('notebook')} onClear={() => setFilters({ ...filters, notebook_id: null })}
          />
          <FilterButton
            icon={<Smile size={14} />} label={filters.mood || "Mood"} active={!!filters.mood}
            onClick={() => setActivePicker('mood')} onClear={() => setFilters({ ...filters, mood: null })}
          />
          <FilterButton
            icon={<Sun size={14} />} label={filters.weather || "Weather"} active={!!filters.weather}
            onClick={() => setActivePicker('weather')} onClear={() => setFilters({ ...filters, weather: null })}
          />
          <FilterButton
            icon={<TagIcon size={14} />} label={filters.tag || "Tag"} active={!!filters.tag}
            onClick={() => setActivePicker('tag')} onClear={() => setFilters({ ...filters, tag: null })}
          />

          <AnimatePresence>
            {activePicker && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 mt-4 p-6 bg-white rounded-[32px] shadow-2xl border border-white z-50 min-w-[300px] md:min-w-[320px]">
                <div className="flex justify-between items-center mb-4 px-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#232f55]/30">Filter by {activePicker}</span>
                  <button onClick={() => setActivePicker(null)} className="text-slate-400 hover:text-slate-900 transition-colors"><X size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
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
        <div className="space-y-12 md:space-y-16 min-h-[400px]">
          {isLoading ? (
            <div className="py-20 text-center animate-pulse"><Loader2 className="animate-spin mx-auto text-[#6ebeea] mb-4" size={48} /><p className="text-xs font-black uppercase text-[#232f55]/20 tracking-widest">Scanning ripples...</p></div>
          ) : hasResults ? (
            <>
                {filters.include_diaries && results.diaries.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 ml-4">
                            <span className="w-2 h-2 rounded-full bg-[#232f55]" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#232f55]/40">Diaries ({results.diaries.length})</p>
                        </div>
                        <div className="grid gap-4 md:gap-8">
                            {results.diaries.map((d: any) => <DiaryItemCard key={d.id} diary={d} size={isMobile ? "sm" : "md"} onClick={() => handleDiaryClick(d)} />)}
                        </div>
                    </div>
                )}
                
                {filters.include_bookmarks && results.bookmarks.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 ml-4">
                            <span className="w-2 h-2 rounded-full bg-pink-500" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#232f55]/40">Bookmarks ({results.bookmarks.length})</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {results.bookmarks.map((b: any) => <BookmarkCard key={b.id || Math.random()} bookmark={b} />)}
                        </div>
                    </div>
                )}
            </>
          ) : (q.length > 0 || Object.values(filters).some(v => v !== null && v !== true)) && (
            <div className="py-40 text-center space-y-6">
              <div className="text-8xl opacity-10">🍃</div>
              <p className="text-2xl font-black text-[#232f55]/20 tracking-tight italic">Nothing found.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function FilterToggle({ label, active, onClick }: any) {
    return (
        <button onClick={onClick} className={cn("px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider border transition-all", active ? "bg-[#232f55] text-white border-[#232f55]" : "bg-transparent border-slate-300 text-slate-400 hover:border-[#232f55] hover:text-[#232f55]")}>
            {label}
        </button>
    )
}

function BookmarkCard({ bookmark }: any) {
    return (
        <a href={bookmark.url} target="_blank" rel="noreferrer" className="block bg-white p-6 rounded-[32px] shadow-sm hover:shadow-xl transition-all group border border-transparent hover:border-pink-100">
            <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-pink-50 text-pink-500 rounded-2xl group-hover:bg-pink-500 group-hover:text-white transition-colors">
                    <Bookmark size={20} />
                </div>
                <ExternalLink size={16} className="text-slate-300 group-hover:text-pink-400 transition-colors" />
            </div>
            <h4 className="font-bold text-[#232f55] line-clamp-2 mb-2 group-hover:text-pink-600 transition-colors">{bookmark.title || bookmark.url}</h4>
            <p className="text-xs text-slate-400 line-clamp-2">{bookmark.description || bookmark.url}</p>
        </a>
    )
}

function FilterButton({ icon, label, active, onClick, onClear }: any) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 md:px-6 md:py-3 rounded-2xl font-bold text-xs md:text-sm transition-all border",
          active ? "bg-[#232f55] text-white border-[#232f55] shadow-xl" : "bg-white border-white text-[#232f55]/40 hover:border-[#6ebeea]/30"
        )}
      >
        {icon} <span className="max-w-[100px] md:max-w-[120px] truncate">{label}</span>
      </button>
      {active && (
        <button
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="absolute -top-2 -right-2 w-5 h-5 md:w-6 md:h-6 bg-[#232f55] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all border-2 border-[#f2f4f2]"
        >
          <X size={10} strokeWidth={4} />
        </button>
      )}
    </div>
  )
}