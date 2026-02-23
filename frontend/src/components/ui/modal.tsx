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
      container: "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6",
      content: "w-full max-w-lg rounded-[40px] bg-white p-6 shadow-xl max-h-[85vh] flex flex-col"
    },
    sheet: {
      initial: { opacity: 0, y: "100%" },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: "100%" },
      container: "fixed inset-0 z-50 flex items-end justify-center sm:items-center",
      content: "w-full rounded-t-[32px] sm:rounded-[40px] bg-white shadow-xl max-h-[90vh] flex flex-col pb-safe" 
    },
    fullscreen: {
      initial: { opacity: 0, scale: 0.95, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: 20 },
      container: "fixed inset-0 z-50 bg-background",
      content: "w-full h-full bg-background flex flex-col"
    }
  }

  const current = variants[effectiveVariant]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          {effectiveVariant !== 'fullscreen' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
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
                <div className={cn("flex items-start justify-between mb-4 flex-shrink-0", effectiveVariant === 'sheet' && "px-6 pt-6", effectiveVariant === 'dialog' && "px-2 pt-2", effectiveVariant === 'fullscreen' && "px-6 py-4 border-b")}>
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
              <div className={cn("flex-1 overflow-y-auto min-h-0", effectiveVariant === 'sheet' && "px-6 pb-8", effectiveVariant === 'dialog' && "px-2 pb-2")}>
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
