import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface AudioOptions {
  HTMLAttributes: Record<string, any>,
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    audio: {
      setAudio: (options: { src: string, title?: string }) => ReturnType,
      updateAudio: (options: { src?: string, title?: string }) => ReturnType,
    }
  }
}

export const Audio = Node.create<AudioOptions>({
  name: 'audio',
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
    return [{ tag: 'audio' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      { class: 'audio-wrapper my-6 p-6 bg-white/80 backdrop-blur-sm rounded-[24px] shadow-xl border border-white/50 max-w-2xl mx-auto' },
      [
        'audio',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          controls: 'controls',
          class: 'w-full',
          style: 'height: 48px;',
        }),
      ],
    ]
  },

  addCommands() {
    return {
      setAudio: options => ({ commands }) => commands.insertContent({ type: this.name, attrs: options }),
      updateAudio: options => ({ commands }) => commands.updateAttributes(this.name, options),
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('audioKeyboardHandler'),
        props: {
          handleKeyDown: (view, event) => {
            const { state } = view
            const { selection, tr } = state
            
            if (selection.node && selection.node.type.name === 'audio') {
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

export default Audio