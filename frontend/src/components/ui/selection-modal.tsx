import React from 'react'
import { Modal } from './modal'
import { Button } from './button'
import { Typography } from './typography'
import { cn } from '../../lib/utils'

interface SelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  confirmLabel?: string
  loading?: boolean
  variant?: 'dialog' | 'sheet' | 'fullscreen'
  className?: string
}

export function SelectionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  children,
  confirmLabel = 'Confirm',
  loading = false,
  variant = 'sheet', // Defaults to sheet for mobile-first selection flow
  className
}: SelectionModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant={variant}
      className={cn("flex flex-col max-h-[90vh] overflow-hidden", className)}
    >
      {/* Header */}
      <div className="flex-none px-4 pt-4 pb-3">
        <Typography variant="h3" className="text-[#232f55] mb-1">{title}</Typography>
        {subtitle && <Typography variant="label" className="text-slate-400 block">{subtitle}</Typography>}
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-3 min-h-0">
        {children}
      </div>

      {/* Footer / Actions */}
      <div className="flex-none px-4 pb-safe pt-1 bg-white/95 backdrop-blur-sm border-t border-slate-50 mt-auto overflow-hidden">
        <div className="flex gap-3 py-3">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="flex-1 rounded-2xl h-12 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            Cancel
          </Button>
          {onConfirm && (
            <Button 
              onClick={onConfirm}
              loading={loading}
              className="flex-[2] rounded-2xl h-12 shadow-xl shadow-[#232f55]/20 text-white"
            >
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
