import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { LandingSearchTrigger } from '@/app/(wiki)/[[...slug]]/_components/landing-search-trigger'
import { getCardReference } from '@/lib/cards/catalog'
import { cn } from '@/lib/cn'
import { RULING_PATH_PREFIXES } from '@/lib/content/ruling-routes'
import { source } from '@/lib/content/source'

const RULING_FAMILIES = [
	{ prefix: RULING_PATH_PREFIXES.cards, label: 'Card' },
	{ prefix: RULING_PATH_PREFIXES.mechanics, label: 'Mechanic' },
	{ prefix: RULING_PATH_PREFIXES.generalRules, label: 'General Rules' },
] as const

const PUBLICATION_DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	timeZone: 'UTC',
})

type LatestRuling = Readonly<{
	createdAt: string
	family: string
	href: string
	image?: Readonly<{
		height: number
		src: string
		width: number
	}>
	title: string
}>

function getLatestRulings(): LatestRuling[] {
	return source
		.getPages()
		.flatMap((page) => {
			const family = RULING_FAMILIES.find(({ prefix }) => page.url.startsWith(prefix))
			if (!family || !page.data.createdAt) return []
			const card =
				family.prefix === RULING_PATH_PREFIXES.cards ? getCardReference(page.data.title) : undefined

			return [
				{
					createdAt: page.data.createdAt,
					family: family.label,
					href: page.url,
					image: card ? { height: card.imageHeight, src: card.imageUrl, width: card.imageWidth } : undefined,
					title: page.data.title,
				},
			]
		})
		.toSorted(
			(left, right) => right.createdAt.localeCompare(left.createdAt) || left.title.localeCompare(right.title),
		)
		.slice(0, 5)
}

function LatestRulingsList({ rulings }: { rulings: readonly LatestRuling[] }) {
	return (
		<ul className="mt-3 divide-y divide-fd-border overflow-hidden rounded-xl border border-fd-border bg-fd-card">
			{rulings.map((ruling) => (
				<li key={ruling.href}>
					<Link
						className="group relative isolate flex min-h-18 items-center overflow-hidden px-4 py-3.5 transition-colors hover:bg-fd-accent/70 focus-visible:z-20 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fd-ring"
						href={ruling.href}
					>
						{ruling.image && (
							<>
								<img
									aria-hidden="true"
									alt=""
									className={cn(
										'pointer-events-none absolute -right-3 z-0 h-40 w-auto max-w-none rotate-6 opacity-35 saturate-75 transition duration-300 ease-out group-hover:right-0 group-hover:scale-105 group-hover:opacity-50 dark:opacity-45 dark:group-hover:opacity-60',
										ruling.image.width > ruling.image.height
											? 'top-1/2 origin-right -translate-y-1/2'
											: '-top-1 origin-top-right',
									)}
									height={ruling.image.height}
									loading="lazy"
									src={ruling.image.src}
									style={{
										maskImage: 'linear-gradient(to right, transparent 0%, black 38%, black 100%)',
									}}
									width={ruling.image.width}
								/>
								<span className="pointer-events-none absolute inset-0 z-1 bg-linear-to-r from-fd-card from-45% via-fd-card/75 to-transparent transition-colors group-hover:from-fd-accent group-hover:via-fd-accent/75" />
							</>
						)}
						<span className={cn('relative z-10 flex min-w-0 flex-col gap-1', ruling.image && 'max-w-[72%]')}>
							<span className="font-medium text-fd-foreground">{ruling.title}</span>
							<span className="flex items-center gap-2 text-xs text-fd-muted-foreground">
								<span>{ruling.family}</span>
								<span aria-hidden="true" className="size-0.5 rounded-full bg-current opacity-60" />
								<time dateTime={ruling.createdAt}>
									{PUBLICATION_DATE_FORMATTER.format(new Date(`${ruling.createdAt}T00:00:00Z`))}
								</time>
							</span>
						</span>
						<ArrowUpRight
							aria-hidden="true"
							className="absolute right-3 bottom-3 z-10 size-4 translate-y-1 text-fd-foreground opacity-0 transition group-hover:translate-y-0 group-hover:opacity-70"
						/>
					</Link>
				</li>
			))}
		</ul>
	)
}

export function LandingPage() {
	const latestRulings = getLatestRulings()

	return (
		<div className="not-prose space-y-8">
			<LandingSearchTrigger />
			<section aria-labelledby="latest-rulings-heading">
				<h2 id="latest-rulings-heading" className="text-xl font-semibold tracking-tight text-fd-foreground">
					Latest rulings
				</h2>
				<LatestRulingsList rulings={latestRulings} />
			</section>
		</div>
	)
}
