import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'

const movedViews = [
  ['src/views/SettingsView.tsx', "export { default } from './settings/SettingsView'"],
  ['src/views/DiaryDetailView.tsx', "export { default } from './diary/DiaryDetailView'"],
  ['src/views/NotebookDetailView.tsx', "export { default } from './notebooks/NotebookDetailView'"],
  ['src/views/TimelineView.tsx', "export { default } from './discovery/TimelineView'"],
]

const newViewFiles = [
  'src/views/settings/SettingsView.tsx',
  'src/views/diary/DiaryDetailView.tsx',
  'src/views/notebooks/NotebookDetailView.tsx',
  'src/views/discovery/TimelineView.tsx',
]

test('heavy views are organized under domain folders with compatibility wrappers', async () => {
  for (const file of newViewFiles) {
    await access(new URL(`../${file}`, import.meta.url))
  }

  for (const [file, expectedExport] of movedViews) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8')
    assert.match(source, new RegExp(expectedExport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})
