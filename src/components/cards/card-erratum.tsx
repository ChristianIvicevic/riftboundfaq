import { cva } from 'class-variance-authority'
import type { ReactNode } from 'react'
import { CardReferenceImage } from '@/components/cards/card-reference-image'
import { RiftboundLogo } from '@/components/icons/riftbound-logo'
import { getCardReference } from '@/lib/cards/catalog'
import { getRiftboundWikiUrl } from '@/lib/cards/links'

type CardErratumTextVariant = 'original' | 'current'

const CARD_ERRATUM_TEXT_METADATA = {
	original: { label: 'Original text', sign: '-' },
	current: { label: 'Current text', sign: '+' },
} satisfies Record<CardErratumTextVariant, { label: string; sign: string }>

const cardErratumTextVariants = cva('min-w-0 overflow-hidden rounded-lg border', {
	variants: {
		variant: {
			original: 'border-red-200 bg-red-50/70 dark:border-red-900 dark:bg-red-950/20',
			current: 'border-green-200 bg-green-50/70 dark:border-green-900 dark:bg-green-950/20',
		},
	},
})

const cardErratumTextLabelVariants = cva('border-b px-4 py-2 text-xs font-semibold tracking-wide uppercase', {
	variants: {
		variant: {
			original:
				'border-red-200 bg-red-100/60 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200',
			current:
				'border-green-200 bg-green-100/60 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200',
		},
	},
})

export function CardErratum({ name, children }: { name: string; children: ReactNode }) {
	const reference = getCardReference(name)
	if (!reference) {
		throw new Error(`Card erratum name is missing from the card catalog: ${name}`)
	}
	const wikiUrl = getRiftboundWikiUrl(name)

	return (
		<section
			aria-label={`${name} erratum comparison`}
			className="not-prose mb-14 overflow-hidden rounded-xl border border-fd-border bg-fd-muted/20 shadow-sm"
		>
			<div className="grid md:grid-cols-[13.5rem_minmax(0,1fr)]">
				<div className="flex flex-col items-center justify-start gap-3 bg-fd-muted/30 p-4 md:border-r md:border-fd-border">
					<CardReferenceImage
						height={reference.imageHeight}
						loading="lazy"
						name={name}
						src={reference.imageUrl}
						width={reference.imageWidth}
					/>
					<a
						className="inline-flex items-center gap-1.5 text-xs font-medium text-fd-muted-foreground underline decoration-fd-border underline-offset-4 transition-colors hover:text-fd-foreground hover:decoration-fd-foreground focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:outline-none"
						href={wikiUrl}
						rel="noopener noreferrer"
						target="_blank"
					>
						<RiftboundLogo className="size-3.5 text-[#EF7D00]!" />
						View on Riftbound Wiki
					</a>
				</div>
				<div className="min-w-0 border-t border-fd-border p-4 md:border-t-0">
					<div className="grid gap-3">{children}</div>
				</div>
			</div>
		</section>
	)
}

export function CardErratumText({
	variant,
	children,
}: {
	variant: CardErratumTextVariant
	children: ReactNode
}) {
	const { label, sign } = CARD_ERRATUM_TEXT_METADATA[variant]
	return (
		<div className={cardErratumTextVariants({ variant })}>
			<div className={cardErratumTextLabelVariants({ variant })}>
				<span aria-hidden="true" className="mr-1">
					{sign}
				</span>{' '}
				{label}
			</div>
			<div className="p-4 text-sm leading-6 wrap-anywhere text-fd-foreground [&>p]:my-1.5 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
				{children}
			</div>
		</div>
	)
}
