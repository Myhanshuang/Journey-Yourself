import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'

test('frontend api client is extracted into shared/api/client.ts', async () => {
  await access(new URL('../src/shared/api/client.ts', import.meta.url))
  await access(new URL('../src/shared/api/legacy.ts', import.meta.url))

  const legacyApi = await readFile(new URL('../src/lib/api.ts', import.meta.url), 'utf8')
  assert.match(legacyApi, /from '\.\.\/shared\/api\/legacy'/)
})
