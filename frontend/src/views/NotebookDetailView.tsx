import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Edit3, Trash2, Link2, Copy, Check, X } from 'lucide-react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { diaryApi, notebookApi, shareApi } from '../lib/api'
import { DiaryListItem, useToast, useConfirm, journeySpring } from '../components/ui/JourneyUI'
import { useState } from 'react'

interface OutletContextType {
  notebooks: any[]
  setNotebookModal: (config: { show: boolean; data?: any; afterCreate?: () => void }) => void
  handleWriteClick: () => void
}

export default function NotebookDetailView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const addToast = useToast(state => state.add)
  const askConfirm = useConfirm(state => state.ask)
  const outletContext = useOutletContext<OutletContextType>()
  const { setNotebookModal } = outletContext
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Fetch notebook by ID
  const { data: notebook, isLoading: isLoadingNotebook } = useQuery({
    queryKey: ['notebook', Number(id)],
    queryFn: () => notebookApi.get(Number(id)),
    enabled: !!id,
  })

  // Fetch diaries with pagination
  const { data: diaries = [], isLoading: isLoadingDiaries } = useQuery({
    queryKey: ['diaries', 'notebook', Number(id)],
    queryFn: () => diaryApi.listByNotebook(Number(id), 20, 0),
    enabled: !!id,
  })

  const handleBack = () => {
    navigate('/notebooks')
  }

  const handleEdit = () => {
    setNotebookModal({ show: true, data: notebook })
  }

  const handleDeleteDiary = (diaryId: number) => {
    askConfirm(
      "Erase Memory?",
      "This thought will be lost in time. Are you sure?",
      () => {
        diaryApi.delete(diaryId).then(() => {
          queryClient.invalidateQueries()
          addToast('success', 'Memory erased')
        })
      }
    )
  }

  const handleDiaryClick = (diary: any) => {
    navigate(`/diaries/${diary.id}`)
  }

  const shareMutation = useMutation({
    mutationFn: () => shareApi.create({ notebook_id: Number(id), expires_in_days: 7 }),
    onSuccess: (data) => {
      const url = `${window.location.origin}/share/${data.token}`
      setShareLink(url)
      addToast('success', 'Share link created')
    },
    onError: () => addToast('error', 'Failed to create share link')
  })

  const handleShare = () => {
    setShowShareModal(true)
    shareMutation.mutate()
  }

  const handleCopyLink = () => {
    if (shareLink) {
      // 兼容非 HTTPS 环境
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(shareLink)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = shareLink
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        textarea.remove()
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoadingNotebook || !notebook) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-[#6ebeea]/30 border-t-[#6ebeea] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={journeySpring}
      className="space-y-12 py-16 text-slate-900"
    >
      <header className="flex items-center justify-between">
        <button onClick={handleBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-all"><ChevronLeft size={20} /> Library</button>
        <div className="flex items-center gap-3">
          <button onClick={handleShare} className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-400 hover:text-[#6ebeea] transition-colors"><Link2 size={18} /></button>
          <button onClick={handleEdit} className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-400 hover:text-indigo-600 transition-colors"><Edit3 size={18} /></button>
        </div>
      </header>

      <div className="flex gap-12 items-end">
        <div className="w-56 h-72 rounded-[40px] overflow-hidden shadow-2xl bg-slate-200">
          <img src={notebook.cover_url} className="w-full h-full object-cover" />
        </div>
        <div className="pb-4 space-y-3 flex-1 text-slate-900">
          <h2 className="text-6xl font-black tracking-tighter leading-none">{notebook.name}</h2>
          <p className="text-2xl text-slate-400 font-medium leading-relaxed italic">{notebook.description || "The unwritten chapters."}</p>
        </div>
      </div>

      <div className="space-y-6 pt-10 pb-32">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-300 ml-4">Chronicles</h3>
        <AnimatePresence mode="popLayout">
          {diaries.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-20 text-center text-slate-300 italic font-medium">Empty chapters.</motion.div>
          ) : (
            diaries.map((diary: any) => (
              <DiaryListItem
                key={diary.id}
                diary={diary}
                onTap={() => handleDiaryClick(diary)}
                onDelete={() => handleDeleteDiary(diary.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] bg-black/5 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowShareModal(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-10 rounded-[48px] max-w-lg w-full shadow-2xl border border-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-2xl font-black text-slate-900 tracking-tight">Share Notebook</h4>
              <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-300"><X size={20} /></button>
            </div>
            
            {shareMutation.isPending ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-[#6ebeea]/30 border-t-[#6ebeea] rounded-full animate-spin" />
              </div>
            ) : shareLink ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">Share link created! All {diaries.length} entries will be visible. Expires in 7 days.</p>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-sm text-slate-700 font-medium break-all">{shareLink}</p>
                    <button
                      onClick={handleCopyLink}
                      className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-[#6ebeea] transition-all shrink-0"
                    >
                      {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500">Failed to create share link</p>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}