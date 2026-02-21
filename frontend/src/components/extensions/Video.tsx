import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface VideoOptions {
  HTMLAttributes: Record<string, any>,
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: { src: string, title?: string }) => ReturnType,
      updateVideo: (options: { src?: string, title?: string }) => ReturnType,
    }
  }
}

export const Video = Node.create<VideoOptions>({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,

  addOptions() {
    return { HTMLAttributes: {} }
  },

  addAttributes() {
    return {
      src: { default: null },
      title: { default: null },
      controls: { default: true },
    }
  },

  parseHTML() {
    return [{ tag: 'video' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      { class: 'video-wrapper my-8' },
      [
        'video',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          controls: 'controls',
          class: 'rounded-[32px] shadow-2xl w-full max-w-3xl mx-auto border border-white/50',
          style: 'max-height: 70vh;',
        }),
      ],
    ]
  },

  addCommands() {
    return {
      setVideo: options => ({ commands }) => commands.insertContent({ type: this.name, attrs: options }),
      updateVideo: options => ({ commands }) => commands.updateAttributes(this.name, options),
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('videoKeyboardHandler'),
        props: {
          handleKeyDown: (view, event) => {
            const { state } = view
            const { selection, tr } = state
            
            if (selection.node && selection.node.type.name === 'video') {
              if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                const pos = selection.$to.after()
                const textNode = state.schema.text(event.key)
                const paragraph = state.schema.nodes.paragraph.create(null, textNode)
                const insertTr = tr.insert(pos, paragraph)
                const newPos = pos + 2
                insertTr.setSelection(new state.schema.textSelection(insertTr.doc.resolve(newPos)))
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

export default Video