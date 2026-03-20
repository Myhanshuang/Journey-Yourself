import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('diary cards prefer backend-provided cover_image_url before parsing content', async () => {
  const source = await readFile(new URL('../src/components/ui/JourneyUI.tsx', import.meta.url), 'utf8')
  assert.match(source, /cover_image_url/)
  assert.match(source, /diary\.cover_image_url\s*\?\?/)
})
