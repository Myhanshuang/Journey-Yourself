import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface NotionBlockOptions {
  HTMLAttributes: Record<string, string>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    notionBlock: {
      setNotionBlock: (options: { pageId: string; title: string; icon?: string; cover?: string; url: string }) => ReturnType
    }
  }
}

export const NotionBlock = Node.create<NotionBlockOptions>({
  name: 'notionBlock',

  group: 'block',
  atom: true,
  draggable: true,
  inline: false,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'notion-block',
      },
    }
  },

  addAttributes() {
    return {
      pageId: {
        default: null,
        parseHTML: element => element.getAttribute('data-page-id'),
        renderHTML: attributes => {
          if (!attributes.pageId) return {}
          return { 'data-page-id': attributes.pageId }
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
      icon: {
        default: null,
        parseHTML: element => element.getAttribute('data-icon'),
        renderHTML: attributes => {
          if (!attributes.icon) return {}
          return { 'data-icon': attributes.icon }
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
      url: {
        default: null,
        parseHTML: element => element.getAttribute('data-url'),
        renderHTML: attributes => {
          if (!attributes.url) return {}
          return { 'data-url': attributes.url }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="notion-block"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const pageId = HTMLAttributes['data-page-id']
    const title = HTMLAttributes['data-title'] || 'Untitled'
    const icon = HTMLAttributes['data-icon']
    const cover = HTMLAttributes['data-cover']
    const url = HTMLAttributes['data-url']

    const children = []

    // Cover image
    if (cover) {
      children.push([
        'img',
        {
          src: cover,
          alt: title,
          class: 'block w-full !max-w-full aspect-[3/1] object-cover !m-0 rounded-none',
        },
      ])
    }

    // Content area
    const contentChildren = []

    // Header with icon and title
    const headerChildren = []

    // Icon
    if (icon) {
      if (icon.startsWith('http')) {
        headerChildren.push([
          'img',
          {
            src: icon,
            alt: '',
            class: 'w-8 h-8 rounded-lg object-cover flex-shrink-0',
          },
        ])
      } else {
        headerChildren.push([
          'span',
          { class: 'text-2xl flex-shrink-0' },
          icon,
        ])
      }
    } else {
      // Default icon
      headerChildren.push([
        'div',
        { class: 'w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0' },
        [
          'svg',
          {
            xmlns: 'http://www.w3.org/2000/svg',
            width: '16',
            height: '16',
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '2',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            class: 'text-slate-400',
          },
          [
            'path',
            { d: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z' },
          ],
          [
            'polyline',
            { points: '14 2 14 8 20 8' },
          ],
        ],
      ])
    }

    // Title
    headerChildren.push([
      'h4',
      { class: 'font-bold text-[#232f55] text-base flex-1 min-w-0 truncate ml-3' },
      title,
    ])

    contentChildren.push([
      'div',
      { class: 'flex items-center gap-3' },
      ...headerChildren,
    ])

    // Notion badge
    contentChildren.push([
      'div',
      { class: 'flex items-center gap-2 mt-3' },
      [
        'span',
        { class: 'text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded-md' },
        'NOTION',
      ],
      [
        'a',
        {
          href: url || `https://notion.so/${pageId?.replace(/-/g, '')}`,
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'text-[10px] font-bold text-[#6ebeea] hover:underline ml-auto',
          onclick: 'event.stopPropagation()',
        },
        'Open in Notion →',
      ],
    ])

    children.push([
      'div',
      { class: 'p-4' },
      ...contentChildren,
    ])

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'notion-block',
        class: 'block bg-white rounded-[24px] overflow-hidden shadow-lg border border-slate-100 my-4 hover:shadow-xl transition-shadow cursor-pointer',
      }),
      ...children,
    ]
  },

  addCommands() {
    return {
      setNotionBlock:
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
        key: new PluginKey('notionBlockKeyboardHandler'),
        props: {
          handleKeyDown: (view, event) => {
            const { state } = view
            const { selection, tr } = state

            if (selection.node && selection.node.type.name === 'notionBlock') {
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

export default NotionBlock
