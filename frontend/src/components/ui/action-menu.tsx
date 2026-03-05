import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
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
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuStyle({
        position: 'fixed',
        top: `${rect.bottom + 8}px`,
        left: `${rect.right - 192}px`, // 192px is w-48
        width: '192px',
        zIndex: 9999
      })
    }
  }, [])

  const toggle = (e: React.MouseEvent | React.PointerEvent) => {
    // 统一在这里彻底阻断任何形式的冒泡，包括原生和 Framer Motion
    e.stopPropagation()
    if (!isOpen) updatePosition()
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    if (isOpen) {
      const close = () => setIsOpen(false)
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      window.addEventListener('mousedown', close)
      window.addEventListener('touchstart', close)
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
        window.removeEventListener('mousedown', close)
        window.removeEventListener('touchstart', close)
      }
    }
  }, [isOpen, updatePosition])

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggle}
        onPointerDown={e => e.stopPropagation()}
        className={cn(
          "p-2.5 rounded-xl border border-slate-100 shadow-sm text-slate-400 hover:text-[#232f55] transition-colors bg-white relative",
          isOpen && "bg-slate-50 text-[#232f55] z-10"
        )}
      >
        <MoreHorizontal size={18} />
      </button>

      {isOpen && createPortal(
        <AnimatePresence mode="wait">
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            style={menuStyle}
            className="bg-white/95 backdrop-blur-xl rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/50 p-1.5 flex flex-col gap-0.5"
            onClick={e => e.stopPropagation()}
          >
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation()
                  action.onClick()
                  setIsOpen(false)
                }}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] text-sm font-bold transition-all w-full text-left",
                  action.variant === 'danger' ? "text-red-500 hover:bg-red-50" : "text-[#232f55] hover:bg-slate-50"
                )}
              >
                {action.icon && <span className="opacity-70">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
