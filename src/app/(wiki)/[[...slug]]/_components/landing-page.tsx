import { Card, Cards } from 'fumadocs-ui/components/card'
import { Bookmark, FileDiff, Info, type LucideIcon } from 'lucide-react'
import { LandingSearchTrigger } from '@/app/(wiki)/[[...slug]]/_components/landing-search-trigger'

type LandingResource = Readonly<{
	title: string
	description: string
	href: string
	icon: LucideIcon
}>

const LANDING_RESOURCES: readonly LandingResource[] = [
	{
		title: 'Rules Documents',
		description: 'Current and historical Core Rules and Tournament Rules, plus version comparisons.',
		href: '/reference',
		icon: Bookmark,
	},
	{
		title: 'Card Errata List',
		description: 'Compare printed card text with the corrected wording currently in effect.',
		href: '/card-errata-list',
		icon: FileDiff,
	},
	{
		title: 'About Riftbound FAQ',
		description: 'Learn how this independent resource works and how to send corrections.',
		href: '/about-riftbound-faq',
		icon: Info,
	},
]

export function LandingPage() {
	return (
		<section className="not-prose space-y-5" aria-labelledby="landing-heading">
			<div className="max-w-2xl">
				<p className="mb-2 text-xs font-semibold tracking-widest text-fd-muted-foreground uppercase">
					Start here
				</p>
				<h2 id="landing-heading" className="text-xl font-semibold tracking-tight text-fd-foreground">
					Find an answer
				</h2>
				<p className="mt-2 text-sm leading-6 text-fd-muted-foreground">
					Search every ruling or use the navigation to browse General Rules, Mechanics, and Card Rulings.
				</p>
			</div>
			<LandingSearchTrigger />
			<p className="pt-1 text-xs font-semibold tracking-widest text-fd-muted-foreground uppercase">
				Resources
			</p>
			<Cards className="grid-cols-1 gap-3 sm:grid-cols-3">
				{LANDING_RESOURCES.map((resource) => {
					const Icon = resource.icon
					return (
						<Card
							key={resource.title}
							description={resource.description}
							href={resource.href}
							icon={<Icon />}
							title={resource.title}
						/>
					)
				})}
			</Cards>
		</section>
	)
}
