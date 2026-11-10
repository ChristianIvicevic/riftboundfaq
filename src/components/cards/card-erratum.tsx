import { cva } from 'class-variance-authority'
import { ChevronDown } from 'lucide-react'
import { Children, isValidElement, type ReactNode } from 'react'
import { CardReferenceImage } from '@/components/cards/card-reference-image'
import { RiftboundLogo } from '@/components/icons/riftbound-logo'
import { getCardReference } from '@/lib/cards/catalog'
import { getRiftboundWikiUrl } from '@/lib/cards/links'

type CardErratumTextVariant = 'original' | 'current'

const cardErratumTextBodyVariants = cva(
	'text-sm leading-6 wrap-anywhere [&>p]:my-1.5 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0',
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

function getCardErratumText(children: ReactNode, variant: CardErratumTextVariant) {
	const text = Children.toArray(children).find(
		(child) => isValidElement<{ variant?: CardErratumTextVariant }>(child) && child.props.variant === variant,
	)
	if (!text) throw new Error(`Card erratum is missing its ${variant} text`)
	return text
}

export function CardErratum({ name, children }: { name: string; children: ReactNode }) {
	const reference = getCardReference(name)
	if (!reference) {
		throw new Error(`Card erratum name is missing from the card catalog: ${name}`)
	}
	const wikiUrl = getRiftboundWikiUrl(name)
	const currentText = getCardErratumText(children, 'current')
	const originalText = getCardErratumText(children, 'original')

	return (
		<section
			aria-label={`${name} erratum comparison`}
			className="not-prose mb-14 overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-sm"
		>
			<div className="grid md:grid-cols-[12.5rem_minmax(0,1fr)]">
				<div className="flex flex-col items-center gap-3 border-b border-fd-border p-4 md:border-r md:border-b-0">
					<CardReferenceImage
						className="md:max-w-40"
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
						Riftbound Wiki
					</a>
				</div>
				<div className="min-w-0 p-5">
					<section className="rounded-lg border border-green-700/30 bg-green-50/60 p-4 dark:border-green-300/25 dark:bg-green-950/20">
						<div className="mb-2">
							<h3 className="m-0 text-xs font-bold tracking-[0.12em] text-green-900 uppercase dark:text-green-200">
								Current text
							</h3>
						</div>
						{currentText}
					</section>
					<details className="group mt-3 rounded-lg border border-fd-border bg-fd-muted/20">
						<summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
							<span>Show printed wording</span>
							<ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
						</summary>
						<div className="border-t border-fd-border px-4 py-3">{originalText}</div>
					</details>
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
	return <div className={cardErratumTextBodyVariants({ variant })}>{children}</div>
}
