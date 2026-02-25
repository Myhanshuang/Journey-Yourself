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
        "block my-6 rounded-[32px] overflow-hidden bg-white/90 shadow-[0_20px_40px_rgba(35,47,85,0.06)] border border-white/50 transition-all group",
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
