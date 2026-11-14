import { DocsDescription, DocsTitle } from 'fumadocs-ui/layouts/spacious/page'
import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import type { RegisteredRulesVersionSummary } from '@/features/rules-documents/family-catalog'
import { cn } from '@/lib/cn'
import { getCoreRulesSetLogo } from '@/lib/rules/core-rules-set-logos'

export type CoreRulesSetLogoHeaderData =
	| Readonly<{
			kind: 'document'
			edition: RegisteredRulesVersionSummary
	  }>
	| Readonly<{
			kind: 'change'
			from: RegisteredRulesVersionSummary
			to: RegisteredRulesVersionSummary
	  }>

function SetLogo({
	compact = false,
	edition,
}: {
	compact?: boolean
	edition: RegisteredRulesVersionSummary
}) {
	const asset = getCoreRulesSetLogo(edition.name)
	if (!asset) {
		return (
			<span
				className={cn(
					'flex min-h-10 max-w-full items-center justify-center rounded border border-dashed border-current/25 px-3 text-center text-sm font-semibold tracking-widest uppercase',
					compact && 'px-1 text-xs tracking-wide whitespace-nowrap',
				)}
			>
				{edition.name ?? `Core Rules ${edition.version}`}
			</span>
		)
	}

	return (
		<Image
			alt={`${edition.name} logo`}
			className={cn('h-auto w-auto max-w-full object-contain', compact ? 'max-h-12' : 'max-h-16')}
			height={asset.height}
			src={asset.src}
			width={asset.width}
		/>
	)
}

function SetLogoSlot({
	compact = false,
	edition,
}: {
	compact?: boolean
	edition: RegisteredRulesVersionSummary
}) {
	return (
		<div className={cn('grid min-w-0 place-items-center', compact ? 'h-12' : 'h-16')}>
			<SetLogo compact={compact} edition={edition} />
		</div>
	)
}

export function CoreRulesSetLogoHeader({
	data,
	description,
	title,
	titleClassName,
}: {
	data: CoreRulesSetLogoHeaderData
	description: string
	title: string
	titleClassName?: string
}) {
	return (
		<header className="mb-8 grid gap-6 border-b border-fd-border pb-7 sm:grid-cols-[minmax(0,1fr)_15rem] sm:items-start">
			<div className="min-w-0">
				<DocsTitle className={titleClassName}>{title}</DocsTitle>
				<DocsDescription className="mb-0">{description}</DocsDescription>
			</div>
			<div
				className={cn(
					'rounded-xl border border-fd-border bg-fd-muted/30 text-fd-foreground',
					data.kind === 'document' ? 'px-5 py-5' : 'px-4 py-3',
				)}
			>
				{data.kind === 'document' ? (
					<SetLogoSlot edition={data.edition} />
				) : (
					<div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
						<SetLogoSlot compact edition={data.from} />
						<ArrowRight aria-hidden className="size-3 text-fd-muted-foreground" />
						<SetLogoSlot compact edition={data.to} />
					</div>
				)}
			</div>
		</header>
	)
}
