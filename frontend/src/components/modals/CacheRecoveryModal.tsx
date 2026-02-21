import { motion } from 'framer-motion'
import { FileText, RotateCcw, Trash2, Clock, Edit3, FilePlus } from 'lucide-react'
import { formatCacheTime, isCacheEmpty } from '../../lib/cache'
import type { DiaryCache } from '../../lib/cache'
import { cn } from '../ui/JourneyUI'

interface CacheRecoveryModalProps {
  cache: DiaryCache
  onRestore: () => void      // 加载到编辑器
  onSaveAsDraft: () => void  // 另存为日记（保存到draft日记本）
  onDiscard: () => void      // 放弃
  onClose: () => void
  loading?: boolean
}

export function CacheRecoveryModal({ 
  cache, 
  onRestore, 
  onSaveAsDraft, 
  onDiscard, 
  onClose,
  loading = false 
}: CacheRecoveryModalProps) {
  const isEmpty = isCacheEmpty(cache)
  const timeAgo = formatCacheTime(cache.cachedAt)
  const cacheTitle = cache.title?.trim() || 'Untitled'
  
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/5 backdrop-blur-md p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} 
        animate={{ scale: 1, y: 0 }} 
        className="bg-white/95 backdrop-blur-3xl p-10 md:p-12 rounded-[48px] max-w-md w-full shadow-2xl border border-white text-[#232f55]"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#6ebeea]/10 rounded-2xl flex items-center justify-center">
              {cache.isNewDiary ? (
                <FilePlus size={24} className="text-[#6ebeea]" />
              ) : (
                <Edit3 size={24} className="text-[#6ebeea]" />
              )}
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tighter">
                {cache.isNewDiary ? 'Unsaved Draft' : 'Unsaved Changes'}
              </h3>
              <div className="flex items-center gap-2 text-[#232f55]/40 text-xs font-bold mt-1">
                <Clock size={12} />
                <span>{timeAgo}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-[#f2f4f2]/50 rounded-3xl p-6 mb-8 border border-[#232f55]/5">
          <div className="flex items-start gap-3">
            <FileText size={18} className="text-[#6ebeea] mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-lg truncate mb-1">
                {cacheTitle}
              </p>
              <p className="text-sm text-[#232f55]/50">
                {cache.isNewDiary 
                  ? `New diary entry${cache.notebookId ? '' : ' (no notebook selected)'}`
                  : `Editing diary #${cache.diaryId}`
                }
              </p>
              {cache.mood && (
                <span className="text-lg mr-2">{cache.mood.emoji}</span>
              )}
              {cache.tags && cache.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {cache.tags.slice(0, 3).map(tag => (
                    <span 
                      key={tag} 
                      className="px-2 py-0.5 bg-[#6ebeea]/10 text-[#6ebeea] text-[10px] font-bold rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {cache.tags.length > 3 && (
                    <span className="text-[10px] text-[#232f55]/40 font-bold">
                      +{cache.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {!isEmpty && (
            <button 
              onClick={onRestore} 
              disabled={loading}
              className={cn(
                "w-full py-4 px-6 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3",
                "bg-[#6ebeea] text-white shadow-lg shadow-[#6ebeea]/20 active:scale-[0.98]",
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              <RotateCcw size={18} />
              Continue Editing
            </button>
          )}
          
          <button 
            onClick={onSaveAsDraft} 
            disabled={loading}
            className={cn(
              "w-full py-4 px-6 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3",
              "bg-[#232f55] text-white shadow-lg active:scale-[0.98]",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FileText size={18} />
            )}
            Save as Draft
          </button>
          
          <button 
            onClick={onDiscard} 
            disabled={loading}
            className={cn(
              "w-full py-4 px-6 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3",
              "bg-slate-50 text-[#232f55]/40 hover:bg-rose-50 hover:text-rose-500 active:scale-[0.98]",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            <Trash2 size={18} />
            Discard
          </button>
        </div>

        {/* Footer hint */}
        <p className="text-center text-[10px] text-[#232f55]/30 font-bold uppercase tracking-widest mt-6">
          Draft will be saved to "Drafts" notebook
        </p>
      </motion.div>
    </motion.div>
  )
}

/**
 * 退出编辑时的保存草稿确认弹窗
 */
interface ExitConfirmModalProps {
  onDiscard: () => void    // 不保存，直接退出
  onSaveDraft: () => void  // 保存为草稿
  onClose: () => void      // 取消，继续编辑
  loading?: boolean
}

export function ExitConfirmModal({ 
  onDiscard, 
  onSaveDraft, 
  onClose,
  loading = false 
}: ExitConfirmModalProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/5 backdrop-blur-md p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} 
        animate={{ scale: 1, y: 0 }} 
        className="bg-white/95 backdrop-blur-3xl p-10 md:p-12 rounded-[48px] max-w-sm w-full shadow-2xl border border-white text-[#232f55]"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-amber-500" />
          </div>
          <h3 className="text-2xl font-black tracking-tighter mb-2">Unsaved Changes</h3>
          <p className="text-[#232f55]/50 text-sm font-medium leading-relaxed">
            You have unsaved content. Would you like to save it as a draft before leaving?
          </p>
        </div>

        <div className="space-y-3">
          <button 
            onClick={onSaveDraft} 
            disabled={loading}
            className={cn(
              "w-full py-4 px-6 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3",
              "bg-[#232f55] text-white shadow-lg active:scale-[0.98]",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FileText size={18} />
            )}
            Save as Draft
          </button>
          
          <button 
            onClick={onDiscard} 
            disabled={loading}
            className={cn(
              "w-full py-4 px-6 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all",
              "bg-rose-50 text-rose-500 active:scale-[0.98]",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            Discard & Exit
          </button>
          
          <button 
            onClick={onClose} 
            disabled={loading}
            className={cn(
              "w-full py-4 px-6 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all",
              "text-[#232f55]/40 hover:bg-slate-50 active:scale-[0.98]",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            Continue Editing
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
