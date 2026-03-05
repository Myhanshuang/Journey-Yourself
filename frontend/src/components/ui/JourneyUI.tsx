import { motion } from 'framer-motion'
import { ChevronRight, Trash2, Loader2, Pin, PinOff, Edit3, Link2 } from 'lucide-react'
import { useMotionValue, useTransform } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { diaryApi } from '../../lib/api'
import { ActionMenu } from './action-menu'
import { useToast } from '../../hooks/useToast'

// Re-export from new locations
export { cn, getFirstImage, extractSnippet, getAssetUrl, getBaseUrl } from '../../lib/utils'
export { journeySpring, viewTransition } from '../../lib/constants'
export { useToast, ToastContainer } from '../../hooks/useToast'
export { useConfirm, GlobalConfirmModal } from '../../hooks/useConfirm'
export { useAdjustedTime } from '../../hooks/useAdjustedTime'
export { useIsMobile } from '../../hooks/useMobile'
export { default as ServiceSetupModal } from '../modals/ServiceSetupModal'
export { ConfigSelect, type SelectOption } from './custom-select'
export { ActionMenu, type ActionItem } from './action-menu'
export { Skeleton } from './skeleton'
export { Card } from './card'
export { ManageListItem } from './ManageListItem'
export { DatePicker } from './JourneyDatePicker'
export { TimePicker } from './JourneyTimePicker'

import { cn } from '../../lib/utils'
import { journeySpring } from '../../lib/constants'
import { getFirstImage, extractSnippet } from '../../lib/utils'
import { useAdjustedTime } from '../../hooks/useAdjustedTime'
import { useIsMobile } from '../../hooks/useMobile'

export function DiaryItemCard({ diary, onClick, className, size = 'md', noHoverEffect = false }: any) {
  const bgImage = getFirstImage(diary.content)
  const { getAdjusted } = useAdjustedTime()
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const addToast = useToast(state => state.add)
  const adjDate = getAdjusted(diary.date)
  
  const sizes = isMobile 
    ? { sm: "p-3.5", md: "p-4", lg: "p-5" } 
    : { sm: "p-5", md: "p-8", lg: "p-12" }

  const pinMutation = useMutation({
    mutationFn: () => diaryApi.togglePin(diary.id),
    onMutate: async () => {
      // 取消正在进行的查询，防止乐观更新被覆盖
      await queryClient.cancelQueries({ queryKey: ['diaries'] })
      await queryClient.cancelQueries({ queryKey: ['diary', diary.id] })
      
      // 保存旧值以便回滚
      const previousDiary = queryClient.getQueryData(['diary', diary.id])
      
      // 乐观更新单个日记
      queryClient.setQueryData(['diary', diary.id], (old: any) => ({
        ...old,
        is_pinned: !old?.is_pinned
      }))
      
      // 乐观更新所有 diaries 列表
      queryClient.setQueriesData({ queryKey: ['diaries'] }, (old: any) => {
        if (!old || !Array.isArray(old)) return old
        return old.map((d: any) => d.id === diary.id ? { ...d, is_pinned: !d.is_pinned } : d)
      })
      
      return { previousDiary }
    },
    onError: (err, variables, context) => {
      // 回滚
      if (context?.previousDiary) {
        queryClient.setQueryData(['diary', diary.id], context.previousDiary)
      }
      queryClient.invalidateQueries({ queryKey: ['diaries'] })
    },
    onSettled: () => {
      // 重新获取数据确保同步
      queryClient.invalidateQueries({ queryKey: ['diaries'] })
      queryClient.invalidateQueries({ queryKey: ['diary', diary.id] })
    },
    onSuccess: () => {
      addToast('success', diary.is_pinned ? 'Unpinned' : 'Pinned')
    }
  })

  const actions = [
    { label: diary.is_pinned ? 'Unpin' : 'Pin', icon: diary.is_pinned ? <PinOff size={16} /> : <Pin size={16} />, onClick: () => pinMutation.mutate() },
    { label: 'Edit', icon: <Edit3 size={16} />, onClick: () => navigate(`/edit/${diary.id}`) },
    { label: 'Delete', icon: <Trash2 size={16} />, onClick: () => console.warn("Delete action pending"), variant: 'danger' as const },
  ]

  return (
    <motion.div
      whileHover={!noHoverEffect ? { y: -8 } : {}}
      whileTap={!noHoverEffect ? { scale: 0.985 } : {}}
      transition={journeySpring}
      onTap={onClick} // 第二步：规范化 Tap 机制，由 Framer Motion 自动处理 3px 过滤
      className={cn(
        "relative bg-white/90 cursor-pointer group shadow-[0_30px_60px_-12px_rgba(35,47,85,0.12)] transition-all flex flex-col", 
        isMobile ? (size === 'sm' ? "rounded-[18px]" : "rounded-[24px]") : (size === 'sm' ? "rounded-[24px]" : "rounded-[40px]"),
        sizes[size as keyof typeof sizes], 
        className
      )}
    >
      {/* ... (pinned and bg image logic) ... */}
      {diary.is_pinned && (
        <div className={cn("absolute z-40 p-2 bg-[#6ebeea]/10 rounded-full", isMobile ? "top-3 right-3 scale-60" : "top-4 right-4 scale-75")}>
          <Pin size={16} className="text-[#6ebeea] fill-[#6ebeea]/20" />
        </div>
      )}
      {bgImage && (
        <div className={cn("absolute inset-0 z-0 pointer-events-none overflow-hidden", isMobile ? (size === 'sm' ? "rounded-[18px]" : "rounded-[24px]") : (size === 'sm' ? "rounded-[24px]" : "rounded-[40px]"))}>
          <motion.img src={bgImage} initial={{ scale: 1.1 }} whileHover={{ scale: 1.15 }} transition={{ duration: 1.5 }} className="w-full h-full object-cover opacity-90" />
          <div className="absolute inset-0 z-10 bg-[#f2f4f2]/75 backdrop-blur-[1px]" />
          <div className="absolute inset-0 z-20 bg-gradient-to-br from-[#f2f4f2]/95 via-[#f2f4f2]/40 to-transparent" />
        </div>
      )}
      <div className="relative z-30 flex flex-col h-full text-[#232f55]">
        <div className={cn("flex items-start", (size === 'sm' ? "mb-1" : (isMobile ? "mb-3 gap-3" : "mb-6 gap-6")))}>
          {/* ... (date logic) ... */}
          <div className={cn(
            "bg-[#f2f4f2] rounded-[10px] md:rounded-[14px] flex flex-col items-center justify-center shadow-sm border border-white/50 flex-shrink-0 font-black", 
            isMobile ? (size === 'sm' ? "w-8 h-8" : "w-10 h-10") : (size === 'sm' ? "w-10 h-10" : "w-14 h-14")
          )}>
            <span className={cn("text-[#232f55]/40 uppercase leading-none", isMobile ? (size === 'sm' ? "text-[6px] mb-0" : "text-[8px] mb-0.5") : (size === 'sm' ? "text-[8px] mb-0.5" : "text-[10px] mb-1"))}>{adjDate.toLocaleDateString('en', { month: 'short' })}</span>
            <span className={cn("leading-none text-[#232f55]", isMobile ? (size === 'sm' ? "text-sm" : "text-lg") : (size === 'sm' ? "text-lg" : "text-2xl"))}>{adjDate.getDate()}</span>
          </div>
          <div className={cn("flex-1 overflow-hidden", isMobile ? "pr-4" : "pr-6")}>
            <h4 className={cn("font-black truncate tracking-tighter leading-tight", size === 'lg' ? (isMobile ? 'text-xl' : 'text-4xl') : (size === 'sm' ? (isMobile ? 'text-sm' : 'text-lg') : (isMobile ? 'text-base' : 'text-2xl')))}>{diary.title}</h4>
            <div className={cn("flex items-center gap-2 md:gap-4 opacity-60 font-black uppercase tracking-widest text-[#6ebeea]", isMobile ? (size === 'sm' ? "text-[7px] mt-0.5" : "text-[9px] mt-1") : (size === 'sm' ? "text-[9px] mt-1" : "text-[11px] mt-1.5"))}>
              <span>{adjDate.getFullYear()}</span>
              <span className="w-1 h-1 rounded-full bg-[#6ebeea]/30" />
              <span>{diary.word_count || 0} CH</span>
            </div>
          </div>
          {/* 
            手术刀式拦截：
            1. Capture 阶段拦截 PointerDown，彻底屏蔽外层 Framer Motion 的手势感知（drag/onTap）
            2. Bubbling 阶段拦截 Click，确保点击菜单项后不触发卡片的逻辑
          */}
          <div 
            className="absolute right-0 top-0 z-50"
            onPointerDownCapture={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            <ActionMenu actions={actions} />
          </div>
        </div>
        {size !== 'sm' && <p className={cn("text-[#232f55]/60 font-medium leading-relaxed italic", isMobile ? "text-xs mb-2 line-clamp-2" : "text-sm mb-4 line-clamp-3")}>{extractSnippet(diary.content)}</p>}
        <div className={cn("mt-auto flex items-center justify-between", (size === 'sm' ? "pt-0" : (isMobile ? "pt-2" : "pt-4")))}>
          <div className="flex items-center gap-2">
            {diary.mood && <span className={cn(isMobile ? (size === 'sm' ? "text-base" : "text-lg") : (size === 'sm' ? "text-lg" : "text-xl"), "filter drop-shadow-sm")}>{diary.mood.emoji}</span>}
            {diary.weather_snapshot && <span className={cn(isMobile ? (size === 'sm' ? "text-[10px]" : "text-xs") : (size === 'sm' ? "text-xs" : "text-lg"), "opacity-60")}>{diary.weather_snapshot.weather}</span>}
          </div>
          <div className={cn("opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4 transition-all duration-500 bg-[#f2f4f2] rounded-full shadow-sm", isMobile ? (size === 'sm' ? "p-1" : "p-1.5") : (size === 'sm' ? "p-1.5" : "p-2"))}>
            <ChevronRight size={isMobile ? (size === 'sm' ? 12 : 16) : (size === 'sm' ? 16 : 20)} className="text-[#6ebeea]" />
          </div>
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
