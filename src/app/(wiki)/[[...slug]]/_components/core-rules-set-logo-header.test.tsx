import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { CoreRulesSetLogoHeader } from '@/app/(wiki)/[[...slug]]/_components/core-rules-set-logo-header'
import type { RegisteredRulesVersionSummary } from '@/features/rules-documents/family-catalog'

function edition(version: string, name: string | null): RegisteredRulesVersionSummary {
	return { type: 'core-rules', version, name, status: version === '1.5' ? 'current' : 'archived' }
}

function occurrenceCount(value: string, search: string) {
	return value.split(search).length - 1
}

function imageSource(markup: string, alt: string) {
	const image = markup
		.split('<img')
		.slice(1)
		.map((fragment) => `<img${fragment.split('>')[0]}>`)
		.find((element) => element.includes(`alt="${alt}"`))
	const source = image && /\ssrc="([^"]+)"/u.exec(image)?.[1]
	if (!source) throw new Error(`Expected image ${JSON.stringify(alt)} to have a source`)

	const url = new URL(source.replaceAll('&amp;', '&'), 'https://example.com')
	return url.searchParams.get('url') ?? url.pathname
}

describe('CoreRulesSetLogoHeader', () => {
	test.each([
		{
			version: '1.5',
			name: 'Radiance',
			title: 'Core Rules 1.5 (Radiance)',
			src: '/images/sets/radiance.webp',
		},
		{
			version: '1.4',
			name: 'Vendetta',
			title: 'Core Rules 1.4 (Vendetta)',
			src: '/images/sets/vendetta.webp',
		},
	])('renders the $name logo for Core Rules $version', ({ name, src, title, version }) => {
		const markup = renderToStaticMarkup(
			<CoreRulesSetLogoHeader
				data={{ kind: 'document', edition: edition(version, name) }}
				description="Description"
				title={title}
			/>,
		)

		expect(markup).toContain(`<h1`)
		expect(markup).toContain(title)
		expect(markup).toContain(`alt="${name} logo"`)
		expect(imageSource(markup, `${name} logo`)).toBe(src)
		expect(occurrenceCount(markup, `Core Rules ${version}`)).toBe(1)
	})

	test('renders both set logos for a Core Rules comparison', () => {
		const markup = renderToStaticMarkup(
			<CoreRulesSetLogoHeader
				data={{
					kind: 'change',
					from: edition('1.4', 'Vendetta'),
					to: edition('1.5', 'Radiance'),
				}}
				description="Changes between Core Rules 1.4 and 1.5."
				title="Core Rules 1.5 Changes (Radiance)"
			/>,
		)

		expect(markup).toContain('alt="Vendetta logo"')
		expect(imageSource(markup, 'Vendetta logo')).toBe('/images/sets/vendetta.webp')
		expect(markup).toContain('alt="Radiance logo"')
		expect(imageSource(markup, 'Radiance logo')).toBe('/images/sets/radiance.webp')
		expect(occurrenceCount(markup, '1.4')).toBe(1)
		expect(occurrenceCount(markup, '1.5')).toBe(2)
	})

	test('falls back to the edition name when no set logo exists', () => {
		const markup = renderToStaticMarkup(
			<CoreRulesSetLogoHeader
				data={{ kind: 'document', edition: edition('1.0', 'Pre-Origins') }}
				description="Archived Core Rules."
				title="Archived Core Rules"
			/>,
		)

		expect(markup).toContain('>Pre-Origins</span>')
		expect(markup).not.toContain('<img')
	})

	test('uses the edition fallback in a Core Rules comparison', () => {
		const markup = renderToStaticMarkup(
			<CoreRulesSetLogoHeader
				data={{
					kind: 'change',
					from: edition('1.0', 'Pre-Origins'),
					to: edition('1.1', 'Origins'),
				}}
				description="Changes between Core Rules 1.0 and 1.1."
				title="Core Rules 1.1 Changes (Origins)"
			/>,
		)

		expect(markup).toContain('>Pre-Origins</span>')
		expect(imageSource(markup, 'Origins logo')).toBe('/images/sets/origins.webp')
	})
})
