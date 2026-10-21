import { cva } from 'class-variance-authority'
import type { ReactNode } from 'react'
import { Card } from '@/components/cards/card'

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
	return (
		<>
			<div className="not-prose -mt-3 mb-4 text-sm">
				<Card name={name}>View card</Card>
			</div>
			<div className="not-prose mb-12 grid gap-3 lg:grid-cols-2">{children}</div>
		</>
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
			<div className="p-4 text-sm leading-6 wrap-anywhere whitespace-pre-wrap text-fd-foreground [&>p]:m-0">
				{children}
			</div>
		</div>
	)
}
