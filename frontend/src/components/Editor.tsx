import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Gapcursor } from '@tiptap/extension-gapcursor'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import CharacterCount from '@tiptap/extension-character-count'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { MathExtension } from 'tiptap-math-extension'
import { Markdown } from 'tiptap-markdown'
import { Video } from './extensions/Video'
import { Audio } from './extensions/Audio'
import { Image } from './extensions/Image'
import { Bookmark } from './extensions/Bookmark'
import { NotionBlock } from './extensions/NotionBlock'
import { XhsPost } from './extensions/XhsPost'
import { BilibiliVideo } from './extensions/BilibiliVideo'
import { useEffect, useState, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bold, Italic, Underline as UnderlineIcon, List, 
  ImageIcon, Save, ArrowLeft, Book,
  Heading1, Heading2, Quote, Code, ListOrdered, MapPin, Smile, Cloud, Tag, Sun,
  Table as TableIcon, Sigma, ListChecks, Video as VideoIcon, Music, Upload, Bookmark as BookmarkIcon, FileText
} from 'lucide-react'
import { cn, useToast, ServiceSetupModal, useIsMobile } from './ui/JourneyUI'
import { useQuery } from '@tanstack/react-query'
import MoodPicker from './modals/MoodPicker'
import LocationModal from './modals/LocationModal'
import ImmichPicker from './modals/ImmichPicker'
import KarakeepPicker from './modals/KarakeepPicker'
import NotionPicker from './modals/NotionPicker'
import XhsPicker from './modals/XhsPicker'
import BilibiliPicker from './modals/BilibiliPicker'
import TagPicker from './modals/TagPicker'
import WeatherModal from './modals/WeatherModal'
import NotebookPicker from './modals/NotebookPicker'
import { immichApi, userApi, assetApi } from '../lib/api'
import { saveDiaryCache, clearDiaryCache, isCacheEmpty } from '../lib/cache'
import type { DiaryCache } from '../lib/cache'

import 'katex/dist/katex.min.css'

function countWordsCJK(text: string): number {
  if (!text) return 0
  const pattern = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\u20000-\u2fa1f]|[a-zA-Z0-9]+(?:'[a-zA-Z0-9]+)?/g
  const matches = text.match(pattern)
  return matches ? matches.length : 0
}

// 自动保存间隔（毫秒）
const AUTO_SAVE_INTERVAL = 500

export interface EditorRef {
  getCurrentData: () => EditorData
  hasUnsavedChanges: () => boolean
  clearCache: () => void
  saveCacheNow: () => void
}

export interface EditorData {
  title: string
  content: any
  notebook_id: number
  mood: any
  location: any
  tags: string[]
  weather: any
}

interface EditorProps {
  onSave: (data: any) => void
  onClose: () => void
  notebooks: any[]
  initialNotebookId?: number
  initialData?: any
  cacheToRestore?: DiaryCache | null
  onCacheRestored?: () => void
}

const DiaryEditor = forwardRef<EditorRef, EditorProps>(({ 
  onSave, 
  onClose, 
  notebooks, 
  initialNotebookId, 
  initialData,
  cacheToRestore,
  onCacheRestored
}, ref) => {
  const { data: user } = useQuery({ queryKey: ['user', 'me'], queryFn: userApi.me })
  const isMobile = useIsMobile()
  
  // 判断是编辑现有日记还是新建日记
  const isEditingExisting = !!initialData?.id
  const diaryId = initialData?.id
  
  // 初始化状态 - 如果有缓存则使用缓存数据
  const [title, setTitle] = useState(() => {
    if (cacheToRestore) return cacheToRestore.title || ''
    return initialData?.title || ''
  })
  const [selectedNotebookId, setSelectedNotebookId] = useState<number>(() => {
    if (cacheToRestore) return cacheToRestore.notebookId
    return initialNotebookId || initialData?.notebook_id || notebooks[0]?.id
  })
  const [mood, setMood] = useState<any>(() => {
    if (cacheToRestore) return cacheToRestore.mood
    return initialData?.mood || null
  })
  const [location, setLocation] = useState<any>(() => {
    if (cacheToRestore) return cacheToRestore.location
    return initialData?.location_snapshot || null
  })
  const [weather, setWeather] = useState<any>(() => {
    if (cacheToRestore) return cacheToRestore.weather
    return initialData?.weather_snapshot || null
  })
  const [tags, setTags] = useState<string[]>(() => {
    if (cacheToRestore) return cacheToRestore.tags || []
    return initialData?.tags || []
  })
  
  const [activeModal, setActiveModal] = useState<'notebook' | 'mood' | 'location' | 'immich' | 'karakeep' | 'notion' | 'xhs' | 'bilibili' | 'tags' | 'weather' | 'unconfigured' | null>(null)
  const [unconfiguredType, setUnconfiguredType] = useState<'immich' | 'karakeep' | 'geo' | 'notion' | null>(null)
  const [realWordCount, setRealWordCount] = useState(0)
  const [uploading, setUploading] = useState<'video' | 'audio' | 'image' | null>(null)
  const [, forceUpdate] = useState(0)  // 用于强制更新编辑器状态
  const addToast = useToast(state => state.add)
  
  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  
  // 用于追踪是否有未保存的更改
  const lastSavedDataRef = useRef<string>('')
  const initialDataRef = useRef<string>('')  // 记录进入编辑器时的原始数据
  const isInitializedRef = useRef(false)  // 追踪是否已初始化
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isRestoringRef = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ 
        heading: { levels: [1, 2, 3] },
        dropcursor: { color: '#6ebeea', width: 2 },
      }),
      Gapcursor,
      Image,
      Video,
      Audio,
      Bookmark,
      NotionBlock,
      XhsPost,
      BilibiliVideo,
      Underline, 
      CharacterCount, 
      Markdown,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-[#6ebeea] underline underline-offset-4' } }),
      Placeholder.configure({ placeholder: "Tell your story..." }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      TaskList, TaskItem.configure({ nested: true }),
      MathExtension.configure({ evaluation: false }),
    ],
    content: cacheToRestore?.content || initialData?.content || { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate: ({ editor }) => setRealWordCount(countWordsCJK(editor.getText())),
    onTransaction: () => forceUpdate(v => v + 1),  // 格式变化时强制重新渲染
    editorProps: { 
      attributes: { class: cn('prose max-w-none focus:outline-none min-h-[600px] pb-40 leading-relaxed text-[#232f55]', isMobile ? 'text-base' : 'text-lg') } 
    },
  })

  // 获取当前编辑数据
  const getCurrentData = useCallback((): EditorData => {
    return {
      title,
      content: editor?.getJSON() || { type: 'doc', content: [{ type: 'paragraph' }] },
      notebook_id: selectedNotebookId,
      mood,
      location,
      tags,
      weather
    }
  }, [title, editor, selectedNotebookId, mood, location, tags, weather])

  // 保存缓存到localStorage
  const saveCacheNow = useCallback(() => {
    if (!editor || !selectedNotebookId) return
    
    const data = getCurrentData()
    const dataString = JSON.stringify(data)
    
    // 只有数据变化时才保存
    if (dataString !== lastSavedDataRef.current) {
      lastSavedDataRef.current = dataString
      
      saveDiaryCache({
        cacheId: isEditingExisting ? `edit_${diaryId}` : 'new',
        diaryId: isEditingExisting ? diaryId : undefined,
        title: data.title,
        content: data.content,
        notebookId: data.notebook_id,
        mood: data.mood,
        location: data.location,
        weather: data.weather,
        tags: data.tags,
        isNewDiary: !isEditingExisting,
        originalCreatedAt: isEditingExisting ? initialData?.date : undefined
      })
    }
  }, [editor, selectedNotebookId, getCurrentData, isEditingExisting, diaryId, initialData])

  // 检查是否有未保存的更改（比较当前数据和初始数据）
  const hasUnsavedChanges = useCallback(() => {
    if (!editor) return false
    const data = getCurrentData()
    const dataString = JSON.stringify(data)
    return dataString !== initialDataRef.current
  }, [editor, getCurrentData])

  // 清除缓存
  const clearCache = useCallback(() => {
    clearDiaryCache(
      isEditingExisting ? `edit_${diaryId}` : 'new',
      isEditingExisting ? diaryId : undefined
    )
    // 更新lastSavedDataRef以匹配当前状态
    lastSavedDataRef.current = JSON.stringify(getCurrentData())
  }, [isEditingExisting, diaryId, getCurrentData])

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    getCurrentData,
    hasUnsavedChanges,
    clearCache,
    saveCacheNow
  }), [getCurrentData, hasUnsavedChanges, clearCache, saveCacheNow])

  // 处理缓存恢复完成
  useEffect(() => {
    if (cacheToRestore && onCacheRestored) {
      isRestoringRef.current = true
      // 恢复所有缓存状态
      setTitle(cacheToRestore.title || '')
      setSelectedNotebookId(cacheToRestore.notebookId)
      setMood(cacheToRestore.mood)
      setLocation(cacheToRestore.location)
      setWeather(cacheToRestore.weather)
      setTags(cacheToRestore.tags || [])
      
      // 延迟设置editor内容，确保editor已初始化
      setTimeout(() => {
        if (editor && cacheToRestore.content) {
          editor.commands.setContent(cacheToRestore.content)
          setRealWordCount(countWordsCJK(editor.getText()))
        }
        isRestoringRef.current = false
        // 使用缓存数据初始化 ref（因为状态更新是异步的）
        const restoredDataString = JSON.stringify({
          title: cacheToRestore.title || '',
          content: cacheToRestore.content,
          notebook_id: cacheToRestore.notebookId,
          mood: cacheToRestore.mood,
          location: cacheToRestore.location,
          tags: cacheToRestore.tags || [],
          weather: cacheToRestore.weather
        })
        lastSavedDataRef.current = restoredDataString
        initialDataRef.current = restoredDataString
        isInitializedRef.current = true
        onCacheRestored()
      }, 100)
    }
  }, [cacheToRestore, editor, onCacheRestored])

  // 初始化lastSavedDataRef和initialDataRef（只在编辑器首次加载时执行一次）
  useEffect(() => {
    if (editor && !cacheToRestore && !isInitializedRef.current) {
      const dataString = JSON.stringify(getCurrentData())
      lastSavedDataRef.current = dataString
      initialDataRef.current = dataString
      isInitializedRef.current = true
    }
  }, [editor, cacheToRestore])

  // 自动保存定时器
  useEffect(() => {
    if (!editor) return
    
    autoSaveTimerRef.current = setInterval(() => {
      if (!isRestoringRef.current) {
        saveCacheNow()
      }
    }, AUTO_SAVE_INTERVAL)
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [editor, saveCacheNow])

  // 更新initialData时重置状态（仅当没有缓存恢复时）
  useEffect(() => {
    if (initialData && editor && !cacheToRestore && !isInitializedRef.current) {
      setTitle(initialData.title)
      editor.commands.setContent(initialData.content)
      setRealWordCount(countWordsCJK(editor.getText()))
      setSelectedNotebookId(initialData.notebook_id)
      setMood(initialData.mood)
      setLocation(initialData.location_snapshot)
      setWeather(initialData.weather_snapshot)
      setTags(initialData.tags || [])
      // 更新lastSavedDataRef和initialDataRef
      const dataString = JSON.stringify({
        title: initialData.title,
        content: initialData.content,
        notebook_id: initialData.notebook_id,
        mood: initialData.mood,
        location: initialData.location_snapshot,
        tags: initialData.tags || [],
        weather: initialData.weather_snapshot
      })
      lastSavedDataRef.current = dataString
      initialDataRef.current = dataString
    }
  }, [initialData, editor, cacheToRestore])

  if (!editor) return null
  const currentNotebook = notebooks.find((n:any) => n.id === selectedNotebookId) || notebooks[0]

  const handleServiceClick = (type: 'immich' | 'karakeep' | 'geo' | 'notion', modal: any) => {
    if (type === 'immich' && !user?.has_immich_key) {
      setUnconfiguredType('immich'); setActiveModal('unconfigured'); return
    }
    if (type === 'karakeep' && !user?.has_karakeep_key) {
      setUnconfiguredType('karakeep'); setActiveModal('unconfigured'); return
    }
    if (type === 'geo' && !user?.has_geo_key) {
      setUnconfiguredType('geo'); setActiveModal('unconfigured'); return
    }
    if (type === 'notion' && !user?.has_notion_key) {
      setUnconfiguredType('notion'); setActiveModal('unconfigured'); return
    }
    setActiveModal(modal)
  }
  
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading('video')
    try {
      const result = await assetApi.uploadVideo(file)
      editor.chain().focus().setVideo({ src: result.url }).run()
      addToast('success', 'Video uploaded')
    } catch (err: any) {
      addToast('error', err.response?.data?.detail || 'Video upload failed')
    } finally {
      setUploading(null)
      if (videoInputRef.current) videoInputRef.current.value = ''
    }
  }
  
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading('audio')
    try {
      const result = await assetApi.uploadAudio(file)
      editor.chain().focus().setAudio({ src: result.url }).run()
      addToast('success', 'Audio uploaded')
    } catch (err: any) {
      addToast('error', err.response?.data?.detail || 'Audio upload failed')
    } finally {
      setUploading(null)
      if (audioInputRef.current) audioInputRef.current.value = ''
    }
  }
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading('image')
    try {
      const result = await assetApi.uploadCover(file)
      editor.chain().focus().setImage({ src: result.url }).run()
      addToast('success', 'Image uploaded')
    } catch (err: any) {
      addToast('error', err.response?.data?.detail || 'Image upload failed')
    } finally {
      setUploading(null)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  // 处理保存日记
  const handleSave = () => {
    if (!title.trim()) return addToast('error', 'Title required')
    if (!selectedNotebookId) return addToast('error', 'Please select a notebook')
    
    const data = getCurrentData()
    onSave({ 
      title: data.title, 
      content: data.content, 
      notebook_id: data.notebook_id, 
      mood: data.mood, 
      location: data.location, 
      tags: data.tags, 
      stats: { weather: data.weather },
      // 如果是编辑现有日记，保留原始创建时间
      date: isEditingExisting ? initialData?.date : undefined
    })
    // 保存成功后清除缓存
    clearCache()
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className={cn("fixed inset-0 bg-[#f2f4f2] z-[200] flex flex-col overflow-hidden text-[#232f55] font-sans", isMobile && "pt-[5vh]")}>
      <header className="h-16 md:h-20 border-b border-[#232f55]/5 px-4 md:px-8 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={onClose} className="p-2 md:p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-400"><ArrowLeft size={20} /></button>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[65vw]">
            <HeaderButton icon={<Book size={14} className="text-[#6ebeea]"/>} label={currentNotebook?.name} onClick={() => setActiveModal('notebook')} />
            <HeaderButton icon={mood ? <span className="text-lg">{mood.emoji}</span> : <Smile size={14}/>} label={mood ? mood.label : 'Mood'} onClick={() => setActiveModal('mood')} highlight={!!mood} />
            <HeaderButton icon={<Sun size={14}/>} label={weather ? `${weather.weather}` : 'Weather'} onClick={() => handleServiceClick('geo', 'weather')} highlight={!!weather} />
            
            <HeaderButton icon={<MapPin size={14}/>} label={location ? location.name : 'Place'} onClick={() => handleServiceClick('geo', 'location')} highlight={!!location} />
            <HeaderButton icon={<Tag size={14}/>} label={tags.length > 0 ? `${tags.length} Tags` : 'Tags'} onClick={() => setActiveModal('tags')} highlight={tags.length > 0} />
            <HeaderButton icon={<ImageIcon size={14} className="text-[#6ebeea]"/>} label="Photos" onClick={() => handleServiceClick('immich', 'immich')} />
            <HeaderButton icon={<BookmarkIcon size={14} className="text-pink-500"/>} label="Karakeep" onClick={() => handleServiceClick('karakeep', 'karakeep')} />
            <HeaderButton icon={<span className="text-sm">📕</span>} label="小红书" onClick={() => setActiveModal('xhs')} />
            <HeaderButton icon={<span className="text-sm">📺</span>} label="B站" onClick={() => setActiveModal('bilibili')} />
            <HeaderButton icon={<FileText size={14} className="text-slate-600"/>} label="Notion" onClick={() => handleServiceClick('notion', 'notion')} />
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden md:flex flex-col items-end"><span className="text-[9px] font-black uppercase text-[#232f55]/30 tracking-widest">Words</span><motion.div key={realWordCount} initial={{ y: 3, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-base font-black text-[#6ebeea] tabular-nums">{realWordCount}</motion.div></div>
          <button 
            onClick={handleSave} 
            className="px-6 md:px-10 py-2.5 md:py-4 bg-[#232f55] text-white rounded-[20px] md:rounded-[24px] font-black text-sm md:text-lg shadow-xl active:scale-95 transition-all flex items-center gap-2"
          >
            <Save size={18}/> <span className="hidden sm:inline">{initialData ? 'Update' : 'Publish'}</span>
          </button>
        </div>
      </header>

      <div className="bg-white/40 border-b border-[#232f55]/5 px-4 md:px-8 py-2 flex items-center gap-1 overflow-x-auto no-scrollbar shadow-inner">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={<Bold size={18} />} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon={<Italic size={18} />} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} icon={<UnderlineIcon size={18} />} />
        <div className="w-px h-6 bg-[#232f55]/10 mx-1 md:mx-2" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} icon={<Heading1 size={18} />} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} icon={<Heading2 size={18} />} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon={<List size={18} />} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} icon={<ListOrdered size={18} />} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} icon={<ListChecks size={18} />} />
        <div className="w-px h-6 bg-[#232f55]/10 mx-1 md:mx-2" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} icon={<Quote size={18} />} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} icon={<Code size={18} />} title="Code Block" />
        <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} icon={<TableIcon size={18} />} />
        <ToolbarButton onClick={() => editor.chain().focus().insertContent(' $\\alpha$ ').run()} icon={<Sigma size={18}/>} />
        <div className="w-px h-6 bg-[#232f55]/10 mx-1 md:mx-2" />
        <ToolbarButton 
          onClick={() => imageInputRef.current?.click()} 
          icon={uploading === 'image' ? <div className="w-4 h-4 border-2 border-[#6ebeea]/30 border-t-[#6ebeea] rounded-full animate-spin" /> : <ImageIcon size={18} />} 
          title="Upload Image"
        />
        <ToolbarButton 
          onClick={() => videoInputRef.current?.click()} 
          icon={uploading === 'video' ? <div className="w-4 h-4 border-2 border-[#6ebeea]/30 border-t-[#6ebeea] rounded-full animate-spin" /> : <VideoIcon size={18} />} 
          title="Upload Video"
        />
        <ToolbarButton 
          onClick={() => audioInputRef.current?.click()} 
          icon={uploading === 'audio' ? <div className="w-4 h-4 border-2 border-[#6ebeea]/30 border-t-[#6ebeea] rounded-full animate-spin" /> : <Music size={18} />} 
          title="Upload Audio"
        />
        
        {/* Hidden file inputs */}
        <input 
          ref={imageInputRef} 
          type="file" 
          accept="image/jpeg,image/png,image/webp,image/gif" 
          className="hidden" 
          onChange={handleImageUpload} 
        />
        <input 
          ref={videoInputRef} 
          type="file" 
          accept="video/mp4,video/webm,video/ogg,video/quicktime" 
          className="hidden" 
          onChange={handleVideoUpload} 
        />
        <input 
          ref={audioInputRef} 
          type="file" 
          accept="audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/mp3,audio/aac" 
          className="hidden" 
          onChange={handleAudioUpload} 
        />
      </div>

      <div className={cn("flex-1 overflow-y-auto pt-10 px-4", isMobile ? "pt-6" : "md:pt-20 md:px-0")}>
        <div className="max-w-[840px] mx-auto pb-40 text-[#232f55]">
           <input className={cn("w-full bg-transparent border-none outline-none font-black tracking-tighter placeholder:text-[#232f55]/10 text-[#232f55] mb-8 md:mb-12", isMobile ? "text-4xl" : "text-4xl md:text-7xl")} placeholder="Title..." value={title} onChange={e => setTitle(e.target.value)} />
           <div className="h-px bg-[#232f55]/5 w-20 md:w-40 mb-10 md:mb-16" />
           <EditorContent editor={editor} />
        </div>
      </div>

      <AnimatePresence>
        {activeModal === 'unconfigured' && (
          <ServiceSetupModal 
            type={unconfiguredType as any} 
            onClose={() => setActiveModal(null)} 
          />
        )}
        {activeModal === 'notebook' && <NotebookPicker notebooks={notebooks} selectedId={selectedNotebookId} onSelect={(id:number) => { setSelectedNotebookId(id); setActiveModal(null); }} onClose={() => setActiveModal(null)} />}
        {activeModal === 'mood' && <MoodPicker mood={mood} onSelect={(m:any) => { setMood(m); setActiveModal(null); }} onClose={() => setActiveModal(null)} />}
        {activeModal === 'location' && <LocationModal currentSelection={location} onSelect={(l:any) => { setLocation(l); setActiveModal(null); }} onClose={() => setActiveModal(null)} />}
        {activeModal === 'tags' && <TagPicker selectedTags={tags} onUpdate={setTags} onClose={() => setActiveModal(null)} />}
        {activeModal === 'weather' && <WeatherModal currentData={weather} onSelect={(w:any) => { setWeather(w); setActiveModal(null); }} onClose={() => setActiveModal(null)} />}
        {activeModal === 'immich' && (
          <ImmichPicker 
            onSelect={async (assetId:string, sig: string, mode:any) => {
              try {
                const result = await immichApi.importAsset(assetId, mode)
                const baseUrl = (() => {
                  const storedUrl = localStorage.getItem('server_url')
                  return storedUrl ? `${storedUrl.replace(/\/$/, '')}/api` : '/api'
                })()
                
                // link模式使用签名URL，copy模式使用返回的URL
                const finalUrl = mode === 'link' 
                  ? (result.mediaType === 'video' 
                      ? `${baseUrl}/proxy/immich/video/${assetId}?sig=${result.signature}` 
                      : `${baseUrl}/proxy/immich/original/${assetId}?sig=${result.signature}`)
                  : result.url
                
                // 根据媒体类型插入不同的元素
                if (result.mediaType === 'video') {
                  editor.chain().focus().setVideo({ src: finalUrl }).run()
                } else {
                  editor.chain().focus().setImage({ src: finalUrl }).run()
                }
                setActiveModal(null)
              } catch(e) { alert('Failed') }
            }} 
            onClose={() => setActiveModal(null)} 
          />
        )}
        {activeModal === 'karakeep' && (
          <KarakeepPicker 
            onSelect={(bookmark: any) => {
              editor.chain().focus().insertContent({
                type: 'bookmark',
                attrs: {
                  url: bookmark.url,
                  title: bookmark.title || bookmark.url,
                  description: bookmark.description || '',
                  image: bookmark.image_url || '',
                }
              }).run()
              setActiveModal(null)
            }}
            onClose={() => setActiveModal(null)} 
          />
        )}
        {activeModal === 'notion' && (
          <NotionPicker
            onSelect={(page: any) => {
              editor.chain().focus().setNotionBlock({
                pageId: page.id,
                title: page.title,
                icon: page.icon,
                cover: page.cover,
                url: page.url,
              }).run()
              setActiveModal(null)
            }}
            onClose={() => setActiveModal(null)}
          />
        )}
        {activeModal === 'xhs' && (
          <XhsPicker
            onSelect={(data: any) => {
              editor.chain().focus().setXhsPost({
                noteId: data.noteId,
                title: data.title,
                images: data.images,
                noteType: data.noteType,
                desc: data.desc
              }).run()
              setActiveModal(null)
            }}
            onClose={() => setActiveModal(null)}
          />
        )}
        {activeModal === 'bilibili' && (
          <BilibiliPicker
            onSelect={(data: any) => {
              editor.chain().focus().setBilibiliVideo({
                videoId: data.videoId,
                title: data.title,
                cover: data.cover
              }).run()
              setActiveModal(null)
            }}
            onClose={() => setActiveModal(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
})

DiaryEditor.displayName = 'DiaryEditor'

export default DiaryEditor

function HeaderButton({ icon, label, onClick, highlight, className }: any) {
  return <button onClick={onClick} className={cn("flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-transparent transition-all text-[11px] font-black max-w-[160px] text-[#232f55]", highlight ? "bg-[#6ebeea]/10 text-[#6ebeea]" : "bg-white/50 text-[#232f55]/40 hover:bg-white", className)}>{icon} <span className="truncate hidden md:inline">{label}</span></button>
}

function ToolbarButton({ onClick, active, icon, highlight, title }: any) {
  return <button onMouseDown={e=>e.preventDefault()} onClick={onClick} title={title} className={cn("p-2 md:p-2.5 rounded-xl transition-all flex items-center justify-center border border-transparent shrink-0 active:scale-95", active ? 'bg-white shadow-sm text-[#6ebeea]' : highlight ? 'text-[#6ebeea]' : 'text-[#232f55]/40 hover:text-[#232f55] hover:bg-white/50')}>{icon}</button>
}
