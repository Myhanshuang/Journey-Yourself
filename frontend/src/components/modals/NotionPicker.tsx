import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Search, FileText, ExternalLink, Loader2 } from 'lucide-react'
import { cn, useToast } from '../ui/JourneyUI'
import { notionApi } from '../../lib/api'
import { useQuery } from '@tanstack/react-query'
import { Input } from '../ui/input'

interface NotionPage {
  id: string
  title: string
  icon: string | null
  cover: string | null
  url: string
}

interface NotionPickerProps {
  onSelect: (page: NotionPage) => void
  onClose: () => void
}

export default function NotionPicker({ onSelect, onClose }: NotionPickerProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const addToast = useToast(state => state.add)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const { data, isLoading, error } = useQuery({
    queryKey: ['notion', 'search', debouncedQuery],
    queryFn: () => notionApi.search(debouncedQuery, 20),
    retry: false
  })

  const pages = data?.pages || []

  // Handle error
  useEffect(() => {
    if (error) {
      const err = error as any
      if (err.response?.status === 400) {
        addToast('error', 'Notion not configured. Please set up in Settings.')
        onClose()
      }
    }
  }, [error, addToast, onClose])

  const handleSelect = (page: NotionPage) => {
    onSelect(page)
    onClose()
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
        className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
            <FileText size={24} className="text-slate-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-slate-900">Notion Pages</h3>
            <p className="text-sm text-slate-400">Select a page to embed</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search pages..."
              className="pl-12"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="text-slate-400 animate-spin" />
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p className="font-medium">No pages found</p>
              <p className="text-sm mt-1">Make sure you've shared pages with your integration</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {pages.map((page: NotionPage) => (
                <button
                  key={page.id}
                  onClick={() => handleSelect(page)}
                  className="w-full p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all text-left group flex items-center gap-4"
                >
                  {/* Icon/Emoji */}
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl flex-shrink-0">
                    {page.icon ? (
                      page.icon.startsWith('http') ? (
                        <img src={page.icon} alt="" className="w-6 h-6 rounded" />
                      ) : (
                        page.icon
                      )
                    ) : (
                      <FileText size={20} className="text-slate-400" />
                    )}
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{page.title}</p>
                    <p className="text-xs text-slate-400 truncate">{page.id.replace(/-/g, '')}</p>
                  </div>

                  {/* External Link */}
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <ExternalLink size={16} className="text-slate-400" />
                  </a>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
