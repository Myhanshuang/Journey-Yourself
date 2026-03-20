import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('editor uses dedicated mobile side and bottom safe-area insets for its main content', async () => {
  const editorSource = await readFile(new URL('../src/components/Editor.tsx', import.meta.url), 'utf8')
  const cssSource = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')

  assert.match(cssSource, /--app-safe-bottom/)
  assert.match(editorSource, /mobileContentBottom/)
  assert.match(editorSource, /paddingBottom: mobileContentBottom/)
  assert.match(editorSource, /mobileContentInsetLeft/)
  assert.match(editorSource, /mobileContentInsetRight/)
  assert.match(editorSource, /paddingLeft: mobileContentInsetLeft/)
  assert.match(editorSource, /paddingRight: mobileContentInsetRight/)
  assert.match(editorSource, /max-w-\[840px\] mx-auto py-8 px-8 text-\[#232f55\]/)
})
