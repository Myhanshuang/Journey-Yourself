import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('shared modal primitives use tighter spacing for denser dialogs', async () => {
  const modalSource = await readFile(new URL('../src/components/ui/modal.tsx', import.meta.url), 'utf8')
  const selectionSource = await readFile(new URL('../src/components/ui/selection-modal.tsx', import.meta.url), 'utf8')

  assert.match(modalSource, /max-w-md/)
  assert.match(modalSource, /rounded-\[32px\]/)
  assert.match(modalSource, /overflow-hidden/)
  assert.match(modalSource, /aspect-\[9\/16\]/)
  assert.match(selectionSource, /px-4 pt-4 pb-3/)
  assert.match(selectionSource, /px-4 pb-3/)
  assert.match(selectionSource, /px-4 pb-safe pt-1/)
})
