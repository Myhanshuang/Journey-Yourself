import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { statsApi } from '../lib/api'
import { Card, cn } from '../components/ui/JourneyUI'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts'
import { Zap, BookOpen, Target, Activity } from 'lucide-react'

const COLORS = ['#232f55', '#6ebeea', '#D4A373', '#ef4444', '#8b5cf6', '#ec4899']
const RANGE_OPTIONS = [7, 30, 90, 180]

export default function StatsView() {
  const [days, setDays] = useState(30)
  const { data, isLoading } = useQuery({ 
    queryKey: ['stats', days], 
    queryFn: () => statsApi.get(days) 
  })

  if (isLoading) return (
    <div className="h-[80vh] flex items-center justify-center">
       <div className="flex flex-col items-center gap-4">
          <Activity className="animate-pulse text-[#6ebeea]" size={48}/>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-300">Gathering Insights...</p>
       </div>
    </div>
  )

  const { summary, mood_distribution: moods, activity_trend: trend } = data

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-12 space-y-12 pb-40 text-[#232f55]">
      <header className="space-y-3">
        <h2 className="text-7xl font-black tracking-tighter leading-none">Insights</h2>
        <p className="text-2xl text-slate-400 font-medium italic opacity-70">The geometry of your soul.</p>
      </header>

      {/* 核心指标 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard label="Total Words" value={summary.total_words.toLocaleString()} sub="Ink on digital paper" icon={<Zap size={20}/>} color="blue" />
        <StatCard label="Writing Streak" value={`${summary.streak} Days`} sub="Continuous discipline" icon={<Target size={20}/>} color="lightBlue" />
        <StatCard label="Total Entries" value={summary.total_entries} sub="Snapshots of time" icon={<BookOpen size={20}/>} color="sand" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* 活跃趋势 - 占据 3/5 */}
        <Card className="lg:col-span-3 p-10 space-y-10 border-none shadow-2xl bg-white/60">
          <div className="flex items-center justify-between">
             <div className="space-y-1 text-[#232f55]">
                <h3 className="text-2xl font-black tracking-tight">Writing Intensity</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Activity analysis</p>
             </div>
             {/* 维度切换滑块 */}
             <div className="bg-[#f2f4f2] p-1 rounded-2xl flex gap-1 shadow-inner">
                {RANGE_OPTIONS.map(r => (
                  <button 
                    key={r} onClick={() => setDays(r)}
                    className={cn(
                      "px-4 py-2 rounded-[12px] text-[10px] font-black uppercase transition-all",
                      days === r ? "bg-white text-[#232f55] shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {r}D
                  </button>
                ))}
             </div>
          </div>

          <div className="h-80 w-full" style={{ minHeight: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6ebeea" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6ebeea" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e1e2dc" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 'bold' }} 
                  minTickGap={30}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 'bold' }}
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ stroke: '#6ebeea', strokeWidth: 1 }}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }} 
                />
                <Area type="monotone" dataKey="count" stroke="#6ebeea" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 情感光谱 - 占据 2/5 */}
        <Card className="lg:col-span-2 p-10 space-y-10 border-none shadow-2xl bg-white/60">
          <h3 className="text-2xl font-black tracking-tight text-[#232f55]">Emotional Spectrum</h3>
          <div className="h-80 w-full flex flex-col items-center justify-center" style={{ minHeight: '320px' }}>
            <ResponsiveContainer width="100%" height="60%">
              <PieChart>
                <Pie data={moods} innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="count" nameKey="label" stroke="none">
                  {moods.map((_:any, index:number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={10} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-8">
               {moods.slice(0, 6).map((m: any, i: number) => (
                 <div key={m.label} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{m.label}</span>
                    <span className="text-xs font-black text-[#232f55] ml-auto">{m.count}</span>
                 </div>
               ))}
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  )
}

function StatCard({ label, value, sub, icon, color }: any) {
  const themes = {
    blue: "text-[#232f55] bg-[#232f55]/5 shadow-[#232f55]/10",
    lightBlue: "text-[#6ebeea] bg-[#6ebeea]/10 shadow-[#6ebeea]/10",
    sand: "text-[#D4A373] bg-[#D4A373]/10 shadow-[#D4A373]/10"
  }
  return (
    <Card className="p-10 flex flex-col gap-8 border-none shadow-2xl bg-white/80 group">
      <div className={cn("w-14 h-14 rounded-[20px] flex items-center justify-center transition-transform group-hover:scale-110 duration-500", themes[color as keyof typeof themes])}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300 mb-1">{label}</p>
        <p className="text-5xl font-black text-[#232f55] tracking-tighter">{value}</p>
        <p className="text-xs font-bold text-slate-400 mt-2 italic opacity-60">{sub}</p>
      </div>
    </Card>
  )
}
