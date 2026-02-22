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

// Import for local use
import { cn } from '../../lib/utils'
import { journeySpring } from '../../lib/constants'
import { getFirstImage, extractSnippet } from '../../lib/utils'
import { useAdjustedTime } from '../../hooks/useAdjustedTime'
import { useIsMobile } from '../../hooks/useMobile'
import { useMotionValue, useTransform } from 'framer-motion'

// --- Skeleton Component ---
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer rounded-[32px] bg-slate-100/50", className)} />
}

// --- UI Components ---
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

// --- Select Option Type ---
export type SelectOption = {
  value: string
  label: string
}

// --- Configurable Select Component ---
export function ConfigSelect({ 
  label, 
  options, 
  value, 
  onChange,
  theme = 'purple'
}: { 
  label: string
  options: SelectOption[]
  value: string
  onChange: (v: string) => void
  theme?: 'purple' | 'indigo' | 'emerald' | 'pink'
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  
  const themeStyles = {
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', hover: 'hover:bg-purple-100', ring: 'focus:ring-purple-100' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', hover: 'hover:bg-indigo-100', ring: 'focus:ring-indigo-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', hover: 'hover:bg-emerald-100', ring: 'focus:ring-emerald-100' },
    pink: { bg: 'bg-pink-50', text: 'text-pink-600', hover: 'hover:bg-pink-100', ring: 'focus:ring-pink-100' }
  }
  const style = themeStyles[theme]
  
  const selectedOption = options.find(o => o.value === value)
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="space-y-2" ref={selectRef}>
      <label className="text-[10px] font-black uppercase text-slate-300 ml-2 tracking-widest">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full text-left rounded-2xl outline-none font-bold text-slate-700 border-2 border-transparent transition-all cursor-pointer flex items-center justify-between",
            style.ring,
            isMobile ? "px-5 py-3" : "px-6 py-4",
            isOpen ? style.bg : "bg-slate-50"
          )}
        >
          <span className={cn(isOpen && style.text)}>{selectedOption?.label || 'Select...'}</span>
          <ChevronRight className={cn("transition-transform", isOpen ? "rotate-90" : "rotate-90", isOpen && style.text)} size={18} />
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden p-2"
            >
              {options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setIsOpen(false) }}
                  className={cn(
                    "w-full text-left px-5 py-3 rounded-xl font-bold transition-all",
                    value === opt.value 
                      ? cn(style.bg, style.text) 
                      : cn("text-slate-600", style.hover)
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function DiaryItemCard({ diary, onClick, className, size = 'md', noHoverEffect = false }: any) {
  const bgImage = getFirstImage(diary.content)
  const { getAdjusted } = useAdjustedTime()
  const isMobile = useIsMobile()
  const adjDate = getAdjusted(diary.date)
  const sizes = isMobile 
    ? { sm: "p-4", md: "p-5", lg: "p-6" } 
    : { sm: "p-6", md: "p-8", lg: "p-12" }

  return (
    <motion.div
      whileHover={!noHoverEffect ? { y: -8 } : {}}
      whileTap={!noHoverEffect ? { scale: 0.985 } : {}}
      transition={journeySpring}
      onClick={onClick}
      className={cn("relative bg-white/90 rounded-[40px] overflow-hidden cursor-pointer group shadow-[0_30px_60px_-12px_rgba(35,47,85,0.12)] transition-all flex flex-col", sizes[size as keyof typeof sizes], className)}
    >
      {bgImage && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <motion.img src={bgImage} initial={{ scale: 1.1 }} whileHover={{ scale: 1.15 }} transition={{ duration: 1.5 }} className="w-full h-full object-cover opacity-90" />
          <div className="absolute inset-0 z-10 bg-[#f2f4f2]/75 backdrop-blur-[1px]" />
          <div className="absolute inset-0 z-20 bg-gradient-to-br from-[#f2f4f2]/95 via-[#f2f4f2]/40 to-transparent" />
        </div>
      )}
      <div className="relative z-30 flex flex-col h-full text-[#232f55]">
        <div className={cn("flex items-center mb-6", isMobile ? "gap-4" : "gap-6")}>
          <div className={cn("bg-[#f2f4f2] rounded-[20px] flex flex-col items-center justify-center shadow-sm border border-white/50 flex-shrink-0 font-black", isMobile ? "w-12 h-12" : "w-14 h-14")}>
            <span className="text-[10px] text-[#232f55]/40 uppercase leading-none mb-1">{adjDate.toLocaleDateString('en', { month: 'short' })}</span>
            <span className={cn("leading-none text-[#232f55]", isMobile ? "text-xl" : "text-2xl")}>{adjDate.getDate()}</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className={cn("font-black truncate tracking-tighter leading-tight", size === 'lg' ? (isMobile ? 'text-2xl' : 'text-4xl') : (isMobile ? 'text-lg' : 'text-2xl'))}>{diary.title}</h4>
            <div className="flex items-center gap-4 opacity-60 text-[11px] font-black uppercase tracking-widest text-[#6ebeea] mt-1.5">
              <span>{adjDate.getFullYear()}</span>
              <span className="w-1 h-1 rounded-full bg-[#6ebeea]/30" />
              <span>{diary.word_count || 0} WORDS</span>
            </div>
          </div>
        </div>
        {size !== 'sm' && <p className="text-[#232f55]/60 font-medium leading-relaxed line-clamp-3 mb-4 text-sm italic">{extractSnippet(diary.content)}</p>}
        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            {diary.mood && <span className="text-xl filter drop-shadow-sm">{diary.mood.emoji}</span>}
            {diary.weather_snapshot && <span className="text-lg opacity-60">{diary.weather_snapshot.weather}</span>}
          </div>
          <div className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4 transition-all duration-500 p-2 bg-[#f2f4f2] rounded-full shadow-sm"><ChevronRight size={20} className="text-[#6ebeea]" /></div>
        </div>
      </div>
    </motion.div>
  )
}

export function DiaryListItem({ diary, onTap, onDelete }: any) {
  const x = useMotionValue(0)
  const opacity = useTransform(x, [-80, -20, 0], [1, 0.5, 0])
  const handleTap = () => { if (Math.abs(x.get()) > 5) return; onTap() }

  return (
    <motion.div layout whileHover={{ y: -4 }} transition={journeySpring} className="relative mb-6 group select-none">
      <motion.div style={{ opacity }} className="absolute inset-0 z-0 bg-red-50 rounded-[40px] flex items-center justify-end px-12 text-red-500"><Trash2 size={24} strokeWidth={2.5} /></motion.div>
      <motion.div style={{ x }} drag="x" dragConstraints={{ left: -100, right: 0 }} dragElastic={0.05} dragDirectionLock={true} onDragEnd={(_, info) => info.offset.x < -60 ? onDelete() : x.set(0)} onTap={handleTap} className="relative z-10 touch-pan-y active:cursor-grabbing">
        <DiaryItemCard diary={diary} size="sm" noHoverEffect={true} className="bg-white/90 shadow-sm" />
      </motion.div>
    </motion.div>
  )
}

export function SidebarNavItem({ icon, label, active, onClick, collapsed }: any) {
  return (
    <button onClick={onClick} className={cn("w-full flex items-center gap-5 px-6 py-4 rounded-[24px] transition-all duration-500 group relative text-[#232f55] overflow-hidden", active ? "bg-white shadow-[0_15px_30px_-5px_rgba(35,47,85,0.08)]" : "text-[#232f55]/40 hover:text-[#232f55] hover:bg-white/20")}>
      {active && <motion.div layoutId="nav-bg" className="absolute inset-0 bg-white z-0" transition={journeySpring} />}
      <motion.div className="relative z-10" animate={active ? { scale: 1.1, color: '#6ebeea' } : { scale: 1 }} transition={journeySpring}>{icon}</motion.div>
      {!collapsed && <span className="relative z-10 text-[14px] font-black tracking-tight">{label}</span>}
    </button>
  )
}

export function ActionButton({ children, onClick, className, icon: Icon, loading }: any) {
  const isMobile = useIsMobile()
  return (
    <motion.button whileHover={{ scale: 1.02, y: -3 }} whileTap={{ scale: 0.97 }} transition={journeySpring} onClick={onClick} disabled={loading} className={cn("bg-[#232f55] text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-2xl shadow-[#232f55]/20 flex items-center justify-center gap-4 disabled:opacity-50", isMobile ? "px-6 py-3.5" : "px-10 py-5", className)}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : Icon && <Icon size={18} strokeWidth={3} />}
      {children}
    </motion.button>
  )
}

export function OptionButton({ children, onClick, active, icon: Icon, className }: any) {
  return (
    <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={onClick} className={cn("flex items-center gap-3 px-6 py-3.5 rounded-[20px] border transition-all text-[12px] font-black uppercase tracking-widest", active ? "bg-[#6ebeea]/10 border-[#6ebeea] text-[#6ebeea] shadow-sm" : "bg-white/50 border-white text-[#232f55]/40 hover:bg-white/80 hover:border-slate-200", className)}>
      {Icon && <div className={cn("transition-transform", active && "scale-110")}>{Icon}</div>}
      {children}
    </motion.button>
  )
}

export function GlassHeader({ children, className }: any) {
  const isMobile = useIsMobile()
  return <header className={cn("flex items-center justify-between sticky top-0 z-20 bg-[#f2f4f2]/80 backdrop-blur-3xl", isMobile ? "h-14 px-6" : "h-14 px-16", className)}>{children}</header>
}

export function Card({ children, className, onClick, ...props }: any) {
  return (
    <motion.div
      whileHover={onClick ? { y: -4 } : {}}
      whileTap={onClick ? { scale: 0.99 } : {}}
      onClick={onClick}
      className={cn("bg-white/90 shadow-[0_20px_40px_rgba(35,47,85,0.04)] rounded-[40px] overflow-hidden", onClick && "cursor-pointer", className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

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