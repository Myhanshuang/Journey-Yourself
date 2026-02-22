import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface BookmarkOptions {
  HTMLAttributes: Record<string, string>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bookmark: {
      setBookmark: (options: { url: string; title: string; description: string; image: string; karakeepUrl?: string }) => ReturnType
    }
  }
}

export const Bookmark = Node.create<BookmarkOptions>({
  name: 'bookmark',
  
  group: 'block',
  atom: true,
  draggable: true,
  inline: false,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'bookmark-card',
      },
    }
  },

  addAttributes() {
    return {
      url: {
        default: null,
        parseHTML: element => element.getAttribute('data-url'),
        renderHTML: attributes => {
          if (!attributes.url) return {}
          return { 'data-url': attributes.url }
        },
      },
      title: {
        default: null,
        parseHTML: element => element.getAttribute('data-title'),
        renderHTML: attributes => {
          if (!attributes.title) return {}
          return { 'data-title': attributes.title }
        },
      },
      description: {
        default: null,
        parseHTML: element => element.getAttribute('data-description'),
        renderHTML: attributes => {
          if (!attributes.description) return {}
          return { 'data-description': attributes.description }
        },
      },
      image: {
        default: null,
        parseHTML: element => element.getAttribute('data-image'),
        renderHTML: attributes => {
          if (!attributes.image) return {}
          return { 'data-image': attributes.image }
        },
      },
      karakeepUrl: {
        default: null,
        parseHTML: element => element.getAttribute('data-karakeep-url'),
        renderHTML: attributes => {
          if (!attributes.karakeepUrl) return {}
          return { 'data-karakeep-url': attributes.karakeepUrl }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="bookmark"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    // 从 data-* 属性中提取值（因为 addAttributes 的 renderHTML 返回 data-* 格式）
    const url = HTMLAttributes['data-url']
    const title = HTMLAttributes['data-title']
    const description = HTMLAttributes['data-description']
    const image = HTMLAttributes['data-image']
    const karakeepUrl = HTMLAttributes['data-karakeep-url']
    
    // 优先使用 karakeepUrl，fallback 到原始 url
    const linkUrl = karakeepUrl || url || '#'
    
    // 提取域名（显示原始 URL 的域名）
    let domain = ''
    try {
      if (url) {
        const urlObj = new URL(url)
        domain = urlObj.hostname
      }
    } catch {
      domain = ''
    }

    // 构建卡片内容
    const children = []
    
    // 如果有图片，直接铺满顶部（无圆角容器）
    if (image) {
      children.push([
        'img', 
        { 
          src: image, 
          alt: title || '', 
          class: 'block w-full !max-w-full aspect-video object-cover !m-0 rounded-none border-b border-slate-100'
        },
      ])
    }
    
    // 内容区域
    const textChildren = []
    
    // 标题
    if (title) {
      textChildren.push([
        'h4',
        { class: 'font-bold text-[#232f55] text-sm line-clamp-2 mb-1' },
        title,
      ])
    }
    
    // 描述
    if (description) {
      textChildren.push([
        'p',
        { class: 'text-[#232f55]/60 text-xs line-clamp-2 mb-2' },
        description,
      ])
    }
    
    // 域名
    if (domain) {
      textChildren.push([
        'span',
        { class: 'text-[#6ebeea] text-xs font-medium' },
        `🔗 ${domain}`,
      ])
    }
    
    children.push([
      'div',
      { class: 'p-4' },
      ...textChildren,
    ])
    
    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        href: linkUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        'data-type': 'bookmark',
        class: 'block bg-white rounded-[24px] overflow-hidden shadow-lg border border-slate-100 my-4 hover:shadow-xl transition-shadow no-underline',
      }),
      ...children,
    ]
  },

  addCommands() {
    return {
      setBookmark:
        options =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('bookmarkKeyboardHandler'),
        props: {
          handleKeyDown: (view, event) => {
            const { state } = view
            const { selection, tr } = state
            
            if (selection.node && selection.node.type.name === 'bookmark') {
              if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                const pos = selection.$to.after()
                const textNode = state.schema.text(event.key)
                const paragraph = state.schema.nodes.paragraph.create(null, textNode)
                const insertTr = tr.insert(pos, paragraph)
                const newPos = pos + 2
                
                insertTr.setSelection(
                  new state.schema.textSelection(insertTr.doc.resolve(newPos))
                )
                view.dispatch(insertTr)
                
                return true
              }
            }
            return false
          },
        },
      }),
    ]
  },
})

export default Bookmark
