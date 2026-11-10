import './global.css'
import { Analytics } from '@vercel/analytics/next'
import { House, MapPinned } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { connection } from 'next/server'
import { INTER, NOTO_SERIF } from '@/app/fonts'
import pageIcon from '@/app/icon.png'
import { SITE_NAME } from '@/lib/site'

const LONELY_PORO_IMAGE = '/images/site/not-found/lonely-poro.jpg'
const NOT_FOUND_COPY_VARIANTS = [
	{
		heading: "Looks like we're both lost.",
		description:
			"This page isn't here, and the trail has vanished beneath the snow. Let's head back somewhere warmer.",
		action: 'Find the way home',
		location: 'Beyond the last marked trail',
	},
	{
		heading: 'Nothing but snow from here.',
		description: "This page can't be found. The path ahead has faded, but the way home is still open.",
		action: 'Head back home',
		location: 'Somewhere past the last waypoint',
	},
	{
		heading: 'The trail ends here.',
		description:
			'The page you were looking for has disappeared beyond the ridge. Better turn back before the snow covers our tracks.',
		action: 'Return home',
		location: 'Beyond the edge of the map',
	},
	{
		heading: 'No page. Just one lonely Poro.',
		description:
			"Whatever brought you this far is gone beneath the snow. Let's not leave either of you stranded.",
		action: 'Take us home',
		location: 'Waiting where the trail went cold',
	},
	{
		heading: 'A cold place to get lost.',
		description:
			"There's no page at the end of this trail, only a Poro waiting in the snow. Let's find our way back together.",
		action: 'Back to safety',
		location: 'Far from familiar ground',
	},
] as const
export const metadata: Metadata = {
	title: `Page not found | ${SITE_NAME}`,
	description: `The requested page could not be found on ${SITE_NAME}.`,
}

export default async function GlobalNotFound() {
	await connection()
	const copy = NOT_FOUND_COPY_VARIANTS[Math.floor(Math.random() * NOT_FOUND_COPY_VARIANTS.length)]

	return (
		<html lang="en" className={INTER.className}>
			<body>
				<main className="relative isolate flex min-h-screen overflow-hidden bg-slate-950 text-white">
					<Image
						preload
						alt=""
						className="-z-20 object-cover object-[63%_center] sm:object-center"
						fill
						sizes="100vw"
						src={LONELY_PORO_IMAGE}
					/>
					<div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(9,18,27,0.08)_0%,rgba(9,18,27,0.4)_54%,rgba(9,18,27,0.96)_100%)] sm:bg-[linear-gradient(90deg,rgba(9,18,27,0.92)_0%,rgba(9,18,27,0.72)_38%,rgba(9,18,27,0.08)_72%)]" />
					<div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_20%,transparent_0%,rgba(8,15,23,0.18)_68%,rgba(8,15,23,0.5)_100%)]" />

					<div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pt-6 pb-32 sm:px-10 sm:pt-9 lg:px-16">
						<a className="flex w-fit items-center gap-2.5 font-semibold tracking-tight" href="/">
							<Image alt="" className="size-6" src={pageIcon} />
							{SITE_NAME}
						</a>

						<div className="mt-auto max-w-xl sm:my-auto">
							<div className="mb-5 flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-sky-100 uppercase">
								<span className="h-px w-8 bg-sky-100/70" />
								Error 404
							</div>
							<h1
								className={`${NOTO_SERIF.className} max-w-lg text-5xl leading-[0.98] font-semibold tracking-[-0.055em] text-balance sm:text-7xl`}
							>
								{copy.heading}
							</h1>
							<p className="mt-6 max-w-md text-base leading-7 text-slate-200 sm:text-lg">
								{copy.description}
							</p>
							<div className="mt-8">
								<a
									className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-slate-950/20 transition hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
									href="/"
								>
									<House aria-hidden="true" className="size-4" />
									{copy.action}
								</a>
							</div>
						</div>

						<div className="mt-10 flex items-center gap-2 self-end text-xs text-white/60 sm:mt-0">
							<MapPinned aria-hidden="true" className="size-3.5" />
							{copy.location}
						</div>
					</div>
				</main>
				<Analytics />
			</body>
		</html>
	)
}
