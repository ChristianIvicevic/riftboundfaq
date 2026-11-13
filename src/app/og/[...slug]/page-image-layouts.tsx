import { SITE_NAME } from '@/lib/site'

export type PageImageEdition = Readonly<{
	name: string
	logoSrc?: string
}>

export type PageImageVisual =
	| Readonly<{ kind: 'card'; src: string; width: number; height: number }>
	| Readonly<{ kind: 'site-mark' }>
	| Readonly<{
			kind: 'keyword'
			label: string
			backgroundColor: string
			accentColor: string
	  }>
	| Readonly<{ kind: 'rules-edition'; edition: PageImageEdition }>
	| Readonly<{ kind: 'rules-transition'; from: PageImageEdition; current: PageImageEdition }>

export type PageImageData = Readonly<{
	title: string
	description: string
	visual: PageImageVisual
}>

const PRIMARY = '#ef7d00'
const INK = '#090a0d'
const WHITE = '#f5f3ed'
const MUTED = 'rgba(245, 243, 237, 0.68)'

function assertNever(value: never): never {
	throw new Error(`Unhandled page image visual ${JSON.stringify(value)}`)
}

function titleFontSize(title: string) {
	if (title.length > 38) return '52px'
	if (title.length > 31) return '60px'
	if (title.length > 24) return '71px'
	if (title.length > 12) return '74px'
	return '78px'
}

function descriptionFontSize(description: string) {
	if (description.length > 130) return '27px'
	if (description.length > 105) return '29px'
	if (description.length > 80) return '30px'
	return '29px'
}

function displayTitle(title: string) {
	return title.replaceAll('Tournament Rules', 'Tournament\u00A0Rules')
}

function keywordFontSize(label: string) {
	return `${label.length > 11 ? 52 : 66}px`
}

function cardDimensions(visual: Extract<PageImageVisual, { kind: 'card' }>, displayWidth: number) {
	return { width: displayWidth, height: Math.round((displayWidth * visual.height) / visual.width) }
}

function EditionMark({
	color,
	edition,
	height,
	opacity = 1,
	width,
}: {
	color: string
	edition: PageImageEdition
	height: number
	opacity?: number
	width: number
}) {
	return edition.logoSrc ? (
		<img
			src={edition.logoSrc}
			alt=""
			width={width}
			height={height}
			style={{ objectFit: 'contain', opacity }}
		/>
	) : (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: `${width}px`,
				height: `${height}px`,
				color,
				fontSize: '34px',
				fontWeight: 850,
				letterSpacing: '3px',
				opacity,
			}}
		>
			{edition.name.toUpperCase()}
		</div>
	)
}

function CardVisual(visual: Extract<PageImageVisual, { kind: 'card' }>) {
	const isLandscape = visual.width > visual.height
	const dimensions = cardDimensions(visual, isLandscape ? 640 : 535)

	return (
		<img
			src={visual.src}
			alt=""
			{...dimensions}
			style={{
				position: 'absolute',
				right: isLandscape ? '-120px' : '-50px',
				bottom: isLandscape ? '34px' : '-245px',
				objectFit: 'contain',
				opacity: 0.64,
				transform: `rotate(${isLandscape ? 4 : 6}deg)`,
				filter: 'saturate(0.86)',
			}}
		/>
	)
}

function SiteMarkVisual({ logoSrc }: { logoSrc: string }) {
	return (
		<img
			src={logoSrc}
			alt=""
			width={430}
			height={430}
			style={{
				position: 'absolute',
				top: '112px',
				right: '-18px',
				objectFit: 'contain',
				opacity: 0.2,
				transform: 'rotate(7deg)',
			}}
		/>
	)
}

function KeywordVisual({
	accentColor,
	backgroundColor,
	label,
}: Extract<PageImageVisual, { kind: 'keyword' }>) {
	const stylizedLabel = `/${label.toUpperCase()}/`

	return (
		<div
			style={{
				display: 'flex',
				position: 'absolute',
				right: '20px',
				bottom: '56px',
				flexDirection: 'column',
				alignItems: 'flex-end',
				width: '455px',
				transform: 'rotate(-4deg)',
			}}
		>
			<div
				style={{
					display: 'flex',
					position: 'absolute',
					top: '26px',
					right: '-20px',
					width: '430px',
					height: '88px',
					backgroundColor,
					opacity: 0.24,
				}}
			/>
			<span
				style={{
					position: 'relative',
					color: accentColor,
					fontSize: keywordFontSize(stylizedLabel),
					fontWeight: 900,
					lineHeight: 1,
					letterSpacing: '-3px',
				}}
			>
				{stylizedLabel}
			</span>
			<div
				style={{
					display: 'flex',
					width: '300px',
					height: '7px',
					marginTop: '24px',
					backgroundColor: accentColor,
				}}
			/>
			<span
				style={{
					marginTop: '14px',
					color: MUTED,
					fontSize: '17px',
					fontWeight: 800,
					letterSpacing: '5px',
				}}
			>
				KEYWORD ABILITY
			</span>
		</div>
	)
}

function RulesEditionVisual({ edition }: Extract<PageImageVisual, { kind: 'rules-edition' }>) {
	return (
		<div
			style={{
				display: 'flex',
				position: 'absolute',
				right: '36px',
				bottom: '38px',
				alignItems: 'center',
				justifyContent: 'center',
				width: '295px',
				height: '180px',
			}}
		>
			<EditionMark edition={edition} width={295} height={180} color={PRIMARY} />
		</div>
	)
}

function RulesTransitionVisual({ current, from }: Extract<PageImageVisual, { kind: 'rules-transition' }>) {
	return (
		<div
			style={{
				display: 'flex',
				position: 'absolute',
				right: '36px',
				bottom: '38px',
				width: '590px',
				height: '180px',
			}}
		>
			<div
				style={{
					display: 'flex',
					position: 'absolute',
					top: '24px',
					left: 0,
					filter: 'grayscale(1)',
				}}
			>
				<EditionMark edition={from} width={220} height={132} color={WHITE} opacity={0.38} />
			</div>
			<div
				style={{
					display: 'flex',
					position: 'absolute',
					top: '45px',
					left: '250px',
					width: '3px',
					height: '90px',
					backgroundColor: PRIMARY,
					opacity: 0.55,
				}}
			/>
			<div
				style={{
					display: 'flex',
					position: 'absolute',
					top: 0,
					right: 0,
				}}
			>
				<EditionMark edition={current} width={295} height={180} color={PRIMARY} opacity={0.96} />
			</div>
		</div>
	)
}

function Visual({ logoSrc, visual }: { logoSrc: string; visual: PageImageVisual }) {
	switch (visual.kind) {
		case 'card':
			return <CardVisual {...visual} />
		case 'site-mark':
			return <SiteMarkVisual logoSrc={logoSrc} />
		case 'keyword':
			return <KeywordVisual {...visual} />
		case 'rules-edition':
			return <RulesEditionVisual {...visual} />
		case 'rules-transition':
			return <RulesTransitionVisual {...visual} />
	}
	return assertNever(visual)
}

function BrandSpine({ logoSrc }: { logoSrc: string }) {
	return (
		<>
			<div
				style={{
					display: 'flex',
					position: 'absolute',
					top: 0,
					left: 0,
					width: '104px',
					height: '100%',
					backgroundColor: PRIMARY,
				}}
			>
				<div
					style={{
						display: 'flex',
						position: 'absolute',
						top: '30px',
						left: '20px',
						alignItems: 'center',
						justifyContent: 'center',
						width: '64px',
						height: '64px',
						backgroundColor: INK,
						borderRadius: '14px',
					}}
				>
					<img src={logoSrc} alt="" width={44} height={44} style={{ objectFit: 'contain' }} />
				</div>
				<span
					style={{
						position: 'absolute',
						left: '-118px',
						bottom: '170px',
						width: '340px',
						color: INK,
						fontSize: '30px',
						fontWeight: 900,
						letterSpacing: '6px',
						textAlign: 'center',
						transform: 'rotate(-90deg)',
					}}
				>
					{SITE_NAME.toUpperCase()}
				</span>
			</div>
			<div
				style={{
					display: 'flex',
					position: 'absolute',
					top: 0,
					left: '104px',
					width: '5px',
					height: '100%',
					backgroundColor: '#29220d',
				}}
			/>
		</>
	)
}

function Intro({ data }: { data: PageImageData }) {
	return (
		<div
			style={{
				display: 'flex',
				position: 'absolute',
				top: '68px',
				left: '154px',
				flexDirection: 'column',
				width: '650px',
			}}
		>
			<h1
				style={{
					width: '625px',
					margin: '58px 0 0',
					fontFamily: 'Noto Serif',
					fontSize: titleFontSize(data.title),
					fontWeight: 900,
					lineHeight: 1,
					letterSpacing: '-3px',
					textWrap: 'balance',
				}}
			>
				{displayTitle(data.title)}
			</h1>
			<p
				style={{
					width: '610px',
					margin: '26px 0 0',
					color: MUTED,
					fontSize: descriptionFontSize(data.description),
					lineHeight: 1.3,
					textWrap: 'pretty',
				}}
			>
				{data.description}
			</p>
		</div>
	)
}

export function PageImage({ data, logoSrc }: { data: PageImageData; logoSrc: string }) {
	return (
		<div
			style={{
				display: 'flex',
				position: 'relative',
				width: '100%',
				height: '100%',
				overflow: 'hidden',
				color: WHITE,
				backgroundColor: INK,
			}}
		>
			<Visual visual={data.visual} logoSrc={logoSrc} />
			<BrandSpine logoSrc={logoSrc} />
			<Intro data={data} />
		</div>
	)
}
