import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Calendar } from 'lucide-react'
import { cn } from '../../lib/utils'
import { journeySpring } from '../../lib/constants'
import { createPortal } from 'react-dom'

interface DatePickerProps {
  value: string // YYYY-MM-DD format
  onChange: (date: string) => void
  placeholder?: string
  className?: string
}

export function DatePicker({ value, onChange, placeholder = 'Select date', className }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewDate, setViewDate] = useState(value ? new Date(value + 'T00:00:00') : new Date())
  const [tempSelected, setTempSelected] = useState<string | null>(null) // 临时选中状态

  // 打开时同步 viewDate 和临时选中状态
  useEffect(() => {
    if (isOpen) {
      if (value) {
        setViewDate(new Date(value + 'T00:00:00'))
        setTempSelected(value)
      } else {
        setTempSelected(null)
      }
    }
  }, [isOpen, value])

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const startPad = Array.from(
    { length: new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() },
    (_, i) => i
  )

  // 点击日期只做选择，不保存
  const handleSelect = (day: number) => {
    const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setTempSelected(dateStr)
  }

  // 保存并关闭
  const handleSave = () => {
    if (tempSelected) {
      onChange(tempSelected)
    }
    setIsOpen(false)
  }

  // 取消关闭
  const handleCancel = () => {
    setIsOpen(false)
  }

  // 使用数字格式显示日期
  const formatDisplay = (dateStr: string) => {
    if (!dateStr) return placeholder
    return dateStr // 直接返回 YYYY-MM-DD 格式
  }

  // 解析临时选中的日期
  const selectedDay = tempSelected ? parseInt(tempSelected.split('-')[2]) : null
  const selectedMonth = tempSelected ? parseInt(tempSelected.split('-')[1]) - 1 : null
  const selectedYear = tempSelected ? parseInt(tempSelected.split('-')[0]) : null

  // 判断是否是今天
  const today = new Date()
  const isToday = (day: number) => 
    day === today.getDate() && 
    viewDate.getMonth() === today.getMonth() && 
    viewDate.getFullYear() === today.getFullYear()

  return (
    <>
      <div className={cn("relative", className)}>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 pointer-events-none"
        />
        <div
          onClick={() => setIsOpen(true)}
          className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2 cursor-pointer hover:border-slate-200 transition-all"
        >
          <Calendar size={16} className="text-slate-400" />
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
            onClick={handleCancel}
            className="fixed inset-0 z-[1500] bg-black/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={journeySpring}
            className="fixed inset-x-3 bottom-3 z-[1501] md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px]"
          >
            <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden p-5 md:p-6">
              {/* Header */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <Calendar size={20} className="text-[#6ebeea]" />
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Date Picker</h3>
              </div>

              {/* 年份和月份控制 - 年份在左，月份在右 */}
              <div className="flex items-center justify-between gap-4 mb-6">
                {/* 年份控制 - 左边 */}
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
                  <button
                    onClick={() => setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1))}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <span className="px-3 text-base md:text-lg font-black bg-slate-200 text-slate-900 rounded-lg py-1 tabular-nums min-w-[60px] text-center">
                    {viewDate.getFullYear()}
                  </span>
                  <button
                    onClick={() => setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1))}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>

                {/* 月份控制 - 右边 */}
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
                  <button
                    onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-3 text-base md:text-lg font-black bg-slate-200 text-slate-900 rounded-lg py-1 tabular-nums min-w-[44px] text-center">
                    {String(viewDate.getMonth() + 1).padStart(2, '0')}
                  </span>
                  <button
                    onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1.5 md:gap-2 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <span key={i} className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-2">
                    {d}
                  </span>
                ))}

                {startPad.map(p => <div key={`p-${p}`} />)}

                {days.map(day => {
                  const isSelected = selectedDay === day && 
                                     selectedMonth === viewDate.getMonth() && 
                                     selectedYear === viewDate.getFullYear()

                  return (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      key={day}
                      onClick={() => handleSelect(day)}
                      transition={journeySpring}
                      className={cn(
                        "aspect-square rounded-xl md:rounded-2xl flex items-center justify-center text-sm font-bold transition-all",
                        isSelected
                          ? "bg-slate-200 text-slate-900 shadow-sm"
                          : isToday(day)
                            ? "bg-slate-100 text-slate-900 hover:bg-slate-200"
                            : "hover:bg-slate-100 text-slate-600"
                      )}
                    >
                      {day}
                    </motion.button>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="mt-5 flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-sm font-bold bg-[#6ebeea] text-white hover:bg-[#5da8d4] transition-all"
                >
                  Save
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
