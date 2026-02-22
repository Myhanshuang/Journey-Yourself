import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Image as ImageIcon } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notebookApi, assetApi } from '../../lib/api'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../lib/utils'
import { useIsMobile } from '../ui/JourneyUI'

interface NotebookModalProps {
  notebook?: any
  onClose: (updated?: any) => void
}

export function NotebookModal({ notebook, onClose }: NotebookModalProps) {
  const [fd, setFd] = useState({
    name: notebook?.name || '',
    description: notebook?.description || '',
    cover_url: notebook?.cover_url || ''
  })
  const [uploading, setUploading] = useState(false)
  const addToast = useToast(state => state.add)
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()

  const mutation = useMutation({
    mutationFn: (data: any) => notebook ? notebookApi.update(notebook.id, data) : notebookApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] })
      addToast('success', 'Collection synced')
      onClose(res)
    }
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/5 backdrop-blur-xl p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        className={cn(
          "bg-white/90 backdrop-blur-3xl shadow-2xl border border-white text-[#232f55]",
          isMobile ? "p-6 rounded-[32px] w-full max-w-sm" : "p-12 rounded-[56px] w-full max-w-lg"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h3 className={cn("font-black tracking-tighter", isMobile ? "text-xl" : "text-3xl")}>
            Collection Identity
          </h3>
          <button 
            onClick={() => onClose()} 
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-300 transition-colors"
          >
            <X size={isMobile ? 18 : 24} />
          </button>
        </div>

        {/* 封面图片 - 始终在顶部 */}
        <div className={cn(
          "bg-slate-100 rounded-[24px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 relative overflow-hidden group hover:border-[#6ebeea] cursor-pointer shadow-inner mb-6",
          isMobile ? "w-full h-36" : "w-full h-48"
        )}>
          {fd.cover_url ? (
            <img src={fd.cover_url} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center opacity-30">
              <ImageIcon size={isMobile ? 28 : 36} className="mb-1" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {uploading ? 'Uploading...' : 'Click to add cover'}
              </span>
            </div>
          )}
          <input
            type="file"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setUploading(true)
              try {
                const res = await assetApi.uploadCover(f)
                setFd({ ...fd, cover_url: res.url })
                addToast('info', 'Visual updated')
              } finally {
                setUploading(false)
              }
            }}
          />
        </div>

        {/* 名称输入 */}
        <div className="space-y-2 mb-4">
          <label className="text-[10px] font-black uppercase text-slate-300 ml-2 tracking-widest">Name</label>
          <input
            className={cn(
              "w-full bg-[#f2f4f2]/50 border-none rounded-[24px] outline-none font-bold text-[#232f55] focus:ring-4 focus:ring-[#6ebeea]/10",
              isMobile ? "px-5 py-3 text-base" : "px-7 py-4 text-lg"
            )}
            placeholder="Volume Title"
            value={fd.name}
            onChange={e => setFd({ ...fd, name: e.target.value })}
          />
        </div>

        {/* 描述输入 */}
        <div className="space-y-2 mb-8">
          <label className="text-[10px] font-black uppercase text-slate-300 ml-2 tracking-widest">About</label>
          <textarea
            className={cn(
              "w-full bg-[#f2f4f2]/50 border-none rounded-[24px] outline-none font-medium text-slate-500 resize-none",
              isMobile ? "px-5 py-3 min-h-[80px] text-sm" : "px-7 py-4 min-h-[100px]"
            )}
            placeholder="What secrets lie within?"
            value={fd.description}
            onChange={e => setFd({ ...fd, description: e.target.value })}
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={() => mutation.mutate(fd)}
            disabled={mutation.isPending || uploading}
            className={cn(
              "flex-1 bg-[#232f55] text-white rounded-[20px] font-black shadow-2xl active:scale-95 transition-all text-xs uppercase tracking-widest disabled:opacity-50",
              isMobile ? "py-4" : "py-5"
            )}
          >
            {mutation.isPending ? 'Saving...' : 'Save Identity'}
          </button>
          <button
            onClick={() => onClose()}
            className={cn(
              "flex-1 bg-slate-50 text-slate-400 rounded-[20px] font-black text-xs uppercase hover:bg-slate-100 transition-all",
              isMobile ? "py-4" : "py-5"
            )}
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}