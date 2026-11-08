'use client'

import { Popover } from '@base-ui/react/popover'
import { FullSearchTrigger } from 'fumadocs-ui/layouts/shared/slots/search-trigger'
import { BookOpenText, ChevronDown, MessageCircleQuestionMark } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ComponentProps } from 'react'
import pageIcon from '@/app/icon.png'
import { cn } from '@/lib/cn'

const RULINGS_SECTION = {
	title: 'Rulings',
	description: 'Card, mechanic, and general rulings.',
	href: '/',
	icon: MessageCircleQuestionMark,
} as const

const RULES_DOCUMENTS_SECTION = {
	title: 'Rules Documents',
	description: 'Current rules, archives, and changes.',
	href: '/reference',
	icon: BookOpenText,
} as const

const GLOBAL_SECTIONS = [RULINGS_SECTION, RULES_DOCUMENTS_SECTION] as const

function getCurrentSection(pathname: string) {
	return pathname === '/reference' || pathname.startsWith('/reference/')
		? RULES_DOCUMENTS_SECTION
		: RULINGS_SECTION
}

export function CurrentSectionTitle(props: ComponentProps<'a'>) {
	const section = getCurrentSection(usePathname())
	const Icon = section.icon

	return (
		<Link {...props} href={section.href}>
			<Icon aria-hidden="true" className="size-4.5 text-fd-primary" />
			{section.title}
		</Link>
	)
}

export function GlobalHeader({ siteName }: { siteName: string }) {
	const [sectionsOpen, setSectionsOpen] = useState(false)
	const currentSection = getCurrentSection(usePathname())

	return (
		<div className="sticky top-0 z-40 h-(--global-header-height) border-b border-fd-border bg-fd-background print:hidden">
			<div className="flex h-full items-stretch">
				<Link
					className="flex min-w-0 shrink-0 items-center gap-2.5 px-4 font-semibold tracking-tight text-fd-foreground md:w-[268px] md:border-e md:border-fd-border md:px-[22px]"
					href="/"
				>
					<Image src={pageIcon} alt="" className="size-6 shrink-0" />
					<span className="truncate">{siteName}</span>
				</Link>

				<nav aria-label="Site sections" className="hidden h-full items-stretch md:flex">
					{GLOBAL_SECTIONS.map((section) => {
						const Icon = section.icon
						const active = section === currentSection

						return (
							<Link
								key={section.title}
								aria-current={active ? 'page' : undefined}
								className={cn(
									'flex h-full items-center gap-2 border-b-2 px-5 text-sm font-medium transition-colors',
									active
										? 'border-fd-primary text-fd-foreground'
										: 'border-transparent text-fd-muted-foreground hover:text-fd-foreground',
								)}
								href={section.href}
							>
								<Icon aria-hidden="true" className="size-4" />
								{section.title}
							</Link>
						)
					})}
				</nav>

				<div className="ml-auto hidden min-w-0 items-center px-3 md:flex">
					<FullSearchTrigger hideIfDisabled className="w-44 lg:w-56 xl:w-64" />
				</div>

				<Popover.Root onOpenChange={setSectionsOpen} open={sectionsOpen}>
					<Popover.Trigger className="ml-auto flex h-full items-center gap-2 px-4 text-sm font-medium text-fd-foreground transition-colors hover:bg-fd-accent md:hidden">
						Sections
						<ChevronDown
							aria-hidden="true"
							className={cn(
								'size-3.5 text-fd-muted-foreground transition-transform',
								sectionsOpen && 'rotate-180',
							)}
						/>
					</Popover.Trigger>
					<Popover.Portal>
						<Popover.Positioner align="end" className="z-50" sideOffset={8}>
							<Popover.Popup className="w-[min(22rem,calc(100vw-1rem))] origin-(--transform-origin) rounded-2xl border border-fd-border bg-fd-popover p-2 text-fd-popover-foreground shadow-xl transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
								<Popover.Title className="px-3 pt-2 pb-1 text-[0.68rem] font-semibold tracking-widest text-fd-muted-foreground uppercase">
									Browse {siteName}
								</Popover.Title>
								<div className="flex flex-col gap-1">
									{GLOBAL_SECTIONS.map((section) => {
										const Icon = section.icon
										const active = section === currentSection

										return (
											<Link
												key={section.title}
												aria-current={active ? 'page' : undefined}
												className={cn(
													'flex items-start gap-3 rounded-xl p-3 transition-colors',
													active ? 'bg-fd-accent text-fd-foreground' : 'hover:bg-fd-accent/60',
												)}
												href={section.href}
												onClick={() => setSectionsOpen(false)}
											>
												<span className="grid size-9 shrink-0 place-items-center rounded-lg border border-fd-border bg-fd-background">
													<Icon aria-hidden="true" className="size-4" />
												</span>
												<span className="min-w-0">
													<span className="block text-sm font-semibold">{section.title}</span>
													<span className="mt-0.5 block text-xs leading-5 text-fd-muted-foreground">
														{section.description}
													</span>
												</span>
											</Link>
										)
									})}
								</div>
							</Popover.Popup>
						</Popover.Positioner>
					</Popover.Portal>
				</Popover.Root>
			</div>
		</div>
	)
}
