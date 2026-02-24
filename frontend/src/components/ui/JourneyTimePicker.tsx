import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { journeySpring } from '../../lib/constants'
import { createPortal } from 'react-dom'

interface TimePickerProps {
  value: string // HH:MM format (24-hour)
  onChange: (time: string) => void
  placeholder?: string
  className?: string
}

export function TimePicker({ value, onChange, placeholder = 'Select time', className }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hour, setHour] = useState(value ? parseInt(value.split(':')[0]) : 12)
  const [minute, setMinute] = useState(value ? parseInt(value.split(':')[1]) : 0)
  
  const hourRef = useRef<HTMLDivElement>(null)
  const minuteRef = useRef<HTMLDivElement>(null)

  // 打开时同步 value 到内部状态
  useEffect(() => {
    if (isOpen && value) {
      setHour(parseInt(value.split(':')[0]))
      setMinute(parseInt(value.split(':')[1]))
    }
  }, [isOpen, value])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (hourRef.current) {
          const hourItem = hourRef.current.querySelector(`[data-hour="${hour}"]`)
          if (hourItem) hourItem.scrollIntoView({ block: 'center', behavior: 'auto' })
        }
        if (minuteRef.current) {
          const minuteItem = minuteRef.current.querySelector(`[data-minute="${minute}"]`)
          if (minuteItem) minuteItem.scrollIntoView({ block: 'center', behavior: 'auto' })
        }
      }, 0)
    }
  }, [isOpen, hour, minute])

  const handleConfirm = () => {
    onChange(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
    setIsOpen(false)
  }

  // 使用 24 小时制数字格式
  const formatDisplay = (timeStr: string) => {
    if (!timeStr) return placeholder
    return timeStr // 直接返回 HH:MM 格式
  }

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: 60 }, (_, i) => i)

  return (
    <>
      <div className={cn("relative", className)}>
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 pointer-events-none"
        />
        <div
          onClick={() => setIsOpen(true)}
          className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2 cursor-pointer hover:border-slate-200 transition-all"
        >
          <Clock size={16} className="text-slate-400" />
          <span className={cn("text-sm font-medium tabular-nums", value ? "text-slate-700" : "text-slate-400")}>
            {formatDisplay(value)}
          </span>
        </div>
      </div>

      {isOpen && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[1500] bg-black/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={journeySpring}
            className="fixed inset-x-3 bottom-3 z-[1501] md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[360px]"
          >
            <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden p-5 md:p-6">
              {/* Header */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <Clock size={20} className="text-[#6ebeea]" />
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Time Picker</h3>
              </div>

              {/* Time Display */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div className="text-3xl md:text-4xl font-black text-slate-900 tabular-nums px-3 md:px-4 py-1.5 md:py-2">
                    {String(hour).padStart(2, '0')}
                  </div>
                  <div className="text-3xl md:text-4xl font-black text-slate-300">:</div>
                  <div className="text-3xl md:text-4xl font-black text-slate-900 tabular-nums px-3 md:px-4 py-1.5 md:py-2">
                    {String(minute).padStart(2, '0')}
                  </div>
                </div>

                {/* Wheel Pickers */}
                <div className="flex gap-3 md:gap-4 mb-6">
                  {/* Hour Picker */}
                  <div className="flex-1">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <button
                        onClick={() => setHour((h) => (h + 1) % 24)}
                        className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
                      >
                        <ChevronUp size={16} />
                      </button>
                    </div>
                    <div 
                      ref={hourRef}
                      className="h-28 md:h-32 overflow-y-auto scrollbar-hide bg-slate-50 rounded-xl md:rounded-2xl"
                    >
                      <div className="py-6 md:py-8">
                        {hours.map(h => (
                          <button
                            key={h}
                            data-hour={h}
                            onClick={() => setHour(h)}
                            className={cn(
                              "w-[calc(100%-12px)] mx-1.5 md:mx-2 py-2 text-base md:text-lg font-bold transition-all rounded-lg md:rounded-xl",
                              hour === h 
                                ? "bg-slate-200 text-slate-900 shadow-sm" 
                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            )}
                          >
                            {String(h).padStart(2, '0')}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <button
                        onClick={() => setHour((h) => (h - 1 + 24) % 24)}
                        className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                    <p className="text-[10px] font-black uppercase text-slate-300 text-center mt-2 tracking-widest">Hour</p>
                  </div>

                  {/* Minute Picker */}
                  <div className="flex-1">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <button
                        onClick={() => setMinute((m) => (m + 5) % 60)}
                        className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
                      >
                        <ChevronUp size={16} />
                      </button>
                    </div>
                    <div 
                      ref={minuteRef}
                      className="h-28 md:h-32 overflow-y-auto scrollbar-hide bg-slate-50 rounded-xl md:rounded-2xl"
                    >
                      <div className="py-6 md:py-8">
                        {minutes.map(m => (
                          <button
                            key={m}
                            data-minute={m}
                            onClick={() => setMinute(m)}
                            className={cn(
                              "w-[calc(100%-12px)] mx-1.5 md:mx-2 py-2 text-base md:text-lg font-bold transition-all rounded-lg md:rounded-xl",
                              minute === m 
                                ? "bg-slate-200 text-slate-900 shadow-sm" 
                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            )}
                          >
                            {String(m).padStart(2, '0')}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <button
                        onClick={() => setMinute((m) => (m - 5 + 60) % 60)}
                        className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                    <p className="text-[10px] font-black uppercase text-slate-300 text-center mt-2 tracking-widest">Minute</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex-1 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-sm font-bold bg-[#6ebeea] text-white hover:bg-[#5da8d4] transition-all"
                  >
                    Confirm
                  </button>
                </div>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}