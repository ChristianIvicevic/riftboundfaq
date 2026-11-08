import Link from 'next/link'
import { LandingSearchTrigger } from '@/app/(wiki)/[[...slug]]/_components/landing-search-trigger'
import { source } from '@/lib/content/source'

const RULING_FAMILIES = [
	{ prefix: '/cards/', label: 'Card' },
	{ prefix: '/mechanics/', label: 'Mechanic' },
	{ prefix: '/general-rules/', label: 'General Rules' },
] as const

const PUBLICATION_DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	timeZone: 'UTC',
})

function getLatestRulings() {
	return source
		.getPages()
		.flatMap((page) => {
			const family = RULING_FAMILIES.find(({ prefix }) => page.url.startsWith(prefix))
			if (!family || !page.data.createdAt) return []

			return [
				{
					createdAt: page.data.createdAt,
					family: family.label,
					href: page.url,
					title: page.data.title,
				},
			]
		})
		.toSorted(
			(left, right) => right.createdAt.localeCompare(left.createdAt) || left.title.localeCompare(right.title),
		)
		.slice(0, 5)
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
				<ul className="mt-3 divide-y divide-fd-border overflow-hidden rounded-xl border border-fd-border bg-fd-card">
					{latestRulings.map((ruling) => (
						<li key={ruling.href}>
							<Link
								className="flex flex-col gap-1 px-4 py-3.5 transition-colors hover:bg-fd-accent/70 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
								href={ruling.href}
							>
								<span className="font-medium text-fd-foreground">{ruling.title}</span>
								<span className="flex shrink-0 items-center gap-3 text-xs text-fd-muted-foreground">
									<span>{ruling.family}</span>
									<time className="border-s border-fd-border ps-3" dateTime={ruling.createdAt}>
										{PUBLICATION_DATE_FORMATTER.format(new Date(`${ruling.createdAt}T00:00:00Z`))}
									</time>
								</span>
							</Link>
						</li>
					))}
				</ul>
			</section>
		</div>
	)
}
