import { NodeViewWrapper } from '@tiptap/react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart, MessageCircle, Bookmark, ExternalLink, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { crawlerApi } from '../../lib/api'
import { cn, getAssetUrl } from '../../lib/utils'
import ImageViewer from '../common/ImageViewer'

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

export default function XhsPostView({ node, selected }: XhsPostViewProps) {
  const { noteId, title: initialTitle, images: initialImages, noteType: initialNoteType, desc: initialDesc } = node.attrs
  const [showDetail, setShowDetail] = useState(false)
  const [postData, setPostData] = useState<PostData | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showImageViewer, setShowImageViewer] = useState(false)

  const displayTitle = postData?.title || initialTitle || '小红书帖子'
  const displayDesc = postData?.desc || initialDesc
  const rawImages = postData?.images?.map(img => img.path) || initialImages || []
  const displayImages = rawImages.map(img => getAssetUrl(img) || '')
  
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

  const renderHeader = (isMobile: boolean) => (
    <div className={cn("flex items-center gap-3 bg-white w-full", isMobile ? "p-3 border-b border-slate-100" : "p-5 lg:p-6 border-b border-slate-100")}>
      {authorAvatar ? (
        <img src={authorAvatar} alt="" className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover shadow-sm" />
      ) : (
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-red-100 flex items-center justify-center text-[#ff2442] font-bold">
          小
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#232f55] truncate text-sm md:text-base">{authorName || '小红书用户'}</p>
        {postData?.ip_location && (
          <p className="text-[10px] md:text-xs text-slate-400 mt-0.5">{postData.ip_location}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 md:w-10 md:h-10 rounded-[12px] md:rounded-[14px] bg-[#f2f4f2] flex items-center justify-center text-[#232f55]/60 hover:bg-[#ff2442] hover:text-white transition-all flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <ExternalLink size={16} />
        </a>
        <button
          onClick={() => setShowDetail(false)}
          className="w-8 h-8 md:w-10 md:h-10 rounded-[12px] md:rounded-[14px] bg-[#f2f4f2] flex items-center justify-center text-[#232f55]/60 hover:bg-slate-200 transition-all flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )

  const renderFooter = () => {
    if (!postData?.stats) return null
    return (
      <div className="p-3 md:p-4 lg:p-5 border-t border-slate-100 bg-white flex items-center justify-around text-slate-500 w-full">
        <div className="flex items-center gap-1.5 md:gap-2 font-medium text-xs md:text-sm">
          <Heart size={18} className="text-slate-400 md:w-5 md:h-5" /> 
          <span>{formatNumber(postData.stats.liked)}</span>
        </div>
        <div className="w-px h-3 md:h-4 bg-slate-200" />
        <div className="flex items-center gap-1.5 md:gap-2 font-medium text-xs md:text-sm">
          <Bookmark size={18} className="text-slate-400 md:w-5 md:h-5" /> 
          <span>{formatNumber(postData.stats.collected)}</span>
        </div>
        <div className="w-px h-3 md:h-4 bg-slate-200" />
        <div className="flex items-center gap-1.5 md:gap-2 font-medium text-xs md:text-sm">
          <MessageCircle size={18} className="text-slate-400 md:w-5 md:h-5" /> 
          <span>{formatNumber(postData.stats.comment)}</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <NodeViewWrapper
        className={cn(
          "block my-3 rounded-[32px] overflow-hidden bg-white/90 shadow-[0_20px_40px_rgba(35,47,85,0.06)] border border-white/50 transition-all group cursor-pointer",
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
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 z-10">
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
            <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-xs font-medium tracking-widest shadow-sm z-10">
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-center justify-center p-0 md:p-8"
            onClick={() => setShowDetail(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-[32px] md:rounded-[32px] mt-10 md:mt-0 shadow-2xl w-full h-[calc(100vh-40px)] md:h-[80vh] md:max-h-[900px] md:max-w-5xl overflow-hidden flex flex-col md:flex-row"
              onClick={e => e.stopPropagation()}
            >
              
              {/* --- MOBILE STICKY HEADER --- */}
              <div className="md:hidden flex-shrink-0 z-10">
                {renderHeader(true)}
              </div>

              {/* --- SCROLLABLE AREA (MOBILE) / FLEX CONTAINER (DESKTOP) --- */}
              <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row w-full h-full">
                
                {/* IMAGE CAROUSEL: Scrolls inline on mobile, Fixed left on desktop */}
                <div 
                  className="w-full md:w-[55%] md:h-full relative bg-slate-100 flex-shrink-0 aspect-square md:aspect-auto flex items-center justify-center cursor-pointer overflow-hidden"
                  onClick={() => setShowImageViewer(true)}
                >
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
                          className="w-full h-full object-contain m-auto"
                        />
                      </AnimatePresence>
                      
                      {displayImages.length > 1 && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); prevImage(); }}
                            className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center shadow-lg transition-all hover:scale-110 z-10"
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); nextImage(); }}
                            className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center shadow-lg transition-all hover:scale-110 z-10"
                          >
                            <ChevronRight size={20} />
                          </button>
                          
                          <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md text-white text-[10px] md:text-xs px-2.5 py-1 md:px-3 md:py-1.5 rounded-full font-medium tracking-widest pointer-events-none z-10">
                            {currentImageIndex + 1} / {displayImages.length}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* CONTENT AREA: Follows image on mobile, Right column on desktop */}
                <div className="flex-1 flex flex-col bg-white overflow-visible md:overflow-hidden h-auto md:h-full">
                  
                  {/* --- DESKTOP FIXED HEADER --- */}
                  <div className="hidden md:block flex-shrink-0 z-10">
                    {renderHeader(false)}
                  </div>

                  {/* Scrollable Details */}
                  <div className="flex-1 overflow-visible md:overflow-y-auto p-4 md:p-5 lg:p-6 flex flex-col gap-6 md:gap-7">
                    
                    {/* Content Group */}
                    <div className="flex flex-col gap-3 md:gap-4">
                      <h3 className="font-black text-lg md:text-xl text-[#232f55] leading-snug">{displayTitle}</h3>

                      {displayDesc && (
                        <p className="text-sm md:text-[15px] text-slate-600 whitespace-pre-wrap leading-relaxed">
                          {displayDesc}
                        </p>
                      )}

                      {postData?.tags && postData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {postData.tags.map((tag: string, idx: number) => (
                            <span key={idx} className="text-xs font-medium text-[#0066cc] bg-[#0066cc]/5 px-2.5 py-1 rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="text-[10px] md:text-xs text-slate-400 font-medium">
                        {postData?.created_at ? new Date(postData.created_at).toLocaleDateString() : '最近更新'}
                      </div>
                    </div>

                    {postData?.comments && postData.comments.length > 0 && (
                      <div className="pt-4 border-t border-slate-100">
                        <h4 className="font-bold text-[13px] md:text-sm text-[#232f55] mb-3 md:mb-4">精选评论 ({postData.comments.length})</h4>
                        <div className="space-y-4">
                          {(() => {
                            const allComments = postData.comments || []
                            const rootComments = allComments.filter(c => !c.parent_comment_id || c.parent_comment_id === '0' || c.parent_comment_id === 0)
                            
                            const commentMap = new Map();
                            allComments.forEach(c => commentMap.set(c.comment_id, c));
                            
                            const getRootId = (commentId: string) => {
                              let current = commentMap.get(commentId);
                              let rootId = current?.comment_id;
                              let seen = new Set();
                              while(current && current.parent_comment_id && current.parent_comment_id !== '0' && current.parent_comment_id !== 0) {
                                if (seen.has(current.comment_id)) break;
                                seen.add(current.comment_id);
                                current = commentMap.get(current.parent_comment_id);
                                if (current) {
                                  rootId = current.comment_id;
                                } else {
                                  break;
                                }
                              }
                              return rootId;
                            };

                            const rootGroups: Record<string, any[]> = {};
                            allComments.forEach(c => {
                              const rId = getRootId(c.comment_id) || c.comment_id;
                              if (!rootGroups[rId]) rootGroups[rId] = [];
                              if (rId !== c.comment_id) rootGroups[rId].push(c);
                            });
                            
                            return rootComments.slice(0, 20).map((comment: any, idx: number) => {
                              const subComments = rootGroups[comment.comment_id] || []
                              
                              return (
                                <div key={idx} className="flex gap-2 md:gap-3">
                                  {comment.avatar ? (
                                    <img src={comment.avatar} alt="" className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover flex-shrink-0" />
                                  ) : (
                                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-100 flex-shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] md:text-xs font-bold text-slate-700">{comment.nickname}</p>
                                    <p className="text-[13px] md:text-sm text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">
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
                                      <div className="mt-2.5 md:mt-3 bg-slate-50 rounded-xl p-2.5 md:p-3 space-y-2.5 md:space-y-3">
                                        {subComments.slice(0, 3).map((sub: any, subIdx: number) => (
                                          <div key={subIdx} className="flex gap-2">
                                            {sub.avatar ? (
                                              <img src={sub.avatar} alt="" className="w-4 h-4 md:w-5 md:h-5 rounded-full object-cover flex-shrink-0" />
                                            ) : (
                                              <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-slate-200 flex-shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                              <p className="text-[10px] md:text-[11px] font-bold text-slate-700">{sub.nickname}</p>
                                              <p className="text-[11px] md:text-xs text-slate-600 mt-0.5 leading-relaxed whitespace-pre-wrap">
                                                {sub.content}
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                        {subComments.length > 3 && (
                                          <button className="text-[10px] md:text-[11px] font-bold text-[#6ebeea]">
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

                  {/* --- DESKTOP FIXED FOOTER --- */}
                  <div className="hidden md:flex flex-shrink-0 mt-auto">
                    {renderFooter()}
                  </div>

                </div>
              </div>

              {/* --- MOBILE FIXED FOOTER --- */}
              <div className="md:hidden flex-shrink-0 z-10">
                {renderFooter()}
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showImageViewer && displayImages.length > 0 && (
        <ImageViewer 
          images={displayImages} 
          initialIndex={currentImageIndex} 
          onClose={() => setShowImageViewer(false)} 
        />
      )}
    </>
  )
}
