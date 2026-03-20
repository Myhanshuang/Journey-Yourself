import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"
import { useIsMobile } from "../../hooks/useMobile"
import { Button } from "./button"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  description?: string
  /**
   * - 'dialog': Standard centered modal (default for desktop)
   * - 'sheet': Bottom sheet (default for mobile often)
   * - 'fullscreen': Full screen takeover
   */
  variant?: 'dialog' | 'sheet' | 'fullscreen'
  className?: string
}

export function Modal({ 
  isOpen, 
  onClose, 
  children, 
  title, 
  description, 
  variant = 'dialog', // Logic will adapt based on mobile
  className 
}: ModalProps) {
  const isMobile = useIsMobile()
  
  // Determine effective variant based on device if not forced
  const effectiveVariant = isMobile ? (variant === 'dialog' ? 'sheet' : variant) : variant

  // Animation configurations
  const variants = {
    dialog: {
      initial: { opacity: 0, scale: 0.95, y: 0 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: 0 },
      container: "fixed inset-0 z-[320] flex items-center justify-center p-4 sm:p-6",
      content: "w-full max-w-md rounded-[32px] bg-white p-4 shadow-xl max-h-[85vh] sm:aspect-[9/16] flex flex-col overflow-hidden"
    },
    sheet: {
      initial: { opacity: 0, y: "100%" },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: "100%" },
      container: "fixed inset-0 z-[320] flex items-end justify-center sm:items-center",
      content: "w-full rounded-t-[24px] sm:rounded-[32px] bg-white shadow-xl max-h-[90vh] sm:w-[min(30rem,calc(100vw-3rem))] sm:aspect-[9/16] flex flex-col pb-safe overflow-hidden" 
    },
    fullscreen: {
      initial: { opacity: 0, scale: 0.95, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: 20 },
      container: "fixed inset-0 z-[320] bg-background",
      content: "w-full h-full bg-background flex flex-col"
    }
  }

  const current = variants[effectiveVariant]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[310]"
        >
          {/* Backdrop */}
          {effectiveVariant !== 'fullscreen' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
          )}

          {/* Modal Content */}
          <div className={cn(current.container, "pointer-events-none")}>
            <motion.div
              initial={current.initial}
              animate={current.animate}
              exit={current.exit}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(current.content, "pointer-events-auto", className)}
            >
              {/* Header */}
              {(title || description || effectiveVariant === 'fullscreen') && (
                <div className={cn("flex items-start justify-between mb-3 flex-shrink-0", effectiveVariant === 'sheet' && "px-4 pt-4", effectiveVariant === 'dialog' && "px-1 pt-1", effectiveVariant === 'fullscreen' && "px-4 py-3 border-b")}>
                  <div className="space-y-1 pr-8">
                    {title && <h3 className="text-2xl font-black tracking-tight text-[#232f55]">{title}</h3>}
                    {description && <p className="text-sm text-slate-400 font-medium">{description}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100 -mr-2 -mt-2">
                    <X size={24} className="text-slate-400" />
                  </Button>
                </div>
              )}

              {/* Scrollable Content Area */}
              <div className={cn("flex-1 overflow-y-auto min-h-0", effectiveVariant === 'sheet' && "px-4 pb-4", effectiveVariant === 'dialog' && "px-1 pb-1")}>
                {children}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
