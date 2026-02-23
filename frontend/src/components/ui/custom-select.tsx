import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useIsMobile } from '../../hooks/useMobile'

export type SelectOption = {
  value: string
  label: string
}

export function ConfigSelect({ 
  label, 
  options, 
  value, 
  onChange,
  theme = 'purple'
}: { 
  label: string
  options: SelectOption[]
  value: string
  onChange: (v: string) => void
  theme?: 'purple' | 'indigo' | 'emerald' | 'pink'
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  
  const themeStyles = {
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', hover: 'hover:bg-purple-100', ring: 'focus:ring-purple-100' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', hover: 'hover:bg-indigo-100', ring: 'focus:ring-indigo-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', hover: 'hover:bg-emerald-100', ring: 'focus:ring-emerald-100' },
    pink: { bg: 'bg-pink-50', text: 'text-pink-600', hover: 'hover:bg-pink-100', ring: 'focus:ring-pink-100' }
  }
  const style = themeStyles[theme]
  
  const selectedOption = options.find(o => o.value === value)
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="space-y-2" ref={selectRef}>
      <label className="text-[10px] font-black uppercase text-slate-300 ml-2 tracking-widest">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full text-left rounded-[20px] outline-none font-bold text-slate-700 border-2 border-transparent transition-all cursor-pointer flex items-center justify-between",
            style.ring,
            isMobile ? "px-5 py-3" : "px-6 py-4",
            isOpen ? style.bg : "bg-slate-50"
          )}
        >
          <span className={cn(isOpen && style.text)}>{selectedOption?.label || 'Select...'}</span>
          <ChevronRight className={cn("transition-transform", isOpen ? "rotate-90" : "rotate-0", isOpen && style.text)} size={18} />
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl rounded-[20px] shadow-2xl border border-white/50 overflow-hidden p-2"
            >
              {options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setIsOpen(false) }}
                  className={cn(
                    "w-full text-left px-5 py-3 rounded-xl font-bold transition-all",
                    value === opt.value 
                      ? cn(style.bg, style.text) 
                      : cn("text-slate-600", style.hover)
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
