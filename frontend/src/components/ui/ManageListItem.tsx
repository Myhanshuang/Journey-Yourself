import React from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ManageListItemProps {
  /** 左侧图标 */
  icon: React.ReactNode
  /** 图标背景样式类 */
  iconBgClass?: string
  /** 标题 */
  title: string
  /** 副标题/描述 */
  subtitle?: string
  /** 左侧操作区（如开关） */
  leftAction?: React.ReactNode
  /** 右侧操作按钮组 */
  actions?: React.ReactNode
  /** 点击整个列表项的回调 */
  onClick?: () => void
  /** 是否禁用 */
  disabled?: boolean
  /** 额外类名 */
  className?: string
}

export function ManageListItem({
  icon,
  iconBgClass = 'bg-slate-100 text-slate-500',
  title,
  subtitle,
  leftAction,
  actions,
  onClick,
  disabled = false,
  className
}: ManageListItemProps) {
  const Wrapper = onClick ? 'button' : 'div'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "group relative",
        className
      )}
    >
      <Wrapper
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "w-full flex items-center gap-3 md:gap-4",
          "px-3 md:px-4 py-3 md:py-4",
          "rounded-2xl transition-all",
          onClick && !disabled && "cursor-pointer hover:bg-slate-50/80 active:bg-slate-100/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {/* 左侧操作区（如开关） */}
        {leftAction && (
          <div className="flex-shrink-0">
            {leftAction}
          </div>
        )}

        {/* 图标 */}
        <div className={cn(
          "flex-shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-xl md:rounded-2xl",
          "flex items-center justify-center",
          iconBgClass
        )}>
          {icon}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 min-w-0 text-left">
          <p className="font-bold text-slate-800 truncate text-sm md:text-base">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* 右侧操作按钮组 */}
        {actions && (
          <div className="flex-shrink-0 flex items-center gap-1 md:gap-2">
            {actions}
          </div>
        )}

        {/* 右箭头（有点击事件时显示） */}
        {onClick && !actions && (
          <ChevronRight 
            size={18} 
            className="flex-shrink-0 text-slate-300 group-hover:text-slate-400 transition-colors" 
          />
        )}
      </Wrapper>
    </motion.div>
  )
}
