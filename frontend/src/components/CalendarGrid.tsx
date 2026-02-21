import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'
import { journeySpring } from '../lib/constants'
import { useAdjustedTime } from '../hooks/useAdjustedTime'

interface CalendarGridProps {
  diaries: any[]
  onDateClick: (diaries: any[]) => void
}

export function CalendarGrid({ diaries, onDateClick }: CalendarGridProps) {
  const [curr, setCurr] = useState(new Date())
  const { getAdjusted } = useAdjustedTime()

  const days = Array.from(
    { length: new Date(curr.getFullYear(), curr.getMonth() + 1, 0).getDate() },
    (_, i) => i + 1
  )
  const startPad = Array.from(
    { length: new Date(curr.getFullYear(), curr.getMonth(), 1).getDay() },
    (_, i) => i
  )

  return (
    <div className="p-6 md:p-16 max-w-[1000px] mx-auto bg-white/60 border-none shadow-2xl text-slate-900 rounded-[40px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 md:mb-16">
        <div className="flex items-center gap-4 md:gap-10">
          <h3 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900">
            {curr.toLocaleString('en', { month: 'long' })}
          </h3>
          <div className="flex items-center gap-2 md:gap-3 bg-slate-100 p-1 md:p-1.5 rounded-2xl">
            <button
              onClick={() => setCurr(new Date(curr.setFullYear(curr.getFullYear() - 1)))}
              className="p-1.5 md:p-2 hover:bg-white rounded-xl text-slate-400"
            >
              <ChevronsLeft size={18} />
            </button>
            <span className="px-2 md:px-4 text-base md:text-lg font-black text-indigo-600">
              {curr.getFullYear()}
            </span>
            <button
              onClick={() => setCurr(new Date(curr.setFullYear(curr.getFullYear() + 1)))}
              className="p-1.5 md:p-2 hover:bg-white rounded-xl text-slate-400"
            >
              <ChevronsRight size={18} />
            </button>
          </div>
        </div>
        <div className="flex gap-3 md:gap-4">
          <button
            onClick={() => setCurr(new Date(curr.setMonth(curr.getMonth() - 1)))}
            className="p-3 md:p-4 bg-white shadow-md rounded-2xl md:rounded-[24px] hover:bg-slate-50 transition-all border border-slate-100 text-slate-900"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurr(new Date(curr.setMonth(curr.getMonth() + 1)))}
            className="p-3 md:p-4 bg-white shadow-md rounded-2xl md:rounded-[24px] hover:bg-slate-50 transition-all border border-slate-100 text-slate-900"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3 md:gap-8 text-center text-slate-900">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <span key={d} className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-300 mb-3 md:mb-6">
            {d}
          </span>
        ))}

        {startPad.map(p => <div key={`p-${p}`} />)}

        {days.map(day => {
          const datePrefix = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayDiaries = diaries.filter((d: any) => getAdjusted(d.date).toISOString().startsWith(datePrefix))
          const hasDiaries = dayDiaries.length > 0

          return (
            <motion.button
              whileHover={{ scale: 1.1 }}
              key={day}
              onClick={() => hasDiaries && onDateClick(dayDiaries)}
              transition={journeySpring}
              className={cn(
                "aspect-square rounded-2xl md:rounded-[32px] flex flex-col items-center justify-center relative transition-all group border-2",
                hasDiaries
                  ? "bg-indigo-600 border-indigo-400 text-white shadow-xl"
                  : "bg-white border-transparent text-slate-400 font-bold hover:border-slate-100"
              )}
            >
              <span className="text-base md:text-xl font-black">{day}</span>
              {hasDiaries && dayDiaries.length > 1 && (
                <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 bg-white text-indigo-600 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black flex items-center justify-center shadow-xl border border-indigo-100">
                  {dayDiaries.length}
                </div>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
