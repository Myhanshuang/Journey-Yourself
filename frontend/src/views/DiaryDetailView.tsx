import { motion } from 'framer-motion'
import {
  ChevronLeft, Edit3, Clock, RotateCw, Trash2, Tag,
  MapPin, Sun, Cloud, CloudRain, Wind, Snowflake, CloudLightning, Link2, Copy, Check, X
} from 'lucide-react'
import { useAdjustedTime, useConfirm, useToast, journeySpring, useIsMobile, cn, ActionMenu, getBaseUrl } from '../components/ui/JourneyUI'
import { diaryApi, shareApi } from '../lib/api'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Gapcursor } from '@tiptap/extension-gapcursor'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { MathExtension } from 'tiptap-math-extension'
import { Markdown } from 'tiptap-markdown'
import { Video } from '../components/extensions/Video'
import { Audio } from '../components/extensions/Audio'
import { Image } from '../components/extensions/Image'
import { Bookmark } from '../components/extensions/Bookmark'
import { useParams, useNavigate } from 'react-router-dom'

import 'katex/dist/katex.min.css'

const WEATHER_ICONS: any = {
  "☀️": Sun, "⛅️": Cloud, "☁️": Cloud, "🌧️": CloudRain, "⛈️": CloudLightning, "❄️": Snowflake, "💨": Wind, "🌫️": Wind
}

export default function DiaryDetailView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const addToast = useToast(state => state.add)
  const askConfirm = useConfirm(state => state.ask)
  const { getAdjusted } = useAdjustedTime()
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const isMobile = useIsMobile()

  // Fetch diary by ID
  const { data: diary, isLoading, error } = useQuery({
    queryKey: ['diary', Number(id)],
    queryFn: () => diaryApi.get(Number(id)),
    enabled: !!id,
  })

  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Gapcursor,
      Image,
      Video,
      Audio,
      Bookmark,
      Underline,
      Markdown,
      Link.configure({ HTMLAttributes: { class: 'text-[#6ebeea] underline underline-offset-4' } }),
      Table,
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem,
      MathExtension.configure({ evaluation: false }),
    ],
    content: diary?.content,
    editorProps: {
      attributes: { class: cn('prose max-w-none pb-40 text-[#232f55] leading-[1.8] font-medium tracking-tight', isMobile ? 'text-base' : 'text-xl') }
    },
  })

  useEffect(() => {
    if (editor && diary?.content) {
      editor.commands.setContent(diary.content)
    }
  }, [diary?.content, editor])

  const handleDelete = () => {
    askConfirm(
      "Erase this memory?",
      "This action is irreversible. Your thoughts will fade into the void.",
      async () => {
        try {
          await diaryApi.delete(Number(id))
          queryClient.invalidateQueries()
          addToast('success', 'Memory erased forever')
          navigate(-1)
        } catch (e) { addToast('error', 'Failed to erase memory') }
      }
    )
  }

  const handleBack = () => {
    navigate(-1)
  }

  const handleEdit = () => {
    navigate(`/edit/${id}`)
  }

  const shareMutation = useMutation({
    mutationFn: () => shareApi.create({ diary_id: Number(id), expires_in_days: 7 }),
    onSuccess: (data) => {
      const url = `${getBaseUrl()}/share/${data.token}`
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-[#6ebeea]/30 border-t-[#6ebeea] rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !diary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <p className="text-xl font-medium">Diary not found</p>
        <button onClick={handleBack} className="mt-4 text-[#6ebeea] font-bold">Go back</button>
      </div>
    )
  }

  const adjCreated = getAdjusted(diary.date)
  const adjUpdated = getAdjusted(diary.updated_at)
  const WIcon = diary.weather_snapshot ? (WEATHER_ICONS[diary.weather_snapshot.weather] || Cloud) : null

  const actions = [
    { label: 'Share', icon: <Link2 size={18} />, onClick: handleShare },
    { label: 'Edit', icon: <Edit3 size={18} />, onClick: handleEdit },
    { label: 'Delete', icon: <Trash2 size={18} />, onClick: handleDelete, variant: 'danger' as const },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={journeySpring}
      className="pt-0 pb-32 space-y-6 text-[#232f55]"
    >
      <header className="flex items-center justify-between pt-2">
        <button onClick={handleBack} className="flex items-center gap-2 text-slate-400 hover:text-[#232f55] font-bold transition-all"><ChevronLeft size={20} /> Back</button>
        <div className="flex items-center gap-3">
          <ActionMenu actions={actions} />
          <div className="h-10 w-px bg-[#232f55]/5 mx-2" />
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">{adjCreated.toLocaleDateString('en', { weekday: 'long' })}</p>
            <p className="text-xs font-bold text-slate-400">{adjCreated.toLocaleDateString()}</p>
          </div>
        </div>
      </header>

      <div className="max-w-[800px] mx-auto">
        <div className="flex flex-wrap items-center gap-3 mb-8">
          {diary.mood && <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-white/50"><span className="text-xl">{diary.mood.emoji}</span><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{diary.mood.label}</span></div>}

          {diary.location_snapshot && (
            <div className="flex items-center gap-2 bg-[#6ebeea]/10 text-[#6ebeea] px-4 py-2 rounded-2xl border border-[#6ebeea]/20 shadow-sm">
              <MapPin size={12} strokeWidth={3} />
              <span className="text-[10px] font-black uppercase tracking-tight">{diary.location_snapshot.name || 'Footprint'}</span>
            </div>
          )}

          {diary.weather_snapshot && (
            <div className="flex items-center gap-2 bg-[#232f55]/5 text-[#232f55] px-4 py-2 rounded-2xl border border-[#232f55]/10 shadow-sm">
              {WIcon && <WIcon size={14} strokeWidth={3} />}
              <span className="text-[10px] font-black">{diary.weather_snapshot.weather} {diary.weather_snapshot.temperature}°</span>
            </div>
          )}
        </div>

        <h1 className={cn("font-black tracking-tighter text-[#232f55] mb-8 leading-[1.1]", isMobile ? "text-4xl" : "text-6xl")}>{diary.title}</h1>

        {diary.tags && diary.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {diary.tags.map((t: any) => (
              <span key={t} className="flex items-center gap-1.5 px-4 py-2 bg-white/50 text-[#232f55]/60 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors border border-white shadow-sm">
                <Tag size={10} strokeWidth={3} /> {t}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 py-6 border-y border-[#232f55]/5 mb-10">
          <div className={cn("flex items-center gap-8 text-[#232f55]/40 font-bold text-[10px] uppercase tracking-[0.2em]", isMobile ? "flex-col items-start gap-2" : "")}>
            <span className="flex items-center gap-2.5 text-[#6ebeea]"><Clock size={14} /> Created: {adjCreated.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</span>
            <span className={cn("w-1.5 h-1.5 rounded-full bg-[#232f55]/10", isMobile && "hidden")} />
            <span className="flex items-center gap-2.5"><RotateCw size={14} /> Updated: {adjUpdated.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</span>
            <span className={cn("w-1.5 h-1.5 rounded-full bg-[#232f55]/10", isMobile && "hidden")} />
            <span className="text-[#232f55]/30 font-black">{diary.word_count || 0} Characters</span>
          </div>
        </div>

        <EditorContent editor={editor} />
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] bg-black/5 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowShareModal(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn("bg-white shadow-2xl border border-white", isMobile ? "p-6 rounded-[32px] w-full" : "p-10 rounded-[48px] max-w-lg w-full")}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-2xl font-black text-slate-900 tracking-tight">Share Diary</h4>
              <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-300"><X size={20} /></button>
            </div>
            
            {shareMutation.isPending ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-[#6ebeea]/30 border-t-[#6ebeea] rounded-full animate-spin" />
              </div>
            ) : shareLink ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">Share link created! Expires in 7 days.</p>
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
