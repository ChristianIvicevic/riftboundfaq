import { createFromSource } from 'fumadocs-core/search/server'
import { getPagePublication } from '@/lib/content/page-publication'
import { source } from '@/lib/content/source'

function isSearchSourceKey(property: PropertyKey): property is keyof typeof source {
	return Object.hasOwn(source, property)
}

// Keep `noindex` pages (everything under content/reference/, e.g. rules snapshots and
// change diffs) out of the search index, mirroring the sitemap's indexability
// policy so site search matches what search engines are allowed to see. createFromSource
// indexes every `loader.getPages()` with no built-in filter, so we wrap the loader and
// filter there. A Proxy (rather than spreading `source`) avoids eagerly triggering the
// loader's lazy `pageTree` getter.
const searchSource = new Proxy(source, {
	get(target, prop) {
		if (prop === 'getPages') {
			return (language?: string) =>
				target.getPages(language).filter((page) => getPagePublication(page).isIndexable)
		}
		if (!isSearchSourceKey(prop)) return
		return target[prop]
	},
})

export const { GET } = createFromSource(searchSource, { language: 'english' })
