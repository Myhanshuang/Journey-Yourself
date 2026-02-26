import { NodeViewWrapper } from '@tiptap/react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart, MessageCircle, Bookmark, ExternalLink, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { crawlerApi } from '../../lib/api'
import { cn } from '../../lib/utils'

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
  comments?: any[]
}

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
      window.open(sourceUrl, '_blank')
    } else {
      setShowDetail(true)
    }
  }

  const nextImage = () => setCurrentImageIndex(prev => (prev + 1) % displayImages.length)
  const prevImage = () => setCurrentImageIndex(prev => (prev - 1 + displayImages.length) % displayImages.length)

  const truncateDesc = (text: string, maxLen: number = 60) => {
    if (!text) return ''
    const cleanText = text.replace(/#[^#\s]+#/g, '').trim()
    if (cleanText.length <= maxLen) return cleanText
    return cleanText.slice(0, maxLen) + '...'
  }

  const formatNumber = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + '万'
    return num?.toString() || '0'
  }

  return (
    <>
      <NodeViewWrapper
        className={cn(
          "block my-6 rounded-[32px] overflow-hidden bg-white/90 shadow-[0_20px_40px_rgba(35,47,85,0.06)] border border-white/50 transition-all group cursor-pointer",
          selected ? 'ring-4 ring-[#6ebeea]/50' : 'hover:shadow-[0_30px_60px_rgba(35,47,85,0.12)] hover:-translate-y-1'
        )}
        onClick={handleClick}
      >
        <div className="relative aspect-[4/3] sm:aspect-video overflow-hidden">
          {displayImages.length > 0 ? (
            <img
              src={displayImages[0]}
              alt={displayTitle}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-50 to-rose-50 flex items-center justify-center">
              <span className="text-4xl opacity-50">📕</span>
            </div>
          )}
          
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />

          {/* 小红书 Badge */}
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-white">小红书</span>
          </div>

          {/* Video or Multi-image Indicator */}
          {isVideo ? (
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-16 h-16 rounded-[20px] bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                <Play size={28} className="text-[#ff2442] ml-1" fill="currentColor" />
              </div>
            </div>
          ) : displayImages.length > 1 ? (
            <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-xs font-medium tracking-widest shadow-sm">
              1/{displayImages.length}
            </div>
          ) : null}
        </div>

        <div className="p-5 flex flex-col gap-3">
          {/* Title & Desc */}
          <div>
            <h4 className="font-bold text-[#232f55] text-base leading-snug line-clamp-2">{displayTitle}</h4>
            {displayDesc && (
              <p className="text-sm text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{truncateDesc(displayDesc)}</p>
            )}
          </div>

          {/* Author & Stats Footer */}
          <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 min-w-0 pr-4">
              {authorAvatar ? (
                <img src={authorAvatar} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-[#ff2442] text-[10px] font-bold">
                  小
                </div>
              )}
              <span className="text-xs font-medium text-slate-600 truncate">{authorName || '小红书用户'}</span>
            </div>
            
            {postData?.stats && (
              <div className="flex items-center gap-3 text-slate-400 text-xs font-medium flex-shrink-0">
                <span className="flex items-center gap-1">
                  <Heart size={14} className={postData.stats.liked > 0 ? "text-[#ff2442]" : ""} /> 
                  {formatNumber(postData.stats.liked)}
                </span>
                <span className="flex items-center gap-1">
                  <Bookmark size={14} /> 
                  {formatNumber(postData.stats.collected)}
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4 md:p-8"
            onClick={() => setShowDetail(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row"
              onClick={e => e.stopPropagation()}
            >
              {/* Image Carousel (Left on Desktop, Top on Mobile) */}
              <div className="w-full md:w-[55%] relative bg-slate-100 flex-shrink-0 aspect-square md:aspect-auto flex items-center justify-center">
                {displayImages.length > 0 && (
                  <>
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={currentImageIndex}
                        src={displayImages[currentImageIndex]}
                        alt=""
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="max-w-full max-h-full object-contain"
                      />
                    </AnimatePresence>
                    
                    {displayImages.length > 1 && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); prevImage(); }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center shadow-lg transition-all hover:scale-110"
                        >
                          <ChevronLeft size={24} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); nextImage(); }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center shadow-lg transition-all hover:scale-110"
                        >
                          <ChevronRight size={24} />
                        </button>
                        
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-medium tracking-widest">
                          {currentImageIndex + 1} / {displayImages.length}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Content Area (Right on Desktop, Bottom on Mobile) */}
              <div className="flex-1 flex flex-col bg-white overflow-hidden max-h-[50vh] md:max-h-none">
                {/* Header */}
                <div className="p-5 md:p-6 border-b border-slate-100 flex items-center gap-3">
                  {authorAvatar ? (
                    <img src={authorAvatar} alt="" className="w-10 h-10 rounded-full object-cover shadow-sm" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-[#ff2442] font-bold">
                      小
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#232f55] truncate">{authorName || '小红书用户'}</p>
                    {postData?.ip_location && (
                      <p className="text-xs text-slate-400 mt-0.5">{postData.ip_location}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-[14px] bg-[#f2f4f2] flex items-center justify-center text-[#232f55]/60 hover:bg-[#ff2442] hover:text-white transition-all flex-shrink-0"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink size={18} />
                    </a>
                    <button
                      onClick={() => setShowDetail(false)}
                      className="w-10 h-10 rounded-[14px] bg-[#f2f4f2] flex items-center justify-center text-[#232f55]/60 hover:bg-slate-200 transition-all flex-shrink-0"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Scrollable Details */}
                <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
                  <h3 className="font-black text-xl text-[#232f55] leading-snug">{displayTitle}</h3>

                  {displayDesc && (
                    <p className="text-[15px] text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {displayDesc}
                    </p>
                  )}

                  {postData?.tags && postData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {postData.tags.map((tag: string, idx: number) => (
                        <span key={idx} className="text-[13px] font-medium text-[#0066cc] bg-[#0066cc]/5 px-3 py-1.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-slate-400 font-medium">
                    {postData?.created_at ? new Date(postData.created_at).toLocaleDateString() : '最近更新'}
                  </div>

                  {postData?.comments && postData.comments.length > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="font-bold text-sm text-[#232f55] mb-4">精选评论 ({postData.comments.length})</h4>
                      <div className="space-y-4">
                        {(() => {
                          const allComments = postData.comments || []
                          // XHS parent_comment_id is string '0' or number 0 or empty for top-level
                          const rootComments = allComments.filter(c => !c.parent_comment_id || c.parent_comment_id === '0' || c.parent_comment_id === 0)
                          
                          return rootComments.slice(0, 20).map((comment: any, idx: number) => {
                            const subComments = allComments.filter(c => c.parent_comment_id === comment.comment_id)
                            
                            return (
                              <div key={idx} className="flex gap-3">
                                {comment.avatar ? (
                                  <img src={comment.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-slate-700">{comment.nickname}</p>
                                  <p className="text-sm text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">
                                    {comment.content}
                                  </p>
                                  <div className="flex items-center gap-4 mt-1.5 text-[10px] text-slate-400">
                                    <span>{comment.create_time ? new Date(comment.create_time * (comment.create_time > 1e11 ? 1 : 1000)).toLocaleDateString() : ''}</span>
                                    {Number(comment.like_count) > 0 && (
                                      <span className="flex items-center gap-1">
                                        <Heart size={10} /> {formatNumber(Number(comment.like_count))}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Sub-comments */}
                                  {subComments.length > 0 && (
                                    <div className="mt-3 bg-slate-50 rounded-xl p-3 space-y-3">
                                      {subComments.slice(0, 3).map((sub: any, subIdx: number) => (
                                        <div key={subIdx} className="flex gap-2">
                                          {sub.avatar ? (
                                            <img src={sub.avatar} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                                          ) : (
                                            <div className="w-5 h-5 rounded-full bg-slate-200 flex-shrink-0" />
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-slate-700">{sub.nickname}</p>
                                            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed whitespace-pre-wrap">
                                              {sub.content}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                      {subComments.length > 3 && (
                                        <button className="text-[11px] font-bold text-[#6ebeea]">
                                          查看全部 {subComments.length} 条回复
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky Footer Stats */}
                {postData?.stats && (
                  <div className="p-4 md:p-5 border-t border-slate-100 bg-white flex items-center justify-around text-slate-500">
                    <div className="flex items-center gap-2 font-medium">
                      <Heart size={20} className="text-slate-400" /> 
                      <span>{formatNumber(postData.stats.liked)}</span>
                    </div>
                    <div className="w-px h-4 bg-slate-200" />
                    <div className="flex items-center gap-2 font-medium">
                      <Bookmark size={20} className="text-slate-400" /> 
                      <span>{formatNumber(postData.stats.collected)}</span>
                    </div>
                    <div className="w-px h-4 bg-slate-200" />
                    <div className="flex items-center gap-2 font-medium">
                      <MessageCircle size={20} className="text-slate-400" /> 
                      <span>{formatNumber(postData.stats.comment)}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
