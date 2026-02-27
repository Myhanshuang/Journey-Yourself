import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import XhsPostView from './XhsPostView'

export interface XhsPostOptions {
  HTMLAttributes: Record<string, string>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    xhsPost: {
      setXhsPost: (options: { noteId: string; title?: string; images?: string[]; noteType?: string; desc?: string }) => ReturnType
    }
  }
}

export const XhsPost = Node.create<XhsPostOptions>({
  name: 'xhsPost',

  group: 'block',
  atom: true,
  draggable: true,
  inline: false,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'xhs-post',
      },
    }
  },

  addAttributes() {
    return {
      noteId: {
        default: null,
        parseHTML: element => element.getAttribute('data-note-id'),
        renderHTML: attributes => {
          if (!attributes.noteId) return {}
          return { 'data-note-id': attributes.noteId }
        },
      },
      title: {
        default: '小红书帖子',
        parseHTML: element => element.getAttribute('data-title'),
        renderHTML: attributes => {
          if (!attributes.title) return {}
          return { 'data-title': attributes.title }
        },
      },
      images: {
        default: [],
        parseHTML: element => {
          const imgs = element.getAttribute('data-images')
          return imgs ? imgs.split(',') : []
        },
        renderHTML: attributes => {
          if (!attributes.images || attributes.images.length === 0) return {}
          return { 'data-images': Array.isArray(attributes.images) ? attributes.images.join(',') : attributes.images }
        },
      },
      noteType: {
        default: 'normal',
        parseHTML: element => element.getAttribute('data-note-type'),
        renderHTML: attributes => {
          if (!attributes.noteType) return {}
          return { 'data-note-type': attributes.noteType }
        },
      },
      desc: {
        default: null,
        parseHTML: element => element.getAttribute('data-desc'),
        renderHTML: attributes => {
          if (!attributes.desc) return {}
          return { 'data-desc': attributes.desc }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="xhs-post"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const noteId = HTMLAttributes['data-note-id']
    const title = HTMLAttributes['data-title'] || '小红书帖子'
    const images = HTMLAttributes['data-images'] ? HTMLAttributes['data-images'].split(',') : []
    const noteType = HTMLAttributes['data-note-type'] || 'normal'
    const isVideo = noteType === 'video'

    const children = []

    const badge = [
      'div',
      { class: 'absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 z-10' },
      ['span', { class: 'text-[10px] font-black uppercase tracking-wider text-white' }, '小红书'],
    ]

    // Cover image (first image) or video placeholder
    if (isVideo) {
      children.push([
        'div',
        { class: 'relative aspect-video bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center overflow-hidden' },
        badge,
        [
          'div',
          { class: 'w-16 h-16 rounded-full bg-white/90 flex items-center justify-center' },
          [
            'svg',
            {
              xmlns: 'http://www.w3.org/2000/svg',
              width: '28',
              height: '28',
              viewBox: '0 0 24 24',
              fill: 'currentColor',
              class: 'text-red-500 ml-1',
            },
            [
              'polygon',
              { points: '5 3 19 12 5 21 5 3' },
            ],
          ],
        ],
      ])
    } else if (images.length > 0) {
      children.push([
        'div',
        { class: 'relative aspect-video overflow-hidden' },
        badge,
        [
          'img',
          {
            src: '/' + images[0],
            alt: title,
            class: 'block w-full h-full object-cover !m-0 rounded-none',
          },
        ]
      ])
    } else {
      children.push([
        'div',
        { class: 'relative aspect-video bg-gradient-to-br from-red-50 to-rose-50 flex items-center justify-center overflow-hidden' },
        badge,
        ['span', { class: 'text-4xl opacity-50' }, '📕'],
      ])
    }

    // Content area
    children.push([
      'div',
      { class: 'p-4 flex items-center gap-4' },
      [
        'div',
        { class: 'flex-1 min-w-0' },
        [
          'p',
          { class: 'font-bold text-[#232f55] text-sm truncate' },
          title,
        ],
        [
          'p',
          { class: 'text-xs text-slate-400 mt-1' },
          isVideo ? '点击播放视频' : images.length > 0 ? `${images.length} 张图片` : '点击查看帖子内容',
        ],
      ],
    ])

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'xhs-post',
        class: 'block bg-white rounded-[24px] overflow-hidden shadow-lg border border-slate-100 my-3 hover:shadow-xl transition-shadow cursor-pointer',
      }),
      ...children,
    ]
  },

  addCommands() {
    return {
      setXhsPost:
        options =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(XhsPostView)
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('xhsPostKeyboardHandler'),
        props: {
          handleKeyDown: (view, event) => {
            const { state } = view
            const { selection, tr } = state

            if (selection.node && selection.node.type.name === 'xhsPost') {
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

export default XhsPost