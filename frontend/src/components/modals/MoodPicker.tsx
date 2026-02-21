import { motion } from 'framer-motion'
import { cn } from '../ui/JourneyUI'

const MOOD_PRESETS = [
  { emoji: '😊', label: 'Happy' }, { emoji: '🤩', label: 'Excited' }, { emoji: '🥳', label: 'Celebrate' }, { emoji: '🌈', label: 'Inspired' },
  { emoji: '🤔', label: 'Thoughtful' }, { emoji: '🧘', label: 'Relaxed' }, { emoji: '☕️', label: 'Chill' }, { emoji: '🍕', label: 'Hungry' },
  { emoji: '😔', label: 'Sad' }, { emoji: '😭', label: 'Crying' }, { emoji: '😤', label: 'Angry' }, { emoji: '🫠', label: 'Melting' },
  { emoji: '😴', label: 'Tired' }, { emoji: '🤢', label: 'Sick' }, { emoji: '💼', label: 'Working' }, { emoji: '😇', label: 'Blessed' },
]

export default function MoodPicker({ mood, onSelect, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[210] bg-black/5 backdrop-blur-md flex items-center justify-center p-6 text-slate-900">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-10 rounded-[48px] max-w-lg w-full shadow-2xl border border-white">
         <h4 className="text-2xl font-black mb-8 tracking-tight text-center">How's the heart?</h4>
         <div className="grid grid-cols-4 gap-4">
            {MOOD_PRESETS.map(m => (
              <button key={m.label} onClick={() => onSelect(m)} className={cn("flex flex-col items-center gap-2 p-4 rounded-3xl transition-all border border-transparent", mood?.label === m.label ? "bg-indigo-600 text-white shadow-xl scale-105" : "bg-slate-50 hover:bg-slate-100 text-slate-400")}>
                 <span className="text-3xl">{m.emoji}</span>
                 <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
              </button>
            ))}
         </div>
         <button onClick={onClose} className="w-full mt-8 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-200">Close</button>
      </motion.div>
    </div>
  )
}
