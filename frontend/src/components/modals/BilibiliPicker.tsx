import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Link, Loader2 } from 'lucide-react'
import { cn, useToast } from '../ui/JourneyUI'
import { crawlerApi } from '../../lib/api'
import { Input } from '../ui/input'

interface BilibiliVideoData {
  videoId: string
  title: string
  cover?: string
}

interface BilibiliPickerProps {
  onSelect: (data: BilibiliVideoData) => void
  onClose: () => void
}

export default function BilibiliPicker({ onSelect, onClose }: BilibiliPickerProps) {
  const [url, setUrl] = useState('')
  const [isCrawling, setIsCrawling] = useState(false)
  const [enableComments, setEnableComments] = useState(false)
  const addToast = useToast(state => state.add)

  const handleCrawl = async () => {
    if (!url.trim()) {
      addToast('error', '请输入B站视频链接')
      return
    }

    setIsCrawling(true)

    try {
      const result = await crawlerApi.crawlBili(url.trim(), enableComments)
      
      if (result.success && result.data?.video_id) {
        addToast('success', '视频信息抓取成功')
        onSelect({
          videoId: result.data.video_id,
          title: result.data.title || 'B站视频',
          cover: result.data.cover
        })
        onClose()
      } else if (result.status === 'timeout') {
        addToast('error', '抓取超时，请稍后重试')
      } else {
        addToast('error', result.message || '抓取失败')
      }
    } catch (error: any) {
      const detail = error.response?.data?.detail
      addToast('error', detail || '抓取请求失败')
    } finally {
      setIsCrawling(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center">
            <span className="text-2xl">📺</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-slate-900">B站视频</h3>
            <p className="text-sm text-slate-400">输入链接抓取视频信息</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              B站视频链接
            </label>
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.bilibili.com/video/BV..."
              disabled={isCrawling}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={enableComments} 
              onChange={e => setEnableComments(e.target.checked)}
              disabled={isCrawling}
              className="w-4 h-4 rounded text-pink-500 focus:ring-pink-500"
            />
            <span className="text-sm font-medium text-slate-600">同时抓取评论 (需要较长时间)</span>
          </label>

          <button
            onClick={handleCrawl}
            disabled={isCrawling || !url.trim()}
            className={cn(
              "w-full py-4 rounded-2xl font-bold text-sm transition-all",
              "bg-pink-500 text-white hover:bg-pink-600",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isCrawling ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                抓取中...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Link size={16} />
                开始抓取
              </span>
            )}
          </button>
        </div>

        {/* Tips */}
        <div className="px-6 pb-6">
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong>提示：</strong>B站视频可以嵌入到日记中直接播放。首次使用可能需要扫码登录B站账号。
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}