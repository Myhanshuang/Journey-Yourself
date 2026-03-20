import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('shared modal z-index sits above editor stacked headers', async () => {
  const editorSource = await readFile(new URL('../src/components/Editor.tsx', import.meta.url), 'utf8')
  const modalSource = await readFile(new URL('../src/components/ui/modal.tsx', import.meta.url), 'utf8')

  assert.match(editorSource, /z-\[210\]/)
  assert.match(modalSource, /z-\[(2[2-9][0-9]|[3-9][0-9]{2,})\]/)
})
