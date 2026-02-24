import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutList, Calendar as CalendarIcon, X } from 'lucide-react'
import { cn, DiaryItemCard, useAdjustedTime } from '../components/ui/JourneyUI'
import { useQuery } from '@tanstack/react-query'
import { timelineApi } from '../lib/api'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { CalendarGrid } from '../components/CalendarGrid'

interface OutletContextType {
  notebooks: any[]
  setNotebookModal: (config: { show: boolean; data?: any; afterCreate?: () => void }) => void
  handleWriteClick: () => void
}

function FilterButton({ label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 md:px-7 md:py-3 rounded-2xl border-2 text-xs md:text-[13px] font-black whitespace-nowrap transition-all",
        active
          ? "bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-200"
          : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
      )}
    >
      {label}
    </button>
  )
}

export default function TimelineView() {
  const navigate = useNavigate()
  const [filterId, setFilterId] = useState<number | undefined>(undefined)
  const [mode, setMode] = useState<'stream' | 'calendar'>('stream')
  const [daySelection, setDaySelection] = useState<any[] | null>(null)
  const { getAdjusted } = useAdjustedTime()
  const outletContext = useOutletContext<OutletContextType>()
  const { notebooks } = outletContext

  const { data: diaries = [], isLoading } = useQuery({
    queryKey: ['timeline', filterId],
    queryFn: () => timelineApi.list(filterId)
  })

  // 数据分组逻辑：仅保留有数据的年份和月份
  const groupedData = diaries.reduce((acc: any, d: any) => {
    const adjDate = getAdjusted(d.date)
    const year = adjDate.getFullYear().toString()
    const month = adjDate.toLocaleString('en', { month: 'long' })
    if (!acc[year]) acc[year] = {}
    if (!acc[year][month]) acc[year][month] = []
    acc[year][month].push(d)
    return acc
  }, {})

  const years = Object.keys(groupedData).sort((a, b) => b.localeCompare(a))

  const handleDiaryClick = (diary: any) => {
    navigate(`/diaries/${diary.id}`)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-12 space-y-10 min-h-screen relative text-slate-900 max-w-[840px] mx-auto">
      <AnimatePresence>
        {daySelection && (
          <div className="fixed inset-0 z-[100] bg-black/5 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setDaySelection(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }} className="bg-white/90 p-12 rounded-[48px] max-w-2xl w-full shadow-2xl space-y-8" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h4 className="text-4xl font-black text-slate-900 tracking-tight">Memories</h4>
                <button onClick={() => setDaySelection(null)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400"><X size={24} /></button>
              </div>
              <div className="grid gap-6 max-h-[60vh] overflow-y-auto no-scrollbar pb-4">
                {daySelection.map(d => <DiaryItemCard key={d.id} diary={d} size="md" onClick={() => { handleDiaryClick(d); setDaySelection(null); }} />)}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="flex flex-col gap-6 md:gap-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-2 md:space-y-3 text-slate-900">
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter leading-none">Timeline</h2>
            <p className="text-lg md:text-2xl text-slate-400 font-medium italic opacity-70">Architecture of memory.</p>
          </div>
          <div className="bg-slate-200/50 backdrop-blur-md p-1 rounded-2xl flex shadow-inner border border-white/50 text-slate-900">
            <button onClick={() => setMode('stream')} className={cn("flex-1 px-4 py-2 md:px-6 md:py-2.5 rounded-xl md:rounded-[18px] text-xs font-black transition-all uppercase tracking-widest flex items-center justify-center gap-1.5", mode === 'stream' ? "bg-white text-indigo-600 shadow-xl" : "text-slate-500 hover:text-slate-700")}><LayoutList size={14} /> Stream</button>
            <button onClick={() => setMode('calendar')} className={cn("flex-1 px-4 py-2 md:px-6 md:py-2.5 rounded-xl md:rounded-[18px] text-xs font-black transition-all uppercase tracking-widest flex items-center justify-center gap-1.5", mode === 'calendar' ? "bg-white text-indigo-600 shadow-xl" : "text-slate-500 hover:text-slate-700")}><CalendarIcon size={14} /> Calendar</button>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar pb-2 text-slate-900">
          <FilterButton label="All Collections" active={filterId === undefined} onClick={() => setFilterId(undefined)} />
          {notebooks.map((nb: any) => <FilterButton key={nb.id} label={nb.name} active={filterId === nb.id} onClick={() => setFilterId(nb.id)} />)}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {isLoading ? <div className="py-40 text-center animate-pulse text-slate-300 font-black uppercase tracking-widest text-sm">Synchronizing...</div> :
          mode === 'stream' ? (
            <motion.div key="stream" className="space-y-32 relative pt-4">
              {years.map(year => (
                <div key={year} className="space-y-16 relative">
                  <div className="sticky top-[-1px] z-50 bg-[#F5F5F7] -mx-10 px-10 py-4 transition-all border-b border-transparent">
                    <div className="flex items-center gap-6">
                      <div className="px-5 py-1.5 bg-indigo-600 text-white rounded-[14px] font-black text-xl shadow-xl shadow-indigo-100 tracking-tighter">{year}</div>
                      <div className="h-px flex-1 bg-gradient-to-r from-indigo-100 to-transparent" />
                    </div>
                  </div>

                  {Object.keys(groupedData[year]).sort((a, b) => {
                    return new Date(`${b} 1, ${year}`).getTime() - new Date(`${a} 1, ${year}`).getTime()
                  }).map(month => {
                    const key = `${month} ${year}`
                    return (
                      <div key={key} className="space-y-8 relative">
                        <div className="sticky top-[64px] z-40 bg-[#F5F5F7] -mx-10 px-10 py-3">
                          <div className="flex items-center gap-5">
                            <div className="w-10 h-10 bg-slate-900 rounded-[14px] shadow-2xl flex items-center justify-center text-white font-black text-[10px] uppercase tracking-tighter">{month.substring(0, 3)}</div>
                            <h4 className="text-xl font-black text-slate-900 tracking-tight">{month}</h4>
                          </div>
                          <div className="absolute top-full inset-x-0 h-10 bg-gradient-to-b from-[#F5F5F7] to-transparent pointer-events-none" />
                        </div>
                        <div className="grid gap-6 relative z-10 px-4">
                          {groupedData[year][month].map((diary: any) => <DiaryItemCard key={diary.id} diary={diary} size="sm" onClick={() => handleDiaryClick(diary)} />)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </motion.div>
          ) : (
            <CalendarGrid diaries={diaries} onDateClick={(ds: any) => ds.length === 1 ? handleDiaryClick(ds[0]) : setDaySelection(ds)} />
          )}
      </AnimatePresence>
    </motion.div>
  )
}
