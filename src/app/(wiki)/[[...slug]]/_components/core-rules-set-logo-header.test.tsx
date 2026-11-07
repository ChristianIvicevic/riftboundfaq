import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { CoreRulesSetLogoHeader } from '@/app/(wiki)/[[...slug]]/_components/core-rules-set-logo-header'
import type { RegisteredRulesVersionSummary } from '@/features/rules-documents/family-catalog'

function edition(version: string, name: string | null): RegisteredRulesVersionSummary {
	return { type: 'core-rules', version, name, status: version === '1.5' ? 'current' : 'archived' }
}

describe('CoreRulesSetLogoHeader', () => {
	test.each([
		{ version: '1.5', name: 'Radiance', title: 'Core Rules 1.5 (Radiance)' },
		{ version: '1.4', name: 'Vendetta', title: 'Core Rules 1.4 (Vendetta)' },
	])('renders the $name logo for Core Rules $version', ({ name, title, version }) => {
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
		expect(markup).toContain('alt="Radiance logo"')
	})

	test('falls back to the edition name when no set logo exists', () => {
		const markup = renderToStaticMarkup(
			<CoreRulesSetLogoHeader
				data={{ kind: 'document', edition: edition('1.0', 'Pre-Origins') }}
				description="Archived Core Rules."
				title="Core Rules 1.0 (Pre-Origins)"
			/>,
		)

		expect(markup).toContain('Pre-Origins')
		expect(markup).not.toContain('<img')
	})
})
