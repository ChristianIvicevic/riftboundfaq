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

function SetLogo({ className, edition }: { className?: string; edition: RegisteredRulesVersionSummary }) {
	const asset = getCoreRulesSetLogo(edition.name)
	if (!asset) {
		return (
			<span
				className={cn(
					'flex min-h-10 items-center justify-center rounded border border-dashed border-current/25 px-3 text-center text-sm font-semibold tracking-widest uppercase',
					className,
				)}
			>
				{edition.name ?? `Core Rules ${edition.version}`}
			</span>
		)
	}

	return (
		<Image
			alt={`${edition.name} logo`}
			className={cn('h-auto w-auto max-w-full object-contain', className)}
			height={asset.height}
			src={asset.src}
			width={asset.width}
		/>
	)
}

function SetLogoSlot({ edition }: { edition: RegisteredRulesVersionSummary }) {
	return (
		<div className="grid h-16 place-items-center">
			<SetLogo className="max-h-16" edition={edition} />
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
			<div className="rounded-xl border border-fd-border bg-fd-muted/30 px-5 py-5 text-fd-foreground">
				{data.kind === 'document' ? (
					<div className="space-y-4">
						<SetLogoSlot edition={data.edition} />
						<p className="border-t border-fd-border pt-3 text-center text-[11px] tracking-[0.16em] text-fd-muted-foreground uppercase">
							Core Rules {data.edition.version}
						</p>
					</div>
				) : (
					<div className="space-y-3">
						<SetLogoSlot edition={data.from} />
						<div className="flex items-center gap-2 text-[10px] tracking-[0.14em] text-fd-muted-foreground uppercase">
							<span className="h-px flex-1 bg-fd-border" />
							{data.from.version}
							<ArrowRight className="size-3" />
							{data.to.version}
							<span className="h-px flex-1 bg-fd-border" />
						</div>
						<SetLogoSlot edition={data.to} />
					</div>
				)}
			</div>
		</header>
	)
}
