import { Image as TiptapImage } from '@tiptap/extension-image'
import { mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const Image = TiptapImage.extend({
  name: 'image',
  
  group: 'block',
  atom: true,
  draggable: true,
  inline: false,

  addOptions() {
    return {
      allowBase64: true,
      HTMLAttributes: {
        class: 'rounded-[40px] shadow-2xl my-16 border border-white/50 mx-auto'
      },
      inline: false,
    }
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('imageKeyboardHandler'),
        props: {
          handleKeyDown: (view, event) => {
            const { state } = view
            const { selection, tr } = state
            
            // 检查是否是 NodeSelection 且选中了 image
            if (selection.node && selection.node.type.name === 'image') {
              // 如果是文本输入
              if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                // 在节点后插入新段落，并插入输入的字符
                const pos = selection.$to.after()
                const textNode = state.schema.text(event.key)
                const paragraph = state.schema.nodes.paragraph.create(null, textNode)
                const insertTr = tr.insert(pos, paragraph)
                const newPos = pos + 2  // 光标在字符后面
                
                // 设置光标到新段落中的文字后面
                insertTr.setSelection(
                  new state.schema.textSelection(insertTr.doc.resolve(newPos))
                )
                view.dispatch(insertTr)
                
                return true  // 阻止默认行为
              }
            }
            return false
          },
        },
      }),
    ]
  },
})

export default Image