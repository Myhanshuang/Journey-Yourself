import { twMerge } from 'tailwind-merge'
import { clsx, type ClassValue } from 'clsx'

/**
 * 合并 className 的工具函数
 */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

/**
 * 从 Tiptap 内容中提取第一张图片的 URL
 */
export const getFirstImage = (content: any): string | null => {
  if (!content || !content.content) return null
  const walk = (nodes: any[]): string | null => {
    for (const node of nodes) {
      if (node.type === 'image') {
        let src = node.attrs?.src
        if (src && src.startsWith('/')) {
          const serverUrl = localStorage.getItem('server_url')
          if (serverUrl) {
             // Ensure no double slashes
             src = `${serverUrl.replace(/\/$/, '')}${src}`
          }
        }
        return src
      }
      if (node.content) { const res = walk(node.content); if (res) return res }
    }
    return null
  }
  return walk(content.content)
}

/**
 * 从 Tiptap 内容中提取纯文本片段
 */
export const extractSnippet = (content: any): string => {
  if (!content || !content.content) return ''
  let text = ''
  const walk = (nodes: any[]) => {
    for (const n of nodes) {
      if (n.type === 'text') text += n.text + ' '
      if (n.content) walk(n.content)
    }
  }
  walk(content.content)
  return text.trim()
}
