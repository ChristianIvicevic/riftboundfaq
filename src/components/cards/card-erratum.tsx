import { cva } from 'class-variance-authority'
import { Children, isValidElement, type ReactNode } from 'react'
import { CardReferenceImage } from '@/components/cards/card-reference-image'
import { RiftboundLogo } from '@/components/icons/riftbound-logo'
import { getCardReference } from '@/lib/cards/catalog'
import { getRiftboundWikiUrl } from '@/lib/cards/links'

type CardErratumTextVariant = 'original' | 'current'

const CARD_ERRATUM_TEXT_METADATA = {
	original: { label: 'Original text' },
	current: { label: 'Current text' },
} satisfies Record<CardErratumTextVariant, { label: string }>

const cardErratumTextLabelVariants = cva('m-0 text-xs font-semibold tracking-wide uppercase', {
	variants: {
		variant: {
			original: 'text-fd-muted-foreground',
			current: 'text-fd-foreground',
		},
	},
})

const cardErratumTextBodyVariants = cva(
	'mt-2 text-sm leading-6 wrap-anywhere [&>p]:my-1.5 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0',
	{
		variants: {
			variant: {
				original:
					'text-fd-muted-foreground [&_del]:bg-red-50 [&_del]:font-medium [&_del]:text-red-700 [&_del]:decoration-red-500 dark:[&_del]:bg-red-950/30 dark:[&_del]:text-red-300 dark:[&_del]:decoration-red-400',
				current: 'text-fd-foreground',
			},
		},
	},
)

function getCardErratumTextOrder(child: ReactNode) {
	if (!isValidElement<{ variant?: CardErratumTextVariant }>(child)) return 2
	if (child.props.variant === 'current') return 0
	if (child.props.variant === 'original') return 1
	return 2
}

function currentTextFirst(children: ReactNode) {
	return Children.toArray(children).toSorted(
		(firstChild, secondChild) => getCardErratumTextOrder(firstChild) - getCardErratumTextOrder(secondChild),
	)
}

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
					<div className="divide-y divide-fd-border">{currentTextFirst(children)}</div>
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
	const { label } = CARD_ERRATUM_TEXT_METADATA[variant]
	return (
		<section className="py-4 first:pt-0 last:pb-0">
			<h3 className={cardErratumTextLabelVariants({ variant })}>{label}</h3>
			<div className={cardErratumTextBodyVariants({ variant })}>{children}</div>
		</section>
	)
}
