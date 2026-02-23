import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { create } from 'zustand'
import { cn } from '../lib/utils'
import { Typography } from '../components/ui/typography'

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

  const handleConfirm = () => {
    config.onConfirm()
    close()
  }

  return createPortal(
    <AnimatePresence>
      {config.show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[1500] bg-black/20 backdrop-blur-sm"
          />
          
          {/* Modal - using SelectionModal style */}
          <div className="fixed inset-0 z-[1501] flex items-end justify-center sm:items-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full rounded-t-[32px] sm:rounded-[40px] bg-white shadow-xl max-h-[90vh] flex flex-col pb-safe pointer-events-auto max-w-md"
            >
              {/* Header */}
              <div className="flex-none px-6 pt-6 pb-4">
                <Typography variant="h3" className="text-[#232f55] mb-1">{config.title}</Typography>
                <Typography variant="label" className="text-slate-400 block">{config.message}</Typography>
              </div>

              {/* Footer / Actions */}
              <div className="flex-none px-6 pb-safe pt-2 bg-white/95 backdrop-blur-sm border-t border-slate-50 mt-auto">
                <div className="flex gap-3 py-4">
                  <button 
                    onClick={close}
                    className="flex-1 rounded-2xl h-12 text-slate-400 hover:bg-slate-50 hover:text-slate-600 font-black uppercase tracking-widest text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirm}
                    className={cn(
                      "flex-[2] rounded-2xl h-12 shadow-xl font-black uppercase tracking-widest text-xs text-white transition-all active:scale-95",
                      config.type === 'danger' 
                        ? "bg-rose-500 shadow-rose-500/20 hover:bg-rose-600" 
                        : "bg-[#232f55] shadow-[#232f55]/20 hover:bg-[#232f55]/90"
                    )}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}