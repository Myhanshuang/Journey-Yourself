import { NodeViewWrapper } from '@tiptap/react'
import { useState } from 'react'
import api from '../../lib/api'

interface NotionBlockViewProps {
  node: {
    attrs: {
      pageId: string
      title?: string
      icon?: string
      cover?: string
      url?: string
    }
  }
}

interface NotionBlock {
  id: string
  type: string
  content: any
}

export default function NotionBlockView({ node }: NotionBlockViewProps) {
  const { pageId, title, icon, cover, url } = node.attrs
  const [showDetail, setShowDetail] = useState(false)
  const [blocks, setBlocks] = useState<NotionBlock[]>([])
  const [loading, setLoading] = useState(false)
  const [pageIcon, setPageIcon] = useState(icon)
  const [pageCover, setPageCover] = useState(cover)
  const [pageTitle, setPageTitle] = useState(title)

  const handleClick = async () => {
    if (showDetail) {
      setShowDetail(false)
      return
    }

    setLoading(true)
    setShowDetail(true)
    try {
      const response = await api.get(`/proxy/notion/page/${pageId}`)
      setBlocks(response.data.blocks || [])
      if (response.data.icon) setPageIcon(response.data.icon)
      if (response.data.cover) setPageCover(response.data.cover)
      if (response.data.title) setPageTitle(response.data.title)
    } catch (error) {
      console.error('Failed to fetch Notion page:', error)
    } finally {
      setLoading(false)
    }
  }

  const openInNotion = (e: React.MouseEvent) => {
    e.stopPropagation()
    const notionUrl = url || `https://notion.so/${pageId.replace(/-/g, '')}`
    window.open(notionUrl, '_blank')
  }

  const renderBlock = (block: NotionBlock) => {
    const { type, content } = block

    switch (type) {
      case 'paragraph':
        return content.text ? <p className="text-sm text-slate-600 mb-2">{content.text}</p> : null

      case 'heading_1':
        return <h1 className="text-xl font-bold text-slate-800 mb-3">{content.text}</h1>

      case 'heading_2':
        return <h2 className="text-lg font-bold text-slate-800 mb-2">{content.text}</h2>

      case 'heading_3':
        return <h3 className="text-base font-bold text-slate-800 mb-2">{content.text}</h3>

      case 'bulleted_list_item':
        return (
          <div className="flex gap-2 mb-1">
            <span className="text-slate-400">•</span>
            <span className="text-sm text-slate-600">{content.text}</span>
          </div>
        )

      case 'numbered_list_item':
        return (
          <div className="flex gap-2 mb-1">
            <span className="text-slate-400 w-4">1.</span>
            <span className="text-sm text-slate-600">{content.text}</span>
          </div>
        )

      case 'to_do':
        return (
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-4 h-4 rounded border ${content.checked ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
              {content.checked && <span className="text-white text-xs">✓</span>}
            </div>
            <span className={`text-sm ${content.checked ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
              {content.text}
            </span>
          </div>
        )

      case 'quote':
        return (
          <blockquote className="border-l-4 border-slate-300 pl-4 italic text-sm text-slate-600 mb-2">
            {content.text}
          </blockquote>
        )

      case 'code':
        return (
          <pre className="bg-slate-100 p-3 rounded-lg text-sm font-mono mb-2 overflow-x-auto">
            <code>{content.text}</code>
          </pre>
        )

      case 'callout':
        return (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-2 flex gap-2">
            {content.icon && <span className="text-lg">{content.icon}</span>}
            <span className="text-sm text-slate-600">{content.text}</span>
          </div>
        )

      case 'divider':
        return <hr className="my-3 border-slate-200" />

      case 'image':
        return content.url ? (
          <img src={content.url} alt="" className="max-w-full rounded-lg mb-2" />
        ) : null

      case 'video':
        return content.url ? (
          <video src={content.url} controls className="max-w-full rounded-lg mb-2" />
        ) : null

      case 'bookmark':
        return (
          <a
            href={content.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block border border-slate-200 rounded-lg p-3 hover:bg-slate-50 mb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm text-blue-600 truncate">{content.url}</div>
            {content.caption && <div className="text-xs text-slate-400 mt-1">{content.caption}</div>}
          </a>
        )

      case 'embed':
        return content.url ? (
          <iframe
            src={content.url}
            className="w-full h-48 rounded-lg mb-2"
            onClick={(e) => e.stopPropagation()}
          />
        ) : null

      default:
        return null
    }
  }

  return (
    <NodeViewWrapper className="notion-block-wrapper">
      <div
        className="block bg-white rounded-[24px] overflow-hidden shadow-lg border border-slate-100 my-4 hover:shadow-xl transition-shadow cursor-pointer"
        onClick={handleClick}
      >
        {/* Cover */}
        {pageCover && !showDetail && (
          <img
            src={pageCover}
            alt={pageTitle || 'Notion'}
            className="block w-full aspect-[3/1] object-cover"
          />
        )}

        {/* Header */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            {/* Icon */}
            {pageIcon ? (
              pageIcon.startsWith('http') ? (
                <img src={pageIcon} alt="" className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <span className="text-2xl">{pageIcon}</span>
              )
            ) : (
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-slate-400"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
            )}

            {/* Title */}
            <h4 className="font-bold text-[#232f55] text-base flex-1 min-w-0 truncate">
              {pageTitle || 'Untitled'}
            </h4>
          </div>

          {/* Badge and link */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
              NOTION
            </span>
            <button
              onClick={openInNotion}
              className="text-[10px] font-bold text-[#6ebeea] hover:underline ml-auto"
            >
              Open in Notion →
            </button>
          </div>
        </div>

        {/* Detail Content */}
        {showDetail && (
          <div className="border-t border-slate-100 p-4 bg-slate-50">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400"></div>
              </div>
            ) : blocks.length > 0 ? (
              <div className="space-y-1">
                {blocks.map((block) => (
                  <div key={block.id}>{renderBlock(block)}</div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">No content available</p>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}
