import { generateCardIndex } from './card-index-generation'

const catalogUrl = new URL('../../sources/card-catalog.json', import.meta.url)
const errataUrl = new URL('../../sources/card-errata.json', import.meta.url)
const outputUrl = new URL('../../src/generated/card-index.ts', import.meta.url)
const cardCount = await generateCardIndex(catalogUrl, errataUrl, outputUrl)

console.log(`Generated reference metadata for ${cardCount} cards.`)
