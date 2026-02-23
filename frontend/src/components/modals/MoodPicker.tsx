import { useState } from 'react'
import { cn } from '../../lib/utils'
import { SelectionModal } from '../ui/selection-modal'
import { Typography } from '../ui/typography'

const MOOD_PRESETS = [
  { emoji: '😊', label: 'Happy' }, { emoji: '🤩', label: 'Excited' }, { emoji: '🥳', label: 'Celebrate' }, { emoji: '🌈', label: 'Inspired' },
  { emoji: '🤔', label: 'Thoughtful' }, { emoji: '🧘', label: 'Relaxed' }, { emoji: '☕️', label: 'Chill' }, { emoji: '🍕', label: 'Hungry' },
  { emoji: '😔', label: 'Sad' }, { emoji: '😭', label: 'Crying' }, { emoji: '😤', label: 'Angry' }, { emoji: '🫠', label: 'Melting' },
  { emoji: '😴', label: 'Tired' }, { emoji: '🤢', label: 'Sick' }, { emoji: '💼', label: 'Working' }, { emoji: '😇', label: 'Blessed' },
]

export default function MoodPicker({ mood, onSelect, onClose }: any) {
  const [selectedMood, setSelectedMood] = useState<any>(mood)

  const handleConfirm = () => {
    onSelect(selectedMood)
    onClose()
  }

  return (
    <SelectionModal
      isOpen={true}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="How's the heart?"
      subtitle="Select a mood that matches your vibe"
      variant="sheet"
      className="md:max-w-lg md:mx-auto"
    >
      <div className="grid grid-cols-4 gap-3 md:gap-4 pb-4">
         {MOOD_PRESETS.map(m => (
           <button 
             key={m.label} 
             onClick={() => setSelectedMood(m)} 
             className={cn(
               "flex flex-col items-center gap-2 p-3 md:p-4 rounded-3xl transition-all border border-transparent",
               selectedMood?.label === m.label 
                 ? "bg-indigo-600 text-white shadow-xl scale-105" 
                 : "bg-slate-50 hover:bg-slate-100 text-slate-400"
             )}
           >
              <span className="text-3xl filter drop-shadow-sm">{m.emoji}</span>
              <Typography variant="label" className={cn("text-[9px]", selectedMood?.label === m.label && "text-white opacity-90")}>{m.label}</Typography>
           </button>
         ))}
      </div>
    </SelectionModal>
  )
}
