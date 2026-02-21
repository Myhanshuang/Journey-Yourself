import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Sun, Cloud, CloudRain, CloudLightning, Snowflake, Wind, Thermometer, Plus, Minus } from 'lucide-react'

const WEATHER_PRESETS = [
  { emoji: '☀️', label: 'Clear' }, { emoji: '⛅️', label: 'Cloudy' }, { emoji: '☁️', label: 'Overcast' },
  { emoji: '🌧️', label: 'Rainy' }, { emoji: '⛈️', label: 'Stormy' }, { emoji: '❄️', label: 'Snowy' },
  { emoji: '💨', label: 'Windy' }, { emoji: '🌫️', label: 'Foggy' }
]

export default function WeatherModal({ onSelect, onClose, currentData }: any) {
  const [selectedWeather, setSelectedWeather] = useState(currentData?.weather || '☀️')
  const [temp, setTemp] = useState(currentData?.temperature || 25)

  return (
    <div className="fixed inset-0 z-[210] bg-black/5 backdrop-blur-md flex items-center justify-center p-6 text-slate-900">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white p-10 rounded-[48px] max-w-md w-full shadow-2xl border border-white space-y-10">
         <div className="flex items-center justify-between text-slate-900">
            <h4 className="text-3xl font-black tracking-tighter">Weather Mood</h4>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-300 transition-colors"><X/></button>
         </div>

         {/* 气象 Emoji 选择 */}
         <div className="grid grid-cols-4 gap-4">
            {WEATHER_PRESETS.map(w => (
              <button 
                key={w.label} 
                onClick={() => setSelectedWeather(w.emoji)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-3xl transition-all border border-transparent",
                  selectedWeather === w.emoji ? "bg-indigo-600 text-white shadow-xl scale-105" : "bg-slate-50 hover:bg-slate-100 text-slate-400"
                )}
              >
                 <span className="text-3xl">{w.emoji}</span>
                 <span className="text-[9px] font-black uppercase tracking-widest">{w.label}</span>
              </button>
            ))}
         </div>

         {/* 温度调节 */}
         <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 ml-2">Apparent Temperature</p>
            <div className="flex items-center justify-between bg-slate-50 p-6 rounded-[32px] border border-slate-100 shadow-inner">
               <button onClick={() => setTemp(temp - 1)} className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all"><Minus/></button>
               <div className="flex flex-col items-center">
                  <span className="text-5xl font-black text-slate-900 tabular-nums">{temp}°</span>
                  <span className="text-[9px] font-black uppercase text-indigo-400">Celsius</span>
               </div>
               <button onClick={() => setTemp(temp + 1)} className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-500 transition-all"><Plus/></button>
            </div>
         </div>

         <button 
           onClick={() => onSelect({ weather: selectedWeather, temperature: temp })}
           className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black shadow-xl active:scale-95 transition-all text-xs uppercase tracking-widest"
         >
           Save Weather
         </button>
      </motion.div>
    </div>
  )
}

import { cn } from '../ui/JourneyUI'
