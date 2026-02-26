import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import BilibiliVideoView from './BilibiliVideoView'

export interface BilibiliVideoOptions {
  HTMLAttributes: Record<string, string>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bilibiliVideo: {
      setBilibiliVideo: (options: { videoId: string; title?: string; cover?: string }) => ReturnType
    }
  }
}

export const BilibiliVideo = Node.create<BilibiliVideoOptions>({
  name: 'bilibiliVideo',

  group: 'block',
  atom: true,
  draggable: true,
  inline: false,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'bilibili-video',
      },
    }
  },

  addAttributes() {
    return {
      videoId: {
        default: null,
        parseHTML: element => element.getAttribute('data-video-id'),
        renderHTML: attributes => {
          if (!attributes.videoId) return {}
          return { 'data-video-id': attributes.videoId }
        },
      },
      title: {
        default: 'B站视频',
        parseHTML: element => element.getAttribute('data-title'),
        renderHTML: attributes => {
          if (!attributes.title) return {}
          return { 'data-title': attributes.title }
        },
      },
      cover: {
        default: null,
        parseHTML: element => element.getAttribute('data-cover'),
        renderHTML: attributes => {
          if (!attributes.cover) return {}
          return { 'data-cover': attributes.cover }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="bilibili-video"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const videoId = HTMLAttributes['data-video-id']
    const title = HTMLAttributes['data-title'] || 'B站视频'
    const cover = HTMLAttributes['data-cover']

    const children = []

    const badge = [
      'div',
      { class: 'absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 z-10' },
      ['span', { class: 'text-[10px] font-black uppercase tracking-wider text-white' }, 'Bilibili'],
    ]

    // Cover image
    if (cover) {
      children.push([
        'div',
        { class: 'relative aspect-video overflow-hidden' },
        badge,
        [
          'img',
          {
            src: '/' + cover,
            alt: title,
            class: 'block w-full h-full object-cover !m-0 rounded-none',
          },
        ]
      ])
    } else {
      children.push([
        'div',
        { class: 'relative aspect-video bg-gradient-to-br from-pink-100 to-rose-50 flex items-center justify-center overflow-hidden' },
        badge,
        ['span', { class: 'text-4xl opacity-50' }, '📺'],
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
          '点击播放视频',
        ],
      ],
    ])

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'bilibili-video',
        class: 'block bg-white rounded-[24px] overflow-hidden shadow-lg border border-slate-100 my-3 hover:shadow-xl transition-shadow cursor-pointer',
      }),
      ...children,
    ]
  },

  addCommands() {
    return {
      setBilibiliVideo:
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
    return ReactNodeViewRenderer(BilibiliVideoView)
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('bilibiliVideoKeyboardHandler'),
        props: {
          handleKeyDown: (view, event) => {
            const { state } = view
            const { selection, tr } = state

            if (selection.node && selection.node.type.name === 'bilibiliVideo') {
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

export default BilibiliVideo