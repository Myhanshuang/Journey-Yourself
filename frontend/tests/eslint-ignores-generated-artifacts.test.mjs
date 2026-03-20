import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('eslint config ignores generated frontend artifacts', async () => {
  const config = await readFile(new URL('../eslint.config.js', import.meta.url), 'utf8')

  assert.match(config, /dist/)
  assert.match(config, /android\/app\/build/)
})
