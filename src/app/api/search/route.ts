import { createFromSource } from 'fumadocs-core/search/server'
import { source } from '@/lib/source'

// Keep `noindex` pages (everything under content/reference/, e.g. CRD snapshots and
// patch-note diffs) out of the search index, mirroring the sitemap's `!page.data.noindex`
// filter so site search matches what search engines are allowed to see. createFromSource
// indexes every `loader.getPages()` with no built-in filter, so we wrap the loader and
// filter there. A Proxy (rather than spreading `source`) avoids eagerly triggering the
// loader's lazy `pageTree` getter.
const searchSource = new Proxy(source, {
	get(target, prop, receiver) {
		if (prop === 'getPages') {
			return (language?: string) => target.getPages(language).filter((page) => !page.data.noindex)
		}
		return Reflect.get(target, prop, receiver)
	},
})

export const { GET } = createFromSource(searchSource, { language: 'english' })
