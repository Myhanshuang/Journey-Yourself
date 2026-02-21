import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Image as ImageIcon } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notebookApi, assetApi } from '../../lib/api'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../lib/utils'

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
        className="bg-white/90 backdrop-blur-3xl p-12 rounded-[56px] w-full max-w-2xl shadow-2xl border border-white text-[#232f55]"
      >
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-3xl font-black tracking-tighter">Collection Identity</h3>
          <button onClick={() => onClose()} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-300 transition-colors"><X /></button>
        </div>

        <div className="flex gap-10">
          <div className="w-48 h-64 bg-slate-100 rounded-[40px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 relative overflow-hidden group hover:border-[#6ebeea] cursor-pointer shadow-inner">
            {fd.cover_url ? (
              <img src={fd.cover_url} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center opacity-30">
                <ImageIcon size={40} className="mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest">{uploading ? 'Wait...' : 'Cover'}</span>
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

          <div className="flex-1 space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-300 ml-2 tracking-widest">Name</label>
              <input
                className="w-full px-7 py-5 bg-[#f2f4f2]/50 border-none rounded-[24px] outline-none font-bold text-[#232f55] text-xl focus:ring-4 focus:ring-[#6ebeea]/10"
                placeholder="Volume Title"
                value={fd.name}
                onChange={e => setFd({ ...fd, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-300 ml-2 tracking-widest">About</label>
              <textarea
                className="w-full px-7 py-5 bg-[#f2f4f2]/50 border-none rounded-[24px] outline-none font-medium text-slate-500 min-h-[140px] resize-none"
                placeholder="What secrets lie within?"
                value={fd.description}
                onChange={e => setFd({ ...fd, description: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-12">
          <button
            onClick={() => mutation.mutate(fd)}
            disabled={mutation.isPending || uploading}
            className="flex-1 py-5 bg-[#232f55] text-white rounded-[24px] font-black shadow-2xl active:scale-95 transition-all text-xs uppercase tracking-widest"
          >
            Save Identity
          </button>
          <button
            onClick={() => onClose()}
            className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-[24px] font-black text-xs uppercase hover:bg-slate-100 transition-all"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
