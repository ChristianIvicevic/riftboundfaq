import { generateCardIndex } from './card-index-generation'

const catalogUrl = new URL('../../sources/card-catalog.json', import.meta.url)
const outputUrl = new URL('../../src/generated/card-index.ts', import.meta.url)
const cardCount = await generateCardIndex(catalogUrl, outputUrl)

console.log(`Generated preview metadata for ${cardCount} cards.`)
