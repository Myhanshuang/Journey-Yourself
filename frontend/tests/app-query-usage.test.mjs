import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'

const apiFile = 'src/shared/api/appQuery.ts'
const consumers = [
  'src/views/HomeView.tsx',
  'src/views/discovery/TimelineView.tsx',
  'src/views/notebooks/NotebookDetailView.tsx',
  'src/views/ShareView.tsx',
]

test('frontend has a dedicated app-query api module and consuming views use it', async () => {
  await access(new URL(`../${apiFile}`, import.meta.url))

  for (const file of consumers) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8')
    assert.match(source, /appQueryApi/)
  }

  const shareView = await readFile(new URL('../src/views/ShareView.tsx', import.meta.url), 'utf8')
  assert.match(shareView, /publicShareSummary/)

  const searchView = await readFile(new URL('../src/views/SearchView.tsx', import.meta.url), 'utf8')
  assert.match(searchView, /searchEntries/)
  assert.match(searchView, /searchBookmarks/)

  const statsView = await readFile(new URL('../src/views/StatsView.tsx', import.meta.url), 'utf8')
  assert.match(statsView, /statsSummary/)

  const editView = await readFile(new URL('../src/views/EditView.tsx', import.meta.url), 'utf8')
  assert.match(editView, /entryDetail/)
})
