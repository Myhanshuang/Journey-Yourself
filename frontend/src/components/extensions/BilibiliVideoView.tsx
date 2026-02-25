import { NodeViewWrapper } from '@tiptap/react'
import { useState, useEffect } from 'react'
import { Play, Eye, ThumbsUp, Coins, Star, ExternalLink } from 'lucide-react'
import { crawlerApi } from '../../lib/api'

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
  }
  cover?: string
  source_url?: string
}

// 规范化路径
const normalizePath = (path: string) => {
  if (!path) return ''
  return path.startsWith('/') ? path : '/' + path
}

export default function BilibiliVideoView({ node, selected }: BilibiliVideoViewProps) {
  const { videoId, title: initialTitle, cover: initialCover } = node.attrs
  const [playing, setPlaying] = useState(false)
  const [videoData, setVideoData] = useState<VideoData | null>(null)
  const [loading, setLoading] = useState(false)

  const displayTitle = videoData?.title || initialTitle || 'B站视频'
  const displayCover = videoData?.cover || initialCover

  useEffect(() => {
    if (playing && videoId && !videoData) {
      setLoading(true)
      crawlerApi.getBiliVideo(videoId)
        .then(data => setVideoData(data))
        .catch(err => console.error('Failed to load video:', err))
        .finally(() => setLoading(false))
    }
  }, [playing, videoId, videoData])

  // 构建 B 站嵌入播放器 URL
  const embedUrl = videoId?.startsWith('BV') 
    ? `https://player.bilibili.com/player.html?bvid=${videoId}&high_quality=1&autoplay=1`
    : `https://player.bilibili.com/player.html?aid=${videoId}&high_quality=1&autoplay=1`

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万'
    }
    return num.toString()
  }

  const handleClick = () => {
    if (!playing) {
      setPlaying(true)
    }
  }

  return (
    <NodeViewWrapper
      className={`block bg-white rounded-[24px] overflow-hidden shadow-lg border border-slate-100 my-4 hover:shadow-xl transition-shadow ${selected ? 'ring-2 ring-[#6ebeea]' : ''}`}
    >
      {playing ? (
        // 内联播放器
        <div className="relative">
          <div className="aspect-video bg-black">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            )}
          </div>
          {/* 底部信息栏 */}
          <div className="p-3 flex items-center gap-3 bg-slate-50">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-slate-900 truncate">{displayTitle}</p>
              {videoData?.stats && (
                <div className="flex items-center gap-3 mt-1 text-slate-500 text-xs">
                  <span className="flex items-center gap-1">
                    <Eye size={12} /> {formatNumber(videoData.stats.play)}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp size={12} /> {formatNumber(videoData.stats.like)}
                  </span>
                </div>
              )}
            </div>
            <a
              href={`https://www.bilibili.com/video/${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors flex-shrink-0"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink size={16} className="text-slate-400" />
            </a>
          </div>
        </div>
      ) : (
        // 封面和播放按钮
        <div 
          className={`cursor-pointer ${selected ? 'ring-2 ring-[#6ebeea] rounded-[24px]' : ''}`}
          onClick={handleClick}
        >
          {displayCover ? (
            <div className="relative">
              <img
                src={normalizePath(displayCover)}
                alt={displayTitle}
                className="block w-full aspect-video object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <Play size={28} className="text-pink-500 ml-1" fill="currentColor" />
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play size={28} className="text-pink-500 ml-1" fill="currentColor" />
              </div>
            </div>
          )}
          <div className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">📺</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#232f55] text-sm truncate">{displayTitle}</p>
              <p className="text-xs text-slate-400 mt-1">点击播放视频</p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-pink-500 bg-pink-50 px-2 py-1 rounded-md">
              BILIBILI
            </span>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  )
}