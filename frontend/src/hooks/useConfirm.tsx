import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { create } from 'zustand'
import { cn } from '../lib/utils'

interface ConfirmStore {
  config: {
    show: boolean
    title: string
    message: string
    onConfirm: () => void
    type: string
  } | null
  ask: (title: string, message: string, onConfirm: () => void, type?: string) => void
  close: () => void
}

export const useConfirm = create<ConfirmStore>((set) => ({
  config: null,
  ask: (title, message, onConfirm, type = 'danger') => set({ config: { show: true, title, message, onConfirm, type } }),
  close: () => set({ config: null })
}))

export function GlobalConfirmModal() {
  const { config, close } = useConfirm()
  if (!config) return null

  return createPortal(
    <AnimatePresence>
      {config.show && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-6 bg-[#232f55]/10 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            className="bg-[#f2f4f2] p-12 rounded-[48px] max-w-sm w-full shadow-[0_40px_80px_-20px_rgba(35,47,85,0.15)] border border-white/50"
          >
            <h4 className="text-3xl font-black text-[#232f55] tracking-tighter mb-4">{config.title}</h4>
            <p className="text-[#232f55]/60 text-sm font-medium leading-relaxed mb-10">{config.message}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { config.onConfirm(); close(); }}
                className={cn(
                  "w-full py-5 rounded-[24px] font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl",
                  config.type === 'danger' ? "bg-rose-500 text-white shadow-rose-100" : "bg-[#232f55] text-white shadow-[#232f55]/20"
                )}
              >
                Confirm
              </button>
              <button
                onClick={close}
                className="w-full py-5 text-[#232f55]/40 font-black text-xs uppercase tracking-widest hover:bg-white/50 rounded-[24px] transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
