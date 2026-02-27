import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Tag, MapPin, Sun, Cloud, CloudRain, Wind, Snowflake, CloudLightning, BookOpen, FileText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
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
import { NotionBlock } from '../components/extensions/NotionBlock'
import { XhsPost } from '../components/extensions/XhsPost'
import { BilibiliVideo } from '../components/extensions/BilibiliVideo'
import { shareApi } from '../lib/api'
import { journeySpring } from '../components/ui/JourneyUI'

import 'katex/dist/katex.min.css'

const WEATHER_ICONS: any = {
  "☀️": Sun, "⛅️": Cloud, "☁️": Cloud, "🌧️": CloudRain, "⛈️": CloudLightning, "❄️": Snowflake, "💨": Wind, "🌫️": Wind
}

export default function ShareView() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const { data: shareData, isLoading, error } = useQuery({
    queryKey: ['share', token],
    queryFn: () => shareApi.getPublic(token!),
    enabled: !!token,
    retry: false
  })

  const diary = shareData?.diary
  const notebook = shareData?.notebook
  const diaries = shareData?.diaries || []

  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit,
      Gapcursor,
      Image,
      Video,
      Audio,
      Bookmark,
      NotionBlock,
      XhsPost,
      BilibiliVideo,
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
      attributes: { class: 'prose max-w-none pb-40 text-[#232f55] leading-[1.8] text-xl font-medium tracking-tight' }
    },
  })

  useEffect(() => {
    if (editor && diary?.content) {
      editor.commands.setContent(diary.content)
    }
  }, [diary?.content, editor])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f2f4f2] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#6ebeea]/30 border-t-[#6ebeea] rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen bg-[#f2f4f2] flex flex-col items-center justify-center text-slate-400">
        <p className="text-xl font-medium">Share not found or expired</p>
        <button onClick={() => navigate('/login')} className="mt-4 text-[#6ebeea] font-bold">Go to Login</button>
      </div>
    )
  }

  // Notebook share view
  if (shareData.share_type === 'notebook' && notebook) {
    return (
      <div className="min-h-screen bg-[#f2f4f2]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={journeySpring}
          className="py-12 max-w-[800px] mx-auto px-6 pb-32 text-[#232f55]"
        >
          <header className="space-y-4 mb-12">
            <div className="flex items-center gap-3 text-slate-400 text-xs font-black uppercase tracking-widest">
              <BookOpen size={14} />
              <span>Shared Notebook</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter">{notebook.name}</h1>
            {notebook.description && (
              <p className="text-xl text-slate-400 font-medium italic">{notebook.description}</p>
            )}
          </header>

          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-300 ml-4">
              {diaries.length} {diaries.length === 1 ? 'Entry' : 'Entries'}
            </h3>
            {diaries.map((d: any) => (
              <NotebookDiaryItem key={d.id} diary={d} />
            ))}
          </div>
        </motion.div>
      </div>
    )
  }

  // Diary share view
  if (!diary) {
    return (
      <div className="min-h-screen bg-[#f2f4f2] flex items-center justify-center text-slate-400">
        <p className="text-xl font-medium">Content not found</p>
      </div>
    )
  }

  const WIcon = diary.weather_snapshot ? (WEATHER_ICONS[diary.weather_snapshot.weather] || Cloud) : null

  return (
    <div className="min-h-screen bg-[#f2f4f2]">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={journeySpring}
        className="pt-12 pb-32 space-y-6 text-[#232f55] max-w-[800px] mx-auto px-6"
      >
        <header className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3 text-slate-400 text-xs font-black uppercase tracking-widest">
            <FileText size={14} />
            <span>Shared Diary</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              {new Date(diary.date).toLocaleDateString('en', { weekday: 'long' })}
            </p>
            <p className="text-xs font-bold text-slate-400">{new Date(diary.date).toLocaleDateString()}</p>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          {diary.mood && (
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-white/50">
              <span className="text-xl">{diary.mood.emoji}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{diary.mood.label}</span>
            </div>
          )}

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

        <h1 className="text-6xl font-black tracking-tighter text-[#232f55] mb-8 leading-[1.1]">{diary.title}</h1>

        {diary.tags && diary.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {diary.tags.map((t: any) => (
              <span key={t} className="flex items-center gap-1.5 px-4 py-2 bg-white/50 text-[#232f55]/60 rounded-full text-[10px] font-black uppercase tracking-widest border border-white shadow-sm">
                <Tag size={10} strokeWidth={3} /> {t}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 py-6 border-y border-[#232f55]/5 mb-10">
          <div className="text-[#232f55]/40 font-bold text-[10px] uppercase tracking-[0.2em]">
            <span className="text-[#6ebeea]">{diary.word_count || 0} Characters</span>
          </div>
        </div>

        <EditorContent editor={editor} />
      </motion.div>
    </div>
  )
}

function NotebookDiaryItem({ diary }: { diary: any }) {
  const [expanded, setExpanded] = useState(false)

  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit, Gapcursor, Image, Video, Audio, Bookmark, NotionBlock, XhsPost, BilibiliVideo, Underline, Markdown,
      Link.configure({ HTMLAttributes: { class: 'text-[#6ebeea] underline underline-offset-4' } }),
      Table, TableRow, TableHeader, TableCell, TaskList, TaskItem,
      MathExtension.configure({ evaluation: false }),
    ],
    content: expanded ? diary.content : null,
    editorProps: {
      attributes: { class: 'prose max-w-none pb-8 text-[#232f55] leading-[1.8] text-lg font-medium tracking-tight' }
    },
  })

  useEffect(() => {
    if (editor && expanded && diary?.content) {
      editor.commands.setContent(diary.content)
    }
  }, [expanded, diary?.content, editor])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/60 backdrop-blur-md rounded-[32px] p-8 shadow-sm border border-white/50"
    >
      <div
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-2xl font-black tracking-tight text-[#232f55] truncate">{diary.title}</h4>
            <p className="text-sm text-slate-400 mt-1">
              {new Date(diary.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              <span className="mx-2">·</span>
              {diary.word_count || 0} characters
            </p>
          </div>
          <div className="text-[#6ebeea] text-xs font-black uppercase tracking-widest">
            {expanded ? 'Collapse' : 'Read'}
          </div>
        </div>
      </div>

      {expanded && editor && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 pt-8 border-t border-slate-100"
        >
          <EditorContent editor={editor} />
        </motion.div>
      )}
    </motion.div>
  )
}
