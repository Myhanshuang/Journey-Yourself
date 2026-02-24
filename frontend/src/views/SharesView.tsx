import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Link2, Trash2, Copy, Check, Clock, FileText, BookOpen, ExternalLink } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { shareApi } from '../lib/api'
import { Card, useToast, useConfirm, journeySpring, getBaseUrl, ManageListItem, useAdjustedTime, DatePicker, TimePicker } from '../components/ui/JourneyUI'
import { SelectionModal } from '../components/ui/selection-modal'
import { cn } from '../lib/utils'

interface Share {
  id: number
  token: string
  diary_id: number | null
  notebook_id: number | null
  created_at: string
  expires_at: string | null
  is_active: boolean
  diary_title?: string
  notebook_name?: string
}

// 兼容非 HTTPS 环境的复制功能
function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-999999px'
  textarea.style.top = '-999999px'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  return new Promise((resolve, reject) => {
    if (document.execCommand('copy')) {
      resolve()
    } else {
      reject(new Error('Copy failed'))
    }
    textarea.remove()
  })
}

export default function SharesView() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const addToast = useToast(state => state.add)
  const askConfirm = useConfirm(state => state.ask)
  const [selectedShare, setSelectedShare] = useState<Share | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const { getAdjusted, timezone } = useAdjustedTime()

  const { data: shares = [], isLoading } = useQuery({
    queryKey: ['shares'],
    queryFn: shareApi.list
  })

  const deleteMutation = useMutation({
    mutationFn: shareApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares'] })
      addToast('success', 'Share revoked')
      setSelectedShare(null)
    }
  })

  const handleCopy = (share: Share) => {
    const url = `${getBaseUrl()}/share/${share.token}`
    copyToClipboard(url)
    setCopiedId(share.id)
    setTimeout(() => setCopiedId(null), 2000)
    addToast('success', 'Link copied')
  }

  const handleDelete = (share: Share) => {
    const name = share.diary_title || share.notebook_name || 'this share'
    askConfirm(
      "Revoke Share?",
      `"${name}" will no longer be accessible via this link.`,
      () => {
        deleteMutation.mutate(share.id)
      }
    )
  }

  const handleNavigate = (share: Share) => {
    askConfirm(
      "Leave Editor?",
      "Unsaved changes will be lost.",
      () => {
        if (share.diary_id) {
          navigate(`/diaries/${share.diary_id}`)
        } else if (share.notebook_id) {
          navigate(`/notebooks/${share.notebook_id}`)
        }
        setSelectedShare(null)
      }
    )
  }

  const formatDate = (dateStr: string) => {
    const adjustedDate = getAdjusted(dateStr)
    return adjustedDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    const adjustedExpires = getAdjusted(expiresAt)
    const now = getAdjusted(new Date().toISOString())
    return adjustedExpires < now
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-[#6ebeea]/30 border-t-[#6ebeea] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={journeySpring}
      className="py-12 max-w-[700px] mx-auto space-y-8 pb-32 text-slate-900"
    >
      <header className="space-y-2 px-3 md:px-0">
        <button onClick={() => navigate('/settings')} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-all mb-6">
          <ChevronLeft size={20} /> Settings
        </button>
        <h2 className="text-4xl md:text-5xl font-black tracking-tight">Share Manager</h2>
        <p className="text-lg md:text-xl text-slate-400 font-medium italic">Links you've shared with the world.</p>
      </header>

      {shares.length === 0 ? (
        <Card className="p-8 md:p-12 text-center mx-3 md:mx-0">
          <Link2 size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-medium">No active shares yet.</p>
          <p className="text-sm text-slate-300 mt-2">Share a diary or notebook to see it here.</p>
        </Card>
      ) : (
        <Card className="divide-y divide-slate-100">
          <AnimatePresence mode="popLayout">
            {shares.map((share: Share) => {
              const expired = isExpired(share.expires_at)
              const title = share.diary_title || share.notebook_name || 'Unknown'
              const subtitle = `${share.diary_id ? 'Diary' : 'Notebook'}${share.expires_at ? ` · ${expired ? 'Expired' : 'Expires'} ${formatDate(share.expires_at)}` : ''}`
              
              return (
                <ManageListItem
                  key={share.id}
                  icon={share.diary_id ? <FileText size={20} /> : <BookOpen size={20} />}
                  iconBgClass={share.diary_id ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-500'}
                  title={title}
                  subtitle={subtitle}
                  onClick={() => setSelectedShare(share)}
                  actions={
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopy(share)
                        }}
                        disabled={expired}
                        className={cn(
                          "p-2 md:p-2.5 rounded-xl transition-all",
                          expired 
                            ? "bg-slate-50 text-slate-200" 
                            : "bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-500"
                        )}
                      >
                        {copiedId === share.id ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(share)
                        }}
                        className="p-2 md:p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  }
                />
              )
            })}
          </AnimatePresence>
        </Card>
      )}

      {selectedShare && (
        <ShareDetailModal
          share={selectedShare}
          onClose={() => setSelectedShare(null)}
          onCopy={() => handleCopy(selectedShare)}
          onDelete={() => handleDelete(selectedShare)}
          onNavigate={() => handleNavigate(selectedShare)}
          copied={copiedId === selectedShare.id}
        />
      )}
    </motion.div>
  )
}

function ShareDetailModal({
  share,
  onClose,
  onCopy,
  onDelete,
  onNavigate,
  copied
}: {
  share: Share
  onClose: () => void
  onCopy: () => void
  onDelete: () => void
  onNavigate: () => void
  copied: boolean
}) {
  const queryClient = useQueryClient()
  const addToast = useToast(state => state.add)
  const { timezone } = useAdjustedTime()

  // 解析过期时间：将 UTC 时间转换为用户本地时间
  const parseDateTime = (dateStr: string | null) => {
    if (!dateStr) return { date: '', time: '00:00' }
    
    // 将 UTC 时间转换为用户时区
    const utcDate = new Date(dateStr)
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone || 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      const parts = formatter.formatToParts(utcDate)
      const map: Record<string, string> = {}
      parts.forEach(p => map[p.type] = p.value)
      
      // en-CA 格式: YYYY-MM-DD
      const date = `${map.year}-${map.month}-${map.day}`
      const time = `${map.hour.padStart(2, '0')}:${map.minute.padStart(2, '0')}`
      
      return { date, time }
    } catch {
      // fallback to ISO
      return {
        date: utcDate.toISOString().split('T')[0],
        time: utcDate.toISOString().slice(11, 16)
      }
    }
  }

  const initial = parseDateTime(share.expires_at)
  const [expiresDate, setExpiresDate] = useState(initial.date)
  const [expiresTime, setExpiresTime] = useState(initial.time)
  const [neverExpire, setNeverExpire] = useState(!share.expires_at)

  const updateMutation = useMutation({
    mutationFn: (data: { expires_at: string | null }) => shareApi.update(share.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares'] })
      addToast('success', 'Share updated')
      onClose()
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.detail || 'Failed to update share')
    }
  })

  const handleSave = () => {
    if (neverExpire) {
      updateMutation.mutate({ expires_at: null })
    } else if (expiresDate && expiresTime) {
      // 将用户本地时间转换为 UTC 时间
      try {
        // 创建本地时间字符串，然后解析为 UTC
        const localDateStr = `${expiresDate}T${expiresTime}:00`
        // 使用用户时区解析，然后转换为 UTC
        const tz = timezone || 'UTC'
        const localDate = new Date(localDateStr)
        
        // 计算时区偏移
        const utcDate = new Date(localDate.toLocaleString('en-US', { timeZone: 'UTC' }))
        const tzDate = new Date(localDate.toLocaleString('en-US', { timeZone: tz }))
        const offsetMs = utcDate.getTime() - tzDate.getTime()
        
        const expiresAt = new Date(localDate.getTime() + offsetMs).toISOString()
        updateMutation.mutate({ expires_at: expiresAt })
      } catch {
        // fallback: 直接使用 ISO 格式
        const expiresAt = new Date(`${expiresDate}T${expiresTime}:00Z`).toISOString()
        updateMutation.mutate({ expires_at: expiresAt })
      }
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const title = share.diary_title || share.notebook_name || 'Unknown'
  const isExpired = share.expires_at && new Date(share.expires_at) < new Date()

  return (
    <SelectionModal
      isOpen={true}
      onClose={onClose}
      onConfirm={handleSave}
      title={title}
      subtitle={share.diary_id ? 'Diary Share' : 'Notebook Share'}
      confirmLabel="Save"
      loading={updateMutation.isPending}
      variant="sheet"
      className="md:max-w-md md:mx-auto"
    >
      <div className="space-y-4">
        {/* 创建时间 */}
        <div className="p-4 bg-slate-50 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest mb-1">
            Created
          </p>
          <p className="text-sm font-medium text-slate-600">
            {formatDate(share.created_at)}
          </p>
        </div>

        {/* 过期时间设置 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase text-slate-300 tracking-widest">
              Expiration
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={neverExpire}
                onChange={(e) => setNeverExpire(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300"
              />
              Never expire
            </label>
          </div>

          {!neverExpire && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-2 block">Date</label>
                <DatePicker
                  value={expiresDate}
                  onChange={setExpiresDate}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-2 block">Time</label>
                <TimePicker
                  value={expiresTime}
                  onChange={setExpiresTime}
                />
              </div>
            </div>
          )}

          {isExpired && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <Clock size={12} />
              This share has expired
            </p>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCopy}
            disabled={isExpired}
            className={cn(
              "flex-1 p-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
              isExpired
                ? "bg-slate-100 text-slate-300"
                : "bg-indigo-50 text-indigo-500 hover:bg-indigo-100"
            )}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy Link'}
          </button>
          <button
            onClick={onNavigate}
            className="flex-1 p-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all"
          >
            <ExternalLink size={16} />
            Go to {share.diary_id ? 'Diary' : 'Notebook'}
          </button>
        </div>

        {/* 删除按钮 */}
        <button
          onClick={onDelete}
          className="w-full p-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-red-50 text-red-500 hover:bg-red-100 transition-all"
        >
          <Trash2 size={16} />
          Revoke Share
        </button>
      </div>
    </SelectionModal>
  )
}