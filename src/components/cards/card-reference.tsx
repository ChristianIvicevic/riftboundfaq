import { Fragment, type ReactNode } from 'react'
import { CardReferenceImage } from '@/components/cards/card-reference-image'
import { CopyableContent } from '@/components/copyable-content'
import { resolveGameTermToken } from '@/components/game-terms'
import { RiftboundLogo } from '@/components/icons/riftbound-logo'
import { CardTextSymbol, Energy, RUNES, Universal } from '@/components/resources'
import { statusBadgeVariants } from '@/components/ui/status-badge'
import type { CardReference as CardReferenceData } from '@/lib/cards/card-reference'
import { getRiftboundWikiUrl } from '@/lib/cards/links'

function renderToken(token: string, key: string, associatedAbility: boolean) {
	const gameTerm = resolveGameTermToken(token)
	if (gameTerm) {
		const { Component, value } = gameTerm
		return <Component key={key} associatedAbility={associatedAbility} value={value} />
	}

	if (!associatedAbility) {
		if (/^\d+$/u.test(token)) return <Energy key={key} value={Number(token)} />

		// SAFETY: Object.hasOwn establishes that token is one of RUNES' own keys before the guarded lookup.
		const Rune = Object.hasOwn(RUNES, token) ? RUNES[token as keyof typeof RUNES] : undefined
		if (Rune) return <Rune key={key} />
		if (token === 'Universal') return <Universal key={key} label="Universal" />
		if (token === 'Exhaust' || token === 'Might') {
			return <CardTextSymbol key={key} name={token} />
		}
	}

	const sourceText = `[${token}]${associatedAbility ? '[>]' : ''}`

	return (
		<span
			key={key}
			className="mx-0.5 inline-flex rounded border border-fd-border bg-fd-background px-1 font-mono text-[0.8em] leading-5 font-medium text-fd-foreground"
			data-copy-text={sourceText}
		>
			{sourceText}
		</span>
	)
}

function renderCardTextTokens(text: string, keyPrefix: string) {
	return text.split(/(\[[^\]\n]+\](?:\[>\])?)/gu).map((part, partIndex) => {
		const token = /^\[([^\]]+)\](\[>\])?$/u.exec(part)
		return token?.[1] ? renderToken(token[1], `${keyPrefix}-${partIndex}`, token[2] !== undefined) : part
	})
}

function renderInlineText(text: string, lineIndex: number) {
	const segments: { reminder: boolean; text: string }[] = []
	let depth = 0
	let segmentStart = 0

	for (let index = 0; index < text.length; index += 1) {
		const character = text[index]
		if (character === '(') {
			if (depth === 0) {
				if (index > segmentStart) segments.push({ reminder: false, text: text.slice(segmentStart, index) })
				segmentStart = index
			}
			depth += 1
		} else if (character === ')' && depth > 0) {
			depth -= 1
			if (depth === 0) {
				segments.push({ reminder: true, text: text.slice(segmentStart, index + 1) })
				segmentStart = index + 1
			}
		}
	}

	if (segmentStart < text.length) segments.push({ reminder: false, text: text.slice(segmentStart) })

	return segments.map((segment, segmentIndex) => {
		const key = `${lineIndex}-${segmentIndex}`
		const content = renderCardTextTokens(segment.text, key)
		return segment.reminder ? (
			<em key={key} className="italic">
				{content}
			</em>
		) : (
			<Fragment key={key}>{content}</Fragment>
		)
	})
}

function CardText({ children }: { children: string }) {
	const lines = children.split('\n')
	const blocks: ReactNode[] = []

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? ''
		if (line.startsWith('- ')) {
			const items: ReactNode[] = []
			while (lines[index]?.startsWith('- ')) {
				items.push(<li key={index}>{renderInlineText((lines[index] ?? '').slice(2), index)}</li>)
				index += 1
			}
			index -= 1
			blocks.push(
				<ul key={`list-${index}`} className="my-0 list-disc space-y-1 pl-5">
					{items}
				</ul>,
			)
			continue
		}

		blocks.push(
			<p key={index} className="m-0">
				{renderInlineText(line, index)}
			</p>,
		)
	}

	return (
		<div className="flex flex-col gap-1.5 text-[0.9375rem] leading-6 wrap-anywhere text-fd-foreground">
			{blocks}
		</div>
	)
}

export function CardReference({
	errataHref,
	name,
	reference,
}: {
	name: string
	errataHref: string
	reference: CardReferenceData
}) {
	const hasNoRulesText = reference.currentText === null && reference.effectText === null

	return (
		<section
			aria-label={`${name} card reference`}
			className="not-prose mt-5 mb-8 overflow-hidden rounded-xl border border-fd-border bg-fd-muted/30"
		>
			<div className="grid sm:grid-cols-[13.5rem_minmax(0,1fr)]">
				<div className="flex flex-col items-center gap-3 p-4 sm:border-r sm:border-fd-border">
					<CardReferenceImage
						key={reference.imageUrl}
						height={reference.imageHeight}
						name={name}
						src={reference.imageUrl}
						width={reference.imageWidth}
					/>
					<a
						className="inline-flex items-center gap-1.5 text-xs font-medium text-fd-muted-foreground underline decoration-fd-border underline-offset-4 transition-colors hover:text-fd-foreground hover:decoration-fd-foreground focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:outline-none"
						href={getRiftboundWikiUrl(name)}
						rel="noopener noreferrer"
						target="_blank"
					>
						<RiftboundLogo className="size-3.5 text-[#EF7D00]!" />
						View on Riftbound Wiki
					</a>
				</div>
				<CopyableContent className="min-w-0 border-t border-fd-border p-5 sm:border-t-0">
					<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
						<h2 className="m-0 text-xs font-semibold tracking-wide text-fd-foreground uppercase">
							Current text
						</h2>
						{reference.hasErrata && (
							<a
								className={statusBadgeVariants({ interactive: true, tone: 'caution' })}
								data-slot="status-badge"
								href={errataHref}
							>
								Errata applied
							</a>
						)}
					</div>
					{reference.hasErrata && (
						<p className="mt-0 mb-3 text-sm leading-6 text-fd-muted-foreground">
							The card image may show outdated wording.
						</p>
					)}
					{reference.currentText && <CardText>{reference.currentText}</CardText>}
					{hasNoRulesText && (
						<p className="m-0 text-base leading-7 text-fd-muted-foreground">This card has no rules text.</p>
					)}
					{reference.effectText && (
						<div className="mt-5 border-t border-fd-border pt-4">
							<h3 className="mt-0 mb-3 text-xs font-semibold tracking-wide text-fd-foreground uppercase">
								Effect
							</h3>
							<CardText>{reference.effectText}</CardText>
						</div>
					)}
				</CopyableContent>
			</div>
		</section>
	)
}
