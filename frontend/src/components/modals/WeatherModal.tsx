import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { cn } from '../../lib/utils'
import { SelectionModal } from '../ui/selection-modal'
import { Typography } from '../ui/typography'

const WEATHER_PRESETS = [
  { emoji: '☀️', label: 'Clear' }, { emoji: '⛅️', label: 'Cloudy' }, { emoji: '☁️', label: 'Overcast' },
  { emoji: '🌧️', label: 'Rainy' }, { emoji: '⛈️', label: 'Stormy' }, { emoji: '❄️', label: 'Snowy' },
  { emoji: '💨', label: 'Windy' }, { emoji: '🌫️', label: 'Foggy' }
]

export default function WeatherModal({ onSelect, onClose, currentData }: any) {
  const [selectedWeather, setSelectedWeather] = useState(currentData?.weather || '☀️')
  const [temp, setTemp] = useState(currentData?.temperature || 25)

  const handleConfirm = () => {
    onSelect({ weather: selectedWeather, temperature: temp })
    onClose()
  }

  return (
    <SelectionModal
      isOpen={true}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Weather Mood"
      subtitle="Capture the atmosphere"
      variant="sheet"
      className="md:max-w-md md:mx-auto"
    >
      {/* 气象 Emoji 选择 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {WEATHER_PRESETS.map(w => (
          <button 
            key={w.label} 
            onClick={() => setSelectedWeather(w.emoji)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-3xl transition-all border border-transparent",
              selectedWeather === w.emoji 
                ? "bg-indigo-600 text-white shadow-xl scale-105" 
                : "bg-slate-50 hover:bg-slate-100 text-slate-400"
            )}
          >
              <span className="text-3xl filter drop-shadow-sm">{w.emoji}</span>
              <Typography variant="label" className={cn("text-[9px]", selectedWeather === w.emoji && "text-white opacity-90")}>{w.label}</Typography>
          </button>
        ))}
      </div>

      {/* 温度调节 */}
      <div className="space-y-4 pb-4">
        <Typography variant="label" className="ml-2 block">Apparent Temperature</Typography>
        <div className="flex items-center justify-between bg-slate-50 p-6 rounded-[32px] border border-slate-100 shadow-inner">
            <button 
              onClick={() => setTemp(temp - 1)} 
              className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
            >
              <Minus size={24} className="text-slate-600"/>
            </button>
            <div className="flex flex-col items-center">
              <span className="text-5xl font-black text-[#232f55] tabular-nums">{temp}°</span>
              <span className="text-[9px] font-black uppercase text-indigo-400">Celsius</span>
            </div>
            <button 
              onClick={() => setTemp(temp + 1)} 
              className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-500 transition-all active:scale-95"
            >
              <Plus size={24} className="text-slate-600"/>
            </button>
        </div>
      </div>
    </SelectionModal>
  )
}
