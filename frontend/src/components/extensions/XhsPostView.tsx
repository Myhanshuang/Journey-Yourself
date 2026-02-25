import { NodeViewWrapper } from '@tiptap/react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart, MessageCircle, Bookmark, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { crawlerApi } from '../../lib/api'

interface XhsPostViewProps {
  node: {
    attrs: {
      noteId: string
      title?: string
      images?: string[]
      noteType?: string
      desc?: string
    }
  }
  selected: boolean
}

interface PostData {
  note_id: string
  title: string
  desc?: string
  note_type?: string
  video_url?: string
  author?: {
    name: string
    avatar?: string
  }
  stats?: {
    liked: number
    collected: number
    comment: number
    share: number
  }
  images?: { path: string }[]
  ip_location?: string
  source_url?: string
  tags?: string[]
}

// 规范化图片路径，确保以 / 开头
const normalizePath = (path: string) => {
  if (!path) return ''
  return path.startsWith('/') ? path : '/' + path
}

export default function XhsPostView({ node, selected }: XhsPostViewProps) {
  const { noteId, title: initialTitle, images: initialImages, noteType: initialNoteType, desc: initialDesc } = node.attrs
  const [showDetail, setShowDetail] = useState(false)
  const [postData, setPostData] = useState<PostData | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const displayTitle = postData?.title || initialTitle || '小红书帖子'
  const displayDesc = postData?.desc || initialDesc
  const displayImages = postData?.images?.map(img => normalizePath(img.path)) || 
                         (initialImages || []).map(img => normalizePath(img))
  const isVideo = postData?.note_type === 'video' || initialNoteType === 'video'
  const authorName = postData?.author?.name
  const authorAvatar = postData?.author?.avatar
  const sourceUrl = postData?.source_url || `https://www.xiaohongshu.com/explore/${noteId}`

  // 加载数据
  useEffect(() => {
    if (noteId && !postData) {
      setLoading(true)
      crawlerApi.getXhsPost(noteId)
        .then(data => setPostData(data))
        .catch(err => console.error('Failed to load post:', err))
        .finally(() => setLoading(false))
    }
  }, [noteId, postData])

  const handleClick = () => {
    if (isVideo) {
      // 视频帖子直接跳转到小红书
      window.open(sourceUrl, '_blank')
    } else {
      // 图文帖子打开详情
      setShowDetail(true)
    }
  }

  const nextImage = () => {
    setCurrentImageIndex(prev => (prev + 1) % displayImages.length)
  }

  const prevImage = () => {
    setCurrentImageIndex(prev => (prev - 1 + displayImages.length) % displayImages.length)
  }

  // 截断简介
  const truncateDesc = (text: string, maxLen: number = 60) => {
    if (!text) return ''
    // 移除话题标签
    const cleanText = text.replace(/#[^#\s]+#/g, '').trim()
    if (cleanText.length <= maxLen) return cleanText
    return cleanText.slice(0, maxLen) + '...'
  }

  return (
    <>
      <NodeViewWrapper
        className={`block bg-white rounded-[24px] overflow-hidden shadow-lg border border-slate-100 my-4 hover:shadow-xl transition-shadow cursor-pointer ${selected ? 'ring-2 ring-[#6ebeea]' : ''}`}
        onClick={handleClick}
      >
        {/* Author Header */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          {authorAvatar ? (
            <img src={authorAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-sm">📕</span>
            </div>
          )}
          <span className="font-medium text-sm text-slate-900 truncate">{authorName || '小红书用户'}</span>
          <span className="ml-auto text-[10px] font-black uppercase tracking-wider text-red-500 bg-red-50 px-2 py-1 rounded-md">
            小红书
          </span>
        </div>

        {/* Video or Image */}
        {displayImages.length > 0 ? (
          <div className="relative">
            <img
              src={displayImages[0]}
              alt={displayTitle}
              className="block w-full aspect-video object-cover"
            />
            {isVideo ? (
              // 视频标识
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="px-3 py-1.5 bg-black/60 rounded-full flex items-center gap-2">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <span className="text-white text-xs font-medium">点击观看视频</span>
                </div>
              </div>
            ) : displayImages.length > 1 ? (
              // 多图标识
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                1/{displayImages.length}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
            <span className="text-4xl">📕</span>
          </div>
        )}

        {/* Title and Description */}
        <div className="p-4">
          <p className="font-bold text-[#232f55] text-sm line-clamp-2">{displayTitle}</p>
          {displayDesc && (
            <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{truncateDesc(displayDesc)}</p>
          )}
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-slate-400">
              {isVideo ? '视频' : displayImages.length > 0 ? `${displayImages.length} 张图片` : '帖子'}
            </p>
            {postData?.stats && (
              <div className="flex items-center gap-3 text-slate-400 text-xs">
                <span className="flex items-center gap-1">
                  <Heart size={12} /> {postData.stats.liked}
                </span>
                <span className="flex items-center gap-1">
                  <Bookmark size={12} /> {postData.stats.collected}
                </span>
              </div>
            )}
          </div>
        </div>
      </NodeViewWrapper>

      {/* Image Post Detail Modal */}
      <AnimatePresence>
        {showDetail && !isVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[400] flex items-center justify-center p-4"
            onClick={() => setShowDetail(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header with Author */}
              <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                {authorAvatar ? (
                  <img src={authorAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-lg">📕</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{authorName || '小红书用户'}</p>
                  {postData?.ip_location && (
                    <p className="text-xs text-slate-400">{postData.ip_location}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink size={18} className="text-slate-400" />
                  </a>
                  <button
                    onClick={() => setShowDetail(false)}
                    className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <X size={18} className="text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Image Carousel */}
              {displayImages.length > 0 && (
                <div className="relative bg-slate-900 aspect-square">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentImageIndex}
                      src={displayImages[currentImageIndex]}
                      alt=""
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="w-full h-full object-contain"
                    />
                  </AnimatePresence>
                  
                  {/* Navigation Arrows */}
                  {displayImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); prevImage(); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
                      >
                        <ChevronLeft size={24} className="text-white" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); nextImage(); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
                      >
                        <ChevronRight size={24} className="text-white" />
                      </button>
                      
                      {/* Page Indicator */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                        {displayImages.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                              idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                      
                      {/* Counter */}
                      <div className="absolute top-3 right-3 bg-black/40 text-white text-xs px-2 py-1 rounded-full">
                        {currentImageIndex + 1} / {displayImages.length}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="overflow-y-auto flex-1">
                <div className="p-4 space-y-4">
                  {/* Title */}
                  <h3 className="font-bold text-lg text-[#232f55]">{displayTitle}</h3>

                  {/* Stats */}
                  {postData?.stats && (
                    <div className="flex items-center gap-5 text-slate-500">
                      <span className="flex items-center gap-1.5 text-sm">
                        <Heart size={16} className="text-red-400" /> {postData.stats.liked}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm">
                        <Bookmark size={16} className="text-yellow-500" /> {postData.stats.collected}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm">
                        <MessageCircle size={16} /> {postData.stats.comment}
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  {displayDesc && (
                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{displayDesc}</p>
                  )}

                  {/* Tags */}
                  {postData?.tags && postData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {postData.tags.map((tag: string, idx: number) => (
                        <span key={idx} className="text-xs text-[#6ebeea] bg-[#6ebeea]/10 px-2 py-1 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}