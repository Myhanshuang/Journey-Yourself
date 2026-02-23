import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface ActionItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
}

export function ActionMenu({ actions }: { actions: ActionItem[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={cn("p-3 rounded-2xl border border-slate-100 shadow-sm text-slate-400 hover:text-[#232f55] transition-colors bg-white", isOpen && "bg-slate-50 text-[#232f55]")}
      >
        <MoreHorizontal size={18} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-48 bg-white/90 backdrop-blur-xl rounded-[24px] shadow-2xl border border-white/50 overflow-hidden z-50 p-2 flex flex-col gap-1"
          >
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => { action.onClick(); setIsOpen(false) }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-[16px] text-sm font-bold transition-all w-full text-left",
                  action.variant === 'danger' 
                    ? "text-red-500 hover:bg-red-50" 
                    : "text-[#232f55] hover:bg-[#f2f4f2]"
                )}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
