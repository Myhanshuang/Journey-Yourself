import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { create } from 'zustand'
import { cn } from '../lib/utils'

interface ToastStore {
  toasts: Array<{ id: string; type: string; message: string }>
  add: (type: string, message: string) => void
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  add: (type, message) => {
    const id = Math.random().toString(36).substr(2, 9)
    set(s => ({ toasts: [...s.toasts, { id, type, message }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4000)
  }
}))

export function ToastContainer() {
  const { toasts } = useToast()
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[2000] flex flex-col gap-3 items-center pointer-events-none text-[#232f55]">
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <motion.div
            key={t.id}
            layout
            initial={{ y: -40, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            className={cn(
              "px-8 py-4 rounded-full backdrop-blur-3xl shadow-[0_20px_40px_rgba(35,47,85,0.08)] border border-white/50 flex items-center gap-4 pointer-events-auto bg-white/80",
              t.type === 'success' ? "text-emerald-700" : "text-rose-600"
            )}
          >
            <span className="text-[13px] font-bold tracking-tight">{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}
