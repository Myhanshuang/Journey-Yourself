import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('entry action hooks invalidate app-query caches after migration', async () => {
  const togglePin = await readFile(new URL('../src/features/journaling/entry-actions/useTogglePin.ts', import.meta.url), 'utf8')
  const deleteDiary = await readFile(new URL('../src/features/journaling/entry-actions/useDeleteDiary.ts', import.meta.url), 'utf8')

  assert.match(togglePin, /\['app', 'home'\]/)
  assert.match(togglePin, /\['app', 'timeline'\]/)
  assert.match(togglePin, /\['app', 'entry', diaryId\]/)
  assert.match(togglePin, /\['app', 'notebook'\]/)

  assert.match(deleteDiary, /\['app', 'home'\]/)
  assert.match(deleteDiary, /\['app', 'timeline'\]/)
  assert.match(deleteDiary, /\['app', 'entry', diaryId\]/)
  assert.match(deleteDiary, /\['app', 'notebook'\]/)
})
