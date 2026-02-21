import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Link2, Trash2, Copy, Check, Clock, FileText, BookOpen, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { shareApi } from '../lib/api'
import { Card, useToast, useConfirm, journeySpring } from '../components/ui/JourneyUI'

interface Share {
  id: number
  token: string
  diary_id: number | null
  notebook_id: number | null
  created_at: string
  expires_at: string | null
  is_active: boolean
  diary_title?: string
  notebook_name?: string
}

// 兼容非 HTTPS 环境的复制功能
function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  }
  // Fallback: 使用 textarea + execCommand
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-999999px'
  textarea.style.top = '-999999px'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  return new Promise((resolve, reject) => {
    if (document.execCommand('copy')) {
      resolve()
    } else {
      reject(new Error('Copy failed'))
    }
    textarea.remove()
  })
}

export default function SharesView() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const addToast = useToast(state => state.add)
  const askConfirm = useConfirm(state => state.ask)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const { data: shares = [], isLoading } = useQuery({
    queryKey: ['shares'],
    queryFn: shareApi.list
  })

  const deleteMutation = useMutation({
    mutationFn: shareApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares'] })
      addToast('success', 'Share revoked')
    }
  })

  const handleCopy = (share: Share) => {
    const url = `${window.location.origin}/share/${share.token}`
    copyToClipboard(url)
    setCopiedId(share.id)
    setTimeout(() => setCopiedId(null), 2000)
    addToast('success', 'Link copied')
  }

  const handleDelete = (share: Share) => {
    const name = share.diary_title || share.notebook_name || 'this share'
    askConfirm(
      "Revoke Share?",
      `"${name}" will no longer be accessible via this link.`,
      () => deleteMutation.mutate(share.id)
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-[#6ebeea]/30 border-t-[#6ebeea] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={journeySpring}
      className="py-12 max-w-[700px] mx-auto space-y-12 pb-32 text-slate-900"
    >
      <header className="space-y-2">
        <button onClick={() => navigate('/settings')} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-all mb-6">
          <ChevronLeft size={20} /> Settings
        </button>
        <h2 className="text-5xl font-black tracking-tight">Share Manager</h2>
        <p className="text-xl text-slate-400 font-medium italic">Links you've shared with the world.</p>
      </header>

      {shares.length === 0 ? (
        <Card className="p-12 text-center">
          <Link2 size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-medium">No active shares yet.</p>
          <p className="text-sm text-slate-300 mt-2">Share a diary or notebook to see it here.</p>
        </Card>
      ) : (
        <Card className="divide-y divide-slate-100">
          <AnimatePresence mode="popLayout">
            {shares.map((share: Share) => {
              const expired = isExpired(share.expires_at)
              return (
                <motion.div
                  key={share.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6 hover:bg-slate-50/50 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${share.diary_id ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-500'}`}>
                      {share.diary_id ? <FileText size={20} /> : <BookOpen size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate">
                        {share.diary_title || share.notebook_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {share.diary_id ? 'Diary' : 'Notebook'} · Created {formatDate(share.created_at)}
                      </p>
                      {share.expires_at && (
                        <p className={`text-xs mt-1 flex items-center gap-1 ${expired ? 'text-red-400' : 'text-slate-400'}`}>
                          <Clock size={12} />
                          {expired ? 'Expired' : 'Expires'} {formatDate(share.expires_at)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(share)}
                        disabled={expired}
                        className={`p-3 rounded-xl transition-all ${expired ? 'bg-slate-50 text-slate-200' : 'bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-500'}`}
                      >
                        {copiedId === share.id ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                      <button
                        onClick={() => handleDelete(share)}
                        className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </Card>
      )}
    </motion.div>
  )
}
