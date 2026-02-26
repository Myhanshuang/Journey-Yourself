import { NodeViewWrapper } from '@tiptap/react'
import { useState, useEffect } from 'react'
import { Play, Eye, ThumbsUp, MessageSquare, ExternalLink } from 'lucide-react'
import { crawlerApi } from '../../lib/api'
import { cn } from '../../lib/utils'

interface BilibiliVideoViewProps {
  node: {
    attrs: {
      videoId: string
      title?: string
      cover?: string
    }
  }
  selected: boolean
}

interface VideoData {
  video_id: string
  title: string
  desc?: string
  author?: {
    name: string
    avatar?: string
  }
  stats?: {
    play: number
    like: number
    coin: number
    favorite: number
    danmaku: number
  }
  cover?: string
  source_url?: string
  comments?: any[]
}

const normalizePath = (path: string) => {
  if (!path) return ''
  return path.startsWith('/') ? path : '/' + path
}

const formatNumber = (num: number) => {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toString()
}

export default function BilibiliVideoView({ node, selected }: BilibiliVideoViewProps) {
  const { videoId, title: initialTitle, cover: initialCover } = node.attrs
  const [playing, setPlaying] = useState(false)
  const [videoData, setVideoData] = useState<VideoData | null>(null)
  const [loading, setLoading] = useState(false)

  const displayTitle = videoData?.title || initialTitle || 'B站视频'
  const displayCover = videoData?.cover || initialCover

  useEffect(() => {
    if (videoId && !videoData) {
      setLoading(true)
      crawlerApi.getBiliVideo(videoId)
        .then(data => setVideoData(data))
        .catch(err => console.error('Failed to load video:', err))
        .finally(() => setLoading(false))
    }
  }, [videoId, videoData])

  const embedUrl = videoId?.startsWith('BV') 
    ? `https://player.bilibili.com/player.html?bvid=${videoId}&high_quality=1&autoplay=1`
    : `https://player.bilibili.com/player.html?aid=${videoId}&high_quality=1&autoplay=1`

  return (
    <NodeViewWrapper
      className={cn(
        "block my-3 rounded-[32px] overflow-hidden bg-white/90 shadow-[0_20px_40px_rgba(35,47,85,0.06)] border border-white/50 transition-all group",
        selected ? 'ring-4 ring-[#6ebeea]/50' : 'hover:shadow-[0_30px_60px_rgba(35,47,85,0.12)] hover:-translate-y-1'
      )}
    >
      {playing ? (
        <div className="relative">
          <div className="aspect-video bg-black rounded-t-[32px] overflow-hidden">
            <iframe
              src={embedUrl}
              className="w-full h-full border-none"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
          <div className="p-5 bg-white flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <h4 className="font-bold text-[#232f55] text-base truncate mb-1">{displayTitle}</h4>
              <p className="text-xs text-slate-500 truncate">{videoData?.desc || '正在播放'}</p>
            </div>
            <a
              href={`https://www.bilibili.com/video/${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-[14px] bg-[#f2f4f2] flex items-center justify-center text-[#232f55]/60 hover:bg-[#6ebeea] hover:text-white transition-all flex-shrink-0"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink size={18} />
            </a>
          </div>

          {videoData?.comments && videoData.comments.length > 0 && (
            <div className="bg-slate-50 border-t border-slate-100 max-h-64 overflow-y-auto p-4 custom-scrollbar">
              <h4 className="font-bold text-xs text-slate-500 mb-3 uppercase tracking-wider">精选评论 ({videoData.comments.length})</h4>
              <div className="space-y-4">
                {(() => {
                  const allComments = videoData.comments || []
                  // Bili parent_comment_id is often "0" or 0 for root comments
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
                  
                  return rootComments.slice(0, 15).map((comment: any, idx: number) => {
                    const subComments = rootGroups[comment.comment_id] || []
                    
                    return (
                      <div key={idx} className="flex gap-3">
                        {comment.avatar ? (
                          <img src={comment.avatar} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-slate-200" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">{comment.nickname}</span>
                            <span className="text-[10px] text-slate-400">
                              {comment.create_time ? new Date(comment.create_time * (comment.create_time > 1e11 ? 1 : 1000)).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">
                            {comment.content}
                          </p>
                          {Number(comment.like_count) > 0 && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                              <ThumbsUp size={10} /> {formatNumber(Number(comment.like_count))}
                            </div>
                          )}
                          
                          {/* Sub-comments */}
                          {subComments.length > 0 && (
                            <div className="mt-2 bg-slate-100/50 rounded-lg p-2.5 space-y-2.5 border border-slate-100">
                              {subComments.slice(0, 3).map((sub: any, subIdx: number) => (
                                <div key={subIdx} className="flex gap-2">
                                  {sub.avatar ? (
                                    <img src={sub.avatar} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full bg-slate-200 flex-shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-slate-700">{sub.nickname}</p>
                                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed whitespace-pre-wrap">
                                      {sub.content}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {subComments.length > 3 && (
                                <button className="text-[10px] font-bold text-[#6ebeea]">
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
      ) : (
        <div 
          className="cursor-pointer relative flex flex-col"
          onClick={() => setPlaying(true)}
        >
          <div className="relative aspect-video overflow-hidden">
            {displayCover ? (
              <img
                src={normalizePath(displayCover)}
                alt={displayTitle}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-pink-100 to-rose-50" />
            )}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
            
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-white">Bilibili</span>
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-[20px] bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                {loading ? (
                  <div className="w-8 h-8 border-2 border-[#fb7299] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play size={28} className="text-[#fb7299] ml-1" fill="currentColor" />
                )}
              </div>
            </div>

            {videoData?.stats && (
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                <div className="flex gap-2">
                  <div className="bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-[10px] flex items-center gap-1.5 text-white text-xs font-medium">
                    <Eye size={12} /> {formatNumber(videoData.stats.play)}
                  </div>
                  <div className="bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-[10px] flex items-center gap-1.5 text-white text-xs font-medium">
                    <MessageSquare size={12} /> {formatNumber(videoData.stats.danmaku)}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-5 flex gap-4 items-start">
            {videoData?.author?.avatar ? (
              <img src={videoData.author.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex-shrink-0 object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#fb7299]/10 flex items-center justify-center flex-shrink-0 text-[#fb7299] font-bold text-sm">
                B
              </div>
            )}
            <div className="flex-1 min-w-0 pt-0.5">
              <h4 className="font-bold text-[#232f55] text-base leading-snug line-clamp-2 mb-1.5">{displayTitle}</h4>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="truncate">{videoData?.author?.name || 'B站UP主'}</span>
                {videoData?.stats && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="flex items-center gap-1 text-[#fb7299]"><ThumbsUp size={12} /> {formatNumber(videoData.stats.like)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  )
}
