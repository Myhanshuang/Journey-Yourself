import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { diaryApi, userApi } from '../lib/api'
import { DiaryItemCard } from '../components/ui/JourneyUI'
import { Sparkles } from 'lucide-react'

interface OutletContextType {
  notebooks: any[]
  setNotebookModal: (config: { show: boolean; data?: any; afterCreate?: () => void }) => void
  handleWriteClick: () => void
}

export default function HomeView() {
  const navigate = useNavigate()
  const outletContext = useOutletContext<OutletContextType>()

  const { data: user } = useQuery({ queryKey: ['user', 'me'], queryFn: userApi.me })
  const { data: recent = [] } = useQuery({ queryKey: ['diaries', 'recent'], queryFn: () => diaryApi.recent() })
  const { data: lastYear = [] } = useQuery({ queryKey: ['diaries', 'lastYear'], queryFn: diaryApi.lastYearToday })

  const Greeting = () => {
    const hr = new Date().getHours()
    if (hr < 12) return 'Morning'
    if (hr < 18) return 'Afternoon'
    return 'Evening'
  }

  const handleDiaryClick = (diary: any) => {
    navigate(`/diaries/${diary.id}`)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 md:space-y-20 pb-40 text-[#232f55]">
      {/* 问候语区 */}
      <section className="flex items-end justify-between px-2 pt-4">
        <div className="space-y-2 md:space-y-3">
          <div className="flex items-center gap-3 text-[#6ebeea] font-black text-[9px] md:text-[10px] uppercase tracking-[0.4em]">
            <Sparkles size={14} strokeWidth={3} />
            <span>{Greeting()}, {user?.username}</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.95]">Your day,<br />refined.</h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.05, rotate: 5 }} whileTap={{ scale: 0.9 }}
          onClick={outletContext.handleWriteClick}
          className="w-20 h-20 bg-[#232f55] text-white rounded-[32px] flex items-center justify-center shadow-2xl shadow-[#232f55]/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        </motion.button>
      </section>

      {/* 去年今日 */}
      {lastYear.length > 0 && (
        <section className="space-y-6 md:space-y-8 px-2">
          <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-[#232f55]/30 ml-2 md:ml-4">On this day last year</h3>
          <div className="grid grid-cols-1 gap-6 md:gap-10">
            {lastYear.map((d: any) => <DiaryItemCard key={d.id} diary={d} size="lg" onClick={() => handleDiaryClick(d)} />)}
          </div>
        </section>
      )}

      {/* 最近记录：不规则瀑布流 */}
      <section className="space-y-6 md:space-y-8 px-2">
        <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-[#232f55]/30 ml-2 md:ml-4">Recent Chronicles</h3>
        <div className="columns-1 md:columns-2 gap-6 md:gap-8 space-y-6 md:space-y-8">
          {recent.map((d: any, idx: number) => (
            <div key={d.id} className="break-inside-avoid">
              <DiaryItemCard
                diary={d}
                size={idx % 3 === 0 ? 'md' : 'sm'}
                onClick={() => handleDiaryClick(d)}
                className="w-full shadow-sm"
              />
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  )
}
