import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'

const movedModals = [
  ['src/components/modals/LocationModal.tsx', "export { default } from '../../features/integrations/geo/location-picker/LocationModal'"],
  ['src/components/modals/WeatherModal.tsx', "export { default } from '../../features/integrations/geo/weather-picker/WeatherModal'"],
  ['src/components/modals/ImmichPicker.tsx', "export { default } from '../../features/integrations/immich/picker/ImmichPicker'"],
  ['src/components/modals/KarakeepPicker.tsx', "export { default } from '../../features/integrations/karakeep/picker/KarakeepPicker'"],
  ['src/components/modals/NotionPicker.tsx', "export { default } from '../../features/integrations/notion/picker/NotionPicker'"],
]

const newModalFiles = [
  'src/features/integrations/geo/location-picker/LocationModal.tsx',
  'src/features/integrations/geo/weather-picker/WeatherModal.tsx',
  'src/features/integrations/immich/picker/ImmichPicker.tsx',
  'src/features/integrations/karakeep/picker/KarakeepPicker.tsx',
  'src/features/integrations/notion/picker/NotionPicker.tsx',
]

test('integration and geo modals are organized under features with wrappers', async () => {
  for (const file of newModalFiles) {
    await access(new URL(`../${file}`, import.meta.url))
  }

  for (const [file, expectedExport] of movedModals) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8')
    assert.match(source, new RegExp(expectedExport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})
