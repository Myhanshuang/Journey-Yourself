/**
 * JourneyUI - UI 组件库
 * 
 * 导出所有 UI 组件和工具函数，保持向后兼容
 */

import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Trash2, Loader2, Image as ImageIcon, MapPin, MoreHorizontal, Bookmark } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

// Re-export from new locations
export { cn, getFirstImage, extractSnippet, getAssetUrl } from '../../lib/utils'
export { journeySpring, viewTransition } from '../../lib/constants'
export { useToast, ToastContainer } from '../../hooks/useToast'
export { useConfirm, GlobalConfirmModal } from '../../hooks/useConfirm'
export { useAdjustedTime } from '../../hooks/useAdjustedTime'
export { useIsMobile } from '../../hooks/useMobile'
// ... (imports)

// ... (other components)

export function ServiceSetupModal({ type, onClose }: { type: 'immich' | 'geo' | 'karakeep', onClose: () => void }) {
  const isMobile = useIsMobile()
  const config = {
    immich: {
      icon: <ImageIcon size={40} />,
      title: "Immich Required",
      desc: "Connect your Immich instance in Settings to access your personal photo library directly.",
    },
    geo: {
      icon: <MapPin size={40} />,
      title: "Location Services",
      desc: "Configure your Amap API Key in Settings to enable smart location tagging and weather updates.",
    },
    karakeep: {
      icon: <Bookmark size={40} />,
      title: "Karakeep Required",
      desc: "Connect your Karakeep account in Settings to access your bookmarks directly.",
    }
  }[type]

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/20 backdrop-blur-md p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("bg-white w-full text-center shadow-2xl border border-white", isMobile ? "p-6 rounded-[32px] max-w-xs" : "p-10 rounded-[48px] max-w-sm")}>
        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl mx-auto flex items-center justify-center mb-6">
          {config?.icon}
        </div>
        <h3 className="text-2xl font-black text-[#232f55] tracking-tight mb-2">{config?.title}</h3>
        <p className="text-slate-400 font-medium text-sm leading-relaxed mb-8">
          {config?.desc}
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={onClose} className="w-full py-4 bg-[#232f55] text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">I'll do it later</button>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Go to Settings {">"} Integrations</p>
        </div>
      </motion.div>
    </div>
  )
}